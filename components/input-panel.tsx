import { samples } from "@/lib/samples";

type InputPanelProps = {
  memo: string;
  error: string | null;
  generating: boolean;
  onMemoChange: (memo: string) => void;
  onSubmit: () => void;
};

export function InputPanel({ memo, error, generating, onMemoChange, onSubmit }: InputPanelProps) {
  return (
    <section className="input-panel" aria-labelledby="input-title">
      <h2 id="input-title">アイデアメモを整理する</h2>
      <p>ひとつのアイデアや検討内容を、追跡できる6つの判断要素に整理します。</p>

      <div className="samples" aria-label="サンプル">
        <p className="section-label">Sample signals</p>
        {samples.map((sample) => (
          <button key={sample.id} type="button" onClick={() => onMemoChange(sample.memo)} disabled={generating}>
            {sample.title}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="decision-memo">判断メモ</label>
      <textarea
        id="decision-memo"
        value={memo}
        onChange={(event) => onMemoChange(event.target.value)}
        aria-describedby="memo-help memo-privacy memo-count"
        disabled={generating}
        rows={14}
      />
      <div className="field-meta">
        <div><p id="memo-help">決めたいこと、背景、選択肢、判断基準が分かるように80〜12,000文字で入力してください。</p>
        <p id="memo-privacy">内容は処理のためOpenAIへ送信されます。このアプリは入力内容を保存しません。</p></div>
        <p id="memo-count">{memo.length.toLocaleString("ja-JP")}文字</p>
      </div>

      {error ? <p role="alert">{error}</p> : null}
      {generating ? <p role="status">判断の構造を整理しています。しばらくお待ちください。</p> : null}

      <button className="primary-action" type="button" onClick={onSubmit} disabled={generating}>
        {generating ? "生成中…" : error ? "もう一度試す" : "Decision Traceを生成"}
      </button>
    </section>
  );
}
