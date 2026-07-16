import type { DecisionTrace } from "@/lib/decision-trace-schema";
import { toDecisionTraceMarkdown, toKxNoteMarkdown } from "@/lib/markdown";

const trace: DecisionTrace = {
  language: "ja",
  situation: {
    decision: "新機能を今期に実装するか",
    context: [{ text: "利用者から要望がある", evidence: "面談記録", inference: false }],
  },
  assumptions: [{ text: "開発時間を確保できる", evidence: null, inference: true }],
  criteria: [{ text: "利用者価値を優先する", evidence: "方針資料", inference: false }],
  options: [
    { name: "今期に実装", benefits: ["早く価値を届けられる"], costs: ["他の開発が遅れる"], risks: ["検証不足"], reversible: true },
    { name: "来期に延期", benefits: ["検証時間を取れる"], costs: ["提供が遅れる"], risks: [], reversible: true },
  ],
  recommendation: {
    option: "今期に実装",
    reasoning: [{ text: "小さく試せる", evidence: "技術調査", inference: false }],
    confidence: "medium",
    changeConditions: ["開発時間を確保できない場合"],
  },
  nextActions: [{ order: 1, action: "試作範囲を決める" }],
  links: [{ label: "利用者面談", relationship: "要望の根拠", sourceExcerpt: "入力時間を減らしたい" }],
};

it("formats a Decision Trace with its canonical sections", () => {
  expect(toDecisionTraceMarkdown(trace)).toContain("## Situation");
  expect(toDecisionTraceMarkdown(trace)).toContain("## Next actions");
});

it("formats a KX note with its canonical sections", () => {
  expect(toKxNoteMarkdown(trace)).toMatch(/## Claim[\s\S]*## Evidence[\s\S]*## Data[\s\S]*## Constraints[\s\S]*## Links/);
  expect(toKxNoteMarkdown(trace)).toContain("## Operational next actions");
});
