import { z } from "zod";

const groundedItemSchema = z.object({
  text: z.string().min(1),
  evidence: z.string().min(1).nullable(),
  inference: z.boolean(),
});

const optionSchema = z.object({
  name: z.string().min(1),
  benefits: z.array(z.string().min(1)).min(1),
  costs: z.array(z.string().min(1)).min(1),
  risks: z.array(z.string().min(1)),
  reversible: z.boolean(),
});

export const decisionTraceSchema = z.object({
  language: z.enum(["ja", "en"]),
  situation: z.object({
    decision: z.string().min(1),
    context: z.array(groundedItemSchema).min(1),
  }),
  assumptions: z.array(groundedItemSchema).min(1),
  criteria: z.array(groundedItemSchema).min(1),
  options: z.array(optionSchema).min(2).max(5),
  recommendation: z.object({
    option: z.string().min(1),
    reasoning: z.array(groundedItemSchema).min(1),
    confidence: z.enum(["low", "medium", "high"]),
    changeConditions: z.array(z.string().min(1)),
  }),
  nextActions: z
    .array(z.object({ order: z.number().int().positive(), action: z.string().min(1) }))
    .min(1)
    .max(7),
  links: z.array(
    z.object({
      label: z.string().min(1),
      relationship: z.string().min(1),
      sourceExcerpt: z.string().min(1),
    }),
  ),
});

export type DecisionTrace = z.infer<typeof decisionTraceSchema>;
