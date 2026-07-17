export type FlowStep = 1 | 2 | 3 | 4;

const steps = [
  { number: 1, label: "貼り付け" },
  { number: 2, label: "テーマ確認" },
  { number: 3, label: "Trace生成" },
  { number: 4, label: "ZIP保存" },
] as const;

export function FlowStepper({ current }: { current: FlowStep }): React.ReactElement {
  return (
    <ol className="flow-stepper" aria-label="会議ログからMarkdownまでの流れ">
      {steps.map(({ number, label }) => {
        const complete = number < current;
        const active = number === current;
        return (
          <li
            key={number}
            className={complete ? "flow-step flow-step-complete" : active ? "flow-step flow-step-current" : "flow-step"}
            aria-current={active ? "step" : undefined}
            aria-label={`${number}${label}${complete ? "完了" : active ? "現在" : ""}`}
          >
            <span className="flow-step-number">{number}</span>
            <span>{label}</span>
            {complete ? <span className="flow-step-status">完了</span> : active ? <span className="flow-step-status">現在</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
