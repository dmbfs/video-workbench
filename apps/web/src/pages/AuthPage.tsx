import { useState } from "react";
import { Clapperboard, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { PublicUser } from "@vidstitch/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShimmerButton } from "@/components/ui/shimmer-button";

/** 登录 / 注册（手机号或邮箱 + 密码）。成功后 onDone 携用户信息回到应用。 */
export function AuthPage({ onDone }: { onDone: (user: PublicUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setError(""); setBusy(true);
    try {
      const { user } =
        mode === "login"
          ? await api.login({ account: account.trim(), password })
          : await api.register({ account: account.trim(), password, nickname: nickname.trim() || undefined });
      onDone(user);
    } catch (err) {
      setError((err as Error).message || "出了点问题，请重试");
    } finally {
      setBusy(false);
    }
  };

  const fields = (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="account">手机号或邮箱</Label>
        <Input id="account" autoComplete="username" placeholder="13800000000 或 you@example.com"
          value={account} onChange={(e) => setAccount(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">密码</Label>
        <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "register" ? "至少 8 位" : "输入密码"} value={password}
          onChange={(e) => setPassword(e.target.value)} />
      </div>
    </>
  );

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm rise-in rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Clapperboard className="size-6 text-primary shrink-0" />
          <div>
            <h1 className="font-display font-semibold text-lg leading-tight">vidstitch</h1>
            <p className="text-xs text-muted-foreground">一句话，分镜，出片</p>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => { setMode(v as "login" | "register"); setError(""); }} className="space-y-4">
          <TabsList className="w-full bg-secondary/70">
            <TabsTrigger value="login" className="flex-1">登录</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-0">
            <form onSubmit={submit} className="space-y-4">
              {fields}
              {error && <p className="text-sm text-[#F87171]">{error}</p>}
              <ShimmerButton type="submit" disabled={busy} background="#F97316" shimmerColor="#FDBA74"
                className="h-9 w-full text-sm font-medium text-primary-foreground">
                {busy ? <Loader2 className="size-4 animate-spin" /> : "登录"}
              </ShimmerButton>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 mt-0">
            <form onSubmit={submit} className="space-y-4">
              {fields}
              <div className="space-y-1.5">
                <Label htmlFor="nickname">昵称 <span className="text-muted-foreground text-xs">（可选）</span></Label>
                <Input id="nickname" placeholder="怎么称呼你" value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </div>
              {error && <p className="text-sm text-[#F87171]">{error}</p>}
              <ShimmerButton type="submit" disabled={busy} background="#F97316" shimmerColor="#FDBA74"
                className="h-9 w-full text-sm font-medium text-primary-foreground">
                {busy ? <Loader2 className="size-4 animate-spin" /> : "注册并登录"}
              </ShimmerButton>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          数据只存在本机（localhost），账号用于区分项目与密钥归属
        </p>
        <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => { setAccount(""); setPassword(""); }}>
          清空重填
        </Button>
      </div>
    </div>
  );
}
