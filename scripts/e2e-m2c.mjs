// M2c 落地页重设计自检：五层背景 + Hero 7:5 + Bento 微 UI + 成本算盘弹窗 → screenshots/m2c-*.png
import { chromium } from "playwright";
import { registerOrLogin } from "./lib-auth.mjs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:5173";
const API = "http://localhost:8787";

const auth = await registerOrLogin(API);
const afetch = (url, opts = {}) => fetch(url, { ...opts, headers: { ...(opts.headers ?? {}), cookie: auth.cookie } });

// 清理 + 造数据：项目 + 2 段分镜（5s/3s，总 8s）
for (const p of await (await afetch(`${API}/api/projects`)).json()) {
  if (p.title === "M2c验收") await afetch(`${API}/api/projects/${p.id}`, { method: "DELETE" });
}
const proj = await (await afetch(`${API}/api/projects`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "M2c验收", ratio: "16:9" }),
})).json();
await afetch(`${API}/api/projects/${proj.id}/segments`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "夕阳下的跨海大桥，车流延时", duration: 5 }),
});
await afetch(`${API}/api/projects/${proj.id}/segments`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "霓虹夜航，赛博朋克城市", duration: 5 }),
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.context().addCookies([{ name: auth.name, value: auth.value, url: BASE }]);
try {
  // 1. 落地页整页（背景五层栈 + Hero 7:5 + Bento）
  await page.goto(BASE);
  await page.waitForSelector("text=把一句话");
  await wait(1800); // 等光云呼吸/blur-fade 进稳态
  await page.screenshot({ path: "screenshots/m2c-01-landing-full.png", fullPage: true });

  // 2. Hero 视口
  await page.screenshot({ path: "screenshots/m2c-02-hero.png" });

  // 3. Bento 微 UI
  await page.getByText("为什么不是又一个").scrollIntoViewIfNeeded();
  await wait(900);
  await page.screenshot({ path: "screenshots/m2c-03-bento.png" });

  // 4. 工作台成本算盘弹窗
  await page.goto(`${BASE}/app`);
  await page.getByRole("button", { name: "M2c验收" }).click();
  await wait(900);
  await page.screenshot({ path: "screenshots/m2c-04-workbench.png" });
  await page.getByRole("button", { name: /生成全部/ }).click();
  await page.waitForSelector("text=确认消耗算力生成视频？");
  await wait(500);
  await page.screenshot({ path: "screenshots/m2c-05-cost-modal.png" });

  console.log("M2C-SCREENSHOTS-OK");
} catch (e) {
  await page.screenshot({ path: "screenshots/m2c-error.png", fullPage: true });
  console.error("M2C-FAIL:", e.message.slice(0, 300));
  process.exitCode = 1;
} finally {
  await browser.close();
  if (proj?.id) await afetch(`${API}/api/projects/${proj.id}`, { method: "DELETE" }); // 清理测试项目
}
