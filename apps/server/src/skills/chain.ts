import { db } from "../db.js";
import { newId } from "../settings.js";
import { broadcast } from "../sse.js";
import type { Postfx } from "@vidstitch/shared";
import { promptEnhance } from "./prompt-enhance.js";
import { storyboard } from "./storyboard.js";
import { applyProposal } from "./shared.js";
import { videoGen } from "./video-gen.js";
import { postfxGrade } from "./postfx-grade.js";
import { exportFinal } from "./stitch-export.js";

/**
 * 一键成片 skill 链（PRD FR-12 / §7.8）：
 *   prompt-enhance → storyboard（自动采用）→ video-gen → postfx-grade → stitch-export
 * 每步广播 chain_progress；任一步失败广播 chain_error 并把原因落为聊天消息，链不重试
 * （付费步骤的重试交给编排器既有策略，避免链层重复扣费）。
 */
export interface AutoChainInput {
  prompt: string;
  postfx: Postfx;
  crossfadeMs: number;
}

const step = (projectId: string, name: string, detail: string) =>
  broadcast({ type: "chain_progress", step: name, detail }, projectId);

function chatLog(projectId: string, content: string) {
  db.prepare("INSERT INTO chat_messages(id,project_id,role,content,created_at) VALUES(?,?,?,?,?)")
    .run(newId(), projectId, "assistant", content, new Date().toISOString());
}

export async function runAutoChain(projectId: string, input: AutoChainInput): Promise<void> {
  let current = "prompt-enhance";
  try {
    step(projectId, current, "扩写拍摄 brief…");
    const { brief } = await promptEnhance.run({ prompt: input.prompt });

    current = "storyboard";
    step(projectId, current, "生成结构化分镜并自动采用…");
    const sb = await storyboard.run({ prompt: input.prompt, brief });
    applyProposal(projectId, sb);
    chatLog(projectId, `✅ 分镜已生成并自动采用：《${sb.title}》${sb.segments.length} 段 / 总时长 ${sb.segments.reduce((a, x) => a + x.duration, 0)}s`);
    broadcast({ type: "timeline_replaced", projectId }, projectId);

    current = "video-gen";
    step(projectId, current, `逐段生成 ${sb.segments.length} 段（并发 2，首尾帧接力）…`);
    await videoGen.run(projectId);

    current = "postfx-grade";
    step(projectId, current, `质感预设：${input.postfx}`);
    await postfxGrade.run(input.postfx);

    current = "stitch-export";
    step(projectId, current, "拼接导出成片…");
    const { url } = await exportFinal(projectId, input.crossfadeMs, input.postfx,
      (pct, stage) => broadcast({ type: "export_progress", stage, pct }, projectId));

    broadcast({ type: "final_ready", url }, projectId);
    broadcast({ type: "chain_done", url }, projectId);
    chatLog(projectId, `✅ 一键成片完成：${url}`);
  } catch (e) {
    const msg = (e as Error).message?.slice(0, 300) || "未知错误";
    broadcast({ type: "chain_error", step: current, error: msg }, projectId);
    chatLog(projectId, `⚠️ 一键成片失败（${current}）：${msg}`);
  }
}
