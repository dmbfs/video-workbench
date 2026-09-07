import type { VideoProvider, CreateTaskReq, CreateTaskCtx, PollResult, Caps } from "./types.js";
import type { ProviderConfig } from "@vidstitch/shared";

/** MiniMax H3/H3-Max：api.minimax.io /v2/video_generation 创建 + /v2/query/{task_id} 轮询（RESEARCH.md §1） */
export class MiniMaxProvider implements VideoProvider {
  kind = "minimax";
  constructor(private cfg: ProviderConfig) {}
  capabilities(): Caps { return { maxSegmentDuration: 15, imageToVideo: true, audio: true }; }

  async createTask(req: CreateTaskReq, _ctx: CreateTaskCtx) {
    const content: object[] = [{ type: "text", text: req.prompt }];
    if (req.firstFrameB64) content.push({ type: "image_url", image_url: `data:image/jpeg;base64,${req.firstFrameB64}` });
    const r = await fetch(`${this.cfg.baseUrl}/v2/video_generation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({ model: this.cfg.modelId, content, duration: req.duration }),
    });
    if (!r.ok) throw new Error(`minimax create ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as { task_id: string };
    return { taskId: j.task_id };
  }

  async pollTask(taskId: string): Promise<PollResult> {
    const r = await fetch(`${this.cfg.baseUrl}/v2/query/video_generation/${taskId}`, {
      headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
    });
    if (!r.ok) return { status: "running" };
    const j = (await r.json()) as { status: string; content?: { url?: string } };
    if (j.status === "Success") return { status: "succeeded", videoRef: j.content!.url! };
    if (j.status === "Fail") return { status: "failed", error: "minimax task failed" };
    return { status: j.status === "Queue" ? "queued" : "running" };
  }
}
