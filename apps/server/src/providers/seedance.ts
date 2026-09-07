import type { VideoProvider, CreateTaskReq, CreateTaskCtx, PollResult, Caps } from "./types.js";
import type { ProviderConfig } from "@vidstitch/shared";

/** Seedance（BytePlus/火山 Ark）：POST /api/v3/contents/generations/tasks + GET 轮询（RESEARCH.md §1） */
export class SeedanceProvider implements VideoProvider {
  kind = "seedance";
  constructor(private cfg: ProviderConfig) {}
  capabilities(): Caps { return { maxSegmentDuration: 30, imageToVideo: true, audio: true }; }

  async createTask(req: CreateTaskReq, _ctx: CreateTaskCtx) {
    const content: object[] = [{ type: "text", text: req.prompt }];
    if (req.firstFrameB64) content.push({ type: "image_url", image_url: `data:image/jpeg;base64,${req.firstFrameB64}` });
    const r = await fetch(`${this.cfg.baseUrl}/api/v3/contents/generations/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({
        model: this.cfg.modelId, content,
        resolution: "720p", aspect_ratio: req.ratio,
        duration: req.duration, with_audio: req.withAudio,
      }),
    });
    if (!r.ok) throw new Error(`seedance create ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as { id: string };
    return { taskId: j.id };
  }

  async pollTask(taskId: string): Promise<PollResult> {
    const r = await fetch(`${this.cfg.baseUrl}/api/v3/contents/generations/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
    });
    if (!r.ok) return { status: "running" };
    const j = (await r.json()) as { status: string; content?: { video_url?: string } };
    if (j.status === "succeeded") return { status: "succeeded", videoRef: j.content!.video_url! };
    if (j.status === "failed") return { status: "failed", error: "seedance task failed" };
    return { status: j.status === "queued" ? "queued" : "running" };
  }
}
