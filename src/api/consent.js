import { apiClient } from '@/api/client';

/**
 * @typedef {Object} ConsentPolicy
 * @property {number} consentPolicyId
 * @property {string} consentType
 * @property {string} moduleCode
 * @property {string} version
 * @property {string} title
 * @property {string} content 약관 본문. plain text로 렌더해야 하며 HTML로 신뢰하지 않는다.
 * @property {boolean} required
 * @property {string} effectiveFrom UTC ISO-8601 Instant
 * @property {string|null} effectiveTo UTC ISO-8601 Instant
 */

/**
 * 지정한 모듈에서 현재 유효한 동의 정책만 조회한다.
 * 서버가 이미 유효 정책만 걸러서 내려주므로 프론트에서 effectiveFrom/To를 다시 비교하지 않는다.
 *
 * @param {string} moduleCode 예: 'COUNSELING'
 * @returns {Promise<ConsentPolicy[]>}
 */
export const fetchConsentPolicies = async (moduleCode) => {
  const { data } = await apiClient.get('/consents/policies', {
    params: { moduleCode },
  });
  return data;
};

/**
 * @typedef {Object} UserConsent
 * @property {number} userConsentId
 * @property {number} consentPolicyId
 * @property {string} consentType
 * @property {string} moduleCode
 * @property {string} version
 * @property {string} title
 * @property {string} consentedAt UTC ISO-8601 Instant
 * @property {string|null} withdrawnAt UTC ISO-8601 Instant. null이면 철회되지 않아 유효한 이력이다.
 */

/**
 * 로그인한 본인의 동의 이력을 철회분까지 포함해 조회한다.
 * 특정 정책이 현재 유효한지는 호출부가 consentPolicyId와 withdrawnAt으로 직접 판정한다.
 *
 * @returns {Promise<UserConsent[]>}
 */
export const fetchMyConsents = async () => {
  const { data } = await apiClient.get('/consents/me');
  // 백엔드가 non_null 직렬화 정책이라 활성 동의의 withdrawnAt(null)은 JSON에서 생략된다.
  // 호출부가 withdrawnAt === null 로 유효성을 판정하므로, 생략된 값을 경계에서 null로 정규화한다.
  // 철회된 동의는 실제 시각 문자열이 스프레드로 덮어써져 그대로 유지된다.
  return data.map((consent) => ({ withdrawnAt: null, ...consent }));
};

/**
 * 지정한 정책에 동의한 이력을 남긴다. 이미 유효한 동의가 있으면 서버가 기존 이력을 그대로 반환한다(멱등).
 *
 * @param {number} consentPolicyId
 * @returns {Promise<UserConsent>}
 */
export const agreeToConsentPolicy = async (consentPolicyId) => {
  const { data } = await apiClient.post('/consents', { consentPolicyId });
  return data;
};
