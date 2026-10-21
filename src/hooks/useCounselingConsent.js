import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchConsentPolicies, fetchMyConsents, agreeToConsentPolicy } from '@/api/consent';
import {
  CONSENT_MODULE_CODE,
  CONSENT_TYPE,
  COUNSELING_RESERVATION_ERROR_CODE,
} from '@/constants/domain';

export const COUNSELING_CONSENT_POLICIES_QUERY_KEY = [
  'consentPolicies',
  CONSENT_MODULE_CODE.COUNSELING,
];
export const MY_CONSENTS_QUERY_KEY = ['myConsents'];

const UNCHECKED = { checked: false, consentPolicyId: null, version: null };

// 철회되지 않았고(withdrawnAt === null) 현재 정책에 대한 동의 이력만 "유효"로 본다.
const isValidActiveConsent = (consent, consentPolicyId) =>
  Number.isInteger(consentPolicyId) &&
  consentPolicyId > 0 &&
  consent?.consentPolicyId === consentPolicyId &&
  consent.withdrawnAt === null &&
  Number.isInteger(consent.userConsentId) &&
  consent.userConsentId > 0;

// 상담 신청에 필요한 정책은 "개인정보 처리 필수 동의" 정확히 1건이어야 한다.
const filterRequiredPersonalInfo = (policies) =>
  policies.filter(
    (policy) => policy.consentType === CONSENT_TYPE.PERSONAL_INFO && policy.required === true,
  );

/**
 * 상담 신청(일반 신청 화면과 AI 도우미)이 공유하는 동의 처리.
 * CounselingApply에 있던 정책 조회·본인 동의 조회·최신 상태 재조회·동의 기록 로직을 그대로 옮겼다.
 * 이 훅은 화면 단계 전환이나 예약 제출을 하지 않는다. 결과(true/false)만 돌려주고 화면이 다음 행동을 정한다.
 *
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] false면 자동 조회를 하지 않는다(refreshConsentState는 그래도 동작).
 *   AI 패널은 동의 단계에 들어가기 전까지 동의 정보를 읽을 필요가 없어 이 옵션으로 조회를 미룬다.
 */
export function useCounselingConsent({ enabled = true } = {}) {
  // 정책 본문과 내 동의 이력을 모두 서버에서 조회한다(로컬 저장 금지).
  const {
    data: consentPolicies = [],
    isLoading: isPoliciesLoading,
    isError: hasPoliciesError,
    error: policiesError,
    isFetching: isPoliciesFetching,
    refetch: refetchConsentPolicies,
  } = useQuery({
    queryKey: COUNSELING_CONSENT_POLICIES_QUERY_KEY,
    queryFn: () => fetchConsentPolicies(CONSENT_MODULE_CODE.COUNSELING),
    enabled,
  });
  const {
    data: myConsents = [],
    isLoading: isMyConsentsLoading,
    isError: hasMyConsentsError,
    error: myConsentsError,
    isFetching: isMyConsentsFetching,
    refetch: refetchMyConsents,
  } = useQuery({
    queryKey: MY_CONSENTS_QUERY_KEY,
    queryFn: fetchMyConsents,
    enabled,
  });
  const isLoading = isPoliciesLoading || isMyConsentsLoading;
  const isFetching = isPoliciesFetching || isMyConsentsFetching;
  const hasQueryError = hasPoliciesError || hasMyConsentsError;
  // 조회가 실패했다는 사실만 화면에 알리면 되므로 첫 번째 오류 객체를 돌려준다(없으면 null).
  const error = hasQueryError ? (policiesError ?? myConsentsError ?? true) : null;
  const refetch = () => {
    refetchConsentPolicies();
    refetchMyConsents();
  };

  // 0건 또는 2건 이상이면 정책 설정 오류이므로, 임의로 하나를 골라 진행하지 않고 신청 자체를 막는다.
  const requiredPolicies = useMemo(
    () => filterRequiredPersonalInfo(consentPolicies),
    [consentPolicies],
  );
  const currentPolicy = requiredPolicies.length === 1 ? requiredPolicies[0] : null;
  const hasConfigError = !isLoading && !hasQueryError && requiredPolicies.length !== 1;

  const activeConsent = useMemo(
    () => myConsents.find((c) => isValidActiveConsent(c, currentPolicy?.consentPolicyId)),
    [myConsents, currentPolicy],
  );

  // 체크박스는 서버 동의 기록 없이는 아무 의미가 없는 일시 UI 상태일 뿐이다.
  // 정책 ID나 버전이 바뀌면 이전 정책에 체크한 값이 새 정책 동의로 오인되지 않도록 해제한다.
  const [consentChecked, setConsentChecked] = useState(UNCHECKED);
  const [consentError, setConsentError] = useState('');
  const [isAgreeing, setIsAgreeing] = useState(false);
  useEffect(() => {
    setConsentChecked(UNCHECKED);
  }, [currentPolicy?.consentPolicyId, currentPolicy?.version]);

  const changeConsentChecked = (checked) => {
    if (!currentPolicy) {
      return;
    }
    setConsentChecked({
      checked,
      consentPolicyId: checked ? currentPolicy.consentPolicyId : null,
      version: checked ? currentPolicy.version : null,
    });
  };
  const resetConsentChecked = () => setConsentChecked(UNCHECKED);

  const agreeMutation = useMutation({
    mutationFn: (consentPolicyId) => agreeToConsentPolicy(consentPolicyId),
  });

  // 정책 변경이나 동의 철회가 오래된 Query 캐시에 남지 않도록 서버의 최신 상태를 확인한다.
  // 판단은 캐시가 아니라 이 재조회가 돌려준 값으로 한다. 조회가 실패하면 throw한다(무효로 단정하지 않는다).
  const refreshConsentState = async () => {
    const [policiesResult, consentsResult] = await Promise.all([
      refetchConsentPolicies({ throwOnError: true }),
      refetchMyConsents({ throwOnError: true }),
    ]);
    const refreshedRequiredPolicies = filterRequiredPersonalInfo(policiesResult.data ?? []);

    if (refreshedRequiredPolicies.length !== 1) {
      return { policy: null, consent: null };
    }

    const policy = refreshedRequiredPolicies[0];
    const consent = (consentsResult.data ?? []).find((item) =>
      isValidActiveConsent(item, policy.consentPolicyId),
    );
    return { policy, consent: consent ?? null };
  };

  // "동의하고 다음" 동작. 최신 정책과 동의 이력을 재확인한 뒤,
  // 유효한 동의가 있으면 기록 POST 없이 true, 없으면 최신 정책에 동의를 기록하고 다시 조회해 확인한다.
  // 실패하면 consentError에 안내를 남기고 false를 돌려준다.
  const agreeCurrentPolicy = async () => {
    if (agreeMutation.isPending || isAgreeing || !currentPolicy) {
      return false;
    }
    setConsentError('');
    setIsAgreeing(true);
    try {
      const initialConsentState = await refreshConsentState();
      if (!initialConsentState.policy) {
        setConsentError(
          '동의 처리 후 유효한 동의 정책을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
        return false;
      }

      if (initialConsentState.consent) {
        resetConsentChecked();
        return true;
      }

      if (
        initialConsentState.policy.consentPolicyId !== currentPolicy.consentPolicyId ||
        initialConsentState.policy.version !== currentPolicy.version
      ) {
        resetConsentChecked();
        setConsentError('동의 정책이 변경되었습니다. 최신 내용을 확인한 뒤 다시 동의해 주세요.');
        return false;
      }

      if (
        !consentChecked.checked ||
        consentChecked.consentPolicyId !== currentPolicy.consentPolicyId ||
        consentChecked.version !== currentPolicy.version
      ) {
        setConsentError(
          '기존 동의가 더 이상 유효하지 않습니다. 동의 내용을 확인한 뒤 동의에 체크해 주세요.',
        );
        return false;
      }

      await agreeMutation.mutateAsync(initialConsentState.policy.consentPolicyId);
      resetConsentChecked();

      const consentStateAfterAgree = await refreshConsentState();
      if (!consentStateAfterAgree.policy) {
        setConsentError(
          '동의 처리 후 유효한 동의 정책을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
        return false;
      }
      if (!consentStateAfterAgree.consent) {
        setConsentError(
          '동의 처리 후 유효한 동의 기록을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
        return false;
      }
      return true;
    } catch (error) {
      if (error?.code === COUNSELING_RESERVATION_ERROR_CODE.CONSENT_CONFLICT) {
        // 동시에 들어온 다른 요청이 먼저 동의를 기록했을 수 있다. 이력을 한 번만 재조회해
        // 이미 유효한 동의가 생겼는지 확인하고, 없으면 조용히 넘어가지 않고 오류로 멈춘다.
        try {
          const consentStateAfterConflict = await refreshConsentState();
          if (consentStateAfterConflict.policy && consentStateAfterConflict.consent) {
            resetConsentChecked();
            return true;
          }
        } catch {
          // 재조회 자체가 실패하면 아래 공통 오류 메시지로 떨어진다.
        }
      }
      setConsentError('동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return false;
    } finally {
      setIsAgreeing(false);
    }
  };

  return {
    currentPolicy,
    activeConsent,
    isLoading,
    isFetching,
    error,
    hasConfigError,
    refetch,
    consentChecked,
    changeConsentChecked,
    resetConsentChecked,
    consentError,
    setConsentError,
    isAgreeing,
    refreshConsentState,
    agreeCurrentPolicy,
  };
}
