import type { FastifyInstance } from "fastify";
import { broadcast } from "../sse.js";
import { exportSchema } from "@vidstitch/shared";
import { exportFinal } from "../skills/stitch-export.js";

export async function exportRoutes(app: FastifyInstance) {
  app.post("/api/projects/:id/export", async (req) => {
    const { id } = req.params as any;
    const { crossfadeMs, postfx, subtitle } = exportSchema.parse(req.body ?? {});
    const { url } = await exportFinal(id, crossfadeMs, postfx,
      (pct, stage) => broadcast({ type: "export_progress", stage, pct }, id), subtitle);
    broadcast({ type: "final_ready", url }, id);
    return { url };
  });
}
