import { useState, useEffect, useRef } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Pagination, StatusBadge, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  approveCounselingReservation,
  fetchPendingCounselorReservations,
  pendingReservationsQueryKey,
  rejectCounselingReservation,
} from '@/api/counsel';
import ReservationDetailModal from './ReservationDetailModal';
import ProxyReservationModal from './ProxyReservationModal';
import {
  COUNSELING_RESERVATION_ERROR_CODE,
  COUNSELING_RESERVATION_STATUS_LABEL,
} from '@/constants/domain';
import { formatKstDateTime } from './staffCounselingDate';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)
const PAGE_SIZE = 20;

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
    return '입력값을 다시 확인해 주세요.';
  return '처리 중 오류가 발생했습니다.';
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
  const [proxyModalOpen, setProxyModalOpen] = useState(false);
  // 다른 메뉴로 이동한 뒤 늦게 도착한 응답이 이 화면의 토스트·모달 상태를 건드리지 않도록
  // 언마운트 여부를 기억한다. 캐시 무효화(invalidatePending)는 서버 사실 반영이라 이 가드와
  // 무관하게 항상 실행한다.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const {
    data: pendingPage,
    isLoading,
    isError,
    error,
    isPlaceholderData,
    isFetching,
    refetch: refetchPendingReservations,
  } = useQuery({
    queryKey: pendingReservationsQueryKey(page),
    queryFn: () => fetchPendingCounselorReservations({ page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const invalidatePending = () =>
    queryClient.invalidateQueries({ queryKey: ['counselorPendingReservations'] });

  const approveMutation = useMutation({
    mutationFn: approveCounselingReservation,
    onSuccess: () => {
      // 서버 사실 반영은 화면 생존과 무관하게 항상 수행한다.
      invalidatePending();
      if (isMountedRef.current) {
        toast('예약을 승인했습니다. 담당 상담사로 배정되었습니다.', 'success');
      }
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiError && STALE_STATE_CODES.has(mutationError.code))
        invalidatePending();
      if (isMountedRef.current) {
        toast(getErrorMessage(mutationError), 'error');
      }
    },
    // mutation-level onSettled는 호출별 콜백과 달리 TanStack Query v5의 연속 mutation
    // 상황에서도 요청마다 반드시 실행된다. 세 번째 인자(reservationId)가 곧 이 요청이
    // 승인하려던 대상이므로, 다른 행의 승인이 먼저·나중에 끝나도 자기 행만 정확히 해제한다.
    onSettled: (data, error, reservationId) => {
      if (!isMountedRef.current) return;
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(reservationId);
        return next;
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ reservationId, request }) => rejectCounselingReservation(reservationId, request),
    // request.decisionReason은 학생에게 공개되긴 하지만 상담사가 작성 중인 원문이라, 완료된
    // 요청의 사본을 mutation cache에 남기지 않는다. approveMutation은 ID만 넘겨 대상이 아니다.
    gcTime: 0,
    onSuccess: (data, { reservationId }) => {
      invalidatePending();
      // 화면 조작(모달 닫기·입력 초기화·토스트)은 지금 이 예약의 반려 모달이 열려 있을 때만.
      // 다른 예약으로 넘어갔거나 언마운트된 뒤 늦게 도착한 성공 응답은 건드리지 않는다.
      if (isMountedRef.current && rejectTarget?.reservationId === reservationId) {
        setRejectTarget(null);
        setDecisionReason('');
        setRejectError('');
        toast('반려 처리되었습니다. 학생에게 사유가 공개됩니다.', 'info');
      }
    },
    onError: (mutationError, { reservationId }) => {
      if (mutationError instanceof ApiError && STALE_STATE_CODES.has(mutationError.code)) {
        invalidatePending();
        if (isMountedRef.current && rejectTarget?.reservationId === reservationId) {
          setRejectTarget(null);
          toast(getErrorMessage(mutationError), 'error');
        }
        return;
      }
      if (isMountedRef.current && rejectTarget?.reservationId === reservationId) {
        setRejectError(getErrorMessage(mutationError));
      }
    },
    // 성공·오류 처리(무효화, 대상 일치 확인 후 토스트·모달 갱신)가 모두 끝난 뒤에만
    // reset()을 호출해 반려 사유가 완료 상태로 mutation cache에 남지 않게 한다.
    onSettled: () => {
      rejectMutation.reset();
    },
  });

  const handleApprove = (reservationId) => {
    setApprovingIds((prev) => new Set(prev).add(reservationId));
    approveMutation.mutate(reservationId);
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
          <Button
            id="proxyOpenButton"
            size="sm"
            style={{ background: ACCENT }}
            onClick={() => setProxyModalOpen(true)}
          >
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
          <div className="p-4 text-[12px] text-[#CF222E]" role="alert">
            <p>{getErrorMessage(error)}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              loading={isFetching}
              onClick={() => refetchPendingReservations()}
            >
              다시 시도
            </Button>
          </div>
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

      {/* 신청 원문은 ReservationDetailModal이 열람 시에만 조회하고 닫을 때 캐시에서 제거한다 */}
      <ReservationDetailModal
        reservationId={detailReservationId}
        onClose={() => setDetailReservationId(null)}
      />

      {/* 상담사 대행 예약 모달 — 학번 조회, 일정 선택, 신청 내용 입력과 생성은
          ProxyReservationModal이 소유한다. */}
      <ProxyReservationModal
        open={proxyModalOpen}
        onClose={() => setProxyModalOpen(false)}
      />
    </div>
  );
}
