import type { StoryboardProposal } from "@vidstitch/shared";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/ui/blur-fade";

export function StoryboardProposalCard({ sb, existingCount, applying, onApply, onClose }: {
  sb: StoryboardProposal;
  existingCount: number;
  applying: boolean;
  onApply: () => void;
  onClose: () => void;
}) {
  const total = sb.segments.reduce((a, s) => a + s.duration, 0);
  return (
    <BlurFade inView className="fixed bottom-6 right-6 w-[440px] max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl p-4 z-50 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display font-semibold">{sb.title}</h3>
        <span className="text-xs font-mono text-muted-foreground">
          {sb.segments.length} 段 · 共 {total}s · {sb.ratio}
        </span>
      </div>
      <p className="text-xs font-mono text-muted-foreground truncate">{sb.stylePrefix}</p>
      <div className="space-y-2">
        {sb.segments.map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display text-primary text-sm">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-xs font-mono text-muted-foreground">{s.duration}s</span>
            </div>
            <p className="text-sm leading-snug line-clamp-3">{s.prompt}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onClose}>丢弃</Button>
        <Button onClick={onApply} disabled={applying} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {existingCount > 0 ? `替换现有 ${existingCount} 段并采用` : "采用到时间线"}
        </Button>
      </div>
    </BlurFade>
  );
}
