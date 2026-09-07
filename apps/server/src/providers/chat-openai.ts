import type { ChatProvider, ChatMsg } from "./chat-types.js";
import type { ProviderConfig } from "@vidstitch/shared";

/** OpenAI 兼容 /chat/completions 流式（SSE 行解析，容忍 keep-alive 脏行） */
export class OpenAIChatProvider implements ChatProvider {
  kind = "openai-compatible";
  constructor(private cfg: ProviderConfig) {}

  async *stream(messages: ChatMsg[], opts?: { json?: boolean }): AsyncIterable<string> {
    const r = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({
        model: this.cfg.modelId, messages, stream: true,
        ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!r.ok || !r.body) throw new Error(`chat ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop()!;
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const j = JSON.parse(payload);
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) yield delta as string;
        } catch { /* 忽略非 JSON 行 */ }
      }
    }
  }
}
