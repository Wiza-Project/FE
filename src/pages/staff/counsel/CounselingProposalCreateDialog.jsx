import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import { createCounselingProposal } from '@/api/counsel';
import { COUNSELING_PROPOSAL_ERROR_CODE } from '@/constants/domain';
import { formatKstDateTime } from '@/utils/counselingDate';

const ACCENT = '#1F2937';
const MAX_CONTENT_LENGTH = 1000;

// 생성 실패를 사용자가 이해할 수 있는 문구로 바꾼다. 문서에 명시된 코드만 분기한다.
// A004(권한 상실)는 이 함수로 문구를 만들지 않고 부모의 화면 이동으로 처리한다.
function getCreateErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 후보를 새로고침한 뒤 다시 시도해 주세요.';
  }
  if (error.code === COUNSELING_PROPOSAL_ERROR_CODE.RESULT_NOT_ELIGIBLE) {
    return '최신 검사 결과가 변경되었거나 이미 제안된 결과입니다.';
  }
  if (error.code === COUNSELING_PROPOSAL_ERROR_CODE.INVALID_INPUT) {
    return '제안 내용을 확인해 주세요(1~1,000자).';
  }
  return '제안 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

function handleCreateDialogKeyDown(event, modalElement, isPending, closeDialog) {
  if (event.key === 'Escape') {
    if (!isPending) {
      event.preventDefault();
      closeDialog();
    }
    return;
  }

  if (event.key !== 'Tab') return;

  const focusableElements = Array.from(
    modalElement.querySelectorAll(
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

/**
 * 현재 선택한 제안 가능 스트레스 검사 결과의 생성 입력·mutation·접근성 처리를 소유한다.
 * 부모는 후보 목록과 권한 상실 처리만 소유하며, 제안 내용은 이 모듈 밖으로 전달하지 않는다.
 *
 * @param {Object} props
 * @param {Object} props.result 현재 선택한 제안 가능 스트레스 검사 결과 객체
 * @param {() => void} props.onClose 취소·성공·S015 뒤 부모 선택과 포커스를 정리하는 함수
 * @param {() => void} props.onAccessDenied A004에서 부모의 권한 상실 처리를 호출하는 함수
 */
export default function CounselingProposalCreateDialog({ result, onClose, onAccessDenied }) {
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);
  const textareaRef = useRef(null);
  const createInFlightRef = useRef(false);
  const [proposalContent, setProposalContent] = useState('');
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const createMutation = useMutation({
    mutationFn: createCounselingProposal,
    // proposalContent가 요청 변수로 기본 캐시 수명 동안 남지 않도록 gcTime 0 + onSettled reset.
    gcTime: 0,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['eligibleCounselingProposalResults'] });
      if (!isMountedRef.current) return;
      toast('상담 제안을 생성했습니다.', 'success');
      onClose();
    },
    onError: async (mutationError) => {
      // 권한 상실은 문구 대신 부모의 단일 알림·캐시 제거·화면 이동으로 처리한다.
      if (
        mutationError instanceof ApiError &&
        mutationError.code === COUNSELING_PROPOSAL_ERROR_CODE.FORBIDDEN
      ) {
        onAccessDenied();
        return;
      }
      const isResultNoLongerEligible =
        mutationError instanceof ApiError &&
        mutationError.code === COUNSELING_PROPOSAL_ERROR_CODE.RESULT_NOT_ELIGIBLE;
      if (isResultNoLongerEligible) {
        // 다른 상담사가 먼저 제안했거나 새 결과로 최신성이 바뀐 경우다. 오래된 후보를
        // 화면에 계속 보여주지 않고 즉시 다시 조회한다.
        await queryClient.invalidateQueries({ queryKey: ['eligibleCounselingProposalResults'] });
      }
      if (!isMountedRef.current) return;
      if (isResultNoLongerEligible) {
        toast(getCreateErrorMessage(mutationError), 'error');
        onClose();
        return;
      }
      setCreateError(getCreateErrorMessage(mutationError));
    },
    onSettled: () => {
      createInFlightRef.current = false;
      createMutation.reset();
    },
  });

  const closeCreateDialog = () => {
    if (createMutation.isPending || createInFlightRef.current) return;
    onClose();
  };

  // dialog가 열리면 textarea로 초점을 옮긴다.
  useEffect(() => {
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    const modalElement = textareaRef.current?.closest('.fixed');
    if (!modalElement) return undefined;
    const onKeyDown = (event) =>
      handleCreateDialogKeyDown(
        event,
        modalElement,
        createMutation.isPending || createInFlightRef.current,
        closeCreateDialog,
      );
    modalElement.addEventListener('keydown', onKeyDown);
    return () => modalElement.removeEventListener('keydown', onKeyDown);
    // closeCreateDialog는 렌더마다 새로 만들어지지만 최신 상태를 읽으므로 의존성에 넣지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createMutation.isPending]);

  const trimmedLength = proposalContent.trim().length;
  const canSubmit = trimmedLength >= 1 && trimmedLength <= MAX_CONTENT_LENGTH;

  const handleSubmit = () => {
    if (!canSubmit || createMutation.isPending || createInFlightRef.current) return;
    createInFlightRef.current = true;
    createMutation.mutate({
      psychologicalTestResultId: result.resultId,
      proposalContent: proposalContent.trim(),
    });
  };

  return (
    <Modal
      open
      onClose={closeCreateDialog}
      title="상담 제안 작성"
      size="md"
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[40px]"
            onClick={closeCreateDialog}
            disabled={createMutation.isPending}
          >
            취소
          </Button>
          <Button
            size="sm"
            className="min-h-[40px]"
            loading={createMutation.isPending}
            disabled={!canSubmit || createMutation.isPending}
            style={{ background: ACCENT }}
            onClick={handleSubmit}
          >
            생성
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 max-h-[calc(100dvh-12rem)] overflow-y-auto">
        <div className="bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] px-4 py-3 text-[12px] text-[#444D56] flex flex-col gap-1">
          <span className="[overflow-wrap:anywhere] font-bold text-[#1F2328]">
            {result.studentName} ({result.universityNo})
          </span>
          <span>검사일: {formatKstDateTime(result.testedAt)}</span>
          <span>
            점수: {result.totalScore} · 수준: {result.resultLevel}
          </span>
        </div>

        <div>
          <label
            htmlFor="proposal-content"
            className="block text-[11px] font-semibold text-[#656D76] mb-1.5"
          >
            제안 내용 <span className="text-[#CF222E]">*</span>
          </label>
          <textarea
            id="proposal-content"
            ref={textareaRef}
            value={proposalContent}
            onChange={(event) => {
              setProposalContent(event.target.value);
              setCreateError('');
            }}
            maxLength={MAX_CONTENT_LENGTH}
            rows={5}
            disabled={createMutation.isPending}
            aria-required="true"
            aria-invalid={Boolean(createError)}
            aria-describedby={createError ? 'proposal-content-error' : undefined}
            placeholder="학생에게 전달할 상담 제안 내용을 입력하세요."
            className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none bg-white focus:outline-none focus:border-[#374151] focus-visible:ring-2 focus-visible:ring-[#1F2937] focus-visible:ring-offset-2 disabled:bg-[#F9FAFB] [overflow-wrap:anywhere]"
          />
          <p className="text-[11px] text-[#6B7280] mt-1">
            {trimmedLength} / {MAX_CONTENT_LENGTH}자
          </p>
        </div>

        <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#92400E]">
          제안 생성 시점부터 7일 안에 학생이 응답해야 합니다.
        </div>

        {createError && (
          <p
            id="proposal-content-error"
            role="alert"
            className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#A40E26]"
          >
            {createError}
          </p>
        )}
      </div>
    </Modal>
  );
}
