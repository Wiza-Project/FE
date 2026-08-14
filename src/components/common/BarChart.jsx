/**
 * @param {Object} props
 * @param {{label: string, value: number}[]} props.data
 * @param {string} [props.color]
 * @param {number} [props.height]
 * @param {string} [props.unit]
 */
export function BarChart({ data, color = '#2563EB', height = 180, unit = '' }) {
  const max = Math.max(...data.map((d) => d.value));
  const barW = Math.min(36, Math.floor(320 / data.length) - 8);
  const chartW = data.length * (barW + 12) + 20;

  return (
    <svg width={chartW} height={height + 32} viewBox={`0 0 ${chartW} ${height + 32}`}>
      {/* Y grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((r) => (
        <line
          key={r}
          x1={10}
          y1={height * (1 - r)}
          x2={chartW - 10}
          y2={height * (1 - r)}
          stroke="#E5E7EB"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}
      {data.map((d, i) => {
        const x = 10 + i * (barW + 12) + 6;
        const barH = (d.value / max) * height * 0.92;
        const y = height - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} opacity="0.85" rx="3" />
            <text
              x={x + barW / 2}
              y={y - 4}
              textAnchor="middle"
              fontSize="10"
              fill={color}
              fontFamily="Pretendard, sans-serif"
              fontWeight="700"
            >
              {d.value}
              {unit}
            </text>
            <text
              x={x + barW / 2}
              y={height + 14}
              textAnchor="middle"
              fontSize="10"
              fill="#656D76"
              fontFamily="Pretendard, sans-serif"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
