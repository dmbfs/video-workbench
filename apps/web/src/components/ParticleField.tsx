import { useEffect, useRef } from "react";

/**
 * 背景粒子流场（Layer 2，DESIGN.md §3.5）
 * 「算力涌动」的克制版风暴：伪噪声流场驱动 + 20s 阵风调制 + 三类粒子（尘埃/流光/彗星）。
 * 线段拖尾（prev→cur，无累积缓冲，不遮光云）。零依赖、非 WebGL；
 * reduced-motion 静止单帧、页签隐藏停帧、DPR≤2、数量随视口自适应（≤140）。
 */
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 尘埃用 sprite 辉光点；流光/彗星用线段拖尾
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
    const C_TAIL = [249, 115, 22] as const;   // 彗星尾 orange-500
    const C_HEAD = [252, 211, 77] as const;   // 彗星头 amber-300
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    type P = {
      kind: 0 | 1 | 2;            // 0 尘埃 / 1 流光 / 2 彗星
      x: number; y: number; px: number; py: number;
      speed: number; amp: number; f1: number; f2: number; w1: number; w2: number;
      phase: number; a: number; size: number;
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
      const n = Math.min(140, Math.floor((w * h) / 11000));
      particles = Array.from({ length: n }, (_, i) => {
        const r = i / n;
        const kind: 0 | 1 | 2 = r < 0.7 ? 0 : r < 0.95 ? 1 : 2;
        const x = Math.random() * w, y = Math.random() * h;
        return {
          kind,
          x, y, px: x, py: y,
          speed: kind === 0 ? 0.2 + Math.random() * 0.3 : kind === 1 ? 0.6 + Math.random() * 0.6 : 1.8 + Math.random() * 1.2,
          amp: kind === 0 ? 10 + Math.random() * 18 : 14 + Math.random() * 26,
          f1: 0.0016 + Math.random() * 0.0022, f2: 0.0014 + Math.random() * 0.002,
          w1: 0.00035 + Math.random() * 0.0004, w2: 0.0003 + Math.random() * 0.0005,
          phase: Math.random() * Math.PI * 2,
          a: kind === 0 ? 0.1 + Math.random() * 0.12 : kind === 1 ? 0.2 + Math.random() * 0.18 : 0.45 + Math.random() * 0.15,
          size: kind === 0 ? 1.6 + Math.random() * 1.6 : kind === 1 ? 1.8 + Math.random() * 1.2 : 2.2 + Math.random() * 1.4,
          trail: kind === 2 ? [] : undefined,
        };
      });
    };

    const step = (t: number) => {
      if (!running) return;
      const dt = Math.min(2, last ? (t - last) / 16.7 : 1);
      last = t;
      const gust = 0.75 + 0.25 * Math.sin(t * (Math.PI * 2 / 20000)); // ~20s 阵风

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      for (const p of particles) {
        p.px = p.x; p.py = p.y;
        // 伪噪声流场：水平主流 + 卷曲扰动
        const curlX = Math.sin(p.y * p.f1 * 1000 + t * p.w1 + p.phase) * p.amp * 0.012;
        const curlY = Math.cos(p.x * p.f2 * 1000 + t * p.w2 + p.phase) * p.amp * 0.02;
        p.x += (p.speed * gust + curlX) * dt;
        p.y += curlY * dt;

        // 环绕重生（重生时清拖尾，防跨屏拉线）
        if (p.x > w + 24) { p.x = -20; p.y = Math.random() * h; p.px = p.x; p.py = p.y; if (p.trail) p.trail = []; }
        if (p.y < -24) { p.y = h + 20; p.px = p.x; p.py = p.y; if (p.trail) p.trail = []; }
        if (p.y > h + 24) { p.y = -20; p.px = p.x; p.py = p.y; if (p.trail) p.trail = []; }

        if (p.kind === 0) {
          // 尘埃：辉光点
          ctx.globalAlpha = p.a * (0.72 + 0.28 * Math.sin(t * 0.001 + p.phase));
          ctx.drawImage(dustSprite, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        } else if (p.kind === 1) {
          // 流光：单段短拖尾
          ctx.globalAlpha = p.a;
          ctx.strokeStyle = "rgba(253,186,116,1)";
          ctx.lineWidth = p.size * 0.55;
          ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
        } else {
          // 彗星：多点渐隐拖尾（尾 orange-500 → 头 amber-300）
          p.trail!.push({ x: p.x, y: p.y });
          if (p.trail!.length > 7) p.trail!.shift();
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

    const drawStatic = () => { // reduced-motion：一帧静态流线
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (const p of particles) {
        if (p.kind === 0) { ctx.globalAlpha = p.a; ctx.drawImage(dustSprite, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2); }
        else {
          ctx.globalAlpha = p.a * 0.8; ctx.strokeStyle = p.kind === 1 ? "rgba(253,186,116,1)" : "rgba(252,211,77,1)";
          ctx.lineWidth = p.size * 0.6;
          ctx.beginPath(); ctx.moveTo(p.x - p.speed * 14, p.y); ctx.lineTo(p.x, p.y); ctx.stroke();
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
