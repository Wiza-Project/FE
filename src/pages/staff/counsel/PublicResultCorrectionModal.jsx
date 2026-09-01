import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  correctCounselorPublicResult,
  counselorPublicResultHistoryQueryKey,
  counselorPublicResultQueryKey,
  getCounselorPublicResult,
  studentCounselingResultDetailQueryKey,
} from '@/api/counsel';
import { COUNSELING_PUBLIC_RESULT_ERROR_CODE, COUNSELING_PUBLIC_RESULT_STATUS } from '@/constants/domain';
import {
  cancelQueryBeforeUpdate,
  getPublicResultErrorMessage,
  updateQueryIfPresent,
} from './publicResultSupport';

const SUMMARY_MAX_LENGTH = 3000;
const ACTION_PLAN_MAX_LENGTH = 3000;
const CORRECTION_REASON_MAX_LENGTH = 500;
// 서버 정규화와 같은 규칙(trim 후 빈 값이면 null)으로 클라이언트 무변경 사전 검사를 한다.
// 서버가 실제 저장 시점에 같은 규칙으로 다시 검사하므로 이 값은 사용자 경험용 사전 안내일 뿐이다.
const normalizeActionPlanForCompare = (value) => value?.trim?.() || null;

function handleCorrectionModalKeyDown(event, modalElement, isPending, requestClose) {
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
 * 이미 공개된 최신 버전(PUBLISHED)을 정정한다. 정정은 기존 행을 수정하지 않고 새 버전을 즉시
 * 공개하며 낙관적 업데이트를 하지 않는다 — 서버가 만든 새 버전을 성공 응답으로 받은 뒤에만 화면에
 * 반영한다. S010(버전 충돌)에서는 작성 중인 입력과 기준 버전을 자동으로 덮어쓰지 않고, 사용자가
 * '최신 버전 기준으로 계속'을 명시적으로 눌렀을 때만 기준을 갱신한다. S012(무변경)에서는 입력을
 * 그대로 유지한다. A004·S007(접근 불가)에서는 onResultUnavailable을 호출해 Editor가 바깥 결과
 * 화면까지 재기준하게 한다.
 */
export default function PublicResultCorrectionModal({
  sessionId,
  open,
  onClose,
  onPendingChange,
  onResultUnavailable,
}) {
  const queryClient = useQueryClient();

  // 정정 입력 — 모두 컴포넌트 메모리에만 둔다. 정정 사유·요약·실행계획을 저장소·URL에 담지 않는다.
  const [correctionSummary, setCorrectionSummary] = useState('');
  const [correctionPlan, setCorrectionPlan] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionError, setCorrectionError] = useState('');
  const [correctionFieldError, setCorrectionFieldError] = useState('');
  // 모달을 연 시점(또는 충돌 후 사용자가 최신 버전으로 갱신한 시점)의 기준 버전·요약·실행계획.
  // 결과 쿼리가 그 사이 다시 조회돼도 이 값은 자동으로 덮어쓰지 않는다 — 사용자가 명시적으로
  // '최신 버전 기준으로 계속'을 눌렀을 때만 바꾼다.
  const [correctionBase, setCorrectionBase] = useState(null);
  // S010(버전 충돌) 발생 시 다시 읽어온 최신 서버 결과. 비교 화면 용도로만 쓰고 자동 반영하지 않는다.
  const [conflictLatest, setConflictLatest] = useState(null);

  const correctionContentRef = useRef(null);

  // mutation 콜백은 이 컴포넌트가 언마운트되거나 다른 회기로 전환된 뒤에도 실행될 수 있다. 늦게
  // 도착한 응답이 다른 회기 화면을 건드리지 않도록 최신 상태를 ref로 판별한다.
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const isCorrectionScreenFor = (requestSessionId) =>
    isMountedRef.current && requestSessionId === sessionIdRef.current;

  // Editor와 같은 공개 결과 Query key를 관찰한다(같은 캐시를 공유하므로 별도 API 왕복이 늘지 않는다).
  const { data: publicResult } = useQuery({
    queryKey: counselorPublicResultQueryKey(sessionId),
    queryFn: () => getCounselorPublicResult(sessionId),
    enabled: open && sessionId !== null,
    gcTime: 0,
    retry: false,
  });

  // 모달이 열릴 때(또는 열린 채로 회기가 바뀔 때) 이 시점의 최신 버전·요약·실행계획을 기준값으로
  // 한 번만 고정한다. 이후 같은 열림 상태에서 쿼리가 다시 조회돼도 이 기준은 사용자가 명시적으로
  // '최신 버전 기준으로 계속'을 누르기 전까지 자동으로 덮어쓰지 않는다.
  const seededRef = useRef(false);
  const seedSessionIdRef = useRef(null);
  useEffect(() => {
    if (!open || sessionId === null) {
      // 모달이 닫히거나 대상 회기가 사라지면 입력·오류·충돌 비교값을 모두 지운다.
      if (seededRef.current || seedSessionIdRef.current !== null) {
        setCorrectionSummary('');
        setCorrectionPlan('');
        setCorrectionReason('');
        setCorrectionError('');
        setCorrectionFieldError('');
        setCorrectionBase(null);
        setConflictLatest(null);
      }
      seededRef.current = false;
      seedSessionIdRef.current = null;
      return;
    }
    if (seedSessionIdRef.current !== sessionId) {
      seededRef.current = false;
      seedSessionIdRef.current = sessionId;
    }
    if (seededRef.current) return;
    if (!publicResult || publicResult.sessionId !== sessionId) return;
    setCorrectionReason('');
    setCorrectionError('');
    setCorrectionFieldError('');
    setConflictLatest(null);
    if (publicResult.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.PUBLISHED) {
      setCorrectionBase({
        versionNo: publicResult.versionNo,
        resultSummary: publicResult.resultSummary,
        actionPlan: publicResult.actionPlan,
      });
      setCorrectionSummary(publicResult.resultSummary ?? '');
      setCorrectionPlan(publicResult.actionPlan ?? '');
    } else {
      setCorrectionBase(null);
    }
    seededRef.current = true;
  }, [open, sessionId, publicResult]);

  // 정정은 낙관적 업데이트를 하지 않는다 — 서버가 만든 새 버전(v+1)을 성공 응답으로 받은
  // 뒤에만 화면에 반영한다. 실패 코드별 처리는 아래 onError에서 분기한다.
  const resetCorrectionModal = useCallback(() => {
    setCorrectionSummary('');
    setCorrectionPlan('');
    setCorrectionReason('');
    setCorrectionError('');
    setCorrectionFieldError('');
    setCorrectionBase(null);
    setConflictLatest(null);
    onClose();
  }, [onClose]);

  const correctMutation = useMutation({
    mutationFn: ({ sessionId: targetSessionId, expectedVersionNo, resultSummary, actionPlan, correctionReason: reason }) =>
      correctCounselorPublicResult(targetSessionId, {
        expectedVersionNo,
        resultSummary,
        actionPlan,
        correctionReason: reason,
      }),
    onSuccess: async (data, { sessionId: targetSessionId }) => {
      // 이력·학생 쪽 캐시도 함께 무효화해 다음 조회에서 정정된 최신 버전을 읽게 한다.
      queryClient.invalidateQueries({ queryKey: counselorPublicResultHistoryQueryKey(targetSessionId) });
      queryClient.invalidateQueries({ queryKey: ['studentCounselingResults'] });
      queryClient.invalidateQueries({ queryKey: studentCounselingResultDetailQueryKey(targetSessionId) });
      if (!isCorrectionScreenFor(targetSessionId)) return;
      const queryKey = counselorPublicResultQueryKey(targetSessionId);
      await cancelQueryBeforeUpdate(queryClient, queryKey);
      if (!isCorrectionScreenFor(targetSessionId)) return;
      updateQueryIfPresent(queryClient, queryKey, data);
      resetCorrectionModal();
      toast('결과를 정정했습니다.', 'success');
    },
    onError: async (mutationError, { sessionId: targetSessionId }) => {
      if (!isCorrectionScreenFor(targetSessionId)) return;
      if (
        mutationError instanceof ApiError &&
        mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.NO_CHANGES
      ) {
        // 서버가 최종 판단한 무변경 거절. 사용자 입력은 그대로 두고 인라인 오류만 보여준다.
        setCorrectionError('수정한 내역이 없습니다.');
        return;
      }
      if (
        mutationError instanceof ApiError &&
        mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.STATE_CONFLICT
      ) {
        // 다른 요청이 먼저 정정해 기준 버전이 낡았다. 작성 중인 내용은 지우지 않고 최신 서버
        // 결과를 다시 읽어와 비교 화면에 보여준다. 자동 재제출은 하지 않는다.
        try {
          const latest = await getCounselorPublicResult(targetSessionId);
          if (!isCorrectionScreenFor(targetSessionId)) return;
          const queryKey = counselorPublicResultQueryKey(targetSessionId);
          await cancelQueryBeforeUpdate(queryClient, queryKey);
          if (!isCorrectionScreenFor(targetSessionId)) return;
          updateQueryIfPresent(queryClient, queryKey, latest);
          setConflictLatest(latest);
          setCorrectionError('다른 요청이 먼저 이 결과를 정정했습니다. 최신 내용을 확인한 뒤 계속하세요.');
        } catch (latestError) {
          if (!isCorrectionScreenFor(targetSessionId)) return;
          if (
            latestError instanceof ApiError &&
            (latestError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN ||
              latestError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.SESSION_NOT_FOUND)
          ) {
            toast(getPublicResultErrorMessage(latestError), 'error');
            onResultUnavailable();
            return;
          }
          setCorrectionError('최신 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
        return;
      }
      if (
        mutationError instanceof ApiError &&
        (mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN ||
          mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.SESSION_NOT_FOUND)
      ) {
        // 존재 여부를 숨기는 접근 오류다. 바깥 결과 화면 재기준·닫기는 onResultUnavailable에 위임한다.
        toast(getPublicResultErrorMessage(mutationError), 'error');
        onResultUnavailable();
        return;
      }
      setCorrectionError(getPublicResultErrorMessage(mutationError));
    },
  });

  // 정정 요청 진행 여부를 바깥 Editor에 알린다 — Editor는 이 값만으로 자신의 닫기를 차단한다.
  useEffect(() => {
    onPendingChange(correctMutation.isPending);
    return () => onPendingChange(false);
  }, [correctMutation.isPending, onPendingChange]);

  // 정정 모달을 닫는다. 요청 중에는 닫지 않아 중복 제출·조용한 데이터 유실을 막는다.
  // 백드롭 클릭·X 버튼·Escape 키가 모두 이 함수 하나로 들어온다.
  const closeCorrectionModal = useCallback(() => {
    if (correctMutation.isPending) return;
    resetCorrectionModal();
  }, [correctMutation.isPending, resetCorrectionModal]);

  const submitCorrection = () => {
    if (!correctionBase || sessionId === null) return;
    setCorrectionFieldError('');
    const trimmedSummary = correctionSummary.trim();
    if (!trimmedSummary) {
      setCorrectionFieldError('summary');
      setCorrectionError('공개 요약을 입력해 주세요.');
      return;
    }
    if (trimmedSummary.length > SUMMARY_MAX_LENGTH) {
      setCorrectionFieldError('summary');
      setCorrectionError(`공개 요약은 ${SUMMARY_MAX_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`);
      return;
    }
    const normalizedPlan = normalizeActionPlanForCompare(correctionPlan);
    if (normalizedPlan && normalizedPlan.length > ACTION_PLAN_MAX_LENGTH) {
      setCorrectionFieldError('plan');
      setCorrectionError(`실행 계획은 ${ACTION_PLAN_MAX_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`);
      return;
    }
    const trimmedReason = correctionReason.trim();
    if (!trimmedReason) {
      setCorrectionFieldError('reason');
      setCorrectionError('정정 사유를 입력해 주세요.');
      return;
    }
    if (trimmedReason.length > CORRECTION_REASON_MAX_LENGTH) {
      setCorrectionFieldError('reason');
      setCorrectionError(`정정 사유는 ${CORRECTION_REASON_MAX_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`);
      return;
    }
    // 클라이언트 무변경 사전 검사 — 사용자 경험용일 뿐 최종 판단은 서버 S012다. 기준값과
    // 완전히 같은 두 필드를 그대로 다시 보내는 헛된 요청을 미리 막는다.
    const baseSummary = (correctionBase.resultSummary ?? '').trim();
    const basePlan = normalizeActionPlanForCompare(correctionBase.actionPlan);
    if (trimmedSummary === baseSummary && normalizedPlan === basePlan) {
      setCorrectionError('수정한 내역이 없습니다.');
      return;
    }
    setCorrectionFieldError('');
    setCorrectionError('');
    correctMutation.mutate({
      sessionId,
      expectedVersionNo: correctionBase.versionNo,
      resultSummary: trimmedSummary,
      actionPlan: normalizedPlan,
      correctionReason: trimmedReason,
    });
  };

  // 충돌 비교 화면에서 사용자가 최신 버전을 확인한 뒤 계속 진행하기로 선택했을 때만 기준을
  // 갱신한다. 작성 중인 세 입력값은 그대로 유지하고, 자동으로 재제출하지 않는다.
  const acceptLatestVersionAfterConflict = () => {
    if (!conflictLatest) return;
    setCorrectionBase({
      versionNo: conflictLatest.versionNo,
      resultSummary: conflictLatest.resultSummary,
      actionPlan: conflictLatest.actionPlan,
    });
    // 기준을 갱신한 뒤 작성 중인 내용이 최신 서버 내용과 같아졌으면 무변경 사전 검사를 다시 적용한다.
    const baseSummary = (conflictLatest.resultSummary ?? '').trim();
    const basePlan = normalizeActionPlanForCompare(conflictLatest.actionPlan);
    const normalizedSummary = correctionSummary.trim();
    const normalizedPlan = normalizeActionPlanForCompare(correctionPlan);
    setConflictLatest(null);
    if (normalizedSummary === baseSummary && normalizedPlan === basePlan) {
      setCorrectionError('수정한 내역이 없습니다.');
    } else {
      setCorrectionError('');
    }
  };

  // 정정 모달도 공개 결과 모달과 같은 이유로 열릴 때 포커스를 모달 안으로 옮긴다. 이걸 빼먹으면
  // 모달이 화면에는 보이는데 포커스는 여전히 배경의 "결과 정정" 버튼에 남아, 스크린리더가
  // 새 모달이 열렸다는 걸 알려주지 않고 Tab을 눌러도 배경 페이지가 먼저 반응한다.
  useEffect(() => {
    if (open) {
      correctionContentRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    // 정정 요청이 진행 중일 때는 Escape로도 닫지 못하게 한다. 백드롭 클릭·X 버튼과 같은 규칙을
    // 재사용해야 "닫기 경로에 따라 동작이 다른" 혼란스러운 예외가 생기지 않는다.
    const modalElement = correctionContentRef.current?.closest('.fixed');
    const onKeyDown = (event) =>
      handleCorrectionModalKeyDown(event, modalElement, correctMutation.isPending, closeCorrectionModal);

    modalElement?.addEventListener('keydown', onKeyDown);
    return () => modalElement?.removeEventListener('keydown', onKeyDown);
  }, [open, correctMutation.isPending, closeCorrectionModal]);

  return (
    // 결과 정정 모달 — 공개 결과 모달 위에 겹쳐 뜬다(ConfirmDialog와 같은 방식). 서버가 만든
    // 새 버전을 성공 응답으로 받기 전까지는 화면에 아무것도 낙관적으로 반영하지 않는다.
    <Modal
      open={open}
      onClose={closeCorrectionModal}
      title="결과 정정"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={closeCorrectionModal} disabled={correctMutation.isPending}>
            닫기
          </Button>
          <Button
            loading={correctMutation.isPending}
            disabled={correctMutation.isPending || Boolean(conflictLatest)}
            onClick={submitCorrection}
          >
            정정 저장
          </Button>
        </>
      }
    >
      {/* tabIndex=-1 + ref: 모달이 열리자마자 여기로 포커스를 옮겨야 Tab 트랩 시작점이
          생기고, 스크린리더가 "결과 정정" 창이 새로 열렸음을 알 수 있다. */}
      <div ref={correctionContentRef} tabIndex={-1} className="flex flex-col gap-4">
        <p className="text-[11px] text-[#656D76]">
          정정하면 기존 버전(v{correctionBase?.versionNo ?? '-'})은 그대로 남고 새 버전이 즉시
          학생에게 공개됩니다. 되돌릴 수 없으니 내용을 다시 확인해 주세요.
        </p>

        {conflictLatest && (
          <div className="rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] p-3 flex flex-col gap-2" role="alert">
            <p className="text-[11px] font-bold text-[#92400E]">
              다른 요청이 먼저 v{conflictLatest.versionNo}를 공개했습니다. 아래 최신 내용을 확인한 뒤
              &lsquo;최신 버전 기준으로 계속&rsquo;을 누르면 작성 중인 입력을 다시 조정할 수 있습니다.
            </p>
            <div>
              <p className="text-[11px] font-semibold text-[#1F2328] mb-1">최신 공개 요약</p>
              <div className="px-3 py-2 rounded-[6px] bg-white border border-[#E5E7EB] text-[12px] text-[#444D56] whitespace-pre-wrap">
                {conflictLatest.resultSummary}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#1F2328] mb-1">최신 실행계획</p>
              <div className="px-3 py-2 rounded-[6px] bg-white border border-[#E5E7EB] text-[12px] text-[#444D56] whitespace-pre-wrap">
                {conflictLatest.actionPlan ?? '등록된 실행계획이 없습니다.'}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={acceptLatestVersionAfterConflict}>
              최신 버전 기준으로 계속
            </Button>
          </div>
        )}

        <div>
          <label htmlFor="correctionSummary" className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
            공개 요약 <span className="text-[#CF222E]">*</span>
          </label>
          <textarea
            id="correctionSummary"
            value={correctionSummary}
            onChange={(e) => {
              setCorrectionSummary(e.target.value);
              if (correctionFieldError === 'summary') {
                setCorrectionFieldError('');
                setCorrectionError('');
              }
            }}
            required
            aria-required="true"
            aria-invalid={correctionFieldError === 'summary'}
            aria-describedby={correctionFieldError === 'summary' ? 'correction-error' : undefined}
            rows={5}
            maxLength={SUMMARY_MAX_LENGTH}
            disabled={correctMutation.isPending || Boolean(conflictLatest)}
            className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
          />
          <p className="text-[11px] text-[#656D76] text-right">
            {correctionSummary.length}/{SUMMARY_MAX_LENGTH}자
          </p>
        </div>

        <div>
          <label htmlFor="correctionPlan" className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
            실행계획 (선택)
          </label>
          <textarea
            id="correctionPlan"
            value={correctionPlan}
            onChange={(e) => {
              setCorrectionPlan(e.target.value);
              if (correctionFieldError === 'plan') {
                setCorrectionFieldError('');
                setCorrectionError('');
              }
            }}
            aria-required="false"
            aria-invalid={correctionFieldError === 'plan'}
            aria-describedby={correctionFieldError === 'plan' ? 'correction-error' : undefined}
            rows={4}
            maxLength={ACTION_PLAN_MAX_LENGTH}
            disabled={correctMutation.isPending || Boolean(conflictLatest)}
            className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
          />
          <p className="text-[11px] text-[#656D76] text-right">
            {correctionPlan.length}/{ACTION_PLAN_MAX_LENGTH}자
          </p>
        </div>

        <div>
          <label htmlFor="correctionReason" className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
            정정 사유 <span className="text-[#CF222E]">*</span>
          </label>
          <textarea
            id="correctionReason"
            value={correctionReason}
            onChange={(e) => {
              setCorrectionReason(e.target.value);
              if (correctionFieldError === 'reason') {
                setCorrectionFieldError('');
                setCorrectionError('');
              }
            }}
            required
            aria-required="true"
            aria-invalid={correctionFieldError === 'reason'}
            aria-describedby={correctionFieldError === 'reason' ? 'correction-error' : undefined}
            rows={3}
            maxLength={CORRECTION_REASON_MAX_LENGTH}
            placeholder="학생에게 공개된 내용 중 무엇을 왜 바로잡는지 입력하세요."
            disabled={correctMutation.isPending || Boolean(conflictLatest)}
            className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
          />
          <p className="text-[11px] text-[#656D76] text-right">
            {correctionReason.length}/{CORRECTION_REASON_MAX_LENGTH}자
          </p>
        </div>

        {correctionError && (
          <p
            id="correction-error"
            className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
            role="alert"
          >
            ⚠ {correctionError}
          </p>
        )}
      </div>
    </Modal>
  );
}
