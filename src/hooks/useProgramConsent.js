import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchConsentPolicies, fetchMyConsents, agreeToConsentPolicy } from '@/api/consent';
import { CONSENT_MODULE_CODE } from '@/constants/domain';

/**
 * PROGRAM 모듈의 필수 동의 정책(이용약관 + 개인정보 수집·이용, 2건)을 조회하고
 * 아직 동의하지 않은 항목에 대해 동의 처리를 수행한다. ProgramList/ProgramDetail의
 * 신청 흐름에서 공유한다.
 */
export function useProgramConsent() {
  const queryClient = useQueryClient();

  const {
    data: consentPolicies = [],
    isLoading: isPoliciesLoading,
    isError: isPoliciesError,
  } = useQuery({
    queryKey: ['consentPolicies', CONSENT_MODULE_CODE.PROGRAM],
    queryFn: () => fetchConsentPolicies(CONSENT_MODULE_CODE.PROGRAM),
  });
  const {
    data: myConsents = [],
    isLoading: isConsentsLoading,
    isError: isConsentsError,
  } = useQuery({
    queryKey: ['myConsents'],
    queryFn: fetchMyConsents,
  });

  const requiredPolicies = useMemo(
    () => consentPolicies.filter((p) => p.required === true),
    [consentPolicies],
  );

  const agreedPolicyIds = useMemo(
    () =>
      new Set(
        myConsents.filter((c) => c.withdrawnAt === null).map((c) => c.consentPolicyId),
      ),
    [myConsents],
  );

  const [checkedIds, setCheckedIds] = useState(() => new Set());

  const isPolicyAgreed = (consentPolicyId) => agreedPolicyIds.has(consentPolicyId);
  const allAgreed = requiredPolicies.every((p) => isPolicyAgreed(p.consentPolicyId));
  const canProceed = requiredPolicies.every(
    (p) => isPolicyAgreed(p.consentPolicyId) || checkedIds.has(p.consentPolicyId),
  );

  const toggleChecked = (consentPolicyId, checked) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(consentPolicyId);
      else next.delete(consentPolicyId);
      return next;
    });
  };

  const agreeMutation = useMutation({
    mutationFn: (consentPolicyId) => agreeToConsentPolicy(consentPolicyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myConsents'] }),
  });

  // 아직 동의 이력이 없는 필수 정책들에 대해서만 순차로 동의 처리한다(이미 동의한 정책은 재호출하지 않음).
  const ensureAllAgreed = async () => {
    const pending = requiredPolicies.filter((p) => !isPolicyAgreed(p.consentPolicyId));
    for (const p of pending) {
      await agreeMutation.mutateAsync(p.consentPolicyId);
    }
  };

  return {
    requiredPolicies,
    isLoading: isPoliciesLoading || isConsentsLoading,
    isError: isPoliciesError || isConsentsError,
    isPolicyAgreed,
    allAgreed,
    checkedIds,
    toggleChecked,
    canProceed,
    isAgreeing: agreeMutation.isPending,
    ensureAllAgreed,
  };
}
