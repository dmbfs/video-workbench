import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { db, dataRoot } from "../db.js";
import { TTS_MODEL, TTS_VOICE } from "../config.js";
import { pickChatProvider, askJSON } from "./shared.js";
import { pickTts } from "../providers/tts.js";
import type { ChatMsg } from "../providers/chat-types.js";

/**
 * Skill 3.5 · narration（M5a）—— 分镜 → 口语化旁白稿 → 逐段 TTS → narration.json
 * 产物：data/projects/:id/narration/seg-{idx}.mp3 + narration.json
 *   { generatedAt, tts: kind/model/voice, segments: [{idx, text, file, durationSec}] }
 * 失败语义：任一环节失败整体上抛（链层捕获后继续成片——旁白是增强，不是必需品）。
 * 字数预算：中文语速 ≈4.5 字/秒，按段时长封顶；TTS 产物超长由 provider 内 atempo 压速适配。
 */

const narrationScriptSchema = z.object({
  segments: z.array(z.object({
    idx: z.number().int().min(1),
    text: z.string().min(1).max(120),
  })).min(1),
});

export interface NarrationCue { word: string; start: number; end: number }
export interface NarrationSegment { idx: number; text: string; file: string; durationSec: number; cues?: NarrationCue[] }
export interface NarrationManifest {
  generatedAt: string;
  tts: { kind: string; model?: string; voice?: string };
  segments: NarrationSegment[];
}

/** 读取旁白清单（无则返回 null）——导出混音与未来的字幕步骤都用它 */
export function readNarrationManifest(projectId: string): NarrationManifest | null {
  try {
    return JSON.parse(readFileSync(narrationManifestPath(projectId), "utf8")) as NarrationManifest;
  } catch {
    return null;
  }
}

export function narrationDir(projectId: string): string {
  return path.join(dataRoot, "projects", projectId, "narration");
}
export function narrationManifestPath(projectId: string): string {
  return path.join(dataRoot, "projects", projectId, "narration.json");
}

export const narration = {
  name: "narration",
  description: "分镜 → 口语化旁白稿（聊天 JSON）→ 逐段 TTS → narration.json（超长自动压速适配）",
  async run(projectId: string): Promise<{ count: number; totalChars: number }> {
    const segs = db
      .prepare("SELECT idx, duration, prompt FROM segments WHERE project_id=? ORDER BY idx")
      .all(projectId) as { idx: number; duration: number; prompt: string }[];
    if (segs.length === 0) throw new Error("没有分镜段，先完成分镜");

    // 1) 旁白稿：口语化、与画面互补不重复、字数按段时长封顶（≈4.5 字/秒）
    const ctx = pickChatProvider();
    if (!ctx) throw new Error("没有可用的对话模型，无法撰写旁白稿");
    const maxChars = (d: number) => Math.max(8, Math.round(d * 4.5));
    const outline = segs.map((s) => `第${s.idx}段（${s.duration}s，上限${maxChars(s.duration)}字）：${s.prompt.slice(0, 80)}`).join("\n");
    const messages: ChatMsg[] = [
      { role: "system", content: "你是短视频旁白撰稿人。根据分镜写口播旁白：口语化、有钩子、与画面互补而非复述画面；绝不出现镜头术语（运镜/特写/画面等）与排比堆砌；每段独立成句，可直接朗读。" },
      { role: "user", content: `分镜如下：\n${outline}\n\n为每段写一条旁白。只输出 JSON：{"segments":[{"idx":1,"text":"…"}]}，idx 与分镜一致，text 不得超过该段字数上限。` },
    ];
    const script = await askJSON(ctx.provider, messages, narrationScriptSchema, "旁白稿");
    const byIdx = new Map(script.segments.map((s) => [s.idx, s.text.trim()]));

    // 2) 逐段 TTS（顺序合成，段间独立；超长由 provider 压速并同步换算字幕时间轴）
    const tts = pickTts();
    const dir = narrationDir(projectId);
    mkdirSync(dir, { recursive: true });
    const out: NarrationSegment[] = [];
    let totalChars = 0;
    for (const s of segs) {
      const text = byIdx.get(s.idx);
      if (!text) throw new Error(`旁白稿缺少第 ${s.idx} 段`);
      const file = path.join(dir, `seg-${String(s.idx).padStart(2, "0")}.mp3`);
      const r = await tts.synthesize(text, file, { targetDurationSec: s.duration - 0.3, withCues: true });
      totalChars += r.chars;
      out.push({ idx: s.idx, text, file, durationSec: r.durationSec, ...(r.cues ? { cues: r.cues } : {}) });
    }

    // 3) 写清单（临时文件先行，避免半写状态被导出读到）
    const manifest: NarrationManifest = {
      generatedAt: new Date().toISOString(),
      tts: { kind: tts.kind, model: tts.kind === "minimax-tts" ? TTS_MODEL : undefined, voice: tts.kind === "minimax-tts" ? TTS_VOICE : undefined },
      segments: out,
    };
    const tmpPath = narrationManifestPath(projectId) + ".tmp";
    writeFileSync(tmpPath, JSON.stringify(manifest, null, 2));
    copyFileSync(tmpPath, narrationManifestPath(projectId));
    rmSync(tmpPath, { force: true });
    return { count: out.length, totalChars };
  },
};
