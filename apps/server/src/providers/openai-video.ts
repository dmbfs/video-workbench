import type { VideoProvider, CreateTaskReq, CreateTaskCtx, PollResult, Caps } from "./types.js";
import type { ProviderConfig } from "@vidstitch/shared";
import { friendlyUpstreamError } from "./upstream-error.js";

/**
 * OpenAI 兼容异步视频契约（LLMGateway / OpenAI Sora 同形）：
 *   POST {base}/videos            { model, prompt, seconds, size, audio, image? }
 *   GET  {base}/videos/{id}       轮询 queued | in_progress | completed | failed
 *   GET  {base}/videos/{id}/content  下载 mp4（需 Bearer）
 */
export class OpenAIVideoProvider implements VideoProvider {
  kind = "openai-video";
  constructor(private cfg: ProviderConfig) {}

  capabilities(): Caps { return { maxSegmentDuration: 30, imageToVideo: true, audio: true }; }

  private body(req: CreateTaskReq, withImage: boolean) {
    return JSON.stringify({
      model: this.cfg.modelId,
      prompt: req.prompt,
      seconds: req.duration,
      size: req.ratio === "16:9" ? "1280x720" : "720x1280",
      audio: req.withAudio,
      ...(withImage && req.firstFrameB64 ? { image: { url: `data:image/jpeg;base64,${req.firstFrameB64}` } } : {}),
    });
  }

  async createTask(req: CreateTaskReq, _ctx: CreateTaskCtx) {
    const url = `${this.cfg.baseUrl}/videos`;
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` };
    let r = await fetch(url, { method: "POST", headers, body: this.body(req, true) });
    // image 字段不被某网关支持时降级为纯文生视频（首帧缺失只影响接力，不阻塞生成）
    if (!r.ok && r.status === 400 && req.firstFrameB64) {
      r = await fetch(url, { method: "POST", headers, body: this.body(req, false) });
    }
    if (!r.ok) {
      const bodyText = await r.text().catch(() => "");
      console.error(`[openai-video] create ${r.status} ${bodyText.slice(0, 300)}`);
      throw friendlyUpstreamError(r.status, bodyText);
    }
    const j = (await r.json()) as { id?: string; task_id?: string };
    const taskId = j.id ?? j.task_id;
    if (!taskId) throw new Error("openai-video create: response missing task id");
    return { taskId };
  }

  async pollTask(taskId: string): Promise<PollResult> {
    const r = await fetch(`${this.cfg.baseUrl}/videos/${taskId}`, {
      headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
    });
    if (!r.ok) return { status: "running" };
    const j = (await r.json()) as { status?: string; error?: { message?: string } | string };
    const st = j.status ?? "";
    if (st === "completed") {
      return {
        status: "succeeded",
        videoRef: `${this.cfg.baseUrl}/videos/${taskId}/content`,
        downloadHeaders: { Authorization: `Bearer ${this.cfg.apiKey}` },
      };
    }
    if (st === "failed") {
      return { status: "failed", error: typeof j.error === "string" ? j.error : j.error?.message ?? "video task failed" };
    }
    return { status: st === "queued" ? "queued" : "running" };
  }
}
