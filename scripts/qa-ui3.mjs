import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:8787";
const { registerOrLogin } = await import("./lib-auth.mjs");
const auth = await registerOrLogin(API);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let pass = 0, fail = 0;
const check = (n, c, d = "") => { console.log(`${c ? "✅" : "❌"} ${n}${d ? " · " + d : ""}`); c ? pass++ : fail++; };
try {
  await page.context().addCookies([{ name: auth.name, value: auth.value, url: "http://localhost:5173" }]);
  await page.goto("http://localhost:5173/app");
  await page.getByRole("button", { name: /新建项目/ }).click();
  await page.getByLabel("标题").fill("QA-UI编辑");
  await page.getByRole("button", { name: /^创建$/ }).click();
  await page.waitForSelector("text=QA-UI编辑");
  const add = async (t) => { await page.getByPlaceholder(/把脑子里那个画面/).fill(t); await page.getByRole("button", { name: "加入分镜" }).click(); await wait(400); };
  await add("第一段：日落大桥");
  await add("第二段：咖啡店");
  await add("第三段：霓虹夜");
  await wait(400);

  // 1. 点击 prompt 进入编辑 → 改文案 → Enter 保存
  await page.getByText("第一段：日落大桥").click();
  await page.getByPlaceholder(/把脑子里那个画面/).pressSequentially === undefined; // noop guard
  const editBox = page.locator("input.h-8.text-sm");
  await editBox.fill("第一段已改：金色黄昏");
  await editBox.press("Enter");
  await wait(600);
  check("UI1 prompt 点击编辑保存", await page.getByText("第一段已改：金色黄昏").count() === 1);

  // 2. 第 1 段「后移」→ 顺序交换
  await page.locator('button[title="后移"]').first().click();
  await wait(600);
  const firstCardText = await page.locator("p.line-clamp-2").first().textContent();
  check("UI2 段序后移生效", firstCardText?.includes("第二段") || firstCardText?.includes("第一段已改") === false, `first=${firstCardText?.slice(0, 12)}`);

  // 3. 转场切换：点第一张卡的剪刀 → 变叠化
  const scissorCount = await page.locator('button[title="转场：硬切（点我改叠化）"]').count();
  if (scissorCount > 0) {
    await page.locator('button[title="转场：硬切（点我改叠化）"]').first().click();
    await wait(600);
    check("UI3 转场切到叠化", await page.locator('button[title="转场：叠化 0.5s（点我改硬切）"]').count() >= 1);
  } else check("UI3 转场切到叠化", false, "找不到剪刀按钮");
  await page.screenshot({ path: "screenshots/qa-fr3-editing.png", fullPage: true });
} catch (e) {
  await page.screenshot({ path: "screenshots/qa-ui3-fail.png", fullPage: true });
  console.error("FAIL:", e.message.split("\n")[0]); fail++;
} finally {
  // 清理项目
  const rs = await fetch(`${API}/api/projects`, { headers: { cookie: auth.cookie } }).then((r) => r.json());
  for (const p of rs) if (p.title === "QA-UI编辑") await fetch(`${API}/api/projects/${p.id}`, { method: "DELETE", headers: { cookie: auth.cookie } });
  await browser.close();
}
console.log(`\n结果：${pass} 过 / ${fail} 挂`);
process.exitCode = fail ? 1 : 0;
