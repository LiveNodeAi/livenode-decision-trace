import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalysisError } from "@/lib/analyze-decision";

const { detectTopics, getRuntimeEnv, responsesCreate } = vi.hoisted(() => ({
  detectTopics: vi.fn(), getRuntimeEnv: vi.fn(), responsesCreate: vi.fn(),
}));
vi.mock("@/lib/detect-topics", () => ({ detectTopics }));
vi.mock("@/lib/runtime-env", () => ({ getRuntimeEnv }));
vi.mock("openai", () => ({ default: vi.fn(function OpenAI() { return { responses: { create: responsesCreate } }; }) }));

import { POST } from "@/app/api/topics/detect/route";

const limiter = { limit: vi.fn() };
const transcript = "a".repeat(80);
function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/topics/detect", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

describe("POST /api/topics/detect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limiter.limit.mockResolvedValue({ success: true });
    getRuntimeEnv.mockResolvedValue({ OPENAI_API_KEY: "secret", TOPIC_DETECTION_MODEL: "gpt-5.4-nano", TOPIC_DETECTION_RATE_LIMITER: limiter });
  });

  it.each([
    ["short transcript", request({ transcript: "a".repeat(79) }), 400, "TRANSCRIPT_TOO_SHORT"],
    ["invalid body", new Request("https://example.test", { method: "POST", body: "{" }), 400, "INVALID_REQUEST"],
    ["oversized declaration", request({ transcript }, { "content-length": String(140 * 1024 + 1) }), 413, "REQUEST_TOO_LARGE"],
  ])("rejects %s before runtime access", async (_label, req, status, error) => {
    const response = await POST(req);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error, retryable: false });
    expect(getRuntimeEnv).not.toHaveBeenCalled();
  });

  it("rejects an oversized streamed body before JSON parsing", async () => {
    const response = await POST(request({ transcript: "界".repeat(50_000) }, { "content-length": "10" }));
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "REQUEST_TOO_LARGE", retryable: false });
    expect(getRuntimeEnv).not.toHaveBeenCalled();
  });

  it("uses a detection-specific rate key and model", async () => {
    const detection = { transcriptHash: "a".repeat(64), topics: [] };
    detectTopics.mockResolvedValue(detection);
    const response = await POST(request({ transcript }, { "cf-connecting-ip": "203.0.113.8" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(detection);
    expect(limiter.limit).toHaveBeenCalledWith({ key: "topics:detect:203.0.113.8" });
    expect(detectTopics).toHaveBeenCalledWith(expect.objectContaining({ transcript, model: "gpt-5.4-nano", client: expect.objectContaining({ create: expect.any(Function) }) }));
  });

  it("returns a stable non-retryable rate-limit error", async () => {
    limiter.limit.mockResolvedValue({ success: false });
    const response = await POST(request({ transcript }));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "RATE_LIMITED", retryable: true });
    expect(detectTopics).not.toHaveBeenCalled();
  });

  it.each([
    ["PROVIDER_TIMEOUT", 504, "PROVIDER_TIMEOUT", true],
    ["PROVIDER_REFUSAL", 422, "PROVIDER_REFUSED", false],
    ["PROVIDER_RATE_LIMIT", 503, "PROVIDER_BUSY", true],
    ["MALFORMED_RESPONSE", 422, "MALFORMED_RESPONSE", true],
    ["PROVIDER_FAILURE", 503, "PROVIDER_BUSY", true],
  ] as const)("maps %s to a safe public response", async (code, status, publicCode, retryable) => {
    detectTopics.mockRejectedValue(new AnalysisError(code, { cause: new Error(`provider ${transcript}`) }));
    const response = await POST(request({ transcript }));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: publicCode, retryable });
  });
});
