import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5173/app");
await page.getByRole("button", { name: "M2c验收" }).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: /生成全部/ }).click();
await page.waitForSelector("text=确认消耗算力生成视频？");
const info = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("[role=dialog] button")].map(b => JSON.stringify(b.textContent));
  const bg = document.querySelector("[aria-hidden].pointer-events-none.-z-10");
  const last = bg?.lastElementChild;
  return { btns, lastStyle: last?.getAttribute("style")?.slice(0, 120), lastClass: last?.className?.slice(0, 60) };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
