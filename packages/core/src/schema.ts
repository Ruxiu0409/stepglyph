import { z } from "zod";

export const ActionTypeSchema = z.enum([
  "navigate",
  "click",
  "type",
  "press",
  "wait",
  "result",
  "error"
]);

export const PointTargetSchema = z.object({
  kind: z.literal("point"),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1)
});

export const RectTargetSchema = z.object({
  kind: z.literal("rect"),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1)
}).refine((target) => target.x + target.width <= 1, {
  message: "rect target must fit within normalized width"
}).refine((target) => target.y + target.height <= 1, {
  message: "rect target must fit within normalized height"
});

export const TargetSchema = z.union([PointTargetSchema, RectTargetSchema]);

export const AnnotationStyleSchema = z.object({
  color: z.string().default("#2563eb"),
  size: z.enum(["small", "medium", "large"]).default("medium"),
  labelPosition: z.enum([
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right"
  ]).default("top-right")
});

export const AnnotationSchema = z.object({
  id: z.string(),
  type: z.enum(["click-ring", "box", "callout", "badge", "spotlight"]),
  target: TargetSchema,
  label: z.string().default(""),
  style: AnnotationStyleSchema.default({}),
  editable: z.boolean().default(true),
  hidden: z.boolean().default(false)
});

export const ScreenshotSchema = z.object({
  path: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  deviceScaleFactor: z.number().positive().default(1)
});

export const ActionSchema = z.object({
  type: ActionTypeSchema,
  timestamp: z.string(),
  app: z.string().optional(),
  url: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const StepSchema = z.object({
  id: z.string(),
  index: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().default(""),
  hidden: z.boolean().default(false),
  sensitive: z.boolean().default(false),
  action: ActionSchema,
  screenshot: ScreenshotSchema,
  annotations: z.array(AnnotationSchema).default([])
});

export const ProjectSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: z.string(),
  title: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  source: z.object({
    adapter: z.string(),
    agent: z.string().optional()
  }),
  settings: z.object({
    redactInputs: z.boolean().default(true),
    theme: z.string().default("default")
  })
});

export const ScreenshotInputSchema = z.union([
  z.object({
    kind: z.literal("png-base64"),
    data: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    deviceScaleFactor: z.number().positive().default(1)
  }),
  z.object({
    kind: z.literal("file"),
    path: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    deviceScaleFactor: z.number().positive().default(1)
  })
]);

export const RedactionMetadataSchema = z.object({
  kind: z.enum(["typed-value", "region", "note"]),
  label: z.string(),
  target: TargetSchema.optional()
});

export const StepglyphCaptureEventSchema = z.object({
  action: ActionTypeSchema,
  title: z.string().min(1),
  description: z.string().default(""),
  screenshot: ScreenshotInputSchema,
  target: TargetSchema.optional(),
  app: z.string().optional(),
  url: z.string().optional(),
  redactions: z.array(RedactionMetadataSchema).default([]),
  sensitive: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional()
});

export const ProjectWithStepsSchema = z.object({
  project: ProjectSchema,
  steps: z.array(StepSchema)
});

export type ActionType = z.infer<typeof ActionTypeSchema>;
export type PointTarget = z.infer<typeof PointTargetSchema>;
export type RectTarget = z.infer<typeof RectTargetSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type AnnotationStyle = z.infer<typeof AnnotationStyleSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type Screenshot = z.infer<typeof ScreenshotSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ScreenshotInput = z.infer<typeof ScreenshotInputSchema>;
export type RedactionMetadata = z.infer<typeof RedactionMetadataSchema>;
export type StepglyphCaptureEvent = z.infer<typeof StepglyphCaptureEventSchema>;
export type StepglyphCaptureEventInput = z.input<typeof StepglyphCaptureEventSchema>;
export type ProjectWithSteps = z.infer<typeof ProjectWithStepsSchema>;
