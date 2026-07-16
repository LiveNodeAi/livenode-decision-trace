import type { ReactNode } from "react";

type TraceCardProps = {
  title: string;
  children: ReactNode;
};

export function TraceCard({ title, children }: TraceCardProps) {
  return (
    <section data-testid="trace-section" aria-labelledby={`trace-${title}`}>
      <h2 id={`trace-${title}`}>{title}</h2>
      {children}
    </section>
  );
}
