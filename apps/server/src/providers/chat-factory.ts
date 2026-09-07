import type { ProviderConfig } from "@vidstitch/shared";
import type { ChatProvider } from "./chat-types.js";
import { OpenAIChatProvider } from "./chat-openai.js";
import { MockChatProvider } from "./chat-mock.js";

export function getChatProvider(cfg: ProviderConfig): ChatProvider {
  switch (cfg.kind) {
    case "openai-compatible": return new OpenAIChatProvider(cfg);
    case "mock": return new MockChatProvider();
    default: throw new Error(`kind ${cfg.kind} 不是对话 provider`);
  }
}
