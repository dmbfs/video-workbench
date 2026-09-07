export interface ChatMsg { role: "user" | "assistant" | "system"; content: string }
export interface ChatProvider {
  kind: string;
  stream(messages: ChatMsg[], opts?: { json?: boolean }): AsyncIterable<string>;
}
