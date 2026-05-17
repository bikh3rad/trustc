// MobileFSMVertical — vertical timeline replacing the desktop horizontal FSM.
// Mirrors the visual states (done | current | locked) from <FSM>, just laid
// out top-to-bottom with a ping animation on the current step.
import { Icon } from "../../components/ui/Icon";
import { PROCUREMENT_FSM, stateIndex, toFaDigits } from "../../lib/format";

export function MobileFSMVertical({ currentState }: { currentState: string }) {
  const ci = stateIndex(currentState);
  return (
    <div className="mobile-fsm">
      {PROCUREMENT_FSM.map((s, i) => {
        const cls = i < ci ? "done" : i === ci ? "current" : "locked";
        return (
          <div key={s.state} className={"mobile-fsm-step " + cls}>
            <div className="step-dot">
              {i < ci && <Icon.check size={11} />}
              {i === ci && <span className="ping" />}
              {i > ci && <span>{toFaDigits(i + 1)}</span>}
            </div>
            <div className="step-body">
              <div className="step-num mono">{toFaDigits(`0${i + 1}`)}</div>
              <div className="step-label">{s.label}</div>
              <div className="step-state mono">{s.state}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
