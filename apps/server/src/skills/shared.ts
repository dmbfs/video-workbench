import { db } from "../db.js";
import { newId, getSettings } from "../settings.js";
import { getChatProvider } from "../providers/chat-factory.js";
import { storyboardProposalSchema, type StoryboardProposal } from "@vidstitch/shared";
import type { ChatProvider, ChatMsg } from "../providers/chat-types.js";

/** 运行时技能共享底座：聊天 provider 选择、分镜 JSON 生成、提案落库（PRD §7.8） */

export interface ChatCtx { cfg: ReturnType<typeof getSettings>["providers"][number]; provider: ChatProvider }

/** 聊天模型兜底链：默认 → openai-compatible → mock（与 chat/storyboard 路由历史行为一致） */
export function pickChatProvider(): ChatCtx | undefined {
  const settings = getSettings();
  const cfg = settings.providers.find((p) => p.id === settings.chatDefaultId)
    ?? settings.providers.find((p) => p.kind === "openai-compatible")
    ?? settings.providers.find((p) => p.kind === "mock");
  return cfg ? { cfg, provider: getChatProvider(cfg) } : undefined;
}

/** 分镜 JSON 生成：JSON 模式优先，zod 校验失败自动把错误喂回去重问一次（超时/上游错误原样上抛） */
export async function proposeStoryboardJSON(provider: ChatProvider, messages: ChatMsg[]): Promise<StoryboardProposal> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw = "";
    try {
      for await (const d of provider.stream(messages, { json: attempt === 0 })) raw += d;
    } catch (e) {
      throw Object.assign(new Error((e as Error).message || "对话模型调用失败"), { statusCode: 400 });
    }
    raw = raw.replace(/```json|```/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    try {
      return storyboardProposalSchema.parse(JSON.parse(raw.slice(start, end + 1)));
    } catch (e) {
      if (attempt === 1) throw new Error(`分镜 JSON 校验失败：${(e as Error).message.slice(0, 200)}`);
      messages.push(
        { role: "assistant", content: raw.slice(0, 400) },
        { role: "user", content: `JSON 不合法：${(e as Error).message.slice(0, 300)}。请严格按结构重新只输出 JSON。` },
      );
    }
  }
  throw new Error("unreachable");
}

/** 提案落库：整体替换时间线段落并确认分镜（原 storyboard/apply 事务，供路由与 skill 链共用） */
export function applyProposal(id: string, sb: StoryboardProposal) {
  const applyTx = db.transaction(() => {
    db.prepare("DELETE FROM segments WHERE project_id=?").run(id);
    const ins = db.prepare("INSERT INTO segments(id,project_id,idx,prompt,duration,transition_out) VALUES(?,?,?,?,?,?)");
    const segments = sb.segments.map((s, i) => {
      const sid = newId();
      ins.run(sid, id, i + 1, s.prompt, s.duration, s.transitionOut);
      return { id: sid, projectId: id, idx: i + 1, prompt: s.prompt, duration: s.duration,
        transitionOut: s.transitionOut, status: "pending" as const };
    });
    db.prepare("UPDATE storyboards SET title=?, ratio=?, with_audio=?, style_prefix=?, confirmed_at=? WHERE project_id=?")
      .run(sb.title, sb.ratio, sb.withAudio ? 1 : 0, sb.stylePrefix, new Date().toISOString(), id);
    db.prepare("UPDATE projects SET title=?, ratio=?, updated_at=? WHERE id=?")
      .run(sb.title, sb.ratio, new Date().toISOString(), id);
    return segments;
  });
  return applyTx();
}
