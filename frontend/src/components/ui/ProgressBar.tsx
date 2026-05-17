import type { Tone } from "../../lib/format";

export type ProgressTone = Exclude<Tone, "neutral">;

export type ProgressBarProps = {
  value: number;
  max?: number;
  tone?: ProgressTone;
};

const COLOR: Record<ProgressTone, string> = {
  active: "var(--state-active)",
  good: "var(--state-good)",
  warn: "var(--state-warn)",
  bad: "var(--state-bad)",
};

export function ProgressBar({ value, max = 100, tone = "active" }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      style={{
        height: 6,
        background: "var(--cream-100)",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: pct + "%",
          height: "100%",
          background: COLOR[tone],
          transition: "width 320ms var(--ease-document)",
        }}
      />
    </div>
  );
}
