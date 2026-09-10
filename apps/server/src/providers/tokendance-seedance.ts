import type { VideoProvider, CreateTaskReq, CreateTaskCtx, PollResult, Caps } from "./types.js";
import type { ProviderConfig } from "@vidstitch/shared";
import { friendlyUpstreamError } from "./upstream-error.js";

/**
 * TokenDance Seedance Generations 原生协议（网关，非火山 Ark 直连）：
 *   POST {base}/v3/generations/tasks
 *   GET  {base}/v3/generations/tasks/{id}
 * baseUrl 默认 https://tokendance.space/gateway/ark
 * 契约：https://tokendance.space/docs/protocol-seedance-generations.md
 *
 * 注意：TokenDance 的视频模型只声明原生协议，没有 OpenAI 兼容 /v1/videos；
 * 走 /v1/video/generations 会得到 503 no_endpoints_available（不是上游冷）。
 */
export class TokenDanceSeedanceProvider implements VideoProvider {
  kind = "tokendance-seedance";
  constructor(private cfg: ProviderConfig) {}

  capabilities(): Caps { return { maxSegmentDuration: 30, imageToVideo: true, audio: true, maxResolution: "1080p" }; }

  private get base() {
    return (this.cfg.baseUrl || "https://tokendance.space/gateway/ark").replace(/\/+$/, "");
  }

  private body(req: CreateTaskReq) {
    const content: object[] = [{ type: "text", text: req.prompt }];
    if (req.firstFrameB64) {
      content.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${req.firstFrameB64}` },
        role: "first_frame",
      });
    }
    return JSON.stringify({
      model: this.cfg.modelId,
      content,
      resolution: req.resolution ?? "720p",
      // 首帧任务画幅由素材决定，必须 adaptive；纯文生视频必须给明确画幅
      ratio: req.firstFrameB64 ? "adaptive" : req.ratio,
      duration: req.duration,
      generate_audio: req.withAudio,
    });
  }

  async createTask(req: CreateTaskReq, _ctx: CreateTaskCtx) {
    const r = await fetch(`${this.base}/v3/generations/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
      body: this.body(req),
    });
    if (!r.ok) {
      const bodyText = await r.text().catch(() => "");
      console.error(`[tokendance-seedance] create ${r.status} ${bodyText.slice(0, 300)}`);
      throw friendlyUpstreamError(r.status, bodyText);
    }
    const j = (await r.json()) as { id?: string };
    if (!j.id) throw new Error("tokendance-seedance create: response missing task id");
    return { taskId: j.id };
  }

  async pollTask(taskId: string): Promise<PollResult> {
    const r = await fetch(`${this.base}/v3/generations/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
    });
    if (!r.ok) return { status: "running" };
    const j = (await r.json()) as {
      status?: string;
      content?: { video_url?: string };
      error?: { message?: string } | string;
    };
    const st = j.status ?? "";
    if (st === "succeeded") return { status: "succeeded", videoRef: j.content?.video_url };
    if (st === "failed") {
      return { status: "failed", error: typeof j.error === "string" ? j.error : j.error?.message ?? "seedance task failed" };
    }
    return { status: st === "queued" ? "queued" : "running" };
  }
}
