import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { newId, getSettings } from "../settings.js";
import { getChatProvider } from "../providers/chat-factory.js";
import { SYSTEM_PROMPT } from "../agent/prompt.js";
import type { ChatMsg } from "../providers/chat-types.js";

export async function chatRoutes(app: FastifyInstance) {
  app.get("/api/projects/:id/messages", async (req) => {
    const rows = db
      .prepare("SELECT * FROM chat_messages WHERE project_id=? ORDER BY created_at")
      .all((req.params as any).id) as any[];
    return rows.map((r) => ({
      id: r.id, projectId: r.project_id, role: r.role, content: r.content, createdAt: r.created_at,
    }));
  });

  app.post("/api/projects/:id/chat", async (req, reply) => {
    const { id } = req.params as any;
    const { message } = req.body as { message: string };
    if (!message?.trim()) return reply.code(400).send({ error: "消息不能为空" });

    const settings = getSettings();
    const cfg = settings.providers.find((p) => p.id === settings.chatDefaultId)
      ?? settings.providers.find((p) => p.kind === "openai-compatible")
      ?? settings.providers.find((p) => p.kind === "mock");
    if (!cfg) return reply.code(400).send({ error: "没有可用的对话模型，请到设置页添加并设为默认" });
    const provider = getChatProvider(cfg);

    db.prepare("INSERT INTO chat_messages(id,project_id,role,content,created_at) VALUES(?,?,?,?,?)")
      .run(newId(), id, "user", message, new Date().toISOString());
    const history = (db.prepare("SELECT role, content FROM chat_messages WHERE project_id=? ORDER BY created_at").all(id) as any[])
      .map((r) => ({ role: r.role as ChatMsg["role"], content: r.content }));
    const messages: ChatMsg[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

    reply.hijack();
    reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    let full = "";
    const mid = newId();
    try {
      for await (const delta of provider.stream(messages)) {
        full += delta;
        reply.raw.write(`data: ${JSON.stringify({ type: "chat_delta", text: delta })}\n\n`);
      }
      db.prepare("INSERT INTO chat_messages(id,project_id,role,content,created_at) VALUES(?,?,?,?,?)")
        .run(mid, id, "assistant", full, new Date().toISOString());
      reply.raw.write(`data: ${JSON.stringify({ type: "chat_done", messageId: mid })}\n\n`);
    } catch (e) {
      reply.raw.write(`data: ${JSON.stringify({ type: "chat_delta", text: `\n\n[出错了：${(e as Error).message.slice(0, 120)}]` })}\n\n`);
      reply.raw.write(`data: ${JSON.stringify({ type: "chat_done", messageId: "" })}\n\n`);
    }
    reply.raw.end(); // hijack 后必须手动收尾，否则客户端 Body 超时
    return reply;
  });
}
