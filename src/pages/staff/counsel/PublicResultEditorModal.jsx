import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, ConfirmDialog, Modal, StatusBadge, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  completeCounselingWithPublicResult,
  counselorPublicResultQueryKey,
  getCounselorPublicResult,
  publishCounselorPublicResult,
  saveCounselorPublicResult,
  studentCounselingResultDetailQueryKey,
} from '@/api/counsel';
import {
  COUNSELING_PUBLIC_RESULT_ERROR_CODE,
  COUNSELING_PUBLIC_RESULT_STATUS,
  COUNSELING_PUBLIC_RESULT_STATUS_LABEL,
} from '@/constants/domain';
import { formatKstDateTime } from './staffCounselingDate';
import PublicResultCorrectionModal from './PublicResultCorrectionModal';
import PublicResultHistoryModal from './PublicResultHistoryModal';
import {
  cancelQueryBeforeUpdate,
  getPublicResultErrorMessage,
  updateQueryIfPresent,
} from './publicResultSupport';

const SUMMARY_MAX_LENGTH = 3000;
const ACTION_PLAN_MAX_LENGTH = 3000;

const RESULT_STATUS_BADGE_VARIANT = {
  [COUNSELING_PUBLIC_RESULT_STATUS.EMPTY]: 'neutral',
  [COUNSELING_PUBLIC_RESULT_STATUS.DRAFT]: 'warning',
  [COUNSELING_PUBLIC_RESULT_STATUS.PUBLISHED]: 'success',
};

function handleResultModalKeyDown(event, modalElement, isPending, requestClose) {
  if (event.key === 'Escape') {
    event.preventDefault();
    if (!isPending) requestClose();
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
 * 선택된 회기의 공개 상담 결과(학생에게 보이는 요약·실행계획)를 조회·저장·일반 공개하고, 마지막
 * 출석 완료 회기 결과로 예약을 최종 완료한다. 비공개 상담 기록 원문은 이 화면에 없다(SessionRecord
 * 전용). 이미 공개된 최신 버전의 정정과 전체 버전 이력 조회는 PublicResultCorrectionModal·
 * PublicResultHistoryModal에 위임하고, 정정 mutation 진행 여부만 pending callback으로 받는다.
 */
export default function PublicResultEditorModal({ sessionId, onClose }) {
  const queryClient = useQueryClient();

  // 로컬 입력값 — 컴포넌트 메모리에만 둔다. Zustand·localStorage·URL에 저장하지 않는다.
  const [summaryInput, setSummaryInput] = useState('');
  const [planInput, setPlanInput] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);

  // 정정 모달 open 조정 상태와, 정정 자식이 알려주는 mutation 진행 여부만 이 화면이 가진다.
  // 정정 입력·기준 버전·충돌 비교값은 PublicResultCorrectionModal이 소유한다.
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [isCorrectionPending, setIsCorrectionPending] = useState(false);

  // 이력 모달 상태 — 열렸을 때만 조회한다(PublicResultHistoryModal의 useQuery enabled로 제어).
  const [historyOpen, setHistoryOpen] = useState(false);

  const modalContentRef = useRef(null);
  // 이 컴포넌트는 부모 목록의 "결과 보기" 버튼 클릭을 직접 받지 않는다(부모가 sessionId prop만
  // 넘긴다). sessionId가 null → 값으로 바뀌는 시점의 document.activeElement가 곧 그 버튼이므로
  // 이를 트리거로 기억해뒀다가 닫힐 때 복원한다.
  const resultTriggerRef = useRef(null);
  useEffect(() => {
    if (sessionId !== null) {
      resultTriggerRef.current = document.activeElement;
    }
  }, [sessionId]);
  const restoreResultTriggerFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (resultTriggerRef.current?.isConnected) {
        resultTriggerRef.current.focus();
      }
    });
  }, []);

  // 정정·이력 모달도 공개 결과 모달과 같은 이유로 각자 트리거 버튼을 기억해둔다. 모달이 닫힌
  // 뒤 포커스를 되돌려주지 않으면, 키보드·스크린리더 사용자는 포커스가 배경(body)으로 빠져
  // "지금 화면 어디에 있는지" 다시 처음부터 찾아야 한다.
  const correctionTriggerRef = useRef(null);
  const restoreCorrectionTriggerFocus = useCallback(() => {
    const correctionTrigger = correctionTriggerRef.current;
    correctionTriggerRef.current = null;
    window.requestAnimationFrame(() => {
      if (correctionTrigger?.isConnected) {
        correctionTrigger.focus();
      }
    });
  }, []);

  const historyTriggerRef = useRef(null);
  const restoreHistoryTriggerFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (historyTriggerRef.current?.isConnected) {
        historyTriggerRef.current.focus();
      }
    });
  }, []);

  // 서버 초안을 한 번만 입력창에 채운다. 이후 같은 회기에서 재조회(예: 충돌 재검증)가 와도
  // 사용자가 입력 중인 값을 덮어쓰지 않기 위한 플래그다(SessionRecord 비공개 기록과 동일한 이유).
  const seededRef = useRef(false);
  const previousSessionIdRef = useRef(null);
  // mutation 콜백은 이 컴포넌트가 언마운트된 뒤에도 실행될 수 있다. 늦게 도착한 응답이 다른
  // 회기 화면이나 이미 닫힌 화면을 건드리지 않도록 최신 상태를 ref로 판별한다.
  const sessionIdRef = useRef(null);
  sessionIdRef.current = sessionId;
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 사용자가 선택한 회기의 공개 결과만 조회한다. gcTime: 0 — 화면을 벗어나면 즉시
  // 캐시에서 제거해 공개 요약·실행계획이 기본 gcTime(5분) 동안 남지 않게 한다.
  const {
    data: publicResult,
    isLoading: resultLoading,
    isError: resultIsError,
    error: resultError,
  } = useQuery({
    queryKey: counselorPublicResultQueryKey(sessionId),
    queryFn: () => getCounselorPublicResult(sessionId),
    enabled: sessionId !== null,
    gcTime: 0,
    retry: false,
  });

  // 이력 캐시 제거는 PublicResultHistoryModal이 소유한다. 이 컴포넌트는 open state와 트리거
  // 포커스 조정만 담당하는 조정용 close 함수를 useCallback으로 감싼다(Escape 키 트랩 재등록 방지).
  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
    restoreHistoryTriggerFocus();
  }, [restoreHistoryTriggerFocus]);

  const isEditableStatus =
    publicResult?.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.EMPTY ||
    publicResult?.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.DRAFT;

  // 회기를 바꾸면 이전 회기의 공개 결과 캐시를 지우고 입력값을 초기화한다.
  useEffect(() => {
    const previousSessionId = previousSessionIdRef.current;
    if (previousSessionId !== null && previousSessionId !== sessionId) {
      queryClient.removeQueries({ queryKey: counselorPublicResultQueryKey(previousSessionId) });
    }
    if (previousSessionId !== sessionId) {
      setSummaryInput('');
      setPlanInput('');
      setFormError('');
      setConfirmPublishOpen(false);
      setConfirmCompleteOpen(false);
      seededRef.current = false;
      // 회기를 바꾸면 정정 모달의 open 조정 상태와 이력 열람 상태도 모두 닫는다. 정정 입력·
      // 기준 버전·충돌 비교값은 PublicResultCorrectionModal이 sessionId prop 변화로 직접 지운다.
      setCorrectionOpen(false);
      setHistoryOpen(false);
    }
    previousSessionIdRef.current = sessionId;
  }, [sessionId, queryClient]);

  useEffect(() => {
    const isAccessError =
      resultError instanceof ApiError &&
      (resultError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN ||
        resultError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.SESSION_NOT_FOUND);

    if (!resultIsError || !isAccessError || sessionId === null) return;

    queryClient.removeQueries({ queryKey: counselorPublicResultQueryKey(sessionId) });
    queryClient.invalidateQueries({ queryKey: ['counselingSessions'] });
    onClose();
    restoreResultTriggerFocus();
  }, [resultIsError, resultError, sessionId, queryClient, onClose, restoreResultTriggerFocus]);

  // 서버 응답을 최초 1회만 입력창에 반영한다.
  useEffect(() => {
    if (
      sessionId === null ||
      !publicResult ||
      publicResult.sessionId !== sessionId ||
      seededRef.current
    ) {
      return;
    }
    if (
      publicResult.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.EMPTY ||
      publicResult.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.DRAFT
    ) {
      setSummaryInput(publicResult.resultSummary ?? '');
      setPlanInput(publicResult.actionPlan ?? '');
    }
    seededRef.current = true;
  }, [sessionId, publicResult]);

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['counselingSessions'] });

  const closeModal = useCallback(() => {
    if (sessionId !== null) {
      queryClient.removeQueries({ queryKey: counselorPublicResultQueryKey(sessionId) });
    }
    onClose();
    restoreResultTriggerFocus();
  }, [sessionId, queryClient, onClose, restoreResultTriggerFocus]);

  // 늦게 도착한 응답이 이미 닫힌 화면이나 다른 회기 화면을 건드리지 않도록 판별한다.
  const isResultScreenFor = (requestSessionId) =>
    isMountedRef.current && requestSessionId === sessionIdRef.current;

  // 저장·공개·완료 오류를 공통 분기한다. S010(충돌)은 로컬 입력을 지우지 않고 최신 서버 상태만
  // 다시 받아온다. FORBIDDEN·SESSION_NOT_FOUND는 존재 여부를 숨기기 위해 화면을 닫는다.
  const onMutationError = (mutationError, requestSessionId, action) => {
    if (
      mutationError instanceof ApiError &&
      mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.STATE_CONFLICT
    ) {
      queryClient.invalidateQueries({ queryKey: counselorPublicResultQueryKey(requestSessionId) });
      if (isResultScreenFor(requestSessionId)) {
        toast(getPublicResultErrorMessage(mutationError), 'error');
        if (action === 'publish') setConfirmPublishOpen(false);
        if (action === 'complete') setConfirmCompleteOpen(false);
      }
      return;
    }
    if (
      mutationError instanceof ApiError &&
      (mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN ||
        mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.SESSION_NOT_FOUND)
    ) {
      invalidateList();
      if (isResultScreenFor(requestSessionId)) {
        toast(getPublicResultErrorMessage(mutationError), 'error');
        closeModal();
      }
      return;
    }
    if (isResultScreenFor(requestSessionId)) {
      setFormError(getPublicResultErrorMessage(mutationError));
      if (action === 'publish') setConfirmPublishOpen(false);
      if (action === 'complete') setConfirmCompleteOpen(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: ({ sessionId: targetSessionId, resultSummary, actionPlan }) =>
      saveCounselorPublicResult(targetSessionId, { resultSummary, actionPlan }),
    onSuccess: async (data, { sessionId: targetSessionId }) => {
      if (!isResultScreenFor(targetSessionId)) return;
      const queryKey = counselorPublicResultQueryKey(targetSessionId);
      await cancelQueryBeforeUpdate(queryClient, queryKey);
      if (!isResultScreenFor(targetSessionId)) return;
      const updated = updateQueryIfPresent(queryClient, queryKey, data);
      if (!updated) return;
      setSummaryInput(data.resultSummary ?? '');
      setPlanInput(data.actionPlan ?? '');
      setFormError('');
      toast('공개 결과를 임시저장했습니다.', 'success');
    },
    onError: (mutationError, { sessionId: targetSessionId }) =>
      onMutationError(mutationError, targetSessionId, 'save'),
  });

  // 일반 공개는 예약 상태를 바꾸지 않는다 — 성공해도 목록의 예약·회기 상태를 건드리지 않고
  // 이 결과와(가능하면) 학생 쪽 결과 조회만 무효화한다.
  const publishMutation = useMutation({
    mutationFn: (targetSessionId) => publishCounselorPublicResult(targetSessionId),
    onSuccess: async (data, targetSessionId) => {
      // 페이지별로 나뉜 학생 결과 목록 캐시를 접두사만으로 한 번에 무효화한다.
      queryClient.invalidateQueries({ queryKey: ['studentCounselingResults'] });
      queryClient.invalidateQueries({ queryKey: studentCounselingResultDetailQueryKey(targetSessionId) });
      if (!isResultScreenFor(targetSessionId)) return;
      const queryKey = counselorPublicResultQueryKey(targetSessionId);
      await cancelQueryBeforeUpdate(queryClient, queryKey);
      if (!isResultScreenFor(targetSessionId)) return;
      updateQueryIfPresent(queryClient, queryKey, data);
      setConfirmPublishOpen(false);
      toast('결과를 공개했습니다. 예약은 계속 진행 중입니다.', 'success');
    },
    onError: (mutationError, targetSessionId) => onMutationError(mutationError, targetSessionId, 'publish'),
  });

  // 최종 완료는 예약을 COMPLETED로 만들고 활성 배정을 종료할 수 있으므로 회기 목록도
  // 다시 읽어야 한다. 성공 응답을 받은 뒤에만 반영한다(낙관적 업데이트 금지).
  const completeMutation = useMutation({
    mutationFn: (targetSessionId) => completeCounselingWithPublicResult(targetSessionId),
    onSuccess: async (data, targetSessionId) => {
      invalidateList();
      // 페이지별로 나뉜 학생 결과 목록 캐시를 접두사만으로 한 번에 무효화한다.
      queryClient.invalidateQueries({ queryKey: ['studentCounselingResults'] });
      queryClient.invalidateQueries({ queryKey: studentCounselingResultDetailQueryKey(targetSessionId) });
      if (!isResultScreenFor(targetSessionId)) return;
      const queryKey = counselorPublicResultQueryKey(targetSessionId);
      await cancelQueryBeforeUpdate(queryClient, queryKey);
      if (!isResultScreenFor(targetSessionId)) return;
      updateQueryIfPresent(queryClient, queryKey, data);
      setConfirmCompleteOpen(false);
      toast('상담이 완료 처리되었습니다.', 'success');
    },
    onError: (mutationError, targetSessionId) => onMutationError(mutationError, targetSessionId, 'complete'),
  });

  // 정정 모달을 연다. 트리거 버튼만 기억해두고 입력·기준 버전 시딩은 PublicResultCorrectionModal이
  // 자신의 공개 결과 Query로 직접 한다(이 화면이 publicResult를 대신 복제해 넘기지 않는다).
  const openCorrectionModal = (triggerElement) => {
    correctionTriggerRef.current = triggerElement ?? null;
    setCorrectionOpen(true);
  };

  // 정정 모달을 닫는 조정 함수 — 실제 요청 중 닫기 차단·입력 초기화는 자식이 스스로 판단한 뒤
  // 이 함수를 호출한다. 여기서는 open state를 내리고 트리거 포커스만 복원한다.
  const closeCorrectionModal = useCallback(() => {
    setCorrectionOpen(false);
    restoreCorrectionTriggerFocus();
  }, [restoreCorrectionTriggerFocus]);

  // 정정 중 A004·S007(접근 불가)이 발생했을 때 PublicResultCorrectionModal이 호출하는 단일 신호다.
  // 기존 결과 화면의 처리(목록 무효화·회기 캐시 제거·화면 닫기)를 그대로 재현한다.
  const closeUnavailableResult = () => {
    invalidateList();
    if (sessionId !== null) {
      queryClient.removeQueries({ queryKey: counselorPublicResultQueryKey(sessionId) });
    }
    setCorrectionOpen(false);
    onClose();
    restoreResultTriggerFocus();
  };

  // 정정 요청이 진행 중일 때도 바깥 '공개 결과' 모달을 닫지 못하게 한다 — 닫으면 sessionId가
  // null이 되어 이 회기의 캐시가 제거되는데, 그 사이 응답이 도착하면 이미 사라진 화면을 잘못
  // 되살리거나 무시되는 애매한 상태가 생길 수 있기 때문이다.
  const isMutating =
    saveMutation.isPending ||
    publishMutation.isPending ||
    completeMutation.isPending ||
    isCorrectionPending;
  const isDraftDirty =
    isEditableStatus &&
    (summaryInput !== (publicResult.resultSummary ?? '') ||
      planInput !== (publicResult.actionPlan ?? ''));

  const requestClose = useCallback(() => {
    if (isMutating) return;
    if (
      isDraftDirty &&
      !window.confirm('저장하지 않은 변경사항이 있습니다. 닫으면 입력 내용이 사라집니다. 그래도 닫으시겠습니까?')
    ) {
      return;
    }
    closeModal();
  }, [isMutating, isDraftDirty, closeModal]);

  useEffect(() => {
    if (sessionId !== null) {
      modalContentRef.current?.focus();
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId === null) return undefined;

    const modalElement = modalContentRef.current?.closest('.fixed');
    const onKeyDown = (event) =>
      handleResultModalKeyDown(event, modalElement, isMutating, requestClose);

    modalElement?.addEventListener('keydown', onKeyDown);
    return () => modalElement?.removeEventListener('keydown', onKeyDown);
  }, [sessionId, isMutating, requestClose]);

  const submitSave = () => {
    const trimmedSummary = summaryInput.trim();
    if (!trimmedSummary) {
      setFormError('공개 요약을 입력해 주세요.');
      return;
    }
    if (trimmedSummary.length > SUMMARY_MAX_LENGTH) {
      setFormError(`공개 요약은 ${SUMMARY_MAX_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`);
      return;
    }
    const trimmedPlan = planInput.trim();
    if (trimmedPlan.length > ACTION_PLAN_MAX_LENGTH) {
      setFormError(`실행 계획은 ${ACTION_PLAN_MAX_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`);
      return;
    }
    setFormError('');
    saveMutation.mutate({
      sessionId,
      resultSummary: trimmedSummary,
      actionPlan: trimmedPlan || null,
    });
  };

  return (
    <>
      {/* 공개 결과 모달 — 학생에게 보일 요약·실행계획이므로 열람 시에만 조회하고 닫을 때 캐시를 지운다 */}
      <Modal
        open={sessionId !== null}
        onClose={requestClose}
        title="공개 결과"
        footer={
          <Button variant="outline" onClick={requestClose} disabled={isMutating}>
            닫기
          </Button>
        }
      >
        <div
          ref={modalContentRef}
          tabIndex={-1}
          className="max-h-[calc(100dvh-10rem)] overflow-y-auto pr-1"
        >
          {resultLoading ? (
          <p className="text-center text-[12px] text-[#656D76] py-4">불러오는 중입니다.</p>
        ) : resultIsError ? (
          <p className="text-[12px] text-[#CF222E]" role="alert">
            {getPublicResultErrorMessage(resultError)}
          </p>
        ) : !publicResult ? null : (
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] flex flex-wrap items-center gap-2">
              <StatusBadge
                status={publicResult.resultStatus}
                variant={RESULT_STATUS_BADGE_VARIANT[publicResult.resultStatus]}
                label={COUNSELING_PUBLIC_RESULT_STATUS_LABEL[publicResult.resultStatus]}
                size="sm"
              />
              {publicResult.finalResult && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#1A7F37]">
                  예약 최종 완료 결과
                </span>
              )}
              {!publicResult.assignmentActive && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76] font-bold">
                  종료된 배정
                </span>
              )}
              <span className="text-[11px] text-[#656D76]">
                {publicResult.privateRecordConfirmed
                  ? '비공개 기록 확정됨'
                  : '비공개 기록 미확정 — 확정 전에는 공개할 수 없습니다.'}
              </span>
            </div>

            {publicResult.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.PUBLISHED ? (
              <>
                <div>
                  <p className="text-[11px] font-bold text-[#1F2328] mb-1.5">공개 요약</p>
                  <div className="px-4 py-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed whitespace-pre-wrap">
                    {publicResult.resultSummary}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#1F2328] mb-1.5">실행계획</p>
                  <div className="px-4 py-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed whitespace-pre-wrap">
                    {publicResult.actionPlan ?? '등록된 실행계획이 없습니다.'}
                  </div>
                </div>
                <p className="text-[11px] text-[#656D76]">
                  v{publicResult.versionNo} · {publicResult.createdByName} · 공개{' '}
                  {formatKstDateTime(publicResult.publishedAt)}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {/* 서버 canCorrect가 원래 담당 상담사인지, 최신 PUBLISHED인지를 모두 판단한 최종 기준이다.
                      클라이언트에서 배정·역할을 다시 추정해 이 버튼을 대신 노출하지 않는다. */}
                  {publicResult.canCorrect && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isCorrectionPending}
                      onClick={(event) => {
                        if (isCorrectionPending) return;
                        openCorrectionModal(event.currentTarget);
                      }}
                    >
                      결과 정정
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isCorrectionPending}
                    onClick={(event) => {
                      if (isCorrectionPending) return;
                      historyTriggerRef.current = event.currentTarget;
                      setHistoryOpen(true);
                    }}
                  >
                    이력 보기
                  </Button>
                </div>
                {/* 이미 공개된 결과도 마지막 출석 완료 회기라면 완료 처리를 할 수 있다(내용은 그대로 유지). */}
                {publicResult.canCompleteReservation && (
                  <Button
                    size="sm"
                    disabled={completeMutation.isPending || isCorrectionPending}
                    loading={completeMutation.isPending}
                    onClick={() => {
                      if (isCorrectionPending) return;
                      setConfirmCompleteOpen(true);
                    }}
                  >
                    상담 완료
                  </Button>
                )}
              </>
            ) : isEditableStatus && publicResult.canSaveDraft ? (
              <>
                <div>
                  <label
                    htmlFor="summaryInput"
                    className="block text-[11px] font-semibold text-[#656D76] mb-1.5"
                  >
                    공개 요약 <span className="text-[#CF222E]">*</span>
                  </label>
                  <textarea
                    id="summaryInput"
                    value={summaryInput}
                    onChange={(e) => setSummaryInput(e.target.value)}
                    required
                    aria-required="true"
                    aria-invalid={Boolean(formError)}
                    aria-describedby={formError ? 'summaryInput-help result-form-error' : 'summaryInput-help'}
                    rows={5}
                    maxLength={SUMMARY_MAX_LENGTH}
                    placeholder="학생에게 공개할 상담 요약을 입력하세요."
                    disabled={saveMutation.isPending}
                    className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
                  />
                  <p id="summaryInput-help" className="text-[11px] text-[#656D76] text-right">
                    {summaryInput.length}/{SUMMARY_MAX_LENGTH}자
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="planInput"
                    className="block text-[11px] font-semibold text-[#656D76] mb-1.5"
                  >
                    실행계획 (선택)
                  </label>
                  <textarea
                    id="planInput"
                    value={planInput}
                    onChange={(e) => setPlanInput(e.target.value)}
                    aria-required="false"
                    aria-invalid={Boolean(formError)}
                    aria-describedby={formError ? 'planInput-help result-form-error' : 'planInput-help'}
                    rows={4}
                    maxLength={ACTION_PLAN_MAX_LENGTH}
                    placeholder="학생이 수행할 실행 계획을 입력하세요."
                    disabled={saveMutation.isPending}
                    className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
                  />
                  <p id="planInput-help" className="text-[11px] text-[#656D76] text-right">
                    {planInput.length}/{ACTION_PLAN_MAX_LENGTH}자
                  </p>
                </div>
                {formError && (
                  <p
                    id="result-form-error"
                    className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
                    role="alert"
                  >
                    ⚠ {formError}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={saveMutation.isPending}
                    onClick={submitSave}
                  >
                    임시저장
                  </Button>
                  {publicResult.canPublish && (
                    <Button
                    size="sm"
                    disabled={isDraftDirty || saveMutation.isPending || publishMutation.isPending}
                    loading={publishMutation.isPending}
                    onClick={() => setConfirmPublishOpen(true)}
                  >
                    결과 공개
                    </Button>
                  )}
                  {publicResult.canCompleteReservation && (
                    <Button
                    variant="outline"
                    size="sm"
                    disabled={isDraftDirty || saveMutation.isPending || completeMutation.isPending}
                    loading={completeMutation.isPending}
                    onClick={() => setConfirmCompleteOpen(true)}
                  >
                    상담 완료
                    </Button>
                  )}
                </div>
                {isDraftDirty && (
                  <p className="text-[11px] text-[#92400E]">
                    저장하지 않은 변경이 있습니다. 먼저 임시저장한 후 결과 공개 또는 상담 완료를 진행해 주세요.
                  </p>
                )}
                <p className="text-[11px] text-[#656D76]">
                  버튼은 서버가 판단한 처리 가능 여부에 따라 활성화됩니다.
                </p>
              </>
            ) : isEditableStatus && publicResult.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.DRAFT ? (
              // canSaveDraft가 false인 초안 — 종료된 이전 담당 상담사는 읽기만 할 수 있다.
              <>
                <div>
                  <p className="text-[11px] font-bold text-[#1F2328] mb-1.5">공개 요약 (초안 · 읽기전용)</p>
                  <div className="px-4 py-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed whitespace-pre-wrap">
                    {publicResult.resultSummary}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#1F2328] mb-1.5">실행계획 (초안 · 읽기전용)</p>
                  <div className="px-4 py-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed whitespace-pre-wrap">
                    {publicResult.actionPlan ?? '등록된 실행계획이 없습니다.'}
                  </div>
                </div>
                <p className="text-[11px] text-[#656D76]">
                  현재 활성 배정 담당 상담사가 아니므로 수정·공개할 수 없습니다.
                </p>
              </>
            ) : (
              <p className="p-4 text-center text-[12px] text-[#656D76] bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                이 회기는 지금 공개 결과를 작성·수정할 수 없습니다. 시작 시각이 지난 예정 회기이거나
                출석 완료된 회기에서만 작성할 수 있습니다.
              </p>
            )}
          </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmPublishOpen}
        title="결과 공개"
        message="학생이 이 회기 결과를 볼 수 있게 됩니다. 예약은 계속 진행 중이며 완료 처리되지 않습니다."
        confirmLabel="공개"
        loading={publishMutation.isPending}
        onConfirm={() => publishMutation.mutate(sessionId)}
        onCancel={() => !publishMutation.isPending && setConfirmPublishOpen(false)}
      />

      <ConfirmDialog
        open={confirmCompleteOpen}
        title="상담 완료"
        message="필요 시 초안이 공개되고, 예약이 완료(COMPLETED)되며 현재 활성 배정이 종료됩니다. 이후에는 새 회기를 생성할 수 없습니다."
        confirmLabel="완료 처리"
        loading={completeMutation.isPending}
        onConfirm={() => completeMutation.mutate(sessionId)}
        onCancel={() => !completeMutation.isPending && setConfirmCompleteOpen(false)}
      />

      <PublicResultCorrectionModal
        sessionId={sessionId}
        open={correctionOpen}
        onClose={closeCorrectionModal}
        onPendingChange={setIsCorrectionPending}
        onResultUnavailable={closeUnavailableResult}
      />

      <PublicResultHistoryModal sessionId={sessionId} open={historyOpen} onClose={closeHistory} />
    </>
  );
}
