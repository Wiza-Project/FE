/**
 * @param {Object} props
 * @param {{label: string, onClick?: () => void}[]} [props.breadcrumbs]
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {import('react').ReactNode} [props.actions]
 * @param {string} [props.accentColor]
 */
export function PageHeader({ breadcrumbs, title, subtitle, actions, accentColor = '#2563EB' }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumbs && (
          <div className="flex items-center gap-1 mb-1">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-[#9AA0A6] text-[12px]">/</span>}
                <span
                  className={`text-[12px] ${b.onClick ? 'text-[#2563EB] cursor-pointer hover:underline' : 'text-[#656D76]'}`}
                  onClick={b.onClick}
                >
                  {b.label}
                </span>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full" style={{ background: accentColor }} />
          <h1 className="text-[24px] font-bold text-[#1F2328] leading-tight">{title}</h1>
        </div>
        {subtitle && <p className="text-[13px] text-[#656D76] mt-1 ml-4">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 mt-1">{actions}</div>}
    </div>
  );
}
