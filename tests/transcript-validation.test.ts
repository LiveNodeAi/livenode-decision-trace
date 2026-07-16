import { describe, expect, it } from "vitest";

import {
  buildTopicSource,
  hashTranscript,
  validateSourceRanges,
  validateTranscript,
} from "@/lib/transcript-validation";
import type { DetectedTopic } from "@/lib/transcript-contract";

function topic(overrides: Partial<DetectedTopic> = {}): DetectedTopic {
  return {
    id: "topic-1",
    title: "議題A",
    summary: "判断",
    ranges: [{ start: 0, end: 1, excerpt: "a" }],
    ...overrides,
  };
}

describe("validateTranscript", () => {
  it("trims and accepts 80 through 30,000 UTF-16 code units", () => {
    expect(validateTranscript(`  ${"a".repeat(80)}\r\n`)).toEqual({
      ok: true,
      transcript: "a".repeat(80),
    });
    expect(validateTranscript("a".repeat(30_000))).toMatchObject({ ok: true });
  });

  it("rejects non-strings and transcripts shorter than 80 characters", () => {
    expect(validateTranscript(null)).toEqual({ ok: false, code: "INVALID_REQUEST" });
    expect(validateTranscript("a".repeat(79))).toEqual({ ok: false, code: "TRANSCRIPT_TOO_SHORT" });
  });

  it("rejects transcripts longer than 30,000 characters", () => {
    expect(validateTranscript("a".repeat(30_001))).toEqual({
      ok: false,
      code: "TRANSCRIPT_TOO_LONG",
    });
  });

  it("rejects input larger than 140 KiB before the character limit", () => {
    expect(validateTranscript("あ".repeat(48_000))).toEqual({
      ok: false,
      code: "REQUEST_TOO_LARGE",
    });
  });
});

describe("hashTranscript", () => {
  it("hashes the trimmed transcript without normalizing CRLF", async () => {
    const expected = "18745f36a05e29072709042d6062ce54f1b08ff36c27ba80c39f81fb010c8ce2";
    expect(await hashTranscript("  a\r\nb  ")).toBe(expected);
    expect(await hashTranscript("a\r\nb")).toBe(expected);
    expect(await hashTranscript("a\nb")).not.toBe(expected);
  });
});

describe("validateSourceRanges", () => {
  it("日本語と絵文字を含むUTF-16範囲を完全一致で検証する", () => {
    const transcript = "議題A😀について決める";
    const start = transcript.indexOf("😀");
    expect(
      validateSourceRanges(transcript, [
        topic({ ranges: [{ start, end: start + 3, excerpt: "😀に" }] }),
      ]),
    ).toEqual({ ok: true });
  });

  it("1文字ずれた範囲を拒否する", () => {
    expect(
      validateSourceRanges("abcdef", [
        topic({ ranges: [{ start: 1, end: 3, excerpt: "cd" }] }),
      ]),
    ).toMatchObject({ ok: false, code: "INVALID_SOURCE_RANGE" });
  });

  it("rejects out-of-bounds and non-integer ranges", () => {
    expect(
      validateSourceRanges("abcdef", [topic({ ranges: [{ start: -1, end: 1, excerpt: "a" }] })]),
    ).toMatchObject({ ok: false, code: "INVALID_SOURCE_RANGE" });
    expect(
      validateSourceRanges("abcdef", [topic({ ranges: [{ start: 1.5, end: 2, excerpt: "b" }] })]),
    ).toMatchObject({ ok: false, code: "INVALID_SOURCE_RANGE" });
  });

  it("rejects duplicate topic IDs and six topics", () => {
    expect(validateSourceRanges("a", [topic(), topic()])).toMatchObject({
      ok: false,
      code: "INVALID_REQUEST",
    });
    expect(
      validateSourceRanges(
        "a",
        Array.from({ length: 6 }, (_, index) => topic({ id: `topic-${index + 1}` })),
      ),
    ).toMatchObject({ ok: false, code: "TOO_MANY_TOPICS" });
  });

  it("rejects more than six ranges or 4,000 quoted characters per topic", () => {
    const transcript = "a".repeat(4_001);
    expect(
      validateSourceRanges(transcript, [
        topic({
          ranges: Array.from({ length: 7 }, (_, index) => ({
            start: index,
            end: index + 1,
            excerpt: "a",
          })),
        }),
      ]),
    ).toMatchObject({ ok: false, code: "INVALID_SOURCE_RANGE" });
    expect(
      validateSourceRanges(transcript, [
        topic({ ranges: [{ start: 0, end: 4_001, excerpt: transcript }] }),
      ]),
    ).toMatchObject({ ok: false, code: "INVALID_SOURCE_RANGE" });
  });
});

it("builds topic source from exact UTF-16 slices in range order", () => {
  const transcript = "first\r\n😀second";
  expect(
    buildTopicSource(transcript, [
      { start: 7, end: 9, excerpt: "😀" },
      { start: 0, end: 5, excerpt: "first" },
    ]),
  ).toBe("😀\n\nfirst");
});
