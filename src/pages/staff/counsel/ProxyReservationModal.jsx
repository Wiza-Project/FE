import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, InfoField, Modal, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  createCounselorProxyReservation,
  fetchCounselorCounselingTypes,
  fetchCounselorSchedules,
  fetchCounselorStudentByUniversityNo,
} from '@/api/counsel';
import { COUNSELING_RESERVATION_ERROR_CODE } from '@/constants/domain';
import { formatKstDateTime } from './staffCounselingDate';

// MySchedule.jsx와 정확히 같은 배열 형태를 써야 두 화면이 같은 캐시를 공유한다(키를 바꾸지 않는다).
const SCHEDULE_QUERY_KEY = ['counselorSchedules'];
const TYPE_QUERY_KEY = ['counselorCounselingTypes'];

// 상담사 대행 예약 모달 — 학번 조회 form과 예약 생성 form을 분리해 학번 입력창에서
// Enter를 눌러도 예약이 오제출되지 않게 한다.
export default function ProxyReservationModal({ open, onClose }) {
  const queryClient = useQueryClient();

  // 학생 식별정보·신청 내용은 이 컴포넌트 로컬 state에만 두고 Query 캐시·Zustand·브라우저
  // 저장소에는 절대 넣지 않는다(모달을 닫으면 closeProxyModal 하나가 전부 비운다).
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
    enabled: open,
    retry: false,
  });

  const {
    data: proxySchedules = [],
    isLoading: proxySchedulesLoading,
    isError: proxySchedulesError,
  } = useQuery({
    queryKey: SCHEDULE_QUERY_KEY,
    queryFn: fetchCounselorSchedules,
    enabled: open,
    retry: false,
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

  // 학번(학생 식별정보)이 variables로 들어가므로, 조회가 끝나면 mutation cache에 남기지 않는다.
  // 이 mutation은 per-call(mutate 두 번째 인자) 콜백만 쓰고 hook-level 콜백이 없어서, 여기서
  // onSettled로 reset()을 걸면 실제 실행 순서상(hook-level 콜백 → dispatch → per-call 콜백)
  // per-call 콜백보다 먼저 옵저버가 떨어져 나가 per-call 콜백 자체가 실행되지 않는다.
  // 그래서 reset()은 handleLookupSubmit의 per-call onSuccess/onError 안, 화면 처리가 끝난
  // 지점에서 직접 호출한다.
  const lookupMutation = useMutation({ mutationFn: fetchCounselorStudentByUniversityNo, gcTime: 0 });
  // [C-05] 캐시 무효화는 mutation-level 콜백에 둔다. 호출별(mutate 두 번째 인자) 콜백은 모달이
  // 언마운트된 뒤 도착한 응답에서 실행되지 않으므로, 예약이 실제로 생성됐는데도 일정·회기
  // 목록 캐시가 낡은 채 남을 수 있다. 모달 닫기·토스트 같은 화면 조작만 호출별 콜백에 남긴다.
  // studentId·requestContent(학생 식별정보·신청 내용 원문)가 variables로 들어가므로, 완료 후
  // mutation cache에 남기지 않는다. 이 hook-level onSuccess/onError는 캐시 무효화만 담당하고
  // 화면 처리는 아래 per-call 콜백이 맡으므로, reset()도 lookupMutation과 같은 이유로 여기(hook
  // -level onSettled)가 아니라 handleProxyCreateSubmit의 per-call onSuccess/onError 끝에서 부른다.
  const createProxyMutation = useMutation({
    mutationFn: createCounselorProxyReservation,
    gcTime: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['counselingSessions'] });
    },
    onError: (mutationError) => {
      if (!(mutationError instanceof ApiError)) return;
      const { code } = mutationError;
      if (code === COUNSELING_RESERVATION_ERROR_CODE.SCHEDULE_NOT_AVAILABLE) {
        queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
      } else if (code === COUNSELING_RESERVATION_ERROR_CODE.RESOURCE_NOT_FOUND) {
        queryClient.invalidateQueries({ queryKey: TYPE_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
      }
    },
  });

  const closeProxyModal = () => {
    // 예약 생성 중에는 닫기를 막는다. 승인·배정·1회기가 만들어지는 도중에 모달을 닫으면
    // 사용자가 결과를 확인하지 못한 채 화면을 떠나게 된다.
    if (createProxyMutation.isPending) return;
    proxySessionRef.current += 1;
    setUniversityNo('');
    setUniversityNoError('');
    setSelectedStudent(null);
    setSelectedScheduleId('');
    setScheduleError('');
    setRequestContent('');
    setContentError('');
    setSubmitError('');
    // 두 mutation 모두 이미 자체 per-call 콜백의 finally에서 reset()하지만, 요청을 아예
    // 보내지 않고 닫는 경로(예: 조회 전 취소)까지 방어적으로 한 번 더 정리한다. 이미 idle인
    // mutation에 reset()을 불러도 아무 부작용이 없다.
    lookupMutation.reset();
    createProxyMutation.reset();
    // 공용 Button은 forwardRef가 아니라 ref로 DOM에 닿지 않는다. id로 찾아 포커스를 돌리고,
    // 버튼이 화면에서 사라졌으면(라우트 이동 등) 아무 것도 하지 않는다.
    document.getElementById('proxyOpenButton')?.focus();
    onClose();
  };

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
      // 화면 처리가 끝난 뒤에만 reset() 하도록 try/finally로 모든 return 분기를 감싼다.
      // (finally는 각 return 직전에 실행되므로 분기마다 reset()을 따로 적을 필요가 없다)
      onSuccess: (student) => {
        try {
          if (proxySessionRef.current !== session) return; // 이미 닫혔거나 학번이 바뀐 뒤 온 응답
          setSelectedStudent(student);
        } finally {
          lookupMutation.reset();
        }
      },
      onError: (mutationError) => {
        try {
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
        } finally {
          lookupMutation.reset();
        }
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
    // 이 요청을 보낸 시점의 세션 번호를 기억한다 — 응답이 도착했을 때 모달이 이미 닫혔거나
    // 학번이 바뀌었으면(proxySessionRef가 증가) 늦은 응답이 화면을 건드리지 않게 막는다.
    const session = proxySessionRef.current;
    createProxyMutation.mutate(
      {
        studentId: selectedStudent.studentId,
        counselingTypeId: schedule.counselingTypeId,
        scheduleId: schedule.scheduleId,
        requestContent: trimmedContent,
      },
      {
        // 캐시 무효화는 위 mutation-level 콜백이 이미 처리한다. 여기서는 지금 이 모달이 아직
        // 유효할 때만 필요한 화면 조작(닫기·토스트·입력 오류)만 한다.
        // studentId·신청 내용은 요청이 끝나면 곧바로 지워야 하므로, 모든 return 분기가
        // try/finally의 reset()을 거치게 해 화면 처리가 끝난 뒤에만 mutation cache에서 빠진다.
        onSuccess: () => {
          try {
            if (proxySessionRef.current !== session) return;
            closeProxyModal();
            toast('예약을 확정하고 담당 상담사로 배정했습니다.', 'success');
          } finally {
            createProxyMutation.reset();
          }
        },
        onError: (mutationError) => {
          try {
            if (proxySessionRef.current !== session) return;
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
              setScheduleError('선택한 일정을 더 이상 사용할 수 없습니다. 목록을 새로고침했습니다. 다른 일정을 선택해 주세요.');
              return;
            }
            if (code === COUNSELING_RESERVATION_ERROR_CODE.RESOURCE_NOT_FOUND) {
              setSelectedScheduleId('');
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
            setSubmitError('처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
          } finally {
            createProxyMutation.reset();
          }
        },
      },
    );
  };

  return (
    <Modal
      open={open}
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
  );
}
