# 运行时技能层（apps/server/src/skills）

用户给一段 prompt，技能链自动接力直至成片（PRD FR-12 / §7.8）。与仓库根 `skills/`（agent 开发技能）是两层概念，互不混用。

## 链路

```
用户 prompt
   │
   ▼
[1] prompt-enhance   一句话 → 拍摄 brief（主题/主体场景/风格关键词/节奏/负向）
   ▼
[2] storyboard       brief → 七要素结构化分镜（JSON 模式 + zod 自动纠错），自动采用落库
   ▼
[3] video-gen        逐段排队生成（编排器硬边界：轮询超时/调用上限/熔断/首尾帧接力全继承）
   ▼
[4] postfx-grade     选定质感预设（none/film/clean，配方 skills/video-postfx/SKILL.md）
   ▼
[5] stitch-export    归一化 → 质感滤镜 → concat/xfade → final.mp4
```

进度经 SSE 广播：`chain_progress` / `export_progress` / `final_ready` / `chain_done` / `chain_error`；里程碑与失败原因同步落为聊天消息。

## 契约一览

| 技能 | 输入 | 输出 | 失败语义 |
|---|---|---|---|
| prompt-enhance | `{prompt}` | `{brief}` | 模型不可用/空结果上抛，链终止 |
| storyboard | `{prompt, brief}` | `StoryboardProposal` | JSON 两次校验失败上抛 |
| video-gen | `projectId` | `{count}` | 任一段 failed 上抛（含段序+原因），链不自动重试付费任务 |
| postfx-grade | `postfx` | `{postfx}` | 未知预设上抛 |
| stitch-export | `{crossfadeMs, postfx}` | `{url, path}` | 无完成分段 / ffmpeg 失败上抛 |

## 设计约束

- **单一事实源**：storyboard 的 JSON 生成与提案落库、导出实现分别抽在 `shared.ts` / `stitch-export.ts`，路由与技能共用，禁止复制逻辑。
- **付费安全**：链层不做重试；逐段重试沿用编排器既有策略（NonRetryableError / 熔断 / 调用上限）。
- **可插拔**：新增管线技能（TTS 旁白、字幕烧录、BGM 混音）= 新增一个 `.ts` 技能文件 + chain.ts 插一行 + 本 README 登记契约。
