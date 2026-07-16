"use client";

import { useState } from "react";

import type { DecisionTrace } from "@/lib/decision-trace-schema";
import { toDecisionTraceMarkdown, toKxNoteMarkdown } from "@/lib/markdown";
import { TraceCard } from "./trace-card";

type GroundedItem = DecisionTrace["assumptions"][number];

const confidence = {
  ja: { low: "低", medium: "中", high: "高" },
  en: { low: "low", medium: "medium", high: "high" },
} as const;

function GroundedList({ items, language }: { items: GroundedItem[]; language: DecisionTrace["language"] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${item.text}-${index}`}>
          <p>{item.text}</p>
          {item.inference ? (
            <p><strong>{language === "ja" ? "AIによる推論" : "AI inference"}</strong></p>
          ) : (
            <p>
              <strong>{language === "ja" ? "入力からの根拠" : "Evidence from input"}</strong>
              {item.evidence ? `: ${item.evidence}` : null}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

type ResultPanelProps = {
  trace: DecisionTrace;
  highImpact: boolean;
  onReset: () => void;
};

export function ResultPanel({ trace, highImpact, onReset }: ResultPanelProps) {
  const [copyNotice, setCopyNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const ja = trace.language === "ja";
  const labels = ja
    ? ["状況", "前提", "判断基準", "選択肢", "推奨", "次のアクション"]
    : ["Situation", "Assumptions", "Criteria", "Options", "Recommendation", "Next actions"];

  async function copy(markdown: string, format: "Decision Trace" | "KX Note") {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(markdown);
      setCopyNotice({
        kind: "success",
        message: ja ? `${format}をコピーしました。` : `${format} copied.`,
      });
    } catch {
      setCopyNotice({
        kind: "error",
        message: ja
          ? "コピーできませんでした。ブラウザの権限を確認して、もう一度お試しください。"
          : "Could not copy. Check your browser permissions and try again.",
      });
    }
  }

  return (
    <section className="result-panel" aria-labelledby="result-title">
      <header className="result-summary">
        <div><p className="section-label">Resolved signal</p><h2 id="result-title">{ja ? "Decision Traceの結果" : "Decision Trace result"}</h2></div>
        <div className="recommendation"><p><strong>{trace.recommendation.option}</strong></p>
        <p>{ja ? "確信度" : "Confidence"}: {confidence[trace.language][trace.recommendation.confidence]}</p></div>
      </header>

      {highImpact ? (
        <p role="note" className="high-impact-notice">
          {ja
            ? "この判断は医療・法律・金融に関わる可能性があります。資格を持つ専門家の確認を受けてください。本結果は専門的助言ではありません。"
            : "This decision may involve medical, legal, or financial matters. Seek review from a qualified professional. This result is not professional advice."}
        </p>
      ) : null}

      <div className="trace-grid">
        <TraceCard index={1} title={labels[0]}>
          <p><strong>{ja ? "AIによる要約" : "AI summary"}</strong></p>
          <p><strong>{ja ? "判断" : "Decision"}:</strong> {trace.situation.decision}</p>
          <GroundedList items={trace.situation.context} language={trace.language} />
        </TraceCard>
        <TraceCard index={2} title={labels[1]}>
          <GroundedList items={trace.assumptions} language={trace.language} />
        </TraceCard>
        <TraceCard index={3} title={labels[2]}>
          <GroundedList items={trace.criteria} language={trace.language} />
        </TraceCard>
        <TraceCard index={4} title={labels[3]}>
          <p><strong>{ja ? "AIによる選択肢整理" : "AI-organized options"}</strong></p>
          {trace.options.map((option) => (
            <article key={option.name}>
              <h3>{option.name}</h3>
              <p><strong>{ja ? "利点" : "Benefits"}:</strong> {option.benefits.join("、")}</p>
              <p><strong>{ja ? "コスト" : "Costs"}:</strong> {option.costs.join("、")}</p>
              <p><strong>{ja ? "リスク" : "Risks"}:</strong> {option.risks.length ? option.risks.join("、") : (ja ? "なし" : "None")}</p>
              <p><strong>{ja ? "元に戻せる" : "Reversible"}:</strong> {option.reversible ? (ja ? "はい" : "yes") : (ja ? "いいえ" : "no")}</p>
            </article>
          ))}
        </TraceCard>
        <TraceCard index={5} title={labels[4]}>
          <p><strong>{ja ? "AIによる推奨" : "AI recommendation"}</strong></p>
          <p><strong>{trace.recommendation.option}</strong></p>
          <GroundedList items={trace.recommendation.reasoning} language={trace.language} />
          <h3>{ja ? "判断を変える条件" : "Change conditions"}</h3>
          <ul>{trace.recommendation.changeConditions.map((item) => <li key={item}>{item}</li>)}</ul>
        </TraceCard>
        <TraceCard index={6} title={labels[5]}>
          <p><strong>{ja ? "AIによるアクション案" : "AI-proposed actions"}</strong></p>
          <ol>
            {[...trace.nextActions].sort((a, b) => a.order - b.order).map((item) => (
              <li key={`${item.order}-${item.action}`}>{item.action}</li>
            ))}
          </ol>
        </TraceCard>
      </div>

      <div className="result-actions" aria-label={ja ? "結果の操作" : "Result actions"}>
        <button type="button" onClick={async () => await copy(toDecisionTraceMarkdown(trace, { highImpact }), "Decision Trace")}>
          {ja ? "Decision Traceをコピー" : "Copy Decision Trace"}
        </button>
        <button type="button" onClick={async () => await copy(toKxNoteMarkdown(trace, { highImpact }), "KX Note")}>
          {ja ? "KX Noteをコピー" : "Copy KX Note"}
        </button>
        <button type="button" onClick={onReset}>{ja ? "最初からやり直す" : "Start over"}</button>
      </div>
      {copyNotice ? (
        <p role={copyNotice.kind === "success" ? "status" : "alert"}>{copyNotice.message}</p>
      ) : null}
    </section>
  );
}
