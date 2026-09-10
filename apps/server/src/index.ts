import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { ZodError } from "zod";
import { dataRoot } from "./db.js";
import { settingsRoutes } from "./routes/settings.js";
import { projectRoutes } from "./routes/projects.js";
import { segmentRoutes } from "./routes/segments.js";
import { eventRoutes } from "./routes/events.js";
import { exportRoutes } from "./routes/export.js";
import { chatRoutes } from "./routes/chat.js";
import { storyboardRoutes } from "./routes/storyboard.js";
import { authRoutes } from "./routes/auth.js";
import { sessionUser, readSessionCookie } from "./auth.js";

const app = Fastify({ logger: false, bodyLimit: 32 * 1024 * 1024 });

await app.register(cors, { origin: "http://localhost:5173" });

// 参数校验失败 → 400 + 首条原因（fastify 默认会把 throw 变 500）
app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
  if (err instanceof ZodError) {
    return reply.code(400).send({ error: err.issues[0]?.message ?? "参数不合法" });
  }
  const status = err.statusCode;
  if (typeof status === "number" && status >= 400) {
    return reply.code(status).send({ error: err.message });
  }
  console.error("[server]", err);
  return reply.code(500).send({ error: err.message?.slice(0, 200) || "服务器内部错误" });
});

// ── 全局鉴权：除注册/登录/健康检查外，所有 /api 与 /files 都要求有效会话 ──
app.addHook("preHandler", async (req, reply) => {
  const url = (req.raw.url ?? "").split("?")[0];
  if (req.method === "OPTIONS") return; // CORS 预检放行
  if (url.startsWith("/api/auth/") || url === "/api/health") return;
  const user = sessionUser(readSessionCookie(req));
  if (!user) return reply.code(401).send({ error: "请先登录" });
  (req as any).user = user;
});

await app.register(fastifyStatic, {
  root: path.join(dataRoot, "projects"),
  prefix: "/files/projects/",
  decorateReply: false,
});
await app.get("/api/health", async () => ({ ok: true }));
await app.register(authRoutes);
await app.register(settingsRoutes);
await app.register(projectRoutes);
await app.register(segmentRoutes);
await app.register(eventRoutes);
await app.register(exportRoutes);
await app.register(chatRoutes);
await app.register(storyboardRoutes);

const port = Number(process.env.PORT ?? 8787);
await app.listen({ port, host: "127.0.0.1" });
console.log(`vidstitch server on :${port}`);
