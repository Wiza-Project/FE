import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/common';
import { ApiError } from '@/api/client';
import { counselorPublicResultHistoryQueryKey, getCounselorPublicResultHistory } from '@/api/counsel';
import { COUNSELING_PUBLIC_RESULT_ERROR_CODE } from '@/constants/domain';
import { formatKstDateTime } from './staffCounselingDate';
import { getPublicResultErrorMessage } from './publicResultSupport';

function handleHistoryModalKeyDown(event, modalElement, onClose) {
  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
    return;
  }

  if (event.key !== 'Tab' || !modalElement) return;

  const focusableElements = Array.from(
    modalElement.querySelectorAll(
      'button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (!firstElement || !lastElement) {
    event.preventDefault();
    return;
  }

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

/**
 * 공개 결과의 전체 버전 이력을 읽기 전용으로 보여준다. open === true이고 sessionId가 있을 때만
 * 조회하고, 닫히면 이 컴포넌트가 직접 이력 캐시를 제거한다. 정정 사유·작성자는 담당(또는 과거
 * 담당) 상담사 본인에게만 보이며 비공개 상담 기록 원문은 다루지 않는다.
 */
export default function PublicResultHistoryModal({ sessionId, open, onClose, onResultUnavailable }) {
  const queryClient = useQueryClient();
  const historyContentRef = useRef(null);

  // 이력은 사용자가 '이력 보기'를 눌러 open이 true가 됐을 때만 조회한다(자동 조회 금지).
  // gcTime: 0 — 닫으면 아래 클로즈 핸들러에서 즉시 캐시를 제거하므로 남는 잔여 시간을 두지 않는다.
  const {
    data: historyItems,
    isLoading: historyLoading,
    isError: historyIsError,
    error: historyError,
  } = useQuery({
    queryKey: counselorPublicResultHistoryQueryKey(sessionId),
    queryFn: () => getCounselorPublicResultHistory(sessionId),
    enabled: open && sessionId !== null,
    gcTime: 0,
    retry: false,
  });

  // [S-05] 이력 조회 자체가 403/404면(정정 mutation과 동일한 접근 불가) 부모 Editor에 알려
  // 결과 화면 전체를 정리하게 한다. 지금 열려 있는 모달의 오류일 때만 반응하고, 일반 네트워크
  // 오류에서는 부모를 닫지 않는다(자식 오류 문구만 표시).
  useEffect(() => {
    if (!open || sessionId === null || !historyIsError) return;
    if (
      historyError instanceof ApiError &&
      (historyError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN ||
        historyError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.SESSION_NOT_FOUND)
    ) {
      onResultUnavailable();
    }
  }, [open, sessionId, historyIsError, historyError, onResultUnavailable]);

  // 이 컴포넌트가 이력 Query 캐시 제거를 직접 소유한다. 닫기 요청이 들어오면 캐시를 지운
  // 뒤에만 부모의 onClose(open state·트리거 포커스 조정)를 호출한다.
  const closeHistory = useCallback(() => {
    if (sessionId !== null) {
      queryClient.removeQueries({ queryKey: counselorPublicResultHistoryQueryKey(sessionId) });
    }
    onClose();
  }, [sessionId, queryClient, onClose]);

  // 이력 모달은 읽기 전용이라 닫기를 막을 진행 중 상태가 없다 — 열려 있으면 항상 Escape로 닫는다.
  useEffect(() => {
    if (open) {
      historyContentRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const modalElement = historyContentRef.current?.closest('.fixed');
    const onKeyDown = (event) => handleHistoryModalKeyDown(event, modalElement, closeHistory);

    modalElement?.addEventListener('keydown', onKeyDown);
    return () => modalElement?.removeEventListener('keydown', onKeyDown);
  }, [open, closeHistory]);

  return (
    // 버전 이력 모달 — 열렸을 때만 조회하고 닫으면 캐시를 제거한다.
    <Modal open={open} onClose={closeHistory} title="버전 이력" size="lg">
      {/* tabIndex=-1 + ref: 공개 결과·정정 모달과 같은 이유로 열리자마자 이 안으로 포커스를
          옮긴다. 이게 없으면 이력 모달이 열려도 포커스는 "이력 보기" 버튼에 그대로 남는다. */}
      <div ref={historyContentRef} tabIndex={-1}>
      {historyLoading ? (
        <p className="text-center text-[12px] text-[#656D76] py-4">불러오는 중입니다.</p>
      ) : historyIsError ? (
        <p className="text-[12px] text-[#CF222E]" role="alert">
          {getPublicResultErrorMessage(historyError)}
        </p>
      ) : !historyItems || historyItems.length === 0 ? (
        <p className="p-4 text-center text-[12px] text-[#656D76]" role="alert">
          공개된 버전이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3 max-h-[calc(100dvh-16rem)] overflow-y-auto pr-1">
          {historyItems.map((item, index) => {
            const olderVersion = historyItems[index + 1];
            // 이력 API는 이전 값을 중복으로 내려주지 않으므로, 바로 다음(더 오래된) 버전과
            // 인접 비교해 변경 항목만 화면에서 계산한다(별도 diff 라이브러리 없음).
            const summaryChanged = olderVersion ? item.resultSummary !== olderVersion.resultSummary : false;
            const planChanged = olderVersion ? item.actionPlan !== olderVersion.actionPlan : false;
            const isFirstVersion = item.versionNo === 1;
            return (
              <div key={item.publicResultId} className="rounded-[8px] border border-[#E5E7EB] p-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#1F2328]">
                    v{item.versionNo}
                  </span>
                  <span className="text-[11px] text-[#656D76]">
                    {isFirstVersion ? '최초 공개' : '정정'} · {item.createdByName ?? '알 수 없음'} · 공개{' '}
                    {formatKstDateTime(item.publishedAt)}
                  </span>
                  {summaryChanged && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                      요약 변경
                    </span>
                  )}
                  {planChanged && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                      실행 계획 변경
                    </span>
                  )}
                </div>
                {!isFirstVersion && (
                  <p className="text-[11px] text-[#656D76]">
                    정정 사유: {item.correctionReason}
                  </p>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-[#1F2328] mb-1">공개 요약</p>
                  <div className="px-3 py-2 rounded-[6px] bg-[#F9FAFB] border border-[#E5E7EB] text-[12px] text-[#444D56] whitespace-pre-wrap">
                    {item.resultSummary}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#1F2328] mb-1">실행계획</p>
                  <div className="px-3 py-2 rounded-[6px] bg-[#F9FAFB] border border-[#E5E7EB] text-[12px] text-[#444D56] whitespace-pre-wrap">
                    {item.actionPlan ?? '등록된 실행계획이 없습니다.'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </Modal>
  );
}
