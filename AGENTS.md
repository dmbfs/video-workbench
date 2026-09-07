# AGENTS.md — vidstitch 项目规则（项目级，补充全局 Agent.md）

## 项目事实源

- 产品需求与架构唯一事实源：`PRD.md`（当前 v1.0）；视觉与交互规范：`docs/DESIGN.md`（UI 一律从其派生）；调研证据：`docs/RESEARCH.md` 与 `.firecrawl/`
- 里程碑与验收标准以 PRD §9 为准；PRD 变更须同步本文件与任务计划

## 仓库布局

- `skills/` — 已安装的 agent skills（superpowers、minimax-cli、remotion）
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
- 分镜脚本写作：不用通用技能；素材为 `.firecrawl/h3-prompt.md`（H3 官方示例库）、`.firecrawl/seedance-json-prompt.md`（Seedance JSON 字段结构）与 PRD §7.3 六要素模板；写系统提示词时可参考 Piebald-AI/claude-code-system-prompts（12.6k★）
- 流程纪律：`skills/superpowers/`（writing-plans / executing-plans，见上节）

## 自检

- 每个 UI 里程碑完成用 Playwright 截图自检；联网搜索一律 Firecrawl（key 在 `.env`）
- 框架文档实时查阅走 Context7 REST API（本环境无法挂 MCP 客户端，效果等价）：先 `GET https://context7.com/api/v1/search?query=<库名>` 取 library id，再 `GET https://context7.com/api/v1/<id>?topic=<主题>&tokens=1500` 拉最新文档；已验证 magicui/aceternity 的 registry 安装命令均为最新
