# PRD — AI 分镜视频生成器（代号 `vidstitch`，产品名待定）

> 版本 v1.1 · 模型目录与 API 契约已经官方文档实抓核实，调研记录见 `docs/RESEARCH.md`
> 形态：本地单机 Web 应用（localhost）· 本地账号体系（手机号/邮箱注册登录，v1.1 新增）· BYOK（用户自带模型 key）· 中文深色创作工作台

---

## 1. 背景与定位

用户输入一句话需求或一段提示词，通过「分镜顾问 Agent」澄清意图并产出结构化分镜脚本，确认后由后端调用用户配置的视频生成模型逐段生成短片，再由 ffmpeg 拼接为一条自定义时长（5–60s）的完整视频。

核心主张：**需求澄清 → 分镜确认 → 分段生成 → 后端拼接**。烧钱前必有人工确认环节；任何一段失败可单独重试，不必整条重来。

## 2. 目标用户与场景

个人创作者 / 短视频运营，已有或愿意注册各家大模型 API 账号。典型场景：写好产品卖点文案，想要一条 30s 的风格化宣传片；或只有模糊点子，通过与 Agent 对话逐步明确画面。

## 3. 范围

**MVP（P0）**
- 模型接入管理：OpenAI 兼容格式（对话）+ MiniMax、Seedance（视频）+ Mock（无 key 演示），用户填 base_url / model_id / api_key
- Agent 对话窗口：分镜顾问式单线程对话，产出分镜脚本 JSON
- 分镜时间线编辑：改 prompt、改时长、增删段、单段重新生成
- 生成编排：分段任务队列、并发上限、失败重试、SSE 实时进度
- 拼接导出：归一化 + 硬切/叠化 + 输出 mp4
- 项目管理与历史：本地 SQLite + 视频文件库

**二期（P1，本期不做）**
- 自主 Agent（自动多轮改写并触发生成）、2–5 分钟长视频、自然语言批量修改全部分镜（借鉴 Google Flow 的 Refine 能力）、云端多用户、模板库、配音/BGM、云端 SaaS 化；自主 Agent 的 harness 方向稿见 `docs/P1-AGENT-HARNESS.md`

## 4. 核心流程

**流程 A（对话式）**：新建项目 → Agent 窗口描述需求 → Agent 追问澄清（主体/场景/风格/节奏/时长/画幅）→ 产出分镜脚本 → 用户在时间线中修改并确认 → 「全部生成」→ 逐段生成（段间首尾帧接力）→ 预览 → 导出 mp4。

**流程 B（直接生成）**：粘贴现成提示词 → 一键「AI 拆分镜」（按总时长自动分段）→ 后续同 A。

**首尾帧接力**：第 N 段生成完成后，后端用 ffmpeg 抽取其末帧，作为第 N+1 段图生视频的首帧参考，抑制跨段风格/主体漂移；统一 `style_prefix` 注入每段 prompt。

## 5. 功能需求

| 编号 | 功能 | 说明 | 优先级 |
|---|---|---|---|
| FR-1 | 模型管理 | 设置页增删 provider：`openai-compatible`（chat）、`minimax`、`seedance`、`tokendance-seedance`、`mock`；测试连通性；指定默认 chat / video provider | P0 |
| FR-2 | Agent 对话 | SSE 流式回复；系统提示词=分镜顾问；以 JSON 模式产出分镜脚本；zod 校验，失败自动重问 | P0 |
| FR-3 | 分镜编辑 | 时间线卡片：prompt 可编辑、时长（5/10s）、段序调整、增删、转场标记 | P0 |
| FR-4 | 生成编排 | 单段生成 / 全部生成；内存队列并发默认 2（可配）；失败指数退避重试 ≤2 次；状态机 pending→generating→succeeded/failed | P0 |
| FR-5 | 进度推送 | SSE：段级状态、排队位置、错误信息 | P0 |
| FR-6 | 拼接导出 | 分辨率/帧率归一化 → concat（硬切）或 xfade（叠化 0.5s）→ `final.mp4`；显示导出进度 | P0 |
| FR-7 | 单段重生成 | 任意段可重跑，接力帧随之更新 | P0 |
| FR-8 | 项目管理 | 列表 / 打开 / 删除；聊天记录、分镜、分段视频、成品均随项目持久化 | P0 |
| FR-9 | 成本提示 | 生成前显示「将调用 N 次视频生成」 | P1 |
| FR-10 | 画幅选择 | 16:9 / 9:16，生成与导出统一 | P1 |
| FR-11 | 注册登录（v1.1） | 手机号或邮箱 + 密码（≥8 位）；scrypt 散列、会话 cookie（HttpOnly，30 天）；除注册/登录/健康检查外全部 API 与文件服务要求登录；登录失败限速（5 次锁 10 分钟）；手机号容忍 +86 前缀与连字符 | P0 |

## 6. 非功能需求

- 单机运行，数据与视频落在项目目录 `./data`；v1.1 起带本地账号体系（SQLite users/sessions 表，密文口令），区分项目与密钥归属；短信/邮箱验证码不在本期范围（注册不验码）
- Mock provider 走通全链路（合成测试视频），无 key 也能开发与演示
- 视频模型单段时长上限各不相同，适配器暴露 `maxSegmentDuration`，编排器自动截断或提示
- 生成循环有硬边界：单段轮询超时默认 10 分钟（超时不再重试）、单项目付费任务上限默认 30 次、连续 3 段终态失败即熔断该项目排队任务；分别可用 `VIDSTITCH_POLL_TIMEOUT_MS` / `VIDSTITCH_MAX_CALLS_PER_PROJECT` / `VIDSTITCH_BREAKER_FAILURE_THRESHOLD` 覆盖
- 密钥存储于本地配置文件（单机场景）；不做云端加密体系（SaaS 属二期）

## 7. 技术架构

### 7.1 总体结构

```
┌─ apps/web (React18+Vite+TS) ────────────────────────────┐
│ 设置页 · 项目列表 · 创作工作台(Agent窗/分镜时间线/预览/导出) │
└──────────────┬──────────────────────────────────────────┘
        HTTP + SSE (REST /api, 静态 /files)
┌──────────────┴──────────────────────────────────────────┐
│ apps/server (Fastify+TS) —— 不是摆设的职责：              │
│ 1 模型代理(密钥不出后端,统一超时/重试)  2 任务编排器(队列/  │
│ 并发/重试/状态机)  3 首尾帧接力(ffmpeg抽帧)  4 拼接管线    │
│ 5 SQLite持久化  6 SSE进度  7 Mock provider               │
└───┬──────────────┬───────────────┬──────────────────────┘
 ChatProvider  VideoProvider    ffmpeg-static
 (openai兼容)  (minimax/seedance/mock)   → ./data
```

### 7.2 适配器接口（packages/shared 定义类型）

```ts
interface ChatProvider {
  stream(messages: ChatMessage[], opts?: { json?: boolean }): AsyncIterable<string>;
}
interface VideoProvider {
  capabilities(): { maxSegmentDuration: number; imageToVideo: boolean };
  createTask(req: { prompt: string; duration: number; firstFrameB64?: string; ratio: "16:9" | "9:16" }): Promise<{ taskId: string }>;
  pollTask(taskId: string): Promise<{ status: "queued" | "running" | "succeeded" | "failed"; videoUrl?: string; error?: string }>;
}
```

模型 ID 一律走配置，不写死。已核实的默认目录见 §7.7；两家视频 API 均为"创建任务 → 轮询 → 取 CDN 地址"的异步契约，适配器天然匹配。

### 7.3 分镜脚本 Schema（前后端共享 zod）

```jsonc
{
  "title": "城市日落宣传片",
  "ratio": "16:9",
  "with_audio": true,
  "style_prefix": "cinematic, warm golden hour, 35mm film, shallow depth of field",
  "segments": [
    { "index": 1, "duration": 10, "prompt": "远景：女孩走过青石板巷，逆光剪影", "transition_out": "cut" }
  ]
}
```

**prompt 模板**（七要素，融合 Veo 官方解剖学与 Seedance JSON 结构、MiniMax H3 示例库；Agent 系统提示词强制套用）：每段 prompt 按 `主体 / 动作 / 场景 / 运镜（角度+运动）/ 视觉风格与氛围 / 音频（对白·环境音，供 with_audio 模型）/ 负向约束（要避免的元素）` 组织，与 `style_prefix` 拼接后调用模型，跨模型稳定提升出片质量。

### 7.4 数据模型（SQLite）

`projects(id, title, ratio, created_at, updated_at)` · `chat_messages(id, project_id, role, content, created_at)` · `storyboards(project_id, json, confirmed_at)` · `segments(id, project_id, idx, prompt, duration, transition_out, status, provider, task_id, video_path, error)` · `settings(key, json)`

### 7.5 API 契约

```
GET/PUT  /api/settings                      provider 列表与默认项（key 仅后端可见，返回脱敏）
POST     /api/providers/:id/test            连通性测试
GET/POST /api/projects                       列表 / 新建
GET      /api/projects/:id                   项目详情(含聊天+分镜+分段)
DELETE   /api/projects/:id
POST     /api/projects/:id/chat              SSE 流式对话
POST     /api/projects/:id/storyboard        保存确认后的分镜
POST     /api/projects/:id/generate-all      全量生成（返回预计调用次数）
POST     /api/segments/:id/generate          单段(重)生成
GET      /api/projects/:id/events            SSE 进度
POST     /api/projects/:id/export            拼接导出 { transition, crossfadeMs }
GET      /files/*                            成品/分段视频静态服务
```

### 7.6 拼接管线

下载各段 → 统一（scale/crop 至目标分辨率、fps 30、yuv420p、aac 48k 立体声——Seedance 分段带原生音轨，叠化时音频走 `acrossfade`）→ 硬切用 concat demuxer / 叠化用 `xfade` 链式滤镜 → 写入 `data/projects/:id/final.mp4`。接力帧：`ffmpeg -sseof -0.1 -i seg.mp4 -frames:v 1`。

**分段数自适应**：编排器按模型 `maxSegmentDuration` 决定拆段——Seedance 2.5 上限 30s（30s 视频单段直出），MiniMax H3 上限 15s（30s=2 段接力）。用户手动分段仍可覆盖自动策略。

### 7.7 已核实模型目录（默认值，详见 docs/RESEARCH.md）

| 默认模型 | 单段上限 | 亮点 |
|---|---|---|
| `dreamina-seedance-2-5-260628`（BytePlus Ark） | 4–30s | 首尾帧双端、参考生成、`with_audio` 原生音轨 |
| `MiniMax-H3` / `MiniMax-H3-Max`（api.minimax.io） | 4–15s / 5–15s | 首尾帧双端、Reference 角色一致性、2K |
| `doubao-seedance-2-0-*`（火山引擎国内） | 4–15s | 同 2.0；注意无 `-pro` SKU，ID 随 host 前缀变化 |
| `mock`（本地 ffmpeg 合成） | 任意 | 无 key 全链路演示与验收 |
| `openai-video`（任意 /v1/videos 兼容网关） | 4–30s | 首帧接力走 image 字段、audio 开关、鉴权下载 |
| `tokendance-seedance`（TokenDance 网关 `seedance-2.5`） | 4–30s | 原生协议 `POST /gateway/ark/v3/generations/tasks`；首帧接力 `role:first_frame`（画幅自动 adaptive）、`generate_audio`；已真机出片 |

## 8. 技术栈（我的推荐，待联网验证后定稿）

pnpm monorepo · 全 TypeScript：`apps/web` React18+Vite+Tailwind+shadcn/ui+Zustand+TanStack Query；`apps/server` Fastify+better-sqlite3+zod+ffmpeg-static；`packages/shared` zod schema 与类型。

理由：一套语言、分镜 schema 前后端共用类型、本地单机无需 Redis/独立队列库；Fastify 对 SSE 与文件流支持好、比 Nest 轻。备选：Next.js 全栈（对本地工具无 SSR 收益）、Python FastAPI（AI 库丰富但双语言双运行时）。**已对照同类头部项目复核（MoneyPrinterTurbo 等 Python/Streamlit 系）：其场景是批量素材搬运，与本项目"BYOK 代理 + 任务编排 + SSE"核心不同，结论维持不变**（详见 docs/RESEARCH.md §4）。

## 9. 里程碑（每步 Playwright 截图自检）

| 阶段 | 内容 | 验收标准 |
|---|---|---|
| M0 | PRD 定稿 | ✅ 完成：模型 ID/API 契约核实、同类项目与 skill 调研（docs/RESEARCH.md） |
| M1 | monorepo 脚手架 + 设置页 + Mock 全链路 | ✅ 完成（commit bf15cdc）：E2E PASS · final.mp4=30.0s · 截图 screenshots/m1-0*.png |
| M2b | 首页 + 动效 + Aceternity/Magic UI | ✅ 完成：E2E-M2b PASS（landing→app 全链路 30.0s），截图 screenshots/m2b-0*.png；视觉复核待用户（图像桥故障） |
| M2 | Agent 窗口接真实 OpenAI 兼容 chat | ✅ 完成：mock E2E PASS(final=30.0s) + 真实模型冒烟 PASS（glm-5.3-flash，4 段合法分镜 50.9s）；截图 screenshots/m2-0*.png |
| M3 | 真实视频 provider + 编排 + SSE 进度 + 单段重生成 | ✅ 完成：M3a openai-video 契约（网关不兼容）+ M3b TokenDance Seedance 原生协议；应用内真机出片 4.06s h264+aac，mock E2E PASS |
| M4 | 导出转场/历史完善 | 成品 mp4 正常播放，项目管理闭环 |
| M5 | 整体验收 | 全流程走查 + 截图交付 |

## 10. 风险与对策

跨段一致性漂移 → 首尾帧接力 + style_prefix + 单段重跑兜底；chat 模型 JSON 输出不稳 → JSON 模式 + zod 校验 + 自动重问；各家模型单段时长上限不一 → 适配器能力声明 + 编排器拆分；浏览器 CORS/下载限制 → 全部网络与 ffmpeg 操作收口在后端；provider 挂起/故障 → 轮询超时 + 单项目调用上限 + 连续失败熔断，避免无限等待与成倍计费。

## 11. 待定项

1. 对话模型 base_url / model / key（M2 前提供，OpenAI 兼容格式）
2. MiniMax / 火山引擎视频 key（M3 前可选提供；无则全程 mock）
3. M3 调试期是否安装 `MiniMax-AI/cli` skill 作对照（2.1k★，不进产品依赖）
4. 产品名
