import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
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

/**
 * 旁白混入（M5a）：把 narration/seg-XX.mp3 按段起点对齐铺成整条旁白轨，与成片原声混合。
 * - 段起点 = 前段时长累计 − xfade 重叠修正（crossfades[i-1]）
 * - 人声优先：原声压至 0.55，旁白 1.0，汇总后限幅防削波
 * - 成片无音轨时旁白独占（直接替换音轨）
 * 混音只动音频轨，视频流复制，成片时长不变。
 */
export async function mixNarration(
  finalPath: string,
  narrationSegments: { file: string; idx: number }[],
  segDurations: number[],
  crossfades: number[],
): Promise<void> {
  // 段起点（秒）：前段时长累计 − 前面所有转场的重叠
  const starts: number[] = [];
  let acc = 0;
  for (let i = 0; i < segDurations.length; i++) {
    starts.push(acc);
    acc += segDurations[i] - (crossfades[i] ?? 0) / 1000;
  }
  const hasAudio = await new Promise<boolean>((res) => {
    const p = spawn(ffprobePath, ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", finalPath], { stdio: "pipe" });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("exit", () => res(out.trim().length > 0));
  });

  // 旁白轨：每条 adelay 到位后 amix 汇总（normalize=0 保持电平）
  const inputs = narrationSegments.map((n) => ["-i", n.file]).flat();
  const chains: string[] = [];
  const labels: string[] = [];
  narrationSegments.forEach((n, i) => {
    const delayMs = Math.max(0, Math.round((starts[n.idx - 1] ?? 0) * 1000));
    chains.push(`[${i + 1}:a]adelay=${delayMs}|${delayMs}[d${i}]`);
    labels.push(`[d${i}]`);
  });
  const narrChain = labels.length === 1
    ? `${labels[0]}anull[narr]`
    : `${labels.join("")}amix=inputs=${labels.length}:duration=longest:normalize=0[narr]`;
  const tail = hasAudio
    ? `[0:a]volume=0.55[bg];[bg][narr]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]`
    : `[narr]anull[aout]`;

  const mixed = finalPath.replace(/\.mp4$/, ".mixed.mp4");
  await run([
    "-y", "-i", finalPath, ...inputs,
    "-filter_complex", `${chains.join(";")};${narrChain};${tail}`,
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
