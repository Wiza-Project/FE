import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, Tabs, Button, Modal, Drawer, StatusBadge, toast } from '@/components/common';
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

const ACCENT = '#0891B2';

// ─── History records ──────────────────────────────────────────────────────────

const HISTORY = [
  {
    id: 'H001',
    date: '2026-06-15',
    type: '지도교수 진로·역량 상담',
    counselor: '김상담 지도교수',
    status: '완료',
    publicSummary:
      '졸업 후 진로 방향 탐색 및 부족한 역량 강화 방안 논의. 취업 또는 대학원 진학 두 경로를 구체적으로 비교·분석하고 단기 목표를 수립하였음.',
    actionPlan: [
      '이번 학기 내 TOEIC 860점 이상 취득 목표 수립',
      '9월 캡스톤디자인 경진대회 참가 신청',
      '취업 포트폴리오 초안 작성 (10월 말까지)',
      '대학원 지도교수 1:1 상담 신청 예약',
    ],
    recommendedPrograms: [
      { name: '진로탐색 워크숍', dept: '취업지원팀', credit: 3, deadline: '2026-08-31' },
      { name: '영어 프레젠테이션 클리닉', dept: '국제교류처', credit: 2, deadline: '2026-09-15' },
    ],
  },
  {
    id: 'H002',
    date: '2026-05-20',
    type: '심리검사 · 해석상담',
    counselor: '박심리 전문상담사',
    status: '종결',
    publicSummary:
      'MBTI 및 MMPI-2 검사 실시 후 해석상담 진행. 성격 특성 및 현재 심리 상태 파악, 스트레스 관리 전략 수립에 집중하였음.',
    actionPlan: [
      '매일 15분 마음챙김 명상 실천',
      '수면 규칙화 — 오전 1시 전 취침 목표',
      '상담센터 집단상담 프로그램 참여 권고',
    ],
    recommendedPrograms: [
      { name: '마음건강 집단상담', dept: '학생상담센터', credit: 0, deadline: '2026-09-01' },
      { name: '스트레스 관리 특강', dept: '학생처', credit: 1, deadline: '2026-08-20' },
    ],
  },
];

// ─── Psych tests ──────────────────────────────────────────────────────────────

const PSYCH_TESTS = [
  {
    id: 'PT001',
    name: 'MBTI',
    appliedAt: '2026-08-10',
    status: '코드발송',
    deadline: '2026-08-17',
    isExpired: false,
  },
  {
    id: 'PT002',
    name: 'MMPI-2',
    appliedAt: '2026-07-25',
    status: '응시중',
    deadline: '2026-08-01',
    isExpired: false,
  },
  {
    id: 'PT003',
    name: 'Holland 진로탐색검사',
    appliedAt: '2026-06-01',
    status: '결과처리중',
    deadline: '2026-06-08',
    isExpired: false,
  },
  {
    id: 'PT004',
    name: 'Strong 직업흥미검사',
    appliedAt: '2026-05-10',
    status: '해석예약가능',
    deadline: '2026-05-17',
    isExpired: false,
  },
  {
    id: 'PT005',
    name: 'MBTI',
    appliedAt: '2026-03-15',
    status: '완료',
    deadline: '2026-03-22',
    isExpired: false,
  },
  {
    id: 'PT006',
    name: 'TCI 기질·성격검사',
    appliedAt: '2026-02-20',
    status: '만료',
    deadline: '2026-02-27',
    isExpired: true,
  },
];

const PSYCH_STATUS_STYLES = {
  코드발송: 'bg-[#DBEAFE] text-[#0969DA]',
  응시중: 'bg-[#DBEAFE] text-[#0969DA]',
  결과처리중: 'bg-[#FEF3C7] text-[#D97706]',
  해석예약가능: 'bg-[#DCFCE7] text-[#1A7F37]',
  완료: 'bg-[#F3F4F6] text-[#6E7781]',
  만료: 'bg-[#F3F4F6] text-[#9AA0A6]',
};

const PSYCH_STATUS_DESC = {
  코드발송: '검사 코드가 이메일로 발송되었습니다. 기한 내 응시하세요.',
  응시중: '검사를 진행 중입니다. 제출기한을 확인하세요.',
  결과처리중: '응시가 완료되어 결과를 처리 중입니다.',
  해석예약가능: '결과 처리가 완료되었습니다. 해석상담을 예약하세요.',
  완료: '해석상담이 완료되었습니다.',
  만료: '제출기한이 경과하여 만료되었습니다. 재신청이 필요합니다.',
};

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

  return `${new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)} KST`;
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

function ReservationTab({ onApply }) {
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
    mutationFn: async ({ reservationId, scheduleId, reason }) => ({
      reservation: await changeCounselingReservationSchedule(reservationId, {
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
    onError: async (error) => {
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
    setChangeModal(reservation);
  };
  const closeCancelModal = useCallback(() => {
    if (!cancelMutation.isPending) {
      resetCancelModal();
      restoreFocus(cancelTriggerRef);
    }
  }, [cancelMutation.isPending, resetCancelModal, restoreFocus]);
  const closeChangeModal = useCallback(() => {
    if (!changeMutation.isPending) {
      resetChangeModal();
      restoreFocus(changeTriggerRef);
    }
  }, [changeMutation.isPending, resetChangeModal, restoreFocus]);

  useEffect(() => {
    if (!cancelModal) {
      return undefined;
    }

    const modalElement = cancelModalContentRef.current?.closest('.fixed');
    const onKeyDown = (event) =>
      handleModalKeyDown(event, modalElement, cancelMutation.isPending, closeCancelModal);

    cancelReasonRef.current?.focus();
    modalElement?.addEventListener('keydown', onKeyDown);
    return () => modalElement?.removeEventListener('keydown', onKeyDown);
  }, [cancelModal, cancelMutation.isPending, closeCancelModal]);

  useEffect(() => {
    if (!changeModal) {
      return undefined;
    }

    const modalElement = changeModalContentRef.current?.closest('.fixed');
    const onKeyDown = (event) =>
      handleModalKeyDown(event, modalElement, changeMutation.isPending, closeChangeModal);

    changeReasonRef.current?.focus();
    modalElement?.addEventListener('keydown', onKeyDown);
    return () => modalElement?.removeEventListener('keydown', onKeyDown);
  }, [changeModal, changeMutation.isPending, closeChangeModal]);

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

    if (!changeModal || changeMutation.isPending) {
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
      scheduleId,
      reason: changeReason.trim(),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#9AA0A6]">
          {reservationPage ? `총 ${totalReservations}건` : '예약 현황'}
          {totalReservations > RESERVATION_PAGE_SIZE && ` · 최근 ${RESERVATION_PAGE_SIZE}건 표시`}
        </p>
        <Button size="sm" style={{ background: ACCENT }} onClick={onApply}>
          + 상담 신청
        </Button>
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
              {['예약번호', '상담유형', '일정 ID', '신청일', '상태', '관리'].map((header) => (
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
                    <td className="px-3 py-3 text-center font-mono text-[#656D76]">
                      {reservation.counselingScheduleId ?? '미배정'}
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
              disabled={changeMutation.isPending}
              onClick={closeChangeModal}
            >
              닫기
            </Button>
            <Button size="sm" loading={changeMutation.isPending} onClick={handleChange}>
              변경 확정
            </Button>
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
                        className={`block cursor-pointer rounded-[6px] border p-3 transition-colors ${isSelected ? 'border-[#0891B2] bg-[#F0FDFE]' : 'border-[#E5E7EB] hover:border-[#67E8F9]'} ${changeMutation.isPending ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <input
                          type="radio"
                          name="change-schedule"
                          value={schedule.scheduleId}
                          checked={isSelected}
                          disabled={changeMutation.isPending}
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
  const [drawerRecord, setDrawerRecord] = useState(null);

  return (
    <div>
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <table className="w-full border-collapse text-[12px]">
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
            {HISTORY.map((h, i) => (
              <tr
                key={h.id}
                className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#F0FDFE] transition-colors ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
              >
                <td className="px-4 py-3 text-center text-[#9AA0A6] font-mono whitespace-nowrap">
                  {h.date}
                </td>
                <td className="px-4 py-3 font-semibold text-[#1F2328]">{h.type}</td>
                <td className="px-4 py-3 text-[#656D76]">{h.counselor}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={h.status} size="sm" />
                </td>
                <td className="px-4 py-3 max-w-[260px]">
                  <p className="text-[12px] text-[#656D76] leading-snug line-clamp-2">
                    {h.publicSummary}
                  </p>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setDrawerRecord(h)}
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

      {/* Detail Drawer */}
      <Drawer
        open={drawerRecord !== null}
        onClose={() => setDrawerRecord(null)}
        title="상담 이력 상세"
        footer={
          <Button size="sm" variant="secondary" onClick={() => setDrawerRecord(null)}>
            닫기
          </Button>
        }
      >
        {drawerRecord && (
          <div className="flex flex-col gap-5 py-2">
            {/* Meta */}
            <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[8px] px-4 py-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#0E7490]">{drawerRecord.type}</span>
                <StatusBadge status={drawerRecord.status} size="sm" />
              </div>
              <div className="flex gap-3 text-[12px] text-[#0891B2]">
                <span>📅 {drawerRecord.date}</span>
                <span>👤 {drawerRecord.counselor}</span>
              </div>
            </div>

            {/* Public summary */}
            <div>
              <h3 className="text-[13px] font-bold text-[#1F2328] mb-2 flex items-center gap-1.5">
                <div className="w-1 h-3.5 rounded-full" style={{ background: ACCENT }} />
                공개 요약
              </h3>
              <p className="text-[13px] text-[#444D56] leading-relaxed bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] px-4 py-3">
                {drawerRecord.publicSummary}
              </p>
            </div>

            {/* Action plan */}
            <div>
              <h3 className="text-[13px] font-bold text-[#1F2328] mb-2 flex items-center gap-1.5">
                <div className="w-1 h-3.5 rounded-full bg-[#7C3AED]" />
                실행계획
              </h3>
              <div className="bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] px-4 py-3">
                <ol className="flex flex-col gap-2">
                  {drawerRecord.actionPlan.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-[13px] text-[#1F2328]">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 mt-0.5"
                        style={{ background: ACCENT }}
                      >
                        {idx + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Recommended programs */}
            <div>
              <h3 className="text-[13px] font-bold text-[#1F2328] mb-2 flex items-center gap-1.5">
                <div className="w-1 h-3.5 rounded-full bg-[#2563EB]" />
                추천 비교과 프로그램
              </h3>
              <div className="flex flex-col gap-2">
                {drawerRecord.recommendedPrograms.map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-[#1F2328]">{p.name}</p>
                      <div className="flex gap-2 mt-0.5 text-[11px] text-[#9AA0A6]">
                        <span>{p.dept}</span>
                        {p.credit > 0 && <span>· {p.credit}학점</span>}
                        <span>· 마감 {p.deadline}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toast(`${p.name} 신청 화면으로 이동합니다.`, 'info')}
                      className="h-7 px-3 text-[11px] font-bold rounded-[6px] text-white whitespace-nowrap"
                      style={{ background: '#2563EB' }}
                    >
                      신청
                    </button>
                  </div>
                ))}
              </div>
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
        )}
      </Drawer>
    </div>
  );
}

// ─── Tab: 심리검사 ────────────────────────────────────────────────────────────

function PsychTab() {
  return (
    <div className="flex flex-col gap-4">
      {/* Info banner */}
      <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[8px] px-5 py-3 flex items-start gap-3">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill={ACCENT}
          className="flex-shrink-0 mt-0.5"
        >
          <circle cx="8" cy="8" r="7" />
          <path d="M8 4v5M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-[12px] text-[#164E63]">
          해석상담 예약은 결과 처리 완료 후 활성화됩니다. 처리 기간은 응시 후 약 3~5 영업일
          소요됩니다.
        </p>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['검사명', '신청일', '상태', '제출기한', '안내', '관리'].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${['검사명', '안내'].includes(h) ? 'text-left' : 'text-center'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PSYCH_TESTS.map((t, i) => {
              const canBook = t.status === '해석예약가능';
              const expired = t.isExpired || t.status === '만료';
              return (
                <tr
                  key={t.id}
                  className={`border-b border-[#F3F4F6] last:border-0 ${expired ? 'opacity-60' : ''} ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                >
                  <td className="px-4 py-3 font-bold text-[#1F2328]">{t.name}</td>
                  <td className="px-4 py-3 text-center text-[#9AA0A6] font-mono">{t.appliedAt}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${PSYCH_STATUS_STYLES[t.status]}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-mono text-[12px] ${expired ? 'text-[#CF222E] line-through' : 'text-[#656D76]'}`}
                    >
                      {t.deadline}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-[11px] text-[#9AA0A6] leading-snug">
                      {PSYCH_STATUS_DESC[t.status]}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {expired ? (
                      <button
                        onClick={() => toast('재신청 화면으로 이동합니다.', 'info')}
                        className="h-6 px-2.5 text-[11px] font-bold rounded-[5px] border border-[#E5E7EB] text-[#656D76] hover:border-[#0891B2] hover:text-[#0891B2] transition-colors"
                      >
                        재신청
                      </button>
                    ) : t.status === '완료' ? (
                      <span className="text-[11px] text-[#C8D0D9]">—</span>
                    ) : (
                      <div className="relative inline-block group">
                        <button
                          disabled={!canBook}
                          onClick={() =>
                            canBook && toast('해석상담 예약 화면으로 이동합니다.', 'info')
                          }
                          className={`h-6 px-2.5 text-[11px] font-bold rounded-[5px] border transition-colors ${canBook ? 'text-white border-transparent' : 'border-[#E5E7EB] text-[#C8D0D9] cursor-not-allowed'}`}
                          style={canBook ? { background: ACCENT } : {}}
                        >
                          해석상담 예약
                        </button>
                        {!canBook && (
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#1F2328] text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-[6px] whitespace-nowrap z-10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            결과 처리 후 예약할 수 있습니다.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1F2328]" />
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

      {tab === 'reservation' && <ReservationTab onApply={onApply} />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'psych' && <PsychTab />}
    </div>
  );
}
