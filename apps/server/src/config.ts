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
