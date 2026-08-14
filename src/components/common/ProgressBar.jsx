/**
 * @param {Object} props
 * @param {number} props.value
 * @param {number} [props.max]
 * @param {string} [props.color]
 * @param {string} [props.label]
 * @param {boolean} [props.showValue]
 * @param {'sm'|'md'} [props.size]
 */
export function ProgressBar({
  value,
  max = 100,
  color = '#2563EB',
  label,
  showValue = false,
  size = 'md',
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';
  return (
    <div className="flex flex-col gap-1">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-[12px] text-[#656D76]">{label}</span>}
          {showValue && (
            <span className="text-[12px] font-semibold text-[#1F2328]">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div className={`${h} bg-[#E5E7EB] rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
