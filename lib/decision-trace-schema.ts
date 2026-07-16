import { z } from "zod";

const groundedItemSchema = z.discriminatedUnion("inference", [
  z.object({
    text: z.string().min(1),
    evidence: z.string().min(1),
    inference: z.literal(false),
  }),
  z.object({
    text: z.string().min(1),
    evidence: z.null(),
    inference: z.literal(true),
  }),
]);

const optionSchema = z.object({
  name: z.string().min(1),
  benefits: z.array(z.string().min(1)).min(1).max(2),
  costs: z.array(z.string().min(1)).min(1).max(2),
  risks: z.array(z.string().min(1)).max(2),
  reversible: z.boolean(),
});

const providerGroundedItemStructuralSchema = z.object({
  text: z.string().min(1),
  evidence: z.string().min(1).nullable(),
  inference: z.boolean(),
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

export const providerDecisionTraceStructuralSchema = z.object({
  language: z.enum(["ja", "en"]),
  situation: z.object({
    decision: z.string().min(1),
    context: z.array(providerGroundedItemStructuralSchema).min(1).max(3),
  }),
  assumptions: z.array(providerGroundedItemStructuralSchema).min(1).max(3),
  criteria: z.array(providerGroundedItemStructuralSchema).min(1).max(4),
  options: z.array(optionSchema).min(2).max(3),
  recommendation: z.object({
    option: z.string().min(1),
    reasoning: z.array(providerGroundedItemStructuralSchema).min(1).max(3),
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

const providerGroundedItemSchema = {
  type: "object",
  properties: {
    text: { type: "string", minLength: 1 },
    evidence: { type: ["string", "null"], minLength: 1 },
    inference: { type: "boolean" },
  },
  required: ["text", "evidence", "inference"],
  additionalProperties: false,
} as const;

const providerOptionSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    benefits: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1, maxItems: 2 },
    costs: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1, maxItems: 2 },
    risks: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 2 },
    reversible: { type: "boolean" },
  },
  required: ["name", "benefits", "costs", "risks", "reversible"],
  additionalProperties: false,
} as const;

export const providerDecisionTraceSchema = {
  type: "object",
  properties: {
    language: { type: "string", enum: ["ja", "en"] },
    situation: {
      type: "object",
      properties: {
        decision: { type: "string", minLength: 1 },
        context: { type: "array", items: providerGroundedItemSchema, minItems: 1, maxItems: 3 },
      },
      required: ["decision", "context"],
      additionalProperties: false,
    },
    assumptions: { type: "array", items: providerGroundedItemSchema, minItems: 1, maxItems: 3 },
    criteria: { type: "array", items: providerGroundedItemSchema, minItems: 1, maxItems: 4 },
    options: { type: "array", items: providerOptionSchema, minItems: 2, maxItems: 3 },
    recommendation: {
      type: "object",
      properties: {
        option: { type: "string", minLength: 1 },
        reasoning: { type: "array", items: providerGroundedItemSchema, minItems: 1, maxItems: 3 },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        changeConditions: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 2 },
      },
      required: ["option", "reasoning", "confidence", "changeConditions"],
      additionalProperties: false,
    },
    nextActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          order: { type: "integer", minimum: 1 },
          action: { type: "string", minLength: 1 },
        },
        required: ["order", "action"],
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 4,
    },
    links: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string", minLength: 1 },
          relationship: { type: "string", minLength: 1 },
          sourceExcerpt: { type: "string", minLength: 1 },
        },
        required: ["label", "relationship", "sourceExcerpt"],
        additionalProperties: false,
      },
      maxItems: 3,
    },
  },
  required: ["language", "situation", "assumptions", "criteria", "options", "recommendation", "nextActions", "links"],
  additionalProperties: false,
} as const;

export type DecisionTrace = z.infer<typeof decisionTraceSchema>;
