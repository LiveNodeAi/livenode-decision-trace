const destinations = [
  {
    name: "Obsidian",
    description: "ローカルのMarkdown Vaultへ保存するアダプターを想定しています。",
  },
  {
    name: "Notion",
    description: "認証を経て、指定したワークスペースへ保存するアダプターを想定しています。",
  },
  {
    name: "AI-Brain",
    description: "人間の確認を含むKX精錬フローへ受け渡すアダプターを想定しています。",
  },
] as const;

export function StorageAdapters() {
  return (
    <section aria-labelledby="storage-adapters-title">
      <header>
        <p>今後の提供形態</p>
        <h2 id="storage-adapters-title">将来の保存先アダプター</h2>
        <p>
          Obsidian・Notion・AI-Brainへの保存は、将来の配布Skill版で提供予定です。
          現在はこれらへの直接保存は未実装です。
        </p>
      </header>

      <ul aria-label="提供予定の保存先">
        {destinations.map((destination) => (
          <li key={destination.name}>
            <h3>{destination.name}</h3>
            <p>{destination.description}</p>
            <p>提供状況: 将来予定</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
