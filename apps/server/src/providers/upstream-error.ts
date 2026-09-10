/** 上游模型网关报错的统一人性化转换：让用户看到「该做什么」，原始细节进服务端日志 */

export class UpstreamError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function friendlyUpstreamError(status: number, bodyText: string): UpstreamError {
  const detail = bodyText.replace(/\s+/g, " ").slice(0, 160);
  switch (status) {
    case 401:
      return new UpstreamError("API 密钥无效或已失效（401）——请到「设置」页更新该模型的 key", status);
    case 402:
      return new UpstreamError("服务商账户余额不足（402）——请充值后重试", status);
    case 403:
      return new UpstreamError("无权访问该模型（403）——请检查 key 权限或模型是否已开通", status);
    case 404:
      return new UpstreamError("接口不存在（404）——请检查 Base URL 是否正确（对话类一般要以 /v1 结尾）", status);
    case 429:
      return new UpstreamError("触发限流（429）——请稍等片刻再试", status);
    default:
      return new UpstreamError(`模型服务返回 ${status}：${detail}`, status);
  }
}
