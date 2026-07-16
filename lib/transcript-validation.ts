import type { DetectedTopic, SourceRange } from "@/lib/transcript-contract";

const MIN_TRANSCRIPT_LENGTH = 80;
const MAX_TRANSCRIPT_LENGTH = 30_000;
const MAX_REQUEST_BYTES = 140 * 1024;
const MAX_TOPICS = 5;
const MAX_RANGES_PER_TOPIC = 6;
const MAX_QUOTED_CHARACTERS_PER_TOPIC = 4_000;

export type TranscriptValidation =
  | { ok: true; transcript: string }
  | {
      ok: false;
      code:
        | "INVALID_REQUEST"
        | "TRANSCRIPT_TOO_SHORT"
        | "TRANSCRIPT_TOO_LONG"
        | "REQUEST_TOO_LARGE";
    };

export type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_REQUEST" | "INVALID_SOURCE_RANGE" | "TOO_MANY_TOPICS";
    };

export function validateTranscript(value: unknown): TranscriptValidation {
  if (typeof value !== "string") return { ok: false, code: "INVALID_REQUEST" };

  const transcript = value.trim();
  if (new TextEncoder().encode(transcript).byteLength > MAX_REQUEST_BYTES) {
    return { ok: false, code: "REQUEST_TOO_LARGE" };
  }
  if (transcript.length < MIN_TRANSCRIPT_LENGTH) {
    return { ok: false, code: "TRANSCRIPT_TOO_SHORT" };
  }
  if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
    return { ok: false, code: "TRANSCRIPT_TOO_LONG" };
  }

  return { ok: true, transcript };
}

export async function hashTranscript(transcript: string): Promise<string> {
  const bytes = new TextEncoder().encode(transcript.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateSourceRanges(
  transcript: string,
  topics: DetectedTopic[],
): ValidationResult {
  if (!Array.isArray(topics) || topics.length === 0) {
    return { ok: false, code: "INVALID_REQUEST" };
  }
  if (topics.length > MAX_TOPICS) return { ok: false, code: "TOO_MANY_TOPICS" };

  const topicIds = new Set<string>();
  for (const topic of topics) {
    if (
      typeof topic !== "object" ||
      topic === null ||
      !/^topic-[1-5]$/.test(topic.id) ||
      typeof topic.title !== "string" ||
      topic.title.length === 0 ||
      typeof topic.summary !== "string" ||
      topic.summary.length === 0 ||
      !Array.isArray(topic.ranges) ||
      topic.ranges.length === 0 ||
      topicIds.has(topic.id)
    ) {
      return { ok: false, code: "INVALID_REQUEST" };
    }
    topicIds.add(topic.id);

    if (
      topic.ranges.length > MAX_RANGES_PER_TOPIC ||
      topic.ranges.reduce((total, range) => total + range.excerpt.length, 0) >
        MAX_QUOTED_CHARACTERS_PER_TOPIC
    ) {
      return { ok: false, code: "INVALID_SOURCE_RANGE" };
    }

    for (const range of topic.ranges) {
      if (
        !Number.isInteger(range.start) ||
        !Number.isInteger(range.end) ||
        range.start < 0 ||
        range.start >= range.end ||
        range.end > transcript.length ||
        transcript.slice(range.start, range.end) !== range.excerpt
      ) {
        return { ok: false, code: "INVALID_SOURCE_RANGE" };
      }
    }
  }

  return { ok: true };
}

export function buildTopicSource(transcript: string, ranges: SourceRange[]): string {
  return ranges.map(({ start, end }) => transcript.slice(start, end)).join("\n\n");
}
