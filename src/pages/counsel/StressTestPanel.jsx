import { useCallback, useEffect, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, SkeletonLoader } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  fetchStressTestQuestions,
  fetchStressTestResults,
  stressTestQuestionsQueryKey,
  stressTestResultsQueryKey,
  submitStressTestResult,
} from '@/api/counsel';
import { agreeToConsentPolicy, fetchConsentPolicies, fetchMyConsents } from '@/api/consent';
import {
  CONSENT_MODULE_CODE,
  CONSENT_TYPE,
  COUNSELING_RESERVATION_ERROR_CODE,
  STRESS_TEST_ERROR_CODE,
} from '@/constants/domain';
import { formatKstDateTime } from './myCounselingDate';

const ACCENT = '#0891B2';

// ─── 심리검사(스트레스 자가진단) 지원 함수 ─────────────────────────────────────

// 상담 개인정보 필수 동의 정책은 정확히 한 건이어야 정상이다. 0건·2건 이상이면
// 서버 시드 설정 오류이므로 미동의로 뭉뚱그리지 않고 별도 "설정 오류" 상태로 구분한다.
function findRequiredPersonalInfoPolicies(policies) {
  return policies.filter(
    (policy) => policy.consentType === CONSENT_TYPE.PERSONAL_INFO && policy.required === true,
  );
}

// 철회된 이력이나 잘못된 ID는 유효한 동의로 인정하지 않는다.
function findValidConsent(consents, policy) {
  if (!policy) return null;
  return (
    consents.find(
      (consent) =>
        consent.consentPolicyId === policy.consentPolicyId &&
        consent.withdrawnAt === null &&
        Number.isInteger(consent.userConsentId) &&
        consent.userConsentId > 0,
    ) ?? null
  );
}

function getConsentErrorMessage(error) {
  if (error?.message === 'CONSENT_REFRESH_FAILED') {
    return '최신 동의 정보를 불러오지 못했습니다. 다시 시도해 주세요.';
  }
  if (error?.message === 'CONSENT_POLICY_MISCONFIGURED') {
    return '동의 정책 설정에 문제가 있어 진행할 수 없습니다. 관리자에게 문의해 주세요.';
  }
  if (error?.message === 'CONSENT_CHECK_STALE') {
    return '동의 내용이 갱신되었습니다. 최신 내용을 다시 확인하고 동의해 주세요.';
  }
  if (error?.message === 'CONSENT_VERIFY_FAILED' || error?.message === 'CONSENT_NOT_CONFIRMED') {
    return '동의 처리를 확인하지 못했습니다. 다시 시도해 주세요.';
  }
  return '동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

function getStressQuestionsErrorMessage(error) {
  if (error instanceof ApiError && error.code === STRESS_TEST_ERROR_CODE.NOT_AVAILABLE) {
    return '현재 스트레스 검사를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.';
  }
  return '문항을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function getStressResultsErrorMessage() {
  return '검사 결과 이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

const CONSENT_POLICIES_QUERY_KEY = ['consentPolicies', CONSENT_MODULE_CODE.COUNSELING];
const MY_CONSENTS_QUERY_KEY = ['myConsents'];
const RESULT_HISTORY_PAGE_SIZE = 20;

export default function StressTestPanel() {
  const queryClient = useQueryClient();

  // 원응답은 이 useState 하나에만 둔다. 새로고침·탭 이동·언마운트로 사라져야 하므로
  // 절대 브라우저 저장소·Zustand·React Query 캐시에 복제하지 않는다.
  const [answers, setAnswers] = useState({});
  const [submitError, setSubmitError] = useState('');
  // handleSubmit 진입부터 mutate() 호출 전까지(동의 재검증 GET 왕복 구간)를 잠그는 플래그.
  // submitMutation.isPending만으로는 이 구간이 커버되지 않아 연속 클릭 시 중복 제출이 가능했다.
  const [isReverifying, setIsReverifying] = useState(false);
  const [isConsentBlocked, setIsConsentBlocked] = useState(false);
  const [isQuestionRefreshBlocked, setIsQuestionRefreshBlocked] = useState(false);
  const [isStressTestUnavailable, setIsStressTestUnavailable] = useState(false);
  const [isStressTestSubmissionForbidden, setIsStressTestSubmissionForbidden] = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [resultPage, setResultPage] = useState(0);
  // 제출 응답 자체가 유실된 네트워크 오류(NETWORK_ERROR)에서는 서버가 실제로 저장했는지
  // FE가 알 방법이 없다(멱등성 키 없음). 이 상태는 "확인 없이는 재제출 금지" 게이트다 —
  // 사용자가 결과 이력을 확인하거나 '다시 제출하기'를 명시적으로 눌러야만 풀린다.
  const [submitUncertain, setSubmitUncertain] = useState(false);
  // 체크박스는 서버 동의의 근거가 아니라 화면에서만 쓰는 일시 상태다. 정책 ID·버전을
  // 함께 들고 있어야, 정책이 바뀐 뒤 오래된 체크로 최신 정책에 동의해버리는 것을 막을 수 있다.
  const [checkedConsent, setCheckedConsent] = useState({
    checked: false,
    consentPolicyId: null,
    version: null,
  });
  const lastQuestionVersionRef = useRef(null);
  const fieldsetRefs = useRef({});
  const resultHeadingRef = useRef(null);
  const resultsHistoryHeadingRef = useRef(null);
  const resultErrorRef = useRef(null);
  const consentCheckboxRef = useRef(null);
  const consentErrorRef = useRef(null);
  const questionBlockRef = useRef(null);
  const shouldFocusFirstQuestionRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 결과 이력에는 방금 만든 캐시가 남아 있을 수 있으므로, 탭을 벗어나면 즉시 지운다.
      // 진행 중 요청은 취소하지 않는다 — 서버 저장 자체는 이미 확정된 사실이라 클라이언트
      // 판단으로 불확실하게 만들지 않기 위함이다.
      queryClient.removeQueries({ queryKey: ['studentStressTestResults'] });
      queryClient.removeQueries({ queryKey: MY_CONSENTS_QUERY_KEY });
    };
  }, [queryClient]);

  // ── 동의 게이트 ──
  const policiesQuery = useQuery({
    queryKey: CONSENT_POLICIES_QUERY_KEY,
    queryFn: () => fetchConsentPolicies(CONSENT_MODULE_CODE.COUNSELING),
    retry: false,
  });
  const myConsentsQuery = useQuery({
    queryKey: MY_CONSENTS_QUERY_KEY,
    queryFn: fetchMyConsents,
    retry: false,
    gcTime: 0,
  });

  const policies = policiesQuery.data ?? [];
  const consents = myConsentsQuery.data ?? [];
  const requiredPolicies = findRequiredPersonalInfoPolicies(policies);
  const requiredPolicy = requiredPolicies.length === 1 ? requiredPolicies[0] : null;
  const isConsentLoading = policiesQuery.isLoading || myConsentsQuery.isLoading;
  const isConsentQueryError = policiesQuery.isError || myConsentsQuery.isError;
  const isConsentForbidden =
    policiesQuery.error?.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN ||
    myConsentsQuery.error?.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN;
  const isPolicyMisconfigured =
    !isConsentLoading && !isConsentQueryError && requiredPolicies.length !== 1;
  const validConsent = requiredPolicy ? findValidConsent(consents, requiredPolicy) : null;
  const hasValidConsent = validConsent !== null;
  const canStartStressTest =
    hasValidConsent &&
    !isConsentBlocked &&
    !isConsentForbidden &&
    !isConsentQueryError &&
    !isPolicyMisconfigured;
  const isCheckedForCurrentPolicy =
    checkedConsent.checked &&
    requiredPolicy !== null &&
    checkedConsent.consentPolicyId === requiredPolicy.consentPolicyId &&
    checkedConsent.version === requiredPolicy.version;

  const retryConsentQueries = async () => {
    const [policiesResult, consentsResult] = await Promise.all([
      policiesQuery.refetch(),
      myConsentsQuery.refetch(),
    ]);
    if (!isMountedRef.current || policiesResult.isError || consentsResult.isError) {
      return;
    }

    const latestRequiredPolicies = findRequiredPersonalInfoPolicies(policiesResult.data ?? []);
    const latestPolicy = latestRequiredPolicies.length === 1 ? latestRequiredPolicies[0] : null;
    if (latestPolicy && findValidConsent(consentsResult.data ?? [], latestPolicy)) {
      shouldFocusFirstQuestionRef.current = true;
      setIsConsentBlocked(false);
      setSubmitError('');
    } else if (latestPolicy) {
      setIsConsentBlocked(true);
    }
  };

  // 제출 직전 재검증에서도 재사용하므로 컴포넌트 함수로 둔다. 화면에 보이는 캐시만 보지 않고
  // 항상 서버에 다시 물어 최신 정책·동의를 확인한다.
  const reverifyConsent = async () => {
    const [policiesResult, consentsResult] = await Promise.all([
      policiesQuery.refetch(),
      myConsentsQuery.refetch(),
    ]);
    if (policiesResult.isError || consentsResult.isError) {
      return { ok: false, policy: null, consent: null };
    }
    const latestRequiredPolicies = findRequiredPersonalInfoPolicies(policiesResult.data ?? []);
    if (latestRequiredPolicies.length !== 1) {
      return { ok: true, policy: null, consent: null };
    }
    const latestPolicy = latestRequiredPolicies[0];
    const latestConsent = findValidConsent(consentsResult.data ?? [], latestPolicy);
    return { ok: true, policy: latestPolicy, consent: latestConsent };
  };

  const agreeMutation = useMutation({
    mutationFn: async () => {
      const { ok, policy, consent } = await reverifyConsent();
      if (!ok) {
        throw new Error('CONSENT_REFRESH_FAILED');
      }
      if (!policy) {
        throw new Error('CONSENT_POLICY_MISCONFIGURED');
      }
      if (consent) {
        // 재조회 사이에 이미 유효한 동의가 생겼으면 중복 POST 없이 그대로 진행한다(멱등 처리).
        return;
      }
      if (
        !checkedConsent.checked ||
        checkedConsent.consentPolicyId !== policy.consentPolicyId ||
        checkedConsent.version !== policy.version
      ) {
        throw new Error('CONSENT_CHECK_STALE');
      }

      try {
        await agreeToConsentPolicy(policy.consentPolicyId);
      } catch (error) {
        if (error instanceof ApiError && error.code === STRESS_TEST_ERROR_CODE.CONSENT_CONFLICT) {
          // U012(동시 동의 충돌): 다른 요청이 먼저 처리됐을 수 있으므로 이력만 한 번 다시 읽어
          // 유효 동의가 이미 생겼으면 성공으로 본다. 그래도 없으면 원래 오류를 그대로 던진다.
          const retry = await myConsentsQuery.refetch();
          if (!retry.isError && findValidConsent(retry.data ?? [], policy)) {
            return;
          }
        }
        throw error;
      }

      const [finalPolicies, finalConsents] = await Promise.all([
        policiesQuery.refetch(),
        myConsentsQuery.refetch(),
      ]);
      if (finalPolicies.isError || finalConsents.isError) {
        throw new Error('CONSENT_VERIFY_FAILED');
      }
      if (!findValidConsent(finalConsents.data ?? [], policy)) {
        throw new Error('CONSENT_NOT_CONFIRMED');
      }
    },
    retry: false,
    onSuccess: () => {
      if (!isMountedRef.current) {
        return;
      }
      shouldFocusFirstQuestionRef.current = true;
      setCheckedConsent({ checked: false, consentPolicyId: null, version: null });
      setIsConsentBlocked(false);
      setSubmitError('');
    },
  });

  // ── 문항과 응답 ──
  const questionsQuery = useQuery({
    queryKey: stressTestQuestionsQueryKey,
    queryFn: fetchStressTestQuestions,
    enabled: canStartStressTest,
    retry: false,
  });
  const questionsData = questionsQuery.data;
  const isQuestionForbidden =
    questionsQuery.isError && questionsQuery.error?.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN;
  const isStressTestForbidden = isQuestionForbidden || isStressTestSubmissionForbidden;

  useEffect(() => {
    if ((!isConsentQueryError && !isPolicyMisconfigured) || isConsentLoading) {
      return;
    }
    window.requestAnimationFrame(() => {
      if (isMountedRef.current) {
        consentErrorRef.current?.focus();
      }
    });
  }, [isConsentForbidden, isConsentLoading, isConsentQueryError, isPolicyMisconfigured]);

  useEffect(() => {
    if (
      !shouldFocusFirstQuestionRef.current ||
      !canStartStressTest ||
      questionsQuery.isLoading ||
      questionsQuery.isFetching ||
      questionsQuery.isError ||
      !questionsData
    ) {
      return;
    }
    shouldFocusFirstQuestionRef.current = false;
    window.requestAnimationFrame(() => {
      if (isMountedRef.current) {
        fieldsetRefs.current[questionsData.questions[0]?.questionId]?.focus();
      }
    });
  }, [canStartStressTest, questionsData, questionsQuery.isError, questionsQuery.isFetching, questionsQuery.isLoading]);

  useEffect(() => {
    if (
      !isConsentBlocked ||
      isConsentLoading ||
      isConsentQueryError ||
      isPolicyMisconfigured ||
      !requiredPolicy
    ) {
      return;
    }
    window.requestAnimationFrame(() => {
      if (isMountedRef.current) {
        consentCheckboxRef.current?.focus();
      }
    });
  }, [isConsentBlocked, isConsentLoading, isConsentQueryError, isPolicyMisconfigured, requiredPolicy]);

  useEffect(() => {
    if (
      !canStartStressTest ||
      (!isQuestionRefreshBlocked &&
        !isStressTestUnavailable &&
        !isStressTestForbidden &&
        !questionsQuery.isError)
    ) {
      return;
    }
    window.requestAnimationFrame(() => {
      if (isMountedRef.current) {
        questionBlockRef.current?.focus();
      }
    });
  }, [canStartStressTest, isQuestionRefreshBlocked, isStressTestForbidden, isStressTestUnavailable, questionsQuery.isError]);

  const refreshStressTestQuestions = async () => {
    try {
      const result = await questionsQuery.refetch();
      return result.isError ? null : result.data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!questionsData) return;
    // 문항 버전이 바뀌면(재조회로 다른 버전이 내려오면) 이전 답변은 더 이상 의미가 없으므로 비운다.
    if (lastQuestionVersionRef.current !== questionsData.testVersion) {
      lastQuestionVersionRef.current = questionsData.testVersion;
      setAnswers({});
      // 문항 버전이 바뀌면 직전 결과도 지금 문항과 무관해지므로 함께 지운다.
      setLatestResult(null);
    }
  }, [questionsData]);

  const answeredCount = questionsData
    ? questionsData.questions.filter((q) => answers[q.questionId] !== undefined).length
    : 0;

  // ── 결과 이력 ──
  const resultsQuery = useQuery({
    queryKey: stressTestResultsQueryKey(resultPage, RESULT_HISTORY_PAGE_SIZE),
    queryFn: () => fetchStressTestResults({ page: resultPage, size: RESULT_HISTORY_PAGE_SIZE }),
    placeholderData: keepPreviousData,
    retry: false,
    gcTime: 0,
  });
  const resultItems = resultsQuery.data?.content ?? [];
  const resultTotalPages = resultsQuery.data?.totalPages ?? 0;
  // keepPreviousData의 효과를 실제로 살리려면 "최초 로딩"과 "페이지 전환 중 백그라운드 조회"를
  // 구분해야 한다. isFetching·isPlaceholderData까지 여기 섞으면 페이지를 넘길 때마다 목록이
  // 사라지고 skeleton이 다시 뜬다 — 최초 로딩에는 isLoading만 쓴다.
  const isResultsInitialLoading = resultsQuery.isLoading;
  // 페이지 전환 중(백그라운드 조회)에는 페이저 상태 표시·연속 클릭 차단에만 이 값을 쓴다.
  const isResultsFetching = resultsQuery.isFetching || resultsQuery.isPlaceholderData;
  const isResultsForbidden =
    resultsQuery.isError && resultsQuery.error?.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN;

  useEffect(() => {
    if (!resultsQuery.isError) {
      return;
    }
    window.requestAnimationFrame(() => {
      if (isMountedRef.current) {
        resultErrorRef.current?.focus();
      }
    });
  }, [resultsQuery.error, resultsQuery.isError]);

  useEffect(() => {
    if (resultsQuery.isPlaceholderData || resultsQuery.isError || !resultsQuery.data) return;
    if (resultTotalPages === 0 && resultPage !== 0) {
      setResultPage(0);
      return;
    }
    if (resultTotalPages > 0 && resultPage >= resultTotalPages) {
      setResultPage(resultTotalPages - 1);
    }
  }, [resultPage, resultTotalPages, resultsQuery.data, resultsQuery.isError, resultsQuery.isPlaceholderData]);

  // 첫 페이지로 이동 + 결과 이력 재조회 + 이력 heading 포커스를 한 곳에 묶는다. 네트워크 오류
  // 처리와 "결과 이력 확인" 버튼이 같은 동작을 공유해야, 조회 대상 페이지가 서로 어긋나지 않는다.
  // 현재 페이지의 refetch()만 부르면 2페이지 이후를 보고 있을 때 새로 생겼을 결과를 놓친다.
  const refreshLatestResults = useCallback(() => {
    setResultPage(0);
    queryClient.invalidateQueries({ queryKey: ['studentStressTestResults'] });
    window.requestAnimationFrame(() => {
      if (isMountedRef.current && resultsHistoryHeadingRef.current?.isConnected) {
        resultsHistoryHeadingRef.current.focus();
      }
    });
  }, [queryClient]);

  // ── 제출 ──
  const submitMutation = useMutation({
    // 인자 없는 mutationFn: 답변은 컴포넌트 state(answers)를 그대로 참조하고 mutation
    // variables에는 아무것도 담지 않는다. React Query DevTools나 캐시에 원응답이 남지 않게 하기 위함이다.
    mutationFn: () =>
      submitStressTestResult({
        testVersion: questionsData.testVersion,
        answers: questionsData.questions.map((question) => ({
          questionId: question.questionId,
          selectedValue: answers[question.questionId],
        })),
      }),
    retry: false,
    gcTime: 0,
    onSuccess: (result) => {
      if (!isMountedRef.current) {
        queryClient.removeQueries({ queryKey: ['studentStressTestResults'] });
        return;
      }
      setLatestResult(result);
      setAnswers({});
      setSubmitError('');
      setResultPage(0);
      queryClient.invalidateQueries({ queryKey: ['studentStressTestResults'] });
      window.requestAnimationFrame(() => {
        if (isMountedRef.current && resultHeadingRef.current?.isConnected) {
          resultHeadingRef.current.focus();
        }
      });
      submitMutation.reset();
    },
    onError: async (error) => {
      if (!isMountedRef.current) {
        return;
      }
      if (error instanceof ApiError && error.code === STRESS_TEST_ERROR_CODE.REQUIRED_CONSENT_NOT_AGREED) {
        setIsConsentBlocked(true);
        setCheckedConsent({ checked: false, consentPolicyId: null, version: null });
        setSubmitError('상담 개인정보 동의가 확인되지 않았습니다. 동의 후 다시 시도해 주세요.');
        void retryConsentQueries();
      } else if (error instanceof ApiError && error.code === STRESS_TEST_ERROR_CODE.INVALID_INPUT) {
        setAnswers({});
        setIsQuestionRefreshBlocked(true);
        setSubmitError('제출한 응답을 확인할 수 없습니다. 문항을 다시 불러왔으니 처음부터 다시 응답해 주세요.');
        const refreshedQuestions = await refreshStressTestQuestions();
        if (!isMountedRef.current) {
          return;
        }
        if (!refreshedQuestions) {
          setSubmitError('문항을 다시 불러오지 못했습니다. 다시 시도해 주세요.');
          return;
        }
        setIsQuestionRefreshBlocked(false);
        setSubmitError('문항을 다시 불러왔습니다. 처음부터 다시 응답해 주세요.');
        window.requestAnimationFrame(() => {
          if (isMountedRef.current) {
            fieldsetRefs.current[refreshedQuestions.questions[0]?.questionId]?.focus();
          }
        });
      } else if (error instanceof ApiError && error.code === STRESS_TEST_ERROR_CODE.NOT_AVAILABLE) {
        setAnswers({});
        setIsStressTestUnavailable(true);
        setSubmitError('현재 스트레스 검사를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        const refreshedQuestions = await refreshStressTestQuestions();
        if (isMountedRef.current && refreshedQuestions) {
          setIsStressTestUnavailable(false);
          setSubmitError('문항을 다시 불러왔습니다. 처음부터 다시 응답해 주세요.');
          window.requestAnimationFrame(() => {
            if (isMountedRef.current) {
              fieldsetRefs.current[refreshedQuestions.questions[0]?.questionId]?.focus();
            }
          });
        }
      } else if (error instanceof ApiError && error.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN) {
        setIsStressTestSubmissionForbidden(true);
        setSubmitError('스트레스 검사를 제출할 권한이 없습니다.');
      } else if (error instanceof ApiError && error.code === 'NETWORK_ERROR') {
        // 응답 자체가 유실된 경우다. 서버에 요청이 도달해 이미 저장됐을 수도, 아예 도달하지
        // 못했을 수도 있어 FE만으로는 구분할 수 없다(멱등성 키가 없는 계약). 그래서 곧바로
        // 재시도를 허용하지 않고, 결과 이력에서 실제 저장 여부를 사용자가 직접 확인하게 한다.
        // 완전한 중복 방지는 BE의 멱등성 키 또는 저장 결과 확인 API가 있어야 가능하다.
        setSubmitUncertain(true);
        setSubmitError(
          '제출은 전송했지만 저장 여부를 확인할 수 없습니다. 아래 결과 이력에서 확인해 주세요.',
        );
        refreshLatestResults();
      } else if (error instanceof ApiError) {
        // 그 밖의 ApiError(C999 등)는 서버가 응답을 확정한 오류다 — 즉 서버가 저장을 이미
        // 롤백했다고 확신할 수 있으므로, 응답 유실과 달리 답변을 유지한 채 바로 재시도해도 안전하다.
        setSubmitError('처리에 실패해 저장되지 않았습니다. 다시 시도해 주세요.');
      } else {
        // ApiError가 아닌 예상치 못한 오류. 서버 내부 문구를 그대로 노출하지 않는다.
        setSubmitError('제출 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    },
  });

  const handleSelect = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSubmitError('');
    // 새 답변을 고르기 시작하면 새 검사를 시작한 것이므로, 직전 제출 결과 카드를 지운다.
    // 지우지 않으면 지금 작성 중인 검사가 아직 미제출인데도 직전 결과가 현재 결과처럼 보인다.
    if (latestResult !== null) {
      setLatestResult(null);
    }
  };

  const handleSubmit = async ({ allowUncertain = false } = {}) => {
    // 저장 여부가 불확실한 상태에서는 일반 제출 버튼(allowUncertain 없이 호출)을 막는다.
    // "다시 제출하기"만 allowUncertain: true로 이 잠금을 명시적으로 풀고 기존 흐름을 그대로 탄다 —
    // 잠금만 해제하는 별도 경로를 만들지 않는다(제출 흐름 중복 방지).
    if (submitUncertain && !allowUncertain) {
      return;
    }
    // reverifyConsent()는 GET 왕복 두 번을 거치므로, mutate() 시작 전까지 submitMutation.isPending은
    // 아직 false다. 이 왕복 구간에서 버튼이 다시 눌리면 재검증~제출이 겹쳐 실행될 수 있어
    // 별도 플래그로 handleSubmit 진입 시점부터 잠근다.
    if (
      !questionsData ||
      isQuestionRefreshBlocked ||
      isStressTestUnavailable ||
      isStressTestForbidden ||
      isReverifying ||
      submitMutation.isPending ||
      agreeMutation.isPending
    ) {
      return;
    }
    setIsReverifying(true);
    if (allowUncertain) {
      setSubmitUncertain(false);
    }

    try {
      const missingQuestion = questionsData.questions.find(
        (question) => answers[question.questionId] === undefined,
      );
      if (missingQuestion) {
        setSubmitError('모든 문항에 응답해 주세요.');
        fieldsetRefs.current[missingQuestion.questionId]?.focus();
        return;
      }

      // 문항에 모두 답했더라도, 여기서 동의가 여전히 유효한지 서버에 다시 확인한다.
      // 화면을 열어 둔 사이 동의가 철회됐을 수 있고, 그 경우 POST 자체를 시도하지 않는다.
      const { ok, consent } = await reverifyConsent();
      if (!isMountedRef.current) {
        return;
      }
      if (!ok) {
        setIsConsentBlocked(true);
        setCheckedConsent({ checked: false, consentPolicyId: null, version: null });
        setSubmitError('최신 동의 상태를 확인하지 못했습니다. 답변은 유지되니 다시 시도해 주세요.');
        return;
      }
      if (!consent) {
        setIsConsentBlocked(true);
        setCheckedConsent({ checked: false, consentPolicyId: null, version: null });
        setSubmitError('상담 개인정보 동의가 확인되지 않았습니다. 동의 후 다시 시도해 주세요.');
        return;
      }

      if (!isMountedRef.current) {
        return;
      }
      setSubmitError('');
      submitMutation.mutate();
    } finally {
      // 재검증 실패·조기 return·성공적인 mutate() 호출 모든 경로에서 잠금을 반드시 푼다.
      if (isMountedRef.current) {
        setIsReverifying(false);
      }
    }
  };

  const isSubmitting = isReverifying || submitMutation.isPending;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[8px] px-5 py-3">
        <p className="text-[13px] font-bold text-[#164E63]">스트레스 자가진단</p>
        <p className="mt-1 text-[12px] text-[#164E63]">
          11개 문항에 답하면 즉시 결과를 확인할 수 있습니다. 결과는 상담사가 상담 제안 시 참고할
          수 있습니다.
        </p>
      </div>

      {/* 동의 게이트 */}
      {isConsentLoading && <SkeletonLoader rows={3} cols={1} />}

      {!isConsentLoading && isConsentForbidden && (
        <div
          ref={consentErrorRef}
          tabIndex={-1}
          role="alert"
          className="bg-white rounded-[8px] border border-[#FECACA] px-5 py-4"
        >
          <p className="text-[12px] text-[#CF222E]">동의 정보를 조회할 권한이 없습니다.</p>
        </div>
      )}

      {!isConsentLoading && !isConsentForbidden && isConsentQueryError && (
        <div
          ref={consentErrorRef}
          tabIndex={-1}
          role="alert"
          className="bg-white rounded-[8px] border border-[#FECACA] px-5 py-4"
        >
          <p className="text-[12px] text-[#CF222E]">
            동의 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={retryConsentQueries}>
            다시 시도
          </Button>
        </div>
      )}

      {!isConsentLoading && !isConsentQueryError && isPolicyMisconfigured && (
        <div
          ref={consentErrorRef}
          tabIndex={-1}
          role="alert"
          className="bg-white rounded-[8px] border border-[#FDE68A] px-5 py-4"
        >
          <p className="text-[12px] text-[#92400E]">
            동의 정책 설정에 문제가 있어 검사를 시작할 수 없습니다. 관리자에게 문의해 주세요.
          </p>
        </div>
      )}

      {!isConsentLoading && !isConsentQueryError && !isPolicyMisconfigured && (!hasValidConsent || isConsentBlocked) && requiredPolicy && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-5 py-4 flex flex-col gap-3">
          <div>
            <p className="text-[13px] font-bold text-[#1F2328]">
              {requiredPolicy.title}
              <span className="ml-2 text-[11px] font-normal text-[#9AA0A6]">v{requiredPolicy.version}</span>
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-[#444D56]">
              {requiredPolicy.content}
            </p>
          </div>

          {isConsentBlocked && submitError && (
            <p className="text-[12px] text-[#CF222E]" role="alert">
              {submitError}
            </p>
          )}

          <label className="flex items-center gap-2 text-[12px] text-[#1F2328]">
            <input
              ref={consentCheckboxRef}
              type="checkbox"
              checked={isCheckedForCurrentPolicy}
              disabled={agreeMutation.isPending}
              onChange={(event) =>
                setCheckedConsent({
                  checked: event.target.checked,
                  consentPolicyId: requiredPolicy.consentPolicyId,
                  version: requiredPolicy.version,
                })
              }
            />
            위 상담 개인정보 수집·이용에 동의합니다.
          </label>

          {agreeMutation.isError && (
            <p className="text-[12px] text-[#CF222E]" role="alert">
              {getConsentErrorMessage(agreeMutation.error)}
            </p>
          )}

          <Button
            size="sm"
            disabled={!isCheckedForCurrentPolicy}
            loading={agreeMutation.isPending}
            onClick={() => agreeMutation.mutate()}
            style={{ background: ACCENT }}
          >
            동의하고 검사 시작
          </Button>
        </div>
      )}

      {!isConsentLoading && !isConsentQueryError && !isPolicyMisconfigured && canStartStressTest && (
        <p className="text-[12px] font-semibold text-[#1A7F37]">동의 완료 · 아래 문항에 응답해 주세요.</p>
      )}

      {/* 문항 */}
      {canStartStressTest && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-5 py-5">
          {isStressTestForbidden && (
            <div ref={questionBlockRef} tabIndex={-1}>
              <p className="text-[12px] text-[#CF222E]" role="alert">
                스트레스 검사를 이용할 권한이 없습니다.
              </p>
            </div>
          )}

          {!isStressTestForbidden && isQuestionRefreshBlocked && (
            <div ref={questionBlockRef} tabIndex={-1}>
              <p className="text-[12px] text-[#CF222E]" role="alert">
                {submitError}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={async () => {
                  const refreshedQuestions = await refreshStressTestQuestions();
                  if (!isMountedRef.current) {
                    return;
                  }
                  if (!refreshedQuestions) {
                    setSubmitError('문항을 다시 불러오지 못했습니다. 다시 시도해 주세요.');
                    return;
                  }
                  setIsQuestionRefreshBlocked(false);
                  setSubmitError('');
                  window.requestAnimationFrame(() => {
                    if (isMountedRef.current) {
                      fieldsetRefs.current[refreshedQuestions.questions[0]?.questionId]?.focus();
                    }
                  });
                }}
              >
                다시 시도
              </Button>
            </div>
          )}

          {!isStressTestForbidden && !isQuestionRefreshBlocked && isStressTestUnavailable && (
            <div ref={questionBlockRef} tabIndex={-1}>
              <p className="text-[12px] text-[#CF222E]" role="alert">
                현재 스트레스 검사를 이용할 수 없습니다. 문항을 다시 확인해 주세요.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={async () => {
                  const refreshedQuestions = await refreshStressTestQuestions();
                  if (isMountedRef.current && refreshedQuestions) {
                    setIsStressTestUnavailable(false);
                    setSubmitError('');
                    window.requestAnimationFrame(() => {
                      if (isMountedRef.current) {
                        fieldsetRefs.current[refreshedQuestions.questions[0]?.questionId]?.focus();
                      }
                    });
                  }
                }}
              >
                다시 시도
              </Button>
            </div>
          )}

          {!isStressTestForbidden && !isQuestionRefreshBlocked && !isStressTestUnavailable && questionsQuery.isLoading && (
            <SkeletonLoader rows={4} cols={1} />
          )}

          {!isStressTestForbidden && !isQuestionRefreshBlocked && !isStressTestUnavailable && !questionsQuery.isLoading && questionsQuery.isError && (
            <div ref={questionBlockRef} tabIndex={-1}>
              <p className="text-[12px] text-[#CF222E]" role="alert">
                {getStressQuestionsErrorMessage(questionsQuery.error)}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={async () => {
                  shouldFocusFirstQuestionRef.current = true;
                  await refreshStressTestQuestions();
                }}
              >
                다시 시도
              </Button>
            </div>
          )}

          {!isStressTestForbidden && !isQuestionRefreshBlocked && !isStressTestUnavailable && !questionsQuery.isLoading && !questionsQuery.isError && questionsData && (
            <div className="flex flex-col gap-5">
              <p className="text-[12px] text-[#656D76]">{questionsData.instruction}</p>
              <p aria-live="polite" className="text-[12px] font-semibold text-[#1F2328]">
                응답 {answeredCount} / {questionsData.questions.length}
              </p>

              {questionsData.questions.map((question) => (
                <fieldset
                  key={question.questionId}
                  ref={(el) => {
                    fieldsetRefs.current[question.questionId] = el;
                  }}
                  tabIndex={-1}
                  disabled={isSubmitting}
                  className="border border-[#E5E7EB] rounded-[8px] px-4 py-3"
                >
                  <legend className="px-1 text-[13px] font-semibold text-[#1F2328]">
                    {question.questionNo}. {question.questionText}
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {question.optionData.map((option) => {
                      const inputId = `stress-q${question.questionId}-v${option.value}`;
                      const isSelected = answers[question.questionId] === option.value;
                      return (
                        <label
                          key={option.value}
                          htmlFor={inputId}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-[6px] border px-3 py-1.5 text-[12px] ${isSelected ? 'border-[#0891B2] bg-[#F0FDFE] font-semibold text-[#0E7490]' : 'border-[#E5E7EB] text-[#444D56]'}`}
                        >
                          <input
                            type="radio"
                            id={inputId}
                            name={`stress-question-${question.questionId}`}
                            checked={isSelected}
                            onChange={() => handleSelect(question.questionId, option.value)}
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}

              {submitError && (
                <p className="text-[12px] text-[#CF222E]" role="alert">
                  {submitError}
                </p>
              )}

              {submitUncertain ? (
                // 저장 여부 불확실 — 자동 재시도 없이, 사용자가 이력을 확인하거나 명시적으로
                // 다시 제출할 때만 다음 요청을 보낸다(중복 저장 완화. 완전 차단은 BE 멱등성 키 필요).
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={refreshLatestResults}>
                    결과 이력 확인
                  </Button>
                  <Button
                    size="sm"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    onClick={() => handleSubmit({ allowUncertain: true })}
                    style={{ background: ACCENT }}
                  >
                    다시 제출하기
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  onClick={() => handleSubmit()}
                  style={{ background: ACCENT }}
                  className="self-start"
                >
                  제출하기
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 방금 제출한 결과 */}
      {latestResult && (
        <div className="bg-white rounded-[8px] border border-[#A5F3FC] shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-5 py-4">
          <h3
            ref={resultHeadingRef}
            tabIndex={-1}
            aria-live="polite"
            className="text-[13px] font-bold text-[#0E7490]"
          >
            검사 결과 · 총점 {latestResult.totalScore} / 33
          </h3>
          <p className="mt-1 text-[12px] font-semibold text-[#1F2328]">{latestResult.resultLevel}</p>
          <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-[#444D56]">
            {latestResult.resultDescription}
          </p>
          <p className="mt-2 text-[11px] text-[#9AA0A6]">{formatKstDateTime(latestResult.testedAt)}</p>
        </div>
      )}

      {/* 이전 결과 이력 */}
      <div>
        <p
          ref={resultsHistoryHeadingRef}
          tabIndex={-1}
          className="mb-2 text-[13px] font-bold text-[#1F2328]"
        >
          이전 결과
        </p>

        {isResultsInitialLoading && <SkeletonLoader rows={3} cols={1} />}

        {!isResultsInitialLoading && isResultsForbidden && (
          <div
            ref={resultErrorRef}
            tabIndex={-1}
            role="alert"
            className="bg-white rounded-[8px] border border-[#FECACA] px-5 py-4"
          >
            <p className="text-[12px] text-[#CF222E]">검사 결과 이력을 조회할 권한이 없습니다.</p>
          </div>
        )}

        {!isResultsInitialLoading && !isResultsForbidden && resultsQuery.isError && (
          <div
            ref={resultErrorRef}
            tabIndex={-1}
            role="alert"
            className="bg-white rounded-[8px] border border-[#FECACA] px-5 py-4"
          >
            <p className="text-[12px] text-[#CF222E]">{getStressResultsErrorMessage()}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => resultsQuery.refetch()}>
              다시 시도
            </Button>
          </div>
        )}

        {!isResultsInitialLoading && !resultsQuery.isError && resultItems.length === 0 && (
          <EmptyState message="검사 결과 이력이 없습니다." />
        )}

        {!isResultsInitialLoading && !resultsQuery.isError && resultItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {resultItems.map((item) => (
              <div
                key={item.resultId}
                className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="text-[12px] font-bold text-[#1F2328]">
                    총점 {item.totalScore} / 33 · {item.resultLevel}
                  </p>
                  <p className="mt-1 text-[11px] text-[#656D76]">{item.resultDescription}</p>
                </div>
                <p className="whitespace-nowrap text-[11px] text-[#9AA0A6]">
                  {formatKstDateTime(item.testedAt)}
                </p>
              </div>
            ))}
          </div>
        )}

        {!resultsQuery.isError && resultTotalPages > 1 && (
          <div
            className="mt-3 flex items-center justify-center gap-2"
            aria-busy={isResultsFetching}
          >
            <Button
              size="sm"
              variant="outline"
              disabled={resultsQuery.data?.first !== false}
              aria-disabled={isResultsFetching || resultsQuery.data?.first !== false}
              onClick={() => {
                if (isResultsFetching || resultsQuery.data?.first !== false) {
                  return;
                }
                setResultPage((prev) => Math.max(0, prev - 1));
              }}
            >
              이전
            </Button>
            <span className="text-[12px] text-[#656D76]">
              {isResultsFetching ? '조회 중...' : `${resultPage + 1} / ${resultTotalPages}`}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={resultsQuery.data?.last !== false}
              aria-disabled={isResultsFetching || resultsQuery.data?.last !== false}
              onClick={() => {
                if (isResultsFetching || resultsQuery.data?.last !== false) {
                  return;
                }
                setResultPage((prev) => prev + 1);
              }}
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
