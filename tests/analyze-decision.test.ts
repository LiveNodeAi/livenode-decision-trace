import { describe, expect, it, vi } from "vitest";

import {
  AnalysisError,
  analyzeDecision,
  type ResponsesClient,
} from "@/lib/analyze-decision";
import type { DecisionTrace } from "@/lib/decision-trace-schema";

const trace: DecisionTrace = {
  language: "en",
  situation: {
    decision: "Choose a launch plan",
    context: [{ text: "The launch is in June.", evidence: "launch is in June", inference: false }],
  },
  assumptions: [{ text: "The team remains available.", evidence: null, inference: true }],
  criteria: [{ text: "Keep delivery risk low.", evidence: "low delivery risk", inference: false }],
  options: [
    { name: "Pilot", benefits: ["Learn early"], costs: ["More coordination"], risks: [], reversible: true },
    { name: "Full launch", benefits: ["Faster reach"], costs: ["Higher effort"], risks: ["Rework"], reversible: false },
  ],
  recommendation: {
    option: "Pilot",
    reasoning: [{ text: "A pilot limits risk.", evidence: null, inference: true }],
    confidence: "medium",
    changeConditions: ["The deadline moves forward"],
  },
  nextActions: [{ order: 1, action: "Define the pilot" }],
  links: [],
};

function fakeClient(
  implementation: ResponsesClient["create"],
): ResponsesClient & { create: ReturnType<typeof vi.fn<ResponsesClient["create"]>> } {
  return { create: vi.fn(implementation) };
}

const args = { memo: "We need to choose a launch plan with low delivery risk.", model: "test-model" };

describe("analyzeDecision", () => {
  it("returns a validated Decision Trace and sends a strict, non-stored request", async () => {
    const client = fakeClient(async () => ({ output_text: JSON.stringify(trace) }));

    await expect(analyzeDecision({ ...args, client })).resolves.toEqual(trace);

    expect(client.create).toHaveBeenCalledOnce();
    const [request, options] = client.create.mock.calls[0];
    expect(request).toMatchObject({
      model: "test-model",
      store: false,
      reasoning: { effort: "none" },
      input: [{ role: "user", content: [{ type: "input_text", text: args.memo }] }],
      text: { format: { type: "json_schema", name: "decision_trace", strict: true } },
    });
    expect((request.text as { format: { schema: unknown } }).format.schema).toMatchObject({ type: "object" });
    const instructions = String(request.instructions);
    expect(instructions).toMatch(/untrusted/i);
    expect(instructions).toMatch(/verbatim/i);
    expect(instructions).toMatch(/inference/i);
    expect(instructions).toMatch(/link/i);
    expect(instructions).toMatch(/medical.*legal.*financial/is);
    expect(instructions).toMatch(/language/i);
    expect(instructions).toMatch(/concise/i);
    expect(instructions).toMatch(/no more than 3 context items/i);
    expect(instructions).toMatch(/no more than 3 options/i);
    expect(instructions).toMatch(/no more than 4 next actions/i);
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses a fresh 28-second timeout for every provider attempt", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const responses = ["not json", JSON.stringify(trace)];
    const client = fakeClient(async () => ({ output_text: responses.shift()! }));

    try {
      await expect(analyzeDecision({ ...args, client })).resolves.toEqual(trace);
      expect(timeout).toHaveBeenCalledTimes(2);
      expect(timeout).toHaveBeenNthCalledWith(1, 28_000);
      expect(timeout).toHaveBeenNthCalledWith(2, 28_000);
      expect(client.create.mock.calls[0][1]?.signal).not.toBe(client.create.mock.calls[1][1]?.signal);
    } finally {
      timeout.mockRestore();
    }
  });

  it("retries once after a malformed response and returns the valid second response", async () => {
    const responses = ["not json", JSON.stringify(trace)];
    const client = fakeClient(async () => ({ output_text: responses.shift()! }));

    await expect(analyzeDecision({ ...args, client })).resolves.toEqual(trace);
    expect(client.create).toHaveBeenCalledTimes(2);
  });

  it("throws MALFORMED_RESPONSE after two malformed responses", async () => {
    const client = fakeClient(async () => ({ output_text: "{}" }));

    await expect(analyzeDecision({ ...args, client })).rejects.toMatchObject({
      name: "AnalysisError",
      code: "MALFORMED_RESPONSE",
    });
    expect(client.create).toHaveBeenCalledTimes(2);
  });

  it("maps an aborted request to PROVIDER_TIMEOUT without retrying", async () => {
    const client = fakeClient(async () => {
      throw new DOMException("The operation was aborted", "AbortError");
    });

    await expect(analyzeDecision({ ...args, client })).rejects.toMatchObject({
      code: "PROVIDER_TIMEOUT",
    });
    expect(client.create).toHaveBeenCalledOnce();
  });

  it("maps APIUserAbortError from an expired attempt signal to PROVIDER_TIMEOUT", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    try {
      const client = fakeClient(async () => {
        controller.abort();
        const error = Object.assign(new Error("Request was aborted"), {
          name: "APIUserAbortError",
        });
        throw error;
      });

      await expect(analyzeDecision({ ...args, client })).rejects.toMatchObject({
        code: "PROVIDER_TIMEOUT",
      });
      expect(client.create).toHaveBeenCalledOnce();
      expect(client.create.mock.calls[0][1]?.signal?.aborted).toBe(true);
    } finally {
      timeout.mockRestore();
    }
  });

  it("maps a provider refusal without retrying", async () => {
    const refusal = Object.assign(new Error("Request rejected by safety policy"), {
      code: "content_filter",
    });
    const client = fakeClient(async () => {
      throw refusal;
    });

    await expect(analyzeDecision({ ...args, client })).rejects.toEqual(
      expect.objectContaining<Partial<AnalysisError>>({ code: "PROVIDER_REFUSAL" }),
    );
    expect(client.create).toHaveBeenCalledOnce();
  });

  it("maps refusal output content to PROVIDER_REFUSAL without retrying", async () => {
    const client = fakeClient(async () => ({
      output_text: "",
      output: [
        {
          type: "message",
          content: [{ type: "refusal", refusal: "I cannot help with that request." }],
        },
      ],
    }));

    await expect(analyzeDecision({ ...args, client })).rejects.toMatchObject({
      code: "PROVIDER_REFUSAL",
    });
    expect(client.create).toHaveBeenCalledOnce();
  });

  it("maps other provider errors to PROVIDER_FAILURE without retrying", async () => {
    const client = fakeClient(async () => {
      throw new Error("upstream unavailable");
    });

    await expect(analyzeDecision({ ...args, client })).rejects.toMatchObject({
      code: "PROVIDER_FAILURE",
    });
    expect(client.create).toHaveBeenCalledOnce();
  });
});
