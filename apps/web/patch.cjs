const fs = require("fs");
let w = fs.readFileSync("src/pages/WorkbenchPage.tsx", "utf8");
w = w.replace(
  'import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";',
  'import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";\n' +
  'import { GlowingEffect } from "@/components/ui/glowing-effect";\n' +
  'import { ShimmerButton } from "@/components/ui/shimmer-button";\n' +
  'import { BlurFade } from "@/components/ui/blur-fade";'
);
const openOld = '          <div key={s.id}\n            className={`rise-in relative w-64 shrink-0 rounded-xl border bg-card p-3 space-y-2 ${s.status === "generating" ? "breathe" : "border-border"}`}\n            style={{ animationDelay: `${120 + i * 40}ms` }}>';
if (!w.includes(openOld)) throw new Error("card open not found");
const openNew = '          <div key={s.id}\n            className={`${s.status === "generating" ? "breathe relative rounded-xl" : "relative"}`}\n            style={{ animationDelay: `${120 + i * 40}ms` }}>\n            <GlowingEffect spread={32} glow proximity={56} inactiveZone={0.6} borderWidth={1.5} disabled={s.status === "generating"} />\n            <div className="rise-in rounded-xl border border-border bg-card p-3 space-y-2 h-full">';
w = w.split(openOld).join(openNew);
const closeOld = '                <Trash2 className="size-3.5 text-destructive" />\n              </Button>\n            </div>\n          </div>';
if (!w.includes(closeOld)) throw new Error("card close not found");
w = w.split(closeOld).join('                <Trash2 className="size-3.5 text-destructive" />\n              </Button>\n            </div>\n            </div>\n          </div>');
const genOld = '        <Button onClick={generateAll} disabled={generating || segments.length === 0}\n          className="bg-primary text-primary-foreground hover:bg-primary/90">\n          {generating && <Loader2 className="size-4 animate-spin" />} 生成全部\n        </Button>';
if (!w.includes(genOld)) throw new Error("gen button not found");
const genNew = '        <ShimmerButton onClick={generateAll} disabled={generating || segments.length === 0}\n          background="#F97316" shimmerColor="#FDBA74"\n          className="h-10 px-5 text-sm font-medium text-primary-foreground">\n          {generating && <Loader2 className="size-4 animate-spin" />} 生成全部\n        </ShimmerButton>';
w = w.split(genOld).join(genNew);
const propOld = '    <div className="rise-in fixed bottom-6 right-6 w-[440px]';
if (!w.includes(propOld)) throw new Error("proposal not found");
w = w.split(propOld).join('    <BlurFade inView className="fixed bottom-6 right-6 w-[440px]');
fs.writeFileSync("src/pages/WorkbenchPage.tsx", w);
console.log("workbench patched");

let st = fs.readFileSync("src/pages/SettingsPage.tsx", "utf8");
st = st.replace(
  'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";',
  'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";\n' +
  'import { ShimmerButton } from "@/components/ui/shimmer-button";'
);
const saveOld = '        <Button onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90">保存全部</Button>';
if (!st.includes(saveOld)) throw new Error("save button not found");
st = st.split(saveOld).join('        <ShimmerButton onClick={save} background="#F97316" shimmerColor="#FDBA74" className="h-9 px-4 text-sm font-medium text-primary-foreground">保存全部</ShimmerButton>');
fs.writeFileSync("src/pages/SettingsPage.tsx", st);
console.log("settings patched");
