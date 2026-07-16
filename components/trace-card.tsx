import type { ReactNode } from "react";

type TraceCardProps = {
  index: number;
  title: string;
  children: ReactNode;
};

export function TraceCard({ index, title, children }: TraceCardProps) {
  return (
    <section className="trace-card" data-testid="trace-section" aria-labelledby={`trace-${title}`}>
      <header><span aria-hidden="true">{String(index).padStart(2, "0")}</span><h2 id={`trace-${title}`}>{title}</h2></header>
      {children}
    </section>
  );
}
