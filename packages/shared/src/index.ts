import { z } from "zod";

export const providerKindSchema = z.enum(["openai-compatible", "openai-video", "minimax", "seedance", "mock"]);
export type ProviderKind = z.infer<typeof providerKindSchema>;

export const providerConfigSchema = z.object({
  id: z.string(), kind: providerKindSchema, label: z.string().min(1),
  baseUrl: z.string().url().optional(), apiKey: z.string().optional(), modelId: z.string().optional(),
});
export type ProviderConfig = z.infer<typeof providerConfigSchema>;

export const settingsSchema = z.object({
  providers: z.array(providerConfigSchema).min(1),
  chatDefaultId: z.string().optional(), videoDefaultId: z.string().optional(),
});
export type Settings = z.infer<typeof settingsSchema>;
/** API 返回给前端的脱敏形态 */
export type PublicSettings = Omit<Settings, "providers"> & {
  providers: (Omit<ProviderConfig, "apiKey"> & { apiKeySet: boolean })[];
};

export const ratioSchema = z.enum(["16:9", "9:16"]);
export const transitionSchema = z.enum(["cut", "fade"]);
export const segmentStatusSchema = z.enum(["pending", "generating", "succeeded", "failed"]);
export type SegmentStatus = z.infer<typeof segmentStatusSchema>;

export const segmentSchema = z.object({
  id: z.string(), projectId: z.string(), idx: z.number().int().min(1),
  prompt: z.string().min(1), duration: z.number().int().min(4).max(30),
  transitionOut: transitionSchema.default("cut"),
  status: segmentStatusSchema.default("pending"),
  provider: z.string().optional(), taskId: z.string().optional(),
  videoPath: z.string().optional(), error: z.string().optional(),
});
export type Segment = z.infer<typeof segmentSchema>;

export const storyboardSchema = z.object({
  projectId: z.string(), title: z.string().min(1), ratio: ratioSchema.default("16:9"),
  withAudio: z.boolean().default(true), stylePrefix: z.string().default(""),
  confirmedAt: z.string().nullable().default(null),
});
export type Storyboard = z.infer<typeof storyboardSchema>;

export const projectSummarySchema = z.object({
  id: z.string(), title: z.string(), ratio: ratioSchema,
  createdAt: z.string(), updatedAt: z.string(),
  segmentCount: z.number().int(), finalReady: z.boolean(),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const sseEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("segment_status"), segmentId: z.string(),
    status: segmentStatusSchema, error: z.string().optional() }),
  z.object({ type: z.literal("export_progress"),
    stage: z.enum(["normalizing", "concatenating", "done"]), pct: z.number().min(0).max(100) }),
  z.object({ type: z.literal("final_ready"), url: z.string() }),
  z.object({ type: z.literal("chat_delta"), text: z.string() }),
  z.object({ type: z.literal("chat_done"), messageId: z.string() }),
  z.object({ type: z.literal("storyboard_proposed"), storyboard: z.any() }),
  z.object({ type: z.literal("timeline_replaced"), projectId: z.string() }),
]);
export type SseEvent = z.infer<typeof sseEventSchema>;

export const createProjectSchema = z.object({ title: z.string().min(1), ratio: ratioSchema.default("16:9") });
export const addSegmentSchema = z.object({ prompt: z.string().min(1), duration: z.number().int().min(4).max(30).default(10) });
export const patchSegmentSchema = z.object({
  prompt: z.string().min(1).optional(), duration: z.number().int().min(4).max(30).optional(),
  transitionOut: transitionSchema.optional(),
});
export const exportSchema = z.object({ crossfadeMs: z.number().int().min(0).max(2000).default(0) });
export const updateSettingsSchema = settingsSchema;

export const chatRoleSchema = z.enum(["user", "assistant", "system"]);
export const chatMessageSchema = z.object({
  id: z.string(), projectId: z.string(), role: chatRoleSchema,
  content: z.string(), createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const storyboardProposalSchema = z.object({
  title: z.string().min(1).max(30),
  ratio: ratioSchema,
  withAudio: z.boolean(),
  stylePrefix: z.string().min(1),
  segments: z.array(z.object({
    prompt: z.string().min(10),
    duration: z.number().int().min(4).max(30),
    transitionOut: transitionSchema.default("cut"),
  })).min(1).max(6),
}).refine((s) => s.segments.reduce((a, x) => a + x.duration, 0) <= 60, { message: "总时长超过 60s" });
export type StoryboardProposal = z.infer<typeof storyboardProposalSchema>;
