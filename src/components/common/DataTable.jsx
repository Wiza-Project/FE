import { useState } from 'react';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';

/**
 * 범용 데이터 테이블. 정렬 표시는 UI만 제공하며 실제 정렬은 호출 측에서 데이터를 미리 정렬해 넘기세요.
 *
 * @template T
 * @param {Object} props
 * @param {{key: string, header: string, width?: string, align?: 'left'|'center'|'right', render?: (row: T) => import('react').ReactNode}[]} props.columns
 * @param {T[]} props.data
 * @param {(row: T) => string} props.rowKey
 * @param {boolean} [props.selectable]
 * @param {(row: T) => void} [props.onRowClick]
 * @param {string} [props.emptyMessage]
 * @param {boolean} [props.loading]
 */
export function DataTable({
  columns,
  data,
  rowKey,
  selectable,
  onRowClick,
  emptyMessage = '데이터가 없습니다.',
  loading,
}) {
  const [selected, setSelected] = useState(new Set());
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const toggleAll = () => {
    if (selected.size === data.length) setSelected(new Set());
    else setSelected(new Set(data.map(rowKey)));
  };

  const toggleRow = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (loading) return <SkeletonLoader rows={6} />;

  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {selectable && (
                <th className="w-10 px-3 py-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === data.length && data.length > 0}
                    onChange={toggleAll}
                    className="rounded-[3px] border-[#D1D5DB] accent-[#2563EB]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 font-semibold text-[#656D76] text-[12px] uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-[#1F2328] transition-colors ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={{ width: col.width }}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {sortKey === col.key && (
                      <span className="text-[#2563EB]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-16 text-center"
                >
                  <EmptyState message={emptyMessage} />
                </td>
              </tr>
            ) : (
              data.map((row, i) => {
                const key = rowKey(row);
                const isSelected = selected.has(key);
                return (
                  <tr
                    key={key}
                    className={`border-b border-[#E5E7EB] last:border-0 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-[#EFF6FF]' : i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'} hover:bg-[#F0F7FF]`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td
                        className="px-3 py-2.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(key);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                          className="rounded-[3px] border-[#D1D5DB] accent-[#2563EB]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 text-[#1F2328] ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
