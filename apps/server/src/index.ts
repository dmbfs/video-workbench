import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { dataRoot } from "./db.js";
import { settingsRoutes } from "./routes/settings.js";

const app = Fastify({ logger: false, bodyLimit: 32 * 1024 * 1024 });

await app.register(cors, { origin: "http://localhost:5173" });
await app.register(fastifyStatic, {
  root: path.join(dataRoot, "projects"),
  prefix: "/files/projects/",
  decorateReply: false,
});
await app.get("/api/health", async () => ({ ok: true }));
await app.register(settingsRoutes);
// Task 4 挂载: projectRoutes / segmentRoutes / eventRoutes / exportRoutes

await app.listen({ port: 8787, host: "127.0.0.1" });
console.log("vidstitch server on :8787");
