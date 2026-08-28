import { useCallback, useEffect, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, ConfirmDialog, Modal, Pagination, StatusBadge, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  completeCounselingWithPublicResult,
  correctCounselorPublicResult,
  counselingSessionsQueryKey,
  counselorPublicResultHistoryQueryKey,
  counselorPublicResultQueryKey,
  fetchCounselingSessions,
  getCounselorPublicResult,
  getCounselorPublicResultHistory,
  publishCounselorPublicResult,
  saveCounselorPublicResult,
  studentCounselingResultDetailQueryKey,
} from '@/api/counsel';
import {
  COUNSELING_PUBLIC_RESULT_ERROR_CODE,
  COUNSELING_PUBLIC_RESULT_STATUS,
  COUNSELING_PUBLIC_RESULT_STATUS_LABEL,
  COUNSELING_SESSION_ATTENDANCE_STATUS,
  COUNSELING_SESSION_ATTENDANCE_STATUS_LABEL,
  COUNSELING_SESSION_ERROR_CODE,
  COUNSELING_SESSION_STATUS,
  COUNSELING_SESSION_STATUS_LABEL,
} from '@/constants/domain';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)
const PAGE_SIZE = 20;
const SUMMARY_MAX_LENGTH = 3000;
const ACTION_PLAN_MAX_LENGTH = 3000;
const CORRECTION_REASON_MAX_LENGTH = 500;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
// 서버 정규화와 같은 규칙(trim 후 빈 값이면 null)으로 클라이언트 무변경 사전 검사를 한다.
// 서버가 실제 저장 시점에 같은 규칙으로 다시 검사하므로 이 값은 사용자 경험용 사전 안내일 뿐이다.
const normalizeActionPlanForCompare = (value) => value?.trim?.() || null;

// 서버가 준 Instant(UTC)를 한국 시간(Asia/Seoul)으로 표시한다. SessionRecord와 동일한 방식이다.
function formatKstDateTime(instant) {
  if (!instant) return '-';
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '-';
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}

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

const RESULT_STATUS_BADGE_VARIANT = {
  [COUNSELING_PUBLIC_RESULT_STATUS.EMPTY]: 'neutral',
  [COUNSELING_PUBLIC_RESULT_STATUS.DRAFT]: 'warning',
  [COUNSELING_PUBLIC_RESULT_STATUS.PUBLISHED]: 'success',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: COUNSELING_SESSION_STATUS.PLANNED, label: COUNSELING_SESSION_STATUS_LABEL.PLANNED },
  { value: COUNSELING_SESSION_STATUS.COMPLETED, label: COUNSELING_SESSION_STATUS_LABEL.COMPLETED },
  { value: COUNSELING_SESSION_STATUS.CANCELED, label: COUNSELING_SESSION_STATUS_LABEL.CANCELED },
];

function getPublicResultErrorMessage(error) {
  if (!(error instanceof ApiError))
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  const { code } = error;
  if (code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN)
    return '이 회기의 공개 결과에 접근할 권한이 없습니다.';
  if (code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.SESSION_NOT_FOUND)
    return '해당 회기를 찾을 수 없습니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.STATE_CONFLICT)
    return '현재 상태에서는 처리할 수 없습니다. 최신 상태를 다시 불러왔습니다.';
  if (code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.INVALID_INPUT)
    return '입력값을 다시 확인해 주세요.';
  return '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

function getSessionListErrorMessage(error) {
  if (!(error instanceof ApiError))
    return '회기 목록을 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  const { code } = error;
  if (code === COUNSELING_SESSION_ERROR_CODE.UNAUTHENTICATED)
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  if (code === COUNSELING_SESSION_ERROR_CODE.FORBIDDEN)
    return '회기 목록을 조회할 권한이 없습니다. 활성 상담사 계정인지 확인해 주세요.';
  if (code === COUNSELING_SESSION_ERROR_CODE.INVALID_INPUT)
    return '회기 목록 조회 조건을 확인해 주세요.';
  return '회기 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

// setQueryData는 대상 Query가 없으면 새 캐시를 만들 수 있다. 이 화면(또는 이 회기)이 이미
// 닫혔다면 새로 만들지 않고, 지금 보고 있는 Query만 최신 응답으로 갱신한다.
function updateQueryIfPresent(queryClient, queryKey, data) {
  const query = queryClient.getQueryCache().find({ queryKey, exact: true });
  if (!query) return false;
  queryClient.setQueryData(queryKey, data);
  return true;
}

function handleResultModalKeyDown(event, modalElement, isPending, requestClose) {
  if (event.key === 'Escape') {
    event.preventDefault();
    if (!isPending) requestClose();
    return;
  }

  if (event.key !== 'Tab' || !modalElement) return;

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

/**
 * 상담사가 담당 회기의 공개 상담 결과(학생에게 보이는 요약·실행계획)를 조회·저장·일반 공개하고,
 * 마지막 출석 완료 회기 결과로 예약을 최종 완료하는 화면이다. 비공개 상담 기록 원문은 이 화면에
 * 없다(SessionRecord 전용). 이미 공개된 최신 버전을 정정(체크리스트 10번)하고 전체 버전 이력을
 * 확인하는 기능도 이 화면에서 처리한다. 정정은 기존 행을 수정하지 않고 새 버전을 즉시 공개하며,
 * 서버가 계산한 canCorrect를 최종 기준으로 삼는다.
 */
export default function SessionResult() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // 로컬 입력값 — 컴포넌트 메모리에만 둔다. Zustand·localStorage·URL에 저장하지 않는다.
  const [summaryInput, setSummaryInput] = useState('');
  const [planInput, setPlanInput] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);

  // 정정 모달 상태 — 모두 컴포넌트 메모리에만 둔다. 정정 사유·요약·실행계획을 저장소·URL에 담지 않는다.
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionSummary, setCorrectionSummary] = useState('');
  const [correctionPlan, setCorrectionPlan] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionError, setCorrectionError] = useState('');
  const [correctionFieldError, setCorrectionFieldError] = useState('');
  // 모달을 연 시점(또는 충돌 후 사용자가 최신 버전으로 갱신한 시점)의 기준 버전·요약·실행계획.
  // 결과 쿼리가 그 사이 다시 조회돼도 이 값은 자동으로 덮어쓰지 않는다 — 사용자가 명시적으로
  // '최신 버전 기준으로 계속'을 눌렀을 때만 바꾼다.
  const [correctionBase, setCorrectionBase] = useState(null);
  // S010(버전 충돌) 발생 시 다시 읽어온 최신 서버 결과. 비교 화면 용도로만 쓰고 자동 반영하지 않는다.
  const [conflictLatest, setConflictLatest] = useState(null);

  // 이력 모달 상태 — 열렸을 때만 조회한다(useQuery의 enabled로 제어).
  const [historyOpen, setHistoryOpen] = useState(false);

  const modalContentRef = useRef(null);
  const resultTriggerRef = useRef(null);
  const restoreResultTriggerFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (resultTriggerRef.current?.isConnected) {
        resultTriggerRef.current.focus();
      }
    });
  }, []);

  // 정정·이력 모달도 공개 결과 모달과 같은 이유로 각자 트리거 버튼을 기억해둔다. 모달이 닫힌
  // 뒤 포커스를 되돌려주지 않으면, 키보드·스크린리더 사용자는 포커스가 배경(body)으로 빠져
  // "지금 화면 어디에 있는지" 다시 처음부터 찾아야 한다.
  const correctionContentRef = useRef(null);
  const correctionTriggerRef = useRef(null);
  const restoreCorrectionTriggerFocus = useCallback(() => {
    const correctionTrigger = correctionTriggerRef.current;
    correctionTriggerRef.current = null;
    window.requestAnimationFrame(() => {
      if (correctionTrigger?.isConnected) {
        correctionTrigger.focus();
      }
    });
  }, []);

  const historyContentRef = useRef(null);
  const historyTriggerRef = useRef(null);
  const restoreHistoryTriggerFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (historyTriggerRef.current?.isConnected) {
        historyTriggerRef.current.focus();
      }
    });
  }, []);

  // 서버 초안을 한 번만 입력창에 채운다. 이후 같은 회기에서 재조회(예: 충돌 재검증)가 와도
  // 사용자가 입력 중인 값을 덮어쓰지 않기 위한 플래그다(SessionRecord 비공개 기록과 동일한 이유).
  const seededRef = useRef(false);
  const previousSessionIdRef = useRef(null);
  // mutation 콜백은 이 컴포넌트가 언마운트된 뒤에도 실행될 수 있다. 늦게 도착한 응답이 다른
  // 회기 화면이나 이미 닫힌 화면을 건드리지 않도록 최신 상태를 ref로 판별한다.
  const selectedSessionIdRef = useRef(null);
  selectedSessionIdRef.current = selectedSessionId;
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
    refetch: refetchSessions,
    isPlaceholderData,
  } = useQuery({
    queryKey: counselingSessionsQueryKey(page, statusFilter),
    queryFn: () =>
      fetchCounselingSessions({ page, size: PAGE_SIZE, sessionStatus: statusFilter || undefined }),
    retry: false,
    placeholderData: keepPreviousData,
  });

  // 사용자가 목록에서 선택한 회기의 공개 결과만 조회한다. gcTime: 0 — 화면을 벗어나면 즉시
  // 캐시에서 제거해 공개 요약·실행계획이 기본 gcTime(5분) 동안 남지 않게 한다.
  const {
    data: publicResult,
    isLoading: resultLoading,
    isError: resultIsError,
    error: resultError,
  } = useQuery({
    queryKey: counselorPublicResultQueryKey(selectedSessionId),
    queryFn: () => getCounselorPublicResult(selectedSessionId),
    enabled: selectedSessionId !== null,
    gcTime: 0,
    retry: false,
  });

  // 이력은 사용자가 '이력 보기'를 눌러 historyOpen이 true가 됐을 때만 조회한다(자동 조회 금지).
  // gcTime: 0 — 닫으면 아래 클로즈 핸들러에서 즉시 캐시를 제거하므로 남는 잔여 시간을 두지 않는다.
  const {
    data: historyItems,
    isLoading: historyLoading,
    isError: historyIsError,
    error: historyError,
  } = useQuery({
    queryKey: counselorPublicResultHistoryQueryKey(selectedSessionId),
    queryFn: () => getCounselorPublicResultHistory(selectedSessionId),
    enabled: historyOpen && selectedSessionId !== null,
    gcTime: 0,
    retry: false,
  });

  // useCallback으로 감싸 아래 Escape 키 트랩 useEffect의 의존성 배열에 안전하게 넣는다
  // (매 렌더마다 새 함수가 되면 keydown 리스너가 불필요하게 매번 재등록된다).
  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
    if (selectedSessionId !== null) {
      queryClient.removeQueries({ queryKey: counselorPublicResultHistoryQueryKey(selectedSessionId) });
    }
    restoreHistoryTriggerFocus();
  }, [selectedSessionId, queryClient, restoreHistoryTriggerFocus]);

  const isEditableStatus =
    publicResult?.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.EMPTY ||
    publicResult?.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.DRAFT;

  // 회기를 바꾸면 이전 회기의 공개 결과 캐시를 지우고 입력값을 초기화한다.
  useEffect(() => {
    const previousSessionId = previousSessionIdRef.current;
    if (previousSessionId !== null && previousSessionId !== selectedSessionId) {
      queryClient.removeQueries({ queryKey: counselorPublicResultQueryKey(previousSessionId) });
    }
    if (previousSessionId !== selectedSessionId) {
      setSummaryInput('');
      setPlanInput('');
      setFormError('');
      setConfirmPublishOpen(false);
      setConfirmCompleteOpen(false);
      seededRef.current = false;
      // 회기를 바꾸면 이전 회기의 정정 입력·충돌 비교값과 이력 열람 상태도 모두 지운다.
      setCorrectionOpen(false);
      setCorrectionSummary('');
      setCorrectionPlan('');
      setCorrectionReason('');
      setCorrectionError('');
      setCorrectionFieldError('');
      setCorrectionBase(null);
      setConflictLatest(null);
      setHistoryOpen(false);
      if (previousSessionId !== null) {
        queryClient.removeQueries({ queryKey: counselorPublicResultHistoryQueryKey(previousSessionId) });
      }
    }
    previousSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId, queryClient]);

  useEffect(() => {
    const isAccessError =
      resultError instanceof ApiError &&
      (resultError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN ||
        resultError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.SESSION_NOT_FOUND);

    if (!resultIsError || !isAccessError || selectedSessionId === null) return;

    queryClient.removeQueries({ queryKey: counselorPublicResultQueryKey(selectedSessionId) });
    queryClient.invalidateQueries({ queryKey: ['counselingSessions'] });
    setSelectedSessionId(null);
    restoreResultTriggerFocus();
  }, [resultIsError, resultError, selectedSessionId, queryClient, restoreResultTriggerFocus]);

  // 서버 응답을 최초 1회만 입력창에 반영한다.
  useEffect(() => {
    if (
      selectedSessionId === null ||
      !publicResult ||
      publicResult.sessionId !== selectedSessionId ||
      seededRef.current
    ) {
      return;
    }
    if (
      publicResult.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.EMPTY ||
      publicResult.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.DRAFT
    ) {
      setSummaryInput(publicResult.resultSummary ?? '');
      setPlanInput(publicResult.actionPlan ?? '');
    }
    seededRef.current = true;
  }, [selectedSessionId, publicResult]);

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['counselingSessions'] });

  const closeModal = useCallback(() => {
    if (selectedSessionId !== null) {
      queryClient.removeQueries({ queryKey: counselorPublicResultQueryKey(selectedSessionId) });
    }
    setSelectedSessionId(null);
    restoreResultTriggerFocus();
  }, [selectedSessionId, queryClient, restoreResultTriggerFocus]);

  // 늦게 도착한 응답이 이미 닫힌 화면이나 다른 회기 화면을 건드리지 않도록 판별한다.
  const isResultScreenFor = (requestSessionId) =>
    isMountedRef.current && requestSessionId === selectedSessionIdRef.current;

  // 저장·공개·완료 오류를 공통 분기한다. S010(충돌)은 로컬 입력을 지우지 않고 최신 서버 상태만
  // 다시 받아온다. FORBIDDEN·SESSION_NOT_FOUND는 존재 여부를 숨기기 위해 화면을 닫는다.
  const onMutationError = (mutationError, requestSessionId, action) => {
    if (
      mutationError instanceof ApiError &&
      mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.STATE_CONFLICT
    ) {
      queryClient.invalidateQueries({ queryKey: counselorPublicResultQueryKey(requestSessionId) });
      if (isResultScreenFor(requestSessionId)) {
        toast(getPublicResultErrorMessage(mutationError), 'error');
        if (action === 'publish') setConfirmPublishOpen(false);
        if (action === 'complete') setConfirmCompleteOpen(false);
      }
      return;
    }
    if (
      mutationError instanceof ApiError &&
      (mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN ||
        mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.SESSION_NOT_FOUND)
    ) {
      invalidateList();
      if (isResultScreenFor(requestSessionId)) {
        toast(getPublicResultErrorMessage(mutationError), 'error');
        closeModal();
      }
      return;
    }
    if (isResultScreenFor(requestSessionId)) {
      setFormError(getPublicResultErrorMessage(mutationError));
      if (action === 'publish') setConfirmPublishOpen(false);
      if (action === 'complete') setConfirmCompleteOpen(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: ({ sessionId, resultSummary, actionPlan }) =>
      saveCounselorPublicResult(sessionId, { resultSummary, actionPlan }),
    onSuccess: (data, { sessionId }) => {
      if (!isResultScreenFor(sessionId)) return;
      const updated = updateQueryIfPresent(queryClient, counselorPublicResultQueryKey(sessionId), data);
      if (!updated) return;
      setSummaryInput(data.resultSummary ?? '');
      setPlanInput(data.actionPlan ?? '');
      setFormError('');
      toast('공개 결과를 임시저장했습니다.', 'success');
    },
    onError: (mutationError, { sessionId }) => onMutationError(mutationError, sessionId, 'save'),
  });

  // 일반 공개는 예약 상태를 바꾸지 않는다 — 성공해도 목록의 예약·회기 상태를 건드리지 않고
  // 이 결과와(가능하면) 학생 쪽 결과 조회만 무효화한다.
  const publishMutation = useMutation({
    mutationFn: (sessionId) => publishCounselorPublicResult(sessionId),
    onSuccess: (data, sessionId) => {
      // 페이지별로 나뉜 학생 결과 목록 캐시를 접두사만으로 한 번에 무효화한다.
      queryClient.invalidateQueries({ queryKey: ['studentCounselingResults'] });
      queryClient.invalidateQueries({ queryKey: studentCounselingResultDetailQueryKey(sessionId) });
      if (!isResultScreenFor(sessionId)) return;
      updateQueryIfPresent(queryClient, counselorPublicResultQueryKey(sessionId), data);
      setConfirmPublishOpen(false);
      toast('결과를 공개했습니다. 예약은 계속 진행 중입니다.', 'success');
    },
    onError: (mutationError, sessionId) => onMutationError(mutationError, sessionId, 'publish'),
  });

  // 최종 완료는 예약을 COMPLETED로 만들고 활성 배정을 종료할 수 있으므로 회기 목록도
  // 다시 읽어야 한다. 성공 응답을 받은 뒤에만 반영한다(낙관적 업데이트 금지).
  const completeMutation = useMutation({
    mutationFn: (sessionId) => completeCounselingWithPublicResult(sessionId),
    onSuccess: (data, sessionId) => {
      invalidateList();
      // 페이지별로 나뉜 학생 결과 목록 캐시를 접두사만으로 한 번에 무효화한다.
      queryClient.invalidateQueries({ queryKey: ['studentCounselingResults'] });
      queryClient.invalidateQueries({ queryKey: studentCounselingResultDetailQueryKey(sessionId) });
      if (!isResultScreenFor(sessionId)) return;
      updateQueryIfPresent(queryClient, counselorPublicResultQueryKey(sessionId), data);
      setConfirmCompleteOpen(false);
      toast('상담이 완료 처리되었습니다.', 'success');
    },
    onError: (mutationError, sessionId) => onMutationError(mutationError, sessionId, 'complete'),
  });

  // 정정은 낙관적 업데이트를 하지 않는다 — 서버가 만든 새 버전(v+1)을 성공 응답으로 받은
  // 뒤에만 화면에 반영한다. 실패 코드별 처리는 아래 onError에서 분기한다.
  const resetCorrectionModal = useCallback(() => {
    setCorrectionOpen(false);
    setCorrectionSummary('');
    setCorrectionPlan('');
    setCorrectionReason('');
    setCorrectionError('');
    setCorrectionFieldError('');
    setCorrectionBase(null);
    setConflictLatest(null);
    restoreCorrectionTriggerFocus();
  }, [restoreCorrectionTriggerFocus]);

  const correctMutation = useMutation({
    mutationFn: ({ sessionId, expectedVersionNo, resultSummary, actionPlan, correctionReason: reason }) =>
      correctCounselorPublicResult(sessionId, {
        expectedVersionNo,
        resultSummary,
        actionPlan,
        correctionReason: reason,
      }),
    onSuccess: (data, { sessionId }) => {
      if (!isResultScreenFor(sessionId)) return;
      updateQueryIfPresent(queryClient, counselorPublicResultQueryKey(sessionId), data);
      // 이력·학생 쪽 캐시도 함께 무효화해 다음 조회에서 정정된 최신 버전을 읽게 한다.
      queryClient.invalidateQueries({ queryKey: counselorPublicResultHistoryQueryKey(sessionId) });
      queryClient.invalidateQueries({ queryKey: ['studentCounselingResults'] });
      queryClient.invalidateQueries({ queryKey: studentCounselingResultDetailQueryKey(sessionId) });
      resetCorrectionModal();
      toast('결과를 정정했습니다.', 'success');
    },
    onError: async (mutationError, { sessionId }) => {
      if (!isResultScreenFor(sessionId)) return;
      if (
        mutationError instanceof ApiError &&
        mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.NO_CHANGES
      ) {
        // 서버가 최종 판단한 무변경 거절. 사용자 입력은 그대로 두고 인라인 오류만 보여준다.
        setCorrectionError('수정한 내역이 없습니다.');
        return;
      }
      if (
        mutationError instanceof ApiError &&
        mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.STATE_CONFLICT
      ) {
        // 다른 요청이 먼저 정정해 기준 버전이 낡았다. 작성 중인 내용은 지우지 않고 최신 서버
        // 결과를 다시 읽어와 비교 화면에 보여준다. 자동 재제출은 하지 않는다.
        try {
          const latest = await getCounselorPublicResult(sessionId);
          if (!isResultScreenFor(sessionId)) return;
          setConflictLatest(latest);
          setCorrectionError('다른 요청이 먼저 이 결과를 정정했습니다. 최신 내용을 확인한 뒤 계속하세요.');
        } catch {
          if (!isResultScreenFor(sessionId)) return;
          setCorrectionError('최신 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
        return;
      }
      if (
        mutationError instanceof ApiError &&
        (mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN ||
          mutationError.code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.SESSION_NOT_FOUND)
      ) {
        // 존재 여부를 숨기는 접근 오류다. 기존 결과 화면의 처리(목록 무효화·화면 닫기)를 그대로 쓴다.
        setCorrectionOpen(false);
        onMutationError(mutationError, sessionId, 'correct');
        return;
      }
      setCorrectionError(getPublicResultErrorMessage(mutationError));
    },
  });

  // 정정 모달을 연다. 이 시점의 최신 버전·요약·실행계획을 기준값으로 고정한다 — 이후 결과
  // 쿼리가 다시 조회돼도(예: 다른 탭에서 정정) 이 기준은 사용자가 명시적으로 갱신하기 전까지 그대로 둔다.
  const openCorrectionModal = (triggerElement) => {
    if (!publicResult || publicResult.resultStatus !== COUNSELING_PUBLIC_RESULT_STATUS.PUBLISHED) return;
    correctionTriggerRef.current = triggerElement ?? null;
    setCorrectionBase({
      versionNo: publicResult.versionNo,
      resultSummary: publicResult.resultSummary,
      actionPlan: publicResult.actionPlan,
    });
    setCorrectionSummary(publicResult.resultSummary ?? '');
    setCorrectionPlan(publicResult.actionPlan ?? '');
    setCorrectionReason('');
    setCorrectionError('');
    setCorrectionFieldError('');
    setConflictLatest(null);
    setCorrectionOpen(true);
  };

  // 정정 모달을 닫는다. 요청 중에는 닫지 않아 중복 제출·조용한 데이터 유실을 막는다.
  // 백드롭 클릭·X 버튼·Escape 키가 모두 이 함수 하나로 들어오므로 여기서만 트리거 포커스를
  // 복원하면 세 가지 닫기 경로 모두 동일하게 처리된다.
  // 위 closeHistory와 같은 이유로 useCallback을 쓴다.
  const closeCorrectionModal = useCallback(() => {
    if (correctMutation.isPending) return;
    resetCorrectionModal();
  }, [correctMutation.isPending, resetCorrectionModal]);

  const submitCorrection = () => {
    if (!correctionBase || selectedSessionId === null) return;
    setCorrectionFieldError('');
    const trimmedSummary = correctionSummary.trim();
    if (!trimmedSummary) {
      setCorrectionFieldError('summary');
      setCorrectionError('공개 요약을 입력해 주세요.');
      return;
    }
    if (trimmedSummary.length > SUMMARY_MAX_LENGTH) {
      setCorrectionFieldError('summary');
      setCorrectionError(`공개 요약은 ${SUMMARY_MAX_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`);
      return;
    }
    const normalizedPlan = normalizeActionPlanForCompare(correctionPlan);
    if (normalizedPlan && normalizedPlan.length > ACTION_PLAN_MAX_LENGTH) {
      setCorrectionFieldError('plan');
      setCorrectionError(`실행 계획은 ${ACTION_PLAN_MAX_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`);
      return;
    }
    const trimmedReason = correctionReason.trim();
    if (!trimmedReason) {
      setCorrectionFieldError('reason');
      setCorrectionError('정정 사유를 입력해 주세요.');
      return;
    }
    if (trimmedReason.length > CORRECTION_REASON_MAX_LENGTH) {
      setCorrectionFieldError('reason');
      setCorrectionError(`정정 사유는 ${CORRECTION_REASON_MAX_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`);
      return;
    }
    // 클라이언트 무변경 사전 검사 — 사용자 경험용일 뿐 최종 판단은 서버 S012다. 기준값과
    // 완전히 같은 두 필드를 그대로 다시 보내는 헛된 요청을 미리 막는다.
    const baseSummary = (correctionBase.resultSummary ?? '').trim();
    const basePlan = normalizeActionPlanForCompare(correctionBase.actionPlan);
    if (trimmedSummary === baseSummary && normalizedPlan === basePlan) {
      setCorrectionError('수정한 내역이 없습니다.');
      return;
    }
    setCorrectionFieldError('');
    setCorrectionError('');
    correctMutation.mutate({
      sessionId: selectedSessionId,
      expectedVersionNo: correctionBase.versionNo,
      resultSummary: trimmedSummary,
      actionPlan: normalizedPlan,
      correctionReason: trimmedReason,
    });
  };

  // 충돌 비교 화면에서 사용자가 최신 버전을 확인한 뒤 계속 진행하기로 선택했을 때만 기준을
  // 갱신한다. 작성 중인 세 입력값은 그대로 유지하고, 자동으로 재제출하지 않는다.
  const acceptLatestVersionAfterConflict = () => {
    if (!conflictLatest) return;
    setCorrectionBase({
      versionNo: conflictLatest.versionNo,
      resultSummary: conflictLatest.resultSummary,
      actionPlan: conflictLatest.actionPlan,
    });
    // 기준을 갱신한 뒤 작성 중인 내용이 최신 서버 내용과 같아졌으면 무변경 사전 검사를 다시 적용한다.
    const baseSummary = (conflictLatest.resultSummary ?? '').trim();
    const basePlan = normalizeActionPlanForCompare(conflictLatest.actionPlan);
    const normalizedSummary = correctionSummary.trim();
    const normalizedPlan = normalizeActionPlanForCompare(correctionPlan);
    setConflictLatest(null);
    if (normalizedSummary === baseSummary && normalizedPlan === basePlan) {
      setCorrectionError('수정한 내역이 없습니다.');
    } else {
      setCorrectionError('');
    }
  };

  // 정정 요청이 진행 중일 때도 바깥 '공개 결과' 모달을 닫지 못하게 한다 — 닫으면 selectedSessionId가
  // null이 되어 이 회기의 캐시가 제거되는데, 그 사이 응답이 도착하면 이미 사라진 화면을 잘못
  // 되살리거나 무시되는 애매한 상태가 생길 수 있기 때문이다.
  const isMutating =
    saveMutation.isPending ||
    publishMutation.isPending ||
    completeMutation.isPending ||
    correctMutation.isPending;
  const isDraftDirty =
    isEditableStatus &&
    (summaryInput !== (publicResult.resultSummary ?? '') ||
      planInput !== (publicResult.actionPlan ?? ''));

  const requestClose = useCallback(() => {
    if (isMutating) return;
    if (
      isDraftDirty &&
      !window.confirm('저장하지 않은 변경사항이 있습니다. 닫으면 입력 내용이 사라집니다. 그래도 닫으시겠습니까?')
    ) {
      return;
    }
    closeModal();
  }, [isMutating, isDraftDirty, closeModal]);

  useEffect(() => {
    if (selectedSessionId !== null) {
      modalContentRef.current?.focus();
    }
  }, [selectedSessionId]);

  useEffect(() => {
    if (selectedSessionId === null) return undefined;

    const modalElement = modalContentRef.current?.closest('.fixed');
    const onKeyDown = (event) =>
      handleResultModalKeyDown(event, modalElement, isMutating, requestClose);

    modalElement?.addEventListener('keydown', onKeyDown);
    return () => modalElement?.removeEventListener('keydown', onKeyDown);
  }, [selectedSessionId, isMutating, requestClose]);

  // 정정 모달도 공개 결과 모달과 같은 이유로 열릴 때 포커스를 모달 안으로 옮긴다. 이걸 빼먹으면
  // 모달이 화면에는 보이는데 포커스는 여전히 배경의 "결과 정정" 버튼에 남아, 스크린리더가
  // 새 모달이 열렸다는 걸 알려주지 않고 Tab을 눌러도 배경 페이지가 먼저 반응한다.
  useEffect(() => {
    if (correctionOpen) {
      correctionContentRef.current?.focus();
    }
  }, [correctionOpen]);

  useEffect(() => {
    if (!correctionOpen) return undefined;

    // 정정 요청이 진행 중일 때는 Escape로도 닫지 못하게 한다. 백드롭 클릭·X 버튼과 같은 규칙을
    // 재사용해야 "닫기 경로에 따라 동작이 다른" 혼란스러운 예외가 생기지 않는다.
    const modalElement = correctionContentRef.current?.closest('.fixed');
    const onKeyDown = (event) =>
      handleResultModalKeyDown(event, modalElement, correctMutation.isPending, closeCorrectionModal);

    modalElement?.addEventListener('keydown', onKeyDown);
    return () => modalElement?.removeEventListener('keydown', onKeyDown);
  }, [correctionOpen, correctMutation.isPending, closeCorrectionModal]);

  // 이력 모달은 읽기 전용이라 닫기를 막을 진행 중 상태가 없다 — 열려 있으면 항상 Escape로 닫는다.
  useEffect(() => {
    if (historyOpen) {
      historyContentRef.current?.focus();
    }
  }, [historyOpen]);

  useEffect(() => {
    if (!historyOpen) return undefined;

    const modalElement = historyContentRef.current?.closest('.fixed');
    const onKeyDown = (event) => handleResultModalKeyDown(event, modalElement, false, closeHistory);

    modalElement?.addEventListener('keydown', onKeyDown);
    return () => modalElement?.removeEventListener('keydown', onKeyDown);
  }, [historyOpen, closeHistory]);

  const submitSave = () => {
    const trimmedSummary = summaryInput.trim();
    if (!trimmedSummary) {
      setFormError('공개 요약을 입력해 주세요.');
      return;
    }
    if (trimmedSummary.length > SUMMARY_MAX_LENGTH) {
      setFormError(`공개 요약은 ${SUMMARY_MAX_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`);
      return;
    }
    const trimmedPlan = planInput.trim();
    if (trimmedPlan.length > ACTION_PLAN_MAX_LENGTH) {
      setFormError(`실행 계획은 ${ACTION_PLAN_MAX_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`);
      return;
    }
    setFormError('');
    saveMutation.mutate({
      sessionId: selectedSessionId,
      resultSummary: trimmedSummary,
      actionPlan: trimmedPlan || null,
    });
  };

  const content = sessionPage?.content ?? [];
  const totalElements = sessionPage?.totalElements ?? 0;
  const totalPages = sessionPage?.totalPages ?? 0;

  useEffect(() => {
    if (isPlaceholderData || isError || !sessionPage) return;
    if (totalPages === 0 && page !== 0) {
      setPage(0);
      return;
    }
    if (totalPages > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [isError, isPlaceholderData, page, sessionPage, totalPages]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">상담 결과</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            회기별 공개 결과를 저장·공개하고, 마지막 출석 완료 회기 결과로 상담을 완료 처리하세요.
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
          <div className="p-4 text-[12px] text-[#CF222E]" role="alert">
            {getSessionListErrorMessage(listError)}
            <button
              type="button"
              onClick={refetchSessions}
              className="mt-2 font-bold underline hover:text-[#A40E26]"
            >
              다시 시도
            </button>
          </div>
        ) : content.length === 0 ? (
          <p className="p-6 text-center text-[12px] text-[#656D76]">조회된 회기가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {['회기', '학생', '상담유형', '시작 ~ 종료', '출석', '회기상태', '결과'].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i === 6 ? 'text-center' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ),
                  )}
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
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6]"
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
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          resultTriggerRef.current = event.currentTarget;
                          setSelectedSessionId(s.sessionId);
                        }}
                        aria-label={`${s.studentName} ${s.sessionNo}회기 결과 보기`}
                        className="h-6 px-2 text-[11px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB] transition-colors"
                      >
                        결과 보기
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

      {/* 공개 결과 모달 — 학생에게 보일 요약·실행계획이므로 열람 시에만 조회하고 닫을 때 캐시를 지운다 */}
      <Modal
        open={selectedSessionId !== null}
        onClose={requestClose}
        title="공개 결과"
        footer={
          <Button variant="outline" onClick={requestClose} disabled={isMutating}>
            닫기
          </Button>
        }
      >
        <div
          ref={modalContentRef}
          tabIndex={-1}
          className="max-h-[calc(100dvh-10rem)] overflow-y-auto pr-1"
        >
          {resultLoading ? (
          <p className="text-center text-[12px] text-[#656D76] py-4">불러오는 중입니다.</p>
        ) : resultIsError ? (
          <p className="text-[12px] text-[#CF222E]" role="alert">
            {getPublicResultErrorMessage(resultError)}
          </p>
        ) : !publicResult ? null : (
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] flex flex-wrap items-center gap-2">
              <StatusBadge
                status={publicResult.resultStatus}
                variant={RESULT_STATUS_BADGE_VARIANT[publicResult.resultStatus]}
                label={COUNSELING_PUBLIC_RESULT_STATUS_LABEL[publicResult.resultStatus]}
                size="sm"
              />
              {publicResult.finalResult && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#1A7F37]">
                  예약 최종 완료 결과
                </span>
              )}
              {!publicResult.assignmentActive && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76] font-bold">
                  종료된 배정
                </span>
              )}
              <span className="text-[11px] text-[#656D76]">
                {publicResult.privateRecordConfirmed
                  ? '비공개 기록 확정됨'
                  : '비공개 기록 미확정 — 확정 전에는 공개할 수 없습니다.'}
              </span>
            </div>

            {publicResult.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.PUBLISHED ? (
              <>
                <div>
                  <p className="text-[11px] font-bold text-[#1F2328] mb-1.5">공개 요약</p>
                  <div className="px-4 py-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed whitespace-pre-wrap">
                    {publicResult.resultSummary}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#1F2328] mb-1.5">실행계획</p>
                  <div className="px-4 py-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed whitespace-pre-wrap">
                    {publicResult.actionPlan ?? '등록된 실행계획이 없습니다.'}
                  </div>
                </div>
                <p className="text-[11px] text-[#656D76]">
                  v{publicResult.versionNo} · {publicResult.createdByName} · 공개{' '}
                  {formatKstDateTime(publicResult.publishedAt)}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {/* 서버 canCorrect가 원래 담당 상담사인지, 최신 PUBLISHED인지를 모두 판단한 최종 기준이다.
                      클라이언트에서 배정·역할을 다시 추정해 이 버튼을 대신 노출하지 않는다. */}
                  {publicResult.canCorrect && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => openCorrectionModal(event.currentTarget)}
                    >
                      결과 정정
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      historyTriggerRef.current = event.currentTarget;
                      setHistoryOpen(true);
                    }}
                  >
                    이력 보기
                  </Button>
                </div>
                {/* 이미 공개된 결과도 마지막 출석 완료 회기라면 완료 처리를 할 수 있다(내용은 그대로 유지). */}
                {publicResult.canCompleteReservation && (
                  <Button
                    size="sm"
                    disabled={completeMutation.isPending}
                    loading={completeMutation.isPending}
                    onClick={() => setConfirmCompleteOpen(true)}
                  >
                    상담 완료
                  </Button>
                )}
              </>
            ) : isEditableStatus && publicResult.canSaveDraft ? (
              <>
                <div>
                  <label
                    htmlFor="summaryInput"
                    className="block text-[11px] font-semibold text-[#656D76] mb-1.5"
                  >
                    공개 요약 <span className="text-[#CF222E]">*</span>
                  </label>
                  <textarea
                    id="summaryInput"
                    value={summaryInput}
                    onChange={(e) => setSummaryInput(e.target.value)}
                    required
                    aria-required="true"
                    aria-invalid={Boolean(formError)}
                    aria-describedby={formError ? 'summaryInput-help result-form-error' : 'summaryInput-help'}
                    rows={5}
                    maxLength={SUMMARY_MAX_LENGTH}
                    placeholder="학생에게 공개할 상담 요약을 입력하세요."
                    disabled={saveMutation.isPending}
                    className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
                  />
                  <p id="summaryInput-help" className="text-[11px] text-[#656D76] text-right">
                    {summaryInput.length}/{SUMMARY_MAX_LENGTH}자
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="planInput"
                    className="block text-[11px] font-semibold text-[#656D76] mb-1.5"
                  >
                    실행계획 (선택)
                  </label>
                  <textarea
                    id="planInput"
                    value={planInput}
                    onChange={(e) => setPlanInput(e.target.value)}
                    aria-required="false"
                    aria-invalid={Boolean(formError)}
                    aria-describedby={formError ? 'planInput-help result-form-error' : 'planInput-help'}
                    rows={4}
                    maxLength={ACTION_PLAN_MAX_LENGTH}
                    placeholder="학생이 수행할 실행 계획을 입력하세요."
                    disabled={saveMutation.isPending}
                    className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
                  />
                  <p id="planInput-help" className="text-[11px] text-[#656D76] text-right">
                    {planInput.length}/{ACTION_PLAN_MAX_LENGTH}자
                  </p>
                </div>
                {formError && (
                  <p
                    id="result-form-error"
                    className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
                    role="alert"
                  >
                    ⚠ {formError}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={saveMutation.isPending}
                    onClick={submitSave}
                  >
                    임시저장
                  </Button>
                  {publicResult.canPublish && (
                    <Button
                    size="sm"
                    disabled={isDraftDirty || saveMutation.isPending || publishMutation.isPending}
                    loading={publishMutation.isPending}
                    onClick={() => setConfirmPublishOpen(true)}
                  >
                    결과 공개
                    </Button>
                  )}
                  {publicResult.canCompleteReservation && (
                    <Button
                    variant="outline"
                    size="sm"
                    disabled={isDraftDirty || saveMutation.isPending || completeMutation.isPending}
                    loading={completeMutation.isPending}
                    onClick={() => setConfirmCompleteOpen(true)}
                  >
                    상담 완료
                    </Button>
                  )}
                </div>
                {isDraftDirty && (
                  <p className="text-[11px] text-[#92400E]">
                    저장하지 않은 변경이 있습니다. 먼저 임시저장한 후 결과 공개 또는 상담 완료를 진행해 주세요.
                  </p>
                )}
                <p className="text-[11px] text-[#656D76]">
                  버튼은 서버가 판단한 처리 가능 여부에 따라 활성화됩니다.
                </p>
              </>
            ) : isEditableStatus && publicResult.resultStatus === COUNSELING_PUBLIC_RESULT_STATUS.DRAFT ? (
              // canSaveDraft가 false인 초안 — 종료된 이전 담당 상담사는 읽기만 할 수 있다.
              <>
                <div>
                  <p className="text-[11px] font-bold text-[#1F2328] mb-1.5">공개 요약 (초안 · 읽기전용)</p>
                  <div className="px-4 py-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed whitespace-pre-wrap">
                    {publicResult.resultSummary}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#1F2328] mb-1.5">실행계획 (초안 · 읽기전용)</p>
                  <div className="px-4 py-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed whitespace-pre-wrap">
                    {publicResult.actionPlan ?? '등록된 실행계획이 없습니다.'}
                  </div>
                </div>
                <p className="text-[11px] text-[#656D76]">
                  현재 활성 배정 담당 상담사가 아니므로 수정·공개할 수 없습니다.
                </p>
              </>
            ) : (
              <p className="p-4 text-center text-[12px] text-[#656D76] bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                이 회기는 지금 공개 결과를 작성·수정할 수 없습니다. 시작 시각이 지난 예정 회기이거나
                출석 완료된 회기에서만 작성할 수 있습니다.
              </p>
            )}
          </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmPublishOpen}
        title="결과 공개"
        message="학생이 이 회기 결과를 볼 수 있게 됩니다. 예약은 계속 진행 중이며 완료 처리되지 않습니다."
        confirmLabel="공개"
        loading={publishMutation.isPending}
        onConfirm={() => publishMutation.mutate(selectedSessionId)}
        onCancel={() => !publishMutation.isPending && setConfirmPublishOpen(false)}
      />

      <ConfirmDialog
        open={confirmCompleteOpen}
        title="상담 완료"
        message="필요 시 초안이 공개되고, 예약이 완료(COMPLETED)되며 현재 활성 배정이 종료됩니다. 이후에는 새 회기를 생성할 수 없습니다."
        confirmLabel="완료 처리"
        loading={completeMutation.isPending}
        onConfirm={() => completeMutation.mutate(selectedSessionId)}
        onCancel={() => !completeMutation.isPending && setConfirmCompleteOpen(false)}
      />

      {/* 결과 정정 모달 — 공개 결과 모달 위에 겹쳐 뜬다(ConfirmDialog와 같은 방식). 서버가 만든
          새 버전을 성공 응답으로 받기 전까지는 화면에 아무것도 낙관적으로 반영하지 않는다. */}
      <Modal
        open={correctionOpen}
        onClose={closeCorrectionModal}
        title="결과 정정"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeCorrectionModal} disabled={correctMutation.isPending}>
              닫기
            </Button>
            <Button
              loading={correctMutation.isPending}
              disabled={correctMutation.isPending || Boolean(conflictLatest)}
              onClick={submitCorrection}
            >
              정정 저장
            </Button>
          </>
        }
      >
        {/* tabIndex=-1 + ref: 모달이 열리자마자 여기로 포커스를 옮겨야 Tab 트랩 시작점이
            생기고, 스크린리더가 "결과 정정" 창이 새로 열렸음을 알 수 있다. */}
        <div ref={correctionContentRef} tabIndex={-1} className="flex flex-col gap-4">
          <p className="text-[11px] text-[#656D76]">
            정정하면 기존 버전(v{correctionBase?.versionNo ?? '-'})은 그대로 남고 새 버전이 즉시
            학생에게 공개됩니다. 되돌릴 수 없으니 내용을 다시 확인해 주세요.
          </p>

          {conflictLatest && (
            <div className="rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] p-3 flex flex-col gap-2" role="alert">
              <p className="text-[11px] font-bold text-[#92400E]">
                다른 요청이 먼저 v{conflictLatest.versionNo}를 공개했습니다. 아래 최신 내용을 확인한 뒤
                계속하거나 입력을 다시 조정해 주세요.
              </p>
              <div>
                <p className="text-[11px] font-semibold text-[#1F2328] mb-1">최신 공개 요약</p>
                <div className="px-3 py-2 rounded-[6px] bg-white border border-[#E5E7EB] text-[12px] text-[#444D56] whitespace-pre-wrap">
                  {conflictLatest.resultSummary}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#1F2328] mb-1">최신 실행계획</p>
                <div className="px-3 py-2 rounded-[6px] bg-white border border-[#E5E7EB] text-[12px] text-[#444D56] whitespace-pre-wrap">
                  {conflictLatest.actionPlan ?? '등록된 실행계획이 없습니다.'}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={acceptLatestVersionAfterConflict}>
                최신 버전 기준으로 계속
              </Button>
            </div>
          )}

          <div>
            <label htmlFor="correctionSummary" className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              공개 요약 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              id="correctionSummary"
              value={correctionSummary}
              onChange={(e) => {
                setCorrectionSummary(e.target.value);
                if (correctionFieldError === 'summary') {
                  setCorrectionFieldError('');
                  setCorrectionError('');
                }
              }}
              required
              aria-required="true"
              aria-invalid={correctionFieldError === 'summary'}
              aria-describedby={correctionFieldError === 'summary' ? 'correction-error' : undefined}
              rows={5}
              maxLength={SUMMARY_MAX_LENGTH}
              disabled={correctMutation.isPending || Boolean(conflictLatest)}
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
            />
            <p className="text-[11px] text-[#656D76] text-right">
              {correctionSummary.length}/{SUMMARY_MAX_LENGTH}자
            </p>
          </div>

          <div>
            <label htmlFor="correctionPlan" className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              실행계획 (선택)
            </label>
            <textarea
              id="correctionPlan"
              value={correctionPlan}
              onChange={(e) => {
                setCorrectionPlan(e.target.value);
                if (correctionFieldError === 'plan') {
                  setCorrectionFieldError('');
                  setCorrectionError('');
                }
              }}
              aria-required="false"
              aria-invalid={correctionFieldError === 'plan'}
              aria-describedby={correctionFieldError === 'plan' ? 'correction-error' : undefined}
              rows={4}
              maxLength={ACTION_PLAN_MAX_LENGTH}
              disabled={correctMutation.isPending || Boolean(conflictLatest)}
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
            />
            <p className="text-[11px] text-[#656D76] text-right">
              {correctionPlan.length}/{ACTION_PLAN_MAX_LENGTH}자
            </p>
          </div>

          <div>
            <label htmlFor="correctionReason" className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              정정 사유 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              id="correctionReason"
              value={correctionReason}
              onChange={(e) => {
                setCorrectionReason(e.target.value);
                if (correctionFieldError === 'reason') {
                  setCorrectionFieldError('');
                  setCorrectionError('');
                }
              }}
              required
              aria-required="true"
              aria-invalid={correctionFieldError === 'reason'}
              aria-describedby={correctionFieldError === 'reason' ? 'correction-error' : undefined}
              rows={3}
              maxLength={CORRECTION_REASON_MAX_LENGTH}
              placeholder="학생에게 공개된 내용 중 무엇을 왜 바로잡는지 입력하세요."
              disabled={correctMutation.isPending || Boolean(conflictLatest)}
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
            />
            <p className="text-[11px] text-[#656D76] text-right">
              {correctionReason.length}/{CORRECTION_REASON_MAX_LENGTH}자
            </p>
          </div>

          {correctionError && (
            <p
              id="correction-error"
              className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
              role="alert"
            >
              ⚠ {correctionError}
            </p>
          )}
        </div>
      </Modal>

      {/* 버전 이력 모달 — 열렸을 때만 조회하고 닫으면 캐시를 제거한다. 정정 사유·작성자는
          담당(또는 과거 담당) 상담사 본인에게만 보이며 학생 화면에는 이 정보가 없다. */}
      <Modal open={historyOpen} onClose={closeHistory} title="버전 이력" size="lg">
        {/* tabIndex=-1 + ref: 공개 결과·정정 모달과 같은 이유로 열리자마자 이 안으로 포커스를
            옮긴다. 이게 없으면 이력 모달이 열려도 포커스는 "이력 보기" 버튼에 그대로 남는다. */}
        <div ref={historyContentRef} tabIndex={-1}>
        {historyLoading ? (
          <p className="text-center text-[12px] text-[#656D76] py-4">불러오는 중입니다.</p>
        ) : historyIsError ? (
          <p className="text-[12px] text-[#CF222E]" role="alert">
            {getPublicResultErrorMessage(historyError)}
          </p>
        ) : !historyItems || historyItems.length === 0 ? (
          <p className="p-4 text-center text-[12px] text-[#656D76]" role="alert">
            공개된 버전이 없습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-3 max-h-[calc(100dvh-16rem)] overflow-y-auto pr-1">
            {historyItems.map((item, index) => {
              const olderVersion = historyItems[index + 1];
              // 이력 API는 이전 값을 중복으로 내려주지 않으므로, 바로 다음(더 오래된) 버전과
              // 인접 비교해 변경 항목만 화면에서 계산한다(별도 diff 라이브러리 없음).
              const summaryChanged = olderVersion ? item.resultSummary !== olderVersion.resultSummary : false;
              const planChanged = olderVersion ? item.actionPlan !== olderVersion.actionPlan : false;
              const isFirstVersion = item.versionNo === 1;
              return (
                <div key={item.publicResultId} className="rounded-[8px] border border-[#E5E7EB] p-3 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#1F2328]">
                      v{item.versionNo}
                    </span>
                    <span className="text-[11px] text-[#656D76]">
                      {isFirstVersion ? '최초 공개' : '정정'} · {item.createdByName ?? '알 수 없음'} · 공개{' '}
                      {formatKstDateTime(item.publishedAt)}
                    </span>
                    {summaryChanged && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                        요약 변경
                      </span>
                    )}
                    {planChanged && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                        실행 계획 변경
                      </span>
                    )}
                  </div>
                  {!isFirstVersion && (
                    <p className="text-[11px] text-[#656D76]">
                      정정 사유: {item.correctionReason}
                    </p>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold text-[#1F2328] mb-1">공개 요약</p>
                    <div className="px-3 py-2 rounded-[6px] bg-[#F9FAFB] border border-[#E5E7EB] text-[12px] text-[#444D56] whitespace-pre-wrap">
                      {item.resultSummary}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#1F2328] mb-1">실행계획</p>
                    <div className="px-3 py-2 rounded-[6px] bg-[#F9FAFB] border border-[#E5E7EB] text-[12px] text-[#444D56] whitespace-pre-wrap">
                      {item.actionPlan ?? '등록된 실행계획이 없습니다.'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </Modal>
    </div>
  );
}
