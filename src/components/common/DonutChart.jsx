/**
 * @param {Object} props
 * @param {{label: string, value: number, color: string}[]} props.segments
 * @param {number} [props.size]
 * @param {string} [props.centerLabel]
 * @param {string} [props.centerValue]
 */
export function DonutChart({ segments, size = 180, centerLabel, centerValue }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 60;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = 22;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const pct = seg.value / total;
    const arc = { ...seg, pct, offset, dasharray: `${pct * circumference} ${circumference}` };
    offset += pct * circumference;
    return arc;
  });

  return (
    <div className="flex items-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={strokeW} />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeW}
            strokeDasharray={arc.dasharray}
            strokeDashoffset={-arc.offset}
            strokeLinecap="butt"
          />
        ))}
        {centerValue && (
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fontSize="20"
            fontWeight="700"
            fill="#1F2328"
            fontFamily="Pretendard, sans-serif"
            style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px` }}
          >
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fontSize="11"
            fill="#656D76"
            fontFamily="Pretendard, sans-serif"
            style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px` }}
          >
            {centerLabel}
          </text>
        )}
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: seg.color }}
            />
            <span className="text-[12px] text-[#656D76]">{seg.label}</span>
            <span className="text-[12px] font-bold text-[#1F2328] ml-auto">
              {seg.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
