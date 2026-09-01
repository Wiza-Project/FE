import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, StatusBadge, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  cancelCounselingSession,
  completeCounselingSession,
  counselingPrivateRecordQueryKey,
  counselingSessionDetailQueryKey,
  createFollowUpSession,
  fetchCounselingSessionDetail,
} from '@/api/counsel';
import {
  COUNSELING_SESSION_ATTENDANCE_STATUS,
  COUNSELING_SESSION_ATTENDANCE_STATUS_LABEL,
  COUNSELING_SESSION_ERROR_CODE,
  COUNSELING_SESSION_STATUS_LABEL,
} from '@/constants/domain';
import { formatKstDateTime } from './staffCounselingDate';
import PrivateRecordSection from './PrivateRecordSection';
import {
  ATTENDANCE_BADGE_VARIANT,
  SESSION_STATUS_BADGE_VARIANT,
  getSessionErrorMessage,
} from './sessionRecordPresentation';

const ATTENDANCE_OPTIONS = [
  COUNSELING_SESSION_ATTENDANCE_STATUS.PRESENT,
  COUNSELING_SESSION_ATTENDANCE_STATUS.ABSENT,
  COUNSELING_SESSION_ATTENDANCE_STATUS.NO_SHOW,
];

// 재조회로 목록·상세와 서버 상태가 다시 맞춰져야 하는 오류인지 구분한다(폼을 계속 열어두지 않는다).
const STALE_STATE_CODES = new Set([
  COUNSELING_SESSION_ERROR_CODE.FORBIDDEN,
  COUNSELING_SESSION_ERROR_CODE.ASSIGNMENT_NOT_FOUND,
  COUNSELING_SESSION_ERROR_CODE.SESSION_NOT_FOUND,
  COUNSELING_SESSION_ERROR_CODE.TIME_CONFLICT,
  COUNSELING_SESSION_ERROR_CODE.INVALID_STATE,
]);

// datetime-local input 값(로컬 벽시계 기준)을 UTC ISO-8601 Instant 문자열로 바꾼다.
// 사용자가 한국 시간대에서 접속한다고 가정하며, 브라우저 타임존이 다르면 그 타임존 기준으로 변환된다.
function localInputToInstant(localValue) {
  if (!localValue) return undefined;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

/**
 * 선택된 회기의 상세와 후속 회기 생성·출결 완료·취소를 소유한다. 비공개 상담 기록의 열람·저장·
 * 확정은 PrivateRecordSection에 위임하고, 그 pending 여부만 boolean으로 받아 상세 모달의 닫기
 * 차단 조건에 합친다.
 */
export default function SessionDetailModal({ sessionId, onClose }) {
  const queryClient = useQueryClient();

  // 컴포넌트는 sessionId prop이 바뀔 때마다 재사용된다(부모가 언마운트하지 않고 prop만 교체).
  // mutation 콜백은 요청을 보낸 시점이 아니라 응답이 도착한 시점에 실행되므로, 그 사이 사용자가
  // 다른 회기로 넘어가거나(prop 변경) 화면을 완전히 떠났으면(언마운트) 늦게 도착한 응답이 지금
  // 화면 상태를 건드리면 안 된다. 두 ref로 "지금 보고 있는 회기"와 "아직 화면에 붙어 있는지"를
  // 판단 시점 그대로 기억해 둔다.
  const isMountedRef = useRef(true);
  useEffect(() => {
    // StrictMode는 개발 모드에서 이 effect를 mount→cleanup→remount로 한 번 더 실행한다.
    // 여기서 다시 true로 세팅하지 않으면 첫 cleanup(가짜 언마운트)에서 false가 된 뒤 영원히
    // 복구되지 않아, 실제로는 마운트돼 있는데도 guard가 항상 응답을 막아버린다.
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const currentSessionIdRef = useRef(sessionId);
  currentSessionIdRef.current = sessionId;

  // null | 'followup' | 'complete' | 'cancel' — 상세 모달 안에서 어떤 폼을 보여줄지 결정한다.
  const [formMode, setFormMode] = useState(null);
  const [formError, setFormError] = useState('');

  const [followUpStart, setFollowUpStart] = useState('');
  const [followUpEnd, setFollowUpEnd] = useState('');
  const [attendanceInput, setAttendanceInput] = useState('');
  const [nextSessionInput, setNextSessionInput] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  // PrivateRecordSection이 저장·확정 중임을 알리는 boolean만 받는다(상세 모달 닫기 차단용).
  const [isPrivateRecordPending, setIsPrivateRecordPending] = useState(false);

  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailIsError,
    error: detailError,
  } = useQuery({
    queryKey: counselingSessionDetailQueryKey(sessionId),
    queryFn: () => fetchCounselingSessionDetail(sessionId),
    enabled: sessionId !== null,
    gcTime: 0,
    retry: false,
  });

  // 페이지·필터별로 나뉜 회기 목록 캐시를 접두사만으로 한 번에 무효화한다(TanStack Query는
  // queryKey가 이 배열로 시작하는 모든 캐시를 대상으로 삼는다).
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['counselingSessions'] });
  // 항상 mutation을 보낸 대상 회기 ID(targetSessionId)로 invalidate한다. 현재 sessionId prop을
  // 그대로 쓰면, 사용자가 이미 다른 회기로 넘어간 뒤 이전 요청이 성공했을 때 엉뚱한 회기의
  // 캐시가 갱신된다.
  const invalidateDetail = (targetSessionId) => {
    if (targetSessionId !== null && targetSessionId !== undefined) {
      queryClient.invalidateQueries({ queryKey: counselingSessionDetailQueryKey(targetSessionId) });
    }
  };

  // 응답이 도착한 시점 기준으로 "아직 이 회기를 보고 있고, 컴포넌트도 살아있는지"를 판단한다.
  // false면 invalidate·toast·form 상태 변경을 모두 건너뛴다.
  const isResponseForCurrentSession = (targetSessionId) =>
    isMountedRef.current && targetSessionId === currentSessionIdRef.current;

  const resetForms = () => {
    setFormMode(null);
    setFormError('');
    setFollowUpStart('');
    setFollowUpEnd('');
    setAttendanceInput('');
    setNextSessionInput('');
    setCancelReason('');
  };

  const closeDetail = () => {
    if (sessionId !== null) {
      // 학생 식별 정보가 포함된 상세를 캐시에 남겨두지 않는다.
      queryClient.removeQueries({ queryKey: counselingSessionDetailQueryKey(sessionId) });
      // PrivateRecordSection이 명시적으로 닫히지 않은 채 상세 모달이 닫히는 경로까지 방어한다.
      queryClient.removeQueries({ queryKey: counselingPrivateRecordQueryKey(sessionId) });
    }
    resetForms();
    onClose();
  };

  // variables는 mutate() 호출 시 넘긴 그 객체 그대로다(응답이 아니라 요청 시점 값) — 늦게 도착한
  // 응답이라도 "그 요청이 어떤 회기를 대상으로 했는지"는 변하지 않으므로 대상 판별에 쓸 수 있다.
  const onActionError = (mutationError, variables) => {
    if (!isResponseForCurrentSession(variables?.sessionId)) return;
    if (mutationError instanceof ApiError && STALE_STATE_CODES.has(mutationError.code)) {
      invalidateList();
      invalidateDetail(variables.sessionId);
      toast(getSessionErrorMessage(mutationError), 'error');
      setFormMode(null);
      return;
    }
    setFormError(getSessionErrorMessage(mutationError));
  };

  const onFollowUpError = (mutationError, variables) => {
    if (!isResponseForCurrentSession(variables?.sessionId)) return;
    // 시간 관련 위반(TIME_CONFLICT/INVALID_STATE)은 같은 입력값을 고쳐 바로 재시도할 수 있으므로
    // 폼을 닫지 않고 인라인 오류로만 보여준다. 나머지 코드는 공통 stale 처리를 그대로 따른다.
    if (
      mutationError instanceof ApiError &&
      (mutationError.code === COUNSELING_SESSION_ERROR_CODE.TIME_CONFLICT ||
        mutationError.code === COUNSELING_SESSION_ERROR_CODE.INVALID_STATE)
    ) {
      setFormError(getSessionErrorMessage(mutationError));
      return;
    }
    onActionError(mutationError, variables);
  };

  const followUpMutation = useMutation({
    // sessionId는 대상 판별용 UI 메타데이터일 뿐이다. destructuring으로 assignmentId·request만
    // 뽑아 서버 요청(createFollowUpSession)에는 절대 포함되지 않도록 한다.
    mutationFn: ({ assignmentId, request }) => createFollowUpSession(assignmentId, request),
    onSuccess: (data, variables) => {
      if (!isResponseForCurrentSession(variables.sessionId)) return;
      invalidateList();
      invalidateDetail(variables.sessionId);
      toast('후속 회기가 생성되었습니다.', 'success');
      resetForms();
    },
    onError: onFollowUpError,
  });

  const completeMutation = useMutation({
    mutationFn: ({ sessionId: targetSessionId, request }) =>
      completeCounselingSession(targetSessionId, request),
    onSuccess: (data, variables) => {
      if (!isResponseForCurrentSession(variables.sessionId)) return;
      invalidateList();
      invalidateDetail(variables.sessionId);
      toast('회기가 출결 완료 처리되었습니다.', 'success');
      resetForms();
    },
    onError: onActionError,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ sessionId: targetSessionId, request }) =>
      cancelCounselingSession(targetSessionId, request),
    onSuccess: (data, variables) => {
      if (!isResponseForCurrentSession(variables.sessionId)) return;
      invalidateList();
      invalidateDetail(variables.sessionId);
      toast('회기가 취소되었습니다.', 'info');
      resetForms();
    },
    onError: onActionError,
  });

  // 요청 진행 중에는 모달을 닫지 못하게 해 처리 결과(성공 토스트·오류 메시지)를 놓치지 않게 한다.
  const isMutating =
    followUpMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    isPrivateRecordPending;

  const openFollowUpForm = () => {
    setFormMode('followup');
    setFormError('');
  };

  const openCompleteForm = () => {
    setFormMode('complete');
    setFormError('');
    setAttendanceInput('');
    setNextSessionInput('');
  };

  const openCancelForm = () => {
    setFormMode('cancel');
    setFormError('');
    setCancelReason('');
  };

  const submitFollowUp = () => {
    if (!detail) return;
    const startsAt = localInputToInstant(followUpStart);
    const endsAt = localInputToInstant(followUpEnd);
    if (!startsAt || !endsAt) {
      setFormError('시작·종료 시각을 모두 입력해 주세요.');
      return;
    }
    if (new Date(startsAt) >= new Date(endsAt)) {
      setFormError('종료 시각은 시작 시각보다 이후여야 합니다.');
      return;
    }
    // 서버 계약(startsAt <= now)과 동일한 조건을 미리 걸러 불필요한 요청과 INVALID_STATE
    // 왕복을 줄인다. 후속 회기는 미래 예약이 아니라 지난 상담의 사후 등록만 허용한다.
    if (new Date(startsAt) > new Date()) {
      setFormError(
        '시작 시각은 현재 이전이어야 합니다. 후속 회기는 지난 상담의 사후 등록만 가능합니다.',
      );
      return;
    }
    setFormError('');
    // sessionId는 서버로 보내지 않는 UI 전용 메타데이터다(대상 회기 판별용). mutationFn이
    // assignmentId·request만 destructuring해서 쓰기 때문에 실제 요청 바디에는 포함되지 않는다.
    followUpMutation.mutate({
      assignmentId: detail.assignmentId,
      request: { startsAt, endsAt },
      sessionId: detail.sessionId,
    });
  };

  const submitComplete = () => {
    if (!detail) return;
    if (!attendanceInput) {
      setFormError('출석 결과를 선택해 주세요.');
      return;
    }
    const nextSessionAt = localInputToInstant(nextSessionInput);
    if (nextSessionInput && !nextSessionAt) {
      setFormError('다음 회기 예정 시각을 다시 확인해 주세요.');
      return;
    }
    setFormError('');
    completeMutation.mutate({
      sessionId: detail.sessionId,
      request: { attendanceStatus: attendanceInput, ...(nextSessionAt ? { nextSessionAt } : {}) },
    });
  };

  const submitCancel = () => {
    if (!detail) return;
    const trimmed = cancelReason.trim();
    if (!trimmed) {
      setFormError('취소 사유를 입력해 주세요.');
      return;
    }
    if (trimmed.length > 500) {
      setFormError('취소 사유는 500자 이내로 입력해 주세요.');
      return;
    }
    setFormError('');
    cancelMutation.mutate({
      sessionId: detail.sessionId,
      request: { cancellationReason: trimmed },
    });
  };

  return (
    // 상세 모달 — 학생 식별 정보가 포함된 회기 상세는 열람 시에만 조회하고 닫을 때 캐시에서 제거한다
    <Modal
      open={sessionId !== null}
      onClose={() => !isMutating && closeDetail()}
      title={formMode ? '회기 처리' : '회기 상세'}
      footer={
        formMode === 'followup' ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFormMode(null)}
              disabled={followUpMutation.isPending}
            >
              취소
            </Button>
            <Button loading={followUpMutation.isPending} onClick={submitFollowUp}>
              후속 회기 생성
            </Button>
          </div>
        ) : formMode === 'complete' ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFormMode(null)}
              disabled={completeMutation.isPending}
            >
              취소
            </Button>
            <Button loading={completeMutation.isPending} onClick={submitComplete}>
              완료 처리
            </Button>
          </div>
        ) : formMode === 'cancel' ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFormMode(null)}
              disabled={cancelMutation.isPending}
            >
              취소
            </Button>
            <Button variant="danger" loading={cancelMutation.isPending} onClick={submitCancel}>
              회기 취소
            </Button>
          </div>
        ) : (
          // 요청 진행 중에는 상세 모달을 닫지 못하게 막는다. 닫고 다른 회기로 전환하는 사이
          // 늦은 응답이 도착하면 회기가 뒤섞일 수 있어, 회기 전환 경로 자체를 차단한다.
          <Button variant="outline" onClick={closeDetail} disabled={isMutating}>
            닫기
          </Button>
        )
      }
    >
      {detailLoading ? (
        <p className="text-center text-[12px] text-[#656D76] py-4">불러오는 중입니다.</p>
      ) : detailIsError ? (
        <p className="text-[12px] text-[#CF222E]" role="alert">
          {getSessionErrorMessage(detailError)}
        </p>
      ) : !detail ? null : formMode === 'followup' ? (
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="followUpStart"
              className="block text-[11px] font-semibold text-[#656D76] mb-1.5"
            >
              시작 시각 <span className="text-[#CF222E]">*</span>
            </label>
            <input
              id="followUpStart"
              type="datetime-local"
              value={followUpStart}
              onChange={(e) => setFollowUpStart(e.target.value)}
              disabled={followUpMutation.isPending}
              className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#374151]"
            />
          </div>
          <div>
            <label
              htmlFor="followUpEnd"
              className="block text-[11px] font-semibold text-[#656D76] mb-1.5"
            >
              종료 시각 <span className="text-[#CF222E]">*</span>
            </label>
            <input
              id="followUpEnd"
              type="datetime-local"
              value={followUpEnd}
              onChange={(e) => setFollowUpEnd(e.target.value)}
              disabled={followUpMutation.isPending}
              className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#374151]"
            />
          </div>
          {formError && (
            <p
              className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
              role="alert"
            >
              ⚠ {formError}
            </p>
          )}
        </div>
      ) : formMode === 'complete' ? (
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="text-[11px] font-semibold text-[#656D76] mb-1.5">
              출석 결과 <span className="text-[#CF222E]">*</span>
            </legend>
            <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="출석 결과">
              {ATTENDANCE_OPTIONS.map((v) => (
                <label
                  key={v}
                  className={`flex items-center gap-2 px-3 py-2 rounded-[8px] border-2 cursor-pointer transition-all text-[12px] font-bold ${attendanceInput === v ? 'border-[#374151] bg-[#F3F4F6]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'}`}
                >
                  {/* 실제 radio는 sr-only로 숨기고 감싸는 label이 시각 스타일을 대신한다.
                      키보드·스크린리더 조작은 이 input이 그대로 담당한다. */}
                  <input
                    type="radio"
                    name="attendanceInput"
                    value={v}
                    checked={attendanceInput === v}
                    onChange={() => setAttendanceInput(v)}
                    disabled={completeMutation.isPending}
                    className="sr-only"
                  />
                  {COUNSELING_SESSION_ATTENDANCE_STATUS_LABEL[v]}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label
              htmlFor="nextSessionInput"
              className="block text-[11px] font-semibold text-[#656D76] mb-1.5"
            >
              다음 회기 예정 시각 (선택)
            </label>
            <input
              id="nextSessionInput"
              type="datetime-local"
              value={nextSessionInput}
              onChange={(e) => setNextSessionInput(e.target.value)}
              disabled={completeMutation.isPending}
              className="w-full px-3 py-2 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#374151]"
            />
            <p className="text-[10px] text-[#9AA0A6] mt-1">
              입력 시 현재 시각과 이 회기 종료 시각보다 모두 이후여야 합니다. 상담사 시간을
              점유하는 확정 예약이 아니라 다음 회기 예정 안내용입니다.
            </p>
          </div>
          {formError && (
            <p
              className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
              role="alert"
            >
              ⚠ {formError}
            </p>
          )}
        </div>
      ) : formMode === 'cancel' ? (
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="cancelReason"
              className="block text-[11px] font-semibold text-[#656D76] mb-1.5"
            >
              취소 사유 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="회기를 취소하는 사유를 입력하세요."
              disabled={cancelMutation.isPending}
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
            />
            <p className="text-[10px] text-[#9AA0A6] mt-1 text-right">
              {cancelReason.length}/500자
            </p>
          </div>
          {formError && (
            <p
              className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
              role="alert"
            >
              ⚠ {formError}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB]">
            <p className="text-[10px] font-mono text-[#9AA0A6] mb-1">
              #{detail.sessionId} · {detail.sessionNo}회기 · {detail.counselingTypeName}
            </p>
            <p className="text-[12px] font-bold text-[#1F2328]">
              {detail.studentName} ({detail.studentNumber})
              {detail.departmentName ? ` · ${detail.departmentName}` : ''}
            </p>
            <p className="text-[11px] text-[#656D76] font-mono mt-1">
              {formatKstDateTime(detail.startsAt)} ~ {formatKstDateTime(detail.endsAt)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge
                status={detail.sessionStatus}
                variant={SESSION_STATUS_BADGE_VARIANT[detail.sessionStatus]}
                label={COUNSELING_SESSION_STATUS_LABEL[detail.sessionStatus]}
                size="sm"
              />
              <StatusBadge
                status={detail.attendanceStatus}
                variant={ATTENDANCE_BADGE_VARIANT[detail.attendanceStatus]}
                label={COUNSELING_SESSION_ATTENDANCE_STATUS_LABEL[detail.attendanceStatus]}
                size="sm"
              />
              {!detail.assignmentActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#9AA0A6] font-bold">
                  종료된 배정
                </span>
              )}
            </div>
          </div>

          {detail.nextSessionAt && (
            <div className="p-3 rounded-[8px] bg-[#F3F4F6] border border-[#E5E7EB] text-[11px] text-[#374151]">
              다음 회기 예정: {formatKstDateTime(detail.nextSessionAt)}
            </div>
          )}

          {detail.cancellationReason && (
            <div className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA]">
              <p className="text-[10px] font-semibold text-[#CF222E] mb-1">취소 사유</p>
              <p className="text-[12px] text-[#1F2328] whitespace-pre-wrap">
                {detail.cancellationReason}
              </p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={!detail.canCreateFollowUp}
              onClick={openFollowUpForm}
            >
              후속 회기 생성
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!detail.canComplete}
              onClick={openCompleteForm}
            >
              출결 완료 처리
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!detail.canCancel}
              onClick={openCancelForm}
            >
              회기 취소
            </Button>
          </div>
          <p className="text-[10px] text-[#9AA0A6]">
            버튼은 서버가 판단한 처리 가능 여부에 따라 활성화됩니다.
          </p>

          <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[11px] text-[#92400E]">
            🔒 상담 신청 원문, 공개 결과는 이 화면에서 다루지 않습니다.
          </div>

          <PrivateRecordSection sessionId={sessionId} onPendingChange={setIsPrivateRecordPending} />
        </div>
      )}
    </Modal>
  );
}
