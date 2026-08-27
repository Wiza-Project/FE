import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, ConfirmDialog, Modal, Pagination, StatusBadge, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  cancelCounselingSession,
  completeCounselingSession,
  confirmCounselingPrivateRecord,
  counselingPrivateRecordQueryKey,
  counselingSessionDetailQueryKey,
  counselingSessionsQueryKey,
  createFollowUpSession,
  fetchCounselingPrivateRecord,
  fetchCounselingSessionDetail,
  fetchCounselingSessions,
  saveCounselingPrivateRecord,
} from '@/api/counsel';
import {
  COUNSELING_PRIVATE_RECORD_STATUS,
  COUNSELING_SESSION_ATTENDANCE_STATUS,
  COUNSELING_SESSION_ATTENDANCE_STATUS_LABEL,
  COUNSELING_SESSION_ERROR_CODE,
  COUNSELING_SESSION_STATUS,
  COUNSELING_SESSION_STATUS_LABEL,
} from '@/constants/domain';
import {
  getPrivateRecordSeed,
  shouldApplyPrivateRecordMutationSuccess,
  updatePrivateRecordQueryIfPresent,
} from './privateRecordMutation';

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

// 비공개 기록 원문 최대 길이 — BE 검증(1~10,000자)과 동일한 안내용 상한. 최종 경계는 서버가 정한다.
const PRIVATE_RECORD_MAX_LENGTH = 10000;

function getPrivateRecordErrorMessage(error) {
  if (!(error instanceof ApiError))
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  const { code } = error;
  if (code === COUNSELING_SESSION_ERROR_CODE.UNAUTHENTICATED)
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  if (code === COUNSELING_SESSION_ERROR_CODE.FORBIDDEN)
    return '이 회기의 비공개 기록에 접근할 권한이 없습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.SESSION_NOT_FOUND)
    return '해당 회기의 비공개 기록을 찾을 수 없습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.CONFLICT)
    return '상담 상태가 바뀌었습니다. 최신 정보를 다시 불러왔습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.INVALID_INPUT)
    return error.message || '입력값을 다시 확인해 주세요.';
  return error.message || '처리 중 오류가 발생했습니다.';
}

/**
 * 상담사 본인 담당 회기의 목록·상세를 조회하고 후속 회기 생성·출결 완료·취소, 비공개 상담
 * 기록(조회·임시저장·확정)을 처리하는 화면이다. 공개 결과, 추천 비교과는 체크리스트 9 범위이므로
 * 이 화면에는 없다.
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

  // 비공개 상담 기록 — 사용자가 '비공개 기록 열기'를 누르기 전에는 전용 GET을 호출하지 않는다.
  // 학생·회기 목록·일반 상세 어디에도 원문이 섞이지 않도록 로컬 state와 query key를 완전히 분리한다.
  const [privateRecordOpen, setPrivateRecordOpen] = useState(false);
  const [privateContentInput, setPrivateContentInput] = useState('');
  const [privateRecordFormError, setPrivateRecordFormError] = useState('');
  const [confirmPrivateRecordOpen, setConfirmPrivateRecordOpen] = useState(false);
  // 서버에서 처음 받아온 초안으로 textarea를 한 번만 채운다. 이후 재조회(예: 충돌 재검증)에서
  // 값이 갱신돼도 사용자가 입력 중인 텍스트를 덮어쓰지 않기 위한 플래그다.
  const privateContentSeededRef = useRef(false);
  // mutation 성공 콜백은 요청 당시 렌더의 클로저를 사용할 수 있으므로, 회기 전환·영역 닫힘
  // 이후에도 콜백이 현재 화면 상태를 읽도록 최신 값을 ref에 보관한다.
  const privateRecordViewRef = useRef({ detailSessionId: null, privateRecordOpen: false });
  privateRecordViewRef.current.detailSessionId = detailSessionId;
  privateRecordViewRef.current.privateRecordOpen = privateRecordOpen;
  const previousDetailSessionIdRef = useRef(null);
  // useMutation({ onSuccess })에 준 콜백은 이 컴포넌트가 언마운트된 뒤에도 실행된다(TanStack
  // Query가 컴포넌트 생명주기와 무관하게 mutation을 완주시키기 때문). 이미 언마운트된 뒤 늦게
  // 도착한 응답이 setQueryData로 캐시를 새로 만들면, 그 새 엔트리는 이 화면이 useQuery에 준
  // gcTime: 0을 못 받고(setQueryData 인자에 안 실림) 기본 gcTime(5분)으로 생성돼 비공개
  // 원문이 그만큼 남는다. 이 플래그로 그 시점을 판별해 캐시 쓰기만 건너뛴다.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    gcTime: 0,
  });

  // 사용자가 명시적으로 연 회기(detailSessionId)에 한해서만 전용 GET을 호출한다.
  // gcTime: 0 — 이 쿼리를 관찰하는 컴포넌트가 사라지는 즉시 캐시에서 제거한다. 닫기 핸들러의
  // removeQueries가 닿지 못하는 경로(닫지 않고 다른 메뉴로 이동해 화면이 언마운트되는 경우)에서도
  // 비공개 원문이 기본 gcTime(5분) 동안 캐시에 남지 않게 한다. 원문은 매번 명시적으로 다시 조회한다.
  const {
    data: privateRecord,
    isLoading: privateRecordLoading,
    isError: privateRecordIsError,
    error: privateRecordError,
  } = useQuery({
    queryKey: counselingPrivateRecordQueryKey(detailSessionId),
    queryFn: () => fetchCounselingPrivateRecord(detailSessionId),
    enabled: privateRecordOpen && detailSessionId !== null,
    gcTime: 0,
    retry: false,
  });

  // 서버 초안을 최초 1회만 textarea에 반영한다(위 privateContentSeededRef 설명 참고).
  // 이 effect는 seed effect보다 먼저 실행되어야 한다. B query data가 이미 준비돼도 A의
  // seeded 상태를 먼저 비워 B 원문을 textarea에 넣고, 이전 회기의 민감한 query를 제거한다.
  useEffect(() => {
    const previousSessionId = previousDetailSessionIdRef.current;

    if (previousSessionId !== null && previousSessionId !== detailSessionId) {
      queryClient.removeQueries({ queryKey: counselingPrivateRecordQueryKey(previousSessionId) });
    }

    if (previousSessionId !== detailSessionId) {
      setPrivateContentInput('');
      setPrivateRecordFormError('');
      setConfirmPrivateRecordOpen(false);
      privateContentSeededRef.current = false;
    }

    previousDetailSessionIdRef.current = detailSessionId;
  }, [detailSessionId, queryClient]);

  useEffect(() => {
    const privateRecordSeed = getPrivateRecordSeed({
      privateRecordOpen,
      privateRecord,
      detailSessionId,
      seeded: privateContentSeededRef.current,
    });

    if (privateRecordSeed !== undefined) {
      setPrivateContentInput(privateRecordSeed);
      privateContentSeededRef.current = true;
    }
  }, [detailSessionId, privateRecordOpen, privateRecord]);

  // 페이지·필터별로 나뉜 회기 목록 캐시를 접두사만으로 한 번에 무효화한다(TanStack Query는
  // queryKey가 이 배열로 시작하는 모든 캐시를 대상으로 삼는다).
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

  // 비공개 기록 영역만 닫는다(상세 모달은 유지). 캐시와 로컬 입력값을 함께 지워
  // 다음에 다시 열었을 때 이전 세션의 원문이 잠깐이라도 남아있지 않게 한다.
  const closePrivateRecord = () => {
    if (detailSessionId !== null) {
      queryClient.removeQueries({ queryKey: counselingPrivateRecordQueryKey(detailSessionId) });
    }
    setPrivateRecordOpen(false);
    setPrivateContentInput('');
    setPrivateRecordFormError('');
    setConfirmPrivateRecordOpen(false);
    privateContentSeededRef.current = false;
  };

  const openPrivateRecord = () => {
    privateContentSeededRef.current = false;
    setPrivateRecordFormError('');
    setPrivateRecordOpen(true);
  };

  const closeDetail = () => {
    if (detailSessionId !== null) {
      // 학생 식별 정보가 포함된 상세를 캐시에 남겨두지 않는다.
      queryClient.removeQueries({ queryKey: counselingSessionDetailQueryKey(detailSessionId) });
      queryClient.removeQueries({ queryKey: counselingPrivateRecordQueryKey(detailSessionId) });
    }
    setDetailSessionId(null);
    resetForms();
    setPrivateRecordOpen(false);
    setPrivateContentInput('');
    setPrivateRecordFormError('');
    setConfirmPrivateRecordOpen(false);
    privateContentSeededRef.current = false;
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

  const onFollowUpError = (mutationError) => {
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
    onActionError(mutationError);
  };

  const followUpMutation = useMutation({
    mutationFn: ({ assignmentId, request }) => createFollowUpSession(assignmentId, request),
    onSuccess: () => {
      invalidateList();
      invalidateDetail();
      toast('후속 회기가 생성되었습니다.', 'success');
      resetForms();
    },
    onError: onFollowUpError,
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

  // [회귀 방지 불변식] 회기 A의 저장·확정 요청이 응답하는 시점에 사용자가 이미 회기 B를 열어
  // 두었다면(A 요청 중 footer 닫기는 막혀 있지만, 응답 자체가 늦게 온 경우까지 이중으로 방어),
  // A의 응답은 B의 화면(입력값·토스트·모달)을 절대 건드리면 안 된다. 이 함수 하나가 그 판정을
  // 전담하므로, 아래 두 mutation의 어떤 콜백이든 "화면을 바꾸기 전에 반드시 이 함수를 거쳤는가"만
  // 코드를 읽어 확인하면 이 불변식이 지켜지는지 정적으로 검증할 수 있다.
  // Query 캐시도 현재 열린 회기와 비공개 영역이 유효한 경우에만 갱신한다.
  const isPrivateRecordScreenFor = (requestSessionId) =>
    shouldApplyPrivateRecordMutationSuccess({
      isMounted: isMountedRef.current,
      requestSessionId,
      ...privateRecordViewRef.current,
    });

  // 비공개 기록 저장·확정 오류를 공통 분기한다. requestSessionId는 이 오류를 낸 요청이 대상으로
  // 삼은 회기다(최신 detailSessionId가 아니라 요청 변수에서 받는다).
  // S009(충돌)는 사용자 실수가 아니라 서버 상태가 바뀐 것이므로 최신 canSaveDraft/canConfirm/
  // recordStatus만 다시 받아오고 로컬 입력은 지우지 않는다. 권한·존재 오류는 영역을 닫는다.
  const onPrivateRecordMutationError = (mutationError, requestSessionId) => {
    // 캐시 무효화는 요청 회기 기준이라 지금 어떤 회기가 열려 있든 안전하다.
    // 반면 토스트·영역 닫기 같은 화면 조작은 isPrivateRecordScreenFor를 거친 뒤에만 한다.
    if (mutationError instanceof ApiError && mutationError.code === COUNSELING_SESSION_ERROR_CODE.CONFLICT) {
      queryClient.invalidateQueries({ queryKey: counselingPrivateRecordQueryKey(requestSessionId) });
      if (isPrivateRecordScreenFor(requestSessionId)) {
        toast(getPrivateRecordErrorMessage(mutationError), 'error');
      }
      return;
    }
    if (
      mutationError instanceof ApiError &&
      (mutationError.code === COUNSELING_SESSION_ERROR_CODE.FORBIDDEN ||
        mutationError.code === COUNSELING_SESSION_ERROR_CODE.SESSION_NOT_FOUND ||
        mutationError.code === COUNSELING_SESSION_ERROR_CODE.UNAUTHENTICATED)
    ) {
      if (isPrivateRecordScreenFor(requestSessionId)) {
        toast(getPrivateRecordErrorMessage(mutationError), 'error');
        closePrivateRecord();
      }
      return;
    }
    if (isPrivateRecordScreenFor(requestSessionId)) {
      setPrivateRecordFormError(getPrivateRecordErrorMessage(mutationError));
    }
  };

  const savePrivateRecordMutation = useMutation({
    mutationFn: ({ sessionId, privateContent }) =>
      saveCounselingPrivateRecord(sessionId, { privateContent }),
    // 캐시는 요청이 대상으로 한 sessionId(variables.sessionId)에 귀속한다. 최신 클로저
    // detailSessionId를 쓰면 늦은 응답이 지금 열린 다른 회기 캐시를 덮어쓸 수 있다.
    onSuccess: (data, { sessionId }) => {
      // 회기 목록·상세 캐시는 건드리지 않는다(원문이 섞이지 않아야 한다). 비공개 query만 갱신한다.
      // 언마운트 후에는 쓰지 않는다 — isMountedRef 선언부 주석 참고(gcTime: 0을 못 받는 새
      // 엔트리가 생겨 원문이 기본 gcTime(5분)만큼 캐시에 남는 것을 막는다).
      if (!isPrivateRecordScreenFor(sessionId)) return;

      const queryUpdated = updatePrivateRecordQueryIfPresent(
        queryClient,
        counselingPrivateRecordQueryKey(sessionId),
        data,
      );

      if (!queryUpdated) return;
      setPrivateContentInput(data.privateContent ?? '');
      toast('비공개 기록을 임시저장했습니다.', 'success');
    },
    onError: (mutationError, { sessionId }) =>
      onPrivateRecordMutationError(mutationError, sessionId),
  });

  const confirmPrivateRecordMutation = useMutation({
    // 확정 요청 변수는 sessionId 스칼라 하나다(저장과 시그니처가 다르다).
    mutationFn: (sessionId) => confirmCounselingPrivateRecord(sessionId),
    onSuccess: (data, sessionId) => {
      // 언마운트 후에는 쓰지 않는다 — savePrivateRecordMutation.onSuccess와 같은 이유.
      if (!isPrivateRecordScreenFor(sessionId)) return;

      const queryUpdated = updatePrivateRecordQueryIfPresent(
        queryClient,
        counselingPrivateRecordQueryKey(sessionId),
        data,
      );

      if (!queryUpdated) return;
      setConfirmPrivateRecordOpen(false);
      toast('비공개 기록을 확정했습니다.', 'success');
    },
    onError: (mutationError, sessionId) => {
      if (isPrivateRecordScreenFor(sessionId)) {
        setConfirmPrivateRecordOpen(false);
      }
      onPrivateRecordMutationError(mutationError, sessionId);
    },
  });

  const submitSavePrivateRecord = () => {
    const trimmed = privateContentInput.trim();
    if (!trimmed) {
      setPrivateRecordFormError('비공개 기록 원문을 입력해 주세요.');
      return;
    }
    if (trimmed.length > PRIVATE_RECORD_MAX_LENGTH) {
      setPrivateRecordFormError('비공개 기록은 10,000자 이내로 입력해 주세요.');
      return;
    }
    setPrivateRecordFormError('');
    savePrivateRecordMutation.mutate({ sessionId: detailSessionId, privateContent: trimmed });
  };

  // 요청 진행 중에는 모달을 닫지 못하게 해 처리 결과(성공 토스트·오류 메시지)를 놓치지 않게 한다.
  const isMutating =
    followUpMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    savePrivateRecordMutation.isPending ||
    confirmPrivateRecordMutation.isPending;

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

            {/* 비공개 상담 기록 — 버튼을 눌러야만 전용 GET이 나간다(3.6절 명시적 열람 경계). */}
            <div className="border-t border-[#E5E7EB] pt-3">
              {!privateRecordOpen ? (
                <Button variant="outline" size="sm" onClick={openPrivateRecord}>
                  비공개 기록 열기
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#656D76]">비공개 상담 기록</span>
                    <button
                      type="button"
                      onClick={closePrivateRecord}
                      disabled={savePrivateRecordMutation.isPending || confirmPrivateRecordMutation.isPending}
                      className="text-[10px] text-[#9AA0A6] hover:text-[#374151] disabled:opacity-50"
                    >
                      닫기
                    </button>
                  </div>

                  {privateRecordLoading ? (
                    <p className="text-center text-[12px] text-[#656D76] py-3">
                      불러오는 중입니다.
                    </p>
                  ) : privateRecordIsError ? (
                    <p className="text-[12px] text-[#CF222E]" role="alert">
                      {getPrivateRecordErrorMessage(privateRecordError)}
                    </p>
                  ) : !privateRecord ? null : privateRecord.recordStatus ===
                    COUNSELING_PRIVATE_RECORD_STATUS.CONFIRMED ? (
                    <div className="p-3 rounded-[8px] bg-[#F0FDF4] border border-[#BBF7D0]">
                      <p className="text-[10px] font-semibold text-[#166534] mb-1">
                        확정됨 · {formatKstDateTime(privateRecord.confirmedAt)}
                      </p>
                      {/* dangerouslySetInnerHTML 금지 — 줄바꿈은 CSS로만 보존한다 */}
                      <p className="text-[12px] text-[#1F2328] whitespace-pre-wrap">
                        {privateRecord.privateContent}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="privateContentInput"
                        className="block text-[11px] font-semibold text-[#656D76]"
                      >
                        비공개 기록 원문 <span className="text-[#CF222E]">*</span>
                      </label>
                      <textarea
                        id="privateContentInput"
                        value={privateContentInput}
                        onChange={(e) => setPrivateContentInput(e.target.value)}
                        rows={6}
                        maxLength={PRIVATE_RECORD_MAX_LENGTH}
                        placeholder="담당 상담사만 볼 수 있는 비공개 상담 기록을 입력하세요."
                        disabled={savePrivateRecordMutation.isPending}
                        aria-invalid={!!privateRecordFormError}
                        aria-describedby={privateRecordFormError ? 'privateRecordFormError' : undefined}
                        className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
                      />
                      <p className="text-[10px] text-[#9AA0A6] text-right">
                        {privateContentInput.length}/{PRIVATE_RECORD_MAX_LENGTH}자
                      </p>
                      {privateRecordFormError && (
                        <p
                          id="privateRecordFormError"
                          role="alert"
                          className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
                        >
                          ⚠ {privateRecordFormError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!privateRecord.canSaveDraft}
                          loading={savePrivateRecordMutation.isPending}
                          onClick={submitSavePrivateRecord}
                        >
                          임시저장
                        </Button>
                        <Button
                          size="sm"
                          // 저장 요청이 도는 동안 확정을 막는다. 확정은 원문을 받지 않고
                          // "지금 서버에 저장된 초안"을 그대로 확정하므로, 저장 완료 전에
                          // 확정이 먼저 처리되면 방금 입력한 내용이 아니라 그 이전 초안이
                          // 영구 확정되고(정정 기능 없음) 뒤이은 저장은 충돌로 실패한다.
                          // 반대 방향(확정 다이얼로그가 떠 있는 동안 저장 클릭)은 Modal의
                          // 풀스크린 backdrop이 저장 버튼을 가려 이미 막혀 있어 별도 처리가
                          // 필요 없다.
                          disabled={!privateRecord.canConfirm || savePrivateRecordMutation.isPending}
                          loading={confirmPrivateRecordMutation.isPending}
                          onClick={() => setConfirmPrivateRecordOpen(true)}
                        >
                          확정
                        </Button>
                      </div>
                      <p className="text-[10px] text-[#9AA0A6]">
                        저장·확정 가능 여부는 서버가 판단한 값을 그대로 따릅니다. 확정 후에는
                        수정할 수 없습니다.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 확정 확인 — 원문 없이 확정 여부만 다시 묻는다(본문에 원문을 재전송하지 않는다). */}
      <ConfirmDialog
        open={confirmPrivateRecordOpen}
        title="비공개 기록 확정"
        message="비공개 기록을 확정하시겠습니까? 확정 후에는 수정하거나 다시 확정할 수 없습니다."
        confirmLabel="확정"
        loading={confirmPrivateRecordMutation.isPending}
        onConfirm={() => confirmPrivateRecordMutation.mutate(detailSessionId)}
        onCancel={() => !confirmPrivateRecordMutation.isPending && setConfirmPrivateRecordOpen(false)}
      />
    </div>
  );
}
