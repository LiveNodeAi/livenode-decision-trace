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

const englishTrace: DecisionTrace = { ...trace, language: "en", links: [] };
const japaneseTraceWithoutLinks: DecisionTrace = { ...trace, links: [] };

it("formats a Japanese Decision Trace with exactly six localized sections", () => {
  const markdown = toDecisionTraceMarkdown(trace);

  expect(markdown.match(/^## .+$/gm)).toEqual([
    "## 状況",
    "## 前提",
    "## 判断基準",
    "## 選択肢",
    "## 推奨",
    "## 次のアクション",
  ]);
  expect(markdown).toContain("**判断:**");
  expect(markdown).toContain("**利点**");
  expect(markdown).toContain("- 元に戻せる: はい");
  expect(markdown).toContain("根拠: 面談記録");
  expect(markdown).toContain("[推論]");
  expect(markdown).not.toContain("## リンク");
});

it("formats an English Decision Trace with exactly six localized sections", () => {
  const markdown = toDecisionTraceMarkdown(englishTrace);

  expect(markdown.match(/^## .+$/gm)).toEqual([
    "## Situation",
    "## Assumptions",
    "## Criteria",
    "## Options",
    "## Recommendation",
    "## Next actions",
  ]);
  expect(markdown).toContain("**Benefits**");
  expect(markdown).toContain("- Reversible: yes");
  expect(markdown).toContain("Evidence: 面談記録");
  expect(markdown).toContain("[inference]");
});

it("places confidence in Claim, options in Data, and assumptions in Constraints", () => {
  const markdown = toKxNoteMarkdown(trace);
  const claim = markdown.match(/## 主張([\s\S]*?)## 根拠/)?.[1];
  const data = markdown.match(/## データ([\s\S]*?)## 制約/)?.[1];
  const constraints = markdown.match(/## 制約([\s\S]*?)## リンク/)?.[1];

  expect(markdown).toMatch(/## 主張[\s\S]*## 根拠[\s\S]*## データ[\s\S]*## 制約[\s\S]*## リンク/);
  expect(claim).toContain("確信度: 中");
  expect(data).toContain("利用者から要望がある");
  expect(data).toContain("今期に実装");
  expect(data).toContain("来期に延期");
  expect(data).not.toContain("開発時間を確保できる");
  expect(constraints).toContain("開発時間を確保できる");
  expect(constraints).toContain("他の開発が遅れる");
  expect(constraints).toContain("検証不足");
  expect(constraints).toContain("開発時間を確保できない場合");
  expect(markdown).toContain("## 運用上の次のアクション");
});

it("uses exact localized empty-link fallbacks", () => {
  expect(toKxNoteMarkdown(japaneseTraceWithoutLinks)).toContain("## リンク\n\n- 入力文に明示された接続はありません。");
  expect(toKxNoteMarkdown(englishTrace)).toContain("## Links\n\n- No explicit connections were supplied.");
});
