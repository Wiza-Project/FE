/**
 * 육각형 등 다각형 역량 방사형(레이더) 차트. 값은 0~100 스케일을 기준으로 합니다.
 *
 * @param {Object} props
 * @param {string[]} props.labels
 * @param {number[]} props.values
 * @param {number[]} [props.compareValues] 비교군(평균 등) 점선 오버레이
 * @param {string} [props.color]
 * @param {number} [props.size]
 */
export function RadarChart({ labels, values, compareValues, color = '#2563EB', size = 260 }) {
  const n = labels.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.72;
  const levels = 5;

  const angleOf = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (val, i) => {
    const ratio = val / 100;
    const a = angleOf(i);
    return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) };
  };

  const levelPolygon = (ratio) =>
    Array.from({ length: n }, (_, i) => {
      const a = angleOf(i);
      return `${cx + r * ratio * Math.cos(a)},${cy + r * ratio * Math.sin(a)}`;
    }).join(' ');

  const valuePath = values.map((v, i) => pt(v, i));
  const comparePath = compareValues?.map((v, i) => pt(v, i));

  const toPath = (pts) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {Array.from({ length: levels }, (_, i) => (
        <polygon
          key={i}
          points={levelPolygon((i + 1) / levels)}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="1"
        />
      ))}
      {/* Axes */}
      {Array.from({ length: n }, (_, i) => {
        const end = pt(100, i);
        return (
          <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#E5E7EB" strokeWidth="1" />
        );
      })}
      {/* Compare */}
      {comparePath && (
        <path
          d={toPath(comparePath)}
          fill={`${color}15`}
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity={0.6}
        />
      )}
      {/* Values */}
      <path d={toPath(valuePath)} fill={`${color}30`} stroke={color} strokeWidth="2" />
      {valuePath.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} />
      ))}
      {/* Labels */}
      {labels.map((label, i) => {
        const a = angleOf(i);
        const lx = cx + (r + 22) * Math.cos(a);
        const ly = cy + (r + 22) * Math.sin(a);
        const anchor = Math.abs(lx - cx) < 5 ? 'middle' : lx < cx ? 'end' : 'start';
        return (
          <text
            key={i}
            x={lx.toFixed(1)}
            y={(ly + 4).toFixed(1)}
            textAnchor={anchor}
            fontSize="11"
            fill="#656D76"
            fontFamily="Pretendard, sans-serif"
            fontWeight="600"
          >
            {label}
          </text>
        );
      })}
      {/* Value numbers */}
      {valuePath.map((p, i) => (
        <text
          key={i}
          x={p.x.toFixed(1)}
          y={(p.y - 6).toFixed(1)}
          textAnchor="middle"
          fontSize="10"
          fill={color}
          fontFamily="Pretendard, sans-serif"
          fontWeight="700"
        >
          {values[i]}
        </text>
      ))}
    </svg>
  );
}
