import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Wand2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ChatMessage } from "@vidstitch/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChatPanel({ projectId, onPropose, proposing }: { projectId: string; onPropose: () => void; proposing: boolean }) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.getMessages(projectId).then(setMsgs); }, [projectId]);
  useEffect(() => { boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput(""); setBusy(true);
    setMsgs((m) => [...m, { id: "tmp-" + Date.now(), projectId, role: "user", content: text, createdAt: new Date().toISOString() }]);
    setStreaming("");
    try {
      const r = await api.chat(projectId, text);
      const reader = r.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop()!;
        for (const part of parts) {
          if (!part.startsWith("data:")) continue;
          const e = JSON.parse(part.slice(5));
          if (e.type === "chat_delta") setStreaming((s) => (s ?? "") + e.text);
        }
      }
    } catch { /* 网络层错误：下面以库内历史为准重拉 */ }
    setStreaming(null); setBusy(false);
    api.getMessages(projectId).then(setMsgs);
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-card/40">
      <div className="h-12 px-4 flex items-center justify-between border-b border-border shrink-0">
        <span className="font-display font-semibold">分镜顾问</span>
        <Button size="sm" variant="outline" onClick={onPropose} disabled={proposing || busy} className="gap-1.5">
          <Wand2 className="size-3.5" />{proposing ? "生成中…" : "生成完整分镜"}
        </Button>
      </div>
      <div ref={boxRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {msgs.length === 0 && streaming === null && (
          <p className="text-sm text-muted-foreground">想要什么画面，直接说——比如“30 秒城市日落宣传片”。</p>
        )}
        {msgs.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 text-sm">{m.content}</div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[92%] rounded-xl rounded-bl-sm bg-popover border border-border px-3 py-2 text-sm whitespace-pre-wrap">{m.content}</div>
            </div>
          ),
        )}
        {streaming !== null && (
          <div className="flex justify-start">
            <div className="max-w-[92%] rounded-xl rounded-bl-sm bg-popover border border-border px-3 py-2 text-sm whitespace-pre-wrap">
              {streaming}<span className="animate-pulse">▍</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border flex gap-2 shrink-0">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
          placeholder="跟顾问说说你的想法" className="bg-card" />
        <Button onClick={send} disabled={busy} aria-label="发送" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <SendHorizonal className="size-4" />
        </Button>
      </div>
    </div>
  );
}
