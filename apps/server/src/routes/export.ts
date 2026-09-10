import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { stitch } from "../stitch.js";
import { broadcast } from "../sse.js";
import { exportSchema } from "@vidstitch/shared";

export async function exportRoutes(app: FastifyInstance) {
  app.post("/api/projects/:id/export", async (req, reply) => {
    const { id } = req.params as any;
    const { crossfadeMs, postfx } = exportSchema.parse(req.body ?? {});
    const rows = db
      .prepare("SELECT video_path, transition_out FROM segments WHERE project_id=? AND status='succeeded' AND video_path IS NOT NULL ORDER BY idx")
      .all(id) as { video_path: string; transition_out: string }[];
    if (rows.length === 0) return reply.code(400).send({ error: "还没有已生成的分段，先去生成" });

    // 每个边界的转场时长：请求显式给 crossfadeMs>0 时全局覆盖；否则按每段转场标记（fade→500ms，硬切→0）
    const crossfades = rows.slice(0, -1).map((r) =>
      crossfadeMs > 0 ? crossfadeMs : r.transition_out === "fade" ? 500 : 0);

    const sb = db.prepare("SELECT ratio FROM storyboards WHERE project_id=?").get(id) as { ratio: "16:9" | "9:16" };
    const out = await stitch(id, rows.map((r) => r.video_path!), sb.ratio, crossfades, (pct, stage) => {
      broadcast({ type: "export_progress", stage, pct }, id);
    }, postfx);
    const url = `/files/projects/${id}/final.mp4`;
    broadcast({ type: "final_ready", url }, id);
    return { url, path: out };
  });
}
