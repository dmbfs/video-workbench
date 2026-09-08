# M3a OpenAI 兼容视频 Provider（/v1/videos 契约）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans（AGENTS.md：主分支直提、inline）。

**Goal:** 新增 `openai-video` provider 类型，按「OpenAI 兼容异步视频」事实标准（`POST /v1/videos` → `GET /v1/videos/{id}` 轮询 → `/videos/{id}/content` 下载；LLMGateway/Sora 同契约）接入任意兼容网关；支持 `image` 首帧（接力）、`audio` 开关；视频下载带鉴权头。

**Architecture:** shared providerKind 枚举 + `"openai-video"`；server 新 `OpenAIVideoProvider`（JSON 创建、带 Auth 的 content 下载走 PollResult.downloadHeaders 新通道）；orchestrator resolveVideoRef 接受 downloadHeaders；settings 测试路由对 openai-video 走 `GET /models`；设置页 KIND_LABEL 与视频默认下拉纳入新类型。

**Tech Stack:** 沿用，零新依赖。

**Spec:** `.firecrawl/llmgw-video.md`（契约字段表：model/prompt/seconds/size/audio/image/last_frame/reference_*）；PRD §7.7。

## Global Constraints

- 创建失败若疑似 image 字段不被支持（400），自动降级为纯文生视频重试一次（首帧缺失仅影响接力，不阻塞）
- content 下载必须带 `Authorization: Bearer key`（网关签名 URL 除外）
- 真实生成冒烟目前不可行：用户网关所有视频模型 503 no_endpoints_available（上游未接，网关侧问题）；验收以契约实现 + `GET /models` 连通 + mock 全链路回归为准，待网关上游恢复后零改动可用

## Tasks

### Task 1: 适配器与后端接线
- [ ] shared：providerKindSchema 增 `"openai-video"`
- [ ] `providers/openai-video.ts`：createTask（POST /videos：model/prompt/seconds/size/audio/image→400 降级重试）、pollTask（GET /videos/{id}：queued/in_progress/completed/failed → videoRef=`{base}/videos/{id}/content` + downloadHeaders）、capabilities（30s/imageToVideo/audio）
- [ ] shared PollResult 增 `downloadHeaders?: Record<string,string>`；orchestrator resolveVideoRef 透传
- [ ] factory：openai-video 分支；settings.ts 测试路由：openai-video → GET {base}/models
- [ ] 验证：typecheck + 对用户网关跑 provider 测试（/models 200 即通过）；Commit `feat(server): openai-compatible video provider (/v1/videos)`

### Task 2: 前端 + E2E 回归
- [ ] SettingsPage KIND_LABEL 增「OpenAI 兼容（视频）」；视频默认下拉包含 openai-video
- [ ] `e2e.mjs`/`e2e-m2b.mjs` 回归（mock 链路不受影响）；设置页手测新类型连通测试显示「通了」
- [ ] RESEARCH.md 记录网关探测结论与契约来源；PRD §7.7 加一行；Commit `feat(web): openai-video kind ui; e2e regression`

## Self-Review
1. 需求覆盖：自定义 OpenAI 兼容视频模型（base_url/model_id/key 全配置化、契约标准）✓；首帧接力经 `image` 字段 ✓。
2. 类型一致：downloadHeaders 在 shared/orchestrator/adapter 三处一致。
3. 已知限制如实记录：网关上游冷 → 真实生成冒烟后置。
