import type { ReactNode } from "react";
import { stateTone, stateLabelFa, type Tone } from "../../lib/format";

export type ChipProps = {
  state?: string;
  tone?: Tone;
  children?: ReactNode;
};

export function Chip({ state, tone, children }: ChipProps) {
  const t: Tone = tone ?? stateTone(state);
  return (
    <span className="chip" data-tone={t}>
      {state && <span className="mono">{state}</span>}
      {state && <span className="fa">· {stateLabelFa(state)}</span>}
      {children}
    </span>
  );
}
