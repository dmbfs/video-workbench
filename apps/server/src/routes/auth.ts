import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "../db.js";
import { newId } from "../settings.js";
import {
  SESSION_COOKIE, normalizeAccount, hashPassword, verifyPassword,
  createSession, destroySession, sessionUser, publicUser, readSessionCookie,
  loginLockedSeconds, recordLoginFailure, clearLoginFailures,
} from "../auth.js";
import { loginSchema, registerSchema } from "@vidstitch/shared";

/** zod 失败转 400（fastify 默认会把 throw 变 500，这里给用户能读懂的报错） */
function parseBody<T>(schema: { safeParse: (b: unknown) => { success: true; data: T } | { success: false; error: { issues: { message?: string }[] } } }, body: unknown): T {
  const r = schema.safeParse(body ?? {});
  if (!r.success) throw Object.assign(new Error(r.error.issues[0]?.message ?? "参数不合法"), { statusCode: 400 });
  return r.data;
}

function setSessionCookie(reply: FastifyReply, token: string, expiresAt: number) {
  // HttpOnly + SameSite=Lax：SPA 同源（vite 代理）与直连 8787 都能带上
  reply.header("Set-Cookie",
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}`);
}

function clearSessionCookie(reply: FastifyReply) {
  reply.header("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function defaultNickname(type: "phone" | "email", account: string): string {
  return type === "phone" ? `用户${account.slice(-4)}` : account.split("@")[0];
}

export async function authRoutes(app: FastifyInstance) {
  /** 注册：手机号或邮箱 + 密码（≥8 位）。成功即登录（种会话 cookie）。 */
  app.post("/api/auth/register", async (req, reply) => {
    const body = parseBody(registerSchema, req.body);
    const norm = normalizeAccount(body.account);
    if ("error" in norm) return reply.code(400).send({ error: norm.error });
    if (db.prepare("SELECT 1 FROM users WHERE account = ?").get(norm.account)) {
      return reply.code(409).send({ error: "该手机号/邮箱已注册，请直接登录" });
    }
    const id = newId();
    const now = new Date().toISOString();
    const nickname = body.nickname ?? defaultNickname(norm.type, norm.account);
    db.prepare("INSERT INTO users(id,account_type,account,password_hash,nickname,created_at) VALUES(?,?,?,?,?,?)")
      .run(id, norm.type, norm.account, hashPassword(body.password), nickname, now);
    const session = createSession(id);
    setSessionCookie(reply, session.token, session.expiresAt);
    return { user: publicUser({ id, account_type: norm.type, account: norm.account, nickname, created_at: now }) };
  });

  /** 登录：手机号或邮箱 + 密码；连续失败 5 次锁 10 分钟。 */
  app.post("/api/auth/login", async (req, reply) => {
    const body = parseBody(loginSchema, req.body);
    const norm = normalizeAccount(body.account);
    if ("error" in norm) return reply.code(400).send({ error: norm.error });
    const throttleKey = `${norm.account}|${req.ip}`;
    const locked = loginLockedSeconds(throttleKey);
    if (locked > 0) {
      return reply.code(429).send({ error: `失败次数过多，请 ${Math.ceil(locked / 60)} 分钟后再试` });
    }
    const row = db.prepare("SELECT * FROM users WHERE account = ?").get(norm.account) as any;
    if (!row || !verifyPassword(body.password, row.password_hash)) {
      recordLoginFailure(throttleKey);
      return reply.code(401).send({ error: "账号或密码不对" });
    }
    clearLoginFailures(throttleKey);
    const session = createSession(row.id);
    setSessionCookie(reply, session.token, session.expiresAt);
    return { user: publicUser(row) };
  });

  /** 退出登录：销毁服务端会话 + 清 cookie */
  app.post("/api/auth/logout", async (req, reply) => {
    destroySession(readSessionCookie(req));
    clearSessionCookie(reply);
    return { ok: true };
  });

  /** 当前登录用户；未登录 401（前端据此切换到登录页） */
  app.get("/api/auth/me", async (req, reply) => {
    const user = sessionUser(readSessionCookie(req));
    if (!user) return reply.code(401).send({ error: "未登录" });
    return { user: publicUser(user) };
  });
}
