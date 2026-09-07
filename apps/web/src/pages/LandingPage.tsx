import { useNavigate } from "react-router-dom";
import { ArrowRight, Clapperboard, KeyRound, MessagesSquare, RefreshCw, Settings, Timer } from "lucide-react";
import { Spotlight } from "@/components/ui/spotlight-new";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BorderBeam } from "@/components/ui/border-beam";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BlurFade } from "@/components/ui/blur-fade";
import { WordRotate } from "@/components/ui/word-rotate";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Button } from "@/components/ui/button";

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
    <nav className="sticky top-0 z-40 border-b border-border bg-[#0b0b0d]/70 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clapperboard className="size-5 text-primary" />
          <span className="font-display font-semibold text-lg">vidstitch</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate("/settings")}>
            <Settings className="size-4" />设置
          </Button>
          <ShimmerButton onClick={() => navigate("/app")}
            className="h-9 px-4 text-sm font-medium"
            shimmerColor="#FDBA74" background="#151517">
            进工作台
          </ShimmerButton>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden">
      <Spotlight
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(24,100%,85%,.08) 0, hsla(24,100%,55%,.02) 50%, hsla(24,100%,45%,0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(24,100%,85%,.06) 0, hsla(24,100%,55%,.02) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(24,100%,85%,.04) 0, hsla(24,100%,45%,.02) 80%, transparent 100%)"
      />
      <DotPattern className="opacity-40 [mask-image:radial-gradient(50%_50%_at_50%_40%,white,transparent)]" />
      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 grid md:grid-cols-[1.15fr_1fr] gap-12 items-center">
        <div className="space-y-6">
          <BlurFade delay={0}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              本地运行 · key 自己填 · 数据不出去
            </span>
          </BlurFade>
          <BlurFade delay={0.08}>
            <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.08]">
              把一句话，
              <br />
              变成一条<span className="text-primary">能发的片</span>
            </h1>
          </BlurFade>
          <BlurFade delay={0.16}>
            <p className="text-lg text-muted-foreground">
              跟分镜顾问聊两句，产出
              <WordRotate className="inline-block text-foreground font-medium mx-1"
                words={["30 秒产品宣传片", "竖屏剧情短视频", "口播开箱视频", "城市夜景航拍"]} />
              ——确认了分镜才开始生成。
            </p>
          </BlurFade>
          <BlurFade delay={0.24}>
            <div className="flex items-center gap-3 pt-2">
              <ShimmerButton onClick={() => navigate("/app")}
                className="h-11 px-6 text-sm font-medium"
                shimmerColor="#FDBA74" background="#F97316">
                进工作台，先聊两句
              </ShimmerButton>
              <span className="text-sm text-muted-foreground">不注册、不上传，成片就在你硬盘里</span>
            </div>
          </BlurFade>
        </div>

        <BlurFade delay={0.2}>
          <div className="relative rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-5 space-y-4">
            <BorderBeam size={120} duration={8} colorFrom="#F97316" colorTo="#FDBA74" />
            <p className="text-xs font-mono text-muted-foreground">流程 B · 有现成文案直接粘</p>
            <PlaceholdersAndVanishInput
              placeholders={PLACEHOLDERS}
              onChange={() => {}}
              onSubmit={() => navigate("/app")}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>回车直接进工作台</span>
              <span className="flex items-center gap-1 font-mono">
                <NumberTicker value={30} className="text-primary" />s 起
              </span>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: <MessagesSquare className="size-5 text-primary" />,
    title: "先聊，再烧钱",
    desc: "顾问把你的模糊想法问清楚，分镜确认后才调用生成——不花冤枉额度",
    className: "md:col-span-2",
  },
  {
    icon: <RefreshCw className="size-5 text-primary" />,
    title: "一段翻车不重来",
    desc: "第 2 段不满意？单独重出那一段，别的原样保留",
    className: "",
  },
  {
    icon: <KeyRound className="size-5 text-primary" />,
    title: "key 只存你电脑",
    desc: "请求全部从本机后端转发，界面上连明文都看不到",
    className: "",
  },
  {
    icon: <Timer className="size-5 text-primary" />,
    title: "5–60 秒自己定",
    desc: "长片自动拆段接力，段间首尾帧衔接，风格不漂移",
    className: "md:col-span-2",
  },
];

function FeatureBento() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-16">
      <h2 className="font-display text-3xl font-semibold mb-8">为什么不是又一个「一键生成」</h2>
      <BentoGrid className="grid md:grid-cols-3 auto-rows-[13rem] gap-4">
        {FEATURES.map((f, i) => (
          <BlurFade key={f.title} delay={i * 0.06} className={f.className}>
            <BentoGridItem
              title={f.title}
              description={f.desc}
              icon={f.icon}
              className="h-full [&_h3]:font-display [&_p]:text-muted-foreground"
              header={
                <div className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-card/60 flex items-center justify-center">
                  <DotPattern className="opacity-30" />
                  {i === 0 && (
                    <div className="relative z-10 w-3/4 space-y-2">
                      <div className="h-6 w-2/3 rounded-md bg-secondary" />
                      <div className="h-6 w-full rounded-md bg-primary/20" />
                      <div className="h-6 w-1/2 rounded-md bg-secondary" />
                    </div>
                  )}
                  {i === 3 && (
                    <div className="relative z-10 flex items-end gap-1.5 h-16">
                      {[40, 65, 30, 80, 55, 95, 45].map((h, k) => (
                        <div key={k} className="w-3 rounded-sm bg-primary/70" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  )}
                </div>
              }
            />
          </BlurFade>
        ))}
      </BentoGrid>
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
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <FeatureBento />
      <FlowSteps />
      <Footer />
    </div>
  );
}
