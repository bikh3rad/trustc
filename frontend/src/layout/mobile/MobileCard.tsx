// MobileCard — single-row touchable card that replaces a table row on mobile.
// Each card is a <button> so it gets native tap behaviour, focus rings, and
// the scale-down "active" feedback defined in .mobile-card:active.
import type { CSSProperties, ReactNode } from "react";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  // `right` lands on the trailing edge of the title row (typically a chip/amount).
  right?: ReactNode;
  // `meta` is a strip below the dashed divider for compact secondary fields.
  meta?: ReactNode;
  onClick?: () => void;
  // Inline border tint for the start-edge accent rail (e.g. risk color).
  accent?: string;
};

export function MobileCard({ title, subtitle, right, meta, onClick, accent }: Props) {
  const style: CSSProperties | undefined = accent
    ? { borderInlineStartColor: accent, borderInlineStartWidth: 3 }
    : undefined;
  return (
    <button
      type="button"
      className="mobile-card"
      onClick={onClick}
      style={style}
    >
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "start", gap: 12 }}
      >
        <div style={{ minWidth: 0, textAlign: "start" }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
          {subtitle && (
            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
              {subtitle}
            </div>
          )}
        </div>
        {right && (
          <div style={{ flexShrink: 0, textAlign: "end" }}>{right}</div>
        )}
      </div>
      {meta && <div className="mobile-card-meta">{meta}</div>}
    </button>
  );
}
