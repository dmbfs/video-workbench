import { spawn } from "node:child_process";
import { copyFileSync, rmSync, writeFileSync } from "node:fs";
import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import { TTS_MODEL, TTS_VOICE } from "../config.js";
import { getSettings } from "../settings.js";

/**
 * TTS 语音合成 provider（M5a 旁白）。
 * 契约依据：TokenDance `POST {minimax}/v1/t2a_v2`（docs/protocol-minimax-t2a-v2.md，
 * 2026-09-10 零成本探针实测：hex mp3 + extra_info.audio_length/usage_characters）。
 * 语音模型/音色复用 minimax 视频 provider 的 origin 与 key（不新增设置项）；
 * 找不到 minimax provider 时回退 MockTts（ffmpeg 正弦波），保证全链路零计费可演练。
 */
export interface TtsResult { file: string; durationSec: number; chars: number }
export interface TtsProvider {
  kind: string;
  /** 合成一段语音到 outFile；targetDurationSec 给定时把超长音频压速适配（atempo ≤1.4，仍超则截断） */
  synthesize(text: string, outFile: string, targetDurationSec?: number): Promise<TtsResult>;
}

function ffprobeDuration(file: string): Promise<number> {
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

function ffmpegRun(args: string[]): Promise<void> {
  return new Promise((res, rej) => {
    const p = spawn(ffmpegPath as string, args, { stdio: "pipe" });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + d).slice(-800)));
    p.on("exit", (c) => (c === 0 ? res() : rej(new Error("ffmpeg: " + err))));
  });
}

/** MiniMax T2A v2（同步，hex 音频）。atempo 适配：单档 0.5–2.0，这里限 ≤1.4 保持自然 */
export class MiniMaxTtsProvider implements TtsProvider {
  kind = "minimax-tts";
  constructor(private cfg: { baseUrl: string; apiKey: string; modelId?: string; voiceId?: string }) {}

  async synthesize(text: string, outFile: string, targetDurationSec?: number): Promise<TtsResult> {
    const r = await fetch(`${this.cfg.baseUrl.replace(/\/+$/, "")}/v1/t2a_v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({
        model: this.cfg.modelId ?? TTS_MODEL,
        text,
        voice_setting: { voice_id: this.cfg.voiceId ?? TTS_VOICE, speed: 1, vol: 1, pitch: 0 },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const j = (await r.json().catch(() => ({}))) as any;
    if (!r.ok || j?.base_resp?.status_code !== 0) {
      const msg = j?.base_resp?.status_msg || j?.error?.message || `HTTP ${r.status}`;
      throw new Error(`TTS 失败：${msg}`);
    }
    const buf = Buffer.from(String(j.data.audio), "hex");
    writeFileSync(outFile, buf);
    let durationSec = (j.extra_info?.audio_length ?? 0) > 0 ? j.extra_info.audio_length / 1000 : await ffprobeDuration(outFile);

    // 超长适配：压速至目标时长内（旁白宁可快一点也不能压过下一段的画面起点）
    if (targetDurationSec && durationSec > targetDurationSec * 0.97) {
      const tempo = Math.min(durationSec / (targetDurationSec * 0.95), 1.4);
      if (tempo > 1.01) {
        const fitted = outFile.replace(/\.mp3$/, ".fitted.mp3");
        await ffmpegRun(["-y", "-i", outFile, "-filter:a", `atempo=${tempo.toFixed(3)}`, "-b:a", "128000", fitted]);
        let d = await ffprobeDuration(fitted);
        let src = fitted;
        if (d > targetDurationSec * 0.99) {
          // 压速后仍超：截断并加 60ms 淡出防截断爆音
          const end = targetDurationSec * 0.99;
          src = outFile.replace(/\.mp3$/, ".trim.mp3");
          await ffmpegRun(["-y", "-i", fitted, "-t", end.toFixed(3),
            "-af", `afade=t=out:st=${Math.max(end - 0.06, 0).toFixed(3)}:d=0.06`, "-b:a", "128000", src]);
          d = await ffprobeDuration(src);
        }
        copyFileSync(src, outFile);
        rmSync(fitted, { force: true });
        rmSync(outFile.replace(/\.mp3$/, ".trim.mp3"), { force: true });
        durationSec = d;
      }
    }
    return { file: outFile, durationSec, chars: Number(j.extra_info?.usage_characters ?? text.length) };
  }
}

/** e2e/无 minimax provider 兜底：ffmpeg 正弦波占位音频（零计费），时长取目标的 ~60% */
export class MockTtsProvider implements TtsProvider {
  kind = "mock-tts";
  async synthesize(text: string, outFile: string, targetDurationSec?: number): Promise<TtsResult> {
    const dur = Math.max(1, Math.min((targetDurationSec ?? 5) * 0.6, 8));
    await ffmpegRun(["-y", "-f", "lavfi", "-i", `sine=frequency=520:duration=${dur.toFixed(2)}`, "-b:a", "96000", outFile]);
    return { file: outFile, durationSec: await ffprobeDuration(outFile), chars: text.length };
  }
}

/** TTS 选择：复用 minimax 视频 provider 的网关与 key；否则 mock（全链路可演练、零计费） */
export function pickTts(): TtsProvider {
  const s = getSettings();
  const mm = s.providers.find((p) => p.kind === "minimax");
  if (mm?.baseUrl && mm.apiKey) return new MiniMaxTtsProvider({ baseUrl: mm.baseUrl, apiKey: mm.apiKey });
  return new MockTtsProvider();
}
