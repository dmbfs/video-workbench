# Video Workbench（vidstitch）· AI 分镜视频生成工作台

> 一句话需求或一段提示词 → **分镜顾问 Agent** 澄清意图并产出结构化分镜脚本 → 确认后逐段调用视频模型生成 → **ffmpeg 后端拼接**成一条 5–60s 的完整成片。
>
> 核心主张：**需求澄清 → 分镜确认 → 分段生成 → 后端拼接**——烧钱前必有人工确认环节；任何一段失败可单独重试，不必整条重来。

本地单机 Web 应用 · 本地账号体系 · **BYOK**（Bring Your Own Key，用户自带各家模型 key）· 中文深色创作工作台。

---

## ✨ 核心特性

- **分镜顾问 Agent**：SSE 流式对话澄清需求（主体 / 场景 / 风格 / 节奏 / 时长 / 画幅），以 JSON 模式产出分镜脚本，zod 校验失败自动重问
- **时间线编辑**：prompt 点击编辑、时长调整、段序前后移、增删段、转场硬切/叠化切换、任意单段重生成
- **多 Provider BYOK**：`openai-compatible`（chat）+ `minimax` / `seedance`（BytePlus Ark、火山引擎）/ `tokendance-seedance`（TokenDance 网关）/ `openai-video` / `mock`；设置页填 base_url / model_id / api_key，**密钥只存本地**
- **生成编排**：任务队列 + 并发上限 + 指数退避重试 + SSE 实时进度；轮询超时、单项目调用上限、连续失败熔断三重硬边界，防失控等待与成倍计费
- **首尾帧接力**：前段末帧自动抽取作为后段图生视频的首帧参考，配合统一 `style_prefix` 抑制跨段风格/主体漂移
- **拼接导出**：分辨率/帧率归一化 → 硬切（concat）/ 叠化（xfade + acrossfade）→ 质感后处理预设（`film` 胶片感 / `clean` 社媒直出）→ `libx264 -crf 18` mp4（faststart）
- **一键成片技能链**（`apps/server/src/skills/`）：一段 prompt 自动接力 `prompt-enhance → storyboard → video-gen → narration → postfx-grade → stitch-export` 直达成片
- **成片完整度三件套**：旁白 TTS（链上非致命步骤）+ 词级时间轴 ASS 字幕烧录（可关）+ BGM 循环铺底与旁白自动闪避
- **Mock provider**：本地 ffmpeg 合成测试视频，**无任何 key 也能走通全链路**开发与演示

## 🚀 快速开始

**前置要求**：Node.js ≥ 20、pnpm ≥ 10（仓库锁定 11.23.0）。ffmpeg / ffprobe 由依赖（`ffmpeg-static`、`@ffprobe-installer`）自动提供，无需单独安装。

```bash
pnpm install
cp .env.example .env   # 可选：应用本体不依赖任何 .env，留空即可
pnpm dev               # 仓库根目录一键同起前后端
```

- Web 界面：<http://localhost:5173>（API 自动反代到后端 8787）
- 后端 API：<http://localhost:8787>

**首次使用**：

1. 注册本地账号（手机号/邮箱 + 密码，仅存本机 SQLite）；
2. 打开「设置」页添加 Provider——想立刻看效果就选 **mock**，想出真片就填各家 API 的 base_url / model_id / api_key（可用「测试连通」验证）；
3. 新建项目，在 Agent 窗口描述需求（或直接粘贴提示词一键「AI 拆分镜」）→ 确认分镜 → 生成 → 预览 → 导出 mp4。

> 💡 无 key 演示：添加 `mock` provider 即可走通「分镜 → 生成 → 拼接导出」全链路（本地合成，不计费）。

## 🔧 环境变量

全部可选，见 `.env.example`：

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `8787` | 后端监听端口 |
| `VIDSTITCH_RESOLUTION` | `1080p` | 生成清晰度档位（按 provider 能力自动收紧，可降 `720p` 省成本） |
| `VIDSTITCH_TTS_MODEL` / `VIDSTITCH_TTS_VOICE` | 网关缺省 | 旁白 TTS 模型 / 音色 |
| `VIDSTITCH_POLL_TIMEOUT_MS` | `600000` | 单段轮询超时（超时不再重试） |
| `VIDSTITCH_MAX_CALLS_PER_PROJECT` | `30` | 单项目付费任务上限 |
| `VIDSTITCH_BREAKER_FAILURE_THRESHOLD` | `3` | 连续终态失败熔断阈值 |
| `VIDSTITCH_POLL_INTERVAL_MS` | `1500` | 轮询间隔 |
| `FIRECRAWL_API_KEY` | — | 仅开发期联网调研用，运行本应用不依赖 |

> **模型 API key 不走环境变量**：在应用「设置页」录入，仅保存于本地 SQLite（API 响应脱敏，永不上传）。

## 🏗️ 架构与技术栈

```
┌─ apps/web (React 18 + Vite + TS) ──────────────────────────┐
│ 设置页 · 项目列表 · 创作工作台（Agent 窗/分镜时间线/预览/导出）│
└───────────────┬────────────────────────────────────────────┘
         HTTP + SSE（REST /api，静态 /files）
┌───────────────┴────────────────────────────────────────────┐
│ apps/server (Fastify + TS)                                  │
│ 1 模型代理（密钥不出后端，统一超时/重试） 2 任务编排器        │
│ 3 首尾帧接力（ffmpeg 抽帧） 4 拼接管线 5 SQLite 持久化       │
│ 6 SSE 进度 7 Mock provider 8 运行时技能链                    │
└────┬──────────────┬─────────────────┬───────────────────────┘
  ChatProvider   VideoProvider      ffmpeg-static → ./data
  (openai 兼容)  (minimax/seedance/tokendance/openai-video/mock)
```

**pnpm monorepo · 全 TypeScript**：`apps/web`（React 18 + Vite + Tailwind CSS 4 + shadcn/ui + TanStack Query）· `apps/server`（Fastify 5 + better-sqlite3 + zod + ffmpeg-static）· `packages/shared`（前后端共享 zod schema 与类型）。

## 📁 项目结构

```
├── apps/
│   ├── web/            # 前端：设置页 / 项目列表 / 创作工作台
│   └── server/         # 后端：API、编排器、拼接管线、SQLite
│       └── src/skills/ # 运行时技能链（一键成片，见其 README.md）
├── packages/shared/    # zod schema 与共享类型
├── docs/               # PRD 配套：DESIGN（视觉规范）/ RESEARCH（调研证据）/ 实施计划
├── scripts/            # e2e 回归（Playwright）、provider 契约冒烟、密码重置
├── skills/             # agent 开发技能（superpowers 精选、video-postfx 等）
├── PRD.md              # 产品需求与架构唯一事实源
└── AGENTS.md           # 项目协作规则（提交策略、技能映射、自检清单）
```

## 🧪 常用脚本

```bash
pnpm dev                  # 前后端并行开发
pnpm e2e-auto             # 一键成片全链路 e2e（硬注入 mock，防真机计费）
pnpm e2e / e2e-m2 / ...   # 各里程碑回归套件
pnpm providers-contract   # 视频 provider 契约冒烟
pnpm reset-password       # 本机账号密码重置
```

## 🔒 隐私与安全

- 所有 API key、账号、项目数据**只存在于本机**：密钥存本地 SQLite（`data/`），`.env` 与 `data/` 均不入库（见 `.gitignore`）；
- 登录采用 scrypt 口令散列 + HttpOnly 会话 Cookie；除注册/登录/健康检查外，全部 API 与文件服务要求登录，登录失败限速；
- 无任何遥测，全部网络请求仅发往你自己配置的模型服务商。

## 🗺️ Roadmap（二期）

自主 Agent（多轮自动改写并触发生成）· 2–5 分钟长视频 · 自然语言批量修改全部分镜 · 模板库 · 云端多用户。方向稿见 `docs/P1-AGENT-HARNESS.md`。

## 📚 文档

| 文档 | 内容 |
|---|---|
| [PRD.md](PRD.md) | 产品需求、功能清单、架构与管线细节（唯一事实源） |
| [docs/DESIGN.md](docs/DESIGN.md) | 视觉与交互规范（UI 一律从其派生） |
| [docs/RESEARCH.md](docs/RESEARCH.md) | 模型目录与 API 契约调研证据 |
| [AGENTS.md](AGENTS.md) | 项目协作规则与开发流程 |
| [apps/server/src/skills/README.md](apps/server/src/skills/README.md) | 一键成片运行时技能链契约 |

## License

暂未附带 LICENSE 文件（`package.json` 内声明为 ISC）——如需以特定协议开源，请自行添加。
