---
name: video-postfx
description: AI 生成视频的质感后处理配方库（ffmpeg 实测版）——调色/颗粒/晕影/锐化预设、选型指南与接入方式
version: 1.0.0
---

# Skill：视频质感后处理（video-postfx）

> 用途：为 vidstitch 生成/导出的视频做质感增强。所有滤镜链在本机 ffmpeg 实测通过，
> 已接入导出管线（`apps/server/src/stitch.ts` 的 `POSTFX_FILTERS`），本技能是配方依据与扩展指南。

## 何时用哪档

| 场景 | 预设 | 观感 |
|---|---|---|
| 风格 Prefix 含 cinematic / film / 胶片 / 复古 | `film` | 压对比、降饱和、动态颗粒、暗角——电影感 |
| 社媒直出、产品演示、明快画风 | `clean` | 微提对比饱和 + 轻锐化——清爽通透 |
| 模型出片已足够好 / 二次调色 | `none` | 原样，不做任何处理 |

预设由用户在导出面板选择（`exportSchema.postfx`），默认 `none`。

## 配方明细（实测通过）

```text
# film（胶片感）——顺序：eq → noise → vignette
eq=contrast=1.06:saturation=0.90,noise=alls=8:allf=t,vignette=angle=PI/5

# clean（清爽网感）——顺序：eq → unsharp
eq=contrast=1.05:saturation=1.10,unsharp=5:5:0.6:5:5:0.0
```

要点：
- 滤镜放在归一化链（scale/pad/fps）之后、`format=yuv420p` 之前；每段归一化时逐段应用，拼接后风格一致。
- `noise=alls=8:allf=t` 是时间抖动颗粒，掩饰 AI 生成的"过干净/蜡像感"；`alls≤10` 避免编码码率膨胀。
- `vignette=angle=PI/5` 是轻暗角；竖屏 9:16 下同样成立。
- `unsharp=5:5:0.6` 轻锐化，`0.6` 以上易出噪边，勿加码。

## 单测一条命令（不启动服务直接验证）

```bash
ffmpeg -y -i seg.mp4 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,\
eq=contrast=1.06:saturation=0.90,noise=alls=8:allf=t,vignette=angle=PI/5,format=yuv420p" \
-c:v libx264 -preset medium -crf 18 -c:a aac -ar 48000 -ac 2 -b:a 192k out_film.mp4
```

## 扩展新预设的步骤

1. 在 `stitch.ts` 的 `POSTFX_FILTERS` 加一条滤镜链，先按上面"单测一条命令"实测；
2. `packages/shared` 的 `exportSchema.postfx` 枚举与 `Postfx` 类型同步；
3. 前端 `WorkbenchPage` 的导出质感下拉补一项；
4. 本 SKILL.md 的表格与配方明细同步登记。
5. PRD §7.6 若涉及口径变化（如默认档）需同步。

## 相关生态（调研结论，暂不引入）

- 字幕烧录：`ggml-org/whisper.cpp`（MIT）转录 Seedance 原生音轨 → SRT → ffmpeg `subtitles` 滤镜；质感杠杆最大，需引入二进制+模型（约 80–150MB），待立项。
- 旁白 TTS：`rany2/edge-tts`（免费）或 MiniMax TTS REST（复用现有 provider key）；需新增音轨混音管线（`amix`/`sidechaincompress` ducking）。
- 超分/插帧：`k4yt3x/video2x`、RIFE（AGPL/重依赖 GPU）——项目已原生出 1080p，暂无必要；确需 4K 时作离线可选步骤。
- MCP：`MiniMax-AI/MiniMax-MCP` 与现有 provider 直连重复，不引入。
