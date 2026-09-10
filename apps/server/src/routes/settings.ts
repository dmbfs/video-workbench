import type { FastifyInstance } from "fastify";
import { getSettings, saveSettings, toPublic, SettingsValidationError } from "../settings.js";
import { friendlyUpstreamError } from "../providers/upstream-error.js";
import { updateSettingsSchema } from "@vidstitch/shared";

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => toPublic(getSettings()));

  app.put("/api/settings", async (req, reply) => {
    try {
      const s = saveSettings(updateSettingsSchema.parse(req.body));
      return toPublic(s);
    } catch (e) {
      if (e instanceof SettingsValidationError) return reply.code(400).send({ error: e.message });
      throw e;
    }
  });

  app.post("/api/providers/:id/test", async (req) => {
    const p = getSettings().providers.find((x) => x.id === (req.params as any).id);
    if (!p) return { ok: false, error: "provider not found" };
    if (p.kind === "openai-compatible") {
      try {
        const r = await fetch(`${p.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}` },
          body: JSON.stringify({ model: p.modelId, messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
        });
        const bodyText = r.ok ? "" : await r.text().catch(() => "");
        return { ok: r.ok, status: r.status, error: r.ok ? undefined : friendlyUpstreamError(r.status, bodyText).message };
      } catch (e) {
        return { ok: false, error: (e as Error).message.slice(0, 200) };
      }
    }
    if (p.kind === "openai-video") {
      try {
        const r = await fetch(`${p.baseUrl}/models`, { headers: { Authorization: `Bearer ${p.apiKey}` } });
        const bodyText = r.ok ? "" : await r.text().catch(() => "");
        return { ok: r.ok, status: r.status, error: r.ok ? undefined : friendlyUpstreamError(r.status, bodyText).message };
      } catch (e) {
        return { ok: false, error: (e as Error).message.slice(0, 200) };
      }
    }
    if (p.kind === "tokendance-seedance") {
      // 验 key（余额接口） + 模型是否在实时目录里，不真的建任务（不花钱）
      try {
        const origin = new URL(p.baseUrl ?? "https://tokendance.space/gateway/ark").origin;
        const [bal, cat] = await Promise.all([
          fetch(`${origin}/portal/api/v1/user/balance`, { headers: { Authorization: `Bearer ${p.apiKey}` } }),
          fetch(`${origin}/gateway/v1/models`),
        ]);
        if (!bal.ok) {
          const bodyText = await bal.text().catch(() => "");
          return { ok: false, status: bal.status, error: friendlyUpstreamError(bal.status, bodyText).message };
        }
        const models = (await cat.json()) as { data?: { id?: string }[] };
        const found = (models.data ?? []).some((m) => m.id === p.modelId);
        return found ? { ok: true, status: bal.status } : { ok: false, error: `模型 ${p.modelId} 不在实时目录中` };
      } catch (e) {
        return { ok: false, error: (e as Error).message.slice(0, 200) };
      }
    }
    if (p.kind === "minimax") {
      // 免费校验，不真的建任务：
      // 1) TokenDance 域名下验 key（余额）+ 模型在实时目录中；
      // 2) 用「模型必拒的时长 3s」打创建接口——价格检查先于参数校验，故：
      //    路径错→404 / key 错→401 / resolution 无价目→「未配置该请求规格的价格」/
      //    一切正常→上游报 duration 3s 不支持（=契约探针通过）
      try {
        const base = p.baseUrl ?? "https://api.minimax.io";
        const origin = new URL(base).origin;
        if (/tokendance\.space$/i.test(new URL(origin).hostname)) {
          const bal = await fetch(`${origin}/portal/api/v1/user/balance`, { headers: { Authorization: `Bearer ${p.apiKey}` } });
          if (!bal.ok) {
            const bodyText = await bal.text().catch(() => "");
            return { ok: false, status: bal.status, error: friendlyUpstreamError(bal.status, bodyText).message };
          }
          const cat = await fetch(`${origin}/gateway/v1/models`);
          const models = (await cat.json()) as { data?: { id?: string }[] };
          if (!(models.data ?? []).some((m) => m.id === p.modelId)) {
            return { ok: false, error: `模型 ${p.modelId} 不在网关实时目录中（去 /models 页核对 ID 写法）` };
          }
        }
        const r = await fetch(`${base}/v2/video_generation`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}` },
          body: JSON.stringify({
            model: p.modelId, resolution: "768P", ratio: "16:9", duration: 3,
            content: [{ type: "text", text: "ping" }],
          }),
          signal: AbortSignal.timeout(30_000),
        });
        const bodyText = await r.text().catch(() => "");
        if (r.status === 404) return { ok: false, status: 404, error: "接口不存在（404）——Base URL 应填到协议根（如 https://tokendance.space/gateway/minimax）" };
        if (/未配置该请求规格的价格/.test(bodyText)) {
          return { ok: false, status: r.status, error: "该分辨率在网关无价目——核对模型 ID 与分辨率档位（H3-Max 仅 480P/768P）" };
        }
        if (!r.ok) {
          // 上游对 duration=3 的参数校验报错（"does not support duration … supported durations: …"）
          // = 路径/鉴权/价目全部通过，这正是探针想要的「通过」信号
          if (/does not support duration|supported durations/i.test(bodyText)) {
            const m = bodyText.match(/supported durations:\s*([^"]+?)\s*\(/i);
            return { ok: true, status: r.status, note: `契约探针通过（未创建真实任务）；该模型支持时长：${m ? m[1].trim() : "见上游文档"}` };
          }
          return { ok: false, status: r.status, error: friendlyUpstreamError(r.status, bodyText).message };
        }
        return { ok: true, status: r.status, note: "契约探针通过（未创建真实任务）" };
      } catch (e) {
        return { ok: false, error: (e as Error).message.slice(0, 200) };
      }
    }
    return { ok: true, kind: p.kind }; // mock 直接通过
  });
}
