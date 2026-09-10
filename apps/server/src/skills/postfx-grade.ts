import type { Postfx } from "@vidstitch/shared";

/**
 * Skill 4 · postfx-grade —— 质感预设选定（PRD §7.8 / 配方见 skills/video-postfx/SKILL.md）
 * 输入：{ postfx }  输出：{ postfx }
 * 现阶段是显式链步骤 + 参数校验；未来 LUT/超分等增强在此扩展（预设注册表与 stitch.ts 的 POSTFX_FILTERS 同源）。
 */
export const postfxGrade = {
  name: "postfx-grade",
  description: "导出前选定质感预设（none/film/clean），占位扩展点",
  async run(postfx: Postfx): Promise<{ postfx: Postfx }> {
    if (!["none", "film", "clean"].includes(postfx)) throw new Error(`未知质感预设：${postfx}`);
    return { postfx };
  },
};
