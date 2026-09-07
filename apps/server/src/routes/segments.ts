import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { patchSegmentSchema } from "@vidstitch/shared";
import { orchestrator } from "../orchestrator.js";

export async function segmentRoutes(app: FastifyInstance) {
  app.patch("/api/segments/:id", async (req) => {
    const { id } = req.params as any;
    const patch = patchSegmentSchema.parse(req.body);
    db.prepare("UPDATE segments SET prompt=COALESCE(?,prompt), duration=COALESCE(?,duration), transition_out=COALESCE(?,transition_out) WHERE id=?")
      .run(patch.prompt ?? null, patch.duration ?? null, patch.transitionOut ?? null, id);
    return { ok: true };
  });

  app.delete("/api/segments/:id", async (req) => {
    const { id } = req.params as any;
    db.prepare("DELETE FROM segments WHERE id=?").run(id);
    return { ok: true };
  });

  app.post("/api/segments/:id/generate", async (req) => {
    const { id } = req.params as any;
    orchestrator.enqueue(id);
    return { ok: true };
  });
}
