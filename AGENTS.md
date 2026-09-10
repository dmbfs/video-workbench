# AGENTS.md — vidstitch 项目规则（项目级，补充全局 Agent.md）

## 项目事实源

- 产品需求与架构唯一事实源：`PRD.md`（当前 v1.1）；视觉与交互规范：`docs/DESIGN.md`（UI 一律从其派生）；调研证据：`docs/RESEARCH.md` 与 `.firecrawl/`
- v1.1 变更：新增本地账号体系（PRD FR-11，手机号/邮箱 + 密码），除 `/api/auth/*` 与 `/api/health` 外全部 API 与 `/files` 需登录；e2e 脚本经 `scripts/lib-auth.mjs` 注册一次性账号
- 里程碑与验收标准以 PRD §9 为准；PRD 变更须同步本文件与任务计划
- 生成循环硬边界（轮询超时 / 单项目调用上限 / 连续失败熔断）以 PRD §6 为准，实现见 `apps/server/src/config.ts` 与 `orchestrator.ts`；生成清晰度档位（`VIDSTITCH_RESOLUTION`，默认 1080p、按 provider 能力收紧）与导出编码口径以 PRD §7.6 为准
- 成片完整度口径（PRD FR-13/§7.8）：旁白为链上**非致命**步骤（失败仅告警，成片继续）；导出时旁白人声 1.0 / 原声 0.55 / BGM 0.18 循环铺底并随旁白闪避，字幕按 TTS 词级时间轴烧 ASS（默认开，导出可关）；e2e 必须硬注入 mock（`e2e-auto` 注入失败即拒跑，防真机计费事故）

## 仓库布局

- `skills/` — 已安装的 agent skills（superpowers 精选、官方 skill-creator、minimax-cli、remotion、前端三件套、webapp-testing、video-postfx）
- `apps/server/src/skills/` — **运行时技能层**（一键成片 skill 链，PRD FR-12/§7.8；与上面 agent skills 是两层概念，契约见其 README.md）
- `docs/` — 调研与计划文档；`docs/superpowers/plans/` 存放各里程碑实施计划
- `.firecrawl/` — Firecrawl 抓取证据（原始 markdown）
- 后续 `apps/web`、`apps/server`、`packages/shared` 按 PRD §8 创建

## 项目管理流程（superpowers 精选）

- 每个里程碑开工前：用 `skills/superpowers/writing-plans/SKILL.md` 产出实施计划，落盘 `docs/superpowers/plans/`，交用户审阅后执行
- 执行期：用 `skills/superpowers/executing-plans/SKILL.md` 逐任务推进，检查点向用户汇报
- 该技能引用的 `using-git-worktrees`、`subagent-driven-development` 未安装：本项目为单线开发，在用户工作副本直接执行，不建 worktree；并行子代理按全局 Agent.md 从严使用

## Git 提交策略

- 每完成一个任务提交一次，message 用 `type(scope): summary`（type ∈ feat / fix / docs / chore / refactor）
- 永不入库：`.env`（含所有 API key）、`data/`（视频与数据库）、`node_modules/`、构建产物
- `.firecrawl/` 只提交 `.md` 证据，原始 `.json` 抓取不入库
- `skills/` 与 `AGENTS.md`、`PRD.md`、`docs/` 属项目资产，随代码一同提交
- 单人单线开发：主分支直接提交，不建 worktree；将来上 GitHub 用同一套规则

## 技能映射（开工前先读对应 SKILL.md）

- 前端 UI：`skills/frontend-design/`（美学方向）+ `skills/frontend-ui-dark-ts/`（深色主题与设计令牌）+ `skills/shadcn-ui/`（组件构建）；**所有视觉决策以 `docs/DESIGN.md` 为准**（含设计红线 QA 清单与 Aceternity 组件映射，安装走 `npx shadcn@latest add @aceternity/<name>`）
- 后端与数据：`skills/fullstack-dev/`（REST 设计、实时特性、数据库集成；其中 MiniMax API 媒体生成部分与产品无关，忽略）
- 自检验收：`skills/webapp-testing/`（Playwright 测试与截图）
- 视频质感后处理：`skills/video-postfx/`（调色/颗粒/晕影/锐化预设配方，已接入导出管线 `POSTFX_FILTERS`；新增预设须按其步骤登记）
- 分镜脚本写作：不用通用技能；素材为 `.firecrawl/h3-prompt.md`（H3 官方示例库）、`.firecrawl/seedance-json-prompt.md`（Seedance JSON 字段结构）与 PRD §7.3 六要素模板；写系统提示词时可参考 Piebald-AI/claude-code-system-prompts（12.6k★）
- 流程纪律：`skills/superpowers/`（writing-plans / executing-plans，见上节）
- 排障：`skills/systematic-debugging/`（provider 报错 / 熔断误触发 / 拼接产物异常等非显而易见 bug，动手前先读；配套 root-cause-tracing / defense-in-depth / condition-based-waiting 参考）
- 完成前验收：`skills/verification-before-completion/`（每个任务宣告完成前必过一遍，配合 §自检）
- 立项澄清：`skills/brainstorming/`（PRD 变更 / 新功能动手前，先澄清单一问题再写计划）
- 技能创作：`skills/skill-creator/`（官方元技能；新增或改写 `skills/` 下任何 skill 时用它的格式与校验流程）
- 未安装备查：test-driven-development（待建单测基建）、docx/pptx/xlsx/pdf（办公文档场景）、mcp-builder（本环境无 MCP 客户端）、worktrees / subagent 系（单线开发，见上节）

## 自检

- 每个 UI 里程碑完成用 Playwright 截图自检；联网搜索一律 Firecrawl（key 在 `.env`）
- 框架文档实时查阅走 Context7 REST API（本环境无法挂 MCP 客户端，效果等价）：先 `GET https://context7.com/api/v1/search?query=<库名>` 取 library id，再 `GET https://context7.com/api/v1/<id>?topic=<主题>&tokens=1500` 拉最新文档；已验证 magicui/aceternity 的 registry 安装命令均为最新
