import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { db, dataRoot } from "./db.js";
import { getSettings } from "./settings.js";
import { getVideoProvider } from "./providers/factory.js";
import { broadcast } from "./sse.js";
import { extractLastFrame } from "./stitch.js";
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS, MAX_CALLS_PER_PROJECT, BREAKER_FAILURE_THRESHOLD } from "./config.js";
import type { ProviderConfig, Segment, SegmentStatus } from "@vidstitch/shared";

/** 视频类 provider kind（与 settings.ts 的 VIDEO_KINDS 保持一致） */
const VIDEO_KINDS = new Set(["minimax", "seedance", "tokendance-seedance", "openai-video"]);

/** 不该重试的失败：重试会重复创建付费任务，或永远等不到结果 */
class NonRetryableError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 项目已创建的付费视频任务数（含重试） */
export function projectGenerationCalls(projectId: string): number {
  return (db.prepare("SELECT COUNT(*) c FROM generation_calls WHERE project_id=?").get(projectId) as { c: number }).c;
}

function recordGenerationCall(projectId: string, segmentId: string, provider: string) {
  db.prepare("INSERT INTO generation_calls(project_id,segment_id,provider,created_at) VALUES(?,?,?,?)")
    .run(projectId, segmentId, provider, new Date().toISOString());
}

class Orchestrator {
  private queue: string[] = [];
  private active = 0;
  concurrency = 2;
  /** projectId -> 连续终态失败段数（成功即清零） */
  private failureStreak = new Map<string, number>();
  /** 已熔断的项目：排队中的段不再启动 */
  private tripped = new Set<string>();

  enqueue(segmentId: string) {
    const s = this.seg(segmentId);
    if (!s) return;
    // 防重：正在生成或已排队中的段不接受重复入队（重复入队会创建第二个付费任务）
    if (s.status === "generating" || this.queue.includes(segmentId)) return;
    // 手动（重新）生成视为重置该项目的熔断状态
    this.tripped.delete(s.projectId);
    this.failureStreak.set(s.projectId, 0);
    db.prepare("UPDATE segments SET status='pending', error=NULL, task_id=NULL WHERE id=?").run(segmentId);
    broadcast({ type: "segment_status", segmentId, status: "pending" }, s.projectId);
    this.queue.push(segmentId);
    this.pump();
  }

  private seg(id: string): Segment | undefined {
    const r = db.prepare("SELECT * FROM segments WHERE id=?").get(id) as any;
    if (!r) return undefined;
    return {
      id: r.id, projectId: r.project_id, idx: r.idx, prompt: r.prompt, duration: r.duration,
      transitionOut: r.transition_out, status: r.status, provider: r.provider ?? undefined,
      taskId: r.task_id ?? undefined, videoPath: r.video_path ?? undefined, error: r.error ?? undefined,
    };
  }

  private setStatus(id: string, patch: { status?: SegmentStatus; provider?: string; taskId?: string; videoPath?: string; error?: string | null }) {
    const s = this.seg(id);
    if (!s) return;
    db.prepare("UPDATE segments SET status=COALESCE(?,status), provider=COALESCE(?,provider), task_id=COALESCE(?,task_id), video_path=COALESCE(?,video_path), error=? WHERE id=?")
      .run(patch.status ?? null, patch.provider ?? null, patch.taskId ?? null, patch.videoPath ?? null, patch.error ?? null, id);
    broadcast({ type: "segment_status", segmentId: id, status: patch.status ?? s.status, error: patch.error ?? undefined }, s.projectId);
  }

  private pump() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const id = this.queue.shift()!;
      this.active++;
      this.run(id)
        .catch(() => {})
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }

  private async run(segmentId: string, attempt = 1): Promise<void> {
    const s = this.seg(segmentId);
    if (!s) return;
    if (this.tripped.has(s.projectId)) {
      // 熔断后仍在重试中的段也要落终态，避免永远停在 generating
      if (s.status !== "failed") {
        this.setStatus(segmentId, { status: "failed", error: "已熔断：项目连续生成失败，已停止后续尝试" });
      }
      return;
    }
    const sb = db.prepare("SELECT ratio, with_audio FROM storyboards WHERE project_id=?").get(s.projectId) as
      | { ratio: "16:9" | "9:16"; with_audio: number }
      | undefined;

    const settings = getSettings();
    // 兜底链：段上指定 → 全局默认 → 任一真实视频 provider → mock（默认 id 失效时不再直接躺平）
    const cfg: ProviderConfig | undefined =
      settings.providers.find((p) => p.id === s.provider) ??
      settings.providers.find((p) => p.id === settings.videoDefaultId) ??
      settings.providers.find((p) => p.kind !== "mock" && VIDEO_KINDS.has(p.kind)) ??
      settings.providers.find((p) => p.kind === "mock");
    if (!cfg) return this.setStatus(segmentId, { status: "failed", error: "没有可用的视频 provider，请到设置页添加" });

    if (projectGenerationCalls(s.projectId) >= MAX_CALLS_PER_PROJECT) {
      return this.setStatus(segmentId, {
        status: "failed",
        error: `已达项目生成次数上限（${MAX_CALLS_PER_PROJECT} 次）：为避免继续计费已停止，请确认成本后调整上限再重试`,
      });
    }

    this.setStatus(segmentId, { status: "generating", provider: cfg.id, error: null });
    try {
      const provider = getVideoProvider(cfg);
      // 单段时长上限（PRD §6）：超出直接失败提示，不创建付费任务
      const caps = provider.capabilities();
      if (s.duration > caps.maxSegmentDuration) {
        throw new NonRetryableError(
          `该模型（${cfg.label}）单段最长 ${caps.maxSegmentDuration}s，当前段 ${s.duration}s——请在时间线里调整时长或换模型`,
        );
      }

      // 首尾帧接力（PRD §4）：取前一段（idx-1）成片末帧作为本段图生视频首帧参考
      const firstFrameB64 = await this.predecessorLastFrame(s);

      const { taskId } = await provider.createTask(
        { prompt: s.prompt, duration: s.duration, ratio: sb?.ratio ?? "16:9", withAudio: (sb?.with_audio ?? 1) === 1, firstFrameB64 },
        { projectId: s.projectId, segmentId, idx: s.idx },
      );
      recordGenerationCall(s.projectId, segmentId, cfg.id);
      this.setStatus(segmentId, { taskId });

      let videoRef: string | undefined;
      let downloadHeaders: Record<string, string> | undefined;
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      for (;;) {
        await sleep(POLL_INTERVAL_MS);
        const poll = await provider.pollTask(taskId);
        if (poll.status === "succeeded") { videoRef = poll.videoRef; downloadHeaders = poll.downloadHeaders; break; }
        if (poll.status === "failed") throw new Error(poll.error ?? "provider failed");
        if (Date.now() >= deadline) {
          throw new NonRetryableError(
            `生成超时：${Math.round(POLL_TIMEOUT_MS / 1000)}s 内未返回结果（task ${taskId}）。已停止等待，避免重复创建付费任务`,
          );
        }
      }

      const destDir = path.join(dataRoot, "projects", s.projectId, "segments");
      mkdirSync(destDir, { recursive: true });
      const dest = path.join(destDir, `${segmentId}.mp4`);
      await resolveVideoRef(videoRef!, dest, downloadHeaders);
      this.setStatus(segmentId, { status: "succeeded", videoPath: dest, error: null });
      this.failureStreak.set(s.projectId, 0);
    } catch (e) {
      const err = e as Error;
      const msg = err.message.slice(0, 300);
      if (!(err instanceof NonRetryableError) && attempt < 3) {
        await sleep(2000 * attempt);
        return this.run(segmentId, attempt + 1);
      }
      this.setStatus(segmentId, { status: "failed", error: msg });
      this.noteFailure(s.projectId, msg);
    }
  }

  /** 首尾帧接力（PRD §4）：等前一段到终态，成功且成片在盘则抽其末帧（base64 jpeg）；
   *  前段失败 / 未在排队 / 等待超时 → 返回 undefined 退化为纯文生视频，不阻塞本段 */
  private async predecessorLastFrame(s: Segment): Promise<string | undefined> {
    if (s.idx <= 1) return undefined;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    for (;;) {
      const prev = db.prepare("SELECT id, status, video_path FROM segments WHERE project_id=? AND idx=?")
        .get(s.projectId, s.idx - 1) as { id: string; status: string; video_path: string | null } | undefined;
      if (!prev) return undefined;
      if (prev.status === "succeeded" && prev.video_path && existsSync(prev.video_path)) {
        try {
          return await extractLastFrame(prev.video_path);
        } catch {
          return undefined; // 抽帧失败不拖累本段，退化为纯文生视频
        }
      }
      if (prev.status === "failed") return undefined;
      if (prev.status === "pending" && !this.queue.includes(prev.id)) return undefined;
      if (Date.now() >= deadline) return undefined;
      await sleep(POLL_INTERVAL_MS);
    }
  }

  /** 累计连续失败；达阈值则熔断该项目，清空排队段并标记失败 */
  private noteFailure(projectId: string, lastError: string) {
    const streak = (this.failureStreak.get(projectId) ?? 0) + 1;
    this.failureStreak.set(projectId, streak);
    if (streak < BREAKER_FAILURE_THRESHOLD || this.tripped.has(projectId)) return;
    this.tripped.add(projectId);
    const queued = this.queue.filter((id) => this.seg(id)?.projectId === projectId);
    if (queued.length === 0) return;
    this.queue = this.queue.filter((id) => this.seg(id)?.projectId !== projectId);
    for (const id of queued) {
      this.setStatus(id, {
        status: "failed",
        error: `已熔断：连续 ${streak} 段生成失败（最近一次：${lastError}），本项目剩余 ${queued.length} 段未执行。请检查 provider 配置或余额后重新生成`,
      });
    }
  }
}

async function resolveVideoRef(ref: string, dest: string, headers?: Record<string, string>) {
  if (/^https?:/.test(ref)) {
    const r = await fetch(ref, { headers });
    if (!r.ok) throw new Error("download " + r.status);
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  } else {
    copyFileSync(ref, dest);
  }
}

export const orchestrator = new Orchestrator();
