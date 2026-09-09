import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DATA = path.resolve(process.cwd(), "../../data");
mkdirSync(path.join(DATA, "projects"), { recursive: true });

export const db = new Database(path.join(DATA, "app.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, title TEXT NOT NULL, ratio TEXT NOT NULL DEFAULT '16:9',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS storyboards (project_id TEXT PRIMARY KEY, title TEXT NOT NULL, ratio TEXT NOT NULL,
  with_audio INTEGER NOT NULL DEFAULT 1, style_prefix TEXT NOT NULL DEFAULT '', confirmed_at TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS segments (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, idx INTEGER NOT NULL,
  prompt TEXT NOT NULL, duration INTEGER NOT NULL, transition_out TEXT NOT NULL DEFAULT 'cut',
  status TEXT NOT NULL DEFAULT 'pending', provider TEXT, task_id TEXT, video_path TEXT, error TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, role TEXT NOT NULL,
  content TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS generation_calls (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL,
  segment_id TEXT NOT NULL, provider TEXT, created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_generation_calls_project ON generation_calls(project_id);
`);

export const dataRoot = DATA;
