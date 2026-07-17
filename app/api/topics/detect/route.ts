import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

import { AnalysisError, type ResponsesClient } from "@/lib/analyze-decision";
import { detectTopics } from "@/lib/detect-topics";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { validateTranscript } from "@/lib/transcript-validation";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 140 * 1024;

function errorResponse(error: string, status: number, retryable = false) {
  return Response.json({ error, retryable }, { status });
}

async function readTranscript(request: Request): Promise<{ transcript?: unknown; tooLarge: boolean }> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) return { tooLarge: true };
  try {
    if (!request.body) return { tooLarge: false };
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) { await reader.cancel(); return { tooLarge: true }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (typeof body !== "object" || body === null) return { tooLarge: false };
    return { transcript: (body as { transcript?: unknown }).transcript, tooLarge: false };
  } catch { return { tooLarge: false }; }
}

function responsesClient(openai: OpenAI): ResponsesClient {
  return { async create(request, options) {
    const response = await openai.responses.create(request as unknown as ResponseCreateParamsNonStreaming, options);
    return { output_text: response.output_text, output: response.output.map((item) => ({
      type: item.type,
      content: "content" in item && Array.isArray(item.content) ? item.content.map((content) => ({ type: content.type, refusal: content.type === "refusal" ? content.refusal : undefined })) : undefined,
    })) };
  } };
}

export async function POST(request: Request): Promise<Response> {
  const body = await readTranscript(request);
  if (body.tooLarge) return errorResponse("REQUEST_TOO_LARGE", 413);
  const validation = validateTranscript(body.transcript);
  if (!validation.ok) return errorResponse(validation.code, validation.code === "REQUEST_TOO_LARGE" ? 413 : 400);
  try {
    const env = await getRuntimeEnv();
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const rateLimit = await env.TOPIC_DETECTION_RATE_LIMITER.limit({ key: `topics:detect:${ip}` });
    if (!rateLimit.success) return errorResponse("RATE_LIMITED", 429, true);
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    return Response.json(await detectTopics({ client: responsesClient(openai), transcript: validation.transcript, model: env.TOPIC_DETECTION_MODEL }));
  } catch (error) {
    if (error instanceof AnalysisError) {
      if (error.code === "PROVIDER_TIMEOUT") return errorResponse("PROVIDER_TIMEOUT", 504, true);
      if (error.code === "PROVIDER_REFUSAL") return errorResponse("PROVIDER_REFUSED", 422);
      if (error.code === "MALFORMED_RESPONSE") return errorResponse("MALFORMED_RESPONSE", 422, true);
      if (error.code === "PROVIDER_BAD_REQUEST") return errorResponse("INVALID_REQUEST", 422);
      if (error.code === "PROVIDER_RATE_LIMIT" || error.code === "PROVIDER_FAILURE" || error.code === "PROVIDER_AUTH") return errorResponse("PROVIDER_BUSY", 503, true);
    }
    return errorResponse("PROVIDER_BUSY", 502, true);
  }
}
