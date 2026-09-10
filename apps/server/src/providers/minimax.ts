import type { VideoProvider, CreateTaskReq, CreateTaskCtx, PollResult, Caps } from "./types.js";
import type { ProviderConfig } from "@vidstitch/shared";
import { friendlyUpstreamError } from "./upstream-error.js";

/**
 * MiniMax H3/H3-Max：`{base}/v2/video_generation` 创建 + `/v2/query/video_generation/{task_id}` 轮询。
 * 契约依据（官方与 TokenDance 网关两处措辞一致，见 .firecrawl/minimax-video.md）：
 *   - t2va：`ratio` **必填**且不能为 "adaptive"；
 *   - i2va：宽高比由首帧图片决定、不传 ratio；
 *   - 图片元素形状：`{type:"image_url", image_url:{url}, role:"first_frame"}`。
 * 输出档位：H3 支持 768P/2K；H3-Max 仅 480P/768P（SKU 名含 -max，禁止请求 2K，否则 400）。
 */
export class MiniMaxProvider implements VideoProvider {
  kind = "minimax";
  constructor(private cfg: ProviderConfig) {}
  // 统一按 768P 申报（两类 SKU 都支持）；2K 属额外档位，需显式放开 caps 才会请求
  capabilities(): Caps { return { maxSegmentDuration: 15, imageToVideo: true, audio: true, maxResolution: "720p" }; }

  /** 768P 是 H3/H3-Max 的公共交集；1080p 请求映射 2K，但 H3-Max 不支持 2K 故降级 768P。
   * 注意只能匹配 `h3-max` 这个 SKU 后缀——厂商名 "MiniMax" 本身含 "max"，用 /max/ 会全部误判。 */
  private resolutionFor(req: CreateTaskReq): string {
    const isH3Max = /h3[\s_-]?max/i.test(String(this.cfg.modelId ?? ""));
    return req.resolution === "1080p" && !isH3Max ? "2K" : "768P";
  }

  async createTask(req: CreateTaskReq, _ctx: CreateTaskCtx) {
    const content: object[] = [{ type: "text", text: req.prompt }];
    if (req.firstFrameB64) {
      content.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${req.firstFrameB64}` },
        role: "first_frame",
      });
    }
    const r = await fetch(`${this.cfg.baseUrl}/v2/video_generation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({
        model: this.cfg.modelId,
        content,
        duration: req.duration,
        resolution: this.resolutionFor(req),
        // 文生视频 ratio 必填；图生视频由图片定宽高比，官方示例不传
        ...(req.firstFrameB64 ? {} : { ratio: req.ratio }),
      }),
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
    if (!r.ok) {
      // 鉴权/权限类错误直接判失败，避免静默轮询到超时；5xx 等瞬时错误继续等
      if (r.status === 401 || r.status === 403) {
        return { status: "failed", error: `minimax 轮询鉴权失败（${r.status}）` };
      }
      return { status: "running" };
    }
    const raw = (await r.json()) as any;
    // H3 官方形状：{ task: { status:"succeeded", content:{ url } } }；兼容网关某些路径的顶层直返
    const t = raw?.task ?? raw ?? {};
    const status = String(t.status ?? "").toLowerCase();
    if (status === "succeeded" || status === "success") {
      const url = t.content?.url ?? t.file?.download_url ?? t.file_id;
      if (!url) return { status: "failed", error: "minimax 成功但未返回下载地址" };
      return { status: "succeeded", videoRef: url };
    }
    if (status === "failed" || status === "fail" || status === "cancelled" || status === "canceled" || status === "expired") {
      return { status: "failed", error: t.error?.message ?? t.error ?? `minimax ${status}` };
    }
    if (status === "queued" || status === "queue" || status === "preparing") return { status: "queued" };
    return { status: "running" };
  }
}
