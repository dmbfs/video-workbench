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
    return { ok: true, kind: p.kind }; // mock 直接通过；minimax/seedance 真实验证在 M3
  });
}
