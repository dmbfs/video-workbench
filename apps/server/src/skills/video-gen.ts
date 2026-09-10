import { db } from "../db.js";
import { orchestrator } from "../orchestrator.js";
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from "../config.js";

/**
 * Skill 3 · video-gen —— 时间线全部段落排队生成并等待终态（PRD §7.8）
 * 输入：{ projectId }  输出：{ count }（全部 succeeded）
 * 失败语义：任一段 failed → 上抛（含段序与错误信息）；超总等待时限 → 上抛。
 * 复用编排器硬边界：轮询超时 / 单项目调用上限 / 连续失败熔断 / 首尾帧接力。
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const videoGen = {
  name: "video-gen",
  description: "按时间线逐段排队生成（并发=2），等待全部到终态",
  async run(projectId: string): Promise<{ count: number }> {
    const rows = db.prepare("SELECT id, idx FROM segments WHERE project_id=? AND status!='succeeded' ORDER BY idx").all(projectId) as any[];
    const total = (db.prepare("SELECT COUNT(*) c FROM segments WHERE project_id=?").get(projectId) as any).c;
    if (total === 0) throw new Error("时间线为空：分镜没有可生成的段落");
    for (const r of rows) orchestrator.enqueue(r.id);

    const deadline = Date.now() + POLL_TIMEOUT_MS + total * 60_000;
    for (;;) {
      await sleep(POLL_INTERVAL_MS);
      const segs = db.prepare("SELECT idx, status, error FROM segments WHERE project_id=? ORDER BY idx").all(projectId) as any[];
      if (segs.length > 0 && segs.every((s) => s.status === "succeeded" || s.status === "failed")) {
        const bad = segs.find((s) => s.status === "failed");
        if (bad) {
          const done = segs.filter((s) => s.status === "succeeded").length;
          throw new Error(`第 ${bad.idx} 段生成失败：${bad.error ?? "未知"}（已完成 ${done}/${segs.length} 段，可修复后单独重跑该段再导出）`);
        }
        return { count: segs.length };
      }
      if (Date.now() >= deadline) throw new Error(`等待分段生成超时（预算 ${Math.round((POLL_TIMEOUT_MS + total * 60_000) / 60_000)} 分钟），请检查 provider 或稍后在时间线里查看段落状态`);
    }
  },
};
