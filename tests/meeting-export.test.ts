import { describe, expect, it } from "vitest";

import type { DecisionTrace } from "@/lib/decision-trace-schema";
import {
  buildMeetingManifest,
  createMeetingZip,
  toMeetingActionsMarkdown,
  toMeetingSummaryMarkdown,
  type MeetingExportInput,
} from "@/lib/meeting-export";

const trace: DecisionTrace = {
  language: "ja",
  situation: { decision: "段階導入する", context: [{ text: "現状", evidence: "現状", inference: false }] },
  assumptions: [{ text: "担当者を確保できる", evidence: null, inference: true }],
  criteria: [{ text: "負荷", evidence: "負荷", inference: false }],
  options: [
    { name: "一括", benefits: ["速い"], costs: ["重い"], risks: [], reversible: false },
    { name: "段階", benefits: ["戻せる"], costs: ["時間"], risks: [], reversible: true },
  ],
  recommendation: {
    option: "段階",
    reasoning: [{ text: "小さく試せる", evidence: null, inference: true }],
    confidence: "medium",
    changeConditions: ["担当者が3人以上になった場合"],
  },
  nextActions: [
    { order: 2, action: "結果を確認する" },
    { order: 1, action: "対象を決める" },
  ],
  links: [],
};

function topic(id: "topic-1" | "topic-2" | "topic-3", title: string) {
  return { id, title, summary: `${title}の要約`, ranges: [{ start: 0, end: 3, excerpt: "議題A" }] };
}

const input: MeetingExportInput = {
  meetingTitle: "定例会議",
  meetingDate: "2026-07-17",
  topics: [
    { status: "success", topic: topic("topic-1", "受付方式"), editedTitle: "受付方式", trace },
    { status: "failed", topic: topic("topic-2", "広報計画"), editedTitle: "広報計画", errorCode: "PROVIDER_TIMEOUT" },
  ],
};

describe("meeting export", () => {
  it("deterministically builds summary and actions from allowed trace fields in input order", () => {
    const first = toMeetingSummaryMarkdown(input);
    const second = toMeetingSummaryMarkdown(structuredClone(input));

    expect(first).toBe(second);
    expect(first).toContain("定例会議");
    expect(first).toContain("段階");
    expect(first).toContain("担当者が3人以上になった場合");
    expect(first.indexOf("対象を決める")).toBeLessThan(first.indexOf("結果を確認する"));
    expect(first).toContain("広報計画");
    expect(first).toContain("PROVIDER_TIMEOUT");
    expect(first).not.toContain("一括");
    expect(first).not.toContain("担当者を確保できる");

    const actions = toMeetingActionsMarkdown(input);
    expect(actions.indexOf("対象を決める")).toBeLessThan(actions.indexOf("結果を確認する"));
    expect(actions).toContain("広報計画");
    expect(actions).toContain("PROVIDER_TIMEOUT");
  });

  it("creates traversal-safe, unique, Unicode-safe bounded paths and a metadata-only manifest", () => {
    const longTitle = `${"長".repeat(80)}😀`;
    const manifest = buildMeetingManifest({
      meetingTitle: "../秘密/会議",
      meetingDate: "2026-07-17",
      topics: [
        { status: "success", topic: topic("topic-1", "秘密"), editedTitle: "../秘密", trace },
        { status: "success", topic: topic("topic-2", "秘密"), editedTitle: "..\\秘密", trace },
        { status: "success", topic: topic("topic-3", longTitle), editedTitle: longTitle, trace },
      ],
    });
    const serialized = JSON.stringify(manifest);
    const paths = manifest.topics.flatMap((entry) => entry.files ?? []);

    expect(manifest.rootDirectory).not.toContain("..");
    expect(paths.every((path) => !path.includes("..") && !path.includes("\\"))).toBe(true);
    expect(paths.some((path) => path.includes("-2/Decision-Trace.md"))).toBe(true);
    expect(paths.every((path) => !path.includes("�"))).toBe(true);
    expect(paths.every((path) => path.split("/")[0]!.length <= 52)).toBe(true);
    expect(serialized).not.toContain("議題A");
    expect(serialized).not.toContain("段階導入する");
    expect(serialized).not.toContain("小さく試せる");
  });

  it("creates a byte-identical partial-success ZIP with the specified Markdown structure", async () => {
    const JSZip = (await import("jszip")).default;
    const first = new Uint8Array(await (await createMeetingZip(input)).arrayBuffer());
    const second = new Uint8Array(await (await createMeetingZip(structuredClone(input))).arrayBuffer());
    expect(first).toEqual(second);

    const zip = await JSZip.loadAsync(first);
    const names = Object.keys(zip.files).filter((name) => !zip.files[name]!.dir);
    expect(names).toContain("2026-07-17_定例会議/00-meeting-summary.md");
    expect(names).toContain("2026-07-17_定例会議/01-受付方式/Decision-Trace.md");
    expect(names).toContain("2026-07-17_定例会議/01-受付方式/KX-Note.md");
    expect(names).toContain("2026-07-17_定例会議/99-actions.md");
    expect(names).toContain("2026-07-17_定例会議/manifest.json");
    expect(names.some((name) => name.includes("02-広報計画/"))).toBe(false);
    expect(await zip.file("2026-07-17_定例会議/00-meeting-summary.md")!.async("string")).toContain("広報計画");
  });

  it("refuses to create a ZIP when every topic failed", async () => {
    const failed: MeetingExportInput = {
      ...input,
      topics: input.topics.map((entry) => ({
        status: "failed" as const,
        topic: entry.topic,
        editedTitle: entry.editedTitle,
        errorCode: "MALFORMED_RESPONSE",
      })),
    };

    await expect(createMeetingZip(failed)).rejects.toThrow("at least one successful topic");
  });
});
