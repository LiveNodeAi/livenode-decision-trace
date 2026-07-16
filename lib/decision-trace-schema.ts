import { z } from "zod";

const groundedItemSchema = z.object({
  text: z.string().min(1),
  evidence: z.string().min(1).nullable(),
  inference: z.boolean(),
});

const optionSchema = z.object({
  name: z.string().min(1),
  benefits: z.array(z.string().min(1)).min(1).max(2),
  costs: z.array(z.string().min(1)).min(1).max(2),
  risks: z.array(z.string().min(1)).max(2),
  reversible: z.boolean(),
});

export const decisionTraceSchema = z.object({
  language: z.enum(["ja", "en"]),
  situation: z.object({
    decision: z.string().min(1),
    context: z.array(groundedItemSchema).min(1).max(3),
  }),
  assumptions: z.array(groundedItemSchema).min(1).max(3),
  criteria: z.array(groundedItemSchema).min(1).max(4),
  options: z.array(optionSchema).min(2).max(3),
  recommendation: z.object({
    option: z.string().min(1),
    reasoning: z.array(groundedItemSchema).min(1).max(3),
    confidence: z.enum(["low", "medium", "high"]),
    changeConditions: z.array(z.string().min(1)).max(2),
  }),
  nextActions: z
    .array(z.object({ order: z.number().int().positive(), action: z.string().min(1) }))
    .min(1)
    .max(4),
  links: z.array(
    z.object({
      label: z.string().min(1),
      relationship: z.string().min(1),
      sourceExcerpt: z.string().min(1),
    }),
  ).max(3),
});

export type DecisionTrace = z.infer<typeof decisionTraceSchema>;
