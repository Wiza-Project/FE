/**
 * @param {Object} props
 * @param {string[]} props.steps
 * @param {number} props.current 0-based 현재 단계 인덱스
 * @param {string} [props.accentColor]
 */
export function Stepper({ steps, current, accentColor = '#2563EB' }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-colors ${done ? 'text-white border-transparent' : active ? 'text-white border-transparent' : 'text-[#9AA0A6] border-[#E5E7EB] bg-white'}`}
                style={done || active ? { background: accentColor, borderColor: accentColor } : {}}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className={`text-[11px] font-semibold whitespace-nowrap ${active ? 'text-[#1F2328]' : done ? 'text-[#656D76]' : 'text-[#9AA0A6]'}`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-4 ${done ? '' : 'bg-[#E5E7EB]'}`}
                style={done ? { background: accentColor } : {}}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
