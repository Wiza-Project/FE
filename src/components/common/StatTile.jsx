/**
 * @param {Object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {string} [props.sub]
 * @param {string} [props.accentColor]
 * @param {import('react').ReactNode} [props.icon]
 * @param {{value: string, up?: boolean}} [props.trend]
 */
export function StatTile({ label, value, sub, accentColor = '#2563EB', icon, trend }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-4 flex flex-col gap-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#656D76] uppercase tracking-wide">
          {label}
        </span>
        {icon && <span className="text-[#9AA0A6]">{icon}</span>}
      </div>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-[32px] font-bold leading-none" style={{ color: accentColor }}>
          {value}
        </span>
        {trend && (
          <span
            className={`text-[12px] font-semibold mb-1 ${trend.up ? 'text-[#1A7F37]' : 'text-[#CF222E]'}`}
          >
            {trend.up ? '▲' : '▼'} {trend.value}
          </span>
        )}
      </div>
      {sub && <span className="text-[12px] text-[#9AA0A6]">{sub}</span>}
    </div>
  );
}
