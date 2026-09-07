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

## 6. 证据文件

`.firecrawl/minimax-video.md`（API 契约全文）· `ark-models.md`（模型目录）· `seedance-json-prompt.md`（字段表）· `h3-prompt.md`（官方示例库）· `mpt.md` · `awesome-skills.md` · `minimax-cli.md`
