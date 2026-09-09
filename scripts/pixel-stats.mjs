// 纯背景层量化：隐藏内容只留五层背景栈 + 从真实截图测 H1 对比度
import { chromium } from "playwright";

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:5173");
await page.waitForSelector("text=把一句话");
await page.waitForTimeout(1500);
// 隐藏内容，只留背景组件（MotionBackground 根有 aria-hidden）
await page.addStyleTag({ content: "#root > div > *:not([aria-hidden]) { visibility: hidden !important; }" });
await page.waitForTimeout(400);
const buf = await page.screenshot();
const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;

const stats = await page.evaluate(async (dataUrl) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const W = c.width, H = c.height;
  const d = g.getImageData(0, 0, W, H).data;
  const lum = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  const px = (x, y) => lum((y * W + x) * 4);

  // 1) 网格线对比度：列亮度剖面（y 200-700 平均），网格 32px 周期
  const col = [];
  for (let x = 96; x < W - 96; x++) {
    let s = 0; for (let y = 200; y < 700; y += 4) s += px(x, y);
    col.push({ x, v: s / 125 });
  }
  // 找 32px 相位：取列亮度峰值间隔验证
  const lineV = [], offV = [];
  for (const { x, v } of col) (x % 32 < 1.5 || x % 32 > 30.5 ? lineV : offV).push(v);
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const lineMean = avg(lineV), offMean = avg(offV);

  // 2) 粒子：整幅亮点亮斑（背景-only，>55 记为亮点），简单连通计数（贪心 4 邻域去重）
  let dots = 0, dotPix = 0, maxL = 0;
  const seen = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const L = px(x, y); if (L > maxL) maxL = L;
    if (L > 55 && !seen[y * W + x]) {
      dots++; let q = [[x, y]];
      while (q.length) { const [qx, qy] = q.pop(); if (qx < 0 || qy < 0 || qx >= W || qy >= H || seen[qy * W + qx]) continue;
        seen[qy * W + qx] = 1; if (px(qx, qy) > 55) { dotPix++; q.push([qx+1,qy],[qx-1,qy],[qx,qy+1],[qx,qy-1]); } }
    }
  }

  // 3) 噪点幅度：取 200×200 平坦区（右下）的亮度标准差
  let vals = [];
  for (let y = 640; y < 840; y++) for (let x = 1140; x < 1340; x++) vals.push(px(x, y));
  const m = vals.reduce((s, v) => s + v, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length);

  // 4) 光云/暗角：顶部中心 vs 角落
  let topC = 0; for (let i = 0; i < 400; i++) topC += px(560 + (i % 20) * 2, 30 + Math.floor(i / 20) * 2); topC /= 400;
  let corner = 0; for (let i = 0; i < 400; i++) corner += px(10 + (i % 20) * 2, 10 + Math.floor(i / 20) * 2); corner /= 400;

  return { lineMean, offMean, lineDelta: lineMean - offMean, dots, dotPix, maxL, noiseSd: sd, noiseMean: m, topCenter: topC, corner };
}, dataUrl);

console.log("== 纯背景层 ==");
console.log(`网格线均亮 ${stats.lineMean.toFixed(2)} vs 线间 ${stats.offMean.toFixed(2)} → 线差 ${stats.lineDelta.toFixed(2)}/255 ${stats.lineDelta > 10 ? "→ 偏显眼" : "→ 极淡合规"}`);
console.log(`粒子亮斑数 ${stats.dots}（共 ${stats.dotPix}px，最亮 ${stats.maxL.toFixed(0)}）${stats.dots > 120 ? "→ 偏多" : "→ 密度合适"}`);
console.log(`噪点平坦区: 均值 ${stats.noiseMean.toFixed(1)} 标准差 ${stats.noiseSd.toFixed(2)} ${stats.noiseSd > 6 ? "→ 噪点过重(100% 会脏)" : "→ 100% 不脏"}`);
console.log(`光云顶中 ${stats.topCenter.toFixed(1)} vs 角落 ${stats.corner.toFixed(1)}（暗角压暗差 ${(stats.topCenter - stats.corner).toFixed(1)}）`);

// 5) H1 对比度（真实截图，橙渐变文字 vs 局部底）
await page.evaluate(() => { document.querySelectorAll("#root > div > *:not([aria-hidden])").forEach(e => e.style.visibility = ""); });
const shot2 = await page.screenshot();
const h1 = await page.evaluate(async (dataUrl) => {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(84, 300, 636, 180).data, w = 636;
  const lum = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  let txt = [], bg = [];
  for (let i = 0; i < w * 180; i++) { const L = lum(i * 4); (L > 90 ? txt : bg).push(L); }
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const rel = (L) => { const s = L / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const t = avg(txt), b2 = avg(bg);
  return { txtN: txt.length, ratio: (rel(t) + 0.05) / (rel(b2) + 0.05), t, b2 };
}, `data:image/png;base64,${shot2.toString("base64")}`);
console.log(`H1 橙渐变对比度: ${h1.ratio.toFixed(1)}:1（文字均亮 ${h1.t.toFixed(0)} / 底 ${h1.b2.toFixed(0)}，${h1.ratio >= 4.5 ? "≥4.5 过 §8" : "不足!"}，取样 ${h1.txtN}px）`);
await b.close();
