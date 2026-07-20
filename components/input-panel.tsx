import { samples } from "@/lib/samples";
import type { UiLanguage, UiStrings } from "@/lib/ui-strings";

type InputPanelProps = {
  memo: string;
  error: string | null;
  generating: boolean;
  onMemoChange: (memo: string) => void;
  onSubmit: () => void;
  uiLanguage: UiLanguage;
  strings: UiStrings;
};

export function InputPanel({ memo, error, generating, onMemoChange, onSubmit, uiLanguage, strings }: InputPanelProps) {
  const localizedSamples = [...samples].sort((left, right) => Number(right.language === uiLanguage) - Number(left.language === uiLanguage));
  return (
    <section className="input-panel" aria-labelledby="input-title">
      <h2 id="input-title">{strings.memoTitle}</h2>
      <p>{strings.memoIntro}</p>

      <div className="samples" aria-label={strings.samples}>
        <p className="section-label">Sample signals</p>
        {localizedSamples.map((sample) => (
          <button key={sample.id} type="button" onClick={() => onMemoChange(sample.memo)} disabled={generating}>
            {sample.title}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="decision-memo">{strings.memoLabel}</label>
      <textarea
        id="decision-memo"
        value={memo}
        onChange={(event) => onMemoChange(event.target.value)}
        aria-describedby="memo-help memo-privacy memo-count"
        disabled={generating}
        rows={14}
      />
      <div className="field-meta">
        <div><p id="memo-help">{strings.memoHelp}</p>
        <p id="memo-privacy">{strings.privacy}</p></div>
        <p id="memo-count">{memo.length.toLocaleString(uiLanguage === "ja" ? "ja-JP" : "en-US")} {strings.chars}</p>
      </div>

      {error ? <p role="alert">{error}</p> : null}
      {generating ? <p role="status">{strings.organizing}</p> : null}

      <button className="primary-action" type="button" onClick={onSubmit} disabled={generating}>
        {generating ? strings.generating : error ? strings.retry : strings.generateTrace}
      </button>
    </section>
  );
}
