// e2e-auto：一键成片 skill 链全自动验收（FR-12；mock 全程零计费；用后即删）
import { execFileSync } from "node:child_process";
import { path as ffprobe } from "@ffprobe-installer/ffprobe";
import { existsSync, readFileSync } from "node:fs";
const API = "http://localhost:8787";
const { registerOrLogin } = await import("./lib-auth.mjs");
const auth = await registerOrLogin(API);
const afetch = (url, opts = {}) => fetch(url, { ...opts, headers: { ...(opts.headers ?? {}), cookie: auth.cookie } });
const j = async (r) => { const t = await r.text(); let o; try { o = JSON.parse(t); } catch { o = t; } return { status: r.status, body: o }; };
let pass = 0, fail = 0;
const check = (name, cond, detail = "") => { console.log(`${cond ? "✅" : "❌"} ${name}${detail ? " · " + detail : ""}`); cond ? pass++ : fail++; };

// 0) 硬注入 mock provider（对话/视频/旁白全程零计费），结束后恢复
//    2026-09-10 事故教训：旧的「找现有 mock 切默认」兜底在设置里没有 mock 时静默失效，
//    导致 e2e 用真实 MiniMax 跑了 4 段视频（-27.68 元）。现在改为：注入失败 = 拒绝运行。
const settings = await (await afetch(`${API}/api/settings`)).json();
const orig = JSON.parse(JSON.stringify(settings));
const apply = async (s) => afetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
const injected = {
  ...orig,
  providers: [
    { id: "e2e-auto-chat", kind: "mock", label: "e2e-auto 对话" },
    { id: "e2e-auto-video", kind: "mock", label: "e2e-auto 视频" },
  ],
  chatDefaultId: "e2e-auto-chat",
  videoDefaultId: "e2e-auto-video",
};
const restore = async () => { try { await apply(orig); } catch {} };
const applied = await apply(injected);
const after = await (await afetch(`${API}/api/settings`)).json();
const vDef = after.providers?.find((p) => p.id === after.videoDefaultId);
const cDef = after.providers?.find((p) => p.id === after.chatDefaultId);
if (!applied.ok || vDef?.kind !== "mock" || cDef?.kind !== "mock") {
  console.log(`❌ mock 注入未生效（video=${vDef?.kind} chat=${cDef?.kind}）——拒绝运行，防止真机计费`);
  await restore();
  process.exit(1);
}
check("mock 注入生效（对话/视频/旁白零计费）", true);

// 1) 发起一键成片
const created = await j(await afetch(`${API}/api/projects/auto`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "一只柯基在海边追逐日落，电影感", postfx: "film" }),
}));
check("POST /api/projects/auto 返回 projectId", created.status === 200 && !!created.body.projectId, JSON.stringify(created.body).slice(0, 100));
const pid = created.body.projectId;
if (!pid) { await restore(); process.exit(1); }

// 2) 订阅 SSE 收集链事件
const events = [];
const ac = new AbortController();
fetch(`${API}/api/projects/${pid}/events`, { headers: { cookie: auth.cookie }, signal: ac.signal })
  .then(async (esRes) => {
    const reader = esRes.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
        const line = chunk.split("\n").find((l) => l.startsWith("data: "));
        if (line) { try { events.push(JSON.parse(line.slice(6))); } catch {} }
      }
    }
  }).catch(() => {});

// 3) 等待链终态（上限 180s）
const t0 = Date.now();
let done = null;
for (;;) {
  await new Promise((r) => setTimeout(r, 2000));
  done = events.find((e) => e.type === "chain_done" || e.type === "chain_error");
  if (done || Date.now() - t0 > 180000) break;
}
ac.abort();
check("链跑到终态", done?.type === "chain_done", JSON.stringify(done ?? {}).slice(0, 160));
const steps = events.filter((e) => e.type === "chain_progress").map((e) => e.step);
// prompt-enhance 在 mock 下毫秒级完成，SSE 订阅建立前可能已广播（真实模型数秒级不会错过）；故确定性断言 storyboard 起的步骤
check("技能步骤链齐全（storyboard 起，含 narration）", ["storyboard", "video-gen", "narration", "postfx-grade", "stitch-export"].every((s) => steps.includes(s)), steps.join(" → "));

// 4) 落库与成片验证
const proj = await j(await afetch(`${API}/api/projects/${pid}`));
const segs = proj.body.segments ?? [];
check("分段全部 succeeded（mock 3 段）", segs.length === 3 && segs.every((s) => s.status === "succeeded"), `${segs.length} 段`);
check("分镜自动确认", !!proj.body.storyboard?.confirmedAt);
const finalPath = `data/projects/${pid}/final.mp4`;
check("final.mp4 落盘", existsSync(finalPath));
if (existsSync(finalPath)) {
  const dur = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", finalPath]).toString().trim());
  check("成片时长 ≈30s（旁白混入不改时长）", dur > 28 && dur < 33, `${dur.toFixed(1)}s`);
  const aStreams = execFileSync(ffprobe, ["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_name", "-of", "csv=p=0", finalPath]).toString().trim();
  check("成片含音轨（旁白混入）", aStreams.length > 0, aStreams);
}
// 旁白产物：narration.json + 3 段 mp3
let manifest = null;
try { manifest = JSON.parse(readFileSync(`data/projects/${pid}/narration.json`, "utf8")); } catch {}
check("narration.json 清单落盘", !!manifest, manifest ? `${manifest.segments?.length} 段 / tts=${manifest.tts?.kind}` : "缺失");
check("旁白音频 3 段齐", manifest?.segments?.length === 3 && manifest.segments.every((s) => existsSync(s.file)),
  manifest?.segments?.map((s) => `${s.durationSec.toFixed(1)}s`).join(" / ") ?? "");
check("旁白时长 ≤ 段时长（压速适配生效）", manifest?.segments?.every((s, i) => s.durationSec <= (segs[i]?.duration ?? 99) - 0.2) ?? false,
  manifest?.segments?.map((s) => s.durationSec.toFixed(1)).join(","));
// 聊天面板应有旁白里程碑
const msgs = await j(await afetch(`${API}/api/projects/${pid}/messages`));
const list = Array.isArray(msgs.body) ? msgs.body : msgs.body.messages ?? [];
const narrationLog = list.some((m) => m.role === "assistant" && m.content.includes("旁白"));
check("聊天面板有旁白里程碑消息", narrationLog);

// 5) 清理（用后即删 + 恢复设置）
await afetch(`${API}/api/projects/${pid}`, { method: "DELETE" });
await restore();
console.log(`\ndone ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
