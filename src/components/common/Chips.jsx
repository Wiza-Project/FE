/**
 * @param {Object} props
 * @param {string[]} props.options
 * @param {string} props.value
 * @param {(v: string) => void} props.onChange
 * @param {string} [props.accentColor]
 */
export function Chips({ options, value, onChange, accentColor = '#2563EB' }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-[999px] text-[12px] font-semibold transition-colors border ${value === opt ? 'text-white border-transparent' : 'bg-white border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB]'}`}
          style={value === opt ? { background: accentColor, borderColor: accentColor } : {}}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
