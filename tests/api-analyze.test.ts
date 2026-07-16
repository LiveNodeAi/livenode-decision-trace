import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalysisError } from "@/lib/analyze-decision";

const { analyzeDecision, getRuntimeEnv, responsesCreate } = vi.hoisted(() => ({
  analyzeDecision: vi.fn(),
  getRuntimeEnv: vi.fn(),
  responsesCreate: vi.fn(),
}));

vi.mock("@/lib/analyze-decision", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analyze-decision")>();
  return { ...actual, analyzeDecision };
});

vi.mock("@/lib/runtime-env", () => ({ getRuntimeEnv }));

vi.mock("openai", () => ({
  default: vi.fn(function OpenAI() {
    return { responses: { create: responsesCreate } };
  }),
}));

import { POST } from "@/app/api/analyze/route";

const trace = { language: "en", recommendation: { option: "Pilot" } };
const limiter = { limit: vi.fn() };
const apiKey = "sk-secret-do-not-return";

function request(body: unknown, ip?: string): Request {
  return new Request("https://example.test/api/analyze", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(ip ? { "cf-connecting-ip": ip } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function body(response: Response): Promise<unknown> {
  return response.json();
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limiter.limit.mockResolvedValue({ success: true });
    getRuntimeEnv.mockResolvedValue({
      OPENAI_API_KEY: apiKey,
      OPENAI_MODEL: "test-model",
      DECISION_TRACE_RATE_LIMITER: limiter,
    });
  });

  it("rejects 79 trimmed characters before obtaining runtime bindings", async () => {
    const response = await POST(request({ memo: `  ${"a".repeat(79)}  ` }));

    expect(response.status).toBe(400);
    expect(await body(response)).toEqual({ error: "MEMO_TOO_SHORT" });
    expect(getRuntimeEnv).not.toHaveBeenCalled();
    expect(analyzeDecision).not.toHaveBeenCalled();
    expect(responsesCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid JSON", "{", { "content-type": "application/json" }],
    ["a missing memo", JSON.stringify({}), { "content-type": "application/json" }],
    ["a non-string memo", JSON.stringify({ memo: 80 }), { "content-type": "application/json" }],
  ])("rejects %s as an invalid request", async (_label, rawBody, headers) => {
    const response = await POST(new Request("https://example.test/api/analyze", {
      method: "POST",
      headers,
      body: rawBody,
    }));

    expect(response.status).toBe(400);
    expect(await body(response)).toEqual({ error: "INVALID_REQUEST" });
    expect(getRuntimeEnv).not.toHaveBeenCalled();
  });

  it("returns RATE_LIMITED and keys the limiter by client IP", async () => {
    limiter.limit.mockResolvedValue({ success: false });

    const response = await POST(request({ memo: "a".repeat(80) }, "203.0.113.9"));

    expect(response.status).toBe(429);
    expect(await body(response)).toEqual({ error: "RATE_LIMITED" });
    expect(limiter.limit).toHaveBeenCalledWith({ key: "analyze:203.0.113.9" });
    expect(analyzeDecision).not.toHaveBeenCalled();
  });

  it("uses an unknown IP fallback and returns a successful trace", async () => {
    analyzeDecision.mockResolvedValue(trace);

    const response = await POST(request({ memo: `  ${"a".repeat(80)}  ` }));

    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({ trace, highImpact: false });
    expect(limiter.limit).toHaveBeenCalledWith({ key: "analyze:unknown" });
    expect(analyzeDecision).toHaveBeenCalledWith(expect.objectContaining({
      memo: "a".repeat(80),
      model: "test-model",
      client: expect.objectContaining({ create: expect.any(Function) }),
    }));
  });

  it("deterministically flags explicit medical, legal, and financial memos", async () => {
    analyzeDecision.mockResolvedValue(trace);
    for (const memo of [
      `医療の治療方針を検討する。${"a".repeat(80)}`,
      `We need legal advice about a contract. ${"a".repeat(80)}`,
      `投資判断を検討する。${"a".repeat(80)}`,
    ]) {
      const response = await POST(request({ memo }));
      expect(response.status).toBe(200);
      expect(await body(response)).toEqual({ trace, highImpact: true });
    }
  });

  it("rejects an oversized declared Content-Length before runtime bindings", async () => {
    const response = await POST(new Request("https://example.test/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "50001" },
      body: JSON.stringify({ memo: "a".repeat(80) }),
    }));

    expect(response.status).toBe(413);
    expect(await body(response)).toEqual({ error: "REQUEST_TOO_LARGE" });
    expect(getRuntimeEnv).not.toHaveBeenCalled();
  });

  it.each([
    ["without Content-Length", {}],
    ["with a lying Content-Length", { "content-length": "10" }],
  ])("rejects an oversized streamed body %s before JSON parsing", async (_label, extraHeaders) => {
    const response = await POST(new Request("https://example.test/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json", ...extraHeaders },
      body: JSON.stringify({ memo: "界".repeat(17_000) }),
    }));

    expect(response.status).toBe(413);
    expect(await body(response)).toEqual({ error: "REQUEST_TOO_LARGE" });
    expect(getRuntimeEnv).not.toHaveBeenCalled();
  });

  it("maps provider timeout to a public timeout response", async () => {
    analyzeDecision.mockRejectedValue(new AnalysisError("PROVIDER_TIMEOUT"));

    const response = await POST(request({ memo: "a".repeat(80) }));

    expect(response.status).toBe(504);
    expect(await body(response)).toEqual({ error: "ANALYSIS_TIMEOUT" });
  });

  it.each([
    ["PROVIDER_FAILURE", 502, "ANALYSIS_UNAVAILABLE"],
    ["PROVIDER_AUTH", 502, "ANALYSIS_UNAVAILABLE"],
    ["PROVIDER_RATE_LIMIT", 503, "ANALYSIS_BUSY"],
    ["PROVIDER_BAD_REQUEST", 422, "ANALYSIS_REQUEST_REJECTED"],
    ["PROVIDER_REFUSAL", 422, "ANALYSIS_REFUSED"],
    ["MALFORMED_RESPONSE", 422, "ANALYSIS_COULD_NOT_GROUND"],
  ] as const)(
    "maps %s to a safe differentiated public response",
    async (code, status, publicCode) => {
      analyzeDecision.mockRejectedValue(new AnalysisError(code, {
        cause: new Error(`provider body containing ${apiKey}`),
      }));

      const response = await POST(request({ memo: "a".repeat(80) }));
      const serialized = JSON.stringify(await body(response));

      expect(response.status).toBe(status);
      expect(serialized).toBe(JSON.stringify({ error: publicCode }));
      expect(serialized).not.toContain(apiKey);
      expect(serialized).not.toContain("provider body");
    },
  );

  it("keeps runtime binding failures behind the public error boundary", async () => {
    getRuntimeEnv.mockRejectedValue(new Error(`binding failure containing ${apiKey}`));

    const response = await POST(request({ memo: "a".repeat(80) }));
    const serialized = JSON.stringify(await body(response));

    expect(response.status).toBe(502);
    expect(serialized).toBe(JSON.stringify({ error: "ANALYSIS_UNAVAILABLE" }));
    expect(serialized).not.toContain(apiKey);
  });

  it("does not log submitted memos or provider output", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const memo = `private:${"a".repeat(80)}`;
    analyzeDecision.mockResolvedValue({ privateOutput: "provider-secret" });

    await POST(request({ memo }));

    expect(consoleLog).not.toHaveBeenCalled();
    consoleLog.mockRestore();
  });
});
