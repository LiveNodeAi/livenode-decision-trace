import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

import { AnalysisError, type ResponsesClient } from "@/lib/analyze-decision";
import {
  analyzeTopic,
  TopicAnalysisError,
  type AnalyzeTopicArgs,
} from "@/lib/analyze-topic";
import { getRuntimeEnv } from "@/lib/runtime-env";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 140 * 1024;

class RequestReadError extends Error {
  constructor(readonly code: "INVALID_REQUEST" | "REQUEST_TOO_LARGE") {
    super(code);
  }
}

function errorResponse(error: string, status: number, retryable = false): Response {
  return Response.json({ error, retryable }, { status });
}

async function readBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new RequestReadError("REQUEST_TOO_LARGE");
  }
  if (!request.body) throw new RequestReadError("INVALID_REQUEST");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new RequestReadError("REQUEST_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new RequestReadError("INVALID_REQUEST");
  }
}

function responsesClient(openai: OpenAI): ResponsesClient {
  return {
    async create(request, options) {
      const response = await openai.responses.create(
        request as unknown as ResponseCreateParamsNonStreaming,
        options,
      );
      return {
        output_text: response.output_text,
        output: response.output.map((item) => ({
          type: item.type,
          content: "content" in item && Array.isArray(item.content)
            ? item.content.map((content) => ({
                type: content.type,
                refusal: content.type === "refusal" ? content.refusal : undefined,
              }))
            : undefined,
        })),
      };
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readBody(request);
    if (typeof body !== "object" || body === null) {
      return errorResponse("INVALID_REQUEST", 400);
    }
    const input = body as Partial<Pick<AnalyzeTopicArgs, "transcript" | "transcriptHash" | "topic">>;
    const env = await getRuntimeEnv();
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const rateLimit = await env.DECISION_TRACE_RATE_LIMITER.limit({ key: `topics:analyze:${ip}` });
    if (!rateLimit.success) return errorResponse("RATE_LIMITED", 429, true);

    const result = await analyzeTopic({
      client: responsesClient(new OpenAI({ apiKey: env.OPENAI_API_KEY })),
      transcript: input.transcript as string,
      transcriptHash: input.transcriptHash as string,
      topic: input.topic as AnalyzeTopicArgs["topic"],
      model: env.OPENAI_MODEL,
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof RequestReadError) {
      return errorResponse(error.code, error.code === "REQUEST_TOO_LARGE" ? 413 : 400);
    }
    if (error instanceof TopicAnalysisError) {
      if (error.code === "TOPIC_NOT_GROUNDED") return errorResponse(error.code, 422);
      return errorResponse(error.code, 400);
    }
    if (error instanceof AnalysisError) {
      if (error.code === "PROVIDER_TIMEOUT") return errorResponse("PROVIDER_TIMEOUT", 504);
      if (error.code === "PROVIDER_REFUSAL") return errorResponse("PROVIDER_REFUSED", 422);
      if (error.code === "PROVIDER_RATE_LIMIT") return errorResponse("PROVIDER_BUSY", 503, true);
      if (error.code === "MALFORMED_RESPONSE") return errorResponse("TOPIC_NOT_GROUNDED", 422);
    }
    return errorResponse("PROVIDER_BUSY", 502, true);
  }
}
