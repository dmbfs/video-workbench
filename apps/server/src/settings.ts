import { db } from "./db.js";
import { settingsSchema, type Settings, type PublicSettings, type ProviderConfig } from "@vidstitch/shared";
import { nanoid } from "nanoid";

const DEFAULTS: Settings = {
  providers: [
    { id: "mock-video", kind: "mock", label: "本地 Mock 视频" },
    { id: "mock-chat", kind: "mock", label: "本地 Mock 对话" },
  ],
  videoDefaultId: "mock-video",
  chatDefaultId: "mock-chat",
};

export function getSettings(): Settings {
  const row = db.prepare("SELECT json FROM settings WHERE key='settings'").get() as { json: string } | undefined;
  return row ? settingsSchema.parse(JSON.parse(row.json)) : DEFAULTS;
}

export function saveSettings(s: Settings): Settings {
  const parsed = settingsSchema.parse(s);
  // 前端永远拿不到明文 key，回传时 apiKey 为空 → 保留旧值（按 id 匹配）
  const old = getSettings();
  parsed.providers = parsed.providers.map((p) => {
    if (p.apiKey) return p;
    const prev = old.providers.find((o) => o.id === p.id);
    return prev?.apiKey ? { ...p, apiKey: prev.apiKey } : p;
  });
  db.prepare("INSERT INTO settings(key,json) VALUES('settings',?) ON CONFLICT(key) DO UPDATE SET json=excluded.json")
    .run(JSON.stringify(parsed));
  return parsed;
}

export function toPublic(s: Settings): PublicSettings {
  return { ...s, providers: s.providers.map(({ apiKey, ...p }) => ({ ...p, apiKeySet: !!apiKey })) };
}

export function getProvider(id: string): ProviderConfig | undefined {
  return getSettings().providers.find((p) => p.id === id);
}

export function newId() {
  return nanoid(12);
}
