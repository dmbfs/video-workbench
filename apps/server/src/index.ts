import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "node:path";
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
