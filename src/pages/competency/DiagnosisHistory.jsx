import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchAssessmentHistory } from '@/api/competency';
import { ApiError } from '@/api/client';
import { useCommonCode } from '@/hooks/useCommonCode';
import { COMP_COLOR } from '@/data/competencyData';
import { formatDate } from '@/utils/date';
import { PageHeader, Button, Pagination, EmptyState, SkeletonLoader, toast } from '@/components/common';

const PAGE_SIZE = 10;

const TYPE_BADGE = {
  PRE: { label: '사전', className: 'bg-[#EDE9FE] text-[#7C3AED]' },
  POST: { label: '사후', className: 'bg-[#DBEAFE] text-[#0969DA]' },
};

const typeBadge = (type) =>
  TYPE_BADGE[type] ?? { label: type ?? '-', className: 'bg-[#F3F4F6] text-[#656D76]' };

/**
 * 과거 진단 결과 열람. 응시완료(제출)한 회차를 제출일 최신순으로 조회한다.
 * 목록 응답에 역량 점수가 없어 평균·백분위 컬럼은 두지 않고, 회차를 고르면 결과 조회
 * 화면이 attemptId로 상세를 다시 불러온다.
 *
 * @param {Object} props
 * @param {(attemptId: number) => void} props.onViewResult
 * @param {(items: import('@/api/competency').AssessmentHistoryItem[]) => void} props.onCompare
 *   체크박스로 고른 두 회차를 넘긴다. 넘겨받은 회차로 비교 화면을 그리는 일은 이 컴포넌트 밖이다.
 */
export default function DiagnosisHistory({ onViewResult, onCompare }) {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(1);
  // 최대 2건. 페이지를 넘어가도 선택이 유지되도록 id가 아니라 항목 객체로 보관한다.
  const [selected, setSelected] = useState([]);

  const { data: semesterCodes = [] } = useCommonCode('SEMESTER');
  const semesterLabel = (code) => semesterCodes.find((s) => s.code === code)?.codeName ?? code;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['assessmentHistory', { keyword: submittedKeyword, page }],
    queryFn: () =>
      fetchAssessmentHistory({
        keyword: submittedKeyword || undefined,
        page: page - 1,
        size: PAGE_SIZE,
      }),
    // 페이지·검색어를 바꾸는 동안 이전 목록과 Pagination을 그대로 유지해 깜빡임을 없앤다.
    placeholderData: keepPreviousData,
  });

  const rows = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const runSearch = () => {
    setSubmittedKeyword(keyword.trim());
    setPage(1);
  };

  const resetSearch = () => {
    setKeyword('');
    setSubmittedKeyword('');
    setPage(1);
  };

  const toggleSelect = (item) => {
    setSelected((prev) => {
      if (prev.some((x) => x.attemptId === item.attemptId)) {
        return prev.filter((x) => x.attemptId !== item.attemptId);
      }
      if (prev.length >= 2) {
        toast('비교는 두 개 회차만 선택할 수 있습니다.', 'warning');
        return prev;
      }
      return [...prev, item];
    });
  };

  // 선택한 두 회차를 상위로 넘기기만 한다. 비교 화면 렌더링은 아직 이 컴포넌트가 맡지 않는다.
  const handleCompare = () => {
    if (selected.length === 2) onCompare(selected);
  };

  return (
    <div className="relative pb-20">
      <PageHeader
        breadcrumbs={[{ label: '핵심역량 진단' }, { label: '진단 이력' }]}
        title="진단 이력"
        subtitle="응시를 완료한 핵심역량 진단 회차를 최신순으로 확인합니다."
        accentColor={COMP_COLOR}
      />

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
        className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 mb-4 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="진단명 검색"
          aria-label="진단명 검색"
          className="h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#7C3AED] w-56"
        />
        <Button type="submit" size="sm" style={{ background: COMP_COLOR }}>
          검색
        </Button>
        {submittedKeyword && (
          <button
            type="button"
            onClick={resetSearch}
            className="text-[12px] font-semibold text-[#656D76] hover:underline"
          >
            초기화
          </button>
        )}
        <span className="text-[12px] text-[#9AA0A6] ml-auto">
          {selected.length > 0 && (
            <span className="font-semibold text-[#7C3AED]">{selected.length}개 선택됨 · </span>
          )}
          총 {totalElements.toLocaleString()}건
        </span>
      </form>

      {/* Table — SkeletonLoader가 자체 카드를 그리므로 로딩 분기는 바깥 카드 밖에 둔다 */}
      {isLoading ? (
        <SkeletonLoader rows={PAGE_SIZE} cols={6} />
      ) : (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {isError ? (
            <div className="p-6 text-[13px] text-[#CF222E] font-semibold">
              {error instanceof ApiError ? error.message : '진단 이력을 불러오지 못했습니다.'}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              message={submittedKeyword ? '검색 결과가 없습니다.' : '응시를 완료한 진단이 없습니다.'}
              sub={
                submittedKeyword
                  ? '다른 검색어로 다시 시도해 주세요.'
                  : '진단을 제출하면 이곳에서 결과를 다시 볼 수 있습니다.'
              }
            />
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  <th className="w-10 px-3 py-3" />
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
                    제출일 ↓
                  </th>
                  <th className="w-24 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((d, i) => {
                  const isSelected = selected.some((x) => x.attemptId === d.attemptId);
                  const badge = typeBadge(d.assessmentType);
                  return (
                    <tr
                      key={d.attemptId}
                      className={`border-b border-[#E5E7EB] last:border-0 transition-colors ${isSelected ? 'bg-[#F5F3FF]' : i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'} hover:bg-[#F5F3FF]`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(d)}
                          aria-label={`${d.assessmentName} 비교 대상 선택`}
                          className="rounded-[3px] accent-[#7C3AED] cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold text-[#1F2328]">{d.assessmentName}</td>
                      <td className="px-3 py-3 text-[#656D76]">
                        {d.academicYear}학년도 {semesterLabel(d.semesterCode)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-[#656D76]">
                        {formatDate(d.submittedAt)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => onViewResult(d.attemptId)}
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
          )}
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          totalItems={totalElements}
          pageSize={PAGE_SIZE}
        />
      )}

      {/* Fixed compare bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-[240px] right-0 z-30 bg-[#1F2937] border-t border-[#374151] px-8 py-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {selected.map((item) => {
                const badge = typeBadge(item.assessmentType);
                return (
                  <span
                    key={item.attemptId}
                    className="flex items-center gap-1.5 text-[12px] text-white bg-[#374151] px-3 py-1.5 rounded-full"
                  >
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                    {item.assessmentName}
                    <button
                      onClick={() => toggleSelect(item)}
                      className="text-[#9CA3AF] hover:text-white ml-1"
                      aria-label={`${item.assessmentName} 선택 해제`}
                    >
                      ✕
                    </button>
                  </span>
                );
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
