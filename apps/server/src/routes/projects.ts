import type { FastifyInstance } from "fastify";
import path from "node:path";
import { existsSync, rmSync } from "node:fs";
import { db, dataRoot } from "../db.js";
import { newId } from "../settings.js";
import { createProjectSchema, addSegmentSchema, reorderSegmentsSchema } from "@vidstitch/shared";
import { orchestrator, projectGenerationCalls } from "../orchestrator.js";
import { broadcast } from "../sse.js";
import { MAX_CALLS_PER_PROJECT } from "../config.js";

export async function projectRoutes(app: FastifyInstance) {
  app.post("/api/projects", async (req) => {
    const { title, ratio } = createProjectSchema.parse(req.body);
    const id = newId();
    const now = new Date().toISOString();
    db.prepare("INSERT INTO projects(id,title,ratio,created_at,updated_at) VALUES(?,?,?,?,?)").run(id, title, ratio, now, now);
    db.prepare("INSERT INTO storyboards(project_id,title,ratio) VALUES(?,?,?)").run(id, title, ratio);
    return { id };
  });

  app.get("/api/projects", async () => {
    const rows = db
      .prepare(`SELECT p.*, COUNT(s.id) c FROM projects p LEFT JOIN segments s ON s.project_id=p.id GROUP BY p.id ORDER BY p.created_at DESC`)
      .all() as any[];
    return rows.map((r) => ({
      id: r.id, title: r.title, ratio: r.ratio, createdAt: r.created_at, updatedAt: r.updated_at,
      segmentCount: r.c, finalReady: existsSync(path.join(dataRoot, "projects", r.id, "final.mp4")),
    }));
  });

  app.get("/api/projects/:id", async (req, reply) => {
    const { id } = req.params as any;
    const p = db.prepare("SELECT * FROM projects WHERE id=?").get(id) as any;
    if (!p) return reply.code(404).send({ error: "项目不存在" });
    const sb = db.prepare("SELECT * FROM storyboards WHERE project_id=?").get(id) as any;
    const segs = db.prepare("SELECT * FROM segments WHERE project_id=? ORDER BY idx").all(id) as any[];
    return {
      project: { id: p.id, title: p.title, ratio: p.ratio, createdAt: p.created_at, updatedAt: p.updated_at },
      storyboard: {
        projectId: id, title: sb.title, ratio: sb.ratio,
        withAudio: !!sb.with_audio, stylePrefix: sb.style_prefix, confirmedAt: sb.confirmed_at,
      },
      segments: segs.map((s) => ({
        id: s.id, projectId: s.project_id, idx: s.idx, prompt: s.prompt, duration: s.duration,
        transitionOut: s.transition_out, status: s.status, provider: s.provider ?? undefined,
        taskId: s.task_id ?? undefined, videoPath: s.video_path ?? undefined, error: s.error ?? undefined,
      })),
      generation: { calls: projectGenerationCalls(id), maxCalls: MAX_CALLS_PER_PROJECT },
    };
  });

  app.delete("/api/projects/:id", async (req) => {
    const { id } = req.params as any;
    db.prepare("DELETE FROM generation_calls WHERE project_id=?").run(id);
    db.prepare("DELETE FROM segments WHERE project_id=?").run(id);
    db.prepare("DELETE FROM storyboards WHERE project_id=?").run(id);
    db.prepare("DELETE FROM projects WHERE id=?").run(id);
    rmSync(path.join(dataRoot, "projects", id), { recursive: true, force: true });
    return { ok: true };
  });

  app.post("/api/projects/:id/segments", async (req) => {
    const { id } = req.params as any;
    const { prompt, duration } = addSegmentSchema.parse(req.body);
    const sid = newId();
    const idx = (db.prepare("SELECT COALESCE(MAX(idx),0)+1 n FROM segments WHERE project_id=?").get(id) as any).n;
    db.prepare("INSERT INTO segments(id,project_id,idx,prompt,duration) VALUES(?,?,?,?,?)").run(sid, id, idx, prompt, duration);
    return { id: sid };
  });

  app.post("/api/projects/:id/generate-all", async (req) => {
    const { id } = req.params as any;
    const rows = db.prepare("SELECT id FROM segments WHERE project_id=? AND status!='succeeded' ORDER BY idx").all(id) as any[];
    rows.forEach((r) => orchestrator.enqueue(r.id));
    return { enqueued: rows.length, callsUsed: projectGenerationCalls(id), maxCalls: MAX_CALLS_PER_PROJECT };
  });

  /** 段序调整（PRD FR-3）：order 为全部分镜 id 的新顺序，事务内重排 idx */
  app.patch("/api/projects/:id/segments/order", async (req, reply) => {
    const { id } = req.params as any;
    const { order } = reorderSegmentsSchema.parse(req.body ?? {});
    const current = (db.prepare("SELECT id FROM segments WHERE project_id=?").all(id) as { id: string }[]).map((r) => r.id);
    const same = current.length === order.length && [...current].sort().join() === [...order].sort().join();
    if (!same) return reply.code(400).send({ error: "order 必须恰好包含该项目的全部分镜 id" });
    db.transaction((ids: string[]) => {
      ids.forEach((sid, i) => db.prepare("UPDATE segments SET idx=? WHERE id=? AND project_id=?").run(i + 1, sid, id));
    })(order);
    broadcast({ type: "timeline_replaced", projectId: id }, id);
    return { ok: true };
  });
}
