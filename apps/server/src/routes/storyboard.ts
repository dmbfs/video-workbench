import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { newId } from "../settings.js";
import { SYSTEM_PROMPT } from "../agent/prompt.js";
import { storyboardProposalSchema, type StoryboardProposal } from "@vidstitch/shared";
import { broadcast } from "../sse.js";
import type { ChatMsg } from "../providers/chat-types.js";
import { pickChatProvider, proposeStoryboardJSON, applyProposal } from "../skills/shared.js";

export async function storyboardRoutes(app: FastifyInstance) {
  /** 让分镜顾问产出结构化提案：JSON 生成/校验/落库复用 skills/shared（与技能链同源实现） */
  app.post("/api/projects/:id/storyboard/propose", async (req, reply) => {
    const { id } = req.params as any;
    const ctx = pickChatProvider();
    if (!ctx) return reply.code(400).send({ error: "没有可用的对话模型，请到设置页添加并设为默认" });
    const history = (db.prepare("SELECT role, content FROM chat_messages WHERE project_id=? ORDER BY created_at").all(id) as any[])
      .map((r) => ({ role: r.role as ChatMsg["role"], content: r.content }));
    const messages: ChatMsg[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history,
      { role: "user", content: "信息已经够了，现在生成完整分镜，只输出 JSON。" }];

    const proposal = await proposeStoryboardJSON(ctx.provider, messages);
    db.prepare("INSERT INTO chat_messages(id,project_id,role,content,created_at) VALUES(?,?,?,?,?)")
      .run(newId(), id, "assistant", "分镜脚本已生成，请在右侧预览并采用。", new Date().toISOString());
    broadcast({ type: "storyboard_proposed", storyboard: proposal }, id);
    return { storyboard: proposal };
  });

  /** 采用提案：整体替换时间线段落（UI 侧有替换确认文案）。事务保证不出现半截状态 */
  app.post("/api/projects/:id/storyboard/apply", async (req) => {
    const { id } = req.params as any;
    const sb = storyboardProposalSchema.parse(req.body) as StoryboardProposal;
    const segments = applyProposal(id, sb);
    broadcast({ type: "timeline_replaced", projectId: id }, id);
    return { segments };
  });
}
