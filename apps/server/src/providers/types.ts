export interface Caps {
  maxSegmentDuration: number; imageToVideo: boolean; audio: boolean;
  /** 该 provider 家族能产出的最高清晰度档位；缺省视为 720p（各 provider 渐进接入） */
  maxResolution?: "720p" | "1080p";
}
export interface CreateTaskReq {
  prompt: string; duration: number; firstFrameB64?: string;
  ratio: "16:9" | "9:16"; withAudio: boolean;
  /** 期望清晰度档位（编排器按 provider 能力收紧后传入）；provider 不支持分辨率参数时忽略 */
  resolution?: "720p" | "1080p";
}
export interface CreateTaskCtx { projectId: string; segmentId: string; idx: number }
export interface PollResult {
  status: "queued" | "running" | "succeeded" | "failed";
  /** http(s) URL 或本地绝对路径，orchestrator 统一落地 */
  videoRef?: string; error?: string;
  /** 下载 videoRef 需要携带的请求头（如网关 content 端点的 Bearer） */
  downloadHeaders?: Record<string, string>;
}
export interface VideoProvider {
  kind: string;
  capabilities(): Caps;
  createTask(req: CreateTaskReq, ctx: CreateTaskCtx): Promise<{ taskId: string }>;
  pollTask(taskId: string): Promise<PollResult>;
}
