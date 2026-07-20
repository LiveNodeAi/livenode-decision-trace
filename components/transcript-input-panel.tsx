import { useEffect, useRef } from "react";
import { transcriptSamples } from "@/lib/transcript-samples";
import type { UiLanguage, UiStrings } from "@/lib/ui-strings";

type TranscriptInputPanelProps = {
  transcript: string;
  detecting: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onDetect: () => void;
  uiLanguage: UiLanguage;
  strings: UiStrings;
};

export function TranscriptInputPanel({ transcript, detecting, error, onChange, onDetect, uiLanguage, strings }: TranscriptInputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  return (
    <section className="input-panel" aria-labelledby="transcript-title">
      <h2 id="transcript-title">{strings.transcriptTitle}</h2>
      <p>{strings.transcriptIntro}</p>
      <div className="samples">
        <button type="button" onClick={() => onChange(transcriptSamples[uiLanguage])} disabled={detecting}>{strings.useTranscriptSample}</button>
      </div>
      <label className="field-label" htmlFor="meeting-transcript">{strings.transcriptLabel}</label>
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
        <p id="transcript-help">{strings.transcriptHelp}</p>
        <p id="transcript-count">{transcript.length.toLocaleString(uiLanguage === "ja" ? "ja-JP" : "en-US")} {strings.chars}</p>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {detecting ? <p role="status">{strings.detectingStatus}</p> : null}
      <button className="primary-action" type="button" onClick={onDetect} disabled={detecting}>
        {detecting ? strings.detectingButton : strings.detectButton}
      </button>
    </section>
  );
}
