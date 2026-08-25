import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Pagination, StatusBadge, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  cancelCounselingSession,
  completeCounselingSession,
  counselingSessionDetailQueryKey,
  counselingSessionsQueryKey,
  createFollowUpSession,
  fetchCounselingSessionDetail,
  fetchCounselingSessions,
} from '@/api/counsel';
import {
  COUNSELING_SESSION_ATTENDANCE_STATUS,
  COUNSELING_SESSION_ATTENDANCE_STATUS_LABEL,
  COUNSELING_SESSION_ERROR_CODE,
  COUNSELING_SESSION_STATUS,
  COUNSELING_SESSION_STATUS_LABEL,
} from '@/constants/domain';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)
const PAGE_SIZE = 20;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 회기 상태 배지는 텍스트 라벨과 함께 표시하므로 색상만으로 상태를 구분하지 않는다.
const SESSION_STATUS_BADGE_VARIANT = {
  [COUNSELING_SESSION_STATUS.PLANNED]: 'info',
  [COUNSELING_SESSION_STATUS.COMPLETED]: 'success',
  [COUNSELING_SESSION_STATUS.CANCELED]: 'danger',
};

const ATTENDANCE_BADGE_VARIANT = {
  [COUNSELING_SESSION_ATTENDANCE_STATUS.SCHEDULED]: 'neutral',
  [COUNSELING_SESSION_ATTENDANCE_STATUS.PRESENT]: 'success',
  [COUNSELING_SESSION_ATTENDANCE_STATUS.ABSENT]: 'warning',
  [COUNSELING_SESSION_ATTENDANCE_STATUS.NO_SHOW]: 'danger',
};

// 서버가 준 Instant(UTC)를 한국 시간(Asia/Seoul)으로 표시한다. 브라우저 타임존에 의존하지 않도록
// UTC 값에 +9시간을 더한 뒤 UTC getter로 다시 읽는다(ReservationManage와 동일한 방식).
function formatKstDateTime(instant) {
  if (!instant) return '-';
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '-';
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}

// datetime-local input 값(로컬 벽시계 기준)을 UTC ISO-8601 Instant 문자열로 바꾼다.
// 사용자가 한국 시간대에서 접속한다고 가정하며, 브라우저 타임존이 다르면 그 타임존 기준으로 변환된다.
function localInputToInstant(localValue) {
  if (!localValue) return undefined;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: COUNSELING_SESSION_STATUS.PLANNED, label: COUNSELING_SESSION_STATUS_LABEL.PLANNED },
  { value: COUNSELING_SESSION_STATUS.COMPLETED, label: COUNSELING_SESSION_STATUS_LABEL.COMPLETED },
  { value: COUNSELING_SESSION_STATUS.CANCELED, label: COUNSELING_SESSION_STATUS_LABEL.CANCELED },
];

const ATTENDANCE_OPTIONS = [
  COUNSELING_SESSION_ATTENDANCE_STATUS.PRESENT,
  COUNSELING_SESSION_ATTENDANCE_STATUS.ABSENT,
  COUNSELING_SESSION_ATTENDANCE_STATUS.NO_SHOW,
];

function getSessionErrorMessage(error) {
  if (!(error instanceof ApiError))
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  const { code } = error;
  if (code === COUNSELING_SESSION_ERROR_CODE.UNAUTHENTICATED)
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  if (code === COUNSELING_SESSION_ERROR_CODE.FORBIDDEN)
    return '이 회기에 대한 권한이 없습니다. 활성 상담사 계정인지 확인해 주세요.';
  if (code === COUNSELING_SESSION_ERROR_CODE.ASSIGNMENT_NOT_FOUND)
    return '담당 배정을 찾을 수 없습니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.SESSION_NOT_FOUND)
    return '해당 회기를 찾을 수 없습니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.TIME_CONFLICT)
    return '기존 상담 일정·회기와 시간이 겹칩니다. 다른 시간을 선택해 주세요.';
  if (code === COUNSELING_SESSION_ERROR_CODE.INVALID_STATE)
    return error.message || '현재 상태에서는 처리할 수 없습니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.INVALID_INPUT)
    return error.message || '입력값을 다시 확인해 주세요.';
  return error.message || '처리 중 오류가 발생했습니다.';
}

// 재조회로 목록·상세와 서버 상태가 다시 맞춰져야 하는 오류인지 구분한다(폼을 계속 열어두지 않는다).
const STALE_STATE_CODES = new Set([
  COUNSELING_SESSION_ERROR_CODE.FORBIDDEN,
  COUNSELING_SESSION_ERROR_CODE.ASSIGNMENT_NOT_FOUND,
  COUNSELING_SESSION_ERROR_CODE.SESSION_NOT_FOUND,
  COUNSELING_SESSION_ERROR_CODE.TIME_CONFLICT,
  COUNSELING_SESSION_ERROR_CODE.INVALID_STATE,
]);

/**
 * 상담사 본인 담당 회기의 목록·상세를 조회하고 후속 회기 생성·출결 완료·취소를 처리하는 화면이다.
 * 비공개 기록, 공개 결과, 추천 비교과는 체크리스트 8~9 범위이므로 이 화면에는 없다.
 */
export default function SessionRecord() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [detailSessionId, setDetailSessionId] = useState(null);
  // null | 'followup' | 'complete' | 'cancel' — 상세 모달 안에서 어떤 폼을 보여줄지 결정한다.
  const [formMode, setFormMode] = useState(null);
  const [formError, setFormError] = useState('');

  const [followUpStart, setFollowUpStart] = useState('');
  const [followUpEnd, setFollowUpEnd] = useState('');
  const [attendanceInput, setAttendanceInput] = useState('');
  const [nextSessionInput, setNextSessionInput] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const {
    data: sessionPage,
    isLoading,
    isError,
    error: listError,
  } = useQuery({
    queryKey: counselingSessionsQueryKey(page, statusFilter),
    queryFn: () =>
      fetchCounselingSessions({ page, size: PAGE_SIZE, sessionStatus: statusFilter || undefined }),
  });

  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailIsError,
    error: detailError,
  } = useQuery({
    queryKey: counselingSessionDetailQueryKey(detailSessionId),
    queryFn: () => fetchCounselingSessionDetail(detailSessionId),
    enabled: detailSessionId !== null,
  });

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['counselingSessions'] });
  const invalidateDetail = () => {
    if (detailSessionId !== null) {
      queryClient.invalidateQueries({ queryKey: counselingSessionDetailQueryKey(detailSessionId) });
    }
  };

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
    if (detailSessionId !== null) {
      // 학생 식별 정보가 포함된 상세를 캐시에 남겨두지 않는다.
      queryClient.removeQueries({ queryKey: counselingSessionDetailQueryKey(detailSessionId) });
    }
    setDetailSessionId(null);
    resetForms();
  };

  const onActionError = (mutationError) => {
    if (mutationError instanceof ApiError && STALE_STATE_CODES.has(mutationError.code)) {
      invalidateList();
      invalidateDetail();
      toast(getSessionErrorMessage(mutationError), 'error');
      setFormMode(null);
      return;
    }
    setFormError(getSessionErrorMessage(mutationError));
  };

  const followUpMutation = useMutation({
    mutationFn: ({ assignmentId, request }) => createFollowUpSession(assignmentId, request),
    onSuccess: () => {
      invalidateList();
      invalidateDetail();
      toast('후속 회기가 생성되었습니다.', 'success');
      resetForms();
    },
    onError: onActionError,
  });

  const completeMutation = useMutation({
    mutationFn: ({ sessionId, request }) => completeCounselingSession(sessionId, request),
    onSuccess: () => {
      invalidateList();
      invalidateDetail();
      toast('회기가 출결 완료 처리되었습니다.', 'success');
      resetForms();
    },
    onError: onActionError,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ sessionId, request }) => cancelCounselingSession(sessionId, request),
    onSuccess: () => {
      invalidateList();
      invalidateDetail();
      toast('회기가 취소되었습니다.', 'info');
      resetForms();
    },
    onError: onActionError,
  });

  const isMutating =
    followUpMutation.isPending || completeMutation.isPending || cancelMutation.isPending;

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
    setFormError('');
    followUpMutation.mutate({ assignmentId: detail.assignmentId, request: { startsAt, endsAt } });
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

  const content = sessionPage?.content ?? [];
  const totalElements = sessionPage?.totalElements ?? 0;
  const totalPages = sessionPage?.totalPages ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">회기 관리</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            담당 회기를 조회하고 후속 회기 생성·출결 완료·취소를 처리하세요.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="h-8 px-2.5 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151]"
          aria-label="회기 상태 필터"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <span className="text-[13px] font-bold text-[#1F2328]">회기 목록</span>
          {!isLoading && !isError && (
            <span className="ml-auto text-[11px] text-[#9AA0A6]">총 {totalElements}건</span>
          )}
        </div>

        {isLoading ? (
          <p className="p-6 text-center text-[12px] text-[#656D76]">목록을 불러오는 중입니다.</p>
        ) : isError ? (
          <p className="p-4 text-[12px] text-[#CF222E]" role="alert">
            {getSessionErrorMessage(listError)}
          </p>
        ) : content.length === 0 ? (
          <p className="p-6 text-center text-[12px] text-[#656D76]">조회된 회기가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {[
                    '회기',
                    '학생',
                    '상담유형',
                    '시작 ~ 종료',
                    '출석',
                    '회기상태',
                    '다음 회기 예정',
                    '상세',
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 7 ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.map((s) => (
                  <tr
                    key={s.sessionId}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[11px]" style={{ color: ACCENT }}>
                      #{s.sessionId} · {s.sessionNo}회기
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#1F2328]">
                      {s.studentName}
                      <span className="text-[#9AA0A6] font-mono ml-1">({s.studentNumber})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6]"
                        style={{ color: ACCENT }}
                      >
                        {s.counselingTypeName}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#444D56] whitespace-nowrap">
                      {formatKstDateTime(s.startsAt)} ~ {formatKstDateTime(s.endsAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={s.attendanceStatus}
                        variant={ATTENDANCE_BADGE_VARIANT[s.attendanceStatus]}
                        label={COUNSELING_SESSION_ATTENDANCE_STATUS_LABEL[s.attendanceStatus]}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={s.sessionStatus}
                        variant={SESSION_STATUS_BADGE_VARIANT[s.sessionStatus]}
                        label={COUNSELING_SESSION_STATUS_LABEL[s.sessionStatus]}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] whitespace-nowrap">
                      {s.nextSessionAt ? formatKstDateTime(s.nextSessionAt) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setDetailSessionId(s.sessionId)}
                        className="h-6 px-2 text-[9px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB] transition-colors"
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* 상세 모달 — 학생 식별 정보가 포함된 회기 상세는 열람 시에만 조회하고 닫을 때 캐시에서 제거한다 */}
      <Modal
        open={detailSessionId !== null}
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
            <Button variant="outline" onClick={closeDetail}>
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
              🔒 상담 신청 원문, 비공개 기록, 공개 결과는 이 화면에서 다루지 않습니다.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
