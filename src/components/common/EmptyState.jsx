/**
 * @param {Object} props
 * @param {string} [props.message]
 * @param {string} [props.sub]
 * @param {import('react').ReactNode} [props.action]
 */
export function EmptyState({ message = '데이터가 없습니다.', sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-1">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="#9AA0A6" strokeWidth="1.5" />
          <path d="M7 10h6M10 7v6" stroke="#9AA0A6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-[13px] font-semibold text-[#656D76]">{message}</span>
      {sub && <span className="text-[12px] text-[#9AA0A6]">{sub}</span>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
