import { useEffect, useRef } from "react";

/**
 * 背景粒子层（Layer 2.5，DESIGN.md §3.5 v1.1）
 * Canvas 2D sprite 辉光微粒——零依赖、非 WebGL；上浮 + 正弦横漂 + lighter 叠加。
 * 尊重 prefers-reduced-motion（静止单帧）、页签隐藏停帧、数量随视口自适应（≤90）。
 */
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 预渲染 3 色辉光 sprite（橙 500 / 橙 300 / 暖白），避免每帧 shadowBlur
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
    const sprites = [makeSprite(249, 115, 22), makeSprite(253, 186, 116), makeSprite(255, 237, 213)];

    type P = { x: number; y: number; vy: number; amp: number; freq: number; phase: number; size: number; a: number; tw: number; sprite: number };
    let particles: P[] = [];
    let w = 0, h = 0, raf = 0, running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(90, Math.floor((w * h) / 22000));
      particles = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: 0.08 + Math.random() * 0.22,           // 缓慢上浮
        amp: 6 + Math.random() * 22,               // 正弦横漂振幅
        freq: 0.0004 + Math.random() * 0.0007,
        phase: Math.random() * Math.PI * 2,
        size: 2.4 + Math.random() * 4.6,           // sprite 绘制直径
        a: 0.14 + Math.random() * 0.34,
        tw: 0.0008 + Math.random() * 0.0012,       // 闪烁频率
        sprite: Math.random() < 0.7 ? 0 : 1 + (Math.random() < 0.3 ? 1 : 0),
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        const x = p.x + Math.sin(t * p.freq + p.phase) * p.amp;
        const a = p.a * (0.72 + 0.28 * Math.sin(t * p.tw + p.phase));
        ctx.globalAlpha = Math.max(0, a);
        ctx.drawImage(sprites[p.sprite], x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const step = (t: number) => {
      if (!running) return;
      for (const p of particles) {
        p.y -= p.vy;
        if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
      }
      draw(t);
      raf = requestAnimationFrame(step);
    };

    resize();
    const onResize = () => { resize(); draw(performance.now()); };
    window.addEventListener("resize", onResize);

    if (reduced) {
      draw(0); // 静止单帧：红线合规，不动画
    } else {
      raf = requestAnimationFrame(step);
      const onVis = () => {
        if (document.hidden) { running = false; cancelAnimationFrame(raf); }
        else if (!running) { running = true; raf = requestAnimationFrame(step); }
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        running = false; cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVis);
      };
    }
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}
