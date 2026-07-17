import { useId, type ReactNode } from "react";

type TraceCardProps = {
  index: number;
  title: string;
  children: ReactNode;
  headingLevel?: 2 | 5;
};

export function TraceCard({ index, title, children, headingLevel = 2 }: TraceCardProps) {
  const headingId = `trace-${useId().replaceAll(":", "")}`;
  const Heading = headingLevel === 5 ? "h5" : "h2";
  return (
    <section className="trace-card" data-testid="trace-section" aria-labelledby={headingId}>
      <header><span aria-hidden="true">{String(index).padStart(2, "0")}</span><Heading id={headingId}>{title}</Heading></header>
      {children}
    </section>
  );
}
