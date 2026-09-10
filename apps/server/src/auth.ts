import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { db } from "./db.js";
import type { AccountType } from "@vidstitch/shared";

export const SESSION_COOKIE = "vs_session";
/** 会话有效期：30 天 */
const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

// ── 账号归一化 ────────────────────────────────────────────────────────────
/** 手机号 / 邮箱二合一识别：手机号容忍 +86 前缀与空格/连字符；邮箱转小写 */
export function normalizeAccount(raw: string): { type: AccountType; account: string } | { error: string } {
  const s = raw.trim();
  if (!s) return { error: "请输入手机号或邮箱" };
  const digits = s.replace(/[\s-]/g, "").replace(/^\+?86(?=1\d{10}$)/, "");
  if (/^1\d{10}$/.test(digits)) return { type: "phone", account: digits };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 120) return { type: "email", account: s.toLowerCase() };
  return { error: "格式不对：请输入 11 位手机号（1 开头）或有效邮箱地址" };
}

// ── 密码散列（scrypt，格式 s1$salt$hash）────────────────────────────────────
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `s1$${salt}$${scryptSync(pw, salt, 64).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [ver, salt, hash] = stored.split("$");
  if (ver !== "s1" || !salt || !hash) return false;
  const candidate = scryptSync(pw, salt, 64);
  const original = Buffer.from(hash, "hex");
  return candidate.length === original.length && timingSafeEqual(candidate, original);
}

// ── 会话 ─────────────────────────────────────────────────────────────────
export function createSession(userId: string): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  db.prepare("INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)")
    .run(token, userId, new Date(now).toISOString(), new Date(expiresAt).toISOString());
  // 顺手清理过期会话，防膨胀
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date(now).toISOString());
  return { token, expiresAt };
}

export function sessionUser(token: string | undefined):
  | { id: string; account_type: string; account: string; password_hash: string; nickname: string | null; created_at: string }
  | undefined {
  if (!token) return undefined;
  const row = db.prepare(
    "SELECT u.id, u.account_type, u.account, u.password_hash, u.nickname, u.created_at, s.expires_at " +
    "FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?",
  ).get(token) as any;
  if (!row) return undefined;
  if (Date.parse(row.expires_at) < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return undefined;
  }
  return row;
}

export function destroySession(token: string | undefined) {
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function publicUser(row: { id: string; account_type: string; account: string; nickname: string | null; created_at: string }) {
  return { id: row.id, account: row.account, accountType: row.account_type, nickname: row.nickname, createdAt: row.created_at };
}

// ── Cookie 读写（不引依赖，手搓最小实现）──────────────────────────────────
export function readSessionCookie(req: FastifyRequest): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === SESSION_COOKIE) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

// ── 登录限速（内存态：同一账号连续失败 5 次锁 10 分钟）────────────────────
const failures = new Map<string, { n: number; lockedUntil: number }>();

export function loginLockedSeconds(key: string): number {
  const f = failures.get(key);
  if (!f || f.lockedUntil <= Date.now()) return 0;
  return Math.ceil((f.lockedUntil - Date.now()) / 1000);
}

export function recordLoginFailure(key: string) {
  const f = failures.get(key) ?? { n: 0, lockedUntil: 0 };
  f.n += 1;
  if (f.n >= 5) {
    f.lockedUntil = Date.now() + 10 * 60_000;
    f.n = 0;
  }
  failures.set(key, f);
}

export function clearLoginFailures(key: string) {
  failures.delete(key);
}
