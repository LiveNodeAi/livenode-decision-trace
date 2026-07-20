"use client";

import { useEffect, useRef, useState } from "react";

import type { TopicTraceResult } from "@/lib/analyze-topic";
import { createMeetingZip, type MeetingExportInput } from "@/lib/meeting-export";
import type { DetectedTopic } from "@/lib/transcript-contract";
import { ResultPanel } from "./result-panel";
import { StorageAdapters } from "./storage-adapters";
import type { UiLanguage } from "@/lib/ui-strings";

export type MultiTraceEntry = {
  topic: DetectedTopic;
  editedTitle: string;
  result?: TopicTraceResult;
  errorCode?: string;
  retryable?: boolean;
  retrying?: boolean;
};

type MultiTraceResultsProps = {
  entries: MultiTraceEntry[];
  onRetry: (topicId: string) => void;
  onReset: () => void;
  uiLanguage?: UiLanguage;
};

export function MultiTraceResults({ entries, onRetry, onReset, uiLanguage = "ja" }: MultiTraceResultsProps) {
  const en = uiLanguage === "en";
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const successful = entries.filter((entry) => entry.result);

  async function download() {
    const input: MeetingExportInput = {
      meetingTitle: "Decision Trace meeting",
      meetingDate: new Date().toISOString().slice(0, 10),
      topics: entries.map((entry) => entry.result
        ? { status: "success" as const, topic: entry.topic, editedTitle: entry.editedTitle, trace: entry.result.trace }
        : { status: "failed" as const, topic: entry.topic, editedTitle: entry.editedTitle, errorCode: entry.errorCode ?? "UNKNOWN" }),
    };
    try {
      const blob = await createMeetingZip(input);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "decision-trace-meeting.zip";
      document.body.append(anchor);
      try {
        anchor.click();
      } finally {
        anchor.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setDownloadError(en ? "The ZIP could not be created. Please try again." : "ZIPを作成できませんでした。もう一度お試しください。");
    }
  }

  return (
    <section className="multi-results" aria-labelledby="multi-results-title">
      <header className="multi-results-header">
        <div><p className="section-label">Meeting decision map</p><h2 id="multi-results-title" ref={headingRef} tabIndex={-1}>{en ? "Decision Traces across topics" : "複数テーマのDecision Trace"}</h2></div>
        <p role="status" aria-live="polite">{en ? `${successful.length}/${entries.length} complete` : `${successful.length}/${entries.length}件完了`}</p>
      </header>
      <section className="meeting-decision-map" aria-label={en ? "Meeting decision map" : "会議全体の判断マップ"}>
        <h3>{en ? "Meeting decision map" : "会議全体の判断マップ"}</h3>
        <ol>
          {entries.map((entry) => (
            <li key={entry.topic.id}>
              <h4>{entry.editedTitle}</h4>
              {entry.result ? <>
                <p><strong>{en ? "Recommendation:" : "推奨:"}</strong> {entry.result.trace.recommendation.option}</p>
                <p><strong>{en ? "Conditions that would change it:" : "判断を変える条件:"}</strong> {entry.result.trace.recommendation.changeConditions.join(en ? ", " : "、") || (en ? "None" : "なし")}</p>
                <p><strong>{en ? "Next actions:" : "次のアクション:"}</strong> {[...entry.result.trace.nextActions].sort((a, b) => a.order - b.order).map(({ action }) => action).join(en ? ", " : "、")}</p>
              </> : <p><strong>{en ? "Generation failed:" : "生成失敗:"}</strong> {entry.errorCode ?? "UNKNOWN"}</p>}
            </li>
          ))}
        </ol>
      </section>
      {entries.map((entry) => entry.result ? (
        <article key={entry.topic.id} data-testid="multi-trace-success" className="multi-result-item">
          <h3>{entry.editedTitle}</h3>
          <ResultPanel trace={entry.result.trace} highImpact={entry.result.highImpact} headingLevel={4} />
        </article>
      ) : (
        <article key={entry.topic.id} className="multi-result-error" role="alert">
          <h3>{entry.editedTitle}</h3>
          <p>{en ? `Generation failed for ${entry.editedTitle}` : `${entry.editedTitle}の生成に失敗しました`}</p>
          <p>{entry.errorCode}</p>
          {entry.retryable ? <button type="button" onClick={() => onRetry(entry.topic.id)} disabled={entry.retrying}>{en ? `Retry ${entry.editedTitle}` : `${entry.editedTitle}を再試行`}</button> : null}
        </article>
      ))}
      <div className="storage-adapters-wrap">
        <StorageAdapters uiLanguage={uiLanguage} />
      </div>
      <div className="result-actions">
        <button type="button" onClick={download} disabled={successful.length === 0}>{en ? "Download Markdown ZIP" : "Markdown ZIPをダウンロード"}</button>
        <button type="button" onClick={onReset}>{en ? "Start over" : "最初からやり直す"}</button>
      </div>
      {downloadError ? <p role="alert">{downloadError}</p> : null}
    </section>
  );
}
