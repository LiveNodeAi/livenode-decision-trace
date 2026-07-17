import { randomUUID } from "node:crypto";

import {
  analyzeDecision,
  type ResponsesClient,
} from "@/lib/analyze-decision";
import type { DecisionTrace } from "@/lib/decision-trace-schema";
import type { SourceRange } from "@/lib/transcript-contract";
import { isHighImpactMemo } from "@/lib/high-impact";
import {
  hashTranscript,
  validateSourceRanges,
  validateTranscript,
} from "@/lib/transcript-validation";

const CONTEXT_CHARACTERS = 200;

function escapeXmlData(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export type AnalyzeTopicArgs = {
  client: ResponsesClient;
  transcript: string;
  transcriptHash: string;
  topic: {
    id: string;
    editedTitle: string;
    ranges: SourceRange[];
  };
  model: string;
};

export type TopicTraceResult = {
  topicId: string;
  attemptId: string;
  sourceRanges: SourceRange[];
  trace: DecisionTrace;
  highImpact: boolean;
};

export type TopicAnalysisErrorCode =
  | "INVALID_REQUEST"
  | "HASH_MISMATCH"
  | "INVALID_SOURCE_RANGE"
  | "TOPIC_NOT_GROUNDED";

export class TopicAnalysisError extends Error {
  readonly code: TopicAnalysisErrorCode;

  constructor(code: TopicAnalysisErrorCode) {
    super(code);
    this.name = "TopicAnalysisError";
    this.code = code;
  }
}

function buildBoundedTopicMemo(
  transcript: string,
  editedTitle: string,
  ranges: SourceRange[],
): string {
  const sources = ranges.map((range, index) => {
    const contextStart = Math.max(0, range.start - CONTEXT_CHARACTERS);
    const contextEnd = Math.min(transcript.length, range.end + CONTEXT_CHARACTERS);
    return `<source index="${index + 1}" start="${range.start}" end="${range.end}">\n`
      + `<before>${escapeXmlData(transcript.slice(contextStart, range.start))}</before>\n`
      + `<verified_excerpt>${escapeXmlData(range.excerpt)}</verified_excerpt>\n`
      + `<after>${escapeXmlData(transcript.slice(range.end, contextEnd))}</after>\n`
      + `</source>`;
  }).join("\n");

  return `<topic_data trust="untrusted">\n`
    + `<edited_title>${escapeXmlData(editedTitle)}</edited_title>\n`
    + `<verified_sources>\n${sources}\n</verified_sources>\n`
    + `</topic_data>`;
}

function hasGroundedEvidence(trace: DecisionTrace): boolean {
  return [
    ...trace.situation.context,
    ...trace.assumptions,
    ...trace.criteria,
    ...trace.recommendation.reasoning,
  ].some((item) => !item.inference && item.evidence !== null);
}

export async function analyzeTopic(args: AnalyzeTopicArgs): Promise<TopicTraceResult> {
  const validation = validateTranscript(args.transcript);
  if (!validation.ok) throw new TopicAnalysisError("INVALID_REQUEST");
  if (
    typeof args.transcriptHash !== "string"
    || !/^[a-f0-9]{64}$/.test(args.transcriptHash)
    || await hashTranscript(validation.transcript) !== args.transcriptHash
  ) {
    throw new TopicAnalysisError("HASH_MISMATCH");
  }
  if (
    typeof args.topic !== "object"
    || args.topic === null
    || !/^topic-[1-5]$/.test(args.topic.id)
    || typeof args.topic.editedTitle !== "string"
    || args.topic.editedTitle.trim().length === 0
  ) {
    throw new TopicAnalysisError("INVALID_REQUEST");
  }

  const topicForValidation = {
    id: args.topic.id,
    title: args.topic.editedTitle,
    summary: args.topic.editedTitle,
    ranges: args.topic.ranges,
  };
  const rangeValidation = validateSourceRanges(validation.transcript, [topicForValidation]);
  if (!rangeValidation.ok) {
    throw new TopicAnalysisError(
      rangeValidation.code === "INVALID_SOURCE_RANGE" ? "INVALID_SOURCE_RANGE" : "INVALID_REQUEST",
    );
  }

  const memo = buildBoundedTopicMemo(
    validation.transcript,
    args.topic.editedTitle,
    args.topic.ranges,
  );
  const groundingMemo = args.topic.ranges.map(({ excerpt }) => excerpt).join("\n\n");
  const trace = await analyzeDecision({
    client: args.client,
    memo,
    groundingMemo,
    model: args.model,
  });
  if (!hasGroundedEvidence(trace)) throw new TopicAnalysisError("TOPIC_NOT_GROUNDED");

  return {
    topicId: args.topic.id,
    attemptId: randomUUID(),
    sourceRanges: args.topic.ranges.map((range) => ({ ...range })),
    trace,
    highImpact: isHighImpactMemo(args.topic.ranges.map(({ excerpt }) => excerpt).join("\n")),
  };
}
