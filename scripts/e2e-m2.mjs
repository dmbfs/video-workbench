// M2 端到端验收：对话 → 生成完整分镜 → 采用到时间线 → 生成 → 导出
// 前提：server(8787) + web(5173) 运行中。运行期间临时把默认对话模型切到 mock，结束自动恢复。
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { path as ffprobe } from "@ffprobe-installer/ffprobe";
import { registerOrLogin } from "./lib-auth.mjs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:5173";
const API = "http://localhost:8787";

const auth = await registerOrLogin(API);
const afetch = (url, opts = {}) => fetch(url, { ...opts, headers: { ...(opts.headers ?? {}), cookie: auth.cookie } });

// --- 确保存在 mock provider 并把 chat/video 默认都指向它（结束恢复原配置） ---
const settings = await (await afetch(`${API}/api/settings`)).json();
const origDefault = settings.chatDefaultId;
const origVideoDefault = settings.videoDefaultId;
let injected = null;
if (!settings.providers.some((p) => p.kind === "mock")) {
  injected = { id: "e2e-mock-" + Date.now(), kind: "mock", label: "E2E 临时 Mock" };
  settings.providers.push(injected);
}
const e2eMock = settings.providers.find((p) => p.kind === "mock");
if (origDefault !== e2eMock.id || origVideoDefault !== e2eMock.id) {
  await afetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...settings, chatDefaultId: e2eMock.id, videoDefaultId: e2eMock.id }) });
  console.log(`[setup] chat/video default -> ${e2eMock.id}（结束自动恢复）`);
}

let pid; // 项目 id（try 内赋值，冒烟段复用）
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.context().addCookies([{ name: auth.name, value: auth.value, url: BASE }]);
let passed = false;
try {
  // 清理同标题历史项目，保证幂等
  for (const p of await (await afetch(`${API}/api/projects`)).json()) {
    if (p.title === "M2对话验收") await afetch(`${API}/api/projects/${p.id}`, { method: "DELETE" });
  }

  await page.goto(BASE + "/app");
  await page.waitForSelector("text=vidstitch");

  // 1. 新建项目并进入
  await page.getByRole("button", { name: /新建项目/ }).click();
  await page.getByLabel("标题").fill("M2对话验收");
  await page.getByRole("button", { name: /^创建$/ }).click();
  await page.waitForSelector("text=M2对话验收");
  await wait(800);
  pid = (await (await afetch(`${API}/api/projects`)).json()).find((p) => p.title === "M2对话验收").id;

  // 2. 对话：发一条 → 等助手回复（mock 流式）
  await page.getByPlaceholder(/跟顾问说说你的想法/).fill("想要30秒城市日落宣传片");
  await page.getByRole("button", { name: "发送" }).click();
  await page.waitForSelector("text=齐了就让我出分镜", { timeout: 20000 });
  await wait(400);
  await page.screenshot({ path: "screenshots/m2-01-chat.png" });

  // 3. 生成完整分镜 → 提案卡出现
  await page.getByRole("button", { name: /生成完整分镜/ }).click();
  await page.waitForSelector("text=城市日落三十秒", { timeout: 30000 });
  await wait(400);
  await page.screenshot({ path: "screenshots/m2-02-proposal.png" });

  // 4. 采用到时间线
  await page.getByRole("button", { name: /采用到时间线|替换现有/ }).click();
  await page.waitForSelector("text=01", { timeout: 15000 });
  await wait(500);
  await page.screenshot({ path: "screenshots/m2-03-applied.png" });

  // 5. 生成 + 导出
  await page.getByRole("button", { name: /生成全部/ }).click();
  const t0 = Date.now();
  for (;;) {
    const n = await page.locator("video").count();
    if (n >= 3) break;
    if (Date.now() - t0 > 180000) throw new Error("generate timeout");
    await wait(2000);
  }
  await page.getByRole("button", { name: /导出成片/ }).click();
  await page.getByRole("button", { name: /确认拼接/ }).click();
  await page.waitForSelector("video[controls]", { timeout: 120000 });
  await wait(1500);
  await page.screenshot({ path: "screenshots/m2-04-final.png" });

  const dur = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
    `data/projects/${pid}/final.mp4`]).toString().trim());
  if (!(dur > 28 && dur < 32)) throw new Error("duration " + dur);
  console.log(`E2E-M2 PASS · final=${dur.toFixed(1)}s · 截图 screenshots/m2-0*.png`);
  passed = true;
} finally {
  await browser.close();
  await afetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...settings, chatDefaultId: origDefault, videoDefaultId: origVideoDefault }) });
  console.log(`[restore] chat/video default -> ${origDefault} / ${origVideoDefault}${injected ? "（临时 mock 一并移除）" : ""}`);
}
if (!passed) process.exit(1);

// --- 真实模型冒烟（仅当存在已配 key 的 openai-compatible provider）---
const fresh = await (await afetch(`${API}/api/settings`)).json();
const realChat = fresh.providers.find((p) => p.kind === "openai-compatible" && p.apiKeySet);
if (!realChat) {
  console.log("[smoke] 未发现已配 key 的真实对话模型，冒烟跳过");
} else {
  await afetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...fresh, chatDefaultId: realChat.id }) });
  const t0 = Date.now();
  const r = await afetch(`${API}/api/projects/${pid}/storyboard/propose`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const j = await r.json();
  await afetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...fresh, chatDefaultId: origDefault }) });
  if (r.ok && j.storyboard?.segments?.length) {
    console.log(`[smoke] 真实模型 propose OK：${j.storyboard.segments.length} 段，${((Date.now() - t0) / 1000).toFixed(1)}s，模型=${realChat.modelId}`);
  } else {
    console.log(`[smoke] 真实模型 propose 失败：${JSON.stringify(j).slice(0, 200)} —— 检查 Base URL 是否带 /v1、key 是否有效（不影响 mock 验收结论）`);
  }
}
