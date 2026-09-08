import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Pagination,
  SkeletonLoader,
  StatusBadge,
  toast,
} from '@/components/common';
import { ApiError } from '@/api/client';
import {
  fetchMyCounselingProposals,
  myCounselingProposalsQueryKey,
  rejectCounselingProposal,
} from '@/api/counsel';
import {
  COUNSELING_PROPOSAL_ERROR_CODE,
  COUNSELING_PROPOSAL_STATUS,
  COUNSELING_PROPOSAL_STATUS_LABEL,
} from '@/constants/domain';
import CounselingProposalAcceptDialog from './CounselingProposalAcceptDialog';
import { formatKstDateTime } from '@/utils/counselingDate';

const ACCENT = '#0E7490';
const PAGE_SIZE = 20;
const PROPOSAL_STATUS_BADGE_VARIANT = {
  [COUNSELING_PROPOSAL_STATUS.PENDING]: 'info',
  [COUNSELING_PROPOSAL_STATUS.ACCEPTED]: 'success',
  [COUNSELING_PROPOSAL_STATUS.REJECTED]: 'danger',
  [COUNSELING_PROPOSAL_STATUS.EXPIRED]: 'neutral',
};

function handleModalKeyDown(event, modalElement, isPending, closeModal) {
  if (event.key === 'Escape') {
    if (!isPending) {
      event.preventDefault();
      closeModal();
    }
    return;
  }
  if (event.key !== 'Tab') return;

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

function getListErrorMessage(error) {
  if (error instanceof ApiError && error.code === COUNSELING_PROPOSAL_ERROR_CODE.FORBIDDEN) {
    return '상담 제안 목록을 조회할 권한이 없습니다.';
  }
  return '상담 제안 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function getRejectErrorMessage(error) {
  if (!(error instanceof ApiError)) return '거절 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  if (
    error.code === COUNSELING_PROPOSAL_ERROR_CODE.PROPOSAL_NOT_FOUND ||
    error.code === COUNSELING_PROPOSAL_ERROR_CODE.PROPOSAL_NOT_RESPONDABLE
  ) {
    return '이미 처리되었거나 응답 기한이 지난 제안입니다. 목록을 새로고침했습니다.';
  }
  return '거절 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

function canManuallyRetryQuery(error) {
  return error instanceof ApiError && error.code === 'NETWORK_ERROR';
}

function restoreFocus(triggerRef, fallbackRef) {
  if (triggerRef.current?.isConnected) {
    triggerRef.current.focus();
    return;
  }
  fallbackRef.current?.focus();
}

/**
 * @param {Object} props
 * @param {() => void} props.onShowReservations 수락 성공·수락 제안 확인 시 예약 탭으로 이동시키는 콜백.
 */
export default function CounselingProposalPanel({ onShowReservations }) {
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);
  const panelRef = useRef(null);
  const [page, setPage] = useState(0);
  const [rejectTarget, setRejectTarget] = useState(null);
  const rejectTriggerRef = useRef(null);
  const rejectInFlightRef = useRef(false);
  const rejectConfirmRef = useRef(null);
  const [acceptTarget, setAcceptTarget] = useState(null);
  const acceptTriggerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      queryClient.removeQueries({ queryKey: ['myCounselingProposals'] });
    };
  }, [queryClient]);

  const proposalsQuery = useQuery({
    queryKey: myCounselingProposalsQueryKey(page, PAGE_SIZE),
    queryFn: () => fetchMyCounselingProposals({ page, size: PAGE_SIZE }),
    retry: false,
    gcTime: 0,
  });
  const content = proposalsQuery.data?.content ?? [];
  const totalElements = proposalsQuery.data?.totalElements ?? 0;
  const totalPages = proposalsQuery.data?.totalPages ?? 0;

  useEffect(() => {
    if (proposalsQuery.isError || !proposalsQuery.data) return;
    if (totalPages === 0 && page !== 0) {
      setPage(0);
      return;
    }
    if (totalPages > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [proposalsQuery.isError, proposalsQuery.data, totalPages, page]);

  const invalidateProposals = () =>
    queryClient.invalidateQueries({ queryKey: ['myCounselingProposals'] });
  const rejectMutation = useMutation({
    mutationFn: rejectCounselingProposal,
    retry: false,
    onSuccess: async () => {
      await invalidateProposals();
      if (!isMountedRef.current) return;
      setRejectTarget(null);
      toast('상담 제안을 거절했습니다.', 'info');
      restoreFocus(rejectTriggerRef, panelRef);
    },
    onError: async (error) => {
      const isStale =
        error instanceof ApiError &&
        (error.code === COUNSELING_PROPOSAL_ERROR_CODE.PROPOSAL_NOT_FOUND ||
          error.code === COUNSELING_PROPOSAL_ERROR_CODE.PROPOSAL_NOT_RESPONDABLE);
      if (isStale) await invalidateProposals();
      if (!isMountedRef.current) return;
      toast(getRejectErrorMessage(error), 'error');
      if (isStale) {
        setRejectTarget(null);
        restoreFocus(rejectTriggerRef, panelRef);
      }
    },
    onSettled: () => {
      rejectInFlightRef.current = false;
    },
  });

  const openRejectConfirm = (proposal, trigger) => {
    rejectTriggerRef.current = trigger;
    setRejectTarget(proposal);
  };
  const handleRejectConfirm = () => {
    if (!rejectTarget || rejectMutation.isPending || rejectInFlightRef.current) return;
    rejectInFlightRef.current = true;
    rejectMutation.mutate(rejectTarget.proposalId);
  };
  const closeRejectConfirm = () => {
    if (rejectMutation.isPending || rejectInFlightRef.current) return;
    setRejectTarget(null);
    restoreFocus(rejectTriggerRef, panelRef);
  };

  useEffect(() => {
    if (!rejectTarget) return undefined;
    const dialogElement = rejectConfirmRef.current?.querySelector('.fixed');
    if (!dialogElement) return undefined;
    const onKeyDown = (event) =>
      handleModalKeyDown(
        event,
        dialogElement,
        rejectMutation.isPending || rejectInFlightRef.current,
        closeRejectConfirm,
      );
    dialogElement.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(() => {
      dialogElement.querySelector('.border-t button:not([disabled])')?.focus();
    });
    return () => dialogElement.removeEventListener('keydown', onKeyDown);
    // closeRejectConfirm은 렌더마다 새로 만들어지지만 항상 최신 상태를 읽으므로 의존성에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectTarget, rejectMutation.isPending]);

  const openAcceptDialog = (proposal, trigger) => {
    acceptTriggerRef.current = trigger;
    setAcceptTarget(proposal);
  };
  const handleAcceptDialogClose = () => {
    setAcceptTarget(null);
    restoreFocus(acceptTriggerRef, panelRef);
  };
  const handleAcceptSuccess = () => {
    setAcceptTarget(null);
    onShowReservations();
  };

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className="outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7490]"
    >
      {proposalsQuery.isLoading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">상담 제안 목록을 불러오는 중입니다.</span>
          <SkeletonLoader rows={3} cols={1} />
        </div>
      ) : proposalsQuery.isError ? (
        <div role="alert" className="bg-white rounded-[8px] border border-[#FECACA] px-5 py-4">
          <p className="text-[12px] text-[#A40E26]">{getListErrorMessage(proposalsQuery.error)}</p>
          {canManuallyRetryQuery(proposalsQuery.error) && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 min-h-[40px]"
              loading={proposalsQuery.isFetching}
              onClick={() => proposalsQuery.refetch()}
            >
              다시 시도
            </Button>
          )}
        </div>
      ) : content.length === 0 ? (
        <EmptyState message="받은 상담 제안이 없습니다." />
      ) : (
        <div className="flex flex-col gap-3">
          {content.map((proposal) => {
            const isPending = proposal.responseStatus === COUNSELING_PROPOSAL_STATUS.PENDING;
            const isRowBusy =
              rejectMutation.isPending && rejectTarget?.proposalId === proposal.proposalId;
            return (
              <div
                key={proposal.proposalId}
                className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <StatusBadge
                    status={proposal.responseStatus}
                    label={
                      COUNSELING_PROPOSAL_STATUS_LABEL[proposal.responseStatus] ??
                      proposal.responseStatus
                    }
                    variant={PROPOSAL_STATUS_BADGE_VARIANT[proposal.responseStatus]}
                    size="sm"
                  />
                  <span className="text-[11px] text-[#6B7280]">
                    검사일 {formatKstDateTime(proposal.testedAt)} · 점수 {proposal.totalScore} ·{' '}
                    {proposal.resultLevel}
                  </span>
                </div>
                <p className="[overflow-wrap:anywhere] whitespace-pre-wrap text-[13px] text-[#1F2328]">
                  {proposal.proposalContent}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#656D76]">
                  <span>생성일 {formatKstDateTime(proposal.createdAt)}</span>
                  {proposal.responseDeadline && (
                    <span>응답 기한 {formatKstDateTime(proposal.responseDeadline)}</span>
                  )}
                  {proposal.respondedAt && (
                    <span>응답일 {formatKstDateTime(proposal.respondedAt)}</span>
                  )}
                  {proposal.createdReservationId != null && (
                    <button
                      type="button"
                      onClick={onShowReservations}
                      className="inline-flex min-h-[40px] items-center whitespace-nowrap font-semibold text-[#0E7490] underline underline-offset-2 hover:text-[#155E75] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7490]"
                    >
                      예약 보기 (#{proposal.createdReservationId})
                    </button>
                  )}
                </div>
                {isPending && (
                  <div className="flex gap-2 mt-1">
                    <Button
                      size="sm"
                      style={{ background: ACCENT }}
                      className="min-h-[40px]"
                      disabled={isRowBusy}
                      onClick={(event) => openAcceptDialog(proposal, event.currentTarget)}
                    >
                      수락
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[40px]"
                      disabled={isRowBusy}
                      onClick={(event) => openRejectConfirm(proposal, event.currentTarget)}
                    >
                      거절
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!proposalsQuery.isLoading && !proposalsQuery.isError && totalPages > 1 && (
        <div className="min-w-0 max-w-full overflow-x-auto">
          <Pagination
            page={page + 1}
            totalPages={totalPages}
            totalItems={totalElements}
            pageSize={PAGE_SIZE}
            onChange={(nextPage) => setPage(nextPage - 1)}
          />
        </div>
      )}

      <div ref={rejectConfirmRef}>
        <ConfirmDialog
          open={!!rejectTarget}
          title="상담 제안 거절"
          message="상담 제안을 거절하시겠습니까? 거절 후 같은 검사 결과로 다시 제안받을 수 없습니다."
          confirmLabel="거절하기"
          danger
          loading={rejectMutation.isPending}
          onConfirm={handleRejectConfirm}
          onCancel={closeRejectConfirm}
        />
      </div>

      {acceptTarget && (
        <CounselingProposalAcceptDialog
          key={acceptTarget.proposalId}
          proposal={acceptTarget}
          onClose={handleAcceptDialogClose}
          onAccepted={handleAcceptSuccess}
        />
      )}
    </div>
  );
}
