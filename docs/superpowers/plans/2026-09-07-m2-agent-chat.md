# M2 Agent 对话（分镜顾问）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans（沿用 AGENTS.md：主分支直提、无 worktree、inline 执行）。

**Goal:** 工作台内与「分镜顾问 Agent」对话澄清需求，一键产出结构化分镜脚本（JSON），用户预览并「采用到时间线」后写入分镜卡片——流程 A 全通；同时兼容用户已填的真实 OpenAI 兼容模型与 mock 对话模型。

**Architecture:** server 新增 ChatProvider（openai 流式 + mock 脚本化）与聊天路由（SSE 转发、历史落库）；分镜产出走独立 propose 路由（JSON 模式 + zod 校验 + 失败自动重问一次）+ apply 路由（校验后替换时间线段落）；前端工作台改两栏（左对话窗/右分镜），SSE 增量渲染。

**Tech Stack:** 沿用 M1 栈；新增依赖 0（fetch 原生流式解析）。

**Spec:** `PRD.md` FR-2/FR-8、§7.3 七要素模板、§9 M2 验收；`docs/DESIGN.md` §4/§6。

## Global Constraints

- 对话历史、分镜提案全部落库（chat_messages 表 M1 已建）
- key 永不出后端；chat 请求由 server 代理
- 分镜提案必须过 zod（1–6 段、单段 4–30s、总时长 ≤60s）才能被采用
- UI 红线与文案军规继续生效；两栏布局左对齐
- mock 对话模型能走通全流程（无 key 验收）；真实模型冒烟在用户填 key 后做

## File Structure

```
packages/shared/src/index.ts        # +chatMessageSchema +sse 新事件 +storyboardProposalSchema
apps/server/src/
  providers/chat-types.ts           # ChatProvider 接口
  providers/chat-openai.ts          # OpenAI 兼容流式
  providers/chat-mock.ts            # 脚本化流式（可演示全流程）
  providers/chat-factory.ts
  agent/prompt.ts                   # 分镜顾问系统提示词（七要素+澄清规则+JSON 协议）
  routes/chat.ts                    # GET messages / POST chat(SSE)
  routes/storyboard.ts              # POST propose / POST apply
  index.ts                          # 注册新路由
apps/web/src/
  components/ChatPanel.tsx          # 对话窗（气泡+SSE 流式+输入框）
  components/StoryboardProposal.tsx # 提案预览卡（采用/丢弃）
  pages/WorkbenchPage.tsx           # 改两栏布局，嵌 ChatPanel
scripts/e2e-m2.mjs                  # mock 全链路 E2E
```

---

### Task 1: shared 类型 + ChatProvider + chat 路由

**Files:** Modify `packages/shared/src/index.ts`；Create `chat-types.ts, chat-openai.ts, chat-mock.ts, chat-factory.ts, routes/chat.ts`；Modify `index.ts`（挂载）

**Interfaces (Produces):** `interface ChatProvider { stream(messages: ChatMsg[], opts?: { json?: boolean }): AsyncIterable<string> }`；路由 `GET /api/projects/:id/messages`、`POST /api/projects/:id/chat {message}`（SSE: `chat_delta*` → `chat_done`）。SSE 新事件：`{type:"chat_delta",text}`、`{type:"chat_done",messageId}`、`{type:"storyboard_proposed",storyboard}`。

- [ ] **Step 1: shared 增量**（追加到 `index.ts`）

```ts
export const chatRoleSchema = z.enum(["user", "assistant", "system"]);
export const chatMessageSchema = z.object({
  id: z.string(), projectId: z.string(), role: chatRoleSchema,
  content: z.string(), createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const storyboardProposalSchema = z.object({
  title: z.string().min(1).max(30),
  ratio: ratioSchema,
  withAudio: z.boolean(),
  stylePrefix: z.string().min(1),
  segments: z.array(z.object({
    prompt: z.string().min(10),
    duration: z.number().int().min(4).max(30),
    transitionOut: transitionSchema.default("cut"),
  })).min(1).max(6),
}).refine((s) => s.segments.reduce((a, x) => a + x.duration, 0) <= 60, { message: "总时长超过 60s" });
export type StoryboardProposal = z.infer<typeof storyboardProposalSchema>;
```

同时给 `sseEventSchema` 判别联合追加三个成员：`chat_delta`/`chat_done`/`storyboard_proposed`。

- [ ] **Step 2: `chat-types.ts`**

```ts
export interface ChatMsg { role: "user" | "assistant" | "system"; content: string }
export interface ChatProvider {
  kind: string;
  stream(messages: ChatMsg[], opts?: { json?: boolean }): AsyncIterable<string>;
}
```

- [ ] **Step 3: `chat-openai.ts`**（fetch 流式解析 SSE 行）

```ts
import type { ChatProvider, ChatMsg } from "./chat-types.js";
import type { ProviderConfig } from "@vidstitch/shared";

export class OpenAIChatProvider implements ChatProvider {
  kind = "openai-compatible";
  constructor(private cfg: ProviderConfig) {}
  async *stream(messages: ChatMsg[], opts?: { json?: boolean }): AsyncIterable<string> {
    const r = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({
        model: this.cfg.modelId, messages, stream: true,
        ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!r.ok || !r.body) throw new Error(`chat ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop()!;
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const j = JSON.parse(payload);
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) yield delta as string;
        } catch { /* 忽略非 JSON 行（keep-alive 等） */ }
      }
    }
  }
}
```

- [ ] **Step 4: `chat-mock.ts`**（脚本化：普通轮回复 1 句；json 请求回合法分镜 JSON，逐字 yield）

```ts
import type { ChatProvider, ChatMsg } from "./chat-types.js";

const PROPOSAL = {
  title: "城市日落三十秒",
  ratio: "16:9", withAudio: true,
  stylePrefix: "cinematic, warm golden hour, 35mm film, shallow depth of field",
  segments: [
    { prompt: "主体：航拍无人机。动作：掠过跨海大桥。场景：日落金色余晖。运镜：侧飞推进。风格氛围：暖调胶片。音频：海浪与风声。负向：无文字水印", duration: 10, transitionOut: "cut" },
    { prompt: "主体：街角咖啡店顾客。动作：举杯剪影。场景：暖光窗边。运镜：缓慢推近。风格氛围：暖黄。音频：店内低语与杯碟声。负向：无文字水印", duration: 10, transitionOut: "cut" },
    { prompt: "主体：霓虹街景。动作：人流延时。场景：夜幕降临。运镜：固定机位。风格氛围：霓虹冷暖对比。音频：城市夜声。负向：无文字水印", duration: 10, transitionOut: "cut" },
  ],
};

export class MockChatProvider implements ChatProvider {
  kind = "mock";
  async *stream(messages: ChatMsg[], opts?: { json?: boolean }): AsyncIterable<string> {
    const last = messages[messages.length - 1]?.content ?? "";
    let full: string;
    if (opts?.json) full = JSON.stringify(PROPOSAL);
    else if (/分镜|脚本|方案/.test(last)) full = "信息够了，我来生成完整分镜——点下面的「生成完整分镜」就能看到结构化脚本。";
    else full = `收到：「${last.slice(0, 24)}…」。主体/场景/时长/画幅都齐了吗？缺什么直接说，齐了就让我出分镜。`;
    for (const ch of full) { yield ch; await new Promise((r) => setTimeout(r, 8)); }
  }
}
```

- [ ] **Step 5: `chat-factory.ts`** + `routes/chat.ts`

factory：`getChatProvider(cfg)` 同 video factory 模式（openai-compatible→OpenAIChatProvider，mock→MockChatProvider）。

`routes/chat.ts`：

```ts
import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { newId, getSettings } from "../settings.js";
import { getChatProvider } from "../providers/chat-factory.js";
import { addClient, broadcast } from "../sse.js"; // addClient 复用；此路由自己 hijack
import { SYSTEM_PROMPT } from "../agent/prompt.js";
import type { ChatMsg } from "../providers/chat-types.js";

export async function chatRoutes(app: FastifyInstance) {
  app.get("/api/projects/:id/messages", async (req) => {
    const rows = db.prepare("SELECT * FROM chat_messages WHERE project_id=? ORDER BY created_at").all((req.params as any).id) as any[];
    return rows.map((r) => ({ id: r.id, projectId: r.project_id, role: r.role, content: r.content, createdAt: r.created_at }));
  });

  app.post("/api/projects/:id/chat", async (req, reply) => {
    const { id } = req.params as any;
    const { message } = req.body as { message: string };
    const settings = getSettings();
    const cfg = settings.providers.find((p) => p.id === settings.chatDefaultId)
      ?? settings.providers.find((p) => p.kind === "mock")!;
    const provider = getChatProvider(cfg);

    const now = new Date().toISOString();
    db.prepare("INSERT INTO chat_messages(id,project_id,role,content,created_at) VALUES(?,?,?,?,?)")
      .run(newId(), id, "user", message, now);
    const history = (db.prepare("SELECT role, content FROM chat_messages WHERE project_id=? ORDER BY created_at").all(id) as any[])
      .map((r) => ({ role: r.role as ChatMsg["role"], content: r.content }));
    const messages: ChatMsg[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

    reply.hijack();
    reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    let full = ""; const mid = newId();
    try {
      for await (const delta of provider.stream(messages)) {
        full += delta;
        reply.raw.write(`data: ${JSON.stringify({ type: "chat_delta", text: delta })}\n\n`);
      }
      db.prepare("INSERT INTO chat_messages(id,project_id,role,content,created_at) VALUES(?,?,?,?,?)")
        .run(mid, id, "assistant", full, new Date().toISOString());
      reply.raw.write(`data: ${JSON.stringify({ type: "chat_done", messageId: mid })}\n\n`);
    } catch (e) {
      reply.raw.write(`data: ${JSON.stringify({ type: "chat_delta", text: `\n\n[出错了：${(e as Error).message.slice(0, 120)}]` })}\n\n`);
      reply.raw.write(`data: ${JSON.stringify({ type: "chat_done", messageId: "" })}\n\n`);
    }
    return reply;
  });
}
```

- [ ] **Step 6: 验证** typecheck 过；`curl -N -X POST :8787/api/projects/<id>/chat -d '{"message":"想要30秒城市日落"}'` 看到 chat_delta 流。

- [ ] **Step 7: Commit** `feat(server): chat providers, sse chat route, history`

---

### Task 2: 分镜顾问提示词 + propose/apply 路由

**Files:** Create `agent/prompt.ts`、`routes/storyboard.ts`；Modify `index.ts`

**Interfaces (Produces):** `POST /api/projects/:id/storyboard/propose` → `{storyboard}`（校验合法）；`POST /api/projects/:id/storyboard/apply` body=StoryboardProposal → `{segments:[...]}`（替换现有全部段并广播 `project_updated` 语义的 SSE——复用 `segment_status` 不够，新增 `timeline_replaced` 事件进 sseEventSchema）。

- [ ] **Step 1: `agent/prompt.ts`**（质量核心，融合 Veo 解剖学 + H3 示例风格 + Seedance JSON 结构；七要素模板；澄清上限 3 问；JSON 协议）

```ts
export const SYSTEM_PROMPT = `你是「分镜顾问」，帮用户把模糊想法变成 AI 视频的分镜脚本。

## 对话规则
- 说人话，口语化，一次最多问 3 个关键问题：主体是谁/在哪干什么、什么风格、总时长和画幅（默认 30 秒、16:9，用户没说就按默认，不追问）。
- 用户信息够用时主动提议："我可以直接生成完整分镜了"。

## 生成规则（用户要求生成分镜时）
1. 只输出一个 JSON 对象，不要输出任何其他文字或 markdown 代码块标记。
2. 每段 prompt 必须按七要素组织：主体 / 动作 / 场景 / 运镜（角度+运动）/ 视觉风格与氛围 / 音频 / 负向约束，风格统一以 stylePrefix 为基础。
3. 相邻段之间必须可衔接：后一段的开场画面要能从前一段的收尾自然接续（首尾帧接力）。
4. 单段时长 4–30 秒整数，总时长 ≤60 秒，段数 1–6。

## JSON 结构
{"title":"≤30字","ratio":"16:9"|"9:16","withAudio":true|false,
 "stylePrefix":"全局风格短语(英文,逗号分隔)",
 "segments":[{"prompt":"七要素中文描述，末尾附 Negative: 负向约束(英文)","duration":10,"transitionOut":"cut"}]}`;
```

- [ ] **Step 2: `routes/storyboard.ts`**

```ts
import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { newId, getSettings } from "../settings.js";
import { getChatProvider } from "../providers/chat-factory.js";
import { SYSTEM_PROMPT } from "../agent/prompt.js";
import { storyboardProposalSchema, type StoryboardProposal } from "@vidstitch/shared";
import { broadcast } from "../sse.js";

export async function storyboardRoutes(app: FastifyInstance) {
  app.post("/api/projects/:id/storyboard/propose", async (req) => {
    const { id } = req.params as any;
    const settings = getSettings();
    const cfg = settings.providers.find((p) => p.id === settings.chatDefaultId)
      ?? settings.providers.find((p) => p.kind === "mock")!;
    const provider = getChatProvider(cfg);
    const history = (db.prepare("SELECT role, content FROM chat_messages WHERE project_id=? ORDER BY created_at").all(id) as any[])
      .map((r) => ({ role: r.role, content: r.content }));
    const messages = [{ role: "system" as const, content: SYSTEM_PROMPT }, ...history,
      { role: "user" as const, content: "信息已经够了，现在生成完整分镜，只输出 JSON。" }];

    for (let attempt = 0; attempt < 2; attempt++) {
      let raw = "";
      for await (const d of provider.stream(messages, { json: attempt === 0 })) raw += d;
      raw = raw.replace(/```json?|```/g, "").trim();
      const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
      try {
        const proposal = storyboardProposalSchema.parse(JSON.parse(raw.slice(start, end + 1)));
        const now = new Date().toISOString();
        db.prepare("INSERT INTO chat_messages(id,project_id,role,content,created_at) VALUES(?,?,?,?,?)")
          .run(newId(), id, "assistant", "分镜脚本已生成，请在右侧预览采用。", now);
        broadcast({ type: "storyboard_proposed", storyboard: proposal } as any, id);
        return { storyboard: proposal };
      } catch (e) {
        if (attempt === 1) throw new Error(`分镜 JSON 校验失败：${(e as Error).message.slice(0, 200)}`);
        messages.push({ role: "assistant", content: raw.slice(0, 400) },
          { role: "user", content: `JSON 不合法：${(e as Error).message.slice(0, 300)}。请严格按结构重新只输出 JSON。` });
      }
    }
  });

  app.post("/api/projects/:id/storyboard/apply", async (req) => {
    const { id } = req.params as any;
    const sb = storyboardProposalSchema.parse(req.body);
    db.prepare("DELETE FROM segments WHERE project_id=?").run(id);
    const ins = db.prepare("INSERT INTO segments(id,project_id,idx,prompt,duration,transition_out) VALUES(?,?,?,?,?,?)");
    const out = sb.segments.map((s, i) => {
      const sid = newId(); ins.run(sid, id, i + 1, s.prompt, s.duration, s.transitionOut);
      return { id: sid, projectId: id, idx: i + 1, prompt: s.prompt, duration: s.duration,
        transitionOut: s.transitionOut, status: "pending" };
    });
    db.prepare("UPDATE storyboards SET title=?, ratio=?, with_audio=?, style_prefix=?, confirmed_at=? WHERE project_id=?")
      .run(sb.title, sb.ratio, sb.withAudio ? 1 : 0, sb.stylePrefix, new Date().toISOString(), id);
    db.prepare("UPDATE projects SET title=?, ratio=?, updated_at=? WHERE id=?")
      .run(sb.title, sb.ratio, new Date().toISOString(), id);
    broadcast({ type: "timeline_replaced", projectId: id } as any, id);
    return { segments: out };
  });
}
```

sseEventSchema 同步追加 `timeline_replaced`。`index.ts` 注册 chatRoutes + storyboardRoutes。

- [ ] **Step 3: 验证** mock 模型下 curl propose → 返回合法 JSON；apply → segments 3 行。
- [ ] **Step 4: Commit** `feat(server): storyboard advisor prompt, propose/apply with zod guard`

---

### Task 3: 前端对话窗 + 提案采用

**Files:** Create `components/ChatPanel.tsx`、`components/StoryboardProposal.tsx`；Modify `WorkbenchPage.tsx`（两栏）

**要点（红线适用）**
- 两栏：左 `w-[380px] shrink-0 border-r border-border` 对话窗（消息气泡：用户右橙底、助手左卡片底，流式光标 `▍` 用 CSS blink，禁 ease-in-out），底部输入框+发送；右栏保留原 提示词条/分镜/操作条。
- ChatPanel：载入历史 GET messages；POST chat 后按 SSE `chat_delta` 追加临时助手消息，`chat_done` 固化。自动滚底。
- 顶栏按钮「生成完整分镜」→ 调 propose → 右栏浮出 `StoryboardProposal` 预览卡（标题/画幅/总时长/N 段列表）→「采用到时间线」调 apply（若已有段落，按钮文案变「替换现有 N 段并采用」）→ 成功后 `timeline_replaced`/手动 load 刷新分镜，预览卡收起。
- 事件流：WorkbenchPage 现有 subscribeEvents 扩展处理 `storyboard_proposed`（打开预览卡）与 `timeline_replaced`（load()）。

- [ ] **Step 1: 实现三文件**（完整代码按上述要点写，禁占位符）
- [ ] **Step 2: `pnpm -C apps/web build` 过 + dev 手测 mock 对话全流程**
- [ ] **Step 3: Commit** `feat(web): chat panel + storyboard proposal apply`

---

### Task 4: E2E + 真实模型冒烟

**Files:** Create `scripts/e2e-m2.mjs`

- [ ] **Step 1: mock E2E**：M1 流程之外新增——对话窗输入"想要30秒城市日落宣传片"→发送→等助手回复；点「生成完整分镜」→预览卡出现→「采用到时间线」→3 张分镜卡出现→生成→导出→ffprobe 30s。截图 `m2-01-chat.png`、`m2-02-proposal.png`、`m2-03-applied.png`。
- [ ] **Step 2: 真实模型冒烟**（用户填 key 且 `apiKeySet` 为真时执行）：propose 一次真实请求，校验返回 JSON 合法；把真实调用次数与耗时打出来（预计 1–2 次 LLM 调用，无视频生成费用）。
- [ ] **Step 3: Commit** `test(e2e): m2 chat full-chain` + `docs: mark M2 done`

## Self-Review 记录

1. Spec 覆盖：FR-2（SSE 流式/顾问人设/JSON+zod/失败重问）↔ T1/T2；FR-8 历史 ↔ chat_messages；§9 M2 验收 ↔ T4。
2. 占位符：T3 为要点级+完整实现约束（同 M1 执行惯例）。
3. 类型一致：`ChatMsg`、`StoryboardProposal`、SSE 新事件在 T1/T2/T3 间签名一致；`timeline_replaced` 已列入 sseEventSchema。
