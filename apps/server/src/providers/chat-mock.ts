import type { ChatProvider, ChatMsg } from "./chat-types.js";

const PROPOSAL = {
  title: "城市日落三十秒",
  ratio: "16:9", withAudio: true,
  stylePrefix: "cinematic, warm golden hour, 35mm film, shallow depth of field",
  segments: [
    { prompt: "主体：航拍无人机。动作：掠过跨海大桥。场景：日落金色余晖。运镜：侧飞推进。视觉风格与氛围：暖调胶片。音频：海浪与风声。负向约束：Negative: no text, no watermark", duration: 10, transitionOut: "cut" },
    { prompt: "主体：街角咖啡店顾客。动作：举杯剪影。场景：暖光窗边。运镜：缓慢推近。视觉风格与氛围：暖黄。音频：店内低语与杯碟声。负向约束：Negative: no text, no watermark", duration: 10, transitionOut: "cut" },
    { prompt: "主体：霓虹街景。动作：人流延时。场景：夜幕降临。运镜：固定机位。视觉风格与氛围：霓虹冷暖对比。音频：城市夜声。负向约束：Negative: no text, no watermark", duration: 10, transitionOut: "cut" },
  ],
};

/** 无 key 时的脚本化对话：普通轮回复一句话；json 请求回合法分镜并逐字吐出（模拟流式） */
export class MockChatProvider implements ChatProvider {
  kind = "mock";
  async *stream(messages: ChatMsg[], opts?: { json?: boolean }): AsyncIterable<string> {
    const last = messages[messages.length - 1]?.content ?? "";
    let full: string;
    if (opts?.json) full = JSON.stringify(PROPOSAL);
    else if (/分镜|脚本|方案/.test(last)) full = "信息够了，我来生成完整分镜——点右侧的「生成完整分镜」就能看到结构化脚本。";
    else full = `收到：「${last.slice(0, 24)}」。主体/场景/风格/时长都齐了吗？缺什么直接说，齐了就让我出分镜。`;
    for (const ch of full) {
      yield ch;
      await new Promise((r) => setTimeout(r, 8));
    }
  }
}
