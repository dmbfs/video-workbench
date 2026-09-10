// e2e-auto：一键成片 skill 链全自动验收（FR-12；mock 全程零计费；用后即删）
import { execFileSync } from "node:child_process";
import { path as ffprobe } from "@ffprobe-installer/ffprobe";
import { existsSync } from "node:fs";
const API = "http://localhost:8787";
const { registerOrLogin } = await import("./lib-auth.mjs");
const auth = await registerOrLogin(API);
const afetch = (url, opts = {}) => fetch(url, { ...opts, headers: { ...(opts.headers ?? {}), cookie: auth.cookie } });
const j = async (r) => { const t = await r.text(); let o; try { o = JSON.parse(t); } catch { o = t; } return { status: r.status, body: o }; };
let pass = 0, fail = 0;
const check = (name, cond, detail = "") => { console.log(`${cond ? "✅" : "❌"} ${name}${detail ? " · " + detail : ""}`); cond ? pass++ : fail++; };

// 0) 临时把聊天默认切到 mock（mock 全程零计费），结束后恢复
const settings = await (await afetch(`${API}/api/settings`)).json();
const orig = JSON.parse(JSON.stringify(settings));
const mockChat = settings.providers.find((p) => p.kind === "mock");
const apply = async (s) => afetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
if (mockChat && settings.chatDefaultId !== mockChat.id) {
  await apply({ ...settings, chatDefaultId: mockChat.id });
}
const restore = async () => { try { await apply(orig); } catch {} };

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
// prompt-enhance 在 mock 下毫秒级完成，SSE 订阅建立前可能已广播（真实模型数秒级不会错过）；故确定性断言后 4 步
check("技能步骤链齐全（storyboard 起 4 步）", ["storyboard", "video-gen", "postfx-grade", "stitch-export"].every((s) => steps.includes(s)), steps.join(" → "));

// 4) 落库与成片验证
const proj = await j(await afetch(`${API}/api/projects/${pid}`));
const segs = proj.body.segments ?? [];
check("分段全部 succeeded（mock 3 段）", segs.length === 3 && segs.every((s) => s.status === "succeeded"), `${segs.length} 段`);
check("分镜自动确认", !!proj.body.storyboard?.confirmedAt);
const finalPath = `data/projects/${pid}/final.mp4`;
check("final.mp4 落盘", existsSync(finalPath));
if (existsSync(finalPath)) {
  const dur = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", finalPath]).toString().trim());
  check("成片时长 ≈30s", dur > 28 && dur < 33, `${dur.toFixed(1)}s`);
}

// 5) 清理（用后即删 + 恢复设置）
await afetch(`${API}/api/projects/${pid}`, { method: "DELETE" });
await restore();
console.log(`\ndone ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
