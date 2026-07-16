import { describe, expect, it } from "vitest";

import { decisionTraceSchema, type DecisionTrace } from "@/lib/decision-trace-schema";

const grounded = { text: "Grounded point", evidence: "source words", inference: false };

const trace: DecisionTrace = {
  language: "en",
  situation: { decision: "Choose a plan", context: [grounded] },
  assumptions: [grounded],
  criteria: [grounded],
  options: [
    { name: "Pilot", benefits: ["Learn"], costs: ["Time"], risks: ["Delay"], reversible: true },
    { name: "Launch", benefits: ["Reach"], costs: ["Effort"], risks: [], reversible: false },
  ],
  recommendation: {
    option: "Pilot",
    reasoning: [grounded],
    confidence: "medium",
    changeConditions: ["Demand changes"],
  },
  nextActions: [{ order: 1, action: "Run the pilot" }],
  links: [],
};

describe("Decision Trace output bounds", () => {
  it.each([
    ["context", { situation: { ...trace.situation, context: Array(4).fill(grounded) } }],
    ["assumptions", { assumptions: Array(4).fill(grounded) }],
    ["criteria", { criteria: Array(5).fill(grounded) }],
    ["options", { options: Array(4).fill(trace.options[0]) }],
    ["option benefits", { options: [{ ...trace.options[0], benefits: ["a", "b", "c"] }, trace.options[1]] }],
    ["option costs", { options: [{ ...trace.options[0], costs: ["a", "b", "c"] }, trace.options[1]] }],
    ["option risks", { options: [{ ...trace.options[0], risks: ["a", "b", "c"] }, trace.options[1]] }],
    ["reasoning", { recommendation: { ...trace.recommendation, reasoning: Array(4).fill(grounded) } }],
    ["change conditions", { recommendation: { ...trace.recommendation, changeConditions: ["a", "b", "c"] } }],
    ["next actions", { nextActions: Array.from({ length: 5 }, (_, index) => ({ order: index + 1, action: "Act" })) }],
    ["links", { links: Array(4).fill({ label: "Project", relationship: "relates to", sourceExcerpt: "Project" }) }],
  ])("rejects an overflow in %s", (_name, patch) => {
    expect(decisionTraceSchema.safeParse({ ...trace, ...patch }).success).toBe(false);
  });
});
