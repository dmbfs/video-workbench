// QA 第二轮：验证本轮修复与新能力（mock 全程零计费；用后即删）
import { execFileSync } from "node:child_process";
import { path as ffprobe } from "@ffprobe-installer/ffprobe";
const API = "http://localhost:8787";
const { registerOrLogin } = await import("./lib-auth.mjs");
const auth = await registerOrLogin(API);
const afetch = (url, opts = {}) => fetch(url, { ...opts, headers: { ...(opts.headers ?? {}), cookie: auth.cookie } });
const j = async (r) => { const t = await r.text(); let o; try { o = JSON.parse(t); } catch { o = t; } return { status: r.status, body: o }; };
let pass = 0, fail = 0;
const check = (name, cond, detail = "") => { console.log(`${cond ? "✅" : "❌"} ${name}${detail ? " · " + detail : ""}`); cond ? pass++ : fail++; };
const dur = (p) => Number(execFileSync(ffprobe, ["-v","error","-show_entries","format=duration","-of","csv=p=0", p]).toString().trim());
const waitSegs = async (pid, want, timeoutMs = 90000) => {
  const t0 = Date.now();
  for (;;) {
    const d = await (await afetch(`${API}/api/projects/${pid}`)).json();
    if (d.segments.length >= want && d.segments.every((s) => ["succeeded","failed"].includes(s.status))) return d;
    if (Date.now() - t0 > timeoutMs) throw new Error("waitSegs timeout");
    await new Promise((r) => setTimeout(r, 1500));
  }
};

const settings = await (await afetch(`${API}/api/settings`)).json();
const orig = JSON.parse(JSON.stringify(settings));
const apply = async (s) => afetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });

// 临时 mock provider（若无）：结束后随 restore 移除
let injected = null;
const mock = settings.providers.find((p) => p.kind === "mock") ?? (injected = { id: "qa-mock-" + Date.now(), kind: "mock", label: "QA 临时 Mock" });
if (injected) await apply({ ...settings, providers: [...settings.providers, injected], videoDefaultId: mock.id });
// base = 含临时 mock 的完整 provider 列表（后续 apply 必须用它，防止整体替换把 mock 顶掉）
const base = injected ? { ...settings, providers: [...settings.providers, injected] } : settings;

// 开工前清掉历史 QA 项目，保证幂等
for (const p of await (await afetch(`${API}/api/projects`)).json()) {
  if (p.title.startsWith("QA2-")) await afetch(`${API}/api/projects/${p.id}`, { method: "DELETE" });
}

try {
  // ── 用例 1：防重入队 ──
  let r = await j(await afetch(`${API}/api/projects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "QA2-防重" }) }));
  const p1 = r.body.id;
  await apply({ ...base, videoDefaultId: mock.id });
  await afetch(`${API}/api/projects/${p1}/segments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "防重测试段", duration: 5 }) });
  const seg1 = (await (await afetch(`${API}/api/projects/${p1}`)).json()).segments[0];
  afetch(`${API}/api/segments/${seg1.id}/generate`, { method: "POST" });
  afetch(`${API}/api/segments/${seg1.id}/generate`, { method: "POST" });
  afetch(`${API}/api/segments/${seg1.id}/generate`, { method: "POST" });
  const d1 = await waitSegs(p1, 1);
  check("用例1 三连击只建 1 个任务", d1.generation.calls === 1, `calls=${d1.generation.calls}`);

  // ── 用例 2/3：转场（标记 fade → 0.5s；全局 crossfadeMs 覆盖 → 0.8s）──
  await afetch(`${API}/api/projects/${p1}/segments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "第二段", duration: 5 }) });
  const d2 = (await (await afetch(`${API}/api/projects/${p1}`)).json()).segments;
  await afetch(`${API}/api/segments/${d2[0].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transitionOut: "fade" }) });
  await afetch(`${API}/api/projects/${p1}/generate-all`, { method: "POST" });
  await waitSegs(p1, 2);
  await j(await afetch(`${API}/api/projects/${p1}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }));
  let got = dur(`data/projects/${p1}/final.mp4`);
  check("用例2 fade 标记生效（10s−0.5s≈9.5s）", Math.abs(got - 9.5) < 0.35, `${got.toFixed(2)}s`);
  await j(await afetch(`${API}/api/projects/${p1}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ crossfadeMs: 800 }) }));
  got = dur(`data/projects/${p1}/final.mp4`);
  check("用例3 全局 crossfadeMs=800 覆盖（≈9.2s）", Math.abs(got - 9.2) < 0.35, `${got.toFixed(2)}s`);

  // ── 用例 4：导出后列表 finalReady=true ──
  const list = await (await afetch(`${API}/api/projects`)).json();
  check("用例4 导出后 finalReady=true", list.find((p) => p.id === p1)?.finalReady === true);

  // ── 用例 5：段序调整 ──
  const order = d2.map((s) => s.id).reverse();
  r = await j(await afetch(`${API}/api/projects/${p1}/segments/order`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) }));
  const d3 = (await (await afetch(`${API}/api/projects/${p1}`)).json()).segments;
  check("用例5 段序反转生效", r.status === 200 && d3[0].id === order[0] && d3[0].idx === 1, `status=${r.status}`);
  r = await j(await afetch(`${API}/api/projects/${p1}/segments/order`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: [order[0]] }) }));
  check("用例5b 不完整 order 被拒 400", r.status === 400, `status=${r.status}`);

  // ── 用例 6：非法入参 → 400（不再是 500）──
  r = await j(await afetch(`${API}/api/projects/${p1}/segments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "短", duration: 3 }) }));
  check("用例6a 时长 3s → 400", r.status === 400, `status=${r.status}`);
  r = await j(await afetch(`${API}/api/projects/${p1}/segments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "长", duration: 31 }) }));
  check("用例6b 时长 31s → 400", r.status === 400, `status=${r.status}`);

  // ── 用例 7：不存在的项目 → 404 ──
  r = await j(await afetch(`${API}/api/projects/does-not-exist`));
  check("用例7 缺项目 → 404", r.status === 404, `status=${r.status}`);

  // ── 用例 8：时长超 provider 上限 → 建任务前失败，不产生调用 ──
  const fake = { id: "qa-fake-minimax", kind: "minimax", label: "QA假MiniMax", baseUrl: "https://invalid.local", modelId: "x", apiKey: "sk-qa" };
  await apply({ ...base, providers: [...base.providers, fake], videoDefaultId: fake.id });
  await afetch(`${API}/api/projects/${p1}/segments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "超上限段", duration: 20 }) });
  const p1now = await (await afetch(`${API}/api/projects/${p1}`)).json();
  const seg20 = p1now.segments.find((s) => s.duration === 20);
  await afetch(`${API}/api/segments/${seg20.id}/generate`, { method: "POST" });
  const d4 = await waitSegs(p1, 3);
  const over = d4.segments.find((s) => s.duration === 20);
  check("用例8 超 15s 上限被拦（不建任务）", over.status === "failed" && /最长 15s/.test(over.error ?? "") && d4.generation.calls === 2,
    `error=${(over.error ?? "").slice(0, 50)} · calls=${d4.generation.calls}`);
  await apply({ ...base, videoDefaultId: mock.id });

  // ── 用例 9：无对话模型时 chat/propose → 400 ──
  await apply({ providers: [fake] });
  r = await j(await afetch(`${API}/api/projects/${p1}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "hi" }) }));
  check("用例9a 无对话模型 chat → 400", r.status === 400, `status=${r.status} body=${JSON.stringify(r.body).slice(0, 60)}`);
  r = await j(await afetch(`${API}/api/projects/${p1}/storyboard/propose`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }));
  check("用例9b 无对话模型 propose → 400", r.status === 400, `status=${r.status}`);
  await apply({ ...base, videoDefaultId: mock.id });

  // ── 用例 10：9:16 导出尺寸（切回 mock 生成）──
  await apply({ ...base, videoDefaultId: mock.id });
  r = await j(await afetch(`${API}/api/projects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "QA2-竖屏", ratio: "9:16" }) }));
  const p2 = r.body.id;
  await afetch(`${API}/api/projects/${p2}/segments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "竖屏", duration: 5 }) });
  await afetch(`${API}/api/projects/${p2}/generate-all`, { method: "POST" });
  await waitSegs(p2, 1);
  await j(await afetch(`${API}/api/projects/${p2}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }));
  const dim = execFileSync(ffprobe, ["-v","error","-select_streams","v:0","-show_entries","stream=width,height","-of","csv=p=0", `data/projects/${p2}/final.mp4`]).toString().trim();
  check("用例10 竖屏导出 720x1280", dim === "720,1280", dim);

  // ── 用例 11：未登录拉成片 401 / 删除级联 ──
  const raw = await fetch(`${API}/files/projects/${p1}/final.mp4`);
  check("用例11a 未登录拉成片 401", raw.status === 401, `status=${raw.status}`);
  await afetch(`${API}/api/projects/${p2}`, { method: "DELETE" });
  r = await j(await afetch(`${API}/api/projects/${p2}`));
  check("用例11b 删除后 404", r.status === 404, `status=${r.status}`);
  await 
afetch(`${API}/api/projects/${p1}`, { method: "DELETE" });
} finally {
  const rr = await afetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orig) });
  if (!rr.ok) console.error("[restore FAILED]", rr.status, await rr.text());
  else {
    const back = await (await afetch(`${API}/api/settings`)).json();
    console.log(`[restore] videoDefault=${back.videoDefaultId} · providers=${back.providers.map((p) => p.id).join(",")}`);
  }
}
console.log(`done ${pass} pass / ${fail} fail`);
process.exitCode = fail ? 1 : 0;
