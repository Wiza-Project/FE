import { useState } from 'react';
import { DIAGNOSIS_HISTORY } from '@/data/competencyData';
import { PageHeader, Button, Pagination, Select, toast } from '@/components/common';

const YEAR_OPTIONS = [
  { value: '', label: '전체 학년도' },
  { value: '2026', label: '2026학년도' },
  { value: '2025', label: '2025학년도' },
  { value: '2024', label: '2024학년도' },
];

/**
 * @param {Object} props
 * @param {(id: string) => void} props.onViewResult
 * @param {(ids: [string, string]) => void} props.onCompare
 */
export default function DiagnosisHistory({ onViewResult, onCompare }) {
  const [selected, setSelected] = useState([]);
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = DIAGNOSIS_HISTORY.filter((d) => !year || d.semester.startsWith(year));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        toast('비교는 두 개 회차만 선택할 수 있습니다.', 'warning');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selected.length === 2) onCompare(selected);
  };

  return (
    <div className="relative pb-20">
      <PageHeader
        breadcrumbs={[{ label: '핵심역량 진단' }, { label: '진단 이력' }]}
        title="진단 이력"
        subtitle="학기별 핵심역량 진단 응시 이력을 확인합니다."
        accentColor="#7C3AED"
        actions={
          <Button
            size="sm"
            style={{ background: '#7C3AED' }}
            onClick={() => toast('신규 진단 안내 페이지로 이동합니다.', 'info')}
          >
            진단 신청
          </Button>
        }
      />

      {/* Filter */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 mb-4 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Select
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            setPage(1);
          }}
          options={YEAR_OPTIONS}
        />
        <span className="text-[12px] text-[#9AA0A6] ml-auto">
          {selected.length > 0 && (
            <span className="font-semibold text-[#7C3AED]">{selected.length}개 선택됨 · </span>
          )}
          총 {filtered.length}건
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast('엑셀 다운로드 준비 중', 'info')}
          icon={
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.5 13.5h11V15h-11zM8 11.5L3.5 7h3V1h3v6h3z" />
            </svg>
          }
        >
          엑셀
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  className="rounded-[3px] accent-[#7C3AED]"
                  readOnly
                  checked={false}
                  onChange={() => {}}
                />
              </th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide">
                회차명
              </th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide">
                학년도·학기
              </th>
              <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide">
                구분
              </th>
              <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide">
                응시일 ↓
              </th>
              <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide">
                상태
              </th>
              <th className="text-right px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide">
                평균 점수
              </th>
              <th className="text-center px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide">
                백분위
              </th>
              <th className="w-24 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {paged.map((d, i) => {
              const isSelected = selected.includes(d.id);
              return (
                <tr
                  key={d.id}
                  className={`border-b border-[#E5E7EB] last:border-0 transition-colors ${isSelected ? 'bg-[#F5F3FF]' : i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'} hover:bg-[#F5F3FF]`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(d.id)}
                      className="rounded-[3px] accent-[#7C3AED] cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-3 font-semibold text-[#1F2328]">{d.name}</td>
                  <td className="px-3 py-3 text-[#656D76]">{d.semester}</td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${d.type === '사전' ? 'bg-[#EDE9FE] text-[#7C3AED]' : 'bg-[#DBEAFE] text-[#0969DA]'}`}
                    >
                      {d.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-[#656D76]">{d.date}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#1A7F37]">
                      집계완료
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-black text-[#7C3AED]">{d.avg}점</td>
                  <td className="px-3 py-3 text-center text-[#656D76] text-[12px]">
                    상위 {d.percentile}%
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => onViewResult(d.id)}
                      className="text-[12px] font-semibold text-[#7C3AED] hover:underline"
                    >
                      결과보기
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={Math.ceil(filtered.length / PAGE_SIZE)}
        onChange={setPage}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
      />

      {/* Fixed compare bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-[240px] right-0 z-30 bg-[#1F2937] border-t border-[#374151] px-8 py-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {selected.map((id) => {
                const d = DIAGNOSIS_HISTORY.find((x) => x.id === id);
                return d ? (
                  <span
                    key={id}
                    className="flex items-center gap-1.5 text-[12px] text-white bg-[#374151] px-3 py-1.5 rounded-full"
                  >
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${d.type === '사전' ? 'bg-[#EDE9FE] text-[#7C3AED]' : 'bg-[#DBEAFE] text-[#0969DA]'}`}
                    >
                      {d.type}
                    </span>
                    {d.name}
                    <button
                      onClick={() => toggleSelect(id)}
                      className="text-[#9CA3AF] hover:text-white ml-1"
                    >
                      ✕
                    </button>
                  </span>
                ) : null;
              })}
            </div>
            {selected.length < 2 && (
              <span className="text-[12px] text-[#9CA3AF]">1개 더 선택하면 비교가 가능합니다.</span>
            )}
          </div>
          <Button
            size="md"
            disabled={selected.length !== 2}
            onClick={handleCompare}
            style={{ background: selected.length === 2 ? '#7C3AED' : undefined }}
            className="disabled:opacity-40"
          >
            선택한 {selected.length}개 회차 비교하기
          </Button>
        </div>
      )}
    </div>
  );
}
