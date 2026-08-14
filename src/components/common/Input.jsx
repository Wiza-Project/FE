/**
 * @param {Object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.hint]
 * @param {import('react').ReactNode} [props.prefix]
 */
export function Input({ label, error, hint, prefix, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[13px] font-semibold text-[#1F2328]">{label}</label>}
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-[#656D76]">{prefix}</span>}
        <input
          className={`w-full h-9 rounded-[6px] border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#1F2328] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors ${prefix ? 'pl-8' : ''} ${error ? 'border-[#CF222E]' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-[11px] text-[#CF222E]">{error}</span>}
      {hint && !error && <span className="text-[11px] text-[#656D76]">{hint}</span>}
    </div>
  );
}
