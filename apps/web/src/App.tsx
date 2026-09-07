import { useEffect, useState } from "react";
import { Clapperboard, Plus, Settings } from "lucide-react";
import { api } from "@/lib/api";
import type { ProjectSummary } from "@vidstitch/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkbenchPage } from "@/pages/WorkbenchPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("work");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newRatio, setNewRatio] = useState<"16:9" | "9:16">("16:9");

  const refresh = () => api.listProjects().then(setProjects).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const createProject = async () => {
    if (!newTitle.trim()) return;
    const { id } = await api.createProject({ title: newTitle.trim(), ratio: newRatio });
    setCreating(false); setNewTitle("");
    await refresh(); setActiveId(id); setTab("work");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="group w-14 hover:w-60 transition-all duration-300 [transition-timing-function:var(--ease-out-expo)] shrink-0 border-r border-border bg-card/60 backdrop-blur-sm flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <Clapperboard className="size-5 text-primary shrink-0" />
          <span className="font-display font-semibold text-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">vidstitch</span>
        </div>
        <div className="p-3 space-y-1 flex-1 overflow-y-auto">
          {projects.map((p, i) => (
            <button key={p.id} onClick={() => { setActiveId(p.id); setTab("work"); }}
              className={`rise-in w-full text-left rounded-md px-2 py-2 text-sm whitespace-nowrap truncate hover:bg-secondary ${activeId === p.id ? "bg-secondary text-primary-foreground" : "text-muted-foreground"}`}
              style={{ animationDelay: `${i * 40}ms` }}>
              {p.title}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setCreating(true)}>
            <Plus className="size-4" /><span className="whitespace-nowrap">新建项目</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setTab("settings")}>
            <Settings className="size-4" /><span className="whitespace-nowrap">设置</span>
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Tabs value={tab} onValueChange={setTab} className="h-full">
          <TabsList className="m-4 bg-secondary/70">
            <TabsTrigger value="work">创作</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>
          <TabsContent value="work" className="m-4 mt-0">
            {activeId
              ? <WorkbenchPage projectId={activeId} />
              : <div className="mt-24 text-muted-foreground">左侧选个项目，或者新建一个——一分钟就能出片</div>}
          </TabsContent>
          <TabsContent value="settings" className="m-4 mt-0">
            <SettingsPage />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>新建项目</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pt">标题</Label>
              <Input id="pt" placeholder="例如：日落宣传测试" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>画幅</Label>
              <Select value={newRatio} onValueChange={(v) => setNewRatio(v as "16:9" | "9:16")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 横屏</SelectItem>
                  <SelectItem value="9:16">9:16 竖屏</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createProject} className="bg-primary text-primary-foreground hover:bg-primary/90">创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
