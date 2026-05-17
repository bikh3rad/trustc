import type { ReactNode, CSSProperties } from "react";

export type StatDelta = { text: string; tone?: "up" | "down" | "" };

export type StatProps = {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  delta?: StatDelta | null;
  hint?: ReactNode;
  accent?: string;
};

export function Stat({ label, value, unit, delta, hint, accent }: StatProps) {
  const style: CSSProperties | undefined = accent ? { borderColor: accent } : undefined;
  return (
    <div className="stat" style={style}>
      <div className="label">{label}</div>
      <div className="value">
        <span className="num">{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {(delta || hint) && (
        <div className={"delta " + (delta?.tone ?? "")}>{delta?.text ?? hint}</div>
      )}
    </div>
  );
}
