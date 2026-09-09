import { motion, useReducedMotion } from "motion/react";
import { ParticleField } from "@/components/ParticleField";

/**
 * MotionSites 背景栈 v1.2（DESIGN.md §3.5）—— 四层 + 全局噪点
 * Layer 0 流体光云（14s ease-in-out 正弦呼吸，环境层豁免红线⑦）
 * Layer 1 动能流光 1px（竖 7s / 横 9s linear 循环，环境层豁免）
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

      {/* Layer 1: 动能流光 —— 竖向 7s / 横向 9s */}
      <motion.div
        animate={reduced ? undefined : { y: ["-120%", "380%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        className="absolute left-[27%] top-0 h-[38%] w-px"
        style={{ background: "linear-gradient(180deg, transparent, rgba(249,115,22,.65), transparent)" }}
      />
      <motion.div
        animate={reduced ? undefined : { x: ["-120%", "380%"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear", delay: 1.5 }}
        className="absolute left-0 top-[21%] h-px w-[38%]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(253,186,116,.5), transparent)" }}
      />

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
