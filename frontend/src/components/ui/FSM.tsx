import { PROCUREMENT_FSM, stateIndex, toFaDigits } from "../../lib/format";

export function FSM({ currentState }: { currentState: string }) {
  const ci = stateIndex(currentState);
  return (
    <div className="fsm">
      {PROCUREMENT_FSM.map((s, i) => {
        const cls = i < ci ? "done" : i === ci ? "current" : "locked";
        return (
          <div className={"fsm-step " + cls} key={s.state}>
            <div className="step-num">{toFaDigits(`0${i + 1}`)}</div>
            <div className="step-state">{s.state}</div>
            <div className="step-label">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}
