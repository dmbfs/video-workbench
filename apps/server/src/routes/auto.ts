import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { newId } from "../settings.js";
import { autoProjectSchema } from "@vidstitch/shared";
import { runAutoChain } from "../skills/chain.js";

/** 一键成片（PRD FR-12）：用户给一段 prompt → prompt-enhance → storyboard → video-gen → postfx-grade → stitch-export
 *  立即返回 projectId，链在后台执行；进度走既有 SSE /api/projects/:id/events（chain_progress/chain_done/chain_error）。 */
export async function autoRoutes(app: FastifyInstance) {
  app.post("/api/projects/auto", async (req) => {
    const { prompt, ratio, postfx, crossfadeMs } = autoProjectSchema.parse(req.body ?? {});
    const id = newId();
    const now = new Date().toISOString();
    const title = prompt.slice(0, 18);
    db.prepare("INSERT INTO projects(id,title,ratio,created_at,updated_at) VALUES(?,?,?,?,?)").run(id, title, ratio, now, now);
    db.prepare("INSERT INTO storyboards(project_id,title,ratio) VALUES(?,?,?)").run(id, title, ratio);
    db.prepare("INSERT INTO chat_messages(id,project_id,role,content,created_at) VALUES(?,?,?,?,?)")
      .run(newId(), id, "user", prompt, now);

    void runAutoChain(id, { prompt, postfx, crossfadeMs });
    return { projectId: id };
  });
}
