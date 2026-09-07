import type { FastifyInstance } from "fastify";
import { getSettings, saveSettings, toPublic } from "../settings.js";
import { updateSettingsSchema } from "@vidstitch/shared";

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => toPublic(getSettings()));

  app.put("/api/settings", async (req) => {
    const s = saveSettings(updateSettingsSchema.parse(req.body));
    return toPublic(s);
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
        return { ok: r.ok, status: r.status };
      } catch (e) {
        return { ok: false, error: (e as Error).message.slice(0, 200) };
      }
    }
    return { ok: true, kind: p.kind }; // mock 直接通过；minimax/seedance 真实验证在 M3
  });
}
