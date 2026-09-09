# M4 Loop Guards（生成循环硬边界）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers/executing-plans（AGENTS.md：主分支直提、inline）。

**Goal:** 给生成编排循环补上三个硬边界——轮询超时、单项目调用预算、连续失败熔断——避免 provider 挂起时无限等待、故障时成倍烧额度、队列空转。

**Architecture:** 改动全部收敛在 `apps/server`。`db.ts` 新增 `generation_calls` 记账表；新增 `config.ts` 集中读取 `VIDSTITCH_*` 环境变量；`orchestrator.ts` 在 createTask 前查预算、成功后记账，轮询加 deadline，终态失败累计连续失败数并在达阈值时清空该项目排队段；`routes/projects.ts` 详情与 generate-all 回传用量。

**Tech Stack:** 沿用 Fastify + better-sqlite3 + tsx，无新依赖。

**Spec:** PRD §6 非功能需求（本次新增硬边界条目）与 §10 风险与对策；`.firecrawl/` 无相关证据。

## Global Constraints

- 默认值：轮询超时 10 分钟、单项目调用上限 30 次、连续失败熔断阈值 3 段；均可用 `VIDSTITCH_*` 环境变量覆盖
- 超时/超预算为不可重试失败（避免重复创建付费任务）；网络/HTTP 错误仍按现有 ≤3 次退避重试
- 手动重新生成（enqueue）视为重置该项目的熔断状态
- 不新增前端依赖；详情接口只做增量字段
- Mock 全链路 E2E 必须保持 PASS

---

## Task 1: 轮询 deadline（停止条件）

- [x] `apps/server/src/config.ts`：新增 `POLL_INTERVAL_MS` / `POLL_TIMEOUT_MS` 环境变量读取
- [x] `orchestrator.ts`：`for(;;)` 改为带 deadline 的轮询；超时抛不可重试错误
- [x] 验证：`pnpm --filter @vidstitch/server typecheck`
- [x] Commit `b2b077e feat(server): poll deadline for video generation`

## Task 2: 单项目调用预算

- [x] `db.ts`：新增 `generation_calls` 表 + project 索引
- [x] `config.ts`：新增 `MAX_CALLS_PER_PROJECT`
- [x] `orchestrator.ts`：createTask 前查预算（超限直接终态失败）、成功后记账
- [x] `routes/projects.ts`：删除项目时清理记账；详情与 generate-all 回传 `calls`/`maxCalls`
- [x] 验证：typecheck
- [x] Commit `addf9e2 feat(server): per-project generation call budget`

## Task 3: 连续失败熔断

- [x] `config.ts`：新增 `BREAKER_FAILURE_THRESHOLD`
- [x] `orchestrator.ts`：终态失败累计、成功清零、达阈值清空该项目队列并标记失败；enqueue 重置熔断
- [x] 验证：typecheck
- [x] Commit `0b98afd feat(server): circuit breaker for consecutive generation failures`
- [x] 补 `c39b312 fix(server): settle in-flight segment when breaker trips`（验收脚本发现重试中的段会停在 generating）

## Task 4: 验收与文档

- [x] 目标验证脚本（临时）：cap=2 时第 3 段被预算拦截；threshold=1 + 坏 provider 时队列被熔断；poll timeout=1s 时超时失败且只计 1 次调用 —— 三项 PASS
- [x] API 全链路回归：3 段 mock 生成 + 导出 final.mp4 = 30.04s
- [x] Playwright 全链路：E2E PASS · final.mp4 = 30.0s
  - 注：`scripts/e2e.mjs` 因 FR-9 成本确认弹窗已过时，补一行确认点击（`febba78`）
- [x] PRD §6/§10 补条目；AGENTS.md 同步一句
- [x] 删除临时脚本
- [x] Commit `docs: record generation loop guards`

## Self-Review

1. 需求覆盖：轮询超时 ✓、预算 ✓、熔断 ✓、用量可见 ✓
2. 计费安全：不可重试路径不再 createTask；预算按已成功创建的任务计数
3. 回归风险：默认值对现有 mock/真机流程无影响；E2E 以 mock 默认跑
