import { apiClient } from './client';

/**
 * @typedef {import('@/constants/domain').AuthenticatedUser} AuthenticatedUser
 * @typedef {Object} LoginResult
 * @property {string} accessToken
 * @property {string} tokenType
 * @property {number} expiresIn
 * @property {AuthenticatedUser} user
 */

/**
 * POST /api/auth/login
 * 실패 시 ApiError(code, message, data) — U003/U004/U005/U006/C001 참고.
 *
 * U003(비밀번호 불일치)이면서 존재하는 아이디인 경우, ApiError.data 에
 * { remainingAttempts: number, accountLocked: boolean } 가 함께 실려옵니다
 * 존재하지 않는 아이디는 계정 존재 여부를 노출하지
 * 않기 위해 data 자체가 없습니다(undefined). LoginPage.jsx의 U003 분기 참고.
 *
 * 요청 바디 키는 universityNo 입니다 — 응답의 user.loginId 와 같은 값(학번/교번)을
 * 가리키지만 백엔드 LoginRequest 는 요청 필드명을 universityNo 로 고정해뒀습니다.
 * @returns {Promise<LoginResult>}
 */
export const login = async ({ loginId, password }) => {
  const { data } = await apiClient.post('/auth/login', { universityNo: loginId, password });
  return data;
};

/**
 * POST /api/auth/reissue
 * 요청 바디 없음 — httpOnly refresh 쿠키를 브라우저가 자동으로 실어 보냅니다.
 * 실패(A006)는 "로그인 이력 없음/만료"를 뜻하며 에러로 크게 다룰 필요는 없습니다.
 * @returns {Promise<LoginResult>}
 */
export const reissue = async () => {
  const { data } = await apiClient.post('/auth/reissue');
  return data;
};

/**
 * POST /api/auth/logout
 * 서버의 refresh 쿠키를 정리합니다. best-effort 호출로 사용하세요(실패해도 클라이언트 상태는 정리).
 */
export const logout = async () => {
  const { data } = await apiClient.post('/auth/logout');
  return data;
};
