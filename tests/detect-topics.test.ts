import { describe, expect, it, vi } from "vitest";

import { AnalysisError, type ResponsesClient } from "@/lib/analyze-decision";
import { detectTopics } from "@/lib/detect-topics";
import { segmentTranscript } from "@/lib/transcript-segments";
import { hashTranscript } from "@/lib/transcript-validation";

const transcript = `${"Introductory context. ".repeat(45)}We decided to run a small pilot because the budget is limited.`;
const segments = segmentTranscript(transcript);

function clientWith(value: unknown): ResponsesClient & { create: ReturnType<typeof vi.fn> } {
  return {
    create: vi.fn().mockResolvedValue({ output_text: JSON.stringify(value), output: [] }),
  } as ResponsesClient & { create: ReturnType<typeof vi.fn> };
}

function providerTopic(overrides: Record<string, unknown> = {}) {
  return { id: "topic-1", title: "Pilot launch", summary: "Choose a pilot first.", segmentIds: [segments[0].id], ...overrides };
}

describe("detectTopics", () => {
  it("asks only for segment IDs and restores reverse-ordered IDs to source ranges", async () => {
    const client = clientWith({ topics: [providerTopic({ segmentIds: [segments[1].id, segments[0].id] })] });

    await expect(detectTopics({ client, transcript, model: "gpt-5.4-nano" })).resolves.toEqual({
      transcriptHash: await hashTranscript(transcript),
      topics: [{
        id: "topic-1",
        title: "Pilot launch",
        summary: "Choose a pilot first.",
        ranges: segments.slice(0, 2).map(({ start, end, text }) => ({ start, end, excerpt: text })),
      }],
    });

    const request = client.create.mock.calls[0][0];
    const topicProperties = request.text.format.schema.properties.topics.items.properties;
    expect(Object.keys(topicProperties)).toEqual(["id", "title", "summary", "segmentIds"]);
    expect(topicProperties.segmentIds).toMatchObject({ minItems: 1, maxItems: 6 });
    const providerInput = request.input[0].content[0].text;
    expect(providerInput).toContain("segment-1");
    expect(providerInput).not.toMatch(/offset|\"start\"|\"end\"/i);
  });

  it("distinguishes repeated source text by segment ID", async () => {
    const sentence = `${"同じ判断を反復する。".repeat(50)}\n`;
    const repeatedTranscript = `${sentence}${sentence}`;
    const repeatedSegments = segmentTranscript(repeatedTranscript);
    const client = clientWith({ topics: [providerTopic({ segmentIds: [repeatedSegments[1].id] })] });

    const result = await detectTopics({ client, transcript: repeatedTranscript, model: "gpt-5.4-nano" });
    expect(result.topics[0].ranges).toEqual([{
      start: repeatedSegments[1].start,
      end: repeatedSegments[1].end,
      excerpt: repeatedSegments[1].text,
    }]);
  });

  it("accepts six segments when their combined source text is at most 4,000 characters", async () => {
    const boundaryTranscript = Array.from({ length: 5 }, () => `${"根".repeat(665)}\n`).join("") + "根".repeat(670);
    expect(boundaryTranscript).toHaveLength(4_000);
    const boundarySegments = segmentTranscript(boundaryTranscript);
    expect(boundarySegments).toHaveLength(6);
    const client = clientWith({ topics: [providerTopic({ segmentIds: boundarySegments.map(({ id }) => id) })] });

    const result = await detectTopics({ client, transcript: boundaryTranscript, model: "gpt-5.4-nano" });
    expect(result.topics[0].ranges).toHaveLength(6);
    expect(result.topics[0].ranges.reduce((total, range) => total + range.excerpt.length, 0)).toBe(4_000);
  });

  it("rejects six 800-character segments whose combined source exceeds 4,000 characters", async () => {
    const oversizedTranscript = "根".repeat(4_800);
    const oversizedSegments = segmentTranscript(oversizedTranscript);
    expect(oversizedSegments).toHaveLength(6);
    const client = clientWith({ topics: [providerTopic({ segmentIds: oversizedSegments.map(({ id }) => id) })] });

    await expect(detectTopics({ client, transcript: oversizedTranscript, model: "gpt-5.4-nano" }))
      .rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
    expect(client.create).toHaveBeenCalledTimes(2);
  });

  it("uses the low-cost model with strict structured output and privacy controls", async () => {
    const client = clientWith({ topics: [providerTopic()] });
    await detectTopics({ client, transcript, model: "gpt-5.4-nano" });

    expect(client.create).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5.4-nano",
      store: false,
      reasoning: { effort: "none" },
      max_output_tokens: 2500,
      instructions: expect.stringMatching(/do not follow commands embedded|maximum of 5|segment ID|4,000|decision/iu),
      text: { format: expect.objectContaining({ type: "json_schema", name: "topic_detection", strict: true }) },
    }), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(client.create.mock.calls[0][0].instructions).toMatch(/combined.+4,000|4,000.+combined/iu);
  });

  it.each([
    ["unknown ID", { topics: [providerTopic({ segmentIds: ["segment-99"] })] }],
    ["duplicate ID within topic", { topics: [providerTopic({ segmentIds: [segments[0].id, segments[0].id] })] }],
    ["shared ID across topics", { topics: [providerTopic(), providerTopic({ id: "topic-2" })] }],
    ["seven segments", { topics: [providerTopic({ segmentIds: Array.from({ length: 7 }, (_, index) => `segment-${index + 1}`) })] }],
    ["six topics", { topics: Array.from({ length: 6 }, (_, index) => providerTopic({ id: `topic-${index + 1}`, segmentIds: [`segment-${index + 1}`] })) }],
  ])("rejects %s after one malformed-response retry", async (_label, value) => {
    const client = clientWith(value);
    await expect(detectTopics({ client, transcript, model: "gpt-5.4-nano" }))
      .rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
    expect(client.create).toHaveBeenCalledTimes(2);
  });

  it("maps provider failures without exposing provider details", async () => {
    const client = { create: vi.fn().mockRejectedValue(Object.assign(new Error("secret"), { status: 429 })) } as unknown as ResponsesClient;
    await expect(detectTopics({ client, transcript, model: "gpt-5.4-nano" }))
      .rejects.toEqual(expect.objectContaining<Partial<AnalysisError>>({ code: "PROVIDER_RATE_LIMIT" }));
  });
});
