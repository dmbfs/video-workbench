import { getChatProvider } from "../providers/chat-factory.js";
import type { ChatMsg } from "../providers/chat-types.js";
import { pickChatProvider } from "./shared.js";

/**
 * Skill 1 · prompt-enhance —— 把用户一句话扩写成拍摄 brief（PRD §7.8）
 * 输入：{ prompt }  输出：{ brief }
 * 失败语义：对话模型不可用/调用失败 → 上抛（链终止，chain_error）
 */
const ENHANCE_SYSTEM = `你是「拍摄顾问」。把用户的一句话想法扩写成可直接指导分镜的拍摄 brief，必须包含：
1) 主题与情绪基调；2) 主体与场景；3) 视觉风格关键词（英文逗号分隔，如 cinematic, golden hour, 35mm film）；4) 节奏与镜头语言建议；5) 应避免的元素。
只输出 brief 正文（200 字以内），不要寒暄、不要序号列表、不要输出分镜。`;

export interface EnhanceInput { prompt: string }
export interface EnhanceOutput { brief: string }

export const promptEnhance = {
  name: "prompt-enhance",
  description: "把一句话扩写成拍摄 brief（主题/主体场景/风格关键词/节奏/负向）",
  async run({ prompt }: EnhanceInput): Promise<EnhanceOutput> {
    const ctx = pickChatProvider();
    if (!ctx) throw new Error("没有可用的对话模型，请到设置页添加并设为默认");
    const messages: ChatMsg[] = [
      { role: "system", content: ENHANCE_SYSTEM },
      { role: "user", content: prompt },
    ];
    let brief = "";
    for await (const d of ctx.provider.stream(messages)) brief += d;
    brief = brief.replace(/```[\s\S]*?```/g, "").trim();
    if (!brief) throw new Error("拍摄 brief 生成结果为空");
    return { brief: brief.slice(0, 600) };
  },
};
