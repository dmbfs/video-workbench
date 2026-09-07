import type { ProjectSummary, PublicSettings, SseEvent, Segment, Storyboard } from "@vidstitch/shared";

const j = async (r: Response) => {
  if (!r.ok) throw new Error((await r.text()).slice(0, 200));
  return r.json();
};

export const api = {
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
  delSegment: (sid: string) => fetch(`/api/segments/${sid}`, { method: "DELETE" }).then(j),
  generateSegment: (sid: string) => fetch(`/api/segments/${sid}/generate`, { method: "POST" }).then(j),
  generateAll: (pid: string) => fetch(`/api/projects/${pid}/generate-all`, { method: "POST" }).then(j),
  export: (pid: string) =>
    fetch(`/api/projects/${pid}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(j),
  settings: (): Promise<PublicSettings> => fetch("/api/settings").then(j),
  saveSettings: (s: unknown) =>
    fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }).then(j),
  testProvider: (id: string) => fetch(`/api/providers/${id}/test`, { method: "POST" }).then(j),
};

export function subscribeEvents(pid: string, on: (e: SseEvent) => void) {
  const es = new EventSource(`/api/projects/${pid}/events`);
  es.onmessage = (m) => on(JSON.parse(m.data) as SseEvent);
  return () => es.close();
}
