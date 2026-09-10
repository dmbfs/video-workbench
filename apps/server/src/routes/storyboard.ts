import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { newId, getSettings } from "../settings.js";
import { getChatProvider } from "../providers/chat-factory.js";
import { SYSTEM_PROMPT } from "../agent/prompt.js";
import { storyboardProposalSchema, type StoryboardProposal } from "@vidstitch/shared";
import { broadcast } from "../sse.js";
import type { ChatMsg } from "../providers/chat-types.js";

export async function storyboardRoutes(app: FastifyInstance) {
  /** 让分镜顾问产出结构化提案：JSON 模式优先，zod 校验失败自动把错误喂回去重问一次 */
  app.post("/api/projects/:id/storyboard/propose", async (req, reply) => {
    const { id } = req.params as any;
    const settings = getSettings();
    const cfg = settings.providers.find((p) => p.id === settings.chatDefaultId)
      ?? settings.providers.find((p) => p.kind === "openai-compatible")
      ?? settings.providers.find((p) => p.kind === "mock");
    if (!cfg) return reply.code(400).send({ error: "没有可用的对话模型，请到设置页添加并设为默认" });
    const provider = getChatProvider(cfg);
    const history = (db.prepare("SELECT role, content FROM chat_messages WHERE project_id=? ORDER BY created_at").all(id) as any[])
      .map((r) => ({ role: r.role as ChatMsg["role"], content: r.content }));
    const messages: ChatMsg[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history,
      { role: "user", content: "信息已经够了，现在生成完整分镜，只输出 JSON。" }];

    for (let attempt = 0; attempt < 2; attempt++) {
      let raw = "";
      for await (const d of provider.stream(messages, { json: attempt === 0 })) raw += d;
      raw = raw.replace(/```json|```/g, "").trim();
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      try {
        const proposal = storyboardProposalSchema.parse(JSON.parse(raw.slice(start, end + 1)));
        db.prepare("INSERT INTO chat_messages(id,project_id,role,content,created_at) VALUES(?,?,?,?,?)")
          .run(newId(), id, "assistant", "分镜脚本已生成，请在右侧预览并采用。", new Date().toISOString());
        broadcast({ type: "storyboard_proposed", storyboard: proposal }, id);
        return { storyboard: proposal };
      } catch (e) {
        if (attempt === 1) throw new Error(`分镜 JSON 校验失败：${(e as Error).message.slice(0, 200)}`);
        messages.push(
          { role: "assistant", content: raw.slice(0, 400) },
          { role: "user", content: `JSON 不合法：${(e as Error).message.slice(0, 300)}。请严格按结构重新只输出 JSON。` },
        );
      }
    }
  });

  /** 采用提案：整体替换时间线段落（UI 侧有替换确认文案）。事务保证不出现半截状态 */
  app.post("/api/projects/:id/storyboard/apply", async (req) => {
    const { id } = req.params as any;
    const sb = storyboardProposalSchema.parse(req.body) as StoryboardProposal;
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
    const segments = applyTx();
    broadcast({ type: "timeline_replaced", projectId: id }, id);
    return { segments };
  });
}
