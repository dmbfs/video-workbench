# M3b TokenDance Seedance Provider（原生协议）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers/executing-plans（AGENTS.md：主分支直提、inline）。

**Goal:** 修正 M3a 的契约误判：TokenDance 网关并没有「上游冷」，而是 M3a 用的 OpenAI 兼容视频契约（`/v1/videos`、`/v1/video/generations`）在 TokenDance 上不存在。按 TokenDance 原生 Seedance 协议接入，让真实出片在应用内跑通。

**证据（2026-09-09 实抓）:**

- `POST https://tokendance.space/gateway/v1/videos` → 404；`POST /gateway/v1/video/generations` → `503 no_endpoints_available`（M3a 误判来源，该路由不在 TokenDance 协议目录内）。
- `GET /gateway/v1/models`：20 个视频模型只声明原生协议（`seedance:generations` / `minimax:video_generation_v2` / `kling:*` / `wan3:video-synthesis` / `happyhorse:video-synthesis`），无 `openai:video-*`。
- `POST /gateway/ark/v3/generations/tasks`（model=`seedance-2.5`）→ 200 `cgt-20260909160300-74wff`，轮询 `succeeded`，下载得 1280x720 / 5.04s / h264 真实 mp4。
- 余额查询 `/portal/api/v1/user/balance` → 169.76 元，充足；此前 402 `insufficient_quota` 只因探测用了 `duration=999` 触发预扣估算。

**Architecture:** shared `providerKindSchema` 增 `"tokendance-seedance"`；server 新 `TokenDanceSeedanceProvider`（`POST {base}/v3/generations/tasks` + `GET .../{id}`，base 默认 `https://tokendance.space/gateway/ark`；首帧存在时 `ratio:"adaptive"` + `role:"first_frame"`，否则用请求画幅；`generate_audio` 透传）；factory / 设置连通测试 / 设置页下拉接线；DB 默认视频 provider 指向它；`e2e.mjs` 补 mock 默认切换（与 e2e-m2/m2b 同款，避免真机计费）。

**Tech Stack:** 沿用，零新依赖。

**Spec:** `.firecrawl/` 无 Seedance 网关协议证据，以线上文档 `https://tokendance.space/docs/protocol-seedance-generations.md` 与 `seedance-generations.md` 为准（本轮已抓取核对）。

## Global Constraints

- 单段时长 4–30s（Seedance 2.5），`resolution` 固定 `720p`（MVP）
- 首帧/首尾帧任务 `ratio` 必须 `adaptive`；纯文生视频必须传明确画幅
- 生成产物 URL 24h 有效，orchestrator 立即下载落地，符合现有流程
- 不动 M3a 的 `openai-video`（仍是通用 Sora 风格网关适配器）

## Tasks

### Task 1: 适配器与后端接线
- [x] shared：`providerKindSchema` 增 `"tokendance-seedance"`
- [x] `providers/tokendance-seedance.ts`：createTask / pollTask（`content.video_url`，状态 queued/running/succeeded/failed）/ capabilities（30s, i2v, audio）
- [x] factory 分支；settings 测试路由走 `/portal/api/v1/user/balance` 验 key
- [x] 验证：`pnpm --filter @vidstitch/server typecheck`；真实 T2V 5s 冒烟经 provider 类跑通并 ffprobe 断言

### Task 2: 前端 + 默认配置 + 回归
- [x] SettingsPage：KIND_LABEL 增「TokenDance Seedance（视频）」、视频默认下拉纳入
- [x] DB settings：新增 `td-seedance` provider（base `https://tokendance.space/gateway/ark`、model `seedance-2.5`、沿用已有 key），`videoDefaultId` 指向它
- [x] `scripts/e2e.mjs` 补 mock 默认切换 + 结束恢复（对齐 e2e-m2/m2b，避免真机计费）
- [x] 真实链路验收：API 建项目 → 加 4s 段 → 生成 → 段 mp4 落地 + ffprobe；`pnpm e2e` mock 回归
- [x] 文档：RESEARCH.md §7 更正、PRD §7.7 增行、本计划勾选

## Self-Review

1. 需求覆盖：TokenDance 真实出片 ✓（原生协议 + 应用内默认 provider）
2. 类型一致：kind 在 shared / factory / settings 测试 / 前端四处一致
3. 已知限制：本轮只接 Seedance（产品主模型）；MiniMax H3 走 `/gateway/minimax/v2/*`，现有 `MiniMaxProvider` 路径可复用但参数（`ratio` 必填、`image_url` 对象）需另开任务；I2V 首帧接力以代码 + 单测为准，真机 I2V 冒烟按需再做
