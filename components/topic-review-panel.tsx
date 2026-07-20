import type { DetectedTopic } from "@/lib/transcript-contract";
import { useEffect, useRef } from "react";
import type { UiStrings } from "@/lib/ui-strings";

export type ReviewedTopic = DetectedTopic & { selected: boolean; editedTitle: string };

type TopicReviewPanelProps = {
  topics: ReviewedTopic[];
  onToggle: (id: string) => void;
  onTitleChange: (id: string, title: string) => void;
  onGenerate: () => void;
  strings: UiStrings;
};

export function TopicReviewPanel({ topics, onToggle, onTitleChange, onGenerate, strings }: TopicReviewPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const selected = topics.filter((topic) => topic.selected && topic.editedTitle.trim().length > 0);
  return (
    <section className="input-panel topic-review" aria-labelledby="topic-review-title">
      <h2 id="topic-review-title" ref={headingRef} tabIndex={-1}>{strings.reviewTitle}</h2>
      <p>{strings.reviewIntro}</p>
      <div className="topic-review-list">
        {topics.map((topic) => (
          <article key={topic.id} data-testid="topic-review-item" className="topic-review-item">
            <label className="topic-check">
              <input
                type="checkbox"
                checked={topic.selected}
                onChange={() => onToggle(topic.id)}
                aria-label={`${topic.title}${strings.selectSuffix}`}
              />
              <strong>{topic.title}</strong>
            </label>
            <label htmlFor={`${topic.id}-title`}>{topic.title}{strings.titleSuffix}</label>
            <input
              id={`${topic.id}-title`}
              type="text"
              name={`${topic.id}-title`}
              autoComplete="off"
              value={topic.editedTitle}
              onChange={(event) => onTitleChange(topic.id, event.target.value)}
              disabled={!topic.selected}
            />
            <p>{topic.summary}</p>
            <details><summary>{strings.evidence}</summary>{topic.ranges.map((range, index) => <blockquote key={`${range.start}-${index}`}>{range.excerpt}</blockquote>)}</details>
          </article>
        ))}
      </div>
      <button className="primary-action" type="button" onClick={onGenerate} disabled={selected.length === 0}>
        {strings.generateSelected(selected.length)}
      </button>
    </section>
  );
}
