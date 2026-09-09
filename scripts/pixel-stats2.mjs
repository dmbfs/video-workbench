import { chromium } from "playwright";
const b = await chromium.launch();

// A) 真实页面（不隐藏任何东西）→ H1 橙渐变对比度
const p1 = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p1.goto("http://localhost:5173");
await p1.waitForSelector("text=把一句话");
await p1.waitForTimeout(1600);
const shot = await p1.screenshot();
const h1 = await p1.evaluate(async (dataUrl) => {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(84, 290, 700, 200).data, w = 700;
  const lum = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  let txt = [], bg = [];
  for (let i = 0; i < w * 200; i++) { const L = lum(i * 4); (L > 90 ? txt : L < 40 ? bg : []).push(L); }
  const avg = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN;
  const rel = (L) => { const s = L / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const t = avg(txt), b2 = avg(bg);
  return { n: txt.length, ratio: (rel(t) + 0.05) / (rel(b2) + 0.05), t, b2 };
}, `data:image/png;base64,${shot.toString("base64")}`);
console.log(`H1 橙渐变 vs 深底 对比度: ${h1.ratio.toFixed(1)}:1（字均亮 ${h1.t?.toFixed(0)} / 底 ${h1.b2?.toFixed(0)}，取样 ${h1.n}px）${h1.ratio >= 4.5 ? " → ≥4.5 过 §8" : " → 不足"}`);
await p1.close();

// B) 纯背景 → 粒子真实可见度（阈值 35）+ 尺寸分布
const p2 = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p2.goto("http://localhost:5173");
await p2.waitForSelector("text=把一句话");
await p2.waitForTimeout(1500);
await p2.addStyleTag({ content: "#root > div > *:not([aria-hidden]) { visibility: hidden !important; }" });
await p2.waitForTimeout(300);
const buf = await p2.screenshot();
const dots = await p2.evaluate(async (dataUrl) => {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const W = c.width, H = c.height, d = g.getImageData(0, 0, W, H).data;
  const lum = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  let dots35 = 0, dots55 = 0, maxL = 0;
  const seen = new Uint8Array(W * H);
  const sizes = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, L = lum(i * 4); if (L > maxL) maxL = L;
    if (L > 35 && !seen[i]) {
      dots35++; let q = [[x, y]], pix = 0;
      while (q.length) { const [qx, qy] = q.pop(); if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue; const j = qy * W + qx;
        if (seen[j]) continue; seen[j] = 1; if (lum(j * 4) > 35) { pix++; dots55 += lum(j * 4) > 55 ? 1 : 0; q.push([qx+1,qy],[qx-1,qy],[qx,qy+1],[qx,qy-1]); } }
      sizes.push(pix);
    }
  }
  sizes.sort((a, b2) => b2 - a);
  return { dots35, dots55, maxL: maxL.toFixed(0), biggest: sizes.slice(0, 5) };
}, `data:image/png;base64,${buf.toString("base64")}`);
console.log(`粒子（纯背景）: >35 亮斑 ${dots.dots35} 个 / >55 的 ${dots.dots55} 个，最亮 ${dots.maxL}/255，最大亮斑 ${dots.biggest.join(",")}px`);
console.log(dots.dots35 < 10 ? "→ 粒子几乎不可见，特效名存实亡" : dots.dots35 > 80 ? "→ 偏抢戏" : "→ 可见且克制");
await b.close();
