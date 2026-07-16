import { DecisionTraceApp } from "@/components/decision-trace-app";

export default function Page() {
  return (
    <main>
      <header className="masthead">
        <p className="eyebrow">LIVENODE / EVIDENCE INSTRUMENT 01</p>
        <h1 aria-label="LiveNode Decision Trace"><span aria-hidden="true">LiveNode </span><span aria-hidden="true" className="title-main">Decision <i>Trace</i></span></h1>
        <p className="lede">曖昧な判断を、たどり直せる構造へ。</p>
      </header>
      <DecisionTraceApp />
    </main>
  );
}
