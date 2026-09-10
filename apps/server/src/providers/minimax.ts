import type { VideoProvider, CreateTaskReq, CreateTaskCtx, PollResult, Caps } from "./types.js";
import type { ProviderConfig } from "@vidstitch/shared";
import { friendlyUpstreamError } from "./upstream-error.js";

/** MiniMax H3/H3-Max：api.minimax.io /v2/video_generation 创建 + /v2/query/{task_id} 轮询（RESEARCH.md §1） */
export class MiniMaxProvider implements VideoProvider {
  kind = "minimax";
  constructor(private cfg: ProviderConfig) {}
  // H3 480P/768P、H3-Max 768P/2K，均无 1080p 档；不主动传 resolution，沿用 API 默认 768P（≥720p 类）
  capabilities(): Caps { return { maxSegmentDuration: 15, imageToVideo: true, audio: true, maxResolution: "720p" }; }

  async createTask(req: CreateTaskReq, _ctx: CreateTaskCtx) {
    const content: object[] = [{ type: "text", text: req.prompt }];
    if (req.firstFrameB64) content.push({ type: "image_url", image_url: `data:image/jpeg;base64,${req.firstFrameB64}` });
    const r = await fetch(`${this.cfg.baseUrl}/v2/video_generation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({ model: this.cfg.modelId, content, duration: req.duration }),
    });
    if (!r.ok) {
      const bodyText = await r.text().catch(() => "");
      console.error(`[minimax] create ${r.status} ${bodyText.slice(0, 300)}`);
      throw friendlyUpstreamError(r.status, bodyText);
    }
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
