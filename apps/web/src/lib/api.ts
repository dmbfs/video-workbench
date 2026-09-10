import type { ProjectSummary, PublicSettings, SseEvent, Segment, Storyboard, PublicUser } from "@vidstitch/shared";

const j = async (r: Response) => {
  if (!r.ok) {
    let msg = await r.text().catch(() => "");
    try { msg = JSON.parse(msg).error ?? msg; } catch { /* 保留原文 */ }
    const err = new Error(msg.slice(0, 200) || `HTTP ${r.status}`) as Error & { status?: number };
    err.status = r.status;
    throw err;
  }
  return r.json();
};

const post = (url: string, body?: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  // ── 账号 ──
  me: (): Promise<{ user: PublicUser }> => fetch("/api/auth/me").then(j),
  register: (b: { account: string; password: string; nickname?: string }): Promise<{ user: PublicUser }> =>
    post("/api/auth/register", b).then(j),
  login: (b: { account: string; password: string }): Promise<{ user: PublicUser }> => post("/api/auth/login", b).then(j),
  logout: (): Promise<{ ok: boolean }> => post("/api/auth/logout").then(j),
  // ── 项目 ──
  listProjects: (): Promise<ProjectSummary[]> => fetch("/api/projects").then(j),
  createProject: (b: { title: string; ratio: "16:9" | "9:16" }) =>
    fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(j),
  getProject: (id: string) =>
    fetch(`/api/projects/${id}`).then(j) as Promise<{ project: { id: string; title: string; ratio: string; createdAt: string; updatedAt: string }; storyboard: Storyboard; segments: Segment[] }>,
  deleteProject: (id: string) => fetch(`/api/projects/${id}`, { method: "DELETE" }).then(j),
  addSegment: (pid: string, b: { prompt: string; duration: number }) =>
    fetch(`/api/projects/${pid}/segments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(j),
  patchSegment: (sid: string, b: object) =>
    fetch(`/api/segments/${sid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(j),
  reorderSegments: (pid: string, order: string[]) =>
    fetch(`/api/projects/${pid}/segments/order`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) }).then(j),
  delSegment: (sid: string) => fetch(`/api/segments/${sid}`, { method: "DELETE" }).then(j),
  generateSegment: (sid: string) => fetch(`/api/segments/${sid}/generate`, { method: "POST" }).then(j),
  generateAll: (pid: string) => fetch(`/api/projects/${pid}/generate-all`, { method: "POST" }).then(j),
  export: (pid: string, crossfadeMs = 0) =>
    fetch(`/api/projects/${pid}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ crossfadeMs }) }).then(j),
  settings: (): Promise<PublicSettings> => fetch("/api/settings").then(j),
  saveSettings: (s: unknown) =>
    fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }).then(j),
  testProvider: (id: string) => fetch(`/api/providers/${id}/test`, { method: "POST" }).then(j),
  getMessages: (pid: string) => fetch(`/api/projects/${pid}/messages`).then(j),
  chat: (pid: string, message: string) =>
    fetch(`/api/projects/${pid}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }),
  proposeStoryboard: (pid: string) =>
    fetch(`/api/projects/${pid}/storyboard/propose`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(j),
  applyProposal: (pid: string, sb: unknown) =>
    fetch(`/api/projects/${pid}/storyboard/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sb) }).then(j),
};

export function subscribeEvents(pid: string, on: (e: SseEvent) => void) {
  const es = new EventSource(`/api/projects/${pid}/events`);
  es.onmessage = (m) => on(JSON.parse(m.data) as SseEvent);
  return () => es.close();
}
