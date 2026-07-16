import { describe, expect, it } from "vitest";

import {
  detectedTopicSchema,
  sourceRangeSchema,
  topicDetectionSchema,
} from "@/lib/transcript-contract";

describe("transcript contract", () => {
  const topic = {
    id: "topic-1",
    title: "配信方法",
    summary: "配信方法を比較した",
    ranges: [{ start: 0, end: 2, excerpt: "議題" }],
  };

  it("accepts a grounded topic detection result", () => {
    expect(topicDetectionSchema.parse({ transcriptHash: "a".repeat(64), topics: [topic] })).toEqual({
      transcriptHash: "a".repeat(64),
      topics: [topic],
    });
  });

  it("requires integer source range offsets", () => {
    expect(sourceRangeSchema.safeParse({ start: 0.5, end: 2, excerpt: "議題" }).success).toBe(false);
    expect(sourceRangeSchema.safeParse({ start: 2, end: 2, excerpt: "議題" }).success).toBe(false);
  });

  it("limits total quoted characters per topic to 4,000", () => {
    expect(
      detectedTopicSchema.safeParse({
        ...topic,
        ranges: [
          { start: 0, end: 2_001, excerpt: "a".repeat(2_001) },
          { start: 2_001, end: 4_001, excerpt: "a".repeat(2_000) },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires topic-N identifiers and one to six ranges", () => {
    expect(detectedTopicSchema.safeParse({ ...topic, id: "first" }).success).toBe(false);
    expect(detectedTopicSchema.safeParse({ ...topic, ranges: [] }).success).toBe(false);
    expect(
      detectedTopicSchema.safeParse({
        ...topic,
        ranges: Array.from({ length: 7 }, (_, index) => ({
          start: index,
          end: index + 1,
          excerpt: "a",
        })),
      }).success,
    ).toBe(false);
  });

  it("rejects six topics", () => {
    expect(
      topicDetectionSchema.safeParse({
        transcriptHash: "a".repeat(64),
        topics: Array.from({ length: 6 }, (_, index) => ({ ...topic, id: `topic-${index + 1}` })),
      }).success,
    ).toBe(false);
  });
});
