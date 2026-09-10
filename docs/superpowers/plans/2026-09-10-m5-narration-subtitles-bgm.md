# M5 成片完整度三件套（TTS 旁白 → 字幕烧录 → BGM 混音）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers/executing-plans（AGENTS.md：主分支直提、inline）。M4 编号已被 loop-guards 占用，本里程碑顺延为 M5。

**Goal:** 让一键成片直出「可发布」的成片：AI 画面 + 口语化旁白 + 同步字幕 + BGM 混音。三者都是链上可插拔技能，旁白失败不致命（链继续，成片不含旁白）。

**证据（2026-09-10 实抓/实测）:**

- T2A v2 契约（`https://tokendance.space/docs/protocol-minimax-t2a-v2.md`，已抓 `data/_td-llms-full.txt` §2772）：`POST {minimax}/v1/t2a_v2`，body `{model, text, voice_setting:{voice_id,speed,vol,pitch}, audio_setting:{sample_rate,bitrate,format,channel}}`；响应 `data.audio`（hex）+ `extra_info.usage_characters`（计费口径）+ `extra_info.audio_length`（ms，免 ffprobe）。
- 零成本级实测探针：`minimax-speech-2.8-turbo` + `female-shaonv` → 200，hex mp3 45KB/2.7s，usage_characters=22。模型在网关实时目录（minimax-speech-2.8-{hd,turbo}）。
- `subtitle_enable:true` + `subtitle_type:"word"|"sentence"` 可随 TTS 直接返回带时间轴的字幕（M5b 用它，省掉 whisper.cpp 依赖）。
- 计费机制：TTS 按字符计费（用量级：一部 30s 成片旁白 ≈ 120 字，成本可忽略）；视频任务仍走预扣-退补。

**Architecture:** `providers/tts.ts` 新增 `TtsProvider` 接口 + `MiniMaxTtsProvider`（复用 minimax 视频 provider 的 origin/key，语音模型与音色可被 `VIDSTITCH_TTS_*` 覆盖）+ `MockTtsProvider`（ffmpeg 正弦波，e2e 零计费）；`skills/narration.ts` = 旁白稿（聊天 JSON 模式，字数按时长封顶）→ 逐段 TTS → 超时长 atempo 压缩 → `narration.json` + `narration/seg-XX.mp3`；`chain.ts` 在 video-gen 与 postfx-grade 之间插入非致命步骤；`stitch-export.ts` 导出时若存在旁白清单则按段起点（含 xfade 重叠修正）adelay+amix 混入，人声优先、原声压低、限幅防削波。M5b 字幕：TTS word 时间轴 + 段起点偏移 → ASS → subtitles 滤镜烧录（导出开关）。M5c BGM：项目级 bgm 上传 + 循环/音量/闪避混音。

**Tech Stack:** 沿用 Fastify + better-sqlite3 + ffmpeg-static，零新依赖。

**Spec:** PRD §7.8（技能链）扩展；`.firecrawl/` 无 T2A 证据，以线上文档为准（已核对）。

## Global Constraints

- 旁白失败 = 链继续（chatLog ⚠️ 说明），不得让已花钱的视频段作废
- 旁白音频超出段时长 → atempo 压速（≤1.4，超限截断加淡出），不改段时长
- 旁白起点 = 段起点累计 − xfade 重叠修正；硬切与叠化都要对齐
- e2e 必须零计费：mock chat 增旁白 JSON 分支，TTS 走 MockTts
- 不新增 npm 依赖；字幕/BGM 未落地前导出行为与现状完全一致（无旁白清单 = 不混音）

## Tasks

### Task 1 (M5a): TTS 旁白
- [x] `providers/tts.ts`：TtsProvider 接口 + MiniMaxTtsProvider（/v1/t2a_v2，hex 落盘，audio_length 取时长，atempo 适配）+ MockTtsProvider + pickTts()（minimax 视频 provider 复用 → 否则 mock）
- [x] `config.ts`：`VIDSTITCH_TTS_MODEL`（默认 minimax-speech-2.8-turbo）/ `VIDSTITCH_TTS_VOICE`（默认 female-shaonv）
- [x] `skills/shared.ts`：抽 `askJSON<T>()` 通用 JSON 问答（zod + 一次纠错重问），proposeStoryboardJSON 改为薄封装
- [x] `skills/narration.ts`：旁白稿生成（字数 ≤ 时长×4.5）+ 逐段 TTS + narration.json
- [x] `skills/chain.ts`：插入 narration 步（非致命：失败 ⚠️ chatLog 后继续）
- [x] `stitch.ts`：`mixNarration()`（adelay 对齐 + amix + 限幅；无原声时旁白独占音轨）；`stitch-export.ts` 检测 narration.json 自动混入
- [x] `chat-mock.ts`：json 请求含「旁白」时返回旁白 JSON（e2e 用）
- [x] `providers-contract.mjs`：+TTS 出站契约与 hex 解码断言；`e2e-auto.mjs`：+旁白产物与时长不变断言
- [x] 验证：tsc / providers-contract / e2e-auto / qa-check2 全绿
- [x] Commit `feat(narration)`

### Task 2 (M5b): 字幕烧录
- [ ] T2A `subtitle_enable:true, subtitle_type:"word"` 探针（一次极小成本）→ narration.json 增词级时间轴
- [ ] 段起点偏移 → 全局 ASS（字体/描边/安全区）→ 导出开关 `subtitle: boolean`
- [ ] e2e 断言字幕文件与烧录产物

### Task 3 (M5c): BGM 混音
- [ ] `POST /api/projects/:id/bgm` 上传（≤20MB，mp3/m4a/wav）落 `bgm{ext}`
- [ ] 导出混音：循环铺满 + 音量 0.18 + 旁白处闪避（sidechaincompress）+ 首尾淡入淡出
- [ ] Workbench 上传/清除入口

### Task 4: 文档
- [ ] PRD §7.8 链图增 narration（含非致命语义）；FR-13 旁白/字幕/BGM
- [ ] skills/README.md 契约表 +1 行；本计划勾选
