import type { FastifyInstance } from "fastify";
import { addClient } from "../sse.js";

export async function eventRoutes(app: FastifyInstance) {
  app.get("/api/projects/:id/events", (req, reply) => {
    const { id } = req.params as any;
    addClient(id, reply);
    return reply;
  });
}
