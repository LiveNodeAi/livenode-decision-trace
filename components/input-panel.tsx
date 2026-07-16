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
    <section aria-labelledby="input-title">
      <h2 id="input-title">判断メモを入力</h2>
      <p>会議メモや検討中の文章を、追跡できる6つの判断要素に整理します。</p>

      <div aria-label="サンプル">
        <p>サンプルから試す</p>
        {samples.map((sample) => (
          <button key={sample.id} type="button" onClick={() => onMemoChange(sample.memo)} disabled={generating}>
            {sample.title}
          </button>
        ))}
      </div>

      <label htmlFor="decision-memo">判断メモ</label>
      <textarea
        id="decision-memo"
        value={memo}
        onChange={(event) => onMemoChange(event.target.value)}
        aria-describedby="memo-help memo-privacy memo-count"
        disabled={generating}
        rows={14}
      />
      <p id="memo-help">決めたいこと、背景、選択肢、判断基準が分かるように80〜12,000文字で入力してください。</p>
      <p id="memo-privacy">内容は処理のためOpenAIへ送信されます。このアプリは入力内容を保存しません。</p>
      <p id="memo-count">{memo.length.toLocaleString("ja-JP")}文字</p>

      {error ? <p role="alert">{error}</p> : null}
      {generating ? <p role="status">判断の構造を整理しています。しばらくお待ちください。</p> : null}

      <button type="button" onClick={onSubmit} disabled={generating}>
        {generating ? "生成中…" : error ? "もう一度試す" : "Decision Traceを生成"}
      </button>
    </section>
  );
}
