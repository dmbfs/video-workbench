# M0 调研记录（Firecrawl 实抓，证据存 `.firecrawl/`）

日期：2026-02 · 工具：Firecrawl REST API v2（Path E，未装 CLI）

## 1. 已核实模型目录（全部为官方文档实抓确认）

| 模型 ID | Host / 端点 | 支持模式 | 分辨率 | 单段时长 | 原生音频 |
|---|---|---|---|---|---|
| `MiniMax-H3` | `api.minimax.io` `POST /v2/video_generation` + `GET /v2/query/video_generation/{task_id}` | T2V / I2V(首帧或首+尾帧) / Reference(角色·运镜·风格·声音) | 768P / 2K | 4–15s 整数 | 有（多模态输入输出） |
| `MiniMax-H3-Max` | 同上 | T2V / I2V(首帧或首+尾帧) | 480P / 768P | 5–15s 整数 | 待真机验证 |
| `dreamina-seedance-2-5-260628` | `ark.ap-southeast.bytepluses.com` `POST /api/v3/contents/generations/tasks` + `GET .../tasks/{id}` | T2V / I2V(首帧或首+尾帧) / Reference / 多模态参考 / 视频编辑 / 视频续写 | 480p / 720p / 1080p(10bit)，24fps | **4–30s** | `with_audio:true`（口型+环境音） |
| `dreamina-seedance-2-0-260128`、`-fast-260128`、`-mini-260615` | 同上 | 同 2.5 | 480p–4K(2.0 标准) | 4–15s | `with_audio:true` |
| `doubao-seedance-2-0-260128`、`-fast` | 国内 `ark.cn-beijing.volces.com`（同 path） | 同上 | 同上 | 4–15s | `with_audio:true` |
| `seedance-1-5-pro-251215`、`seedance-1-0-pro-250528` | 同上 | T2V / I2V(首帧或首+尾帧) | 480p–1080p | 4–12s / 2–12s | — |

关键结论：**用户给出的 `minimax-h3-max` 与 `seedance-2.5` 均为真实在售模型**，我此前的质疑有误，已修正。注意两个坑：① ARK 上**不存在** `doubao-seedance-2-0-pro` 这个 ID（社区讹传，会 model-not-found）；② 国内/国际 host 的 ID 前缀不同（`doubao-` vs `dreamina-`/裸名），适配器必须按 host 绑定 ID。限流：个人账号默认并发 3、RPM 180 → 编排器默认并发 2 合理。

## 2. 生成质量素材（可借鉴 → 已写入 Agent 系统提示词设计）

- **Seedance 2.0 JSON Prompt 结构**（aicontentdrop 指南）：`subject / action / scene / camera / lighting / style / audio` 字段化描述 → 作为每段分镜 prompt 的统一模板，喂给任何模型都能提升出片稳定性。
- **MiniMax H3 官方示例库**（platform.minimax.io/docs/guides/video-prompt）+ **H3 Cookbook**（Notion）：六大用例分类——电影预告/TVC、创意短片、竖屏短剧、电商产品、UI 演示、动画 PV，每类带完整 prompt 范例 → 风格模板库（预置风格预设）的直接素材。
- **Seedance 一次生成内多镜头一致性**：官方注明单次生成内保持镜头一致性 → 优先用 Seedance 2.5 的 30s 长单段减少跨段拼接次数， MiniMax 15s 上限时再分段接力。
- **MoneyPrinterTurbo**（~60k★，Streamlit+FastAPI+MoviePy，Python）：`video_subject` → LLM 生成脚本 → 逐段生成的流程与我们的流程 B 同构；其 Python 栈不构成改选理由（见 §4）。

## 3. Skill 候选（来源 VoltAgent/awesome-agent-skills，1000+ 条合集）

| Skill | 星标 | 与本项目关系 | 建议 |
|---|---|---|---|
| `MiniMax-AI/cli` | 2.1k★ | 官方 CLI，覆盖 MiniMax 文/图/视频/语音；产品已自研同款适配器 | M3 真机调试期可装作对照，不进产品依赖 |
| `openai/sora` | OpenAI 官方 | 仅当接 Sora 才有用 | 暂不需要 |
| `fal-ai-community/fal-kling-o3` 等 | — | fal 平台的 Kling/通用生成 | 暂不需要（用户未提 Kling/fal） |
| `remotion-dev/remotion` | 高星官方 | React 程序化视频（字幕/包装层） | 二期字幕功能再议 |

结论：**当前一个都不装，不阻塞开发**；M3 调试期您再拍板是否装 `MiniMax-AI/cli`。

## 4. 技术栈复核（对照同类项目）

同类头部项目（MoneyPrinterTurbo、NarratoAI 等）均为 Python + Streamlit/MoviePy。不复用其栈的原因：它们面向"批量搬运素材"场景，而本项目核心是 **BYOK 多模型代理 + 异步任务编排 + SSE**，Fastify/TS 生态成熟且与前端共享分镜 schema 类型；拼接只是 concat/xfade，无需 MoviePy。**维持全 TypeScript monorepo 结论不变。**

## 5. 项目管理 skill 选型（已定）

调研范围：claude-task-master（28k★）、github/spec-kit（133k★）、Fission-AI/OpenSpec（67k★）、bmad-code-org/BMAD-METHOD（52k★）、obra/superpowers（282k★），星标经 GitHub API 实抓。结论：**superpowers 精选安装**——`writing-plans` + `executing-plans` 两件核心（已存 `skills/superpowers/`）。取舍：task-master 的任务依赖图对 5 里程碑规模过剩且需 CLI+key；spec-kit/BMAD 仪式过重，二期新功能再评估。工作流已写入项目级 `AGENTS.md`。

## 5b. 第二轮：开发类技能选型（已定）

按工作类别 Firecrawl 调研 + GitHub API 核星，用户拍板全装五件：`anthropics/frontend-design`、`microsoft/frontend-ui-dark-ts`、`google-labs-code/stitch-skills` 之 shadcn-ui、`anthropics/webapp-testing`、`MiniMax-AI/fullstack-dev`（五仓星标：174.9k / 3k / 8.3k / 174.9k / 13.5k），连同配套 references/examples 共 13 文件存 `skills/`。否定结论两条：数据层无适配本地方案的高星技能（Neon/ClickHouse 系均为云厂商专属），由 fullstack-dev 数据库部分覆盖；分镜脚本写作不装通用 prompt 技能（prompt-architect 仅 294★），采领域专用素材方案（H3 示例库 + Seedance JSON 指南 + PRD 六要素模板），参考 Piebald-AI/claude-code-system-prompts（12.6k★）。映射表见项目 `AGENTS.md`。

## 5c. 第三轮：权威产品学习 + 组件库评估 + Context7 通道（已定）

- **Google Flow**（labs.google/flow 实抓）：Plan/Create/Refine 三段式产品叙事；「自然语言批量改全部分镜」吸收为 PRD P1 项；Nano Banana 参考图一致性思路与现有 Reference 能力对齐。证据：`.firecrawl/ref-flow.json`、`shot-flow.png`
- **Veo 官方提示词指南**（cloud.google.com，35.7KB）：提示词解剖学=主体/动作/场景/运镜角度/运镜运动/风格美学/氛围/音频/负向约束 → 并入 PRD §7.3 七要素模板（新增音频、负向约束）。证据：`.firecrawl/veo-prompt-guide.md`
- **Anthropic 前端美学指南**（platform.claude.com cookbook）：点名 Space Grotesk 已成 AI 收敛默认 → DESIGN.md 展示字体改 **Bricolage Grotesque**；其余原则（主色主导+锐利点缀、一次编排的加载动效、背景做氛围）与现有规范一致，已并入。证据：`.firecrawl/anthropic-aesthetics.md`
- **组件库评估**：Magic UI（16.4k★）采用（与 shadcn/Aceternity 同 registry 装法）；Mantine、Radix Themes 样式体系冲突不引入（Radix Primitives 已在 shadcn 底层）；ui.glass 抓取被阻，玻璃拟态用 backdrop-filter 自实现
- **Context7**：本环境无法挂 MCP，实测其 REST API（/api/v1/search + /api/v1/{id}?topic=）等价可用，已写入 AGENTS.md 作为框架文档实时查阅通道

## 6. 证据文件

`.firecrawl/minimax-video.md`（API 契约全文）· `ark-models.md`（模型目录）· `seedance-json-prompt.md`（字段表）· `h3-prompt.md`（官方示例库）· `mpt.md` · `awesome-skills.md` · `minimax-cli.md`

## 7. 网关视频探测与契约结论（M3a 探测 → M3b 更正）

- 用户网关（tokendance，/v1 前缀）：Sora 风格 /v1/videos 不存在；/v1/video/generations 存在但返回 **503 no_endpoints_available**。M3a 曾据此判定「上游未接、网关侧问题」，**M3b 更正为契约选错**：该路由不在 TokenDance 协议目录内，实时目录里 20 个视频模型只声明原生协议（`seedance:generations` / `minimax:video_generation_v2` / `kling:*` / `wan3:video-synthesis` / `happyhorse:video-synthesis`），没有 `openai:video-*`。
- 事实标准确认：LLMGateway 文档定义 OpenAI 兼容异步视频契约 POST /v1/videos（model/prompt/seconds/size/audio/image/last_frame/reference_*）→ GET /v1/videos/{id} → /content 下载；据此实现 openai-video provider（对兼容该契约的网关仍有效）。证据：.firecrawl/llmgw-video.md。
- **M3b 实测（2026-09-09）**：`POST https://tokendance.space/gateway/ark/v3/generations/tasks` + `model=seedance-2.5` → 200 `cgt-20260909160300-74wff`，轮询 `succeeded`，下载得 1280x720 / 5.04s / h264 真实 mp4；应用内 provider 全链路（建项目→4s 段→生成→落地）同样 PASS，产物 h264+aac 4.06s。余额 `/portal/api/v1/user/balance` = 169.76 元，充足；此前 402 `insufficient_quota` 仅因探测误用 `duration=999` 触发预扣估算。
- 结论：视频出片的正确姿势是 TokenDance 原生协议（本轮接入 Seedance；MiniMax/Kling/Wan/HappyHorse 各自独立路径，按需再开任务）。

## 8. MiniMax 视频契约核实（2026-09-10）

- **网关路径**：TokenDance 的 MiniMax 协议在 `https://tokendance.space/gateway/minimax` 下，创建 `POST /v2/video_generation`、轮询 `GET /v2/query/video_generation/{task_id}`；网关文档与 `platform.minimax.io` 官方示例措辞完全一致（证据：用户截图 + `.firecrawl/minimax-video.md`）。
- **零成本探针实测**：该路径真实存在且鉴权通过（发假模型名返回 `模型不存在: …` / `invalid_request`，而非 401/404）；`GET /gateway/v1/models` 目录内含 `minimax-h3`、`minimax-h3-max`、`seedance-2.5`、`seedance-2.0{,-fast,-mini}`。
- **四处适配器缺陷（已修，`scripts/providers-contract.mjs` 20 条断言守护）**：
  1. t2va **必须传 `ratio`**（且不可为 `adaptive`）——原实现完全没传，文生视频必报错；
  2. i2va 图片元素形状为 `{type:"image_url", image_url:{url}, role:"first_frame"}`——原实现传裸字符串且无 `role`，首帧接力失效；
  3. `resolution` 需显式传（H3 支持 768P/2K，**H3-Max 仅 480P/768P**，请求 2K 会 400）。**漏传 `resolution` 的报错很迷惑：`400 当前模型未配置该请求规格的价格`**——网关价格检查先于参数校验，缺档位就无法定位价目，看起来像「网关没配价」实则是我们没传字段（2026-09-10 用户实撞，零成本探针复现：不传→价格错，传 768P→越过价格检查）。
  4. 轮询响应是**嵌套小写** `{task:{status:"succeeded",content:{url}}}`——原实现按顶层大写 `status==="Success"` 解析，永远读不到成功，会空转到 10 分钟超时白扣费。
- 教训沉淀：新 provider 接入前先跑 `pnpm providers-contract`（stub fetch、零花费），再花真钱验证。
- **计费机制（TokenDance）**：视频任务「提交时按请求参数预扣 → 成功后按上游最终 usage 退补 → 失败释放」；价格检查先于参数校验，未过价检的请求不产生任何费用。账本明细与异步任务记录仅网页登录态可查（/credits 账单、/activity/tasks 任务记录），API key 只开放 `/portal/api/v1/user/balance`。本机对照口径：`generation_calls` 表记录应用每次真实出站调用（项目删除会级联清掉其记录）；1 元 = 1,000,000 credits。
- MiniMax H3-Max 支持时长实测：5–15s；H3：4–15s（网关 400 报错原文给出，零成本）。
