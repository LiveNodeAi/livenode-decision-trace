import type { DetectedTopic } from "@/lib/transcript-contract";

export type ReviewedTopic = DetectedTopic & { selected: boolean; editedTitle: string };

type TopicReviewPanelProps = {
  topics: ReviewedTopic[];
  onToggle: (id: string) => void;
  onTitleChange: (id: string, title: string) => void;
  onGenerate: () => void;
};

export function TopicReviewPanel({ topics, onToggle, onTitleChange, onGenerate }: TopicReviewPanelProps) {
  const selected = topics.filter((topic) => topic.selected && topic.editedTitle.trim().length > 0);
  return (
    <section className="input-panel topic-review" aria-labelledby="topic-review-title">
      <h2 id="topic-review-title">生成するテーマを確認</h2>
      <p>最大5件。不要なテーマは外し、タイトルを必要に応じて修正できます。</p>
      <div className="topic-review-list">
        {topics.map((topic) => (
          <article key={topic.id} data-testid="topic-review-item" className="topic-review-item">
            <label className="topic-check">
              <input
                type="checkbox"
                checked={topic.selected}
                onChange={() => onToggle(topic.id)}
                aria-label={`${topic.title}を生成対象にする`}
              />
              <strong>{topic.title}</strong>
            </label>
            <label htmlFor={`${topic.id}-title`}>{topic.title}のタイトル</label>
            <input
              id={`${topic.id}-title`}
              type="text"
              value={topic.editedTitle}
              onChange={(event) => onTitleChange(topic.id, event.target.value)}
              disabled={!topic.selected}
            />
            <p>{topic.summary}</p>
            <details><summary>根拠抜粋</summary>{topic.ranges.map((range, index) => <blockquote key={`${range.start}-${index}`}>{range.excerpt}</blockquote>)}</details>
          </article>
        ))}
      </div>
      <button className="primary-action" type="button" onClick={onGenerate} disabled={selected.length === 0}>
        選択した{selected.length}件を生成
      </button>
    </section>
  );
}
