# M2b 前端体验升级（首页 + 动效 + Aceternity/Magic UI）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans（AGENTS.md：主分支直提、inline）。

**Goal:** 补上首页落地页；工作台/设置页按 DESIGN.md 引入 Aceternity UI 与 Magic UI 组件和编排式动效；react-router 多页化（`/` 首页、`/app` 工作台、`/settings` 设置）。

**Architecture:** 引入 react-router-dom 与 motion(framer-motion)；Aceternity/Magic UI 组件优先用 `npx shadcn@latest add @aceternity/<name>` / `@magicui/<name>` registry 安装，失败则从两家 API/registry JSON 拉源码落 `src/components/{aceternity,magicui}/`（next/image 一律换 `<img>`）。

**Tech Stack:** + react-router-dom 7 · motion 12。其余沿用。

**Spec:** `docs/DESIGN.md`（红线/令牌/文案军规不变，Hero 允许但禁"Hero+三卡片"与完美居中）；`PRD.md` §6 文案军规。

## Global Constraints

- 红线 7 条继续生效（无紫、非纯平、无 Hero+三卡片、非完美居中、文案军规、无 emoji 图标、禁 ease-in-out——spring/expo-out 专用）
- 动效原则：首屏一次编排 stagger 胜过零散微交互；交互动效 spring(stiffness 300, damping 28)
- registry 安装失败的组件一律手工落源码，不阻塞
- e2e 选择器同步改造（路由化后 M1/M2 脚本导航步骤更新）

## File Structure

```
apps/web/src/
  main.tsx                    # + BrowserRouter
  App.tsx                     # 路由壳：/ → Landing，/app → 应用壳(侧栏+工作台)，/settings → 应用壳+设置
  components/
    aceternity/{spotlight-new,vanish-input,bento-grid,glowing-effect,card-spotlight,tabs}.tsx
    magicui/{shimmer-button,border-beam,dot-pattern,blur-fade,word-rotate,number-ticker}.tsx
    landing/{Nav,Hero,FeatureBento,FlowSteps,Footer}.tsx
  pages/LandingPage.tsx
scripts/e2e-m2b.mjs           # 首页→工作台全链路 + 截图
```

## 组件映射（安装方式标明）

| 位置 | 组件 | 来源 |
|---|---|---|
| 首页 Hero 背景 | Spotlight New + Dot Pattern | Aceternity / Magic UI |
| 首页 Hero 输入演示 | Placeholders & Vanish Input（占位词轮播=产品场景句） | Aceternity |
| Hero 副标题 | Word Rotate（"30 秒产品宣传片/竖屏剧情短视频/口播带字幕"） | Magic UI |
| 首页数字 | Number Ticker（"5–60s 可调 / 并发 2 / 全程本机"） | Magic UI |
| 特性区 | Bento Grid（2×2 不对称，非"三卡片"） | Aceternity |
| 流程区卡边框 | Border Beam（对话→分镜→成片三步） | Magic UI |
| 工作台生成中卡片 | Glowing Effect（替换现有 breathe CSS） | Aceternity |
| 工作台分镜卡 hover | Card Spotlight | Aceternity |
| 生成全部/保存按钮 | Shimmer Button | Magic UI |
| 提案卡/路由切换 | Blur Fade + AnimatePresence | Magic UI / motion |
| 工作台顶 Tabs | Aceternity Tabs（背景滑动） | Aceternity |

## Tasks

### Task 1: 路由化 + registry 组件落地
- [x] 装 react-router-dom + motion；main.tsx 挂 BrowserRouter
- [x] App.tsx 改路由壳：`/` Landing（无侧栏）；`/app`、`/settings` 共用应用壳（现侧栏+Tabs 改为路由驱动的 Aceternity Tabs）
- [x] 按「组件映射」逐个 registry 安装；失败项从 API JSON 拉 files 落盘并改写 next/image
- [x] 验证：build 过 + `/` `/app` `/settings` 三路由可达；Commit `feat(web): router shell + aceternity/magicui components`

### Task 2: 首页落地页
- [x] Nav：玻璃拟态（backdrop-blur+噪点底），logo + 「进工作台」Shimmer Button
- [x] Hero 左文右"输入条演示"非对称布局：Spotlight+Dot Pattern 背景；标题「把一句话，变成一条能发的片」；Word Rotate 副标题；Vanish Input（点它跳 /app 并带入文本）
- [x] FeatureBento：4 格不对称 bento——「先聊再烧钱」「一段翻车不重来」「key 只存你电脑」「5–60s 自己定」，Number Ticker 点缀
- [x] FlowSteps：三步卡（对话→分镜→成片）Border Beam 循环；Footer 一行版权+文案「key 自己填，数据不出去」
- [x] 文案全部过 §6 军规；Commit `feat(web): landing page`

### Task 3: 工作台/设置动效升级
- [x] 生成中卡片换 Glowing Effect；分镜卡 hover Card Spotlight；「生成全部」「保存全部」换 Shimmer Button（loading 态保留）
- [x] 提案卡 Blur Fade 进出场；路由切换 AnimatePresence（fade+8px slide, expo-out）
- [x] 首进 /app 编排 stagger：侧栏→提示词条→分镜卡 40ms 递增（沿用 rise-in）
- [x] 验证：build + 手测；Commit `feat(web): app motion polish`

### Task 4: E2E + 截图验收
- [x] 新增 `e2e-m2b.mjs`：`/` 截图 → Vanish Input 输入跳转 `/app` → 走 M2 全链路（对话→提案→采用→生成→导出）→ 各状态截图 `m2b-*.png`
- [x] 更新 `e2e.mjs`/`e2e-m2.mjs` 的导航选择器（进入 /app 路由）
- [x] 红线逐条核对截图（视觉桥若仍故障则列清单交用户人工复核）
- [x] Commit `test(e2e): m2b landing + motion acceptance` + PRD 标记完成

## Self-Review 记录
1. 用户三条反馈全覆盖：首页(T2)、动效(T2/T3)、Aceternity+Magic UI(组件映射)。
2. 红线冲突自查：Hero 无三卡片、bento 为 2×2 不对称、布局非对称左倾。
3. 风险预置：registry 交互式 CLI 失败的兜底路径（API JSON 拉源码）已写入架构节。
