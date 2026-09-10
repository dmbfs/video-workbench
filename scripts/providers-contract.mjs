// providers-contract：各家视频适配器的**出站请求体与轮询解析**契约测试（stub fetch，零 API 花费）。
// 动机：MiniMax 曾漏传 t2v 必填 ratio、图片形状缺 role、轮询读错嵌套层级 —— 这类「字段漏传」只有真机才会暴露，成本高。
// 用法：pnpm providers-contract
import { MiniMaxProvider } from "../apps/server/src/providers/minimax.js";
import { SeedanceProvider } from "../apps/server/src/providers/seedance.js";
import { TokenDanceSeedanceProvider } from "../apps/server/src/providers/tokendance-seedance.js";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "✅" : "❌"} ${name}${detail ? " · " + detail : ""}`); cond ? pass++ : fail++; };

/** 拦截 fetch：记录出站请求，按需返回响应 */
function stubFetch(responder) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const rec = { url: String(url), headers: init.headers ?? {}, body: init.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(rec);
    const r = responder(rec) ?? { status: 200, json: { task_id: "t-1" } };
    return new Response(JSON.stringify(r.json ?? {}), { status: r.status ?? 200, headers: { "Content-Type": "application/json" } });
  };
  return calls;
}

const req = (over = {}) => ({ prompt: "一只柯基在海边", duration: 6, ratio: "16:9", withAudio: true, ...over });

// ── MiniMax：文生视频 ──────────────────────────────────────────────
{
  const calls = stubFetch(() => ({ json: { task_id: "t-1" } }));
  const p = new MiniMaxProvider({ kind: "minimax", baseUrl: "https://tokendance.space/gateway/minimax", apiKey: "k", modelId: "minimax-h3-max" });
  await p.createTask(req({ resolution: "720p" }), { projectId: "x", segmentId: "y", idx: 0 });
  const b = calls[0].body;
  ok("MiniMax t2v 路径正确", calls[0].url === "https://tokendance.space/gateway/minimax/v2/video_generation", calls[0].url);
  ok("MiniMax t2v 传 ratio（文档必填）", b.ratio === "16:9", `ratio=${b.ratio}`);
  ok("MiniMax t2v 传 resolution", b.resolution === "768P", `resolution=${b.resolution}`);
  ok("MiniMax t2v content 只有 text", b.content.length === 1 && b.content[0].type === "text");
}
// ── MiniMax：图生视频（首帧接力）──────────────────────────────────
{
  const calls = stubFetch(() => ({ json: { task_id: "t-1" } }));
  const p = new MiniMaxProvider({ kind: "minimax", baseUrl: "https://api.minimax.io", apiKey: "k", modelId: "MiniMax-H3" });
  await p.createTask(req({ firstFrameB64: "AAA", resolution: "720p" }), { projectId: "x", segmentId: "y", idx: 0 });
  const b = calls[0].body;
  ok("MiniMax i2v 图片形状为对象+role", b.content[1]?.image_url?.url?.startsWith("data:image/jpeg;base64,") && b.content[1]?.role === "first_frame", JSON.stringify(b.content[1]).slice(0, 90));
  ok("MiniMax i2v 不传 ratio（宽高比由图片决定）", b.ratio === undefined, `ratio=${b.ratio}`);
}
// ── MiniMax：清晰度映射（H3 可 2K，H3-Max 不可）──────────────────
{
  const calls = stubFetch(() => ({ json: { task_id: "t-1" } }));
  await new MiniMaxProvider({ kind: "minimax", baseUrl: "https://api.minimax.io", apiKey: "k", modelId: "MiniMax-H3" })
    .createTask(req({ resolution: "1080p" }), { projectId: "x", segmentId: "y", idx: 0 });
  ok("MiniMax H3 在 1080p 档请求 2K", calls[0].body.resolution === "2K", calls[0].body.resolution);
  const calls2 = stubFetch(() => ({ json: { task_id: "t-1" } }));
  await new MiniMaxProvider({ kind: "minimax", baseUrl: "https://api.minimax.io", apiKey: "k", modelId: "MiniMax-H3-Max" })
    .createTask(req({ resolution: "1080p" }), { projectId: "x", segmentId: "y", idx: 0 });
  ok("MiniMax H3-Max 降级 768P（不支持 2K）", calls2[0].body.resolution === "768P", calls2[0].body.resolution);
}
// ── MiniMax：轮询解析（官方嵌套小写 / 网关顶层大写 / 失败态）──────
{
  const p = new MiniMaxProvider({ kind: "minimax", baseUrl: "https://api.minimax.io", apiKey: "k", modelId: "MiniMax-H3" });
  stubFetch(() => ({ json: { task: { status: "succeeded", content: { url: "https://cdn/v.mp4" } } } }));
  const s1 = await p.pollTask("t-1");
  ok("轮询解析官方嵌套形状", s1.status === "succeeded" && s1.videoRef === "https://cdn/v.mp4", JSON.stringify(s1));
  stubFetch(() => ({ json: { status: "Success", content: { url: "https://cdn/legacy.mp4" } } }));
  const s2 = await p.pollTask("t-1");
  ok("轮询兼容顶层大写旧形状", s2.status === "succeeded" && s2.videoRef === "https://cdn/legacy.mp4", JSON.stringify(s2));
  stubFetch(() => ({ json: { task: { status: "failed", error: { message: "boom" } } } }));
  const s3 = await p.pollTask("t-1");
  ok("轮询识别失败并带原因", s3.status === "failed" && s3.error === "boom", JSON.stringify(s3));
  stubFetch(() => ({ json: { task: { status: "cancelled" } } }));
  ok("轮询识别 cancelled", (await p.pollTask("t-1")).status === "failed");
  stubFetch(() => ({ status: 401, json: { error: "unauthorized" } }));
  ok("轮询 401 直接判失败（不静默超时）", (await p.pollTask("t-1")).status === "failed");
  stubFetch(() => ({ status: 500, json: {} }));
  ok("轮询 5xx 继续等待", (await p.pollTask("t-1")).status === "running");
}
// ── Seedance（Ark）：原生字段 ─────────────────────────────────────
{
  const calls = stubFetch(() => ({ json: { id: "cgt-1" } }));
  const p = new SeedanceProvider({ kind: "seedance", baseUrl: "https://ark.cn-beijing.volces.com", apiKey: "k", modelId: "doubao-seedance-2-0-260128" });
  await p.createTask(req({ resolution: "1080p" }), { projectId: "x", segmentId: "y", idx: 0 });
  const b = calls[0].body;
  ok("Seedance 路径含 /api/v3/contents/generations/tasks", calls[0].url.endsWith("/api/v3/contents/generations/tasks"), calls[0].url);
  ok("Seedance 传 aspect_ratio 与 with_audio", b.aspect_ratio === "16:9" && b.with_audio === true, JSON.stringify({ r: b.aspect_ratio, a: b.with_audio }));
  ok("Seedance 传 resolution", b.resolution === "1080p", b.resolution);
}
// ── TokenDance Seedance：默认 baseUrl + 原生协议 ──────────────────
{
  const calls = stubFetch(() => ({ json: { id: "cgt-2" } }));
  const p = new TokenDanceSeedanceProvider({ kind: "tokendance-seedance", apiKey: "k", modelId: "seedance-2.5" });
  const { taskId } = await p.createTask(req(), { projectId: "x", segmentId: "y", idx: 0 });
  const b = calls[0].body;
  ok("TokenDance 默认 baseUrl 生效", calls[0].url === "https://tokendance.space/gateway/ark/v3/generations/tasks", calls[0].url);
  ok("TokenDance 返回 id 作 taskId", taskId === "cgt-2", taskId);
  ok("TokenDance t2v 传 ratio", b.ratio === "16:9", `ratio=${b.ratio}`);
}

console.log(`\nproviders-contract: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
