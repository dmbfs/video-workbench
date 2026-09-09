import { useEffect, useRef } from "react";

/**
 * 背景粒子流场（Layer 2，DESIGN.md §3.5 v1.2.1）
 * 粒子群共享同一个无旋流场（三层正弦势的解析梯度，不可压缩 → 自然成股、不堆积），
 * 同区域粒子同向流动形成可见的「流」。20s 阵风调制整体节奏。
 * 三类粒子：尘埃(辉光点)/流光(短拖尾)/彗星(多点渐隐拖尾)。零依赖、非 WebGL；
 * reduced-motion 静止单帧、页签隐藏停帧、DPR≤2、数量随视口自适应（≤420，1440×900 ≈ 380）。
 */

// 共享流场：三层正弦势 φ=ΣA·sin(kx·x+ky·y+w·t+p)，v=(∂φ/∂y, −∂φ/∂x) 无旋
const OCT = [
  { kx: 0.004, ky: 0.009, w: 0.00018, A: 260, p: 0 },
  { kx: -0.007, ky: 0.005, w: -0.00026, A: 150, p: 2.1 },
  { kx: 0.012, ky: -0.008, w: 0.00042, A: 70, p: 4.2 },
];

export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const makeSprite = (r: number, g: number, b: number) => {
      const s = document.createElement("canvas");
      s.width = s.height = 32;
      const c = s.getContext("2d")!;
      const grad = c.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(0.35, `rgba(${r},${g},${b},.45)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = grad;
      c.fillRect(0, 0, 32, 32);
      return s;
    };
    const dustSprite = makeSprite(255, 237, 213);
    const C_TAIL = [249, 115, 22] as const;
    const C_HEAD = [252, 211, 77] as const;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // 共享流场采样（全粒子同源）
    const flow = (x: number, y: number, t: number): [number, number] => {
      let vx = 0, vy = 0;
      for (const o of OCT) {
        const c = Math.cos(o.kx * x + o.ky * y + o.w * t + o.p);
        vx += o.A * o.ky * c;
        vy -= o.A * o.kx * c;
      }
      return [vx, vy];
    };

    type P = {
      kind: 0 | 1 | 2;
      x: number; y: number; px: number; py: number;
      base: number; mul: number;
      a: number; size: number; tw: number; phase: number;
      trail?: { x: number; y: number }[];
    };
    let particles: P[] = [];
    let w = 0, h = 0, raf = 0, running = true, last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(420, Math.floor((w * h) / 3400));
      particles = Array.from({ length: n }, (_, i) => {
        const r = i / n;
        const kind: 0 | 1 | 2 = r < 0.48 ? 0 : r < 0.88 ? 1 : 2;
        const x = Math.random() * w, y = Math.random() * h;
        return {
          kind,
          x, y, px: x, py: y,
          base: kind === 0 ? 0.3 + Math.random() * 0.25 : kind === 1 ? 0.8 + Math.random() * 0.5 : 2.0 + Math.random() * 1.2,
          mul: kind === 0 ? 0.35 : kind === 1 ? 0.7 : 1.6,
          a: kind === 0 ? 0.08 + Math.random() * 0.1 : kind === 1 ? 0.18 + Math.random() * 0.14 : 0.4 + Math.random() * 0.15,
          size: kind === 0 ? 1.6 + Math.random() * 1.6 : kind === 1 ? 1.8 + Math.random() * 1.2 : 2.2 + Math.random() * 1.4,
          tw: 0.0008 + Math.random() * 0.0012,
          phase: Math.random() * Math.PI * 2,
          trail: kind === 2 ? [] : undefined,
        };
      });
    };

    const step = (t: number) => {
      if (!running) return;
      const dt = Math.min(2, last ? (t - last) / 16.7 : 1);
      last = t;
      const gust = 0.75 + 0.25 * Math.sin(t * (Math.PI * 2 / 20000));

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      for (const p of particles) {
        p.px = p.x; p.py = p.y;
        const [fx, fy] = flow(p.x, p.y, t);
        p.x += (p.base * gust + fx * p.mul) * dt;
        p.y += (fy * p.mul) * dt;

        if (p.x > w + 24) { p.x = -20; p.y = Math.random() * h; p.px = p.x; p.py = p.y; if (p.trail) p.trail = []; }
        if (p.x < -24) { p.x = w + 20; p.px = p.x; p.py = p.y; if (p.trail) p.trail = []; }
        if (p.y < -24) { p.y = h + 20; p.px = p.x; p.py = p.y; if (p.trail) p.trail = []; }
        if (p.y > h + 24) { p.y = -20; p.px = p.x; p.py = p.y; if (p.trail) p.trail = []; }

        if (p.kind === 0) {
          ctx.globalAlpha = p.a * (0.72 + 0.28 * Math.sin(t * p.tw + p.phase));
          ctx.drawImage(dustSprite, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        } else if (p.kind === 1) {
          ctx.globalAlpha = p.a;
          ctx.strokeStyle = "rgba(253,186,116,1)";
          ctx.lineWidth = p.size * 0.55;
          ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
        } else {
          p.trail!.push({ x: p.x, y: p.y });
          if (p.trail!.length > 9) p.trail!.shift();
          const tr = p.trail!;
          for (let s = 1; s < tr.length; s++) {
            const k = s / tr.length;
            ctx.globalAlpha = p.a * k;
            ctx.strokeStyle = `rgba(${lerp(C_TAIL[0], C_HEAD[0], k) | 0},${lerp(C_TAIL[1], C_HEAD[1], k) | 0},${lerp(C_TAIL[2], C_HEAD[2], k) | 0},1)`;
            ctx.lineWidth = p.size * k;
            ctx.beginPath(); ctx.moveTo(tr[s - 1].x, tr[s - 1].y); ctx.lineTo(tr[s].x, tr[s].y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(step);
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (const p of particles) {
        const [fx, fy] = flow(p.x, p.y, 0);
        const m = Math.hypot(fx, fy) || 1;
        const dx = (fx / m) * p.base * 22, dy = (fy / m) * p.base * 22;
        if (p.kind === 0) { ctx.globalAlpha = p.a; ctx.drawImage(dustSprite, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2); }
        else {
          ctx.globalAlpha = p.a * 0.8; ctx.strokeStyle = p.kind === 1 ? "rgba(253,186,116,1)" : "rgba(252,211,77,1)";
          ctx.lineWidth = p.size * 0.6;
          ctx.beginPath(); ctx.moveTo(p.x - dx, p.y - dy); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    };

    resize();
    const onResize = () => { resize(); if (reduced) drawStatic(); };
    window.addEventListener("resize", onResize);

    if (reduced) { drawStatic(); }
    else {
      raf = requestAnimationFrame(step);
      const onVis = () => {
        if (document.hidden) { running = false; cancelAnimationFrame(raf); }
        else if (!running) { running = true; last = 0; raf = requestAnimationFrame(step); }
      };
      document.addEventListener("visibilitychange", onVis);
      return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", onVis); };
    }
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}
