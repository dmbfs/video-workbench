import type { FastifyReply } from "fastify";
import type { SseEvent } from "@vidstitch/shared";

const clients = new Map<string, Set<FastifyReply>>(); // projectId -> replies；"*" 为全局通道

export function addClient(projectId: string | "*", reply: FastifyReply) {
  reply.hijack(); // 此连接由我们接管，Fastify 不再写响应
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  if (!clients.has(projectId)) clients.set(projectId, new Set());
  clients.get(projectId)!.add(reply);
  reply.raw.on("close", () => clients.get(projectId)?.delete(reply));
}

export function broadcast(event: SseEvent, projectId = "*") {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  clients.get(projectId)?.forEach((r) => r.raw.write(payload));
  clients.get("*")?.forEach((r) => r.raw.write(payload));
}
