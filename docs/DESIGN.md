# DESIGN.md — vidstitch 视觉与交互规范 v1.0

> 前端一切 UI 从本文件派生。参考来源：即梦/海螺/Pika 实抓截图（`.firecrawl/shot-*.png`）+ Aceternity UI 官方文档（llms.txt / api/components）。

## 1. 参考分析（学什么，丢什么）

| 参考 | 布局结论 | 采用 | 抛弃 |
|---|---|---|---|
| 海螺 hailuoai.video | 左侧栏 + 主创作区（Tab：视频/图片/Agent）+ 提示词框内嵌参数行（2K·5s·21:9）+ 画廊网格 | 工作台整体骨架、参数行内嵌模式 | **紫色主色**（命中红线）、营销横幅堆砌 |
| 即梦 | 全屏视频背景 + 悬浮玻璃导航 + 巨字标题 | 深色沉浸底色思路、噪点+光斑替代纯平 | 中心大 Hero（命中红线）、全屏视频背景（本地工具无此必要） |
| Pika | 奶油浅色 + 黑色大写粗标题；提示词条内嵌「5s chip + 模型选择器 + Generate」 | **提示词条模式**（流程 B 的核心交互原样借鉴）、时长/模型 chip 内嵌 | 浅色主调（PRD 已定深色） |

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
| `--bg-base` | `#0B0B0D` | 页面底（叠噪点+顶部橙色微光斑） |
| `--bg-panel` | `#151517` | 面板/卡片 |
| `--bg-elevated` | `#1E1E22` | 悬浮层/弹窗 |
| `--border` | `rgba(255,255,255,.08)` | 分隔线 |
| `--text-primary` | `#F4F4F5` (zinc-100) | 主文字 |
| `--text-secondary` | `#A1A1AA` (zinc-400) | 次文字 |
| `--accent` | `#F97316` (orange-500) | 主按钮/激活态/进度 |
| `--accent-soft` | `#FDBA74` (orange-300) | hover/高亮文字 |
| `--accent-glow` | `rgba(249,115,22,.18)` | 光斑/发光边框 |
| `--success` | `#4ADE80` | 生成完成 |
| `--danger` | `#F87171` | 失败/删除 |

### 字体

中文正文走系统栈（避免数 MB 中文字体）：`-apple-system, "PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei UI", sans-serif`；拉丁标题与数字（时间码/额度数）用 **Space Grotesk**（Google Fonts，`font-display: swap`）；等宽（task id/日志）用 **JetBrains Mono**。层级：页标题 18–20px/600，卡片题 14px/500，正文 14px/400，辅助 12px。

### 圆角/间距/阴影

圆角：面板 16px、卡片 12px、按钮/输入 10px、chip 全圆。间距 4px 基数；面板内边距 16–24px。阴影几乎不用，靠 `--border` + `--accent-glow` 分层。

### 动效（framer-motion）

弹簧：`{ type:"spring", stiffness:300, damping:28 }`；替代曲线 `[0.16,1,0.3,1]`（expo-out）；时长 200–400ms；列表进场 stagger 40ms。生成进度用呼吸光效（`glowing-effect`），禁止匀速循环位移。

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
| `animated-modal` | 成本确认弹窗 | §6 文案 |
| `glowing-effect` | 处理中段卡片 | 呼吸频率 2s |
| `card-spotlight` | 项目卡片 | 鼠标跟随径向光 |
| `tabs` | 创作/项目/设置 | 背景滑动动画 |
| `text-generate-effect` | Agent 流式回复 | 逐字淡入与 SSE 增量合流 |

依赖：Tailwind CSS v4 + `motion`(framer-motion) + clsx + tailwind-merge。

## 6. 文案规范（四条军规 + 本产品示例）

军规：具体化（有数字有动作）、口语化（像同事说话）、带情绪（说人话的爽点/痛点）、可挑衅（适度冒犯懒惰）。禁词：提升生产力、卓越体验、高效协作、智能赋能。

| 场景 | ✅ 这样写 | ❌ 不这样写 |
|---|---|---|
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
