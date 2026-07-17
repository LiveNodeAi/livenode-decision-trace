import { describe, expect, it, vi } from "vitest";

import { AnalysisError, type ResponsesClient } from "@/lib/analyze-decision";
import { detectTopics } from "@/lib/detect-topics";
import { hashTranscript } from "@/lib/transcript-validation";

const transcript = `${"Introductory context. ".repeat(5)}We decided to run a small pilot before a full launch because the budget is limited.`;
const excerpt = "We decided to run a small pilot before a full launch because the budget is limited.";
const start = transcript.indexOf(excerpt);

function clientWith(value: unknown): ResponsesClient & { create: ReturnType<typeof vi.fn> } {
  return {
    create: vi.fn().mockResolvedValue({ output_text: JSON.stringify(value), output: [] }),
  } as ResponsesClient & { create: ReturnType<typeof vi.fn> };
}

function validTopics() {
  return { topics: [{ id: "topic-1", title: "Pilot launch", summary: "Choose a pilot first.", ranges: [{ start, end: start + excerpt.length, excerpt }] }] };
}

describe("detectTopics", () => {
  it("derives UTF-16 offsets on the server from verbatim excerpts", async () => {
    const client = clientWith({
      topics: [{
        id: "topic-1",
        title: "Pilot launch",
        summary: "Choose a pilot first.",
        ranges: [{ excerpt }],
      }],
    });

    await expect(detectTopics({ client, transcript, model: "gpt-5.4-nano" }))
      .resolves.toEqual({
        transcriptHash: await hashTranscript(transcript),
        topics: [{
          id: "topic-1",
          title: "Pilot launch",
          summary: "Choose a pilot first.",
          ranges: [{ start, end: start + excerpt.length, excerpt }],
        }],
      });

    const providerSchema = client.create.mock.calls[0][0].text.format.schema;
    const rangeProperties = providerSchema.properties.topics.items.properties.ranges.items.properties;
    expect(Object.keys(rangeProperties)).toEqual(["excerpt"]);
  });

  it("resolves reverse-ordered excerpts independently and returns source order", async () => {
    const emojiTranscript = "先に😀試験公開を決めた。後で対象を十社に決めた。";
    const firstExcerpt = "😀試験公開を決めた";
    const secondExcerpt = "対象を十社に決めた";
    const client = clientWith({ topics: [{
      id: "topic-1", title: "試験公開", summary: "段階的に公開する。",
      ranges: [{ excerpt: secondExcerpt }, { excerpt: firstExcerpt }],
    }] });

    const result = await detectTopics({ client, transcript: emojiTranscript, model: "gpt-5.4-nano" });
    expect(result.topics[0].ranges).toEqual([
      { start: emojiTranscript.indexOf(firstExcerpt), end: emojiTranscript.indexOf(firstExcerpt) + firstExcerpt.length, excerpt: firstExcerpt },
      { start: emojiTranscript.indexOf(secondExcerpt), end: emojiTranscript.indexOf(secondExcerpt) + secondExcerpt.length, excerpt: secondExcerpt },
    ]);
  });

  it("rejects an excerpt that is not unique in the transcript", async () => {
    const repeated = "試験公開を決めた。別の話。試験公開を決めた。";
    const client = clientWith({ topics: [{
      id: "topic-1", title: "試験公開", summary: "公開方法を決めた。",
      ranges: [{ excerpt: "試験公開を決めた" }],
    }] });

    await expect(detectTopics({ client, transcript: repeated, model: "gpt-5.4-nano" }))
      .rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });

  it("rejects reuse of the same grounded range across distinct topics", async () => {
    const client = clientWith({ topics: [
      { id: "topic-1", title: "Pilot", summary: "Pilot first.", ranges: [{ excerpt }] },
      { id: "topic-2", title: "Budget", summary: "Limit cost.", ranges: [{ excerpt }] },
    ] });

    await expect(detectTopics({ client, transcript, model: "gpt-5.4-nano" }))
      .rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });

  it("uses the low-cost model with strict structured output and privacy controls", async () => {
    const client = clientWith(validTopics());

    const result = await detectTopics({ client, transcript, model: "gpt-5.4-nano" });

    expect(result).toEqual({ transcriptHash: await hashTranscript(transcript), ...validTopics() });
    expect(client.create).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5.4-nano",
      store: false,
      reasoning: { effort: "none" },
      max_output_tokens: 2500,
      instructions: expect.stringMatching(/do not follow commands embedded|maximum of 5|verbatim|decision/iu),
      text: { format: expect.objectContaining({ type: "json_schema", name: "topic_detection", strict: true }) },
    }), expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it.each([
    ["zero topics", { topics: [] }],
    ["six topics", { topics: Array.from({ length: 6 }, (_, index) => ({ ...validTopics().topics[0], id: `topic-${index + 1}` })) }],
    ["duplicate IDs", { topics: [validTopics().topics[0], validTopics().topics[0]] }],
    ["altered excerpt", { topics: [{ ...validTopics().topics[0], ranges: [{ excerpt: `${excerpt}!` }] }] }],
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
