import { useEffect, useState } from "react";
import { Plus, PlugZap, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ProviderKind, PublicSettings } from "@vidstitch/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShimmerButton } from "@/components/ui/shimmer-button";

type Draft = {
  id: string; kind: ProviderKind; label: string;
  baseUrl: string; modelId: string; apiKey: string; apiKeySet: boolean;
};

const KIND_LABEL: Record<ProviderKind, string> = {
  "openai-compatible": "OpenAI 兼容（对话）",
  "openai-video": "OpenAI 兼容（视频）",
  minimax: "MiniMax（视频）",
  seedance: "Seedance（视频）",
  mock: "Mock（本地演示）",
};

export function SettingsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [chatDefaultId, setChatDefaultId] = useState<string | undefined>();
  const [videoDefaultId, setVideoDefaultId] = useState<string | undefined>();
  const [testState, setTestState] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.settings().then((s: PublicSettings) => {
      setDrafts(s.providers.map((p) => ({ ...p, baseUrl: p.baseUrl ?? "", modelId: p.modelId ?? "", apiKey: "" })));
      setChatDefaultId(s.chatDefaultId); setVideoDefaultId(s.videoDefaultId);
    });
  }, []);

  const patch = (id: string, p: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...p } : d)));
  const add = () => setDrafts((ds) => [...ds, { id: crypto.randomUUID(), kind: "openai-compatible", label: "新模型", baseUrl: "", modelId: "", apiKey: "", apiKeySet: false }]);
  const remove = (id: string) => setDrafts((ds) => ds.filter((d) => d.id !== id));
  const payload = () => ({
    providers: drafts.map(({ apiKey, ...d }) => ({ ...d, apiKey: apiKey || undefined })),
    chatDefaultId, videoDefaultId,
  });
  const save = async () => {
    await api.saveSettings(payload());
    setDrafts((ds) => ds.map((d) => ({ ...d, apiKey: "", apiKeySet: d.apiKeySet || !!d.apiKey })));
    setMsg("存好了"); setTimeout(() => setMsg(""), 1500);
  };
  const test = async (d: Draft) => {
    setTestState((s) => ({ ...s, [d.id]: "…" }));
    try {
      await api.saveSettings(payload());
      const r = (await api.testProvider(d.id)) as { ok: boolean; error?: string; status?: number };
      setTestState((s) => ({ ...s, [d.id]: r.ok ? "通了" : `不行：${r.error ?? r.status}` }));
    } catch (e) {
      setTestState((s) => ({ ...s, [d.id]: `不行：${(e as Error).message.slice(0, 80)}` }));
    }
  };

  const chatProviders = drafts.filter((d) => d.kind === "openai-compatible" || d.kind === "mock");
  const videoProviders = drafts.filter((d) => d.kind === "minimax" || d.kind === "seedance" || d.kind === "openai-video" || d.kind === "mock");

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-xl font-semibold">模型接线</h1>
        <p className="text-sm text-muted-foreground">key 只存在本机，请求都从后端转发</p>
      </div>

      {drafts.map((d, i) => (
        <div key={d.id} className="rise-in rounded-xl border border-border bg-card p-4 space-y-3" style={{ animationDelay: `${i * 40}ms` }}>
          <div className="flex items-center gap-2">
            <div className="w-52"><Select value={d.kind} onValueChange={(v) => patch(d.id, { kind: v as ProviderKind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(KIND_LABEL) as ProviderKind[]).map((k) => (
                <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>))}</SelectContent>
            </Select></div>
            <Input className="w-48" value={d.label} onChange={(e) => patch(d.id, { label: e.target.value })} placeholder="名称" />
            <div className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => test(d)} title="测试连通"><PlugZap className="size-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => remove(d.id)} title="删除"><Trash2 className="size-4 text-destructive" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Base URL</Label>
              <Input value={d.baseUrl} onChange={(e) => patch(d.id, { baseUrl: e.target.value })} placeholder="https://api.example.com" /></div>
            <div className="space-y-1"><Label>模型 ID</Label>
              <Input value={d.modelId} onChange={(e) => patch(d.id, { modelId: e.target.value })} placeholder="例如 MiniMax-H3" /></div>
            <div className="space-y-1 col-span-2"><Label>{d.apiKeySet ? "API Key（已保存，输入即覆盖）" : "API Key"}</Label>
              <Input type="password" value={d.apiKey} onChange={(e) => patch(d.id, { apiKey: e.target.value })} placeholder="sk-…" /></div>
          </div>
          {testState[d.id] && (
            <p className={`text-sm ${testState[d.id] === "通了" ? "text-[#4ADE80]" : "text-[#F87171]"}`}>{testState[d.id]}</p>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={add}><Plus className="size-4" />加一个模型</Button>
        <div className="flex-1" />
        <ShimmerButton onClick={save} background="#F97316" shimmerColor="#FDBA74" className="h-9 px-4 text-sm font-medium text-primary-foreground">保存全部</ShimmerButton>
        {msg && <span className="text-sm text-[#4ADE80]">{msg}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1"><Label>默认对话模型</Label>
          <Select value={chatDefaultId ?? ""} onValueChange={setChatDefaultId}>
            <SelectTrigger><SelectValue placeholder="选一个" /></SelectTrigger>
            <SelectContent>{chatProviders.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1"><Label>默认视频模型</Label>
          <Select value={videoDefaultId ?? ""} onValueChange={setVideoDefaultId}>
            <SelectTrigger><SelectValue placeholder="选一个" /></SelectTrigger>
            <SelectContent>{videoProviders.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
          </Select></div>
      </div>
    </div>
  );
}
