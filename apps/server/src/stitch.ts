import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import { dataRoot } from "./db.js";

const run = (args: string[]) =>
  new Promise<void>((res, rej) => {
    const p = spawn(ffmpegPath as string, args, { stdio: "pipe" });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
    p.on("exit", (c) => (c === 0 ? res() : rej(new Error("ffmpeg: " + err))));
    p.stderr.resume();
  });

function probeDuration(file: string): Promise<number> {
  return new Promise((res, rej) => {
    const p = spawn(ffprobePath, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { stdio: "pipe" });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("exit", (c) => {
      const n = Number(out.trim());
      c === 0 && Number.isFinite(n) ? res(n) : rej(new Error("ffprobe duration: " + out.trim()));
    });
  });
}

function probeVideoSize(file: string): Promise<{ w: number; h: number }> {
  return new Promise((res, rej) => {
    const p = spawn(ffprobePath, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", file], { stdio: "pipe" });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("exit", (c) => {
      const m = out.trim().match(/^(\d+)x(\d+)$/);
      c === 0 && m ? res({ w: +m[1], h: +m[2] }) : rej(new Error("ffprobe size: " + out.trim()));
    });
  });
}

/** 高质感统一编码参数（PRD §7.6）：CRF 18 + medium 兼顾观感与体积；音频 192k；成片 faststart 利于网页起播 */
const QUALITY_VCODEC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18"];
const QUALITY_ACODEC = ["-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "192k"];

/** 质感后处理预设（skills/video-postfx/SKILL.md 有实测记录） */
const POSTFX_FILTERS: Record<string, string> = {
  // 胶片感：压对比微降饱和 + 动态颗粒 + 轻晕影（模拟胶片暗角）
  film: "eq=contrast=1.06:saturation=0.90,noise=alls=8:allf=t,vignette=angle=PI/5",
  // 清爽网感：微提对比饱和 + 轻锐化（社媒直出观感）
  clean: "eq=contrast=1.05:saturation=1.10,unsharp=5:5:0.6:5:5:0.0",
};

/** 抽取视频末帧为 base64 jpeg（首尾帧接力：作为下一段图生视频的首帧参考） */
export function extractLastFrame(file: string): Promise<string> {
  return new Promise((res, rej) => {
    const p = spawn(
      ffmpegPath as string,
      ["-sseof", "-0.1", "-i", file, "-frames:v", "1", "-q:v", "2", "-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    const chunks: Buffer[] = [];
    let err = "";
    p.stdout.on("data", (d) => chunks.push(d as Buffer));
    p.stderr.on("data", (d) => (err = (err + d).slice(-500)));
    p.on("exit", (c) =>
      c === 0 && chunks.length > 0
        ? res(Buffer.concat(chunks).toString("base64"))
        : rej(new Error("extract last frame: " + err)),
    );
  });
}

/** 查项目 BGM 文件（M5c：允许 mp3/m4a/wav，存在即用） */
export function findBgm(projectId: string): string | null {
  for (const e of ["mp3", "m4a", "wav"]) {
    const p = path.join(dataRoot, "projects", projectId, `bgm.${e}`);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * 旁白 + BGM 混音（M5a/M5c）：把旁白按段起点对齐、BGM 循环铺满并闪避，与成片原声合成一条音轨。
 * - 段起点 = 前段时长累计 − xfade 重叠修正（crossfades[i-1]）
 * - 电平：原声 0.55 / 旁白 1.0 / BGM 0.18（旁白处 sidechain 闪避），汇总限幅防削波
 * - 成片无音轨时旁白+BGM 独占；混音只动音频轨，成片时长不变
 */
export async function mixNarration(
  finalPath: string,
  narrationSegments: { file: string; idx: number }[],
  segDurations: number[],
  crossfades: number[],
  bgmFile?: string | null,
): Promise<void> {
  // 段起点（秒）：前段时长累计 − 前面所有转场的重叠；末次累计即成片总时长
  const starts: number[] = [];
  let acc = 0;
  for (let i = 0; i < segDurations.length; i++) {
    starts.push(acc);
    acc += segDurations[i] - (crossfades[i] ?? 0) / 1000;
  }
  const totalDur = Math.max(acc, 1);
  const hasAudio = await new Promise<boolean>((res) => {
    const p = spawn(ffprobePath, ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", finalPath], { stdio: "pipe" });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("exit", () => res(out.trim().length > 0));
  });

  const args = ["-y", "-i", finalPath];
  const chains: string[] = [];
  const narrLabels: string[] = [];
  narrationSegments.forEach((n, i) => {
    args.push("-i", n.file);
    const delayMs = Math.max(0, Math.round((starts[n.idx - 1] ?? 0) * 1000));
    chains.push(`[${i + 1}:a]adelay=${delayMs}|${delayMs}[d${i}]`);
    narrLabels.push(`[d${i}]`);
  });
  // BGM 输入放最后，循环铺满 + 音量 + 首尾淡入淡出
  let bgmIdx: number | null = null;
  if (bgmFile) {
    bgmIdx = narrationSegments.length + 1;
    args.push("-stream_loop", "-1", "-i", bgmFile);
    const fadeOut = Math.max(totalDur - 1.5, 0).toFixed(3);
    chains.push(`[${bgmIdx}:a]atrim=duration=${totalDur.toFixed(3)},volume=0.18,afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOut}:d=1.5[m]`);
  }
  const narrChain = narrationSegments.length === 0
    ? ""
    : narrationSegments.length === 1
      ? `${narrLabels[0]}anull[narr]`
      : `${narrLabels.join("")}amix=inputs=${narrLabels.length}:duration=longest:normalize=0[narr]`;
  if (chains.length) chains.push(""); // 仅用于可读性分隔，join 后为空串占位

  // 汇总段：按可用轨道组合
  const hasNarr = narrationSegments.length > 0;
  let tail: string;
  if (hasNarr && bgmFile) {
    chains.push(`[m][narr]sidechaincompress=threshold=0.05:ratio=5:attack=120:release=450[bgmD]`);
    tail = hasAudio
      ? `[0:a]volume=0.55[bg];[bg][narr][bgmD]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.95[aout]`
      : `[narr][bgmD]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]`;
  } else if (hasNarr) {
    tail = hasAudio
      ? `[0:a]volume=0.55[bg];[bg][narr]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]`
      : `[narr]anull[aout]`;
  } else if (bgmFile) {
    tail = hasAudio
      ? `[0:a]volume=0.8[bg];[bg][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]`
      : `[m]anull[aout]`;
  } else {
    return; // 没有任何要混的东西
  }

  const mixed = finalPath.replace(/\.mp4$/, ".mixed.mp4");
  await run([
    ...args,
    "-filter_complex", [...chains.filter(Boolean), narrChain, tail].filter(Boolean).join(";"),
    "-map", "0:v", "-map", "[aout]",
    ...QUALITY_ACODEC,
    "-movflags", "+faststart",
    mixed,
  ]);
  const { renameSync, rmSync } = await import("node:fs");
  rmSync(finalPath, { force: true });
  renameSync(mixed, finalPath);
}

/**
 * 旁白字幕烧录（M5b）：narration.json 的词级时间轴 → 段起点偏移（含 xfade 修正）→ 分行 → ASS → subtitles 滤镜。
 * 分行策略：连续词累计到 ~12 字 / 遇句读 / 满 3s 即断行；行尾延长到下一行开始（≤0.4s）保证阅读连续。
 * 视频需重编码（字幕烧进画面），音频流复制（已混音完成）。
 */
export async function burnSubtitles(
  finalPath: string,
  projectId: string,
  segDurations: number[],
  crossfades: number[],
  narrationSegments: { idx: number; cues: { word: string; start: number; end: number }[] }[],
): Promise<void> {
  // 段起点（与 mixNarration 同口径）
  const starts: number[] = [];
  let acc = 0;
  for (let i = 0; i < segDurations.length; i++) { starts.push(acc); acc += segDurations[i] - (crossfades[i] ?? 0) / 1000; }

  // 全局词级 cues
  const global: { word: string; start: number; end: number }[] = [];
  for (const seg of narrationSegments) {
    const off = starts[seg.idx - 1] ?? 0;
    for (const c of seg.cues) global.push({ word: c.word, start: off + c.start, end: off + c.end });
  }
  if (global.length === 0) return;

  // 分行：~12 字 / 句读 / 3s
  const lines: { text: string; start: number; end: number }[] = [];
  let cur: { words: string[]; start: number; end: number } | null = null;
  const flush = () => { if (cur) { lines.push({ text: cur.words.join(""), start: cur.start, end: cur.end }); cur = null; } };
  for (const c of global) {
    if (!cur) cur = { words: [c.word], start: c.start, end: c.end };
    else { cur.words.push(c.word); cur.end = c.end; }
    if (/[。！？，、；：…]/.test(c.word) || cur.words.join("").length >= 12 || c.end - cur.start >= 3) flush();
  }
  flush();
  // 行尾延到下一行开始（≤0.4s），避免黑屏闪烁
  for (let i = 0; i < lines.length - 1; i++) lines[i].end = Math.min(lines[i + 1].start, lines[i].end + 0.4);

  // 成片分辨率 → ASS PlayRes 与字号
  const size = await new Promise<{ w: number; h: number }>((res, rej) => {
    const p = spawn(ffprobePath, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", finalPath], { stdio: "pipe" });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("exit", (c) => { const m = out.trim().match(/^(\d+)x(\d+)$/); c === 0 && m ? res({ w: +m[1], h: +m[2] }) : rej(new Error("ffprobe size: " + out.trim())); });
  });
  const fmt = (t: number) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60), cs = Math.round((t % 1) * 100); return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`; };
  const ass = [
    "[Script Info]", "ScriptType: v4.00+", `PlayResX: ${size.w}`, `PlayResY: ${size.h}`, "WrapStyle: 2", "",
    "[V4+ Styles]",
    `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding`,
    `Style: Narr,Microsoft YaHei,${Math.round(size.h * 0.052)},&H00FFFFFF,&H00FFFFFF,&H00101010,&H7F000000,1,0,0,0,100,100,0,0,1,${Math.max(2, Math.round(size.h / 300))},1,2,${Math.round(size.w * 0.06)},${Math.round(size.w * 0.06)},${Math.round(size.h * 0.055)},1`,
    "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...lines.map((l) => `Dialogue: 0,${fmt(l.start)},${fmt(l.end)},Narr,,0,0,0,,${l.text}`),
  ].join("\n");
  const assPath = finalPath.replace(/\.mp4$/, ".ass");
  writeFileSync(assPath, ass, "utf8");

  // Windows 路径进滤镜要转义：反斜杠→斜杠、盘符冒号→\:
  const esc = assPath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "");
  const burned = finalPath.replace(/\.mp4$/, ".sub.mp4");
  await run([
    "-y", "-i", finalPath,
    "-vf", `ass=filename='${esc}'`,
    ...QUALITY_VCODEC,
    "-c:a", "copy",
    "-movflags", "+faststart",
    burned,
  ]);
  const { renameSync, rmSync } = await import("node:fs");
  rmSync(finalPath, { force: true });
  renameSync(burned, finalPath);
}

/**
 * 拼接导出（PRD FR-6）：
 * - crossfades[i] = 第 i 段与第 i+1 段之间的转场时长（ms）；全 0 走 concat 硬切（流复制，快）。
 * - 任一边界 >0 时走 xfade（视频叠化）+ acrossfade（音频）单次滤镜链；
 *   「硬切」边界用 1 帧时长（1/30s）的 fade 近似——视觉上就是硬切，换来单 pass 的稳健性。
 */
export async function stitch(
  projectId: string,
  segPaths: string[],
  ratio: "16:9" | "9:16",
  crossfades: number[], // 每个边界的转场 ms；长度 = segPaths.length - 1
  onPct: (pct: number, stage: "normalizing" | "concatenating" | "done") => void,
  postfx: "none" | "film" | "clean" = "none",
): Promise<string> {
  // 目标分辨率自适应（PRD §7.6）：跟随各段源的最大清晰度档位——任一段高边 ≥1600px 视为 1080p 类
  // （1920x1080 / 1080x1920），否则保持 720p 类；避免全 720p 项目（mock / MiniMax 768P）被无谓上采样
  let maxEdge = 0;
  for (const f of segPaths) {
    const s = await probeVideoSize(f);
    maxEdge = Math.max(maxEdge, s.w, s.h);
  }
  const size = ratio === "16:9" ? (maxEdge >= 1600 ? "1920x1080" : "1280x720") : (maxEdge >= 1600 ? "1080x1920" : "720x1280");
  const [w, h] = size.split("x");
  const dir = path.join(dataRoot, "projects", projectId);
  const tmp = path.join(dir, "tmp");
  mkdirSync(tmp, { recursive: true });

  const norm: string[] = [];
  const postfxChain = POSTFX_FILTERS[postfx] ?? "";
  for (let i = 0; i < segPaths.length; i++) {
    const o = path.join(tmp, `n${i}.mp4`);
    await run([
      "-y", "-i", segPaths[i],
      "-vf",
      // 顺序：几何归一化 → fps → 质感后处理 → 像素格式收尾
      [`scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,fps=30`,
       postfxChain, "format=yuv420p"].filter(Boolean).join(","),
      ...QUALITY_VCODEC,
      ...QUALITY_ACODEC,
      o,
    ]);
    norm.push(o);
    onPct(Math.round(((i + 1) / segPaths.length) * 80), "normalizing");
  }

  const out = path.join(dir, "final.mp4");
  const anyFade = crossfades.some((ms) => ms > 0);

  if (!anyFade || norm.length < 2) {
    // 硬切：concat demuxer 流复制
    const list = path.join(tmp, "list.txt");
    writeFileSync(list, norm.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
    await run(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", out]);
    onPct(100, "done");
    return out;
  }

  // 叠化链：xfade 需要「当前已拼流」的精确时长 → 逐段 ffprobe 归一化产物
  const durs: number[] = [];
  for (const f of norm) durs.push(await probeDuration(f));

  const fc: string[] = [];
  let vIn = "[0:v]";
  let aIn = "[0:a]";
  let acc = durs[0];
  for (let i = 1; i < norm.length; i++) {
    const d = Math.max(crossfades[i - 1] / 1000, 1 / 30);
    const vOut = `[v${i}]`;
    const aOut = `[a${i}]`;
    fc.push(`${vIn}[${i}:v]xfade=transition=fade:duration=${d.toFixed(3)}:offset=${Math.max(acc - d, 0).toFixed(3)}${vOut}`);
    fc.push(`${aIn}[${i}:a]acrossfade=d=${d.toFixed(3)}${aOut}`);
    vIn = vOut;
    aIn = aOut;
    acc = acc + durs[i] - d;
  }

  await run([
    "-y",
    ...norm.map((f) => ["-i", f]).flat(),
    "-filter_complex", fc.join(";"),
    "-map", vIn, "-map", aIn,
    ...QUALITY_VCODEC,
    ...QUALITY_ACODEC,
    "-movflags", "+faststart",
    out,
  ]);
  onPct(100, "done");
  return out;
}
