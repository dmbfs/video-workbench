// M1 端到端验收：建项目 → 加 3 段 → mock 生成 → 拼接导出 → ffprobe 断言 + 截图
// 运行前提：server(8787) 与 web(5173) 已在运行
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { path as ffprobe } from "@ffprobe-installer/ffprobe";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:5173";
const API = "http://localhost:8787";

// 确保默认 chat/video 都指向 mock（结束恢复原配置）——否则会打真实模型并计费
const settings = await (await fetch(`${API}/api/settings`)).json();
const origChatDefault = settings.chatDefaultId;
const origVideoDefault = settings.videoDefaultId;
if (!settings.providers.some((p) => p.kind === "mock")) {
  settings.providers.push({ id: "e2e-mock-" + Date.now(), kind: "mock", label: "E2E 临时 Mock" });
}
const e2eMock = settings.providers.find((p) => p.kind === "mock");
if (origChatDefault !== e2eMock.id || origVideoDefault !== e2eMock.id) {
  await fetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...settings, chatDefaultId: e2eMock.id, videoDefaultId: e2eMock.id }) });
  console.log(`[setup] chat/video default -> ${e2eMock.id}（结束自动恢复）`);
}

async function waitVideos(page, n, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    const count = await page.locator("video").count();
    if (count >= n) return;
    if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting ${n} videos, got ${count}`);
    await wait(2000);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(BASE + "/app");
  await page.waitForSelector("text=vidstitch");

  // 1. 新建项目（默认 16:9）
  await page.getByRole("button", { name: /新建项目/ }).click();
  await page.getByLabel("标题").fill("日落宣传测试");
  await page.getByRole("button", { name: /^创建$/ }).click();
  await page.waitForSelector("text=日落宣传测试");
  await wait(800);

  // 2. 设置页截图（红线核对：噪点/深灰橙/无紫色）
  await page.getByRole("tab", { name: "设置" }).click();
  await wait(600);
  await page.screenshot({ path: "screenshots/m1-01-settings.png", fullPage: true });

  // 3. 回创作页，加 3 段
  await page.getByRole("tab", { name: "创作" }).click();
  const segs = [
    "城市日落航拍，金色余晖洒满高架桥",
    "街角咖啡店暖光，顾客举杯剪影",
    "夜幕降临霓虹亮起，人流延时",
  ];
  for (const s of segs) {
    await page.getByPlaceholder(/把脑子里那个画面/).fill(s);
    await page.getByRole("button", { name: /加入分镜/ }).click();
    await wait(300);
  }
  await page.screenshot({ path: "screenshots/m1-02-storyboard.png" });

  // 4. 生成全部，等待 3 段都出视频
  await page.getByRole("button", { name: /生成全部/ }).click();
  await page.getByRole("button", { name: /开始出片/ }).click(); // FR-9 成本确认弹窗
  await wait(2500);
  await page.screenshot({ path: "screenshots/m1-03-generating.png" });
  await waitVideos(page, 3, 180000);

  // 5. 导出
  await page.getByRole("button", { name: /导出成片/ }).click();
  await page.getByRole("button", { name: /确认拼接/ }).click();
  await page.waitForSelector("video[controls]", { timeout: 120000 });
  await wait(1500);
  await page.screenshot({ path: "screenshots/m1-04-final.png" });

  // 6. ffprobe 断言成片时长 28–32s
  const pid = (await (await fetch("http://localhost:8787/api/projects")).json())
    .find((p) => p.title === "日落宣传测试").id;
  const out = execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
    `data/projects/${pid}/final.mp4`]).toString().trim();
  const dur = Number(out);
  if (!(dur > 28 && dur < 32)) throw new Error("final duration out of range: " + dur);
  console.log(`E2E PASS · final.mp4 = ${dur.toFixed(1)}s · screenshots in ./screenshots/`);
} finally {
  await browser.close();
  await fetch(`${API}/api/settings`, { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...settings, chatDefaultId: origChatDefault, videoDefaultId: origVideoDefault }) });
  console.log(`[restore] chat/video default -> ${origChatDefault} / ${origVideoDefault}`);
}
