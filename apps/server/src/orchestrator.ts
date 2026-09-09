import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { db, dataRoot } from "./db.js";
import { getSettings } from "./settings.js";
import { getVideoProvider } from "./providers/factory.js";
import { broadcast } from "./sse.js";
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from "./config.js";
import type { ProviderConfig, Segment, SegmentStatus } from "@vidstitch/shared";

/** 不该重试的失败：重试会重复创建付费任务，或永远等不到结果 */
class NonRetryableError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Orchestrator {
  private queue: string[] = [];
  private active = 0;
  concurrency = 2;

  enqueue(segmentId: string) {
    db.prepare("UPDATE segments SET status='pending', error=NULL, task_id=NULL WHERE id=?").run(segmentId);
    const s = this.seg(segmentId);
    if (s) broadcast({ type: "segment_status", segmentId, status: "pending" }, s.projectId);
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
    const sb = db.prepare("SELECT ratio, with_audio FROM storyboards WHERE project_id=?").get(s.projectId) as
      | { ratio: "16:9" | "9:16"; with_audio: number }
      | undefined;

    const settings = getSettings();
    const cfg: ProviderConfig | undefined =
      settings.providers.find((p) => p.id === s.provider) ??
      settings.providers.find((p) => p.id === settings.videoDefaultId) ??
      settings.providers.find((p) => p.kind === "mock");
    if (!cfg) return this.setStatus(segmentId, { status: "failed", error: "没有可用的视频 provider，请到设置页添加" });

    this.setStatus(segmentId, { status: "generating", provider: cfg.id, error: null });
    try {
      const provider = getVideoProvider(cfg);
      const { taskId } = await provider.createTask(
        { prompt: s.prompt, duration: s.duration, ratio: sb?.ratio ?? "16:9", withAudio: (sb?.with_audio ?? 1) === 1 },
        { projectId: s.projectId, segmentId, idx: s.idx },
      );
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
    } catch (e) {
      const err = e as Error;
      const msg = err.message.slice(0, 300);
      if (!(err instanceof NonRetryableError) && attempt < 3) {
        await sleep(2000 * attempt);
        return this.run(segmentId, attempt + 1);
      }
      this.setStatus(segmentId, { status: "failed", error: msg });
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
