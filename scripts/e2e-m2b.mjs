// M2b 验收：首页 → Vanish Input 跳转 → 工作台全链路（对话/提案/采用/生成/导出）+ 截图
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { path as ffprobe } from "@ffprobe-installer/ffprobe";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:5173";
const API = "http://localhost:8787";

const settings = await (await fetch(`${API}/api/settings`)).json();
const origDefault = settings.chatDefaultId;
const origVideoDefault = settings.videoDefaultId;
let injected = null;
if (!settings.providers.some((p) => p.kind === "mock")) {
  injected = { id: "e2e-mock-" + Date.now(), kind: "mock", label: "E2E 临时 Mock" };
  settings.providers.push(injected);
}
const e2eMock = settings.providers.find((p) => p.kind === "mock");
if (origDefault !== e2eMock.id || origVideoDefault !== e2eMock.id) {
  await fetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...settings, chatDefaultId: e2eMock.id, videoDefaultId: e2eMock.id }) });
  console.log(`[setup] chat/video default -> ${e2eMock.id}`);
}

let pid;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  for (const p of await (await fetch(`${API}/api/projects`)).json()) {
    if (p.title === "M2b验收") await fetch(`${API}/api/projects/${p.id}`, { method: "DELETE" });
  }
  // 1. 首页
  await page.goto(BASE);
  await page.waitForSelector("text=把一句话");
  await wait(1200); // 等 spotlight/dot/blur 动画进入稳态
  await page.screenshot({ path: "screenshots/m2b-01-landing.png", fullPage: true });

  // 2. Vanish Input 输入并回车 → 应跳 /app
  await page.getByRole("textbox").fill("夕阳下的跨海大桥，车流延时");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/app", { timeout: 10000 });
  await wait(600);

  // 3. 建项目走全链路
  await page.getByRole("button", { name: /新建项目/ }).click();
  await page.getByLabel("标题").fill("M2b验收");
  await page.getByRole("button", { name: /^创建$/ }).click();
  await wait(800);
  pid = (await (await fetch(`${API}/api/projects`)).json()).find((p) => p.title === "M2b验收").id;

  await page.getByPlaceholder(/跟顾问说说你的想法/).fill("想要30秒城市日落宣传片");
  await page.getByRole("button", { name: "发送" }).click();
  await page.waitForSelector("text=齐了就让我出分镜", { timeout: 20000 });
  await page.getByRole("button", { name: /生成完整分镜/ }).click();
  await page.waitForSelector("text=城市日落三十秒", { timeout: 30000 });
  await page.getByRole("button", { name: /采用到时间线|替换现有/ }).click();
  await wait(600);
  await page.screenshot({ path: "screenshots/m2b-02-workbench.png" });

  await page.getByRole("button", { name: /生成全部/ }).click();
  const t0 = Date.now();
  for (;;) {
    const n = await page.locator("video").count();
    if (n >= 3) break;
    if (Date.now() - t0 > 180000) throw new Error("generate timeout");
    await wait(2000);
  }
  await page.screenshot({ path: "screenshots/m2b-03-generating.png" });
  await page.getByRole("button", { name: /导出成片/ }).click();
  await page.getByRole("button", { name: /确认拼接/ }).click();
  await page.waitForSelector("video[controls]", { timeout: 120000 });
  await wait(1500);
  await page.screenshot({ path: "screenshots/m2b-04-final.png" });

  const dur = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
    `data/projects/${pid}/final.mp4`]).toString().trim());
  if (!(dur > 28 && dur < 32)) throw new Error("duration " + dur);
  console.log(`E2E-M2b PASS · final=${dur.toFixed(1)}s · 截图 screenshots/m2b-0*.png`);
} finally {
  await browser.close();
  await fetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...settings, chatDefaultId: origDefault, videoDefaultId: origVideoDefault }) });
  console.log("[restore] 设置已还原");
}
