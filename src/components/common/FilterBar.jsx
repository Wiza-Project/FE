import { Button } from './Button';

/**
 * @param {Object} props
 * @param {import('react').ReactNode} [props.children] 검색 조건 필드들
 * @param {() => void} [props.onSearch]
 * @param {() => void} [props.onReset]
 * @param {() => void} [props.onExport]
 */
export function FilterBar({ children, onSearch, onReset, onExport }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 mb-4 flex items-end gap-3 flex-wrap shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {children}
      <div className="flex items-center gap-2 ml-auto">
        <Button size="sm" onClick={onSearch}>
          조회
        </Button>
        <Button size="sm" variant="secondary" onClick={onReset}>
          초기화
        </Button>
        {onExport && (
          <Button
            size="sm"
            variant="outline"
            onClick={onExport}
            icon={
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.5 13.5h11V15h-11zM8 11.5L3.5 7h3V1h3v6h3z" />
              </svg>
            }
          >
            엑셀
          </Button>
        )}
      </div>
    </div>
  );
}
