import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, toast } from '@/components/common';
import {
  cancelCounselingReservation,
  changeCounselingReservationSchedule,
  fetchAvailableSchedules,
  fetchCounselingReservations,
  fetchCounselingTypes,
} from '@/api/counsel';
import {
  COUNSELING_CANCELLATION_REASON,
  COUNSELING_CANCELLATION_REASON_LABEL,
  COUNSELING_RESERVATION_ERROR_CODE,
  COUNSELING_RESERVATION_STATUS,
  COUNSELING_RESERVATION_STATUS_LABEL,
} from '@/constants/domain';
import { formatKstDateTime } from './myCounselingDate';

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

  // C002: 이 예약의 상담 유형이 없거나 비활성화됨. 같은 유형으로 다시 물어도 결과가
  // 똑같으므로 "다시 시도" 버튼을 보여주지 않고 변경 종료를 안내한다.
  if (error?.code === COUNSELING_RESERVATION_ERROR_CODE.RESOURCE_NOT_FOUND) {
    return '이 예약의 상담 유형이 더 이상 제공되지 않아 변경 가능한 일정을 조회할 수 없습니다. 변경을 종료하고 필요하면 취소 후 다시 신청해 주세요.';
  }

  return '변경 가능한 일정을 불러오지 못했습니다.';
};

// C002는 재조회해도 같은 결과가 나오는 오류이므로 재시도 버튼을 숨긴다.
const isAvailableSchedulesErrorRetryable = (error) =>
  error?.code !== COUNSELING_RESERVATION_ERROR_CODE.RESOURCE_NOT_FOUND;

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

export default function ReservationPanel() {
  const queryClient = useQueryClient();
  const cancelModalContentRef = useRef(null);
  const changeModalContentRef = useRef(null);
  const cancelReasonRef = useRef(null);
  const changeReasonRef = useRef(null);
  const cancelTriggerRef = useRef(null);
  const changeTriggerRef = useRef(null);
  const isMountedRef = useRef(true);
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
  const [latestReservationFetchStatus, setLatestReservationFetchStatus] = useState('idle');
  const [isScheduleConflict, setIsScheduleConflict] = useState(false);
  const rebaseButtonRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    // 예약·권한 오류를 전역 기본 재시도에 맡기지 않는다. 상태 변경이 아닌 조회라도
    // 상담 예약 데이터는 민감하고, 401·403·404를 재요청할 이유가 없다.
    retry: false,
    // 뒤로 가기로 돌아온 화면도 캐시만 보여 주지 않고 현재 서버 상태를 다시 읽는다.
    refetchOnMount: 'always',
  });
  const { data: counselingTypes = [], isError: hasCounselingTypesError } = useQuery({
    queryKey: ['counselingTypes'],
    queryFn: fetchCounselingTypes,
    retry: false,
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
    retry: false,
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
    setLatestReservationFetchStatus('idle');
    setIsScheduleConflict(false);
  }, []);
  const restoreFocus = useCallback((triggerRef) => {
    if (!isMountedRef.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (isMountedRef.current && triggerRef.current?.isConnected) {
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
    if (!isMountedRef.current) {
      return;
    }

    setLatestReservationFetchStatus('loading');
    setScheduleConflictReservation(null);

    try {
      const [reservationResult] = await Promise.all([
        refetchReservations(),
        queryClient.invalidateQueries({ queryKey: ['availableSchedules'] }),
      ]);

      if (!isMountedRef.current) {
        return;
      }

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
      if (!isMountedRef.current) {
        return;
      }

      setChangeError('최신 예약 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
      setLatestReservationFetchStatus('error');
    }
  };
  const cancelMutation = useMutation({
    mutationFn: async ({ reservationId, cancellationReason }) => ({
      reservation: await cancelCounselingReservation(reservationId, { cancellationReason }),
    }),
    // cancellationReason은 학생이 적은 취소 사유(민감 원문)라 완료 뒤 mutation cache에 남기지
    // 않는다. gcTime: 0 + 아래 onSettled의 reset()으로 요청이 끝나는 즉시 정리한다.
    gcTime: 0,
    onSuccess: async ({ reservation }) => {
      await refreshReservationData();

      if (!isMountedRef.current) {
        return;
      }

      if (reservation.reservationStatus !== COUNSELING_RESERVATION_STATUS.CANCELED) {
        setCancelError('서버 응답이 예상과 달라 최신 상태를 확인해 주세요.');
        return;
      }

      resetCancelModal();
      restoreFocus(cancelTriggerRef);
      toast('예약이 취소되었습니다.', 'success');
    },
    onError: async (error) => {
      if (!isMountedRef.current) {
        return;
      }

      const message = getReservationMutationErrorMessage(error, 'cancel');

      setCancelError(message);
      await refreshReservationData();
      if (!isMountedRef.current) {
        return;
      }
      if (error?.code === COUNSELING_RESERVATION_ERROR_CODE.RESERVATION_NOT_FOUND) {
        resetCancelModal();
        restoreFocus(cancelTriggerRef);
        toast(message, 'error');
      }
    },
    // onSuccess/onError 모두 화면 처리(캐시 무효화·토스트·모달 정리)를 마친 뒤에만
    // onSettled가 실행되므로, 여기서 reset()을 호출해도 처리 중인 화면 갱신을 놓치지 않는다.
    onSettled: () => {
      cancelMutation.reset();
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
    // reason(일정 변경 사유)도 민감 원문이므로 동일하게 로컬 수명주기를 제한한다.
    gcTime: 0,
    onSuccess: async ({ reservation, scheduleId }) => {
      await refreshReservationData();

      if (!isMountedRef.current) {
        return;
      }

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
      if (!isMountedRef.current) {
        return;
      }

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
        await reloadLatestReservation(variables.reservationId);
        return;
      }

      const message = getReservationMutationErrorMessage(error, 'change');

      setChangeError(message);
      await refreshReservationData();
      if (!isMountedRef.current) {
        return;
      }
      if (error?.code === COUNSELING_RESERVATION_ERROR_CODE.RESERVATION_NOT_FOUND) {
        resetChangeModal();
        restoreFocus(changeTriggerRef);
        toast(message, 'error');
      }
    },
    // S013 stale 충돌 분기는 reloadLatestReservation까지 기다린 뒤 return하므로, 그 비동기
    // 작업이 모두 끝난 다음에만 onSettled가 실행되어 reason 입력 보존이 끝난 뒤 정리된다.
    onSettled: () => {
      changeMutation.reset();
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

    // expectedScheduleId는 모달을 연 시점에 조회한 예약의 현재 일정 ID다. 일정 변경 API는
    // 양의 정수만 받으며, 레거시 CENTER 예약은 일정 ID가 null일 수 있으므로 요청 자체를 막는다.
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
      changeModal?.reservationId === undefined
    ) {
      return;
    }

    void reloadLatestReservation(changeModal.reservationId);
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
      scheduleConflictReservation.reservationStatus !== COUNSELING_RESERVATION_STATUS.REQUESTED ||
      !Number.isInteger(scheduleConflictReservation.counselingScheduleId) ||
      scheduleConflictReservation.counselingScheduleId < 1
    ) {
      resetChangeModal();
      restoreFocus(changeTriggerRef);
      return;
    }

    // changeReason은 사용자가 입력한 값을 그대로 유지하고, 기준 일정과 일정 선택만 갱신한다.
    setChangeModal(scheduleConflictReservation);
    setScheduleConflictReservation(null);
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
                  reservation.reservationStatus === COUNSELING_RESERVATION_STATUS.REQUESTED &&
                  Number.isInteger(reservation.counselingScheduleId) &&
                  reservation.counselingScheduleId > 0;

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
                  {isAvailableSchedulesErrorRetryable(availableSchedulesError) && (
                    <button
                      type="button"
                      disabled={changeMutation.isPending}
                      onClick={refetchAvailableSchedules}
                      className="mt-2 font-bold underline disabled:text-[#9AA0A6]"
                    >
                      다시 시도
                    </button>
                  )}
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
