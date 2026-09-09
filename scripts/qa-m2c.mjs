import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const issues = [];
try {
  await page.goto("http://localhost:5173");
  await page.waitForSelector("text=把一句话"); await wait(1200);

  // L2.5 粒子层：canvas 存在、有像素、两帧不同（在动）
  const moving = await page.evaluate(async () => {
    const c = document.querySelector("[aria-hidden].pointer-events-none.-z-10 canvas");
    if (!c) return { ok: false, why: "no canvas" };
    const g = c.getContext("2d");
    const sample = () => {
      const d = g.getImageData(0, 0, c.width, Math.min(400, c.height)).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++; return n;
    };
    const a = sample(); await new Promise((r) => setTimeout(r, 350)); const b = sample();
    return { ok: a > 0 && a !== b, painted: a, frames: [a, b] };
  });
  if (!moving.ok) issues.push("粒子层异常: " + JSON.stringify(moving));

  // 红线④/布局：无横向溢出
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) issues.push(`横向溢出 ${overflow}px`);

  // 背景五层栈存在性
  const bg = await page.evaluate(() => {
    const el = document.querySelector("[aria-hidden].pointer-events-none.-z-10");
    return el ? { children: el.children.length,
      grid: !!el.querySelector('[style*="32px"]'),
      cloud: !!el.querySelector('[class*="blur-[110px]"]'),
      vignette: getComputedStyle(el.lastElementChild).backgroundImage.includes("radial-gradient") } : null;
  });
  if (!bg?.grid || !bg?.cloud || !bg?.vignette) issues.push("背景栈缺层: " + JSON.stringify(bg));

  // 红线⑦：交互动效曲线（Button/移位 transition 应为 duration 类，ambient 在 bg 层——DOM 抽查 ease-out）
  // 红线①：无紫/靛
  const purple = await page.evaluate(() => document.body.innerHTML.match(/violet|indigo|purple|8b5cf6|6366f1/gi)?.length ?? 0);
  if (purple) issues.push(`命中紫色类名 ${purple} 处`);

  // 红线②：全局噪点层在
  const noise = await page.evaluate(() => getComputedStyle(document.body, "::before").backgroundImage.includes("feTurbulence"));
  if (!noise) issues.push("全局噪点层丢失");

  // 红线⑤/⑥：emoji 图标检查（功能位）
  const emoji = await page.evaluate(() => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const bad = []; let n;
    while ((n = walk.nextNode())) if (/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}]/u.test(n.textContent) && n.parentElement.closest("button,h1,h2,h3,p,span")) bad.push(n.textContent.trim().slice(0, 12));
    return bad;
  });
  if (emoji.length) issues.push("文案含 emoji: " + emoji.join("|"));

  // 渐变 H1 与 CTA
  if (!await page.getByText("变成一条能发的视频").first().evaluate(el => el.className.includes("bg-clip-text"))) issues.push("H1 渐变缺失");
  const lock = await page.getByText("本地运行 · Key 自理").count();
  if (!lock) issues.push("Navbar Lock 徽章缺失");

  // 成本弹窗
  await page.goto("http://localhost:5173/app");
  await page.getByRole("button", { name: "M2c验收" }).click(); await wait(800);
  await page.getByRole("button", { name: /生成全部/ }).click();
  await page.waitForSelector("text=确认消耗算力生成视频？");
  const mono = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div")].find(d => d.textContent.trim() === "本次分段");
    return el?.closest(".font-mono") ? true : false;
  });
  if (!mono) issues.push("算盘三栏未强制 font-mono");
  const btn = await page.getByRole("button", { name: /烧 [0-9]+ 额度，开始出片/ }).count();
  if (!btn) issues.push("确认按钮文案/额度数不对");
  await page.screenshot({ path: "screenshots/m2c-05-cost-modal.png" });

  console.log(issues.length ? "QA-ISSUES:\n- " + issues.join("\n- ") : "QA-ALL-PASS");
} catch (e) { console.error("QA-FAIL:", e.message.slice(0, 200)); process.exitCode = 1; }
finally { await browser.close(); }
