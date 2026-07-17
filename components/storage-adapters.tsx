const layers = [
  {
    title: "Web版 — 取り込み層",
    description:
      "会話を判断テーマへ分け、Decision Traceとして確認・出力します。Markdown ZIPだけが、このWeb版で実際に動く保存操作です。",
  },
  {
    title: "ローカルKX — 精錬層",
    description:
      "AI-Brainを使った、人間の確認を含むMarkdownの蒸留・精錬・再接続は既に実運用中です。このWeb版からローカルKXへ直接接続しません。",
  },
  {
    title: "配布Skill — 将来の提供層",
    description:
      "Obsidian・Notion等へ届ける保存アダプターは未実装です。提供時には、利用者が各環境の認証と権限を設定する必要があります。",
  },
] as const;

export function StorageAdapters() {
  return (
    <section aria-labelledby="storage-adapters-title">
      <header>
        <p>KX workflow</p>
        <h2 id="storage-adapters-title">Decision TraceからKXへ</h2>
        <p>現在動くWeb体験、開発者が実運用するローカル環境、将来提供するSkillを区別しています。</p>
      </header>

      <ol aria-label="Decision TraceとKXの3層">
        {layers.map((layer) => (
          <li key={layer.title}>
            <h3>{layer.title}</h3>
            <p>{layer.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
