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

/** 保存时的业务校验错误（路由层转 400） */
export class SettingsValidationError extends Error {}

const CHAT_KINDS = new Set(["openai-compatible", "mock"]);
const VIDEO_KINDS = new Set(["minimax", "seedance", "tokendance-seedance", "openai-video", "mock"]);

export function getSettings(): Settings {
  const row = db.prepare("SELECT json FROM settings WHERE key='settings'").get() as { json: string } | undefined;
  return row ? settingsSchema.parse(JSON.parse(row.json)) : DEFAULTS;
}

export function saveSettings(s: Settings): Settings {
  const parsed = settingsSchema.parse(s);
  // 先回填旧 key（前端永远拿不到明文 key，回传时 apiKey 为空 → 按 id 匹配旧值），
  // 再做必填校验，否则脱敏回传会被误判为缺 key
  const old = getSettings();
  parsed.providers = parsed.providers.map((p) => {
    if (p.apiKey) return p;
    const prev = old.providers.find((o) => o.id === p.id);
    return prev?.apiKey ? { ...p, apiKey: prev.apiKey } : p;
  });
  // 按 kind 校验必填项（mock 豁免；tokendance-seedance 的 baseUrl 有代码内默认值）
  for (const p of parsed.providers) {
    if (p.kind === "mock") continue;
    if (!p.baseUrl && p.kind !== "tokendance-seedance") throw new SettingsValidationError(`「${p.label}」缺少 Base URL`);
    if (!p.modelId) throw new SettingsValidationError(`「${p.label}」缺少模型 ID`);
    if (!p.apiKey) throw new SettingsValidationError(`「${p.label}」缺少 API Key`);
  }
  // 默认 provider 失效自愈：指向的 provider 已被删/改 kind 时自动落到同类第一个，
  // 避免编排器因「默认 id 不存在」而整条流水线不可用（生成全挂的事故根因）
  const chatDefaultValid = parsed.providers.some((p) => p.id === parsed.chatDefaultId && CHAT_KINDS.has(p.kind));
  if (!chatDefaultValid) parsed.chatDefaultId = parsed.providers.find((p) => CHAT_KINDS.has(p.kind))?.id;
  const videoDefaultValid = parsed.providers.some((p) => p.id === parsed.videoDefaultId && VIDEO_KINDS.has(p.kind));
  if (!videoDefaultValid) {
    // 优先真实视频 provider，实在没有才落到 mock
    parsed.videoDefaultId =
      parsed.providers.find((p) => VIDEO_KINDS.has(p.kind) && p.kind !== "mock")?.id ??
      parsed.providers.find((p) => p.kind === "mock")?.id;
  }
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
