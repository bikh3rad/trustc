// Small bespoke SVG charts driven by the per-startup monthly aggregator
// in lib/monthly.ts. Hand-rolled to keep the bundle free of a charting
// dependency for the prototype.

import { toFaDigits } from "../../lib/format";

type Common = {
  labels: readonly string[];
  height?: number;
};

/* ------------------- Grouped bars: purchases vs sales ------------------- */
export function BarPair({
  labels,
  a,
  b,
  colorA,
  colorB,
  height = 210,
}: Common & {
  a: number[];
  b: number[];
  colorA: string;
  colorB: string;
}) {
  const w = 600;
  const padX = 24;
  const padY = 18;
  const max = Math.max(1, ...a, ...b);
  const n = labels.length;
  const groupW = (w - padX * 2) / n;
  const barW = Math.max(6, groupW / 2 - 8);

  return (
    <div style={{ position: "relative", height }}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        aria-hidden="true"
      >
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line
            key={i}
            x1={padX}
            x2={w - padX}
            y1={padY + (height - padY * 2) * (1 - t)}
            y2={padY + (height - padY * 2) * (1 - t)}
            stroke="var(--border-hairline)"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}
        {labels.map((_, i) => {
          const gx = padX + i * groupW + groupW / 2;
          const ah = ((a[i] || 0) / max) * (height - padY * 2);
          const bh = ((b[i] || 0) / max) * (height - padY * 2);
          return (
            <g key={i}>
              <rect
                x={gx - barW - 2}
                y={height - padY - ah}
                width={barW}
                height={ah}
                fill={colorA}
                rx={1.5}
              />
              <rect
                x={gx + 2}
                y={height - padY - bh}
                width={barW}
                height={bh}
                fill={colorB}
                rx={1.5}
              />
            </g>
          );
        })}
      </svg>
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          fontFamily: "var(--mono-data)",
          fontSize: 11,
          color: "var(--fg-muted)",
          marginTop: 4,
          paddingInline: 24,
        }}
      >
        {labels.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </div>
  );
}

/* ------------------- Two overlaid lines + area + ceiling ------------------- */
export function DualLine({
  labels,
  a,
  b,
  colorA,
  colorB,
  fillA,
  fillB,
  height = 210,
  yMax,
  yMaxLabel,
}: Common & {
  a: number[];
  b: number[];
  colorA: string;
  colorB: string;
  fillA: string;
  fillB: string;
  yMax?: number;
  yMaxLabel?: string;
}) {
  const w = 600;
  const padX = 24;
  const padY = 18;
  const max = Math.max(1, yMax || 0, ...a, ...b);
  const x = (i: number) => padX + (i * (w - padX * 2)) / (labels.length - 1);
  const y = (v: number) => padY + (1 - v / max) * (height - padY * 2);

  const pathFor = (arr: number[]) =>
    "M " + arr.map((v, i) => `${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" L ");
  const areaFor = (arr: number[]) =>
    pathFor(arr) +
    ` L ${x(arr.length - 1)} ${height - padY} L ${x(0)} ${height - padY} Z`;

  return (
    <div style={{ position: "relative", height }}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        aria-hidden="true"
      >
        {yMax !== undefined && (
          <line
            x1={padX}
            x2={w - padX}
            y1={padY}
            y2={padY}
            stroke="var(--orange-600)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.55}
          />
        )}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line
            key={i}
            x1={padX}
            x2={w - padX}
            y1={padY + (height - padY * 2) * (1 - t)}
            y2={padY + (height - padY * 2) * (1 - t)}
            stroke="var(--border-hairline)"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}
        <path d={areaFor(a)} fill={fillA} />
        <path
          d={pathFor(a)}
          stroke={colorA}
          strokeWidth={1.8}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        <path d={areaFor(b)} fill={fillB} />
        <path
          d={pathFor(b)}
          stroke={colorB}
          strokeWidth={1.8}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        {a.map((v, i) => (
          <circle key={`a${i}`} cx={x(i)} cy={y(v)} r={2.6} fill={colorA} />
        ))}
        {b.map((v, i) => (
          <circle key={`b${i}`} cx={x(i)} cy={y(v)} r={2.6} fill={colorB} />
        ))}
      </svg>
      {yMaxLabel && (
        <div
          style={{
            position: "absolute",
            insetInlineStart: 28,
            top: 2,
            fontSize: 10,
            color: "var(--orange-600)",
            fontFamily: "var(--mono-data)",
            letterSpacing: 0.4,
          }}
        >
          {yMaxLabel}
        </div>
      )}
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          fontFamily: "var(--mono-data)",
          fontSize: 11,
          color: "var(--fg-muted)",
          marginTop: 4,
          paddingInline: 24,
        }}
      >
        {labels.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </div>
  );
}

/* ------------------- 0..100 line: credit health score ------------------- */
export function ScoreLine({
  labels,
  points,
  color,
  fill,
  height = 210,
}: Common & {
  points: number[];
  color: string;
  fill: string;
}) {
  const w = 600;
  const padX = 24;
  const padY = 18;
  const x = (i: number) => padX + (i * (w - padX * 2)) / (labels.length - 1);
  const y = (v: number) => padY + (1 - v / 100) * (height - padY * 2);
  const linePath =
    "M " + points.map((v, i) => `${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" L ");
  const areaPath =
    linePath + ` L ${x(points.length - 1)} ${height - padY} L ${x(0)} ${height - padY} Z`;

  return (
    <div style={{ position: "relative", height }}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        aria-hidden="true"
      >
        {[20, 40, 60, 80].map((v) => (
          <g key={v}>
            <line
              x1={padX}
              x2={w - padX}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--border-hairline)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <text
              x={padX - 4}
              y={y(v) + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--fg-muted)"
              fontFamily="var(--mono-data)"
            >
              {v}
            </text>
          </g>
        ))}
        <path d={areaPath} fill={fill} />
        <path
          d={linePath}
          stroke={color}
          strokeWidth={2}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((v, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r={3} fill={color} />
            <text
              x={x(i)}
              y={y(v) - 8}
              textAnchor="middle"
              fontSize={10}
              fill={color}
              fontFamily="var(--mono-data)"
              fontWeight={600}
            >
              {toFaDigits(v)}
            </text>
          </g>
        ))}
      </svg>
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          fontFamily: "var(--mono-data)",
          fontSize: 11,
          color: "var(--fg-muted)",
          marginTop: 4,
          paddingInline: 24,
        }}
      >
        {labels.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </div>
  );
}
