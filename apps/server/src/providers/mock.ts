import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { dataRoot } from "../db.js";
import type { VideoProvider, CreateTaskReq, CreateTaskCtx, PollResult, Caps } from "./types.js";

interface MockJob { child: ReturnType<typeof spawn>; out: string; code: number | null }
const jobs = new Map<string, MockJob>();

/** 本地合成假视频：testsrc2 彩条 + 正弦音；段间色相(hue)与音调(frequency)随 idx 递变，肉眼/耳验拼接顺序 */
export class MockProvider implements VideoProvider {
  kind = "mock";
  capabilities(): Caps { return { maxSegmentDuration: 30, imageToVideo: true, audio: true }; }

  async createTask(req: CreateTaskReq, ctx: CreateTaskCtx) {
    const taskId = `mock_${ctx.segmentId}`;
    const dir = path.join(dataRoot, "projects", ctx.projectId, "segments");
    mkdirSync(dir, { recursive: true });
    const out = path.join(dir, `${ctx.segmentId}.mp4`);
    const size = req.ratio === "16:9" ? "1280x720" : "720x1280";
    const hue = (ctx.idx * 67) % 360;
    const freq = 220 + ctx.idx * 60;
    const child = spawn(ffmpegPath as string, [
      "-y",
      "-f", "lavfi", "-i", `testsrc2=size=${size}:rate=30:duration=${req.duration}`,
      "-f", "lavfi", "-i", `sine=frequency=${freq}:duration=${req.duration}`,
      "-vf", `hue=h=${hue}:s=1.3,format=yuv420p`,
      "-c:v", "libx264", "-preset", "veryfast",
      "-c:a", "aac", "-ar", "48000", "-ac", "2",
      "-shortest", out,
    ]);
    const job: MockJob = { child, out, code: null };
    jobs.set(taskId, job);
    child.on("exit", (c) => { job.code = c ?? 0; });
    child.stderr.resume(); // 防 buffer 阻塞
    return { taskId };
  }

  async pollTask(taskId: string): Promise<PollResult> {
    const j = jobs.get(taskId);
    if (!j) return { status: "failed", error: "unknown mock task" };
    if (j.code === null) return { status: "running" };
    return j.code === 0
      ? { status: "succeeded", videoRef: j.out }
      : { status: "failed", error: "ffmpeg exit " + j.code };
  }
}
