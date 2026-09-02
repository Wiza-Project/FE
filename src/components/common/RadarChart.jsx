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

// 긴 축 라벨(예: "자원·정보·기술 활용")이 차트 밖에서 잘리지 않도록 최대 2줄로 나눈다.
// 두 줄 길이가 최대한 비슷해지도록, 가운데에 가장 가까운 구분자에서 자른다.
// 공백이 있으면 공백만 후보로 삼고, 없을 때만 '·'를 쓴다. 둘 다 없으면 글자 수 절반에서 자른다.
const wrapLabel = (label) => {
  if (label.length <= 6) return [label];
  const mid = label.length / 2;
  const sep = label.includes(' ') ? ' ' : '·';
  const cuts = [];
  for (let i = 1; i < label.length - 1; i++) if (label[i] === sep) cuts.push(i + 1);
  const cut = cuts.length
    ? cuts.reduce((best, idx) => (Math.abs(idx - mid) < Math.abs(best - mid) ? idx : best))
    : Math.round(mid);
  return [label.slice(0, cut).trim(), label.slice(cut).trim()];
};

export function RadarChart({ labels, values, compareValues, color = '#2563EB', size = 260 }) {
  const n = labels.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.72;
  const levels = 5;

  // 축 라벨은 반지름 바깥(r + 18)에 그려지므로 viewBox와 실제 렌더 크기에 여백을 둬야 잘리지 않는다.
  // 차트 본체는 size 기준 그대로 그리고, 여백만큼 svg가 더 커진다(좁은 컨테이너에서는 maxWidth로 축소).
  const padX = 56;
  const padY = 32;

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
    <svg
      width={size + padX * 2}
      height={size + padY * 2}
      viewBox={`${-padX} ${-padY} ${size + padX * 2} ${size + padY * 2}`}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
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
        const lx = cx + (r + 18) * Math.cos(a);
        const ly = cy + (r + 18) * Math.sin(a);
        const anchor = Math.abs(lx - cx) < 5 ? 'middle' : lx < cx ? 'end' : 'start';
        const lines = wrapLabel(label);
        return (
          <text
            key={i}
            x={lx.toFixed(1)}
            y={(ly + 4 - (lines.length - 1) * 6).toFixed(1)}
            textAnchor={anchor}
            fontSize="11"
            fill="#656D76"
            fontFamily="Pretendard, sans-serif"
            fontWeight="600"
          >
            {lines.map((ln, li) => (
              <tspan key={li} x={lx.toFixed(1)} dy={li === 0 ? 0 : 12}>
                {ln}
              </tspan>
            ))}
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
