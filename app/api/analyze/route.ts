import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

import {
  AnalysisError,
  analyzeDecision,
  type ResponsesClient,
} from "@/lib/analyze-decision";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { validateMemo } from "@/lib/validation";

export const runtime = "nodejs";

export type PublicErrorCode =
  | "INVALID_REQUEST"
  | "MEMO_TOO_SHORT"
  | "MEMO_TOO_LONG"
  | "RATE_LIMITED"
  | "ANALYSIS_TIMEOUT"
  | "ANALYSIS_UNAVAILABLE";

function errorResponse(error: PublicErrorCode, status: number): Response {
  return Response.json({ error }, { status });
}

async function readMemo(request: Request): Promise<string | undefined> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) return undefined;
    const memo = (body as { memo?: unknown }).memo;
    return typeof memo === "string" ? memo : undefined;
  } catch {
    return undefined;
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
  const memo = await readMemo(request);
  if (memo === undefined) return errorResponse("INVALID_REQUEST", 400);

  const validation = validateMemo(memo);
  if (!validation.ok) return errorResponse(validation.code, 400);

  try {
    const env = await getRuntimeEnv();
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const rateLimit = await env.DECISION_TRACE_RATE_LIMITER.limit({ key: `analyze:${ip}` });
    if (!rateLimit.success) return errorResponse("RATE_LIMITED", 429);

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const trace = await analyzeDecision({
      client: responsesClient(openai),
      memo: validation.memo,
      model: env.OPENAI_MODEL,
    });
    return Response.json({ trace });
  } catch (error) {
    if (error instanceof AnalysisError && error.code === "PROVIDER_TIMEOUT") {
      return errorResponse("ANALYSIS_TIMEOUT", 504);
    }
    return errorResponse("ANALYSIS_UNAVAILABLE", 502);
  }
}
