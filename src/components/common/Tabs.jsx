/**
 * @param {Object} props
 * @param {{key: string, label: string, count?: number}[]} props.tabs
 * @param {string} props.active
 * @param {(key: string) => void} props.onChange
 * @param {string} [props.accentColor]
 */
export function Tabs({ tabs, active, onChange, accentColor = '#2563EB' }) {
  return (
    <div className="flex border-b border-[#E5E7EB] mb-4" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          id={`tab-${tab.key}`}
          role="tab"
          aria-selected={active === tab.key}
          aria-controls={`panel-${tab.key}`}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-[13px] font-semibold transition-colors relative whitespace-nowrap ${active === tab.key ? 'text-[#1F2328]' : 'text-[#656D76] hover:text-[#1F2328]'}`}
        >
          {tab.label}
          {tab.count != null && (
            <span
              className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full font-bold ${active === tab.key ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F3F4F6] text-[#9AA0A6]'}`}
            >
              {tab.count}
            </span>
          )}
          {active === tab.key && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
              style={{ background: accentColor }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
