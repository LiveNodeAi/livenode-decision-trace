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
  onReset: () => void;
};

export function ResultPanel({ trace, onReset }: ResultPanelProps) {
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
    <section aria-labelledby="result-title">
      <h2 id="result-title">{ja ? "Decision Traceの結果" : "Decision Trace result"}</h2>
      <p><strong>{trace.recommendation.option}</strong></p>
      <p>{ja ? "確信度" : "Confidence"}: {confidence[trace.language][trace.recommendation.confidence]}</p>

      <div>
        <TraceCard title={labels[0]}>
          <p><strong>{ja ? "判断" : "Decision"}:</strong> {trace.situation.decision}</p>
          <GroundedList items={trace.situation.context} language={trace.language} />
        </TraceCard>
        <TraceCard title={labels[1]}>
          <GroundedList items={trace.assumptions} language={trace.language} />
        </TraceCard>
        <TraceCard title={labels[2]}>
          <GroundedList items={trace.criteria} language={trace.language} />
        </TraceCard>
        <TraceCard title={labels[3]}>
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
        <TraceCard title={labels[4]}>
          <p><strong>{trace.recommendation.option}</strong></p>
          <GroundedList items={trace.recommendation.reasoning} language={trace.language} />
          <h3>{ja ? "判断を変える条件" : "Change conditions"}</h3>
          <ul>{trace.recommendation.changeConditions.map((item) => <li key={item}>{item}</li>)}</ul>
        </TraceCard>
        <TraceCard title={labels[5]}>
          <ol>
            {[...trace.nextActions].sort((a, b) => a.order - b.order).map((item) => (
              <li key={`${item.order}-${item.action}`}>{item.action}</li>
            ))}
          </ol>
        </TraceCard>
      </div>

      <div aria-label={ja ? "結果の操作" : "Result actions"}>
        <button type="button" onClick={async () => await copy(toDecisionTraceMarkdown(trace), "Decision Trace")}>
          {ja ? "Decision Traceをコピー" : "Copy Decision Trace"}
        </button>
        <button type="button" onClick={async () => await copy(toKxNoteMarkdown(trace), "KX Note")}>
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
