/**
 * @param {Object} props
 * @param {string} [props.label]
 * @param {{value: string, label: string}[]} props.options
 */
export function Select({ label, options, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[13px] font-semibold text-[#1F2328]">{label}</label>}
      <select
        className={`h-9 rounded-[6px] border border-[#E5E7EB] bg-white px-3 pr-8 text-[13px] text-[#1F2328] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] cursor-pointer transition-colors appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23656D76' d='M6 8L1 3h10z'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_10px_center] ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
