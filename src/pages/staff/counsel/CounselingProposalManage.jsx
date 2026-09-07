import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, Pagination, SkeletonLoader } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  eligibleCounselingProposalResultsQueryKey,
  fetchEligibleCounselingProposalResults,
} from '@/api/counsel';
import { COUNSELING_PROPOSAL_ERROR_CODE } from '@/constants/domain';
import { formatKstDateTime } from './staffCounselingDate';
import CounselingProposalCreateDialog from './CounselingProposalCreateDialog';

const ACCENT = '#1F2937';
const PAGE_SIZE = 20;

/**
 * ST200 only 상담사가 학생별 최신 17점 이상 스트레스 결과 후보를 조회하고
 * 1~1,000자 제안을 생성하는 화면이다. StaffCounselingPage에서 ST200 only일 때만
 * 진입 가능한 탭으로 노출된다(역할 분기는 상위 컴포넌트 책임).
 *
 * @param {Object} props
 * @param {() => void} props.onAccessDenied 서버가 A004(권한 없음)를 반환했을 때 한 번 호출된다.
 *   서버 응답의 민감한 내용은 전달하지 않으며, 부모가 허용된 다른 상담 탭으로 이동시킨다.
 */
export default function CounselingProposalManage({ onAccessDenied }) {
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);
  const panelRef = useRef(null);
  const [page, setPage] = useState(0);
  const [selectedResult, setSelectedResult] = useState(null);
  const openTriggerRef = useRef(null);
  // A004는 한 번만 상위에 알린다. 같은 오류로 콜백·화면 이동이 반복되지 않게 한다.
  const accessDeniedNotifiedRef = useRef(false);

  const {
    data: eligiblePage,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: eligibleCounselingProposalResultsQueryKey(page, PAGE_SIZE),
    queryFn: () => fetchEligibleCounselingProposalResults({ page, size: PAGE_SIZE }),
    // 후보는 심리검사 결과 접근이라 화면을 벗어나면 즉시 회수해야 하는 민감정보다.
    gcTime: 0,
    retry: false,
  });

  // 후보 목록은 심리검사 결과 접근이므로 이 화면을 벗어나면 캐시에 남기지 않는다.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      queryClient.removeQueries({ queryKey: ['eligibleCounselingProposalResults'] });
    };
  }, [queryClient]);

  const content = eligiblePage?.content ?? [];
  const totalElements = eligiblePage?.totalElements ?? 0;
  const totalPages = eligiblePage?.totalPages ?? 0;
  const isAccessDenied =
    isError && error instanceof ApiError && error.code === COUNSELING_PROPOSAL_ERROR_CODE.FORBIDDEN;

  // A004를 상위에 한 번만 알리고, 민감한 후보 캐시를 즉시 제거한다. 이미 화면이 닫혔으면
  // (ref 가드) 다시 호출하지 않는다.
  const notifyAccessDenied = useCallback(() => {
    if (!isMountedRef.current || accessDeniedNotifiedRef.current) return;
    accessDeniedNotifiedRef.current = true;
    setSelectedResult(null);
    queryClient.removeQueries({ queryKey: ['eligibleCounselingProposalResults'] });
    onAccessDenied();
  }, [queryClient, onAccessDenied]);

  useEffect(() => {
    // 페이지·필터가 바뀌면 이전 페이지를 유지하지 않으므로(placeholderData 미사용) 현재 데이터로만 보정한다.
    if (isError || !eligiblePage) return;
    if (totalPages === 0 && page !== 0) {
      setPage(0);
      return;
    }
    if (totalPages > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [isError, eligiblePage, totalPages, page]);

  useEffect(() => {
    if (isAccessDenied) {
      notifyAccessDenied();
    }
  }, [isAccessDenied, notifyAccessDenied]);

  const openCreateDialog = (result, triggerEl) => {
    openTriggerRef.current = triggerEl;
    setSelectedResult(result);
  };

  const handleCreateDialogClose = () => {
    setSelectedResult(null);
    if (openTriggerRef.current?.isConnected) {
      openTriggerRef.current.focus();
      return;
    }
    panelRef.current?.focus();
  };

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className="outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F2937]"
    >
      <div className="flex items-center justify-between mb-4 gap-2">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">상담 제안</h1>
          <p className="text-[12px] text-[#6B7280] mt-0.5">
            스트레스 지수가 높은 학생들에게 상담을 제안하세요.
          </p>
        </div>
        {!isLoading && !isError && (
          <span
            className="text-[12px] font-bold px-3 py-1 rounded-full bg-[#F3F4F6] whitespace-nowrap"
            style={{ color: ACCENT }}
          >
            후보 {totalElements}건
          </span>
        )}
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <span className="text-[13px] font-bold text-[#1F2328]">제안 가능 후보</span>
        </div>

        {isLoading ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">후보 목록을 불러오는 중입니다.</span>
            <SkeletonLoader rows={4} cols={5} />
          </div>
        ) : isAccessDenied ? (
          // 권한 없음: 재시도 버튼을 주지 않는다. 후보 행·입력 UI를 렌더하지 않고, 상위가
          // 허용된 탭으로 이동시키는 동안 안내만 보여 준다.
          <div className="p-4 text-[12px] text-[#A40E26]" role="alert">
            <p>상담 제안 후보를 조회할 권한이 없습니다. 접근 가능한 화면으로 이동합니다.</p>
          </div>
        ) : isError ? (
          <div className="p-4 text-[12px] text-[#A40E26]" role="alert">
            <p>후보 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 min-h-[40px]"
              loading={isFetching}
              onClick={() => refetch()}
            >
              다시 시도
            </Button>
          </div>
        ) : content.length === 0 ? (
          <EmptyState message="현재 상담 제안이 가능한 최신 스트레스 검사 결과가 없습니다." />
        ) : (
          <>
            {/* 데스크톱: 표 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                    {['검사일', '학번', '학생명', '점수', '수준', '처리'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i === 5 ? 'text-center' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.map((result) => (
                    <tr
                      key={result.resultId}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-[#6B7280] whitespace-nowrap">
                        {formatKstDateTime(result.testedAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#444D56]">
                        {result.universityNo}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-[#1F2328]">
                        {result.studentName}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]" style={{ color: ACCENT }}>
                        {result.totalScore}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6]"
                          style={{ color: ACCENT }}
                        >
                          {result.resultLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => openCreateDialog(result, e.currentTarget)}
                          className="min-h-[40px] px-3 text-[11px] font-bold rounded-[6px] bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE] transition-colors"
                        >
                          제안 작성
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일: 카드. 표와 동일한 학생 식별·점수·검사일·제안 액션을 담는다. */}
            <ul className="md:hidden divide-y divide-[#F3F4F6]">
              {content.map((result) => (
                <li key={result.resultId} className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[#1F2328]">
                      {result.studentName}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6]"
                      style={{ color: ACCENT }}
                    >
                      {result.resultLevel}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#6B7280]">
                    <span className="font-mono text-[#444D56]">{result.universityNo}</span>
                    <span>
                      점수{' '}
                      <span style={{ color: ACCENT }} className="font-bold">
                        {result.totalScore}
                      </span>
                    </span>
                    <span className="font-mono">{formatKstDateTime(result.testedAt)}</span>
                  </div>
                  <button
                    onClick={(e) => openCreateDialog(result, e.currentTarget)}
                    className="self-start min-h-[40px] px-3 text-[12px] font-bold rounded-[6px] bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE] transition-colors"
                  >
                    제안 작성
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {!isLoading && !isError && totalPages > 1 && (
        <div className="min-w-0 max-w-full overflow-x-auto">
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            totalItems={totalElements}
            pageSize={PAGE_SIZE}
            onChange={(nextPage) => setPage(nextPage - 1)}
          />
        </div>
      )}

      {selectedResult && (
        <CounselingProposalCreateDialog
          key={selectedResult.resultId}
          result={selectedResult}
          onClose={handleCreateDialogClose}
          onAccessDenied={notifyAccessDenied}
        />
      )}
    </div>
  );
}
