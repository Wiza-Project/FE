import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, ConfirmDialog, Modal, SkeletonLoader, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  acceptCounselingProposal,
  fetchAvailableSchedules,
  fetchCounselingTypes,
} from '@/api/counsel';
import { agreeToConsentPolicy, fetchConsentPolicies, fetchMyConsents } from '@/api/consent';
import {
  CONSENT_MODULE_CODE,
  CONSENT_TYPE,
  COUNSELING_PROPOSAL_ERROR_CODE,
  COUNSELING_RESERVATION_ERROR_CODE,
  COUNSELING_TYPE_CODE,
} from '@/constants/domain';
import { formatKstDateTime } from './myCounselingDate';

const ACCENT = '#0E7490';
const CONSENT_POLICIES_QUERY_KEY = ['consentPolicies', CONSENT_MODULE_CODE.COUNSELING];
const MY_CONSENTS_QUERY_KEY = ['myConsents'];

function handleModalKeyDown(event, modalElement, isPending, closeModal) {
  if (event.key === 'Escape') {
    if (!isPending) {
      event.preventDefault();
      closeModal();
    }
    return;
  }
  if (event.key !== 'Tab') return;
  const elements = Array.from(
    modalElement.querySelectorAll(
      'button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (!first || !last) {
    event.preventDefault();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function isValidActiveConsent(consent, consentPolicyId) {
  return (
    Number.isInteger(consentPolicyId) &&
    consentPolicyId > 0 &&
    consent?.consentPolicyId === consentPolicyId &&
    consent.withdrawnAt === null &&
    Number.isInteger(consent.userConsentId) &&
    consent.userConsentId > 0
  );
}

function findRequiredPersonalInfoPolicy(policies) {
  const required = policies.filter(
    (policy) => policy.consentType === CONSENT_TYPE.PERSONAL_INFO && policy.required === true,
  );
  return required.length === 1 ? required[0] : null;
}

function getAcceptErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 자동으로 재시도하지 않으니, 제안·예약 현황을 먼저 새로고침해 실제 처리 여부를 확인해 주세요.';
  }
  if (error.code === COUNSELING_PROPOSAL_ERROR_CODE.SCHEDULE_NOT_AVAILABLE) {
    return '선택한 일정을 더 이상 사용할 수 없습니다. 다른 일정을 선택해 주세요.';
  }
  if (error.code === COUNSELING_PROPOSAL_ERROR_CODE.FORBIDDEN) {
    return '동의 또는 접근 권한을 확인할 수 없어 수락할 수 없습니다. 다시 확인해 주세요.';
  }
  if (
    error.code === COUNSELING_PROPOSAL_ERROR_CODE.PROPOSAL_NOT_FOUND ||
    error.code === COUNSELING_PROPOSAL_ERROR_CODE.PROPOSAL_NOT_RESPONDABLE
  ) {
    return '제안 상태가 이미 변경되었습니다. 목록을 새로고침했습니다.';
  }
  return '수락 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

function canManuallyRetryQuery(error) {
  return error instanceof ApiError && error.code === 'NETWORK_ERROR';
}

/**
 * @param {Object} props
 * @param {Object} props.proposal 현재 학생 본인의 수락 대상 제안 객체.
 * @param {() => void} props.onClose 취소 또는 stale 제안 정리 후 부모 대상을 닫는 함수.
 * @param {() => void} props.onAccepted 성공 및 관련 캐시 무효화 후 예약 탭으로 이동하는 함수.
 */
export default function CounselingProposalAcceptDialog({ proposal, onClose, onAccepted }) {
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);
  const acceptAttemptRef = useRef(0);
  const acceptInFlightRef = useRef(false);
  const acceptConfirmRef = useRef(null);
  const modalContentRef = useRef(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [checkedConsent, setCheckedConsent] = useState({
    checked: false,
    consentPolicyId: null,
    version: null,
  });
  const [acceptError, setAcceptError] = useState('');
  const [acceptConfirmOpen, setAcceptConfirmOpen] = useState(false);
  const [isAcceptPreflighting, setIsAcceptPreflighting] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 동의 이력·정책은 수락에만 필요한 민감정보라 다이얼로그 종료와 함께 캐시를 제거한다.
      queryClient.removeQueries({ queryKey: MY_CONSENTS_QUERY_KEY });
      queryClient.removeQueries({ queryKey: CONSENT_POLICIES_QUERY_KEY });
    };
  }, [queryClient]);

  const policiesQuery = useQuery({
    queryKey: CONSENT_POLICIES_QUERY_KEY,
    queryFn: () => fetchConsentPolicies(CONSENT_MODULE_CODE.COUNSELING),
    retry: false,
  });
  const myConsentsQuery = useQuery({
    queryKey: MY_CONSENTS_QUERY_KEY,
    queryFn: fetchMyConsents,
    retry: false,
    gcTime: 0,
  });
  const counselingTypesQuery = useQuery({
    queryKey: ['counselingTypes'],
    queryFn: fetchCounselingTypes,
    retry: false,
  });
  const psychologicalType = (counselingTypesQuery.data ?? []).find(
    (type) => type.typeCode === COUNSELING_TYPE_CODE.PSYCHOLOGICAL,
  );
  const schedulesQuery = useQuery({
    queryKey: ['availableSchedules', psychologicalType?.counselingTypeId],
    queryFn: () => fetchAvailableSchedules(psychologicalType.counselingTypeId),
    enabled: !!psychologicalType?.counselingTypeId,
    retry: false,
  });

  const isConsentLoading = policiesQuery.isLoading || myConsentsQuery.isLoading;
  const isConsentQueryError = policiesQuery.isError || myConsentsQuery.isError;
  const requiredPolicy = findRequiredPersonalInfoPolicy(policiesQuery.data ?? []);
  const activeConsent = requiredPolicy
    ? (myConsentsQuery.data ?? []).find((consent) =>
        isValidActiveConsent(consent, requiredPolicy.consentPolicyId),
      )
    : null;
  const isCheckedForCurrentPolicy =
    checkedConsent.checked &&
    checkedConsent.consentPolicyId === requiredPolicy?.consentPolicyId &&
    checkedConsent.version === requiredPolicy?.version;
  const schedules = schedulesQuery.data ?? [];
  const selectedSchedule = schedules.find((schedule) => schedule.scheduleId === selectedScheduleId);
  const isAcceptAttemptCurrent = (attemptToken) =>
    isMountedRef.current && acceptAttemptRef.current === attemptToken;

  const refreshConsentPolicies = async (attemptToken) => {
    if (!isAcceptAttemptCurrent(attemptToken)) return null;
    const result = await policiesQuery.refetch();
    return isAcceptAttemptCurrent(attemptToken) ? result : null;
  };
  const refreshMyConsents = async (attemptToken) => {
    if (!isAcceptAttemptCurrent(attemptToken)) return null;
    const result = await myConsentsQuery.refetch();
    return isAcceptAttemptCurrent(attemptToken) ? result : null;
  };
  const refreshConsentState = async (attemptToken) => {
    const policiesResult = await refreshConsentPolicies(attemptToken);
    const consentsResult = await refreshMyConsents(attemptToken);
    if (!isAcceptAttemptCurrent(attemptToken) || !policiesResult || !consentsResult) return null;
    if (policiesResult.isError || consentsResult.isError) return { ok: false, consent: null };
    const policy = findRequiredPersonalInfoPolicy(policiesResult.data ?? []);
    const consent = policy
      ? (consentsResult.data ?? []).find((item) =>
          isValidActiveConsent(item, policy.consentPolicyId),
        )
      : null;
    return { ok: true, consent: consent ?? null };
  };

  const agreeMutation = useMutation({
    mutationFn: ({ consentPolicyId }) => agreeToConsentPolicy(consentPolicyId),
    retry: false,
    gcTime: 0,
    onError: (error, variables) => {
      if (
        error instanceof ApiError &&
        error.code === COUNSELING_RESERVATION_ERROR_CODE.CONSENT_CONFLICT
      ) {
        refreshMyConsents(variables.attemptToken);
      }
    },
    onSettled: () => {
      agreeMutation.reset();
    },
  });
  const handleAgree = async () => {
    if (agreeMutation.isPending || !requiredPolicy || !isCheckedForCurrentPolicy) return;
    const attemptToken = acceptAttemptRef.current;
    setAcceptError('');
    try {
      await agreeMutation.mutateAsync({
        consentPolicyId: requiredPolicy.consentPolicyId,
        attemptToken,
      });
      const refreshed = await refreshConsentState(attemptToken);
      if (!isAcceptAttemptCurrent(attemptToken) || !refreshed) return;
      if (!refreshed.ok || !refreshed.consent) {
        setAcceptError(
          '동의 처리 후 유효한 동의를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
        return;
      }
      setCheckedConsent({ checked: false, consentPolicyId: null, version: null });
    } catch {
      if (isAcceptAttemptCurrent(attemptToken)) {
        setAcceptError('동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }
  };

  const resetAcceptState = () => {
    acceptAttemptRef.current += 1;
    setIsAcceptPreflighting(false);
    setSelectedScheduleId(null);
    setAcceptError('');
    setAcceptConfirmOpen(false);
    setCheckedConsent({ checked: false, consentPolicyId: null, version: null });
    queryClient.removeQueries({ queryKey: MY_CONSENTS_QUERY_KEY });
    queryClient.removeQueries({ queryKey: CONSENT_POLICIES_QUERY_KEY });
  };
  const acceptMutation = useMutation({
    mutationFn: ({ proposalId, request }) => acceptCounselingProposal(proposalId, request),
    retry: false,
    gcTime: 0,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['myCounselingProposals'] }),
        queryClient.invalidateQueries({ queryKey: ['counselingReservations'] }),
        queryClient.invalidateQueries({ queryKey: ['availableSchedules'] }),
      ]);
      if (!isMountedRef.current) return;
      toast('상담 제안을 수락했습니다. 예약이 신청되었습니다.', 'success');
      resetAcceptState();
      onAccepted();
    },
    onError: async (error) => {
      const isScheduleGone =
        error instanceof ApiError &&
        error.code === COUNSELING_PROPOSAL_ERROR_CODE.SCHEDULE_NOT_AVAILABLE;
      const isForbidden =
        error instanceof ApiError && error.code === COUNSELING_PROPOSAL_ERROR_CODE.FORBIDDEN;
      const isProposalStale =
        error instanceof ApiError &&
        (error.code === COUNSELING_PROPOSAL_ERROR_CODE.PROPOSAL_NOT_FOUND ||
          error.code === COUNSELING_PROPOSAL_ERROR_CODE.PROPOSAL_NOT_RESPONDABLE);
      if (isScheduleGone) await queryClient.invalidateQueries({ queryKey: ['availableSchedules'] });
      if (isForbidden) {
        // A004는 동의 오류와 학생 권한 오류를 구분하지 않으므로, 동의만 다시 읽고
        // 현재 수락 화면을 유지하면 유효한 activeConsent로 같은 요청을 반복할 수 있다.
        // 동의와 학생 전용 제안 목록을 함께 재조회한 뒤 수락 흐름을 닫아 실패를 보수적으로 처리한다.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: CONSENT_POLICIES_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: MY_CONSENTS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: ['myCounselingProposals'] }),
        ]);
      }
      if (isProposalStale)
        await queryClient.invalidateQueries({ queryKey: ['myCounselingProposals'] });
      if (!isMountedRef.current) return;
      if (isForbidden) {
        resetAcceptState();
        toast(getAcceptErrorMessage(error), 'error');
        onClose();
        return;
      }
      if (isProposalStale) {
        resetAcceptState();
        toast(getAcceptErrorMessage(error), 'error');
        onClose();
        return;
      }
      setAcceptConfirmOpen(false);
      setAcceptError(getAcceptErrorMessage(error));
      if (isScheduleGone) setSelectedScheduleId(null);
    },
    onSettled: () => {
      acceptInFlightRef.current = false;
      acceptMutation.reset();
    },
  });
  const isAcceptBusy = isAcceptPreflighting || acceptMutation.isPending;
  const closeAcceptConfirm = () => {
    if (!isAcceptBusy && !acceptInFlightRef.current) setAcceptConfirmOpen(false);
  };
  const closeAcceptDialog = () => {
    if (acceptMutation.isPending) return;
    acceptInFlightRef.current = false;
    resetAcceptState();
    onClose();
  };

  useEffect(() => {
    if (!acceptConfirmOpen) window.requestAnimationFrame(() => modalContentRef.current?.focus());
  }, [acceptConfirmOpen]);
  useEffect(() => {
    if (acceptConfirmOpen) return undefined;
    const modalElement = modalContentRef.current?.closest('.fixed');
    if (!modalElement) return undefined;
    const onKeyDown = (event) =>
      handleModalKeyDown(
        event,
        modalElement,
        isAcceptBusy || acceptInFlightRef.current,
        closeAcceptDialog,
      );
    modalElement.addEventListener('keydown', onKeyDown);
    return () => modalElement.removeEventListener('keydown', onKeyDown);
    // closeAcceptDialog는 최신 state를 읽으므로 effect 의존성에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptConfirmOpen, isAcceptBusy]);
  useEffect(() => {
    if (!acceptConfirmOpen) return undefined;
    const dialogElement = acceptConfirmRef.current?.querySelector('.fixed');
    if (!dialogElement) return undefined;
    const onKeyDown = (event) =>
      handleModalKeyDown(
        event,
        dialogElement,
        isAcceptBusy || acceptInFlightRef.current,
        closeAcceptConfirm,
      );
    dialogElement.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(() =>
      dialogElement.querySelector('.border-t button:not([disabled])')?.focus(),
    );
    return () => dialogElement.removeEventListener('keydown', onKeyDown);
    // closeAcceptConfirm은 최신 state를 읽으므로 effect 의존성에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptConfirmOpen, isAcceptBusy]);

  const handleAcceptConfirm = async () => {
    if (!selectedSchedule || isAcceptBusy || acceptInFlightRef.current) return;
    acceptInFlightRef.current = true;
    const proposalId = proposal.proposalId;
    const scheduleId = selectedSchedule.scheduleId;
    const attemptToken = acceptAttemptRef.current + 1;
    acceptAttemptRef.current = attemptToken;
    setIsAcceptPreflighting(true);
    const refreshed = await refreshConsentState(attemptToken);
    if (!isAcceptAttemptCurrent(attemptToken) || !refreshed) return;
    setIsAcceptPreflighting(false);
    if (!refreshed.ok || !refreshed.consent) {
      acceptInFlightRef.current = false;
      setAcceptConfirmOpen(false);
      setAcceptError(
        '동의가 유효하지 않아 수락을 진행할 수 없습니다. 동의 내용을 다시 확인해 주세요.',
      );
      return;
    }
    acceptMutation.mutate({
      proposalId,
      request: { scheduleId, consentId: refreshed.consent.userConsentId },
    });
  };

  return (
    <>
      {!acceptConfirmOpen && (
        <Modal
          open
          onClose={closeAcceptDialog}
          title="상담 제안 수락"
          size="md"
          footer={
            <>
              <Button
                size="sm"
                variant="secondary"
                className="min-h-[40px]"
                disabled={acceptMutation.isPending}
                onClick={closeAcceptDialog}
              >
                닫기
              </Button>
              <Button
                size="sm"
                style={{ background: ACCENT }}
                className="min-h-[40px]"
                disabled={!activeConsent || !selectedSchedule || isAcceptBusy}
                loading={acceptMutation.isPending}
                onClick={() => setAcceptConfirmOpen(true)}
              >
                수락
              </Button>
            </>
          }
        >
          <div
            ref={modalContentRef}
            tabIndex={-1}
            className="max-h-[calc(100dvh-12rem)] flex flex-col gap-4 overflow-y-auto outline-none"
          >
            <div className="bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] px-4 py-3 text-[12px] text-[#656D76]">
              검사일 {formatKstDateTime(proposal.testedAt)} · 점수 {proposal.totalScore} ·{' '}
              {proposal.resultLevel}
            </div>
            <section>
              <p className="text-[13px] font-semibold text-[#1F2328] mb-1.5">
                1. 상담 개인정보 동의
              </p>
              {isConsentLoading && (
                <div role="status" aria-busy="true">
                  <span className="sr-only">동의 정보를 불러오는 중입니다.</span>
                  <SkeletonLoader rows={2} cols={1} />
                </div>
              )}
              {!isConsentLoading && policiesQuery.isError && (
                <QueryError
                  message="동의 정책을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
                  query={policiesQuery}
                  onRetry={() => refreshConsentPolicies(acceptAttemptRef.current)}
                />
              )}
              {!isConsentLoading && myConsentsQuery.isError && (
                <QueryError
                  message="내 동의 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
                  query={myConsentsQuery}
                  onRetry={() => refreshMyConsents(acceptAttemptRef.current)}
                />
              )}
              {!isConsentLoading && !isConsentQueryError && !requiredPolicy && (
                <p className="text-[12px] text-[#92400E]" role="alert">
                  동의 정책 설정에 문제가 있어 수락을 진행할 수 없습니다. 상담센터에 문의해 주세요.
                </p>
              )}
              {!isConsentLoading &&
                !isConsentQueryError &&
                requiredPolicy &&
                (activeConsent ? (
                  <p className="text-[12px] font-semibold text-[#1A7F37]">동의 완료</p>
                ) : (
                  <div className="bg-white rounded-[6px] border border-[#E5E7EB] p-3 flex flex-col gap-2">
                    <p className="[overflow-wrap:anywhere] text-[11px] font-bold text-[#1F2328]">
                      {requiredPolicy.title}{' '}
                      <span className="text-[#6B7280] font-normal">v{requiredPolicy.version}</span>
                    </p>
                    <p className="[overflow-wrap:anywhere] whitespace-pre-wrap text-[11px] leading-relaxed text-[#444D56]">
                      {requiredPolicy.content}
                    </p>
                    <label className="flex min-h-[40px] items-center gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        checked={isCheckedForCurrentPolicy}
                        disabled={agreeMutation.isPending}
                        onChange={(event) =>
                          setCheckedConsent({
                            checked: event.target.checked,
                            consentPolicyId: requiredPolicy.consentPolicyId,
                            version: requiredPolicy.version,
                          })
                        }
                      />
                      위 상담 개인정보 수집·이용에 동의합니다.
                    </label>
                    <Button
                      size="sm"
                      disabled={!isCheckedForCurrentPolicy}
                      loading={agreeMutation.isPending}
                      onClick={handleAgree}
                      style={{ background: ACCENT }}
                      className="min-h-[40px] self-start"
                    >
                      동의하기
                    </Button>
                  </div>
                ))}
            </section>
            <fieldset className="m-0 border-0 p-0">
              <legend className="text-[13px] font-semibold text-[#1F2328] mb-1.5">
                2. 상담 일정 선택
              </legend>
              {counselingTypesQuery.isLoading && (
                <div role="status" aria-busy="true">
                  <span className="sr-only">상담 유형을 불러오는 중입니다.</span>
                  <SkeletonLoader rows={2} cols={1} />
                </div>
              )}
              {!counselingTypesQuery.isLoading && counselingTypesQuery.isError && (
                <QueryError
                  message="상담 유형을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
                  query={counselingTypesQuery}
                  onRetry={() => counselingTypesQuery.refetch()}
                />
              )}
              {!counselingTypesQuery.isLoading &&
                !counselingTypesQuery.isError &&
                !psychologicalType && (
                  <p className="text-[12px] text-[#92400E]" role="alert">
                    현재 심리상담 유형을 이용할 수 없습니다.
                  </p>
                )}
              {psychologicalType && (
                <>
                  {schedulesQuery.isLoading && (
                    <div role="status" aria-busy="true">
                      <span className="sr-only">예약 가능한 일정을 불러오는 중입니다.</span>
                      <SkeletonLoader rows={2} cols={1} />
                    </div>
                  )}
                  {!schedulesQuery.isLoading && schedulesQuery.isError && (
                    <QueryError
                      message="예약 가능한 일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
                      query={schedulesQuery}
                      onRetry={() => schedulesQuery.refetch()}
                    />
                  )}
                  {!schedulesQuery.isLoading &&
                    !schedulesQuery.isError &&
                    schedules.length === 0 && (
                      <p className="text-[12px] text-[#656D76]">
                        현재 예약 가능한 일정이 없습니다.
                      </p>
                    )}
                  {!schedulesQuery.isLoading && !schedulesQuery.isError && schedules.length > 0 && (
                    <div className="max-h-none space-y-2 overflow-visible pr-0 md:max-h-[220px] md:overflow-y-auto md:pr-1">
                      {schedules.map((schedule) => {
                        const isSelected = schedule.scheduleId === selectedScheduleId;
                        return (
                          <label
                            key={schedule.scheduleId}
                            className={`block cursor-pointer rounded-[6px] border p-3 min-h-[44px] transition-colors [&:has(:focus-visible)]:outline-2 [&:has(:focus-visible)]:outline-offset-2 [&:has(:focus-visible)]:outline-[#0E7490] ${isSelected ? 'border-[#0E7490] bg-[#F0FDFE]' : 'border-[#E5E7EB] hover:border-[#67E8F9]'}`}
                          >
                            <input
                              type="radio"
                              name="proposal-accept-schedule"
                              value={schedule.scheduleId}
                              checked={isSelected}
                              onChange={() => setSelectedScheduleId(schedule.scheduleId)}
                              className="sr-only"
                            />
                            <p className="text-[12px] font-bold text-[#1F2328]">
                              {formatKstDateTime(schedule.startsAt)} –{' '}
                              {formatKstDateTime(schedule.endsAt)}
                              {isSelected && <span className="ml-2 text-[#0E7490]">선택됨</span>}
                            </p>
                            <p className="mt-1 [overflow-wrap:anywhere] text-[11px] text-[#656D76]">
                              {schedule.counselorName}
                              {schedule.counselorDepartmentName &&
                                ` · ${schedule.counselorDepartmentName}`}
                              {schedule.location && ` · ${schedule.location}`}
                              {` · 잔여 ${schedule.remainingCapacity}명`}
                            </p>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </fieldset>
            {acceptError && (
              <p role="alert" className="text-[12px] text-[#A40E26]">
                {acceptError}
              </p>
            )}
          </div>
        </Modal>
      )}
      {acceptConfirmOpen && (
        <div ref={acceptConfirmRef}>
          <ConfirmDialog
            open
            title="상담 제안 수락 확인"
            message={
              selectedSchedule
                ? `${formatKstDateTime(selectedSchedule.startsAt)} · ${selectedSchedule.counselorName} 일정으로 상담 예약을 신청하시겠습니까?`
                : '선택한 일정으로 상담 예약을 신청하시겠습니까?'
            }
            confirmLabel="수락하기"
            loading={isAcceptBusy}
            onConfirm={handleAcceptConfirm}
            onCancel={closeAcceptConfirm}
          />
        </div>
      )}
    </>
  );
}

function QueryError({ message, query, onRetry }) {
  return (
    <div className="text-[12px] text-[#A40E26]" role="alert">
      <p>{message}</p>
      {canManuallyRetryQuery(query.error) && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 min-h-[40px]"
          loading={query.isFetching}
          onClick={onRetry}
        >
          다시 시도
        </Button>
      )}
    </div>
  );
}
