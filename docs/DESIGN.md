# DESIGN.md — vidstitch 视觉与交互规范 v1.1

> 前端一切 UI 从本文件派生。参考来源：即梦/海螺/Pika 实抓截图（`.firecrawl/shot-*.png`）+ Aceternity UI 官方文档（llms.txt / api/components）。
> **v1.1 变更（2026-09-09，落地页 MotionSites 重设计）**：底色/面板/边框令牌调深调亮；新增 §3.5 背景五层栈与算盘成本弹窗；环境层动效豁免条款。落地页实施记录见 `docs/superpowers/plans/2026-09-09-m2c-landing-redesign.md`。

## 1. 参考分析（学什么，丢什么）

| 参考 | 布局结论 | 采用 | 抛弃 |
|---|---|---|---|
| 海螺 hailuoai.video | 左侧栏 + 主创作区（Tab：视频/图片/Agent）+ 提示词框内嵌参数行（2K·5s·21:9）+ 画廊网格 | 工作台整体骨架、参数行内嵌模式 | **紫色主色**（命中红线）、营销横幅堆砌 |
| 即梦 | 全屏视频背景 + 悬浮玻璃导航 + 巨字标题 | 深色沉浸底色思路、噪点+光斑替代纯平 | 中心大 Hero（命中红线）、全屏视频背景（本地工具无此必要） |
| Pika | 奶油浅色 + 黑色大写粗标题；提示词条内嵌「5s chip + 模型选择器 + Generate」 | **提示词条模式**（流程 B 的核心交互原样借鉴）、时长/模型 chip 内嵌 | 浅色主调（PRD 已定深色） |
| Google Flow (labs.google/flow) | Plan（项目级 Agent）→ Create（多模态输入混合）→ Refine（自然语言迭代编辑、改动可"缩放到整个项目"）三段式； Nano Banana 参考图保障主体一致性 | 产品叙事：Agent 窗口即我们的 Plan；「自然语言批量改全部分镜」列为 P1；参考一致性能力已在模型目录（Reference/首尾帧） | 登录墙后的 Scenebuilder 细节（后续真机再学） |

## 2. 设计红线（QA 清单，每轮 Playwright 截图自检逐条核对）

1. ❌ 紫/靛渐变 → 主色一律橙系
2. ❌ 纯平背景 → 所有面板带噪点纹理（SVG feTurbulence data-URI，opacity 3–4%）或径向光斑
3. ❌ Hero+三卡片 → 工作台布局，首屏即创作界面
4. ❌ 完美居中 → 关键内容左对齐/非对称；仅弹窗与空态插画居中
5. ❌ 专业名词与空话 → 文案按 §6 校验
6. ❌ Emoji 当功能图标 → 一律 Iconify 线性图标
7. ❌ ease-in-out 线性动画 → 弹簧曲线或 expo-out（见 §3 动效）

## 3. Design Tokens

### 色彩（深灰 + 橙）

| Token | 值 | 用途 |
|---|---|---|
| `--bg-base` | `#09090B` | 页面底（叠五层背景栈，见 §3.5） |
| `--bg-panel` | `#121215` | 面板/卡片 |
| `--bg-elevated` | `#1E1E22` | 悬浮层/弹窗 |
| `--border` | `rgba(255,255,255,.10)` | 分隔线 |
| `--text-primary` | `#F4F4F5` (zinc-100) | 主文字 |
| `--text-secondary` | `#A1A1AA` (zinc-400) | 次文字 |
| `--accent` | `#F97316` (orange-500) | 主按钮/激活态/进度 |
| `--accent-soft` | `#FDBA74` (orange-300) | hover/高亮文字 |
| `--accent-glow` | `rgba(249,115,22,.18)` | 光斑/发光边框 |
| `--primary-gradient` | `from-orange-400 via-orange-500 to-amber-200` | 核心 H1 高亮、主 CTA（深色文字 `#09090B` 保证对比度） |
| `--success` | `#4ADE80` | 生成完成 |
| `--danger` | `#F87171` | 失败/删除 |

### 字体

中文正文走系统栈（避免数 MB 中文字体）：`-apple-system, "PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei UI", sans-serif`；拉丁标题与数字（时间码/额度数）用 **Bricolage Grotesque**（Google Fonts，`font-display: swap`；Anthropic 前端美学指南点名 Space Grotesk 已成 AI 生成收敛默认，故弃用）；等宽（task id/日志）用 **JetBrains Mono**。层级：页标题 18–20px/600，卡片题 14px/500，正文 14px/400，辅助 12px。

**动效原则（Anthropic 美学指南）**：一次编排好的页面加载（staggered reveals）胜过零散微交互——首次进入工作台执行统一的进场编排（侧栏→提示词条→分镜卡片依次 40ms stagger），之后交互动效从简。

### 圆角/间距/阴影

圆角：面板 16px、卡片 12px、按钮/输入 10px、chip 全圆。间距 4px 基数；面板内边距 16–24px。阴影几乎不用，靠 `--border` + `--accent-glow` 分层。

### 动效（framer-motion）

弹簧：`{ type:"spring", stiffness:300, damping:28 }`；替代曲线 `[0.16,1,0.3,1]`（expo-out）；时长 200–400ms；列表进场 stagger 40ms。生成进度用呼吸光效（`glowing-effect`），禁止匀速循环位移。
**环境层豁免（v1.1）**：仅限背景装饰层（§3.5 光云呼吸 14s ease-in-out、流光 7s/9s linear、`.breathe` alternate）可循环；内容与交互动效一律 spring/expo-out；全部环境动效尊重 `prefers-reduced-motion`。

### 3.5 背景栈（MotionSites，v1.2）

落地页由 `components/MotionBackground.tsx` 渲染，全层 `pointer-events-none`、`-z-10`：

```
[ L4 暗角 ]      径向渐变四周压向 --bg-base（中心 35% 起，边缘 .92）
[ L3 噪点 ]      全局 body::before 3.5% SVG feTurbulence —— 组件内不得重复铺噪点
[ L2 粒子流场 ]  canvas 2D（零依赖非 WebGL）：≤140 颗随视口自适应，
                 伪噪声流场驱动 + 20s 阵风调制 + 三类粒子——
                 70% 尘埃（辉光点）/ 25% 流光（短拖尾）/ 5% 彗星（多点渐隐拖尾，橙→琥珀）；
                 线段拖尾无累积缓冲（不遮光云）；reduced-motion 静止单帧、页签隐藏停帧
[ L1 流光 ]      1px 橙色流光平移（竖 7s / 横 9s，linear）
[ L0 光云 ]      850×400 琥珀高斯模糊光云（blur 110px），14s ease-in-out 正弦呼吸
```

QA：粒子亮斑（lum>35）60–80 个为限、最亮 ≤200/255，超限即降透明度或减量；流光/光云若 100% 下显脏即降档。工作台/设置页不接入光云与粒子层，维持极简。

## 4. 布局结构（工作台）

```
┌─ 左侧栏(Aceternity sidebar, hover 展开, 240px) ─┬─ 主区 ────────────────────┐
│ 项目列表 + 新建 + 设置入口                      │ Tab: 创作 | 项目 | 设置     │
│                                                │ ┌ 提示词条(Pika 式)：       │
│                                                │ │ 输入框+时长chip+模型chip   │
│                                                │ │ +生成按钮(stateful)       │
│                                                │ ├ Agent 对话窗(流程A)       │
│                                                │ ├ 分镜时间线(卡片流,可重排) │
│                                                │ └ 预览播放器 + 导出        │
└────────────────────────────────────────────────┴───────────────────────────┘
```

左对齐为主；成本确认用 `animated-modal`；分段生成进度用 `multi-step-loader` + 段卡片 `glowing-effect` 呼吸态。

## 5. Aceternity UI 组件映射（安装：`npx shadcn@latest add @aceternity/<name>`）

| 组件 | 用在哪 | 适配注意 |
|---|---|---|
| `sidebar` | 全局导航 | 官方为 Next.js 写法，Vite 下删 next/image 换 `<img>` |
| `placeholders-and-vanish-input` | 流程 B 提示词输入 | 占位词轮播用产品场景句 |
| `stateful-button` | 生成/导出按钮 | loading→success 状态机对齐后端任务状态 |
| `multi-step-loader` | 分段生成总进度 | 步数=分段数 |
| `file-upload` | 参考图/首帧图上传 | 拖拽网格背景保留 |
| `animated-modal` | 轻量确认弹窗 | §6 文案 |
| 成本确认算盘弹窗（v1.1，定制） | 生成前预算确认（PRD FR-9） | 三栏算盘 N×1=N font-mono；禁用态「先加分镜」；余额钱包不在范围 |
| `glowing-effect` | 处理中段卡片 | 呼吸频率 2s |
| `card-spotlight` | 项目卡片 | 鼠标跟随径向光 |
| `tabs` | 创作/项目/设置 | 背景滑动动画 |
| `text-generate-effect` | Agent 流式回复 | 逐字淡入与 SSE 增量合流 |

**补充组件库结论**：**Magic UI**（16.4k★，React+Tailwind+Motion，`npx shadcn@latest add @magicui/<slug>` 同款 registry 装法）作为 Aceternity 的动画件补充库采用（marquee/shimmer/dot-pattern 等营销感克制使用）；**Mantine**（120+ 组件）与 **Radix Themes** 自带样式体系，与 Tailwind/shadcn 冲突，均不引入——Radix Primitives 已作为 shadcn 底层间接在用；**ui.glass** 抓取被阻且无 SSR，玻璃拟态效果用 `backdrop-filter: blur(16px)` + `--bg-panel` 透明变体自实现，零依赖。

依赖：Tailwind CSS v4 + `motion`(framer-motion) + clsx + tailwind-merge。

## 6. 文案规范（四条军规 + 本产品示例）

军规：具体化（有数字有动作）、口语化（像同事说话）、带情绪（说人话的爽点/痛点）、可挑衅（适度冒犯懒惰）。禁词：提升生产力、卓越体验、高效协作、智能赋能。

| 场景 | ✅ 这样写 | ❌ 不这样写 |
|---|---|---|
| Hero 标语 | 「把一句话，变成一条能发的视频」 | 「AI 驱动的一站式视频生成平台」 |
| 空状态 | 「别对着空白框发呆了，把脑子里那个画面说出来」 | 「开始您的创作之旅」 |
| 生成中 | 「第 2 段出片中，先去倒杯水」 | 「正在处理，请稍候」 |
| 成本确认 | 「这一步要烧 3 次生成额度，肉疼就先回去改分镜」 | 「确认执行生成任务？」 |
| 单段失败 | 「这段翻车了，重跑一次试试，别的段不受影响」 | 「生成失败，请重试」 |
| 完成 | 「60 秒成片出炉，直接去发」 | 「视频已成功导出」 |

## 7. 资源策略

- **图标**：Iconify `lucide` 集（`@iconify/react` 按需内联，无 key）；shadcn 基础件沿用 lucide-react
- **插画**：undraw.co 仅用于空态/引导页（透明底 SVG，`fill` 改橙系）；深色面板上避免大面积扁平插画
- **真实照片**：Pexels API（**需 key，M3 前提供**；仅用于示例分镜/画廊演示，不进 UI 铬件）
- **占位图**：Picsum（无 key，仅开发期假数据）

## 8. 验收

每轮截图自检除 §2 红线外，另查：噪点在 200% 缩放下可见但 100% 不脏；橙 accent 对比度 ≥ 4.5:1（正文场景）；动画全部 spring/expo-out（Playwright 录制抽查）；文案过 §6 军规。
