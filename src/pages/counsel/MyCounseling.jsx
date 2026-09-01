import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader,
  Tabs,
  Button,
  Modal,
  Drawer,
  Pagination,
  StatusBadge,
  EmptyState,
  SkeletonLoader,
  toast,
} from '@/components/common';
import { ApiError } from '@/api/client';
import {
  cancelCounselingReservation,
  changeCounselingReservationSchedule,
  fetchAvailableSchedules,
  fetchCounselingReservations,
  fetchCounselingTypes,
  fetchStressTestQuestions,
  fetchStressTestResults,
  getStudentCounselingPublicResult,
  getStudentCounselingResults,
  stressTestQuestionsQueryKey,
  stressTestResultsQueryKey,
  studentCounselingResultDetailQueryKey,
  studentCounselingResultsQueryKey,
  submitStressTestResult,
} from '@/api/counsel';
import { fetchConsentPolicies, fetchMyConsents, agreeToConsentPolicy } from '@/api/consent';
import {
  CONSENT_MODULE_CODE,
  CONSENT_TYPE,
  COUNSELING_CANCELLATION_REASON,
  COUNSELING_CANCELLATION_REASON_LABEL,
  COUNSELING_PUBLIC_RESULT_ERROR_CODE,
  COUNSELING_RESERVATION_ERROR_CODE,
  COUNSELING_RESERVATION_STATUS,
  COUNSELING_RESERVATION_STATUS_LABEL,
  STRESS_TEST_ERROR_CODE,
} from '@/constants/domain';

const ACCENT = '#0891B2';

// ─── 상담 이력(공개 결과) ────────────────────────────────────────────────────

const RESULT_PAGE_SIZE = 20;

function getStudentResultErrorMessage(error) {
  if (!(error instanceof ApiError))
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  if (error.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.RESULT_NOT_FOUND)
    return '해당 상담 결과를 찾을 수 없습니다. 목록을 다시 불러왔습니다.';
  return '상담 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

// ─── 심리검사(스트레스 자가진단) 지원 함수 ─────────────────────────────────────

// 상담 개인정보 필수 동의 정책은 정확히 한 건이어야 정상이다. 0건·2건 이상이면
// 서버 시드 설정 오류이므로 미동의로 뭉뚱그리지 않고 별도 "설정 오류" 상태로 구분한다.
function findRequiredPersonalInfoPolicies(policies) {
  return policies.filter(
    (policy) => policy.consentType === CONSENT_TYPE.PERSONAL_INFO && policy.required === true,
  );
}

// 철회된 이력이나 잘못된 ID는 유효한 동의로 인정하지 않는다.
function findValidConsent(consents, policy) {
  if (!policy) return null;
  return (
    consents.find(
      (consent) =>
        consent.consentPolicyId === policy.consentPolicyId &&
        consent.withdrawnAt === null &&
        Number.isInteger(consent.userConsentId) &&
        consent.userConsentId > 0,
    ) ?? null
  );
}

function getConsentErrorMessage(error) {
  if (error?.message === 'CONSENT_REFRESH_FAILED') {
    return '최신 동의 정보를 불러오지 못했습니다. 다시 시도해 주세요.';
  }
  if (error?.message === 'CONSENT_POLICY_MISCONFIGURED') {
    return '동의 정책 설정에 문제가 있어 진행할 수 없습니다. 관리자에게 문의해 주세요.';
  }
  if (error?.message === 'CONSENT_CHECK_STALE') {
    return '동의 내용이 갱신되었습니다. 최신 내용을 다시 확인하고 동의해 주세요.';
  }
  if (error?.message === 'CONSENT_VERIFY_FAILED' || error?.message === 'CONSENT_NOT_CONFIRMED') {
    return '동의 처리를 확인하지 못했습니다. 다시 시도해 주세요.';
  }
  return '동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

function getStressQuestionsErrorMessage(error) {
  if (error instanceof ApiError && error.code === STRESS_TEST_ERROR_CODE.NOT_AVAILABLE) {
    return '현재 스트레스 검사를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.';
  }
  return '문항을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function getStressResultsErrorMessage() {
  return '검사 결과 이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

// ─── 예약 현황 ───────────────────────────────────────────────────────────────

const RESERVATION_PAGE_SIZE = 20;
const RESERVATION_QUERY_KEY = ['counselingReservations', 0, RESERVATION_PAGE_SIZE];

const RESERVATION_BADGE_STYLES = {
  [COUNSELING_RESERVATION_STATUS.REQUESTED]: 'bg-[#DBEAFE] text-[#0969DA]',
  [COUNSELING_RESERVATION_STATUS.APPROVED]: 'bg-[#DBEAFE] text-[#0969DA]',
  [COUNSELING_RESERVATION_STATUS.IN_PROGRESS]: 'bg-[#FEF3C7] text-[#D97706]',
  [COUNSELING_RESERVATION_STATUS.COMPLETED]: 'bg-[#DCFCE7] text-[#1A7F37]',
  [COUNSELING_RESERVATION_STATUS.REJECTED]: 'bg-[#FEE2E2] text-[#CF222E]',
  [COUNSELING_RESERVATION_STATUS.CANCELED]: 'bg-[#F3F4F6] text-[#9AA0A6]',
};

const formatKstDateTime = (iso) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '표시할 수 없음';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
};

const getReservationListErrorMessage = (error) => {
  if (error?.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN) {
    return '예약 목록을 조회할 권한이 없습니다.';
  }

  return '예약 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
};

const getReservationMutationErrorMessage = (error, action) => {
  const errorCode = error?.code;

  if (errorCode === COUNSELING_RESERVATION_ERROR_CODE.RESERVATION_NOT_FOUND) {
    return '예약을 찾을 수 없습니다.';
  }

  if (errorCode === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN) {
    return '예약을 처리할 권한이 없습니다.';
  }

  if (action === 'cancel') {
    if (errorCode === COUNSELING_RESERVATION_ERROR_CODE.CANCELLATION_NOT_ALLOWED) {
      return '취소할 수 없는 예약입니다. 최신 상태를 확인해 주세요.';
    }

    if (errorCode === COUNSELING_RESERVATION_ERROR_CODE.INVALID_INPUT) {
      return '취소 사유를 확인해 주세요.';
    }

    return '예약을 취소하지 못했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.';
  }

  if (errorCode === COUNSELING_RESERVATION_ERROR_CODE.SCHEDULE_NOT_AVAILABLE) {
    return '선택한 일정을 사용할 수 없습니다. 다른 일정을 선택해 주세요.';
  }

  if (errorCode === COUNSELING_RESERVATION_ERROR_CODE.INVALID_INPUT) {
    return '현재 예약은 일정 변경을 할 수 없습니다. 최신 상태를 확인해 주세요.';
  }

  return '일정을 변경하지 못했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.';
};

const getAvailableSchedulesErrorMessage = (error) => {
  if (error?.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN) {
    return '변경 가능한 일정을 조회할 권한이 없습니다.';
  }

  return '변경 가능한 일정을 불러오지 못했습니다.';
};

const handleModalKeyDown = (event, modalElement, isPending, closeModal) => {
  if (event.key === 'Escape') {
    if (!isPending) {
      event.preventDefault();
      closeModal();
    }
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

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
};

function ReservationBadge({ status }) {
  const label = COUNSELING_RESERVATION_STATUS_LABEL[status] ?? status;
  const style = RESERVATION_BADGE_STYLES[status] ?? 'bg-[#F3F4F6] text-[#656D76]';

  return <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${style}`}>{label}</span>;
}

function ReservationTab() {
  const queryClient = useQueryClient();
  const cancelModalContentRef = useRef(null);
  const changeModalContentRef = useRef(null);
  const cancelReasonRef = useRef(null);
  const changeReasonRef = useRef(null);
  const cancelTriggerRef = useRef(null);
  const changeTriggerRef = useRef(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [changeModal, setChangeModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetail, setCancelDetail] = useState('');
  const [changeScheduleId, setChangeScheduleId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [changeError, setChangeError] = useState('');
  // 409(S013) stale 충돌이 나면 여기에 재조회한 "최신" 예약을 담아 둔다(못 찾으면 null일 수
  // 있다). null만으로는 조회 실패와 실제 미존재를 구분할 수 없으므로 조회 상태를 별도로
  // 관리한다. 충돌 여부 자체도 이 값의 null 여부로 파생하지 않고 isScheduleConflict로
  // 관리한다 — 재조회 결과에서 해당 예약을 못 찾아 null이 돼도 충돌 UI가 사라지면 안 되기
  // 때문이다(사라지면 옛 기준값으로 재제출 → 또 S013 무한 반복).
  const [scheduleConflictReservation, setScheduleConflictReservation] = useState(null);
  const [scheduleConflictReservationId, setScheduleConflictReservationId] = useState(null);
  const [latestReservationFetchStatus, setLatestReservationFetchStatus] = useState('idle');
  const [isScheduleConflict, setIsScheduleConflict] = useState(false);
  const rebaseButtonRef = useRef(null);

  const {
    data: reservationPage,
    isLoading: isReservationsLoading,
    error: reservationsError,
    refetch: refetchReservations,
  } = useQuery({
    queryKey: RESERVATION_QUERY_KEY,
    queryFn: () =>
      fetchCounselingReservations({
        page: 0,
        size: RESERVATION_PAGE_SIZE,
      }),
    // 뒤로 가기로 돌아온 화면도 캐시만 보여 주지 않고 현재 서버 상태를 다시 읽는다.
    refetchOnMount: 'always',
  });
  const { data: counselingTypes = [], isError: hasCounselingTypesError } = useQuery({
    queryKey: ['counselingTypes'],
    queryFn: fetchCounselingTypes,
  });
  const {
    data: availableSchedules = [],
    isLoading: isAvailableSchedulesLoading,
    error: availableSchedulesError,
    refetch: refetchAvailableSchedules,
  } = useQuery({
    queryKey: ['availableSchedules', changeModal?.counselingTypeId],
    queryFn: () => fetchAvailableSchedules(changeModal.counselingTypeId),
    enabled: changeModal !== null,
  });

  const reservations = reservationPage ? reservationPage.content : [];
  const totalReservations = reservationPage ? reservationPage.totalElements : 0;
  const typeNameById = useMemo(() => {
    const map = new Map();
    counselingTypes.forEach((type) => map.set(type.counselingTypeId, type.typeName));
    return map;
  }, [counselingTypes]);
  const alternativeSchedules = availableSchedules.filter(
    (schedule) => schedule.scheduleId !== changeModal?.counselingScheduleId,
  );
  const selectedSchedule = alternativeSchedules.find(
    (schedule) => schedule.scheduleId === Number(changeScheduleId),
  );

  const resetCancelModal = useCallback(() => {
    setCancelModal(null);
    setCancelReason('');
    setCancelDetail('');
    setCancelError('');
  }, []);
  const resetChangeModal = useCallback(() => {
    setChangeModal(null);
    setChangeScheduleId('');
    setChangeReason('');
    setChangeError('');
    setScheduleConflictReservation(null);
    setScheduleConflictReservationId(null);
    setLatestReservationFetchStatus('idle');
    setIsScheduleConflict(false);
  }, []);
  const restoreFocus = useCallback((triggerRef) => {
    window.requestAnimationFrame(() => {
      if (triggerRef.current?.isConnected) {
        triggerRef.current.focus();
      }
    });
  }, []);
  const refreshReservationData = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: RESERVATION_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['availableSchedules'] }),
    ]);
  const reloadLatestReservation = async (reservationId) => {
    setLatestReservationFetchStatus('loading');
    setScheduleConflictReservation(null);

    try {
      const [reservationResult] = await Promise.all([
        refetchReservations(),
        queryClient.invalidateQueries({ queryKey: ['availableSchedules'] }),
      ]);

      if (!reservationResult || reservationResult.isError) {
        setChangeError('최신 예약 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
        setLatestReservationFetchStatus('error');
        return;
      }

      const latestReservations = reservationResult.data?.content ?? [];
      setScheduleConflictReservation(
        latestReservations.find((item) => item.reservationId === reservationId) ?? null,
      );
      setLatestReservationFetchStatus('success');
    } catch {
      setChangeError('최신 예약 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
      setLatestReservationFetchStatus('error');
    }
  };
  const cancelMutation = useMutation({
    mutationFn: async ({ reservationId, cancellationReason }) => ({
      reservation: await cancelCounselingReservation(reservationId, { cancellationReason }),
    }),
    onSuccess: async ({ reservation }) => {
      await refreshReservationData();

      if (reservation.reservationStatus !== COUNSELING_RESERVATION_STATUS.CANCELED) {
        setCancelError('서버 응답이 예상과 달라 최신 상태를 확인해 주세요.');
        return;
      }

      resetCancelModal();
      restoreFocus(cancelTriggerRef);
      toast('예약이 취소되었습니다.', 'success');
    },
    onError: async (error) => {
      const message = getReservationMutationErrorMessage(error, 'cancel');

      setCancelError(message);
      await refreshReservationData();
      if (error?.code === COUNSELING_RESERVATION_ERROR_CODE.RESERVATION_NOT_FOUND) {
        resetCancelModal();
        restoreFocus(cancelTriggerRef);
        toast(message, 'error');
      }
    },
  });
  const changeMutation = useMutation({
    mutationFn: async ({ reservationId, expectedScheduleId, scheduleId, reason }) => ({
      reservation: await changeCounselingReservationSchedule(reservationId, {
        expectedScheduleId,
        scheduleId,
        changeReason: reason,
      }),
      scheduleId,
    }),
    onSuccess: async ({ reservation, scheduleId }) => {
      await refreshReservationData();

      if (
        reservation.reservationStatus !== COUNSELING_RESERVATION_STATUS.REQUESTED ||
        reservation.counselingScheduleId !== scheduleId
      ) {
        setChangeError('서버 응답이 예상과 달라 최신 상태를 확인해 주세요.');
        return;
      }

      resetChangeModal();
      restoreFocus(changeTriggerRef);
      toast('상담 일정을 변경했습니다.', 'success');
    },
    onError: async (error, variables) => {
      // S013(stale) 은 요청 당시 기준 일정이 이미 낡았다는 뜻이라 다른 오류와 다르게 다룬다.
      // 여기서는 절대 같은 요청을 자동 재전송하지 않고, 최신 예약을 다시 읽어 사용자가
      // 스스로 기준을 갱신한 뒤에만 재선택하게 한다.
      if (error?.code === COUNSELING_RESERVATION_ERROR_CODE.RESERVATION_SCHEDULE_CONFLICT) {
        // stale 충돌: 재조회가 실패하더라도 낡은 expectedScheduleId로 재제출되지 않도록
        // 막는 안전 상태를 먼저, 무조건 반영한다(아래 재조회의 성공에 의존하지 않는다).
        // 사유는 사용자가 다시 입력하지 않도록 보존하고, 일정 선택만 비워 낡은 값으로
        // 재제출되지 않게 한다. 기준 일정(changeModal)은 여기서 자동으로 바꾸지 않는다.
        setChangeError('예약 일정이 이미 변경되었습니다. 최신 예약 정보를 확인해 주세요.');
        setIsScheduleConflict(true);
        setChangeScheduleId('');
        setScheduleConflictReservationId(variables.reservationId);
        await reloadLatestReservation(variables.reservationId);
        return;
      }

      const message = getReservationMutationErrorMessage(error, 'change');

      setChangeError(message);
      await refreshReservationData();
      if (error?.code === COUNSELING_RESERVATION_ERROR_CODE.RESERVATION_NOT_FOUND) {
        resetChangeModal();
        restoreFocus(changeTriggerRef);
        toast(message, 'error');
      }
    },
  });
  const isActionPending = cancelMutation.isPending || changeMutation.isPending;

  const typeLabel = (counselingTypeId) =>
    typeNameById.get(counselingTypeId) ?? `상담 유형 ${counselingTypeId}`;
  const openCancelModal = (reservation, trigger) => {
    if (isActionPending) {
      return;
    }

    cancelTriggerRef.current = trigger;
    setCancelError('');
    setCancelModal(reservation);
  };
  const openChangeModal = (reservation, trigger) => {
    if (isActionPending) {
      return;
    }

    // 일정은 다른 학생의 요청으로 바로 바뀔 수 있으므로 모달을 열 때마다 서버 목록을 다시 읽는다.
    queryClient.invalidateQueries({
      queryKey: ['availableSchedules', reservation.counselingTypeId],
    });
    changeTriggerRef.current = trigger;
    setChangeError('');
    setScheduleConflictReservation(null);
    setScheduleConflictReservationId(null);
    setLatestReservationFetchStatus('idle');
    setIsScheduleConflict(false);
    setChangeModal(reservation);
  };
  const closeCancelModal = useCallback(() => {
    if (!cancelMutation.isPending) {
      resetCancelModal();
      restoreFocus(cancelTriggerRef);
    }
  }, [cancelMutation.isPending, resetCancelModal, restoreFocus]);
  const closeChangeModal = useCallback(() => {
    if (!changeMutation.isPending && latestReservationFetchStatus !== 'loading') {
      resetChangeModal();
      restoreFocus(changeTriggerRef);
    }
  }, [changeMutation.isPending, latestReservationFetchStatus, resetChangeModal, restoreFocus]);

  useEffect(() => {
    if (cancelModal) {
      cancelReasonRef.current?.focus();
    }
  }, [cancelModal]);

  useEffect(() => {
    if (!cancelModal) {
      return undefined;
    }

    const modalElement = cancelModalContentRef.current?.closest('.fixed');
    const onKeyDown = (event) =>
      handleModalKeyDown(event, modalElement, cancelMutation.isPending, closeCancelModal);

    modalElement?.addEventListener('keydown', onKeyDown);
    return () => modalElement?.removeEventListener('keydown', onKeyDown);
  }, [cancelModal, cancelMutation.isPending, closeCancelModal]);

  useEffect(() => {
    if (changeModal) {
      changeReasonRef.current?.focus();
    }
  }, [changeModal]);

  // S013 충돌 직후에는 최신 예약을 다시 읽는 동안 재기준 버튼이 비활성화된다.
  // 조회가 끝나 활성화된 재기준 또는 재시도 버튼으로 포커스를 옮긴다.
  // Button 컴포넌트가 ref를 forwarding하지 않으므로 감싸는 span에 ref를 걸고 내부 button을 찾는다.
  useEffect(() => {
    if (
      isScheduleConflict &&
      !changeMutation.isPending &&
      (latestReservationFetchStatus === 'success' || latestReservationFetchStatus === 'error')
    ) {
      rebaseButtonRef.current?.querySelector('button')?.focus();
    }
  }, [isScheduleConflict, latestReservationFetchStatus, changeMutation.isPending]);

  useEffect(() => {
    if (!changeModal) {
      return undefined;
    }

    const modalElement = changeModalContentRef.current?.closest('.fixed');
    const onKeyDown = (event) =>
      handleModalKeyDown(
        event,
        modalElement,
        changeMutation.isPending || latestReservationFetchStatus === 'loading',
        closeChangeModal,
      );

    modalElement?.addEventListener('keydown', onKeyDown);
    return () => modalElement?.removeEventListener('keydown', onKeyDown);
  }, [changeModal, changeMutation.isPending, closeChangeModal, latestReservationFetchStatus]);

  const handleCancel = () => {
    if (!cancelModal || cancelMutation.isPending) {
      return;
    }

    const selectedReason = COUNSELING_CANCELLATION_REASON_LABEL[cancelReason];
    const cancellationReason = [selectedReason, cancelDetail.trim()].filter(Boolean).join(': ');

    if (!cancellationReason) {
      setCancelError('취소 사유를 선택하거나 상세 사유를 입력해 주세요.');
      return;
    }

    setCancelError('');
    cancelMutation.mutate({
      reservationId: cancelModal.reservationId,
      cancellationReason,
    });
  };
  const handleChange = () => {
    const scheduleId = Number(changeScheduleId);

    // stale 충돌 상태에서는 사용자가 "최신 예약 기준으로 다시 선택"을 눌러 기준을
    // 갱신하기 전까지 재제출을 막는다(자동 재시도 금지).
    if (!changeModal || changeMutation.isPending || isScheduleConflict) {
      return;
    }

    // expectedScheduleId는 모달을 연 시점에 조회한 예약의 현재 일정 ID다. REQUESTED 상태
    // 예약은 항상 일정이 배정돼 있어야 하므로, 양의 정수가 아니면 화면이 오래된 데이터를
    // 들고 있다고 보고 요청 자체를 막는다.
    const expectedScheduleId = changeModal.counselingScheduleId;

    if (!Number.isInteger(expectedScheduleId) || expectedScheduleId < 1) {
      setChangeError('최신 상태를 확인해 주세요.');
      return;
    }

    if (!Number.isInteger(scheduleId) || scheduleId < 1 || !selectedSchedule) {
      setChangeError('변경할 일정을 선택해 주세요.');
      return;
    }

    if (!changeReason.trim()) {
      setChangeError('일정 변경 사유를 입력해 주세요.');
      return;
    }

    setChangeError('');
    changeMutation.mutate({
      reservationId: changeModal.reservationId,
      expectedScheduleId,
      scheduleId,
      reason: changeReason.trim(),
    });
  };
  const handleRetryLatestReservation = () => {
    if (
      changeMutation.isPending ||
      latestReservationFetchStatus === 'loading' ||
      scheduleConflictReservationId === null
    ) {
      return;
    }

    void reloadLatestReservation(scheduleConflictReservationId);
  };
  // "최신 예약 기준으로 다시 선택" 버튼 전용 핸들러. 재조회한 최신 예약이 여전히
  // REQUESTED일 때만 그 예약을 새 기준으로 삼아 재선택을 허용한다. 그 외에는 화면이
  // 이미 낡았다고 보고 모달을 닫아 사용자가 목록에서 최신 상태를 다시 보게 한다.
  const handleRebaseChangeModal = () => {
    if (changeMutation.isPending || latestReservationFetchStatus !== 'success') {
      return;
    }

    if (
      !scheduleConflictReservation ||
      scheduleConflictReservation.reservationStatus !== COUNSELING_RESERVATION_STATUS.REQUESTED
    ) {
      resetChangeModal();
      restoreFocus(changeTriggerRef);
      return;
    }

    // changeReason은 사용자가 입력한 값을 그대로 유지하고, 기준 일정과 일정 선택만 갱신한다.
    setChangeModal(scheduleConflictReservation);
    setScheduleConflictReservation(null);
    setScheduleConflictReservationId(null);
    setLatestReservationFetchStatus('idle');
    setIsScheduleConflict(false);
    setChangeScheduleId('');
    setChangeError('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#9AA0A6]">
          {reservationPage ? `총 ${totalReservations}건` : '예약 현황'}
          {totalReservations > RESERVATION_PAGE_SIZE && ` · 최근 ${RESERVATION_PAGE_SIZE}건 표시`}
        </p>
      </div>

      {hasCounselingTypesError && !isReservationsLoading && !reservationsError && (
        <p className="rounded-[6px] border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[12px] text-[#92400E]" role="status">
          상담 유형명을 불러오지 못해 유형 ID로 표시합니다.
        </p>
      )}

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['예약번호', '상담유형', '상담 시각', '신청일', '상태', '관리'].map((header) => (
                <th
                  key={header}
                  className={`px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${header === '상담유형' ? 'text-left' : 'text-center'}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isReservationsLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-[#9AA0A6]">
                  예약 현황을 불러오는 중입니다.
                </td>
              </tr>
            )}
            {!isReservationsLoading && reservationsError && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center">
                  <p className="text-[#CF222E]">{getReservationListErrorMessage(reservationsError)}</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={refetchReservations}>
                    다시 시도
                  </Button>
                </td>
              </tr>
            )}
            {!isReservationsLoading && !reservationsError && reservations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-[#9AA0A6]">
                  예약 내역이 없습니다.
                </td>
              </tr>
            )}
            {!isReservationsLoading &&
              !reservationsError &&
              reservations.map((reservation, index) => {
                const canCancel =
                  reservation.reservationStatus === COUNSELING_RESERVATION_STATUS.REQUESTED ||
                  reservation.reservationStatus === COUNSELING_RESERVATION_STATUS.APPROVED;
                const canChange =
                  reservation.reservationStatus === COUNSELING_RESERVATION_STATUS.REQUESTED;

                return (
                  <tr
                    key={reservation.reservationId}
                    className={`border-b border-[#F3F4F6] last:border-0 ${index % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                  >
                    <td className="px-3 py-3 text-center font-mono font-bold text-[11px] text-[#656D76]">
                      {reservation.reservationId}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#1F2328]">
                      {typeLabel(reservation.counselingTypeId)}
                    </td>
                    <td className="px-3 py-3 text-center text-[#656D76] whitespace-nowrap">
                      {/* 상담 시각은 nullable이다. counselingScheduleId가 없는 레거시 예약에선 startsAt도 null이라 '미배정'으로 표시한다. */}
                      {/* new Date(null)은 Invalid가 아니라 1970년으로 찍히므로, null을 formatKstDateTime에 넘기기 전에 반드시 먼저 거른다. */}
                      {reservation.startsAt ? formatKstDateTime(reservation.startsAt) : '미배정'}
                    </td>
                    <td className="px-3 py-3 text-center text-[#656D76] whitespace-nowrap">
                      {formatKstDateTime(reservation.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <ReservationBadge status={reservation.reservationStatus} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {canChange && (
                            <button
                              type="button"
                              disabled={isActionPending}
                              onClick={(event) => openChangeModal(reservation, event.currentTarget)}
                              className="h-6 px-2.5 text-[11px] font-bold rounded-[5px] border border-[#0891B2] text-[#0891B2] hover:bg-[#F0FDFE] transition-colors disabled:border-[#E5E7EB] disabled:text-[#C8D0D9] disabled:cursor-not-allowed"
                            >
                              변경
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              disabled={isActionPending}
                              onClick={(event) => openCancelModal(reservation, event.currentTarget)}
                              className="h-6 px-2.5 text-[11px] font-bold rounded-[5px] border border-[#FEE2E2] text-[#CF222E] hover:bg-[#FEF2F2] transition-colors disabled:border-[#E5E7EB] disabled:text-[#C8D0D9] disabled:cursor-not-allowed"
                            >
                              취소
                            </button>
                          )}
                          {!canCancel && !canChange && <span className="text-[11px] text-[#C8D0D9]">—</span>}
                        </div>
                        {reservation.reservationStatus === COUNSELING_RESERVATION_STATUS.APPROVED && (
                          <p className="max-w-[120px] text-center text-[10px] leading-snug text-[#9AA0A6]">
                            일정 변경은 취소 후 새로 신청해 주세요.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={cancelModal !== null}
        onClose={closeCancelModal}
        title="예약 취소"
        size="md"
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={cancelMutation.isPending}
              onClick={closeCancelModal}
            >
              닫기
            </Button>
            <Button
              size="sm"
              loading={cancelMutation.isPending}
              style={{ background: '#CF222E' }}
              onClick={handleCancel}
            >
              취소 확정
            </Button>
          </>
        }
      >
        {cancelModal && (
          <div ref={cancelModalContentRef} className="flex flex-col gap-4">
            <div className="bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] px-4 py-3 text-[12px] text-[#656D76]">
              <span className="font-bold text-[#1F2328]">예약 #{cancelModal.reservationId}</span>
              {' · '}
              {typeLabel(cancelModal.counselingTypeId)}
            </div>

            <div>
              <label htmlFor="cancel-reason" className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
                취소 사유 <span className="text-[#CF222E]">*</span>
              </label>
              <p id="cancel-reason-help" className="mb-1.5 text-[11px] text-[#9AA0A6]">
                사유 선택 또는 상세 사유 입력 중 하나는 필수입니다.
              </p>
              <select
                id="cancel-reason"
                ref={cancelReasonRef}
                value={cancelReason}
                disabled={cancelMutation.isPending}
                aria-describedby="cancel-reason-help"
                onChange={(event) => {
                  setCancelReason(event.target.value);
                  setCancelError('');
                }}
                className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#0891B2] appearance-none disabled:bg-[#F6F8FA]"
              >
                <option value="">선택하세요</option>
                {Object.values(COUNSELING_CANCELLATION_REASON).map((reason) => (
                  <option key={reason} value={reason}>
                    {COUNSELING_CANCELLATION_REASON_LABEL[reason]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cancel-detail" className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
                상세 사유 <span className="text-[#9AA0A6] font-normal">(선택)</span>
              </label>
              <textarea
                id="cancel-detail"
                value={cancelDetail}
                disabled={cancelMutation.isPending}
                onChange={(event) => {
                  setCancelDetail(event.target.value);
                  setCancelError('');
                }}
                placeholder="추가로 알려주실 내용을 입력해 주세요."
                rows={3}
                className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#0891B2] placeholder:text-[#9AA0A6] disabled:bg-[#F6F8FA]"
              />
            </div>

            {cancelError && <p className="text-[12px] text-[#CF222E]" role="alert">{cancelError}</p>}

            <div className="flex items-start gap-2 bg-[#FEF3C7] border border-[#FDE68A] rounded-[6px] px-3 py-2.5">
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="#D97706"
                className="flex-shrink-0 mt-0.5"
              >
                <path d="M8 1L1 14h14L8 1z" />
                <path d="M8 6v4M8 12h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-[11px] text-[#92400E]">
                취소 가능 여부는 서버가 현재 상태와 마감 시각을 기준으로 다시 확인합니다.
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={changeModal !== null}
        onClose={closeChangeModal}
        title="상담 일정 변경"
        size="md"
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={changeMutation.isPending || latestReservationFetchStatus === 'loading'}
              onClick={closeChangeModal}
            >
              닫기
            </Button>
            {isScheduleConflict ? (
              <span ref={rebaseButtonRef}>
                <Button
                  size="sm"
                  loading={latestReservationFetchStatus === 'loading'}
                  disabled={changeMutation.isPending || latestReservationFetchStatus === 'loading'}
                  onClick={
                    latestReservationFetchStatus === 'error'
                      ? handleRetryLatestReservation
                      : handleRebaseChangeModal
                  }
                >
                  {latestReservationFetchStatus === 'loading'
                    ? '최신 예약 확인 중...'
                    : latestReservationFetchStatus === 'error'
                      ? '최신 예약 다시 불러오기'
                      : '최신 예약 기준으로 다시 선택'}
                </Button>
              </span>
            ) : (
              <Button size="sm" loading={changeMutation.isPending} onClick={handleChange}>
                변경 확정
              </Button>
            )}
          </>
        }
      >
        {changeModal && (
          <div ref={changeModalContentRef} className="flex flex-col gap-4">
            <div className="bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] px-4 py-3 text-[12px] text-[#656D76]">
              <span className="font-bold text-[#1F2328]">예약 #{changeModal.reservationId}</span>
              {' · '}
              현재 일정 ID {changeModal.counselingScheduleId ?? '미배정'}
            </div>

            <div>
              <p className="text-[13px] font-semibold text-[#1F2328] mb-1.5">변경할 일정</p>
              <p className="mb-2 text-[11px] text-[#9AA0A6]">모든 시간은 한국 표준시(KST)입니다.</p>
              {isAvailableSchedulesLoading && (
                <p className="rounded-[6px] bg-[#F6F8FA] px-3 py-4 text-center text-[12px] text-[#9AA0A6]">
                  변경 가능한 일정을 불러오는 중입니다.
                </p>
              )}
              {!isAvailableSchedulesLoading && availableSchedulesError && (
                <div className="rounded-[6px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-3 text-[12px] text-[#CF222E]">
                  <p>{getAvailableSchedulesErrorMessage(availableSchedulesError)}</p>
                  <button
                    type="button"
                    disabled={changeMutation.isPending}
                    onClick={refetchAvailableSchedules}
                    className="mt-2 font-bold underline disabled:text-[#9AA0A6]"
                  >
                    다시 시도
                  </button>
                </div>
              )}
              {!isAvailableSchedulesLoading && !availableSchedulesError && alternativeSchedules.length === 0 && (
                <p className="rounded-[6px] bg-[#F6F8FA] px-3 py-4 text-center text-[12px] text-[#9AA0A6]">
                  변경 가능한 다른 일정이 없습니다.
                </p>
              )}
              {!isAvailableSchedulesLoading && !availableSchedulesError && alternativeSchedules.length > 0 && (
                <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                  {alternativeSchedules.map((schedule) => {
                    const isSelected = schedule.scheduleId === Number(changeScheduleId);

                    return (
                      <label
                        key={schedule.scheduleId}
                        className={`block cursor-pointer rounded-[6px] border p-3 transition-colors ${isSelected ? 'border-[#0891B2] bg-[#F0FDFE]' : 'border-[#E5E7EB] hover:border-[#67E8F9]'} ${changeMutation.isPending || isScheduleConflict ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <input
                          type="radio"
                          name="change-schedule"
                          value={schedule.scheduleId}
                          checked={isSelected}
                          disabled={changeMutation.isPending || isScheduleConflict}
                          onChange={(event) => {
                            setChangeScheduleId(event.target.value);
                            setChangeError('');
                          }}
                          className="sr-only"
                        />
                        <p className="text-[12px] font-bold text-[#1F2328]">
                          {formatKstDateTime(schedule.startsAt)} – {formatKstDateTime(schedule.endsAt)}
                        </p>
                        <p className="mt-1 text-[11px] text-[#656D76]">
                          {schedule.counselorName}
                          {schedule.counselorDepartmentName && ` · ${schedule.counselorDepartmentName}`}
                          {schedule.location && ` · ${schedule.location}`}
                          {` · 잔여 ${schedule.remainingCapacity}명`}
                        </p>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="change-reason" className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
                변경 사유 <span className="text-[#CF222E]">*</span>
              </label>
              <textarea
                id="change-reason"
                ref={changeReasonRef}
                value={changeReason}
                disabled={changeMutation.isPending}
                onChange={(event) => {
                  setChangeReason(event.target.value);
                  setChangeError('');
                }}
                placeholder="일정 변경 사유를 입력해 주세요."
                rows={3}
                className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#0891B2] placeholder:text-[#9AA0A6] disabled:bg-[#F6F8FA]"
              />
            </div>

            {changeError && <p className="text-[12px] text-[#CF222E]" role="alert">{changeError}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Tab: 상담 이력 ───────────────────────────────────────────────────────────

function HistoryTab() {
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
                  <Button size="sm" variant="outline" className="mt-3" onClick={refetch}>
                    다시 시도
                  </Button>
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
          <p className="text-[12px] text-[#CF222E]" role="alert">
            {getStudentResultErrorMessage(detailError)}
          </p>
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

// ─── Tab: 심리검사(스트레스 자가진단) ───────────────────────────────────────────

const CONSENT_POLICIES_QUERY_KEY = ['consentPolicies', CONSENT_MODULE_CODE.COUNSELING];
const MY_CONSENTS_QUERY_KEY = ['myConsents'];
const RESULT_HISTORY_PAGE_SIZE = 20;

function PsychTab() {
  const queryClient = useQueryClient();

  // 원응답은 이 useState 하나에만 둔다. 새로고침·탭 이동·언마운트로 사라져야 하므로
  // 절대 브라우저 저장소·Zustand·React Query 캐시에 복제하지 않는다.
  const [answers, setAnswers] = useState({});
  const [submitError, setSubmitError] = useState('');
  // handleSubmit 진입부터 mutate() 호출 전까지(동의 재검증 GET 왕복 구간)를 잠그는 플래그.
  // submitMutation.isPending만으로는 이 구간이 커버되지 않아 연속 클릭 시 중복 제출이 가능했다.
  const [isReverifying, setIsReverifying] = useState(false);
  const [isConsentBlocked, setIsConsentBlocked] = useState(false);
  const [isQuestionRefreshBlocked, setIsQuestionRefreshBlocked] = useState(false);
  const [isStressTestUnavailable, setIsStressTestUnavailable] = useState(false);
  const [isStressTestSubmissionForbidden, setIsStressTestSubmissionForbidden] = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [resultPage, setResultPage] = useState(0);
  // 체크박스는 서버 동의의 근거가 아니라 화면에서만 쓰는 일시 상태다. 정책 ID·버전을
  // 함께 들고 있어야, 정책이 바뀐 뒤 오래된 체크로 최신 정책에 동의해버리는 것을 막을 수 있다.
  const [checkedConsent, setCheckedConsent] = useState({
    checked: false,
    consentPolicyId: null,
    version: null,
  });
  const lastQuestionVersionRef = useRef(null);
  const fieldsetRefs = useRef({});
  const resultHeadingRef = useRef(null);
  const resultErrorRef = useRef(null);
  const consentCheckboxRef = useRef(null);
  const consentErrorRef = useRef(null);
  const questionBlockRef = useRef(null);
  const shouldFocusFirstQuestionRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 결과 이력에는 방금 만든 캐시가 남아 있을 수 있으므로, 탭을 벗어나면 즉시 지운다.
      // 진행 중 요청은 취소하지 않는다 — 서버 저장 자체는 이미 확정된 사실이라 클라이언트
      // 판단으로 불확실하게 만들지 않기 위함이다.
      queryClient.removeQueries({ queryKey: ['studentStressTestResults'] });
      queryClient.removeQueries({ queryKey: MY_CONSENTS_QUERY_KEY });
    };
  }, [queryClient]);

  // ── 동의 게이트 ──
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

  const policies = policiesQuery.data ?? [];
  const consents = myConsentsQuery.data ?? [];
  const requiredPolicies = findRequiredPersonalInfoPolicies(policies);
  const requiredPolicy = requiredPolicies.length === 1 ? requiredPolicies[0] : null;
  const isConsentLoading = policiesQuery.isLoading || myConsentsQuery.isLoading;
  const isConsentQueryError = policiesQuery.isError || myConsentsQuery.isError;
  const isConsentForbidden =
    policiesQuery.error?.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN ||
    myConsentsQuery.error?.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN;
  const isPolicyMisconfigured =
    !isConsentLoading && !isConsentQueryError && requiredPolicies.length !== 1;
  const validConsent = requiredPolicy ? findValidConsent(consents, requiredPolicy) : null;
  const hasValidConsent = validConsent !== null;
  const canStartStressTest =
    hasValidConsent &&
    !isConsentBlocked &&
    !isConsentForbidden &&
    !isConsentQueryError &&
    !isPolicyMisconfigured;
  const isCheckedForCurrentPolicy =
    checkedConsent.checked &&
    requiredPolicy !== null &&
    checkedConsent.consentPolicyId === requiredPolicy.consentPolicyId &&
    checkedConsent.version === requiredPolicy.version;

  const retryConsentQueries = async () => {
    const [policiesResult, consentsResult] = await Promise.all([
      policiesQuery.refetch(),
      myConsentsQuery.refetch(),
    ]);
    if (!isMountedRef.current || policiesResult.isError || consentsResult.isError) {
      return;
    }

    const latestRequiredPolicies = findRequiredPersonalInfoPolicies(policiesResult.data ?? []);
    const latestPolicy = latestRequiredPolicies.length === 1 ? latestRequiredPolicies[0] : null;
    if (latestPolicy && findValidConsent(consentsResult.data ?? [], latestPolicy)) {
      shouldFocusFirstQuestionRef.current = true;
      setIsConsentBlocked(false);
      setSubmitError('');
    } else if (latestPolicy) {
      setIsConsentBlocked(true);
    }
  };

  // 제출 직전 재검증에서도 재사용하므로 컴포넌트 함수로 둔다. 화면에 보이는 캐시만 보지 않고
  // 항상 서버에 다시 물어 최신 정책·동의를 확인한다.
  const reverifyConsent = async () => {
    const [policiesResult, consentsResult] = await Promise.all([
      policiesQuery.refetch(),
      myConsentsQuery.refetch(),
    ]);
    if (policiesResult.isError || consentsResult.isError) {
      return { ok: false, policy: null, consent: null };
    }
    const latestRequiredPolicies = findRequiredPersonalInfoPolicies(policiesResult.data ?? []);
    if (latestRequiredPolicies.length !== 1) {
      return { ok: true, policy: null, consent: null };
    }
    const latestPolicy = latestRequiredPolicies[0];
    const latestConsent = findValidConsent(consentsResult.data ?? [], latestPolicy);
    return { ok: true, policy: latestPolicy, consent: latestConsent };
  };

  const agreeMutation = useMutation({
    mutationFn: async () => {
      const { ok, policy, consent } = await reverifyConsent();
      if (!ok) {
        throw new Error('CONSENT_REFRESH_FAILED');
      }
      if (!policy) {
        throw new Error('CONSENT_POLICY_MISCONFIGURED');
      }
      if (consent) {
        // 재조회 사이에 이미 유효한 동의가 생겼으면 중복 POST 없이 그대로 진행한다(멱등 처리).
        return;
      }
      if (
        !checkedConsent.checked ||
        checkedConsent.consentPolicyId !== policy.consentPolicyId ||
        checkedConsent.version !== policy.version
      ) {
        throw new Error('CONSENT_CHECK_STALE');
      }

      try {
        await agreeToConsentPolicy(policy.consentPolicyId);
      } catch (error) {
        if (error instanceof ApiError && error.code === STRESS_TEST_ERROR_CODE.CONSENT_CONFLICT) {
          // U012(동시 동의 충돌): 다른 요청이 먼저 처리됐을 수 있으므로 이력만 한 번 다시 읽어
          // 유효 동의가 이미 생겼으면 성공으로 본다. 그래도 없으면 원래 오류를 그대로 던진다.
          const retry = await myConsentsQuery.refetch();
          if (!retry.isError && findValidConsent(retry.data ?? [], policy)) {
            return;
          }
        }
        throw error;
      }

      const [finalPolicies, finalConsents] = await Promise.all([
        policiesQuery.refetch(),
        myConsentsQuery.refetch(),
      ]);
      if (finalPolicies.isError || finalConsents.isError) {
        throw new Error('CONSENT_VERIFY_FAILED');
      }
      if (!findValidConsent(finalConsents.data ?? [], policy)) {
        throw new Error('CONSENT_NOT_CONFIRMED');
      }
    },
    retry: false,
    onSuccess: () => {
      if (!isMountedRef.current) {
        return;
      }
      shouldFocusFirstQuestionRef.current = true;
      setCheckedConsent({ checked: false, consentPolicyId: null, version: null });
      setIsConsentBlocked(false);
      setSubmitError('');
    },
  });

  // ── 문항과 응답 ──
  const questionsQuery = useQuery({
    queryKey: stressTestQuestionsQueryKey,
    queryFn: fetchStressTestQuestions,
    enabled: canStartStressTest,
    retry: false,
  });
  const questionsData = questionsQuery.data;
  const isQuestionForbidden =
    questionsQuery.isError && questionsQuery.error?.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN;
  const isStressTestForbidden = isQuestionForbidden || isStressTestSubmissionForbidden;

  useEffect(() => {
    if ((!isConsentQueryError && !isPolicyMisconfigured) || isConsentLoading) {
      return;
    }
    window.requestAnimationFrame(() => {
      if (isMountedRef.current) {
        consentErrorRef.current?.focus();
      }
    });
  }, [isConsentForbidden, isConsentLoading, isConsentQueryError, isPolicyMisconfigured]);

  useEffect(() => {
    if (
      !shouldFocusFirstQuestionRef.current ||
      !canStartStressTest ||
      questionsQuery.isLoading ||
      questionsQuery.isFetching ||
      questionsQuery.isError ||
      !questionsData
    ) {
      return;
    }
    shouldFocusFirstQuestionRef.current = false;
    window.requestAnimationFrame(() => {
      if (isMountedRef.current) {
        fieldsetRefs.current[questionsData.questions[0]?.questionId]?.focus();
      }
    });
  }, [canStartStressTest, questionsData, questionsQuery.isError, questionsQuery.isFetching, questionsQuery.isLoading]);

  useEffect(() => {
    if (
      !isConsentBlocked ||
      isConsentLoading ||
      isConsentQueryError ||
      isPolicyMisconfigured ||
      !requiredPolicy
    ) {
      return;
    }
    window.requestAnimationFrame(() => {
      if (isMountedRef.current) {
        consentCheckboxRef.current?.focus();
      }
    });
  }, [isConsentBlocked, isConsentLoading, isConsentQueryError, isPolicyMisconfigured, requiredPolicy]);

  useEffect(() => {
    if (
      !canStartStressTest ||
      (!isQuestionRefreshBlocked &&
        !isStressTestUnavailable &&
        !isStressTestForbidden &&
        !questionsQuery.isError)
    ) {
      return;
    }
    window.requestAnimationFrame(() => {
      if (isMountedRef.current) {
        questionBlockRef.current?.focus();
      }
    });
  }, [canStartStressTest, isQuestionRefreshBlocked, isStressTestForbidden, isStressTestUnavailable, questionsQuery.isError]);

  const refreshStressTestQuestions = async () => {
    try {
      const result = await questionsQuery.refetch();
      return result.isError ? null : result.data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!questionsData) return;
    // 문항 버전이 바뀌면(재조회로 다른 버전이 내려오면) 이전 답변은 더 이상 의미가 없으므로 비운다.
    if (lastQuestionVersionRef.current !== questionsData.testVersion) {
      lastQuestionVersionRef.current = questionsData.testVersion;
      setAnswers({});
    }
  }, [questionsData]);

  const answeredCount = questionsData
    ? questionsData.questions.filter((q) => answers[q.questionId] !== undefined).length
    : 0;

  // ── 결과 이력 ──
  const resultsQuery = useQuery({
    queryKey: stressTestResultsQueryKey(resultPage, RESULT_HISTORY_PAGE_SIZE),
    queryFn: () => fetchStressTestResults({ page: resultPage, size: RESULT_HISTORY_PAGE_SIZE }),
    placeholderData: keepPreviousData,
    retry: false,
    gcTime: 0,
  });
  const resultItems = resultsQuery.data?.content ?? [];
  const resultTotalPages = resultsQuery.data?.totalPages ?? 0;
  const isResultsLoading =
    resultsQuery.isLoading || resultsQuery.isFetching || resultsQuery.isPlaceholderData;
  const isResultsForbidden =
    resultsQuery.isError && resultsQuery.error?.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN;

  useEffect(() => {
    if (!resultsQuery.isError) {
      return;
    }
    window.requestAnimationFrame(() => {
      if (isMountedRef.current) {
        resultErrorRef.current?.focus();
      }
    });
  }, [resultsQuery.error, resultsQuery.isError]);

  useEffect(() => {
    if (resultsQuery.isPlaceholderData || resultsQuery.isError || !resultsQuery.data) return;
    if (resultTotalPages === 0 && resultPage !== 0) {
      setResultPage(0);
      return;
    }
    if (resultTotalPages > 0 && resultPage >= resultTotalPages) {
      setResultPage(resultTotalPages - 1);
    }
  }, [resultPage, resultTotalPages, resultsQuery.data, resultsQuery.isError, resultsQuery.isPlaceholderData]);

  // ── 제출 ──
  const submitMutation = useMutation({
    // 인자 없는 mutationFn: 답변은 컴포넌트 state(answers)를 그대로 참조하고 mutation
    // variables에는 아무것도 담지 않는다. React Query DevTools나 캐시에 원응답이 남지 않게 하기 위함이다.
    mutationFn: () =>
      submitStressTestResult({
        testVersion: questionsData.testVersion,
        answers: questionsData.questions.map((question) => ({
          questionId: question.questionId,
          selectedValue: answers[question.questionId],
        })),
      }),
    retry: false,
    gcTime: 0,
    onSuccess: (result) => {
      if (!isMountedRef.current) {
        queryClient.removeQueries({ queryKey: ['studentStressTestResults'] });
        return;
      }
      setLatestResult(result);
      setAnswers({});
      setSubmitError('');
      setResultPage(0);
      queryClient.invalidateQueries({ queryKey: ['studentStressTestResults'] });
      window.requestAnimationFrame(() => resultHeadingRef.current?.focus());
      submitMutation.reset();
    },
    onError: async (error) => {
      if (!isMountedRef.current) {
        return;
      }
      if (error instanceof ApiError && error.code === STRESS_TEST_ERROR_CODE.REQUIRED_CONSENT_NOT_AGREED) {
        setIsConsentBlocked(true);
        setCheckedConsent({ checked: false, consentPolicyId: null, version: null });
        setSubmitError('상담 개인정보 동의가 확인되지 않았습니다. 동의 후 다시 시도해 주세요.');
        void retryConsentQueries();
      } else if (error instanceof ApiError && error.code === STRESS_TEST_ERROR_CODE.INVALID_INPUT) {
        setAnswers({});
        setIsQuestionRefreshBlocked(true);
        setSubmitError('제출한 응답을 확인할 수 없습니다. 문항을 다시 불러왔으니 처음부터 다시 응답해 주세요.');
        const refreshedQuestions = await refreshStressTestQuestions();
        if (!isMountedRef.current) {
          return;
        }
        if (!refreshedQuestions) {
          setSubmitError('문항을 다시 불러오지 못했습니다. 다시 시도해 주세요.');
          return;
        }
        setIsQuestionRefreshBlocked(false);
        setSubmitError('');
        window.requestAnimationFrame(() => {
          if (isMountedRef.current) {
            fieldsetRefs.current[refreshedQuestions.questions[0]?.questionId]?.focus();
          }
        });
      } else if (error instanceof ApiError && error.code === STRESS_TEST_ERROR_CODE.NOT_AVAILABLE) {
        setAnswers({});
        setIsStressTestUnavailable(true);
        setSubmitError('현재 스트레스 검사를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        const refreshedQuestions = await refreshStressTestQuestions();
        if (isMountedRef.current && refreshedQuestions) {
          setIsStressTestUnavailable(false);
          setSubmitError('');
          window.requestAnimationFrame(() => {
            if (isMountedRef.current) {
              fieldsetRefs.current[refreshedQuestions.questions[0]?.questionId]?.focus();
            }
          });
        }
      } else if (error instanceof ApiError && error.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN) {
        setIsStressTestSubmissionForbidden(true);
        setSubmitError('스트레스 검사를 제출할 권한이 없습니다.');
      } else {
        setSubmitError('제출하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
      }
    },
  });

  const handleSelect = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSubmitError('');
  };

  const handleSubmit = async () => {
    // reverifyConsent()는 GET 왕복 두 번을 거치므로, mutate() 시작 전까지 submitMutation.isPending은
    // 아직 false다. 이 왕복 구간에서 버튼이 다시 눌리면 재검증~제출이 겹쳐 실행될 수 있어
    // 별도 플래그로 handleSubmit 진입 시점부터 잠근다.
    if (
      !questionsData ||
      isQuestionRefreshBlocked ||
      isStressTestUnavailable ||
      isStressTestForbidden ||
      isReverifying ||
      submitMutation.isPending ||
      agreeMutation.isPending
    ) {
      return;
    }
    setIsReverifying(true);

    try {
      const missingQuestion = questionsData.questions.find(
        (question) => answers[question.questionId] === undefined,
      );
      if (missingQuestion) {
        setSubmitError('모든 문항에 응답해 주세요.');
        fieldsetRefs.current[missingQuestion.questionId]?.focus();
        return;
      }

      // 문항에 모두 답했더라도, 여기서 동의가 여전히 유효한지 서버에 다시 확인한다.
      // 화면을 열어 둔 사이 동의가 철회됐을 수 있고, 그 경우 POST 자체를 시도하지 않는다.
      const { ok, consent } = await reverifyConsent();
      if (!isMountedRef.current) {
        return;
      }
      if (!ok) {
        setIsConsentBlocked(true);
        setCheckedConsent({ checked: false, consentPolicyId: null, version: null });
        setSubmitError('최신 동의 상태를 확인하지 못했습니다. 답변은 유지되니 다시 시도해 주세요.');
        return;
      }
      if (!consent) {
        setIsConsentBlocked(true);
        setCheckedConsent({ checked: false, consentPolicyId: null, version: null });
        setSubmitError('상담 개인정보 동의가 확인되지 않았습니다. 동의 후 다시 시도해 주세요.');
        return;
      }

      if (!isMountedRef.current) {
        return;
      }
      setSubmitError('');
      submitMutation.mutate();
    } finally {
      // 재검증 실패·조기 return·성공적인 mutate() 호출 모든 경로에서 잠금을 반드시 푼다.
      if (isMountedRef.current) {
        setIsReverifying(false);
      }
    }
  };

  const isSubmitting = isReverifying || submitMutation.isPending;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[8px] px-5 py-3">
        <p className="text-[13px] font-bold text-[#164E63]">스트레스 자가진단</p>
        <p className="mt-1 text-[12px] text-[#164E63]">
          11개 문항에 답하면 즉시 결과를 확인할 수 있습니다. 결과는 상담사가 상담 제안 시 참고할
          수 있습니다.
        </p>
      </div>

      {/* 동의 게이트 */}
      {isConsentLoading && <SkeletonLoader rows={3} cols={1} />}

      {!isConsentLoading && isConsentForbidden && (
        <div
          ref={consentErrorRef}
          tabIndex={-1}
          role="alert"
          className="bg-white rounded-[8px] border border-[#FECACA] px-5 py-4"
        >
          <p className="text-[12px] text-[#CF222E]">동의 정보를 조회할 권한이 없습니다.</p>
        </div>
      )}

      {!isConsentLoading && !isConsentForbidden && isConsentQueryError && (
        <div
          ref={consentErrorRef}
          tabIndex={-1}
          role="alert"
          className="bg-white rounded-[8px] border border-[#FECACA] px-5 py-4"
        >
          <p className="text-[12px] text-[#CF222E]">
            동의 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={retryConsentQueries}>
            다시 시도
          </Button>
        </div>
      )}

      {!isConsentLoading && !isConsentQueryError && isPolicyMisconfigured && (
        <div
          ref={consentErrorRef}
          tabIndex={-1}
          role="alert"
          className="bg-white rounded-[8px] border border-[#FDE68A] px-5 py-4"
        >
          <p className="text-[12px] text-[#92400E]">
            동의 정책 설정에 문제가 있어 검사를 시작할 수 없습니다. 관리자에게 문의해 주세요.
          </p>
        </div>
      )}

      {!isConsentLoading && !isConsentQueryError && !isPolicyMisconfigured && (!hasValidConsent || isConsentBlocked) && requiredPolicy && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-5 py-4 flex flex-col gap-3">
          <div>
            <p className="text-[13px] font-bold text-[#1F2328]">
              {requiredPolicy.title}
              <span className="ml-2 text-[11px] font-normal text-[#9AA0A6]">v{requiredPolicy.version}</span>
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-[#444D56]">
              {requiredPolicy.content}
            </p>
          </div>

          {isConsentBlocked && submitError && (
            <p className="text-[12px] text-[#CF222E]" role="alert">
              {submitError}
            </p>
          )}

          <label className="flex items-center gap-2 text-[12px] text-[#1F2328]">
            <input
              ref={consentCheckboxRef}
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

          {agreeMutation.isError && (
            <p className="text-[12px] text-[#CF222E]" role="alert">
              {getConsentErrorMessage(agreeMutation.error)}
            </p>
          )}

          <Button
            size="sm"
            disabled={!isCheckedForCurrentPolicy}
            loading={agreeMutation.isPending}
            onClick={() => agreeMutation.mutate()}
            style={{ background: ACCENT }}
          >
            동의하고 검사 시작
          </Button>
        </div>
      )}

      {!isConsentLoading && !isConsentQueryError && !isPolicyMisconfigured && canStartStressTest && (
        <p className="text-[12px] font-semibold text-[#1A7F37]">동의 완료 · 아래 문항에 응답해 주세요.</p>
      )}

      {/* 문항 */}
      {canStartStressTest && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-5 py-5">
          {isStressTestForbidden && (
            <div ref={questionBlockRef} tabIndex={-1}>
              <p className="text-[12px] text-[#CF222E]" role="alert">
                스트레스 검사를 이용할 권한이 없습니다.
              </p>
            </div>
          )}

          {!isStressTestForbidden && isQuestionRefreshBlocked && (
            <div ref={questionBlockRef} tabIndex={-1}>
              <p className="text-[12px] text-[#CF222E]" role="alert">
                {submitError}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={async () => {
                  const refreshedQuestions = await refreshStressTestQuestions();
                  if (!isMountedRef.current) {
                    return;
                  }
                  if (!refreshedQuestions) {
                    setSubmitError('문항을 다시 불러오지 못했습니다. 다시 시도해 주세요.');
                    return;
                  }
                  setIsQuestionRefreshBlocked(false);
                  setSubmitError('');
                  window.requestAnimationFrame(() => {
                    if (isMountedRef.current) {
                      fieldsetRefs.current[refreshedQuestions.questions[0]?.questionId]?.focus();
                    }
                  });
                }}
              >
                다시 시도
              </Button>
            </div>
          )}

          {!isStressTestForbidden && !isQuestionRefreshBlocked && isStressTestUnavailable && (
            <div ref={questionBlockRef} tabIndex={-1}>
              <p className="text-[12px] text-[#CF222E]" role="alert">
                현재 스트레스 검사를 이용할 수 없습니다. 문항을 다시 확인해 주세요.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={async () => {
                  const refreshedQuestions = await refreshStressTestQuestions();
                  if (isMountedRef.current && refreshedQuestions) {
                    setIsStressTestUnavailable(false);
                    setSubmitError('');
                    window.requestAnimationFrame(() => {
                      if (isMountedRef.current) {
                        fieldsetRefs.current[refreshedQuestions.questions[0]?.questionId]?.focus();
                      }
                    });
                  }
                }}
              >
                다시 시도
              </Button>
            </div>
          )}

          {!isStressTestForbidden && !isQuestionRefreshBlocked && !isStressTestUnavailable && questionsQuery.isLoading && (
            <SkeletonLoader rows={4} cols={1} />
          )}

          {!isStressTestForbidden && !isQuestionRefreshBlocked && !isStressTestUnavailable && !questionsQuery.isLoading && questionsQuery.isError && (
            <div ref={questionBlockRef} tabIndex={-1}>
              <p className="text-[12px] text-[#CF222E]" role="alert">
                {getStressQuestionsErrorMessage(questionsQuery.error)}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={async () => {
                  shouldFocusFirstQuestionRef.current = true;
                  await refreshStressTestQuestions();
                }}
              >
                다시 시도
              </Button>
            </div>
          )}

          {!isStressTestForbidden && !isQuestionRefreshBlocked && !isStressTestUnavailable && !questionsQuery.isLoading && !questionsQuery.isError && questionsData && (
            <div className="flex flex-col gap-5">
              <p className="text-[12px] text-[#656D76]">{questionsData.instruction}</p>
              <p aria-live="polite" className="text-[12px] font-semibold text-[#1F2328]">
                응답 {answeredCount} / {questionsData.questions.length}
              </p>

              {questionsData.questions.map((question) => (
                <fieldset
                  key={question.questionId}
                  ref={(el) => {
                    fieldsetRefs.current[question.questionId] = el;
                  }}
                  tabIndex={-1}
                  disabled={isSubmitting}
                  className="border border-[#E5E7EB] rounded-[8px] px-4 py-3"
                >
                  <legend className="px-1 text-[13px] font-semibold text-[#1F2328]">
                    {question.questionNo}. {question.questionText}
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {question.optionData.map((option) => {
                      const inputId = `stress-q${question.questionId}-v${option.value}`;
                      const isSelected = answers[question.questionId] === option.value;
                      return (
                        <label
                          key={option.value}
                          htmlFor={inputId}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-[6px] border px-3 py-1.5 text-[12px] ${isSelected ? 'border-[#0891B2] bg-[#F0FDFE] font-semibold text-[#0E7490]' : 'border-[#E5E7EB] text-[#444D56]'}`}
                        >
                          <input
                            type="radio"
                            id={inputId}
                            name={`stress-question-${question.questionId}`}
                            checked={isSelected}
                            onChange={() => handleSelect(question.questionId, option.value)}
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}

              {submitError && (
                <p className="text-[12px] text-[#CF222E]" role="alert">
                  {submitError}
                </p>
              )}

              <Button
                size="sm"
                loading={isSubmitting}
                disabled={isSubmitting}
                onClick={handleSubmit}
                style={{ background: ACCENT }}
                className="self-start"
              >
                제출하기
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 방금 제출한 결과 */}
      {latestResult && (
        <div className="bg-white rounded-[8px] border border-[#A5F3FC] shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-5 py-4">
          <h3
            ref={resultHeadingRef}
            tabIndex={-1}
            aria-live="polite"
            className="text-[13px] font-bold text-[#0E7490]"
          >
            검사 결과 · 총점 {latestResult.totalScore} / 33
          </h3>
          <p className="mt-1 text-[12px] font-semibold text-[#1F2328]">{latestResult.resultLevel}</p>
          <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-[#444D56]">
            {latestResult.resultDescription}
          </p>
          <p className="mt-2 text-[11px] text-[#9AA0A6]">{formatKstDateTime(latestResult.testedAt)}</p>
        </div>
      )}

      {/* 이전 결과 이력 */}
      <div>
        <p className="mb-2 text-[13px] font-bold text-[#1F2328]">이전 결과</p>

        {isResultsLoading && <SkeletonLoader rows={3} cols={1} />}

        {!isResultsLoading && isResultsForbidden && (
          <div
            ref={resultErrorRef}
            tabIndex={-1}
            role="alert"
            className="bg-white rounded-[8px] border border-[#FECACA] px-5 py-4"
          >
            <p className="text-[12px] text-[#CF222E]">검사 결과 이력을 조회할 권한이 없습니다.</p>
          </div>
        )}

        {!isResultsLoading && !isResultsForbidden && resultsQuery.isError && (
          <div
            ref={resultErrorRef}
            tabIndex={-1}
            role="alert"
            className="bg-white rounded-[8px] border border-[#FECACA] px-5 py-4"
          >
            <p className="text-[12px] text-[#CF222E]">{getStressResultsErrorMessage()}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => resultsQuery.refetch()}>
              다시 시도
            </Button>
          </div>
        )}

        {!isResultsLoading && !resultsQuery.isError && resultItems.length === 0 && (
          <EmptyState message="검사 결과 이력이 없습니다." />
        )}

        {!isResultsLoading && !resultsQuery.isError && resultItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {resultItems.map((item) => (
              <div
                key={item.resultId}
                className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="text-[12px] font-bold text-[#1F2328]">
                    총점 {item.totalScore} / 33 · {item.resultLevel}
                  </p>
                  <p className="mt-1 text-[11px] text-[#656D76]">{item.resultDescription}</p>
                </div>
                <p className="whitespace-nowrap text-[11px] text-[#9AA0A6]">
                  {formatKstDateTime(item.testedAt)}
                </p>
              </div>
            ))}
          </div>
        )}

        {!resultsQuery.isError && resultTotalPages > 1 && (
          <div
            className="mt-3 flex items-center justify-center gap-2"
            aria-busy={isResultsLoading}
          >
            <Button
              size="sm"
              variant="outline"
              disabled={resultsQuery.data?.first !== false}
              aria-disabled={isResultsLoading || resultsQuery.data?.first !== false}
              onClick={() => {
                if (isResultsLoading || resultsQuery.data?.first !== false) {
                  return;
                }
                setResultPage((prev) => Math.max(0, prev - 1));
              }}
            >
              이전
            </Button>
            <span className="text-[12px] text-[#656D76]">
              {isResultsLoading ? '조회 중...' : `${resultPage + 1} / ${resultTotalPages}`}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={resultsQuery.data?.last !== false}
              aria-disabled={isResultsLoading || resultsQuery.data?.last !== false}
              onClick={() => {
                if (isResultsLoading || resultsQuery.data?.last !== false) {
                  return;
                }
                setResultPage((prev) => prev + 1);
              }}
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {() => void} props.onApply
 */
export default function MyCounseling({ onApply }) {
  const [tab, setTab] = useState('reservation');

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '학생상담' }, { label: '내 상담' }]}
        title="내 상담"
        subtitle="예약 현황, 상담 이력, 심리검사 결과를 확인하세요."
        accentColor={ACCENT}
        actions={
          <Button size="sm" style={{ background: ACCENT }} onClick={onApply}>
            + 상담 신청
          </Button>
        }
      />

      <div className="mb-5">
        <Tabs
          tabs={[
            { key: 'reservation', label: '예약 현황' },
            { key: 'history', label: '상담 이력' },
            { key: 'psych', label: '심리검사' },
          ]}
          active={tab}
          onChange={setTab}
          accentColor={ACCENT}
        />
      </div>

      {tab === 'reservation' && <ReservationTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'psych' && <PsychTab />}
    </div>
  );
}
