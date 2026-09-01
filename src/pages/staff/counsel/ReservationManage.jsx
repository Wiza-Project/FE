import { useState, useEffect, useMemo, useRef } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, InfoField, Modal, Pagination, StatusBadge, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  approveCounselingReservation,
  createCounselorProxyReservation,
  fetchCounselorCounselingTypes,
  fetchCounselorReservationDetail,
  fetchCounselorSchedules,
  fetchCounselorStudentByUniversityNo,
  fetchPendingCounselorReservations,
  pendingReservationsQueryKey,
  rejectCounselingReservation,
} from '@/api/counsel';
import {
  COUNSELING_RESERVATION_ERROR_CODE,
  COUNSELING_RESERVATION_STATUS_LABEL,
} from '@/constants/domain';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)
const PAGE_SIZE = 20;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
// MySchedule.jsx와 정확히 같은 배열 형태를 써야 두 화면이 같은 캐시를 공유한다(키를 바꾸지 않는다).
const SCHEDULE_QUERY_KEY = ['counselorSchedules'];
const TYPE_QUERY_KEY = ['counselorCounselingTypes'];

function formatKstDateTime(instant) {
  if (!instant) return '-';
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '-';
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}

/** 서버가 준 재조회 필요 여부까지 함께 판단해 문구를 만든다(재조회는 호출부에서 처리). */
function getErrorMessage(error) {
  if (!(error instanceof ApiError))
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  const { code } = error;
  if (code === COUNSELING_RESERVATION_ERROR_CODE.ALREADY_PROCESSED)
    return '다른 곳에서 이미 처리된 예약입니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_RESERVATION_ERROR_CODE.RESERVATION_NOT_FOUND)
    return '해당 예약을 찾을 수 없습니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN)
    return '이 예약에 대한 권한이 변경되었습니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_RESERVATION_ERROR_CODE.SCHEDULE_NOT_AVAILABLE)
    return '일정 시작 시각이 이미 지나 승인할 수 없습니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_RESERVATION_ERROR_CODE.INVALID_INPUT)
    return error.message || '입력값을 다시 확인해 주세요.';
  return error.message || '처리 중 오류가 발생했습니다.';
}

// 재조회로 목록에서 사라져야 하는(=서버-클라 상태 불일치) 오류인지 구분한다.
const STALE_STATE_CODES = new Set([
  COUNSELING_RESERVATION_ERROR_CODE.ALREADY_PROCESSED,
  COUNSELING_RESERVATION_ERROR_CODE.RESERVATION_NOT_FOUND,
  COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN,
  COUNSELING_RESERVATION_ERROR_CODE.SCHEDULE_NOT_AVAILABLE,
]);

export default function ReservationManage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [detailReservationId, setDetailReservationId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  // useMutation의 variables는 훅당 하나뿐이라 여러 행을 동시에 승인하면 마지막 클릭 건으로 덮어써진다.
  // 행별로 정확히 비활성화하려고 진행 중인 예약 ID를 별도 Set으로 관리한다.
  const [approvingIds, setApprovingIds] = useState(() => new Set());

  // --- 상담사 대행 예약 모달 상태 ---
  // 학생 식별정보·신청 내용은 이 컴포넌트 로컬 state에만 두고 Query 캐시·Zustand·브라우저
  // 저장소에는 절대 넣지 않는다(모달을 닫으면 closeProxyModal 하나가 전부 비운다).
  const [proxyModalOpen, setProxyModalOpen] = useState(false);
  // 모달을 열고 닫거나 학번을 바꿀 때마다 값을 올려서, 이미 지나간 세션에서 시작한 조회
  // 응답이 나중에 도착해도 "지금 세션 번호와 다르면" 무시하게 만든다.
  const proxySessionRef = useRef(0);
  const [universityNo, setUniversityNo] = useState('');
  const [universityNoError, setUniversityNoError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [requestContent, setRequestContent] = useState('');
  const [contentError, setContentError] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    // 컴포넌트가 언마운트되면(라우트 이동 등) 진행 중이던 조회 응답도 늦은 응답으로 취급한다.
    return () => {
      proxySessionRef.current += 1;
    };
  }, []);

  const {
    data: proxyTypes = [],
    isLoading: proxyTypesLoading,
    isError: proxyTypesError,
  } = useQuery({
    queryKey: TYPE_QUERY_KEY,
    queryFn: fetchCounselorCounselingTypes,
    enabled: proxyModalOpen,
  });

  const {
    data: proxySchedules = [],
    isLoading: proxySchedulesLoading,
    isError: proxySchedulesError,
  } = useQuery({
    queryKey: SCHEDULE_QUERY_KEY,
    queryFn: fetchCounselorSchedules,
    enabled: proxyModalOpen,
  });

  // 일정 select에 유형 이름을 붙이는 조회용 맵이다. 서버가 counselingTypeId만 주므로
  // 화면에서 별도 상담 유형 선택 필드를 만들지 않고 이 맵으로만 표시한다.
  const proxyTypeNameById = useMemo(() => {
    const map = new Map();
    proxyTypes.forEach((type) => map.set(type.counselingTypeId, type.typeName));
    return map;
  }, [proxyTypes]);

  // 원본 일정 목록을 변형하지 않고, 지금 대행 예약이 가능한 일정만 뽑아 정렬한 파생 배열이다.
  // 서버가 최종 검증하므로 이 필터는 사용자 안내용이다.
  const availableSchedules = useMemo(() => {
    const now = Date.now();
    return proxySchedules
      .filter((schedule) => {
        if (schedule.status !== 'OPEN') return false;
        const startsAtMs = new Date(schedule.startsAt).getTime();
        if (Number.isNaN(startsAtMs) || startsAtMs <= now) return false;
        if (schedule.bookingDeadline) {
          const deadlineMs = new Date(schedule.bookingDeadline).getTime();
          // 마감 시각을 해석할 수 없으면 예약 가능하다고 잘못 안내하지 않도록 보수적으로 제외한다.
          if (Number.isNaN(deadlineMs) || deadlineMs <= now) return false;
        }
        return (schedule.remainingCapacity ?? 0) > 0;
      })
      .sort((a, b) => {
        const diff = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
        return diff !== 0 ? diff : a.scheduleId - b.scheduleId;
      });
  }, [proxySchedules]);

  const lookupMutation = useMutation({ mutationFn: fetchCounselorStudentByUniversityNo });
  const createProxyMutation = useMutation({ mutationFn: createCounselorProxyReservation });

  const closeProxyModal = () => {
    // 예약 생성 중에는 닫기를 막는다. 승인·배정·1회기가 만들어지는 도중에 모달을 닫으면
    // 사용자가 결과를 확인하지 못한 채 화면을 떠나게 된다.
    if (createProxyMutation.isPending) return;
    proxySessionRef.current += 1;
    setProxyModalOpen(false);
    setUniversityNo('');
    setUniversityNoError('');
    setSelectedStudent(null);
    setSelectedScheduleId('');
    setScheduleError('');
    setRequestContent('');
    setContentError('');
    setSubmitError('');
    lookupMutation.reset();
    // 공용 Button은 forwardRef가 아니라 ref로 DOM에 닿지 않는다. id로 찾아 포커스를 돌리고,
    // 버튼이 화면에서 사라졌으면(라우트 이동 등) 아무 것도 하지 않는다.
    document.getElementById('proxyOpenButton')?.focus();
  };

  const openProxyModal = () => setProxyModalOpen(true);

  const handleUniversityNoChange = (value) => {
    setUniversityNo(value);
    // 학번이 바뀌면 이전 조회로 찾은 학생과 그 오류만 지운다. 오래된 학생 정보로 다른
    // 학번의 예약이 잘못 제출되지 않게 하기 위함이다. 진행 중인 조회 응답도 무효화한다.
    setSelectedStudent(null);
    setUniversityNoError('');
    proxySessionRef.current += 1;
  };

  const handleLookupSubmit = (event) => {
    event.preventDefault();
    if (lookupMutation.isPending) return;
    const trimmed = universityNo.trim();
    if (!trimmed) {
      setUniversityNoError('학번을 입력해 주세요.');
      return;
    }
    if (trimmed.length > 30) {
      setUniversityNoError('학번은 30자 이하여야 합니다.');
      return;
    }
    setUniversityNoError('');
    const session = proxySessionRef.current;
    lookupMutation.mutate(trimmed, {
      onSuccess: (student) => {
        if (proxySessionRef.current !== session) return; // 이미 닫혔거나 학번이 바뀐 뒤 온 응답
        setSelectedStudent(student);
      },
      onError: (mutationError) => {
        if (proxySessionRef.current !== session) return;
        if (!(mutationError instanceof ApiError)) {
          setUniversityNoError('네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.');
          return;
        }
        if (mutationError.code === COUNSELING_RESERVATION_ERROR_CODE.USER_NOT_FOUND) {
          setUniversityNoError('학생을 찾을 수 없습니다.');
          return;
        }
        if (mutationError.code === COUNSELING_RESERVATION_ERROR_CODE.INVALID_INPUT) {
          setUniversityNoError('학번 형식을 다시 확인해 주세요.');
          return;
        }
        if (mutationError.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN) {
          closeProxyModal();
          toast('권한이 변경되어 대행 예약을 진행할 수 없습니다.', 'error');
          return;
        }
        setUniversityNoError('조회 중 오류가 발생했습니다. 다시 시도해 주세요.');
      },
    });
  };

  const handleProxyCreateSubmit = (event) => {
    event.preventDefault();
    if (createProxyMutation.isPending) return;
    setSubmitError(''); // 새 제출을 시작하면 이전 제출 오류만 지운다
    if (!selectedStudent) {
      setUniversityNoError('먼저 학번으로 학생을 조회해 주세요.');
      return;
    }
    if (!selectedScheduleId) {
      setScheduleError('예약할 일정을 선택해 주세요.');
      return;
    }
    const schedule = availableSchedules.find(
      (item) => String(item.scheduleId) === String(selectedScheduleId),
    );
    if (!schedule) {
      // 선택 이후 목록이 갱신되며 사라진 일정이다(마감·정원 소진 등). 다시 고르게 한다.
      setSelectedScheduleId('');
      setScheduleError('선택한 일정을 더 이상 사용할 수 없습니다. 목록에서 다시 선택해 주세요.');
      return;
    }
    setScheduleError('');
    const trimmedContent = requestContent.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 3000) {
      setContentError('신청 내용은 공백을 제외하고 1~3,000자여야 합니다.');
      return;
    }
    setContentError('');
    createProxyMutation.mutate(
      {
        studentId: selectedStudent.studentId,
        counselingTypeId: schedule.counselingTypeId,
        scheduleId: schedule.scheduleId,
        requestContent: trimmedContent,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: ['counselingSessions'] });
          closeProxyModal();
          toast('예약을 확정하고 담당 상담사로 배정했습니다.', 'success');
        },
        onError: (mutationError) => {
          if (!(mutationError instanceof ApiError)) {
            setSubmitError('네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.');
            return;
          }
          const { code } = mutationError;
          if (code === COUNSELING_RESERVATION_ERROR_CODE.REQUIRED_CONSENT_NOT_AGREED) {
            setSubmitError('학생이 현재 상담 개인정보 동의를 완료해야 예약할 수 있습니다.');
            return;
          }
          if (code === COUNSELING_RESERVATION_ERROR_CODE.SCHEDULE_NOT_AVAILABLE) {
            setSelectedScheduleId('');
            queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
            setScheduleError('선택한 일정을 더 이상 사용할 수 없습니다. 목록을 새로고침했습니다. 다른 일정을 선택해 주세요.');
            return;
          }
          if (code === COUNSELING_RESERVATION_ERROR_CODE.RESOURCE_NOT_FOUND) {
            setSelectedScheduleId('');
            queryClient.invalidateQueries({ queryKey: TYPE_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
            setScheduleError('선택한 상담 유형이 더 이상 제공되지 않습니다. 목록을 새로고침했습니다. 다시 선택해 주세요.');
            return;
          }
          if (code === COUNSELING_RESERVATION_ERROR_CODE.USER_NOT_FOUND) {
            setSelectedStudent(null);
            setUniversityNoError('학생을 찾을 수 없습니다. 학번을 다시 조회해 주세요.');
            return;
          }
          if (code === COUNSELING_RESERVATION_ERROR_CODE.INVALID_INPUT) {
            setContentError('신청 내용은 공백을 제외하고 1~3,000자여야 합니다.');
            return;
          }
          if (code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN) {
            closeProxyModal();
            toast('권한이 변경되어 대행 예약을 진행할 수 없습니다.', 'error');
            return;
          }
          setSubmitError(mutationError.message || '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const {
    data: pendingPage,
    isLoading,
    isError,
    error,
    isPlaceholderData,
  } = useQuery({
    queryKey: pendingReservationsQueryKey(page),
    queryFn: () => fetchPendingCounselorReservations({ page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailIsError,
  } = useQuery({
    queryKey: ['counselorReservationDetail', detailReservationId],
    queryFn: () => fetchCounselorReservationDetail(detailReservationId),
    enabled: detailReservationId !== null,
  });

  const invalidatePending = () =>
    queryClient.invalidateQueries({ queryKey: ['counselorPendingReservations'] });

  const approveMutation = useMutation({
    mutationFn: approveCounselingReservation,
    onSuccess: () => {
      invalidatePending();
      toast('예약을 승인했습니다. 담당 상담사로 배정되었습니다.', 'success');
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiError && STALE_STATE_CODES.has(mutationError.code))
        invalidatePending();
      toast(getErrorMessage(mutationError), 'error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ reservationId, request }) => rejectCounselingReservation(reservationId, request),
    onSuccess: () => {
      invalidatePending();
      setRejectTarget(null);
      setDecisionReason('');
      setRejectError('');
      toast('반려 처리되었습니다. 학생에게 사유가 공개됩니다.', 'info');
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiError && STALE_STATE_CODES.has(mutationError.code)) {
        invalidatePending();
        setRejectTarget(null);
        toast(getErrorMessage(mutationError), 'error');
        return;
      }
      setRejectError(getErrorMessage(mutationError));
    },
  });

  const handleApprove = (reservationId) => {
    setApprovingIds((prev) => new Set(prev).add(reservationId));
    approveMutation.mutate(reservationId, {
      onSettled: () => {
        setApprovingIds((prev) => {
          const next = new Set(prev);
          next.delete(reservationId);
          return next;
        });
      },
    });
  };

  const closeDetail = () => {
    setDetailReservationId(null);
    // 상담 신청 원문을 캐시에 남겨두지 않는다.
    queryClient.removeQueries({ queryKey: ['counselorReservationDetail', detailReservationId] });
  };

  const openReject = (reservation) => {
    setRejectTarget(reservation);
    setDecisionReason('');
    setRejectError('');
  };

  const handleRejectSubmit = () => {
    if (!decisionReason.trim()) {
      setRejectError('반려 사유를 입력해 주세요.');
      return;
    }
    if (!rejectTarget) return;
    rejectMutation.mutate({
      reservationId: rejectTarget.reservationId,
      request: { decisionReason: decisionReason.trim() },
    });
  };

  const content = pendingPage?.content ?? [];
  const totalElements = pendingPage?.totalElements ?? 0;
  const totalPages = pendingPage?.totalPages ?? 0;

  useEffect(() => {
    // 승인·반려로 목록이 줄어 현재 페이지가 범위를 벗어나면 마지막 유효 페이지로 보정한다.
    // 보정하지 않으면 백엔드가 범위 밖 페이지에 빈 목록을 돌려줘 앞 페이지에 예약이 남아도
    // "대기 없음"으로 오인된다. 이전 페이지를 표시 중일 때는 그 응답으로 보정하지 않는다.
    if (isPlaceholderData || isError || !pendingPage) return;
    if (totalPages === 0 && page !== 0) {
      setPage(0);
      return;
    }
    if (totalPages > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [isError, isPlaceholderData, pendingPage, totalPages, page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">예약 관리</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            대기 중인 예약을 확인하고 승인·반려 처리하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && !isError && (
            <span
              className="text-[12px] font-bold px-3 py-1 rounded-full bg-[#F3F4F6]"
              style={{ color: ACCENT }}
            >
              대기 {totalElements}건
            </span>
          )}
          <Button id="proxyOpenButton" size="sm" style={{ background: ACCENT }} onClick={openProxyModal}>
            대행 예약
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <span className="text-[13px] font-bold text-[#1F2328]">승인 대기 목록</span>
        </div>

        {isLoading ? (
          <p className="p-6 text-center text-[12px] text-[#656D76]">목록을 불러오는 중입니다.</p>
        ) : isError ? (
          <p className="p-4 text-[12px] text-[#CF222E]" role="alert">
            {getErrorMessage(error)}
          </p>
        ) : content.length === 0 ? (
          <p className="p-6 text-center text-[12px] text-[#656D76]">대기 중인 예약이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {['예약번호', '상담유형', '학생 ID', '상담 일정', '신청일시', '상태', '처리'].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 6 ? 'text-center' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {content.map((r) => {
                  const isApproving = approvingIds.has(r.reservationId);
                  const isRowBusy = isApproving || (rejectMutation.isPending && rejectTarget?.reservationId === r.reservationId);
                  return (
                    <tr
                      key={r.reservationId}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-[11px]" style={{ color: ACCENT }}>
                        {r.reservationId}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6]"
                          style={{ color: ACCENT }}
                        >
                          {r.counselingTypeName}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                        {r.studentId}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#444D56] whitespace-nowrap">
                        {formatKstDateTime(r.startsAt)} ~ {formatKstDateTime(r.endsAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] whitespace-nowrap">
                        {formatKstDateTime(r.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={COUNSELING_RESERVATION_STATUS_LABEL[r.reservationStatus]} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-center">
                          <button
                            onClick={() => setDetailReservationId(r.reservationId)}
                            className="h-6 px-2 text-[9px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB] transition-colors"
                          >
                            신청내용
                          </button>
                          <button
                            onClick={() => handleApprove(r.reservationId)}
                            disabled={isRowBusy}
                            className="h-6 px-2 text-[10px] font-bold rounded-[4px] bg-[#D1FAE5] text-[#059669] hover:bg-[#A7F3D0] disabled:opacity-50 transition-colors"
                          >
                            {isApproving ? '승인 중…' : '승인'}
                          </button>
                          <button
                            onClick={() => openReject(r)}
                            disabled={isRowBusy}
                            className="h-6 px-2 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] disabled:opacity-50 transition-colors"
                          >
                            반려
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && !isError && totalPages > 1 && (
        <Pagination
          page={page + 1}
          totalPages={totalPages}
          totalItems={totalElements}
          pageSize={PAGE_SIZE}
          onChange={(nextPage) => setPage(nextPage - 1)}
        />
      )}

      {/* Reject modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => !rejectMutation.isPending && setRejectTarget(null)}
        title="예약 반려"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={rejectMutation.isPending}
            >
              취소
            </Button>
            <Button
              variant="danger"
              loading={rejectMutation.isPending}
              onClick={handleRejectSubmit}
            >
              반려 처리
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5" htmlFor="decisionReason">
              반려 사유 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              id="decisionReason"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={4}
              placeholder="학생에게 공개되는 사유를 입력하세요."
              disabled={rejectMutation.isPending}
              aria-invalid={rejectError ? true : undefined}
              aria-describedby={rejectError ? 'decisionReasonError' : undefined}
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none bg-white focus:outline-none focus:border-[#374151] disabled:bg-[#F9FAFB]"
            />
          </div>
          {rejectError && (
            <p
              id="decisionReasonError"
              className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
              role="alert"
            >
              ⚠ {rejectError}
            </p>
          )}
          <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#92400E]">
            ⚠ 반려 사유는 학생에게 공개됩니다.
          </div>
        </div>
      </Modal>

      {/* Detail modal — 신청 원문은 열람 시에만 조회하고 닫을 때 캐시에서 제거한다 */}
      <Modal
        open={detailReservationId !== null}
        onClose={closeDetail}
        title="신청 내용 확인"
        footer={
          <Button variant="outline" onClick={closeDetail}>
            닫기
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {detailLoading ? (
            <p className="text-center text-[12px] text-[#656D76] py-4">불러오는 중입니다.</p>
          ) : detailIsError ? (
            <p className="text-[12px] text-[#CF222E]" role="alert">
              신청 내용을 불러오지 못했습니다. 다시 시도해 주세요.
            </p>
          ) : detail ? (
            <>
              <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB]">
                <p className="text-[10px] font-mono text-[#9AA0A6] mb-1">
                  #{detail.reservationId} · {detail.counselingTypeName}
                </p>
                <p className="text-[12px] font-bold text-[#1F2328] whitespace-pre-wrap">
                  {detail.requestContent}
                </p>
              </div>
              {detail.decisionReason && (
                <div className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA]">
                  <p className="text-[10px] font-semibold text-[#CF222E] mb-1">기존 처리 사유</p>
                  <p className="text-[12px] text-[#1F2328]">{detail.decisionReason}</p>
                </div>
              )}
              <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[11px] text-[#92400E]">
                🔒 상담 신청 원문은 담당 상담사만 열람할 수 있습니다.
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {/* 상담사 대행 예약 모달 — 학번 조회 form과 예약 생성 form을 분리해 학번 입력창에서
          Enter를 눌러도 예약이 오제출되지 않게 한다. */}
      <Modal
        open={proxyModalOpen}
        onClose={closeProxyModal}
        title="상담사 대행 예약"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={closeProxyModal}
              disabled={createProxyMutation.isPending}
            >
              취소
            </Button>
            <Button type="submit" form="proxyReservationForm" loading={createProxyMutation.isPending}>
              예약 확정
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* 1. 학번 조회 — 별도 form이라 Enter는 조회만 트리거한다 */}
          <form onSubmit={handleLookupSubmit} className="flex flex-col gap-1.5">
            <label
              htmlFor="proxyUniversityNo"
              className="text-[11px] font-semibold text-[#656D76]"
            >
              학번 <span className="text-[#CF222E]">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="proxyUniversityNo"
                type="text"
                value={universityNo}
                onChange={(e) => handleUniversityNoChange(e.target.value)}
                disabled={createProxyMutation.isPending}
                aria-invalid={universityNoError ? true : undefined}
                aria-describedby={universityNoError ? 'proxyUniversityNoError' : undefined}
                placeholder="예: 20260001"
                className="h-9 flex-1 rounded-[6px] border border-[#E5E7EB] px-3 text-[13px] focus:border-[#374151] focus:outline-none disabled:bg-[#F9FAFB]"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                loading={lookupMutation.isPending}
                disabled={createProxyMutation.isPending}
              >
                조회
              </Button>
            </div>
            {universityNoError && (
              <p
                id="proxyUniversityNoError"
                role="alert"
                className="text-[11px] font-semibold text-[#CF222E]"
              >
                ⚠ {universityNoError}
              </p>
            )}
          </form>

          {/* 2~4. 예약 생성 — 학생 확인, 일정 선택, 신청 내용 */}
          <form
            id="proxyReservationForm"
            onSubmit={handleProxyCreateSubmit}
            className="flex flex-col gap-4"
          >
            <InfoField label="확인된 학생">
              {selectedStudent ? (
                <div className="rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[12px]">
                  <p className="font-mono text-[#1F2328]">{selectedStudent.universityNo}</p>
                  <p className="font-semibold text-[#1F2328]">{selectedStudent.studentName}</p>
                </div>
              ) : (
                <p className="text-[11px] text-[#9AA0A6]">
                  학번을 조회하면 학생 정보가 표시됩니다.
                </p>
              )}
            </InfoField>

            <div>
              <label
                htmlFor="proxyScheduleId"
                className="mb-1.5 block text-[11px] font-semibold text-[#656D76]"
              >
                상담 일정 <span className="text-[#CF222E]">*</span>
              </label>
              <select
                id="proxyScheduleId"
                value={selectedScheduleId}
                onChange={(e) => {
                  setSelectedScheduleId(e.target.value);
                  setScheduleError('');
                }}
                disabled={createProxyMutation.isPending || proxySchedulesLoading || proxyTypesLoading}
                aria-invalid={scheduleError ? true : undefined}
                aria-describedby={scheduleError ? 'proxyScheduleError' : undefined}
                className="h-9 w-full rounded-[6px] border border-[#E5E7EB] bg-white px-3 text-[13px] focus:border-[#374151] focus:outline-none disabled:bg-[#F9FAFB]"
              >
                <option value="" disabled>
                  {proxySchedulesLoading || proxyTypesLoading
                    ? '일정을 불러오는 중…'
                    : '일정을 선택하세요'}
                </option>
                {availableSchedules.map((schedule) => (
                  <option key={schedule.scheduleId} value={schedule.scheduleId}>
                    {proxyTypeNameById.get(schedule.counselingTypeId) ??
                      `유형 ${schedule.counselingTypeId}`}{' '}
                    · {formatKstDateTime(schedule.startsAt)} ~ {formatKstDateTime(schedule.endsAt)} ·
                    잔여 {schedule.remainingCapacity}명
                    {schedule.location ? ` · ${schedule.location}` : ''}
                  </option>
                ))}
              </select>
              {proxySchedulesError || proxyTypesError ? (
                <p role="alert" className="mt-1 text-[10px] text-[#CF222E]">
                  일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                </p>
              ) : !proxySchedulesLoading &&
                !proxyTypesLoading &&
                availableSchedules.length === 0 ? (
                <p role="status" className="mt-1 text-[10px] text-[#CF222E]">예약 가능한 일정이 없습니다.</p>
              ) : null}
              {scheduleError && (
                <p
                  id="proxyScheduleError"
                  role="alert"
                  className="mt-1 text-[11px] font-semibold text-[#CF222E]"
                >
                  ⚠ {scheduleError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="proxyRequestContent"
                className="mb-1.5 block text-[11px] font-semibold text-[#656D76]"
              >
                신청 내용 <span className="text-[#CF222E]">*</span>
              </label>
              <textarea
                id="proxyRequestContent"
                value={requestContent}
                onChange={(e) => {
                  setRequestContent(e.target.value);
                  setContentError('');
                }}
                rows={4}
                maxLength={3000}
                disabled={createProxyMutation.isPending}
                aria-invalid={contentError ? true : undefined}
                aria-describedby={contentError ? 'proxyRequestContentError' : undefined}
                placeholder="학생이 대면·전화로 접수한 상담 신청 내용을 입력하세요."
                className="w-full resize-none rounded-[6px] border border-[#E5E7EB] px-3 py-2.5 text-[13px] focus:border-[#374151] focus:outline-none disabled:bg-[#F9FAFB]"
              />
              <p className="mt-1 text-right text-[10px] text-[#9AA0A6]">
                {requestContent.length}/3000
              </p>
              {contentError && (
                <p
                  id="proxyRequestContentError"
                  role="alert"
                  className="text-[11px] font-semibold text-[#CF222E]"
                >
                  ⚠ {contentError}
                </p>
              )}
            </div>

            <div className="rounded-[8px] border border-[#BFDBFE] bg-[#EFF6FF] p-3 text-[11px] text-[#1D4ED8]">
              🔔 예약은 즉시 승인·배정되며 학생에게 인앱 알림으로 확정 안내가 제공됩니다.
            </div>

            {submitError && (
              <p
                role="alert"
                className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
              >
                ⚠ {submitError}
              </p>
            )}
          </form>
        </div>
      </Modal>
    </div>
  );
}
