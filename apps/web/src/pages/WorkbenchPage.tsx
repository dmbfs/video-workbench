import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { api, subscribeEvents } from "@/lib/api";
import type { Segment, SegmentStatus, StoryboardProposal } from "@vidstitch/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ChatPanel } from "@/components/ChatPanel";
import { StoryboardProposalCard } from "@/components/StoryboardProposal";
import { CostConfirmModal } from "@/components/CostConfirmModal";

const STATUS_TEXT: Record<SegmentStatus, string> = {
  pending: "排队中", generating: "出片中", succeeded: "好了", failed: "翻车了",
};

export function WorkbenchPage({ projectId }: { projectId: string }) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [dur, setDur] = useState("10");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [proposal, setProposal] = useState<StoryboardProposal | null>(null);
  const [proposing, setProposing] = useState(false);
  const [applying, setApplying] = useState(false);
  const ref = useRef(projectId);

  const load = useCallback(() => {
    api.getProject(ref.current).then((d) => {
      setTitle(d.project.title);
      setSegments(d.segments);
      setGenerating((g) => g && d.segments.some((s) => s.status === "generating" || s.status === "pending"));
    });
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeEvents(ref.current, (e) => {
    if (e.type === "segment_status") {
      setSegments((ss) => ss.map((s) => (s.id === e.segmentId ? { ...s, status: e.status, error: e.error } : s)));
    } else if (e.type === "final_ready") {
      setExportUrl(e.url); setExporting(false);
    } else if (e.type === "storyboard_proposed") {
      setProposal(e.storyboard as StoryboardProposal);
    } else if (e.type === "timeline_replaced") {
      load();
    }
  }), [load]);

  const propose = async () => {
    setProposing(true);
    try { const r = (await api.proposeStoryboard(ref.current)) as { storyboard: StoryboardProposal }; setProposal(r.storyboard); }
    catch (e) { setProposal(null); alert(`生成失败：${(e as Error).message.slice(0, 160)}`); }
    finally { setProposing(false); }
  };
  const apply = async () => {
    if (!proposal) return;
    setApplying(true);
    try { await api.applyProposal(ref.current, proposal); setProposal(null); load(); }
    catch (e) { alert(`采用失败：${(e as Error).message.slice(0, 160)}`); }
    finally { setApplying(false); }
  };

  const addSegment = async () => {
    if (!prompt.trim()) return;
    await api.addSegment(ref.current, { prompt: prompt.trim(), duration: Number(dur) });
    setPrompt(""); load();
  };
  const generateAll = async () => { setGenerating(true); await api.generateAll(ref.current); };
  const regenerate = async (sid: string) => { await api.generateSegment(sid); setGenerating(true); };
  const allDone = segments.length > 0 && segments.every((s) => s.status === "succeeded");
  useEffect(() => { if (allDone) setGenerating(false); }, [allDone]); // 修复：全部完成后复位按钮态
  const totalDur = segments.reduce((a, s) => a + s.duration, 0);
  const doExport = async () => {
    setConfirmOpen(false); setExporting(true);
    try { const r = (await api.export(ref.current)) as { url: string }; setExportUrl(r.url); }
    finally { setExporting(false); }
  };

  return (
    <div className="flex gap-5 h-[calc(100vh-8.5rem)]">
      <div className="w-[380px] shrink-0 rounded-xl border border-border overflow-hidden rise-in">
        <ChatPanel projectId={projectId} onPropose={propose} proposing={proposing} />
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto space-y-5 pr-1">
      <header className="rise-in">
        <h1 className="font-display text-xl font-semibold">{title || "未命名项目"}</h1>
        <p className="text-sm text-muted-foreground font-mono">
          {segments.length} 段 · 共 {totalDur}s · 16:9
        </p>
      </header>

      {/* 提示词条（Pika 式）：输入 + 时长 chip + 加入 */}
      <div className="rise-in flex items-center gap-2" style={{ animationDelay: "60ms" }}>
        <Input
          placeholder="把脑子里那个画面说出来，比如：夕阳下的跨海大桥，车流延时"
          value={prompt} onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSegment()}
          className="h-11 flex-1 bg-card border-border"
        />
        <Select value={dur} onValueChange={setDur}>
          <SelectTrigger className="w-20 h-11 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5s</SelectItem>
            <SelectItem value="10">10s</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={addSegment} className="h-11 bg-primary text-primary-foreground hover:bg-primary/90">加入分镜</Button>
      </div>

      {/* 分镜时间线：横向卡片流 */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {segments.map((s, i) => (
          <div key={s.id}
            className={`${s.status === "generating" ? "breathe relative rounded-xl" : "relative"}`}
            style={{ animationDelay: `${120 + i * 40}ms` }}>
            <GlowingEffect spread={32} glow proximity={56} inactiveZone={0.6} borderWidth={1.5} disabled={s.status === "generating"} />
            <div className="rise-in rounded-xl border border-border bg-card p-3 space-y-2 h-full">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg text-primary">{String(s.idx).padStart(2, "0")}</span>
              <span className={`text-xs rounded-full px-2 py-0.5 ${
                s.status === "succeeded" ? "bg-[#4ADE80]/15 text-[#4ADE80]"
                : s.status === "failed" ? "bg-[#F87171]/15 text-[#F87171]"
                : "bg-secondary text-muted-foreground"}`}>
                {STATUS_TEXT[s.status]}
              </span>
              <span className="text-xs font-mono text-muted-foreground">{s.duration}s</span>
            </div>
            <p className="text-sm leading-snug line-clamp-2 min-h-10">{s.prompt}</p>
            {s.status === "succeeded" && (
              <video src={`/files/projects/${projectId}/segments/${s.id}.mp4`} muted preload="metadata"
                className="w-full rounded-lg border border-border" />
            )}
            {s.status === "failed" && s.error && <p className="text-xs text-[#F87171] line-clamp-2">{s.error}</p>}
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" title="重出这段" onClick={() => regenerate(s.id)}>
                <RefreshCw className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" title="删掉" onClick={() => api.delSegment(s.id).then(load)}>
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
            </div>
          </div>
        ))}
        {segments.length === 0 && (
          <div className="text-muted-foreground text-sm py-10">
            别对着空面板发呆了，上面输入框里写下第一个画面
          </div>
        )}
      </div>

      {/* 底部操作条 */}
      <div className="rise-in flex items-center gap-3" style={{ animationDelay: "160ms" }}>
        <ShimmerButton onClick={() => setCostOpen(true)} disabled={generating || segments.length === 0}
          background="#F97316" shimmerColor="#FDBA74"
          className="h-10 px-5 text-sm font-medium text-primary-foreground">
          {generating && <Loader2 className="size-4 animate-spin" />} 生成全部
        </ShimmerButton>
        <Button variant="outline" disabled={!allDone || exporting} onClick={() => setConfirmOpen(true)}>
          {exporting && <Loader2 className="size-4 animate-spin" />} 导出成片
        </Button>
        {generating && <span className="text-sm text-muted-foreground">出片中，先去倒杯水</span>}
        {exporting && <span className="text-sm text-muted-foreground">拼接中，别关页面</span>}
      </div>

      {exportUrl && (
        <div className="space-y-2">
          <h2 className="font-display font-semibold">成片出炉，直接去发</h2>
          <video controls src={exportUrl} className="w-full max-w-3xl rounded-xl border border-border" />
        </div>
      )}
      </div>

      {proposal && (
        <StoryboardProposalCard sb={proposal} existingCount={segments.length} applying={applying}
          onApply={apply} onClose={() => setProposal(null)} />
      )}

      {/* PRD FR-9：生成前成本确认（spec §五 算盘弹窗） */}
      <CostConfirmModal
        open={costOpen} onOpenChange={setCostOpen}
        segmentCount={segments.length} totalDuration={totalDur}
        generating={generating}
        onConfirm={() => { setCostOpen(false); generateAll(); }}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>拼接前确认</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            这一步会把 {segments.filter((s) => s.status === "succeeded").length} 段拼成一条片，确认都满意再拼——不满意的段单独重出就行。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>再改改</Button>
            <Button onClick={doExport} className="bg-primary text-primary-foreground hover:bg-primary/90">确认拼接</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
