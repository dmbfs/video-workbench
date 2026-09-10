/** 生成循环的硬边界参数；全部可用环境变量覆盖，非法值回退默认。 */
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** 轮询间隔（ms） */
export const POLL_INTERVAL_MS = envInt("VIDSTITCH_POLL_INTERVAL_MS", 1500);
/** 单段从 createTask 起的最长等待时间（ms），超时视为不可重试失败 */
export const POLL_TIMEOUT_MS = envInt("VIDSTITCH_POLL_TIMEOUT_MS", 10 * 60_000);
/** 单个项目允许创建的付费视频任务总数（含重试） */
export const MAX_CALLS_PER_PROJECT = envInt("VIDSTITCH_MAX_CALLS_PER_PROJECT", 30);
/** 连续多少段终态失败后熔断该项目的排队任务 */
export const BREAKER_FAILURE_THRESHOLD = envInt("VIDSTITCH_BREAKER_FAILURE_THRESHOLD", 3);

/** 生成请求的期望清晰度档位（VIDSTITCH_RESOLUTION=720p 可降档省成本）；实际按 provider 能力收紧 */
export const DESIRED_RESOLUTION: "720p" | "1080p" =
  process.env.VIDSTITCH_RESOLUTION === "720p" ? "720p" : "1080p";

/** 旁白 TTS 语音模型（TokenDance 目录：minimax-speech-2.8-{turbo,hd}，turbo 更省更快） */
export const TTS_MODEL = process.env.VIDSTITCH_TTS_MODEL || "minimax-speech-2.8-turbo";
/** 旁白音色（MiniMax 系统音色 ID，如 male-qn-qingse） */
export const TTS_VOICE = process.env.VIDSTITCH_TTS_VOICE || "female-shaonv";
