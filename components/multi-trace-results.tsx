"use client";

import { useState } from "react";

import type { TopicTraceResult } from "@/lib/analyze-topic";
import { createMeetingZip, type MeetingExportInput } from "@/lib/meeting-export";
import type { DetectedTopic } from "@/lib/transcript-contract";
import { ResultPanel } from "./result-panel";

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
};

export function MultiTraceResults({ entries, onRetry, onReset }: MultiTraceResultsProps) {
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
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("ZIPを作成できませんでした。もう一度お試しください。");
    }
  }

  return (
    <section className="multi-results" aria-labelledby="multi-results-title">
      <header className="multi-results-header">
        <div><p className="section-label">Meeting decision map</p><h2 id="multi-results-title">複数テーマのDecision Trace</h2></div>
        <p>{successful.length}/{entries.length}件完了</p>
      </header>
      {entries.map((entry) => entry.result ? (
        <article key={entry.topic.id} data-testid="multi-trace-success" className="multi-result-item">
          <h2>{entry.editedTitle}</h2>
          <ResultPanel trace={entry.result.trace} highImpact={entry.result.highImpact} />
        </article>
      ) : (
        <article key={entry.topic.id} className="multi-result-error" role="alert">
          <h2>{entry.editedTitle}</h2>
          <p>{entry.editedTitle}の生成に失敗しました</p>
          <p>{entry.errorCode}</p>
          {entry.retryable ? <button type="button" onClick={() => onRetry(entry.topic.id)} disabled={entry.retrying}>{entry.editedTitle}を再試行</button> : null}
        </article>
      ))}
      <div className="result-actions">
        <button type="button" onClick={download} disabled={successful.length === 0}>Markdown ZIPをダウンロード</button>
        <button type="button" onClick={onReset}>最初からやり直す</button>
      </div>
      {downloadError ? <p role="alert">{downloadError}</p> : null}
    </section>
  );
}
