import { motion, useReducedMotion } from "motion/react";
import { ParticleField } from "@/components/ParticleField";

// 流光配置：v=竖向下滑 / h=横向右移；pos 起点%，len 长度%，dur 周期s，delay 错峰
const BEAMS = [
  { v: true, pos: 12, len: 34, dur: 6.5, delay: 0, a: 0.5 },
  { v: true, pos: 27, len: 38, dur: 7, delay: 0, a: 0.65 },
  { v: true, pos: 45, len: 30, dur: 8.5, delay: 1.2, a: 0.45 },
  { v: true, pos: 62, len: 30, dur: 11, delay: 3, a: 0.45 },
  { v: true, pos: 82, len: 36, dur: 9.5, delay: 4.2, a: 0.55 },
  { v: false, pos: 8, len: 34, dur: 12, delay: 2, a: 0.5 },
  { v: false, pos: 21, len: 38, dur: 9, delay: 0, a: 0.5 },
  { v: false, pos: 40, len: 32, dur: 14, delay: 3.5, a: 0.4 },
  { v: false, pos: 56, len: 30, dur: 13, delay: 5.5, a: 0.38 },
  { v: false, pos: 74, len: 36, dur: 10.5, delay: 1.8, a: 0.5 },
];

/**
 * MotionSites 背景栈 v1.2（DESIGN.md §3.5）—— 四层 + 全局噪点
 * Layer 0 流体光云（14s ease-in-out 正弦呼吸，环境层豁免红线⑦）
 * Layer 1 动能流光 1px×10（竖 5 横 5，6.5–14s linear 错峰，环境层豁免）
 * Layer 2 粒子流场（canvas 2D：伪噪声流场 + 阵风 + 三类粒子线段拖尾）
 * Layer 3 胶片噪点 —— 全局 body::before 已铺 3.5% feTurbulence，此处不重复
 * Layer 4 暗角（四周压向 --bg-base）
 * 全层 pointer-events-none、-z-10，尊重 prefers-reduced-motion。
 */
export function MotionBackground() {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Layer 0: 流体光云（外层定位居中，内层呼吸） */}
      <div className="absolute -top-[230px] left-1/2 h-[400px] w-[850px] -translate-x-1/2">
        <motion.div
          animate={reduced ? undefined : { opacity: [0.55, 0.85, 0.55], scale: [1, 1.06, 1], x: [0, 28, 0], y: [0, -14, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="h-full w-full rounded-full blur-[110px]"
          style={{
            background:
              "radial-gradient(closest-side, rgba(249,115,22,.30), rgba(253,186,116,.13) 55%, transparent)",
          }}
        />
      </div>

{/* Layer 1: 动能流光 ×10（1px，linear 循环，环境层豁免；几何走 inline style，Tailwind 任意值类不编译动态串） */}
      {BEAMS.map((b, i) => (
        <motion.div
          key={i}
          animate={reduced ? undefined : b.v ? { y: ["-120%", "380%"] } : { x: ["-120%", "380%"] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: "linear", delay: b.delay }}
          className={b.v ? "absolute top-0 w-px" : "absolute left-0 h-px"}
          style={{
            left: b.v ? `${b.pos}%` : undefined,
            top: b.v ? undefined : `${b.pos}%`,
            height: b.v ? `${b.len}%` : undefined,
            width: b.v ? undefined : `${b.len}%`,
            background: b.v
              ? `linear-gradient(180deg, transparent, rgba(249,115,22,${b.a}), transparent)`
              : `linear-gradient(90deg, transparent, rgba(253,186,116,${b.a}), transparent)`,
          }}
        />
      ))}

            {/* Layer 2: 粒子流场（canvas 2D） */}
      <ParticleField />

      {/* Layer 4: 暗角 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(9,9,11,.55) 78%, rgba(9,9,11,.92) 100%)",
        }}
      />
    </div>
  );
}
