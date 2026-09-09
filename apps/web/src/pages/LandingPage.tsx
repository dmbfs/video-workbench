import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, CircleDashed, Clapperboard, Cpu, EyeOff, KeyRound, Lock, MessagesSquare, MoveDown, Plus, RefreshCw, Sparkles, Timer } from "lucide-react";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BorderBeam } from "@/components/ui/border-beam";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BlurFade } from "@/components/ui/blur-fade";
import { WordRotate } from "@/components/ui/word-rotate";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Button } from "@/components/ui/button";
import { MotionBackground } from "@/components/MotionBackground";

const PLACEHOLDERS = [
  "夕阳下的跨海大桥，车流延时",
  "街角咖啡店暖光，顾客举杯剪影",
  "霓虹夜航，赛博朋克城市",
  "口播开箱，自动加字幕",
  "日落海滩，无人机环绕一圈",
];

function Nav() {
  const navigate = useNavigate();
  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 via-orange-500 to-amber-200 font-display text-sm font-bold text-[#09090b]">
            V
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">vidstitch</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground sm:inline-flex">
            <Lock className="size-3 text-primary" /> 本地运行 · Key 自理
          </span>
          <Button onClick={() => navigate("/app")}
            className="group h-9 bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            进入工作台
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

function HeroMockup() {
  const navigate = useNavigate();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 shadow-2xl shadow-black/40 backdrop-blur-sm">
      <BorderBeam size={120} duration={8} colorFrom="#F97316" colorTo="#FDBA74" />
      {/* MacOS 顶栏 */}
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]/70" />
        <span className="size-2.5 rounded-full bg-[#febc2e]/70" />
        <span className="size-2.5 rounded-full bg-[#28c840]/70" />
        <span className="ml-2 font-mono text-xs text-muted-foreground">vidstitch — 工作台</span>
      </div>
      <div className="space-y-4 p-5">
        <p className="font-mono text-xs text-muted-foreground">流程 B · 有现成文案直接粘</p>
        <PlaceholdersAndVanishInput
          placeholders={PLACEHOLDERS}
          onChange={() => {}}
          onSubmit={() => navigate("/app")}
        />
        {/* 拆解出的分镜条目 */}
        <div className="space-y-2" aria-hidden>
          <div className="flex items-center justify-between rounded-lg border border-border bg-[#09090b] px-3 py-2">
            <span className="font-mono text-xs text-muted-foreground">Shot #01</span>
            <span className="line-clamp-1 text-xs text-muted-foreground">夕阳下的跨海大桥，车流延时</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px]">5s</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2">
            <span className="font-mono text-xs text-primary">Shot #02</span>
            <span className="line-clamp-1 text-xs text-foreground/80">霓虹夜航，赛博朋克城市</span>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[10px] text-primary">3s</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted-foreground">
          <span>确认分镜才开始生成</span>
          <span className="flex items-center gap-1">
            ≈<NumberTicker value={38} className="text-primary" />s 起出片
          </span>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden pt-36 pb-24">
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-[7fr_5fr]">
        <div className="space-y-6">
          <BlurFade delay={0}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              告别抽盲盒，先看分镜再烧钱
            </span>
          </BlurFade>
          <BlurFade delay={0.08}>
            <h1 className="font-display text-5xl font-bold leading-[1.08] tracking-tight lg:text-6xl">
              把一句话，
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-200 bg-clip-text text-transparent">
                变成一条能发的片
              </span>
            </h1>
          </BlurFade>
          <BlurFade delay={0.16}>
            <p className="text-lg text-muted-foreground">
              跟分镜顾问聊两句，产出
              <WordRotate className="mx-1 inline-block font-medium text-foreground"
                words={["30 秒产品宣传片", "竖屏剧情短视频", "口播开箱视频", "城市夜景航拍"]} />
              ——确认了分镜才开始生成。
            </p>
          </BlurFade>
          <BlurFade delay={0.24}>
            <div className="space-y-3 pt-2">
              <ShimmerButton onClick={() => navigate("/app")}
                className="group h-11 px-6 text-sm font-medium"
                shimmerColor="#FDBA74" background="#F97316">
                进入工作台
                <ArrowRight className="ml-1 size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </ShimmerButton>
              <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <Cpu className="size-3.5 text-primary" /> 不注册 · 成片在本地
              </span>
            </div>
          </BlurFade>
        </div>
        <BlurFade delay={0.2}>
          <HeroMockup />
        </BlurFade>
      </div>
    </section>
  );
}

const CARDS = [
  {
    icon: <MessagesSquare className="size-5 text-primary" />,
    title: "先聊，再烧钱",
    desc: "顾问把你的模糊想法问清楚，分镜确认后才调用生成——不花冤枉额度",
    className: "md:col-span-8",
    demo: "agent" as const,
  },
  {
    icon: <KeyRound className="size-5 text-primary" />,
    title: "Key 只存你电脑",
    desc: "请求全部从本机后端转发，界面上连明文都看不到",
    className: "md:col-span-4",
    demo: "privacy" as const,
  },
  {
    icon: <RefreshCw className="size-5 text-primary" />,
    title: "一段翻车不重来",
    desc: "第 2 段不满意？单独重出那一段，别的原样保留",
    className: "md:col-span-6",
    demo: "retry" as const,
  },
  {
    icon: <Timer className="size-5 text-primary" />,
    title: "5–60 秒自定拼接",
    desc: "长片自动拆段接力，段间首尾帧衔接，风格不漂移",
    className: "md:col-span-6",
    demo: "splice" as const,
  },
];

function CardDemo({ kind }: { kind: "agent" | "privacy" | "retry" | "splice" }) {
  if (kind === "agent") {
    return (
      <div className="relative h-full space-y-2" aria-hidden>
        <DotPattern className="opacity-30" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg rounded-bl-sm border border-border bg-[#09090b] px-2.5 py-1.5 text-xs text-muted-foreground">
            顾问：桥上要有「归途感」，结尾加个无人机拉远？
          </div>
          {[
            { n: "01", t: "跨海大桥 · 车流延时", s: "5s", ok: true },
            { n: "02", t: "顾客举杯 · 暖光剪影", s: "3s", ok: true },
            { n: "03", t: "无人机拉远 · 字幕收尾", s: "4s", ok: false },
          ].map((r) => (
            <div key={r.n} className="flex items-center gap-2.5 rounded-lg border border-border bg-[#09090b] px-3 py-1.5">
              <span className="font-mono text-xs text-primary">{r.n}</span>
              <span className="line-clamp-1 flex-1 text-xs text-foreground/80">{r.t}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{r.s}</span>
              {r.ok
                ? <Check className="size-3.5 text-[#4ADE80]" />
                : <CircleDashed className="size-3.5 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "privacy") {
    return (
      <div className="relative h-full space-y-3" aria-hidden>
        <div className="rounded-lg border border-white/5 bg-[#09090b] px-3 py-2.5 font-mono text-xs">
          <div className="text-muted-foreground">MINIMAX_API_KEY</div>
          <div className="mt-1 flex items-center gap-2 text-foreground/85">
            <EyeOff className="size-3.5 text-primary" />
            sk-proj-••••••••8F2a
          </div>
        </div>
        <div className="flex gap-2">
          <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">AES-256</span>
          <span className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 font-mono text-[10px] text-primary">LOCAL ONLY</span>
        </div>
      </div>
    );
  }
  if (kind === "retry") {
    return (
      <div className="relative flex h-full items-center gap-2" aria-hidden>
        {[
          { n: "#01", st: "好了" },
          { n: "#02", st: "翻车了" },
          { n: "#03", st: "好了" },
        ].map((s) => (
          <div key={s.n} className={`flex-1 rounded-lg border px-3 py-2.5 text-center ${
            s.st === "翻车了" ? "border-[#F87171]/40 bg-[#F87171]/10" : "border-border bg-[#09090b]"}`}>
            <div className="font-mono text-xs text-muted-foreground">{s.n}</div>
            <div className={`mt-1 text-xs ${s.st === "翻车了" ? "text-[#F87171]" : "text-[#4ADE80]"}`}>{s.st}</div>
          </div>
        ))}
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-md border border-orange-500/30 bg-[#121215] px-2.5 py-1 font-mono text-[10px] text-primary shadow-lg shadow-black/40">
          重跑此段 ↻
        </span>
      </div>
    );
  }
  return (
    <div className="relative flex h-full flex-col justify-center gap-2.5" aria-hidden>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border border-border bg-[#09090b] px-3 py-2 font-mono text-xs">
          Clip A <span className="text-muted-foreground">· 12s</span>
        </div>
        <Plus className="size-3.5 text-primary" />
        <div className="flex-1 rounded-lg border border-border bg-[#09090b] px-3 py-2 font-mono text-xs">
          Clip B <span className="text-muted-foreground">· 18s</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <MoveDown className="size-3.5 text-primary" />
        <span className="font-mono text-[10px]">ffmpeg 拼接 · 首尾帧接力</span>
      </div>
      <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 font-mono text-xs text-primary">
        final.mp4 · 30.0s
      </div>
    </div>
  );
}

function FeatureBento() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-16">
      <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight">为什么不是又一个「一键生成」</h2>
      <div className="grid gap-4 md:grid-cols-12">
        {CARDS.map((c, i) => (
          <BlurFade key={c.title} delay={i * 0.06} className={c.className}>
            <div className="group relative flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors duration-200 hover:border-orange-500/30">
              <div className="relative flex-1 overflow-hidden rounded-lg">
                <CardDemo kind={c.demo} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {c.icon}
                    <h3 className="font-display font-semibold tracking-tight">{c.title}</h3>
                  </div>
                  {c.demo === "agent" && (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      0 Tokens Spent
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
            </div>
          </BlurFade>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { n: "01", t: "跟顾问聊两句", d: "说清主体、风格、时长，缺什么它才问什么" },
  { n: "02", t: "确认分镜再生成", d: "逐段改 prompt、调时长，满意了才点生成" },
  { n: "03", t: "自动拼接出片", d: "分段生成、首尾帧接力，ffmpeg 拼成一条" },
];

function FlowSteps() {
  const navigate = useNavigate();
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-16">
      <h2 className="font-display text-3xl font-semibold mb-8">三步，从想法到成片</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {STEPS.map((s, i) => (
          <BlurFade key={s.n} delay={i * 0.08}>
            <div className="relative h-full rounded-xl border border-border bg-card p-5 space-y-2 overflow-hidden">
              {i < STEPS.length - 1 && (
                <BorderBeam size={60} duration={5} delay={i * 2} colorFrom="#F97316" colorTo="#FDBA74" />
              )}
              <div className="font-display text-3xl text-primary">{s.n}</div>
              <div className="font-display font-semibold">{s.t}</div>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          </BlurFade>
        ))}
      </div>
      <div className="mt-10 flex items-center gap-3">
        <Button onClick={() => navigate("/app")} className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6">
          现在开始 <ArrowRight className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">第一步不花一分钱</span>
      </div>
    </section>
  );
}

function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Clapperboard className="size-4 text-primary" /> vidstitch · 数据不出去，成片是你的
        </span>
        <button className="hover:text-foreground" onClick={() => navigate("/settings")}>模型接线</button>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <MotionBackground />
      <Nav />
      <Hero />
      <FeatureBento />
      <FlowSteps />
      <Footer />
    </div>
  );
}
