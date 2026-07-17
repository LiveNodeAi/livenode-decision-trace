"use client";

import { useRef, useState } from "react";

import type { TopicTraceResult } from "@/lib/analyze-topic";
import { decisionTraceSchema, type DecisionTrace } from "@/lib/decision-trace-schema";
import { createTopicPool, type TopicPoolController } from "@/lib/topic-pool";
import { topicDetectionSchema, type DetectedTopic } from "@/lib/transcript-contract";
import { validateMemo } from "@/lib/validation";
import { InputPanel } from "./input-panel";
import { MultiTraceResults, type MultiTraceEntry } from "./multi-trace-results";
import { ResultPanel } from "./result-panel";
import { TopicReviewPanel, type ReviewedTopic } from "./topic-review-panel";
import { TranscriptInputPanel } from "./transcript-input-panel";

type AppState =
  | { status: "input"; memo: string; error: string | null }
  | { status: "generating"; memo: string }
  | { status: "result"; memo: string; trace: DecisionTrace; highImpact: boolean }
  | { status: "error"; memo: string; error: string };

type TranscriptState =
  | { status: "input" | "detecting"; transcript: string; error: string | null }
  | { status: "review"; transcript: string; transcriptHash: string; topics: ReviewedTopic[] }
  | { status: "generating"; transcript: string; transcriptHash: string; topics: ReviewedTopic[]; completed: number; total: number }
  | { status: "result"; transcript: string; transcriptHash: string; entries: MultiTraceEntry[] };

const errors: Record<string, string> = {
  MEMO_TOO_SHORT: "判断の背景が分かるように、80文字以上で入力してください。",
  MEMO_TOO_LONG: "入力は12,000文字以内にしてください。",
  TRANSCRIPT_TOO_SHORT: "文字起こしは80文字以上で入力してください。",
  TRANSCRIPT_TOO_LONG: "文字起こしは30,000文字以内にしてください。",
  REQUEST_TOO_LARGE: "送信サイズが大きすぎます。入力を短くして、もう一度試してください。",
  RATE_LIMITED: "利用回数の上限に達しました。少し待ってから、もう一度試してください。",
  ANALYSIS_TIMEOUT: "分析に時間がかかりすぎました。入力内容は残っています。もう一度試してください。",
  ANALYSIS_COULD_NOT_GROUND: "根拠を入力内容に結び付けられませんでした。入力内容を確認して、もう一度試してください。 / We couldn't ground the analysis in your memo. Review it and try again.",
  ANALYSIS_REFUSED: "この内容は分析できませんでした。入力内容を見直してください。 / This content couldn't be analyzed. Please revise your memo.",
  ANALYSIS_BUSY: "分析が混み合っています。少し待ってから、もう一度試してください。 / Analysis is busy. Wait a moment and try again.",
  ANALYSIS_REQUEST_REJECTED: "分析リクエストを受け付けられませんでした。入力内容を見直してください。 / The analysis request was rejected. Please review your memo.",
  ANALYSIS_UNAVAILABLE: "現在、分析を完了できませんでした。入力内容は残っています。もう一度試してください。",
  INVALID_REQUEST: "入力内容を確認して、もう一度試してください。",
  MALFORMED_RESPONSE: "分析結果を確認できませんでした。入力内容は残っています。もう一度試してください。",
};

function errorCode(body: unknown, fallback: string): string {
  return typeof body === "object" && body !== null && "error" in body ? String(body.error) : fallback;
}

function sourceRangesMatch(value: unknown[], expected: DetectedTopic["ranges"]): boolean {
  return value.length === expected.length && value.every((candidate, index) => {
    if (typeof candidate !== "object" || candidate === null) return false;
    const range = candidate as Record<string, unknown>;
    return range.start === expected[index].start
      && range.end === expected[index].end
      && range.excerpt === expected[index].excerpt;
  });
}

export function DecisionTraceApp() {
  const [mode, setMode] = useState<"single" | "transcript">("single");
  const [state, setState] = useState<AppState>({ status: "input", memo: "", error: null });
  const [transcriptState, setTranscriptState] = useState<TranscriptState>({ status: "input", transcript: "", error: null });
  const poolRef = useRef<TopicPoolController<TopicTraceResult> | null>(null);

  const updateMemo = (memo: string) => setState({ status: "input", memo, error: null });

  async function submit() {
    const validation = validateMemo(state.memo);
    if (!validation.ok) {
      setState({ status: "input", memo: state.memo, error: errors[validation.code] });
      return;
    }
    const memo = validation.memo;
    setState({ status: "generating", memo });
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memo }) });
      const body: unknown = await response.json();
      if (!response.ok) {
        const code = errorCode(body, "ANALYSIS_UNAVAILABLE");
        setState({ status: "error", memo, error: errors[code] ?? errors.ANALYSIS_UNAVAILABLE });
        return;
      }
      const trace = decisionTraceSchema.safeParse(typeof body === "object" && body !== null && "trace" in body ? body.trace : undefined);
      if (!trace.success) { setState({ status: "error", memo, error: errors.MALFORMED_RESPONSE }); return; }
      const highImpact = typeof body === "object" && body !== null && "highImpact" in body && body.highImpact === true;
      setState({ status: "result", memo, trace: trace.data, highImpact });
    } catch { setState({ status: "error", memo, error: errors.ANALYSIS_UNAVAILABLE }); }
  }

  async function detect() {
    if (transcriptState.status !== "input") return;
    const transcript = transcriptState.transcript.trim();
    if (transcript.length < 80 || transcript.length > 30_000) {
      setTranscriptState({ status: "input", transcript: transcriptState.transcript, error: transcript.length > 30_000 ? errors.TRANSCRIPT_TOO_LONG : errors.TRANSCRIPT_TOO_SHORT });
      return;
    }
    setTranscriptState({ status: "detecting", transcript, error: null });
    try {
      const response = await fetch("/api/topics/detect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript }) });
      const body: unknown = await response.json();
      if (!response.ok) {
        setTranscriptState({ status: "input", transcript, error: errors[errorCode(body, "ANALYSIS_UNAVAILABLE")] ?? errors.ANALYSIS_UNAVAILABLE });
        return;
      }
      const parsed = topicDetectionSchema.safeParse(body);
      if (!parsed.success) { setTranscriptState({ status: "input", transcript, error: errors.MALFORMED_RESPONSE }); return; }
      setTranscriptState({
        status: "review",
        transcript,
        transcriptHash: parsed.data.transcriptHash,
        topics: parsed.data.topics.map((topic) => ({ ...topic, selected: true, editedTitle: topic.title })),
      });
    } catch { setTranscriptState({ status: "input", transcript, error: errors.ANALYSIS_UNAVAILABLE }); }
  }

  function updateTopics(update: (topics: ReviewedTopic[]) => ReviewedTopic[]) {
    setTranscriptState((current) => current.status === "review" ? { ...current, topics: update(current.topics) } : current);
  }

  async function analyzeTopicRequest(topic: DetectedTopic, transcript: string, transcriptHash: string, signal?: AbortSignal): Promise<TopicTraceResult> {
    const response = await fetch("/api/topics/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript, transcriptHash, topic: { id: topic.id, editedTitle: topic.title, ranges: topic.ranges } }),
      signal,
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      throw { code: errorCode(body, "PROVIDER_BUSY"), retryable: typeof body === "object" && body !== null && "retryable" in body && body.retryable === true };
    }
    if (typeof body !== "object" || body === null || !("trace" in body)) throw { code: "MALFORMED_RESPONSE", retryable: true };
    const parsedTrace = decisionTraceSchema.safeParse(body.trace);
    if (!parsedTrace.success) throw { code: "MALFORMED_RESPONSE", retryable: true };
    const candidate = body as Record<string, unknown>;
    if (
      typeof candidate.topicId !== "string"
      || typeof candidate.attemptId !== "string"
      || !Array.isArray(candidate.sourceRanges)
      || typeof candidate.highImpact !== "boolean"
      || candidate.topicId !== topic.id
      || !sourceRangesMatch(candidate.sourceRanges, topic.ranges)
    ) throw { code: "MALFORMED_RESPONSE", retryable: true };
    return {
      topicId: candidate.topicId,
      attemptId: candidate.attemptId,
      sourceRanges: candidate.sourceRanges as TopicTraceResult["sourceRanges"],
      trace: parsedTrace.data,
      highImpact: candidate.highImpact,
    };
  }

  async function generateSelected() {
    if (transcriptState.status !== "review") return;
    const selected = transcriptState.topics.filter((topic) => topic.selected && topic.editedTitle.trim()).map((topic) => ({ ...topic, title: topic.editedTitle.trim() }));
    const { transcript, transcriptHash, topics } = transcriptState;
    let completed = 0;
    const controller = createTopicPool(async (topic, signal) => {
      try { return await analyzeTopicRequest(topic, transcript, transcriptHash, signal); }
      finally {
        completed += 1;
        setTranscriptState((current) => current.status === "generating" ? { ...current, completed } : current);
      }
    }, { concurrency: 2 });
    poolRef.current = controller;
    setTranscriptState({ status: "generating", transcript, transcriptHash, topics, completed: 0, total: selected.length });
    const settled = await controller.run(selected);
    const entries: MultiTraceEntry[] = settled.map((entry) => ({
      topic: entry.topic,
      editedTitle: entry.topic.title,
      ...(entry.state === "complete"
        ? { result: entry.value }
        : { errorCode: typeof entry.error === "object" && entry.error !== null && "code" in entry.error ? String(entry.error.code) : "PROVIDER_BUSY", retryable: entry.state === "retryable-error" }),
    }));
    setTranscriptState({ status: "result", transcript, transcriptHash, entries });
  }

  async function retry(topicId: string) {
    if (transcriptState.status !== "result" || !poolRef.current) return;
    const entry = transcriptState.entries.find((candidate) => candidate.topic.id === topicId);
    if (!entry) return;
    setTranscriptState({ ...transcriptState, entries: transcriptState.entries.map((candidate) => candidate.topic.id === topicId ? { ...candidate, retrying: true } : candidate) });
    const settled = await poolRef.current.retry(entry.topic);
    setTranscriptState((current) => current.status === "result" ? {
      ...current,
      entries: current.entries.map((candidate) => candidate.topic.id !== topicId ? candidate : settled.state === "complete"
        ? { topic: settled.topic, editedTitle: candidate.editedTitle, result: settled.value }
        : { ...candidate, retrying: false, errorCode: typeof settled.error === "object" && settled.error !== null && "code" in settled.error ? String(settled.error.code) : "PROVIDER_BUSY", retryable: settled.state === "retryable-error" }),
    } : current);
  }

  function cancelTopic(topicId: string) {
    poolRef.current?.cancel(topicId);
  }

  const resetTranscript = () => { poolRef.current = null; setTranscriptState({ status: "input", transcript: "", error: null }); };
  const busy = state.status === "generating" || transcriptState.status === "detecting" || transcriptState.status === "generating";

  return (
    <>
      <nav className="mode-switch" aria-label="入力モード">
        <button type="button" aria-pressed={mode === "single"} onClick={() => setMode("single")} disabled={busy}>単一メモモード</button>
        <button type="button" aria-pressed={mode === "transcript"} onClick={() => setMode("transcript")} disabled={busy}>文字起こしモード</button>
      </nav>
      {mode === "single" ? (state.status === "result" ? (
        <ResultPanel trace={state.trace} highImpact={state.highImpact} onReset={() => setState({ status: "input", memo: "", error: null })} />
      ) : (
        <InputPanel memo={state.memo} error={state.status === "error" || state.status === "input" ? state.error : null} generating={state.status === "generating"} onMemoChange={updateMemo} onSubmit={submit} />
      )) : transcriptState.status === "review" ? (
        <TopicReviewPanel
          topics={transcriptState.topics}
          onToggle={(id) => updateTopics((topics) => topics.map((topic) => topic.id === id ? { ...topic, selected: !topic.selected } : topic))}
          onTitleChange={(id, editedTitle) => updateTopics((topics) => topics.map((topic) => topic.id === id ? { ...topic, editedTitle } : topic))}
          onGenerate={generateSelected}
        />
      ) : transcriptState.status === "generating" ? (
        <section className="input-panel" aria-labelledby="multi-progress-title">
          <h2 id="multi-progress-title">テーマ別Traceを生成</h2>
          <p role="status" aria-live="polite">{transcriptState.completed}/{transcriptState.total}生成中</p>
          <ul className="generation-list">
            {transcriptState.topics.filter((topic) => topic.selected).map((topic) => (
              <li key={topic.id}><span>{topic.editedTitle}</span><button type="button" onClick={() => cancelTopic(topic.id)}>{topic.editedTitle}を中止</button></li>
            ))}
          </ul>
        </section>
      ) : transcriptState.status === "result" ? (
        <MultiTraceResults entries={transcriptState.entries} onRetry={retry} onReset={resetTranscript} />
      ) : (
        <TranscriptInputPanel transcript={transcriptState.transcript} detecting={transcriptState.status === "detecting"} error={transcriptState.error} onChange={(transcript) => setTranscriptState({ status: "input", transcript, error: null })} onDetect={detect} />
      )}
    </>
  );
}
