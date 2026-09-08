export interface Caps { maxSegmentDuration: number; imageToVideo: boolean; audio: boolean }
export interface CreateTaskReq {
  prompt: string; duration: number; firstFrameB64?: string;
  ratio: "16:9" | "9:16"; withAudio: boolean;
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
