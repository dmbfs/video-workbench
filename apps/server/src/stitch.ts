import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { dataRoot } from "./db.js";

const run = (args: string[]) =>
  new Promise<void>((res, rej) => {
    const p = spawn(ffmpegPath as string, args, { stdio: "pipe" });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
    p.on("exit", (c) => (c === 0 ? res() : rej(new Error("ffmpeg: " + err))));
    p.stderr.resume();
  });

/** 归一化每段（画幅/帧率/像素格式/音频规格），再 concat 硬切拼接。M4 换 xfade 时在此扩展 */
export async function stitch(
  projectId: string,
  segPaths: string[],
  ratio: "16:9" | "9:16",
  crossfadeMs: number, // M1 恒 0；>0 时 M4 实现
  onPct: (pct: number, stage: "normalizing" | "concatenating" | "done") => void,
): Promise<string> {
  const size = ratio === "16:9" ? "1280x720" : "720x1280";
  const [w, h] = size.split("x");
  const dir = path.join(dataRoot, "projects", projectId);
  const tmp = path.join(dir, "tmp");
  mkdirSync(tmp, { recursive: true });

  const norm: string[] = [];
  for (let i = 0; i < segPaths.length; i++) {
    const o = path.join(tmp, `n${i}.mp4`);
    await run([
      "-y", "-i", segPaths[i],
      "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p`,
      "-c:v", "libx264", "-preset", "veryfast",
      "-c:a", "aac", "-ar", "48000", "-ac", "2",
      o,
    ]);
    norm.push(o);
    onPct(Math.round(((i + 1) / segPaths.length) * 80), "normalizing");
  }

  const list = path.join(tmp, "list.txt");
  writeFileSync(list, norm.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
  const out = path.join(dir, "final.mp4");
  await run(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out]);
  onPct(100, "done");
  return out;
}
