import { SYSTEM_PROMPT } from "../agent/prompt.js";
import type { ChatMsg } from "../providers/chat-types.js";
import { pickChatProvider, proposeStoryboardJSON } from "./shared.js";
import type { StoryboardProposal } from "@vidstitch/shared";

/**
 * Skill 2 · storyboard —— 拍摄 brief → 结构化分镜（七要素 + stylePrefix，zod 校验）
 * 输入：{ prompt, brief }  输出：StoryboardProposal（未落库）
 * 失败语义：JSON 两次校验失败 / 模型不可用 → 上抛（链终止）
 */
export interface StoryboardInput { prompt: string; brief: string }

export const storyboard = {
  name: "storyboard",
  description: "按分镜顾问系统提示词产出结构化分镜（JSON 模式 + 自动纠错重问）",
  async run({ prompt, brief }: StoryboardInput): Promise<StoryboardProposal> {
    const ctx = pickChatProvider();
    if (!ctx) throw new Error("没有可用的对话模型，请到设置页添加并设为默认");
    const messages: ChatMsg[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `用户想法：${prompt}` },
      { role: "assistant", content: `拍摄 brief（可直接采纳其基调、风格关键词与镜头建议）：${brief}` },
      { role: "user", content: "信息已经够了，现在生成完整分镜，只输出 JSON。" },
    ];
    return proposeStoryboardJSON(ctx.provider, messages);
  },
};
