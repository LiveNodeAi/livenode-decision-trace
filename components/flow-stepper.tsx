export type FlowStep = 1 | 2 | 3 | 4;
import type { UiStrings } from "@/lib/ui-strings";

export function FlowStepper({ current, strings }: { current: FlowStep; strings: UiStrings }): React.ReactElement {
  const steps = strings.flowSteps.map((label, index) => ({ number: index + 1, label }));
  return (
    <ol className="flow-stepper" aria-label={strings.flowList}>
      {steps.map(({ number, label }) => {
        const complete = number < current;
        const active = number === current;
        return (
          <li
            key={number}
            className={complete ? "flow-step flow-step-complete" : active ? "flow-step flow-step-current" : "flow-step"}
            aria-current={active ? "step" : undefined}
            aria-label={`${number}${label}${complete ? strings.complete : active ? strings.current : ""}`}
          >
            <span className="flow-step-number">{number}</span>
            <span>{label}</span>
            {complete ? <span className="flow-step-status">{strings.complete}</span> : active ? <span className="flow-step-status">{strings.current}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
