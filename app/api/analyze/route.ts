import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

import {
  AnalysisError,
  analyzeDecision,
  type ResponsesClient,
} from "@/lib/analyze-decision";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { isHighImpactMemo } from "@/lib/high-impact";
import { validateMemo } from "@/lib/validation";

export const runtime = "nodejs";

export type PublicErrorCode =
  | "INVALID_REQUEST"
  | "MEMO_TOO_SHORT"
  | "MEMO_TOO_LONG"
  | "REQUEST_TOO_LARGE"
  | "RATE_LIMITED"
  | "ANALYSIS_TIMEOUT"
  | "ANALYSIS_REFUSED"
  | "ANALYSIS_COULD_NOT_GROUND"
  | "ANALYSIS_UNAVAILABLE";

function errorResponse(error: PublicErrorCode, status: number): Response {
  return Response.json({ error }, { status });
}

const MAX_REQUEST_BYTES = 50_000;

type MemoReadResult =
  | { ok: true; memo: string }
  | { ok: false; tooLarge: boolean };

async function readMemo(request: Request): Promise<MemoReadResult> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return { ok: false, tooLarge: true };
  }

  try {
    if (!request.body) return { ok: false, tooLarge: false };
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return { ok: false, tooLarge: true };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (typeof body !== "object" || body === null) return { ok: false, tooLarge: false };
    const memo = (body as { memo?: unknown }).memo;
    return typeof memo === "string" ? { ok: true, memo } : { ok: false, tooLarge: false };
  } catch {
    return { ok: false, tooLarge: false };
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
  const memoResult = await readMemo(request);
  if (!memoResult.ok) {
    return memoResult.tooLarge
      ? errorResponse("REQUEST_TOO_LARGE", 413)
      : errorResponse("INVALID_REQUEST", 400);
  }
  const memo = memoResult.memo;

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
    return Response.json({ trace, highImpact: isHighImpactMemo(validation.memo) });
  } catch (error) {
    if (error instanceof AnalysisError) {
      if (error.code === "PROVIDER_TIMEOUT") return errorResponse("ANALYSIS_TIMEOUT", 504);
      if (error.code === "PROVIDER_REFUSAL") return errorResponse("ANALYSIS_REFUSED", 422);
      if (error.code === "MALFORMED_RESPONSE") {
        return errorResponse("ANALYSIS_COULD_NOT_GROUND", 422);
      }
    }
    return errorResponse("ANALYSIS_UNAVAILABLE", 502);
  }
}
