import { db } from "../db.js";
import { stitch, mixNarration, burnSubtitles, findBgm } from "../stitch.js";
import type { Postfx } from "@vidstitch/shared";
import { readNarrationManifest } from "./narration.js";

/**
 * Skill 5 · stitch-export —— 归一化 → 质感滤镜 → concat/xfade → 旁白混入 → 字幕烧录 → final.mp4（PRD §7.6/§7.8）
 * 输入：{ crossfadeMs, postfx, subtitle }  输出：{ url, path, narrationMixed, subtitleBurned }
 * 失败语义：无已完成分段 → 上抛；ffmpeg 失败 → 上抛；旁白/字幕失败 → 降级（不整体失败）。
 * 导出路由与本技能共用同一实现（单一事实源）。
 */
export async function exportFinal(
  projectId: string,
  crossfadeMs: number,
  postfx: Postfx,
  onPct?: (pct: number, stage: "normalizing" | "concatenating" | "done") => void,
  subtitle = true,
): Promise<{ url: string; path: string; narrationMixed: boolean; subtitleBurned: boolean }> {
  const rows = db
    .prepare("SELECT video_path, duration, transition_out FROM segments WHERE project_id=? AND status='succeeded' AND video_path IS NOT NULL ORDER BY idx")
    .all(projectId) as { video_path: string; duration: number; transition_out: string }[];
  if (rows.length === 0) throw new Error("还没有已生成的分段，先去生成");

  // 每个边界的转场时长：显式 crossfadeMs>0 全局覆盖；否则按每段转场标记（fade→500ms，硬切→0）
  const crossfades = rows.slice(0, -1).map((r) =>
    crossfadeMs > 0 ? crossfadeMs : r.transition_out === "fade" ? 500 : 0);
  const segDurations = rows.map((r) => r.duration);

  const sb = db.prepare("SELECT ratio FROM storyboards WHERE project_id=?").get(projectId) as { ratio: "16:9" | "9:16" };
  const out = await stitch(projectId, rows.map((r) => r.video_path!), sb.ratio, crossfades,
    onPct ?? (() => {}), postfx);

  // 旁白混入（M5a）：有清单才混；失败降级为无旁白成片并告警（不整体失败）
  let narrationMixed = false;
  let subtitleBurned = false;
  const manifest = readNarrationManifest(projectId);
  if (manifest && manifest.segments.length > 0) {
    try {
      await mixNarration(out, manifest.segments.map((s) => ({ file: s.file, idx: s.idx })), segDurations, crossfades,
        findBgm(projectId));
      narrationMixed = true;
    } catch (e) {
      console.error(`[narration-mix] 混音失败，降级为无旁白成片：${(e as Error).message}`);
    }
    // 字幕烧录（M5b）：需要词级 cues 且开关打开；失败降级为无字幕成片
    const withCues = manifest.segments.filter((s) => s.cues && s.cues.length > 0);
    if (subtitle && withCues.length > 0) {
      try {
        await burnSubtitles(out, projectId, segDurations, crossfades, withCues.map((s) => ({ idx: s.idx, cues: s.cues! })));
        subtitleBurned = true;
      } catch (e) {
        console.error(`[subtitle-burn] 烧录失败，降级为无字幕成片：${(e as Error).message}`);
      }
    }
  }
  return { url: `/files/projects/${projectId}/final.mp4`, path: out, narrationMixed, subtitleBurned };
}
