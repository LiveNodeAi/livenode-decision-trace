import { describe, expect, it } from "vitest";

import { resolveSegmentIds, segmentTranscript } from "@/lib/transcript-segments";

describe("segmentTranscript", () => {
  it("preserves every UTF-16 code unit while preferring sentence and newline boundaries", () => {
    const repeated = "同じ発言です。";
    const transcript = ` 冒頭の空白\n短い発話。${"長い説明".repeat(230)}😀終端。\r\n${repeated}${repeated}${"補足".repeat(2_821)}`;
    const segments = segmentTranscript(transcript);

    expect(transcript).toHaveLength(6_595);
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.map(({ id }) => id)).toEqual(segments.map((_, index) => `segment-${index + 1}`));
    expect(segments.every(({ start, end, text }) => end > start && end - start <= 800 && transcript.slice(start, end) === text)).toBe(true);
    expect(segments.map(({ text }) => text).join("")).toBe(transcript);
    expect(segments[0].start).toBe(0);
    expect(segments.at(-1)?.end).toBe(transcript.length);
    for (let index = 1; index < segments.length; index += 1) expect(segments[index].start).toBe(segments[index - 1].end);
    for (const segment of segments.slice(0, -1)) {
      const lastCodeUnit = transcript.charCodeAt(segment.end - 1);
      const nextCodeUnit = transcript.charCodeAt(segment.end);
      expect(!(lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff && nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)).toBe(true);
    }
  });

  it("keeps repeated text as distinct stable segments and resolves IDs in source order", () => {
    const sentence = `${"反復する判断".repeat(70)}。`;
    const transcript = `${sentence}\n${sentence}`;
    const segments = segmentTranscript(transcript);
    expect(segments).toHaveLength(2);
    expect(segments[0].text).not.toBe("");
    expect(segments[0].text.replace(/\n$/, "")).toBe(segments[1].text);
    expect(resolveSegmentIds(segments, ["segment-2", "segment-1"])).toEqual(segments.map(({ start, end, text }) => ({ start, end, excerpt: text })));
    expect(resolveSegmentIds(segments, ["segment-1", "segment-1"])).toBeUndefined();
    expect(resolveSegmentIds(segments, ["segment-99"])).toBeUndefined();
  });

  it("does not split a surrogate pair at the 800-code-unit fallback boundary", () => {
    const transcript = `${"a".repeat(799)}😀${"b".repeat(20)}`;
    const segments = segmentTranscript(transcript);
    expect(segments[0].end).toBe(799);
    expect(segments.map(({ text }) => text).join("")).toBe(transcript);
  });
});
