import type { DecisionTrace } from "./decision-trace-schema";

type GroundedItem = DecisionTrace["assumptions"][number];

function groundedLine(item: GroundedItem): string {
  const grounding = item.evidence ? ` — Evidence: ${item.evidence}` : "";
  const inference = item.inference ? " [inference]" : "";
  return `- ${item.text}${grounding}${inference}`;
}

function groundedList(items: GroundedItem[]): string {
  return items.map(groundedLine).join("\n");
}

function stringList(items: string[], empty: string): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${empty}`;
}

export function toDecisionTraceMarkdown(trace: DecisionTrace): string {
  const none = trace.language === "ja" ? "なし" : "None";
  const options = trace.options
    .map(
      (option) =>
        `### ${option.name}\n\n**Benefits**\n${stringList(option.benefits, none)}\n\n**Costs**\n${stringList(option.costs, none)}\n\n**Risks**\n${stringList(option.risks, none)}\n\n- Reversible: ${option.reversible ? "yes" : "no"}`,
    )
    .join("\n\n");
  const links = trace.links.map((link) => `- **${link.label}** — ${link.relationship}: “${link.sourceExcerpt}”`).join("\n");

  return `# Decision Trace

## Situation

**Decision:** ${trace.situation.decision}

${groundedList(trace.situation.context)}

## Assumptions

${groundedList(trace.assumptions)}

## Criteria

${groundedList(trace.criteria)}

## Options

${options}

## Recommendation

**Option:** ${trace.recommendation.option}

**Confidence:** ${trace.recommendation.confidence}

${groundedList(trace.recommendation.reasoning)}

### Change conditions

${stringList(trace.recommendation.changeConditions, none)}

## Next actions

${[...trace.nextActions]
  .sort((a, b) => a.order - b.order)
  .map((item) => `${item.order}. ${item.action}`)
  .join("\n")}

## Links

${links || `- ${none}`}
`;
}

export function toKxNoteMarkdown(trace: DecisionTrace): string {
  const isJapanese = trace.language === "ja";
  const none = isJapanese ? "なし" : "None";
  const explicitLinks = trace.links.length
    ? trace.links.map((link) => `- **${link.label}** — ${link.relationship}: “${link.sourceExcerpt}”`).join("\n")
    : isJapanese
      ? "- 入力文に明示された接続はありません。"
      : "- No explicit connections were supplied.";
  const evidence = [...trace.situation.context, ...trace.assumptions, ...trace.criteria, ...trace.recommendation.reasoning]
    .filter((item) => item.evidence)
    .map((item) => `- ${item.text} — ${item.evidence}`);
  const constraints = [
    ...trace.criteria.map((item) => item.text),
    ...trace.options.flatMap((option) => [
      ...option.costs.map((cost) => `${option.name}: ${cost}`),
      ...option.risks.map((risk) => `${option.name}: ${risk}`),
    ]),
    ...trace.recommendation.changeConditions,
  ];

  return `# KX Note

## Claim

- ${trace.recommendation.option}
${trace.recommendation.reasoning.map((item) => `- ${item.text}${item.inference ? " [inference]" : ""}`).join("\n")}

## Evidence

${evidence.length ? evidence.join("\n") : `- ${none}`}

## Data

- Decision: ${trace.situation.decision}
${groundedList(trace.situation.context)}
${groundedList(trace.assumptions)}

## Constraints

${stringList(constraints, none)}

## Links

${explicitLinks}

## Operational next actions

${[...trace.nextActions]
  .sort((a, b) => a.order - b.order)
  .map((item) => `${item.order}. ${item.action}`)
  .join("\n")}
`;
}
