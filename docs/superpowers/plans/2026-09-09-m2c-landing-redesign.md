# M2c 落地页重设计（MotionSites）实施计划

> 日期：2026-09-09 · 依据：用户提供《Vidstitch UI/UX Redesign v1.1》delta spec + DESIGN.md v1.0 → v1.1 同步
> 用户已预审：四背景方案中选定「方案四 MotionSites 五层栈」，其余模块按可行性评估执行（用户原话：评估可行后修改）。

## 背景选型结论

- ✅ **方案四**：五层栈 = 流体光云 + 动能网格 + 流光 + 胶片噪点 + 暗角；吸收方案三的克制（网格/流光顶部 mask 渐隐），弃方案二（WebGL 与本地 ffmpeg/推理抢 GPU、依赖冲突）。
- 适配：噪点层复用全局 `body::before` 不重复；令牌按 spec 更新（#09090B / #121215 / border .10）；环境层动效豁免红线⑦并尊重 `prefers-reduced-motion`。

## 任务清单（每任务一提交）

1. `feat(web)` 令牌更新（--background #09090B、--card #121215、--border .10）+ 新建 `MotionBackground` 五层栈组件接入 LandingPage
2. `feat(web)` Navbar 重构：fixed h-16 + Lock 徽章「本地运行 · Key 自理」+ 渐变 V 圆角标 + 进入工作台
3. `feat(web)` Hero 7:5 重构：左（Sparkles 徽章 / 渐变 H1 / CTA group-hover 位移 / font-mono 信任行），右（MacOS 点 + Vanish Input + Shot #01/#02 分镜 Mockup + 38s 微状态）
4. `feat(web)` Bento 12 列 8/4+6/6 微 UI：0 Tokens Spent 标 / Key 掩码控制台（AES-256·LOCAL）/ #02 翻车重跑此段 / Clip A+B 拼接
5. `feat(web)` 成本确认弹窗：N 段 × 1 次/段 = 烧 N 额度 三栏算盘 + 禁用态 + 失败退回微文案；接「生成全部」流程（PRD FR-9）。⚠️ 余额 42−3=39 需本地额度记账功能，PRD 无此范围，本轮不做，已向用户标记
6. `docs` DESIGN.md 升 v1.1：令牌 delta、背景五层栈规范、环境层动效豁免、成本弹窗映射更新
7. `chore` Playwright 截图自检（红线 §2 清单 + §8 噪点/对比度抽查）→ screenshots/m2c-*.png

## 验收

- 红线①–⑦ 逐条过；噪点 200% 可见、100% 不脏；网格 12% 透明度若脏则降档
- E2E：landing → /app → 加分镜 → 生成弹窗算盘数据正确 → mock 全链路不回归
