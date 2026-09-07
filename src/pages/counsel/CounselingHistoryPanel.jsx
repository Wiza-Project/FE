import { useCallback, useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Pagination, StatusBadge } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  getStudentCounselingPublicResult,
  getStudentCounselingResults,
  studentCounselingResultDetailQueryKey,
  studentCounselingResultsQueryKey,
} from '@/api/counsel';
import { COUNSELING_PUBLIC_RESULT_ERROR_CODE } from '@/constants/domain';
import { formatKstDateTime } from './myCounselingDate';

const ACCENT = '#0891B2';

// ─── 상담 이력(공개 결과) ────────────────────────────────────────────────────

const RESULT_PAGE_SIZE = 20;

function getStudentResultErrorMessage(error) {
  if (!(error instanceof ApiError))
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  if (error.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.RESULT_NOT_FOUND)
    return '해당 상담 결과를 찾을 수 없습니다. 목록을 다시 불러왔습니다.';
  // A004(권한없음)는 같은 요청을 반복해도 해결되지 않는다 — S011(소유권·미공개 등)과
  // 달리 "다시 시도" 버튼을 보여주면 안 되므로 문구도 구분한다.
  if (error.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN)
    return '이 상담 결과를 조회할 권한이 없습니다.';
  return '상담 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

// A004는 재시도해도 결과가 바뀌지 않는 오류이므로 "다시 시도" 버튼을 숨긴다.
function isRetryableStudentResultError(error) {
  return !(error instanceof ApiError && error.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN);
}

export default function CounselingHistoryPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  // 상세를 연 회기 ID만 들고 있는다. 목록 행의 요약 데이터를 그대로 재사용하지 않고 매번
  // 전용 상세 API로 최신 상태를 다시 받아 온다(다른 학생·미공개 초안 오류를 정확히 검증하기 위함).
  const [drawerSessionId, setDrawerSessionId] = useState(null);
  const drawerTriggerRef = useRef(null);

  const {
    data: resultPage,
    isLoading,
    isError,
    error: listError,
    refetch,
    isPlaceholderData,
  } = useQuery({
    queryKey: studentCounselingResultsQueryKey(page, RESULT_PAGE_SIZE),
    queryFn: () => getStudentCounselingResults({ page, size: RESULT_PAGE_SIZE }),
    // 상세 쿼리와 동일하게 공개 요약 내용을 담은 캐시를 기본 gcTime(5분) 동안 남기지 않는다.
    gcTime: 0,
    retry: false,
    // 다음 페이지를 읽는 동안 기존 행과 페이지네이션을 유지한다.
    placeholderData: keepPreviousData,
  });

  // 상세 상담 결과는 학생 본인에게도 민감한 개인정보이므로 gcTime: 0으로 두어 Drawer를 닫으면
  // 즉시 캐시에서 제거한다(기본 gcTime 5분 동안 남지 않도록).
  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailIsError,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: studentCounselingResultDetailQueryKey(drawerSessionId),
    queryFn: () => getStudentCounselingPublicResult(drawerSessionId),
    enabled: drawerSessionId !== null,
    gcTime: 0,
    retry: false,
  });

  const closeDrawer = useCallback(() => {
    const drawerTrigger = drawerTriggerRef.current;
    if (drawerSessionId !== null) {
      queryClient.removeQueries({ queryKey: studentCounselingResultDetailQueryKey(drawerSessionId) });
    }
    setDrawerSessionId(null);
    window.requestAnimationFrame(() => {
      if (drawerTrigger?.isConnected) {
        drawerTrigger.focus();
      }
    });
  }, [drawerSessionId, queryClient]);

  // S011(다른 학생 소유·미공개·존재하지 않음)은 소유권 세부를 노출하지 않고 상세를 닫은 뒤
  // 목록만 다시 읽는다. 목록에서 이미 사라진 오래된 항목을 계속 보여주지 않기 위함이다.
  useEffect(() => {
    if (
      detailIsError &&
      detailError instanceof ApiError &&
      detailError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.RESULT_NOT_FOUND
    ) {
      closeDrawer();
      refetch();
    }
  }, [detailIsError, detailError, closeDrawer, refetch]);

  const items = resultPage?.content ?? [];
  const totalElements = resultPage?.totalElements ?? 0;
  const totalPages = resultPage?.totalPages ?? 0;

  useEffect(() => {
    // 이전 페이지를 표시 중일 때는 그 응답의 totalPages로 현재 페이지를 보정하지 않는다.
    if (isPlaceholderData || isError || !resultPage) return;
    if (totalPages === 0 && page !== 0) {
      setPage(0);
      return;
    }
    if (totalPages > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [isError, isPlaceholderData, page, resultPage, totalPages]);

  return (
    <div>
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['상담일', '상담유형', '상담사', '상태', '공개 요약', ''].map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${['상담유형', '상담사', '공개 요약'].includes(h) ? 'text-left' : 'text-center'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#9AA0A6]">
                  상담 결과를 불러오는 중입니다.
                </td>
              </tr>
            )}
            {!isLoading && isError && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <p className="text-[#CF222E]">{getStudentResultErrorMessage(listError)}</p>
                  {isRetryableStudentResultError(listError) && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={refetch}>
                      다시 시도
                    </Button>
                  )}
                </td>
              </tr>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#9AA0A6]">
                  공개된 상담 결과가 없습니다.
                </td>
              </tr>
            )}
            {!isLoading &&
              !isError &&
              items.map((item, i) => (
                <tr
                  key={item.publicResultId}
                  className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#F0FDFE] transition-colors ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                >
                  <td className="px-4 py-3 text-center text-[#9AA0A6] font-mono whitespace-nowrap">
                    {formatKstDateTime(item.startsAt)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#1F2328]">
                    {item.counselingTypeName}
                    <span className="text-[#9AA0A6] font-normal ml-1">
                      ({item.sessionNo}회기)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#656D76]">{item.counselorName}</td>
                  <td className="px-4 py-3 text-center">
                    {/* 서버 finalResult가 참일 때만 '완료 결과'로 표시한다. 일반 공개는 예약 완료가 아니다. */}
                    <StatusBadge
                      status={item.finalResult ? 'completed' : 'published'}
                      variant={item.finalResult ? 'success' : 'info'}
                      label={item.finalResult ? '완료 결과' : '공개 결과'}
                      size="sm"
                    />
                  </td>
                  <td className="px-4 py-3 max-w-[260px]">
                    <p className="text-[12px] text-[#656D76] leading-snug line-clamp-2">
                      {item.resultSummary}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={(event) => {
                        drawerTriggerRef.current = event.currentTarget;
                        setDrawerSessionId(item.sessionId);
                      }}
                      aria-label={`${item.counselingTypeName} ${item.sessionNo}회기 상담 결과 상세 보기`}
                      className="h-6 px-2.5 text-[11px] font-bold rounded-[5px] border transition-colors hover:bg-[#F0FDFE]"
                      style={{ borderColor: ACCENT, color: ACCENT }}
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
          </table>
        </div>
      </div>

      {!isLoading && !isError && totalPages > 1 && (
        <Pagination
          page={page + 1}
          totalPages={totalPages}
          totalItems={totalElements}
          pageSize={RESULT_PAGE_SIZE}
          onChange={(nextPage) => setPage(nextPage - 1)}
        />
      )}

      {/* Detail Drawer */}
      <Drawer
        open={drawerSessionId !== null}
        onClose={closeDrawer}
        title="상담 이력 상세"
        footer={
          <Button size="sm" variant="secondary" onClick={closeDrawer}>
            닫기
          </Button>
        }
      >
        {detailLoading ? (
          <p className="text-center text-[12px] text-[#656D76] py-4">불러오는 중입니다.</p>
        ) : detailIsError ? (
          // S011은 위 effect가 이미 Drawer를 닫으므로, 여기 남는 오류는 그 외(네트워크 등)뿐이다.
          <div>
            <p className="text-[12px] text-[#CF222E]" role="alert">
              {getStudentResultErrorMessage(detailError)}
            </p>
            {isRetryableStudentResultError(detailError) && (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => refetchDetail()}>
                다시 시도
              </Button>
            )}
          </div>
        ) : (
          detail && (
            <div className="flex flex-col gap-5 py-2">
              {/* Meta */}
              <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[8px] px-4 py-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#0E7490]">
                    {detail.counselingTypeName}
                  </span>
                  <StatusBadge
                    status={detail.finalResult ? 'completed' : 'published'}
                    variant={detail.finalResult ? 'success' : 'info'}
                    label={detail.finalResult ? '완료 결과' : '공개 결과'}
                    size="sm"
                  />
                </div>
                <div className="flex gap-3 text-[12px] text-[#0891B2]">
                  <span>
                    📅 {formatKstDateTime(detail.startsAt)} · {detail.sessionNo}회기
                  </span>
                  <span>👤 {detail.counselorName}</span>
                </div>
                <p className="text-[11px] text-[#0891B2]">
                  공개 {formatKstDateTime(detail.publishedAt)}
                </p>
              </div>

              {/* Public summary */}
              <div>
                <h3 className="text-[13px] font-bold text-[#1F2328] mb-2 flex items-center gap-1.5">
                  <div className="w-1 h-3.5 rounded-full" style={{ background: ACCENT }} />
                  공개 요약
                </h3>
                {/* dangerouslySetInnerHTML 금지 — 줄바꿈은 CSS(whitespace-pre-wrap)로만 보존한다 */}
                <p className="text-[13px] text-[#444D56] leading-relaxed bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] px-4 py-3 whitespace-pre-wrap">
                  {detail.resultSummary}
                </p>
              </div>

              {/* Action plan */}
              <div>
                <h3 className="text-[13px] font-bold text-[#1F2328] mb-2 flex items-center gap-1.5">
                  <div className="w-1 h-3.5 rounded-full bg-[#7C3AED]" />
                  실행계획
                </h3>
                <p className="text-[13px] text-[#444D56] leading-relaxed bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] px-4 py-3 whitespace-pre-wrap">
                  {detail.actionPlan ?? '등록된 실행계획이 없습니다.'}
                </p>
              </div>

              {/* Private notice */}
              <div className="flex items-start gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-4 py-3">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="#9AA0A6"
                  className="flex-shrink-0 mt-0.5"
                >
                  <circle cx="8" cy="8" r="7" />
                  <path d="M8 4v5M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="text-[12px] text-[#9AA0A6] leading-snug">
                  상담사가 작성한 상세 상담기록은 비공개입니다.
                </p>
              </div>
            </div>
          )
        )}
      </Drawer>
    </div>
  );
}
