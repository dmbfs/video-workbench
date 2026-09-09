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

- [ ] `apps/server/src/config.ts`：新增 `POLL_INTERVAL_MS` / `POLL_TIMEOUT_MS` 环境变量读取
- [ ] `orchestrator.ts`：`for(;;)` 改为带 deadline 的轮询；超时抛不可重试错误
- [ ] 验证：`pnpm --filter @vidstitch/server typecheck`
- [ ] Commit `feat(server): poll deadline for video generation`

## Task 2: 单项目调用预算

- [ ] `db.ts`：新增 `generation_calls` 表 + project 索引
- [ ] `config.ts`：新增 `MAX_CALLS_PER_PROJECT`
- [ ] `orchestrator.ts`：createTask 前查预算（超限直接终态失败）、成功后记账
- [ ] `routes/projects.ts`：删除项目时清理记账；详情与 generate-all 回传 `calls`/`maxCalls`
- [ ] 验证：typecheck
- [ ] Commit `feat(server): per-project generation call budget`

## Task 3: 连续失败熔断

- [ ] `config.ts`：新增 `BREAKER_FAILURE_THRESHOLD`
- [ ] `orchestrator.ts`：终态失败累计、成功清零、达阈值清空该项目队列并标记失败；enqueue 重置熔断
- [ ] 验证：typecheck
- [ ] Commit `feat(server): circuit breaker for consecutive generation failures`

## Task 4: 验收与文档

- [ ] 目标验证脚本（临时）：cap=2 时第 3 段被预算拦截；threshold=1 + 坏 provider 时队列被熔断；poll timeout=1s 时超时失败且只计 1 次调用
- [ ] `pnpm e2e` mock 全链路 PASS
- [ ] PRD §6/§10 补条目；AGENTS.md 同步一句
- [ ] 删除临时脚本
- [ ] Commit `docs: record generation loop guards`

## Self-Review

1. 需求覆盖：轮询超时 ✓、预算 ✓、熔断 ✓、用量可见 ✓
2. 计费安全：不可重试路径不再 createTask；预算按已成功创建的任务计数
3. 回归风险：默认值对现有 mock/真机流程无影响；E2E 以 mock 默认跑
