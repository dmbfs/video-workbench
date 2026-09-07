# AGENTS.md — vidstitch 项目规则（项目级，补充全局 Agent.md）

## 项目事实源

- 产品需求与架构唯一事实源：`PRD.md`（当前 v1.0）；调研证据：`docs/RESEARCH.md` 与 `.firecrawl/`
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

## 自检

- 每个 UI 里程碑完成用 Playwright 截图自检；联网搜索一律 Firecrawl（key 在 `.env`）
