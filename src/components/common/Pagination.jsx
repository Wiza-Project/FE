/**
 * @param {Object} props
 * @param {number} props.page
 * @param {number} props.totalPages
 * @param {(page: number) => void} props.onChange
 * @param {number} [props.totalItems]
 * @param {number} [props.pageSize]
 */
export function Pagination({ page, totalPages, onChange, totalItems, pageSize = 10 }) {
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });

  return (
    <div className="flex items-center justify-between mt-3 px-1">
      {totalItems != null ? (
        <span className="text-[12px] text-[#656D76]">
          총 {totalItems.toLocaleString()}건 중 {(page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, totalItems)}건
        </span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[12px] text-[#656D76] hover:bg-[#F3F4F6] disabled:opacity-30 transition-colors"
        >
          «
        </button>
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[12px] text-[#656D76] hover:bg-[#F3F4F6] disabled:opacity-30 transition-colors"
        >
          ‹
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-7 h-7 flex items-center justify-center rounded-[6px] text-[12px] font-semibold transition-colors ${p === page ? 'bg-[#2563EB] text-white' : 'text-[#656D76] hover:bg-[#F3F4F6]'}`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[12px] text-[#656D76] hover:bg-[#F3F4F6] disabled:opacity-30 transition-colors"
        >
          ›
        </button>
        <button
          onClick={() => onChange(totalPages)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[12px] text-[#656D76] hover:bg-[#F3F4F6] disabled:opacity-30 transition-colors"
        >
          »
        </button>
      </div>
    </div>
  );
}
