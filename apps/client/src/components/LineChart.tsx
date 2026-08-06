interface LineChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartPoint[];
  height?: number;
  accent?: string;
  yFormat?: (n: number) => string;
}

export function LineChart({
  data,
  height = 160,
  accent = 'stroke-brand-400',
  yFormat = (n) => n.toFixed(1),
}: LineChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="text-sm text-slate-500 flex items-center justify-center"
        style={{ height }}
      >
        Sin datos
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div
        className="text-sm text-slate-400 flex flex-col items-center justify-center gap-1"
        style={{ height }}
      >
        <div className="text-2xl font-semibold text-brand-300">
          {yFormat(data[0].value)}
        </div>
        <div className="text-xs">{data[0].label}</div>
      </div>
    );
  }

  const width = 600;
  const padding = { top: 16, right: 16, bottom: 28, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * innerW;
    const y =
      padding.top + innerH - ((d.value - minV) / range) * innerH;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${padding.top + innerH} L ${points[0].x.toFixed(1)} ${padding.top + innerH} Z`;

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => minV + (range * i) / yTicks);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {tickValues.map((tv, i) => {
          const y = padding.top + innerH - ((tv - minV) / range) * innerH;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                className="stroke-slate-800"
                strokeDasharray="2,3"
                strokeWidth={1}
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-500"
                fontSize="10"
              >
                {yFormat(tv)}
              </text>
            </g>
          );
        })}

        <path d={areaD} className="fill-brand-500/15" />

        <path
          d={pathD}
          fill="none"
          className={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            className="fill-slate-900 stroke-brand-300"
            strokeWidth={2}
          >
            <title>{`${p.label}: ${yFormat(p.value)}`}</title>
          </circle>
        ))}

        {data.length > 0 && (
          <>
            <text
              x={padding.left}
              y={height - 8}
              className="fill-slate-500"
              fontSize="10"
            >
              {data[0].label}
            </text>
            <text
              x={width - padding.right}
              y={height - 8}
              textAnchor="end"
              className="fill-slate-500"
              fontSize="10"
            >
              {data[data.length - 1].label}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
