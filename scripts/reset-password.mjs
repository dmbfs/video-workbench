#!/usr/bin/env node
// 本机密码重置（数据不出本机）：node scripts/reset-password.mjs <手机号或邮箱> <新密码≥8位>
// 场景：注册时密码打错导致无法登录。直接改 data/app.db 的 scrypt 散列，并吊销该账号全部会话。
import { createRequire } from "node:module";
import { scryptSync, randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// better-sqlite3 是 apps/server 的依赖：从它的 package.json 位置解析
const requireFromServer = createRequire(path.join(here, "../apps/server/package.json"));
const Database = requireFromServer("better-sqlite3");

const [rawAccount, pw] = process.argv.slice(2);
if (!rawAccount || !pw) {
  console.error("用法：node scripts/reset-password.mjs <手机号或邮箱> <新密码≥8位>");
  process.exit(1);
}
if (pw.length < 8) { console.error("❌ 新密码至少 8 位"); process.exit(1); }

// 归一化规则与 apps/server/src/auth.ts normalizeAccount 保持一致
const s = String(rawAccount).trim();
const digits = s.replace(/[\s-]/g, "").replace(/^\+?86(?=1\d{10}$)/, "");
const account = /^1\d{10}$/.test(digits) ? digits
  : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s.toLowerCase() : null;
if (!account) { console.error("❌ 账号格式不对：11 位手机号（1 开头）或有效邮箱"); process.exit(1); }

const db = new Database(fileURLToPath(new URL("../data/app.db", import.meta.url)));
const row = db.prepare("SELECT id FROM users WHERE account=?").get(account);
if (!row) { console.error(`❌ 账号不存在：${account}（确认输入，或先到页面注册）`); process.exit(1); }

const salt = randomBytes(16).toString("hex");
const hash = `s1$${salt}$${scryptSync(pw, salt, 64).toString("hex")}`;
db.prepare("UPDATE users SET password_hash=? WHERE account=?").run(hash, account);
db.prepare("DELETE FROM sessions WHERE user_id=?").run(row.id);
console.log(`✅ 已重置 ${account} 的密码，用新密码重新登录即可（旧会话已全部吊销）`);
