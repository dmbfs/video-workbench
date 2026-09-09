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
