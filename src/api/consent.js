import { apiClient } from '@/api/client';

/**
 * 동의 정책 목록 조회. moduleCode 기준으로 현재 유효한 정책만 유형별로 내려온다.
 *
 * @param {string} moduleCode CONSENT_MODULE_CODE 값 (예: 'ASSESSMENT')
 * @returns {Promise<Array<{
 *   consentPolicyId: number,
 *   consentType: string,
 *   moduleCode: string,
 *   version: string,
 *   title: string,
 *   content: string,
 *   required: boolean,
 *   effectiveFrom: string,
 *   effectiveTo: string|null,
 * }>>}
 */
export const fetchConsentPolicies = async (moduleCode) => {
  const { data } = await apiClient.get('/consents/policies', { params: { moduleCode } });
  return data;
};

/**
 * 정책 한 건에 동의를 기록한다. 이미 유효하게 동의한 정책이면 새로 만들지 않고
 * 기존 이력을 그대로 반환한다(멱등) — 재호출해도 안전하다.
 *
 * @param {number} consentPolicyId
 * @returns {Promise<{
 *   userConsentId: number,
 *   consentPolicyId: number,
 *   consentType: string,
 *   moduleCode: string,
 *   version: string,
 *   title: string,
 *   consentedAt: string,
 *   withdrawnAt: string|null,
 * }>}
 */
export const agreeConsent = async (consentPolicyId) => {
  const { data } = await apiClient.post('/consents', { consentPolicyId });
  return data;
};
