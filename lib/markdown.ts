import type { DecisionTrace } from "./decision-trace-schema";

type GroundedItem = DecisionTrace["assumptions"][number];
type Language = DecisionTrace["language"];
type MarkdownOptions = { highImpact?: boolean };

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
    highImpactNotice: "この判断は医療・法律・金融に関わる可能性があります。資格を持つ専門家の確認を受けてください。本結果は専門的助言ではありません。",
    aiSynthesis: "AIによる整理",
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
    highImpactNotice: "This decision may involve medical, legal, or financial matters. Seek review from a qualified professional. This result is not professional advice.",
    aiSynthesis: "AI synthesis",
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

export function toDecisionTraceMarkdown(trace: DecisionTrace, formatOptions: MarkdownOptions = {}): string {
  const labels = copy[trace.language];
  const options = trace.options
    .map(
      (option) =>
        `### ${option.name}\n\n**${labels.benefits}**\n${stringList(option.benefits, labels.none)}\n\n**${labels.costs}**\n${stringList(option.costs, labels.none)}\n\n**${labels.risks}**\n${stringList(option.risks, labels.none)}\n\n- ${labels.reversible}: ${option.reversible ? labels.yes : labels.no}`,
    )
    .join("\n\n");

  const notice = formatOptions.highImpact ? `\n> ${labels.highImpactNotice}\n` : "";
  return `# ${labels.traceTitle}
${notice}

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

export function toKxNoteMarkdown(trace: DecisionTrace, formatOptions: MarkdownOptions = {}): string {
  const labels = copy[trace.language];
  const explicitLinks = trace.links.length
    ? trace.links.map((link) => `- **${link.label}** — ${link.relationship}: “${link.sourceExcerpt}”`).join("\n")
    : `- ${labels.emptyLinks}`;
  const suppliedFacts = trace.situation.context.filter((item) => !item.inference);
  const evidence = [...trace.recommendation.reasoning, ...trace.criteria, ...trace.situation.context].map((item) =>
    groundedLine(item, trace.language),
  );
  const consideredOptions = trace.options.map((option) => {
    const details = [
      `${labels.benefits}: ${option.benefits.join("; ")}`,
      `${labels.costs}: ${option.costs.join("; ")}`,
      `${labels.risks}: ${option.risks.length ? option.risks.join("; ") : labels.none}`,
      `${labels.reversible}: ${option.reversible ? labels.yes : labels.no}`,
    ].join(" | ");
    return `- [${labels.aiSynthesis}] **${option.name}** — ${details}`;
  });
  const constraints = [
    ...trace.assumptions.map((item) => groundedLine(item, trace.language)),
    ...trace.options.flatMap((option) => [
      ...option.costs.map((cost) => `- ${option.name} — ${labels.costs}: ${cost}`),
      ...option.risks.map((risk) => `- ${option.name} — ${labels.risks}: ${risk}`),
    ]),
    ...trace.recommendation.changeConditions.map((condition) => `- ${labels.changeConditions}: ${condition}`),
  ];

  const notice = formatOptions.highImpact ? `\n> ${labels.highImpactNotice}\n` : "";
  return `# ${labels.kxTitle}
${notice}

## ${labels.claim}

- ${trace.recommendation.option}
- ${labels.confidence}: ${labels.confidenceValues[trace.recommendation.confidence]}

## ${labels.evidence}

${evidence.length ? evidence.join("\n") : `- ${labels.none}`}

## ${labels.data}

- [${labels.aiSynthesis}: ${labels.decision}] ${trace.situation.decision}
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
