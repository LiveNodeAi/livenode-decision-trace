import type { DecisionTrace } from "./decision-trace-schema";

type GroundedItem = DecisionTrace["assumptions"][number];
type Language = DecisionTrace["language"];

const copy = {
  ja: {
    traceTitle: "意思決定の軌跡",
    situation: "状況",
    assumptions: "前提",
    criteria: "判断基準",
    options: "選択肢",
    recommendation: "推奨",
    nextActions: "次のアクション",
    decision: "判断",
    benefits: "利点",
    costs: "コスト",
    risks: "リスク",
    reversible: "元に戻せる",
    yes: "はい",
    no: "いいえ",
    option: "選択肢",
    confidence: "確信度",
    confidenceValues: { low: "低", medium: "中", high: "高" },
    changeConditions: "判断を変える条件",
    evidenceLabel: "根拠",
    inferenceLabel: "推論",
    none: "なし",
    kxTitle: "KXノート",
    claim: "主張",
    evidence: "根拠",
    data: "データ",
    constraints: "制約",
    links: "リンク",
    operationalNextActions: "運用上の次のアクション",
    consideredOptions: "検討した選択肢",
    emptyLinks: "入力文に明示された接続はありません。",
  },
  en: {
    traceTitle: "Decision Trace",
    situation: "Situation",
    assumptions: "Assumptions",
    criteria: "Criteria",
    options: "Options",
    recommendation: "Recommendation",
    nextActions: "Next actions",
    decision: "Decision",
    benefits: "Benefits",
    costs: "Costs",
    risks: "Risks",
    reversible: "Reversible",
    yes: "yes",
    no: "no",
    option: "Option",
    confidence: "Confidence",
    confidenceValues: { low: "low", medium: "medium", high: "high" },
    changeConditions: "Change conditions",
    evidenceLabel: "Evidence",
    inferenceLabel: "inference",
    none: "None",
    kxTitle: "KX Note",
    claim: "Claim",
    evidence: "Evidence",
    data: "Data",
    constraints: "Constraints",
    links: "Links",
    operationalNextActions: "Operational next actions",
    consideredOptions: "Considered options",
    emptyLinks: "No explicit connections were supplied.",
  },
} as const;

function groundedLine(item: GroundedItem, language: Language): string {
  const labels = copy[language];
  const grounding = item.evidence ? ` — ${labels.evidenceLabel}: ${item.evidence}` : "";
  const inference = item.inference ? ` [${labels.inferenceLabel}]` : "";
  return `- ${item.text}${grounding}${inference}`;
}

function groundedList(items: GroundedItem[], language: Language): string {
  return items.map((item) => groundedLine(item, language)).join("\n");
}

function stringList(items: string[], empty: string): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${empty}`;
}

function orderedActions(trace: DecisionTrace): string {
  return [...trace.nextActions]
    .sort((a, b) => a.order - b.order)
    .map((item) => `${item.order}. ${item.action}`)
    .join("\n");
}

export function toDecisionTraceMarkdown(trace: DecisionTrace): string {
  const labels = copy[trace.language];
  const options = trace.options
    .map(
      (option) =>
        `### ${option.name}\n\n**${labels.benefits}**\n${stringList(option.benefits, labels.none)}\n\n**${labels.costs}**\n${stringList(option.costs, labels.none)}\n\n**${labels.risks}**\n${stringList(option.risks, labels.none)}\n\n- ${labels.reversible}: ${option.reversible ? labels.yes : labels.no}`,
    )
    .join("\n\n");

  return `# ${labels.traceTitle}

## ${labels.situation}

**${labels.decision}:** ${trace.situation.decision}

${groundedList(trace.situation.context, trace.language)}

## ${labels.assumptions}

${groundedList(trace.assumptions, trace.language)}

## ${labels.criteria}

${groundedList(trace.criteria, trace.language)}

## ${labels.options}

${options}

## ${labels.recommendation}

**${labels.option}:** ${trace.recommendation.option}

**${labels.confidence}:** ${labels.confidenceValues[trace.recommendation.confidence]}

${groundedList(trace.recommendation.reasoning, trace.language)}

### ${labels.changeConditions}

${stringList(trace.recommendation.changeConditions, labels.none)}

## ${labels.nextActions}

${orderedActions(trace)}
`;
}

export function toKxNoteMarkdown(trace: DecisionTrace): string {
  const labels = copy[trace.language];
  const explicitLinks = trace.links.length
    ? trace.links.map((link) => `- **${link.label}** — ${link.relationship}: “${link.sourceExcerpt}”`).join("\n")
    : `- ${labels.emptyLinks}`;
  const suppliedFacts = trace.situation.context;
  const evidence = [...trace.situation.context, ...trace.assumptions, ...trace.criteria, ...trace.recommendation.reasoning]
    .filter((item) => item.evidence)
    .map((item) => `- ${item.text} — ${labels.evidenceLabel}: ${item.evidence}`);
  const consideredOptions = trace.options.map((option) => {
    const details = [
      `${labels.benefits}: ${option.benefits.join("; ")}`,
      `${labels.costs}: ${option.costs.join("; ")}`,
      `${labels.risks}: ${option.risks.length ? option.risks.join("; ") : labels.none}`,
      `${labels.reversible}: ${option.reversible ? labels.yes : labels.no}`,
    ].join(" | ");
    return `- **${option.name}** — ${details}`;
  });
  const constraints = [
    ...trace.assumptions.map((item) => groundedLine(item, trace.language)),
    ...trace.options.flatMap((option) => [
      ...option.costs.map((cost) => `- ${option.name} — ${labels.costs}: ${cost}`),
      ...option.risks.map((risk) => `- ${option.name} — ${labels.risks}: ${risk}`),
    ]),
    ...trace.recommendation.changeConditions.map((condition) => `- ${labels.changeConditions}: ${condition}`),
  ];

  return `# ${labels.kxTitle}

## ${labels.claim}

- ${trace.recommendation.option}
- ${labels.confidence}: ${labels.confidenceValues[trace.recommendation.confidence]}
${trace.recommendation.reasoning.map((item) => groundedLine(item, trace.language)).join("\n")}

## ${labels.evidence}

${evidence.length ? evidence.join("\n") : `- ${labels.none}`}

## ${labels.data}

- ${labels.decision}: ${trace.situation.decision}
${groundedList(suppliedFacts, trace.language)}

### ${labels.consideredOptions}

${consideredOptions.join("\n")}

## ${labels.constraints}

${constraints.length ? constraints.join("\n") : `- ${labels.none}`}

## ${labels.links}

${explicitLinks}

## ${labels.operationalNextActions}

${orderedActions(trace)}
`;
}
