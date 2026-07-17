import { useEffect, useRef } from "react";

type TranscriptInputPanelProps = {
  transcript: string;
  detecting: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onDetect: () => void;
};

export function TranscriptInputPanel({ transcript, detecting, error, onChange, onDetect }: TranscriptInputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  return (
    <section className="input-panel" aria-labelledby="transcript-title">
      <h2 id="transcript-title">文字起こしからテーマを見つける</h2>
      <p>最大5件の判断テーマを検出し、確認してから個別のDecision Traceを生成します。</p>
      <label className="field-label" htmlFor="meeting-transcript">文字起こし</label>
      <textarea
        ref={textareaRef}
        id="meeting-transcript"
        name="transcript"
        autoComplete="off"
        value={transcript}
        onChange={(event) => onChange(event.target.value)}
        disabled={detecting}
        rows={16}
        aria-describedby="transcript-help transcript-count"
      />
      <div className="field-meta">
        <p id="transcript-help">80〜30,000文字。内容は処理のためOpenAIへ送信され、このアプリには保存されません。</p>
        <p id="transcript-count">{transcript.length.toLocaleString("ja-JP")}文字</p>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {detecting ? <p role="status">判断テーマを検出しています。</p> : null}
      <button className="primary-action" type="button" onClick={onDetect} disabled={detecting}>
        {detecting ? "検出中…" : "テーマを検出"}
      </button>
    </section>
  );
}
