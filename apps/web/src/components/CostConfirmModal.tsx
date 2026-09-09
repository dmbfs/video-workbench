import { AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * 成本确认弹窗（spec §五 / PRD FR-9 / DESIGN.md §6 文案）
 * 算盘三栏：分段数 × 每段 1 次调用 = 本次共烧 N 额度。
 * 注：产品无本地余额钱包（key 自理），故不做 42−3=39 余额态；
 * 额度 = 视频生成调用次数，失败段单独重跑不重复烧其他段。
 */
export function CostConfirmModal({ open, onOpenChange, segmentCount, totalDuration, generating, onConfirm }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  segmentCount: number;
  totalDuration: number;
  generating: boolean;
  onConfirm: () => void;
}) {
  const enough = segmentCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-muted-foreground">成本预算确认</span>
            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-primary">
              预计共 {totalDuration}s
            </span>
          </div>
          <DialogTitle className="font-display text-lg font-semibold tracking-tight">
            确认消耗算力生成视频？
          </DialogTitle>
        </DialogHeader>

        {/* 算盘三栏（font-mono 强制） */}
        <div className="my-4 grid grid-cols-[1fr_auto_1fr_auto_1.2fr] items-stretch gap-2 font-mono">
          <div className="rounded-lg bg-white/5 px-3 py-3 text-center">
            <div className="text-2xl font-semibold">{segmentCount}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">本次分段</div>
          </div>
          <div className="flex items-center text-muted-foreground">×</div>
          <div className="rounded-lg bg-white/5 px-3 py-3 text-center">
            <div className="text-2xl font-semibold">1<span className="text-sm text-muted-foreground"> 次/段</span></div>
            <div className="mt-1 text-[10px] text-muted-foreground">视频生成调用</div>
          </div>
          <div className="flex items-center text-muted-foreground">=</div>
          <div className="rounded-lg bg-orange-500/10 px-3 py-3 text-center ring-1 ring-orange-500/30">
            <div className="text-2xl font-semibold text-primary">{segmentCount}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">生成后共烧额度</div>
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
          生成过程中报错将自动退回对应额度——单段翻车不影响其他段，重跑只烧那一段。
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}
            className="border-white/10 bg-transparent hover:bg-white/5">
            再改改分镜
          </Button>
          {enough ? (
            <Button onClick={onConfirm} disabled={generating}
              className="group bg-gradient-to-r from-orange-400 via-orange-500 to-amber-200 font-medium text-[#09090b] hover:opacity-90">
              {generating ? "出片中…" : `烧 ${segmentCount} 额度，开始出片`}
              {!generating && <span className="ml-1 transition-transform duration-200 group-hover:translate-x-1">➔</span>}
            </Button>
          ) : (
            <Button disabled className="cursor-not-allowed bg-zinc-800 text-muted-foreground">
              <AlertCircle className="size-4" /> 先加分镜
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
