import { z } from "zod";

export const providerKindSchema = z.enum(["openai-compatible", "openai-video", "minimax", "seedance", "tokendance-seedance", "mock"]);
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
  // 一键成片 skill 链（PRD §7.8）：step ∈ prompt-enhance / storyboard / video-gen / postfx-grade / stitch-export
  z.object({ type: z.literal("chain_progress"), step: z.string(), detail: z.string() }),
  z.object({ type: z.literal("chain_done"), url: z.string() }),
  z.object({ type: z.literal("chain_error"), step: z.string(), error: z.string() }),
]);
export type SseEvent = z.infer<typeof sseEventSchema>;

/** 一键成片（skill 链全自动）：一段 prompt 直接跑到 final.mp4（PRD FR-12） */
export const autoProjectSchema = z.object({
  prompt: z.string().min(2).max(500),
  ratio: ratioSchema.default("16:9"),
  postfx: z.enum(["none", "film", "clean"]).default("none"),
  crossfadeMs: z.number().int().min(0).max(2000).default(0),
});

export const createProjectSchema = z.object({ title: z.string().min(1), ratio: ratioSchema.default("16:9") });
export const addSegmentSchema = z.object({ prompt: z.string().min(1), duration: z.number().int().min(4).max(30).default(10) });
export const patchSegmentSchema = z.object({
  prompt: z.string().min(1).optional(), duration: z.number().int().min(4).max(30).optional(),
  transitionOut: transitionSchema.optional(),
});
export const exportSchema = z.object({
  crossfadeMs: z.number().int().min(0).max(2000).default(0),
  /** 导出质感预设（PRD §7.6）：none 原样 / film 胶片感 / clean 清爽网感 */
  postfx: z.enum(["none", "film", "clean"]).default("none"),
});
export type Postfx = z.infer<typeof exportSchema>["postfx"];
export const updateSettingsSchema = settingsSchema;
/** 段序调整：order 为全部分镜 id 的新顺序 */
export const reorderSegmentsSchema = z.object({ order: z.array(z.string()).min(1) });

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

// ── 账号体系（v1.1 新增：手机号 / 邮箱 + 密码）─────────────────────────────
export const accountTypeSchema = z.enum(["phone", "email"]);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const publicUserSchema = z.object({
  id: z.string(), account: z.string(), accountType: accountTypeSchema,
  nickname: z.string().nullable(), createdAt: z.string(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

/** account 为手机号（11 位，1 开头）或邮箱；具体格式校验/归一化在服务端做 */
export const registerSchema = z.object({
  account: z.string().min(5).max(120),
  password: z.string().min(8).max(72),
  nickname: z.string().min(1).max(30).optional(),
});
export const loginSchema = z.object({ account: z.string().min(5).max(120), password: z.string().min(1).max(72) });
export const authOkSchema = z.object({ user: publicUserSchema });
