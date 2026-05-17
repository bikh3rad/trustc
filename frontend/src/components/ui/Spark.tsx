export type SparkProps = {
  points: number[];
  color?: string;
  height?: number;
  fill?: string;
};

export function Spark({
  points,
  color = "var(--orange-600)",
  height = 64,
  fill = "rgba(210,105,30,0.12)",
}: SparkProps) {
  if (!points || points.length === 0) return null;
  const w = 100;
  const h = height;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((p, i): [number, number] => [
    i * step,
    h - ((p - min) / range) * (h - 8) - 4,
  ]);
  const linePath =
    "M " + coords.map((c) => c[0].toFixed(2) + " " + c[1].toFixed(2)).join(" L ");
  const areaPath = linePath + ` L ${w} ${h} L 0 ${h} Z`;
  const last = coords[coords.length - 1];
  return (
    <svg
      className="spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={areaPath} fill={fill} />
      <path
        d={linePath}
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={color} />
    </svg>
  );
}
