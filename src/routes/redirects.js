import { USER_TYPE } from '@/constants/domain';

/** 로그인/최초 동의 화면 경로. 리다이렉트 목적지로 다시 쓰이면 안 되는 경로들이다. */
export const LOGIN_PATH = '/login';
export const CONSENT_PATH = '/consent';

/**
 * 로그인 직후 돌아갈 원래 목적지가 없을 때 쓰는 역할별 기본 화면.
 * STUDENT/STAFF 외 유형(ADMIN)은 전용 포털이 없어 공개 홈으로 보낸다(router.jsx 주석 참고).
 */
const DEFAULT_PATH_BY_USER_TYPE = {
  [USER_TYPE.STUDENT]: '/my',
  [USER_TYPE.STAFF]: '/staff',
};

/**
 * @param {import('@/constants/domain').AuthenticatedUser|null} user
 * @returns {string} 역할별 기본 진입 경로
 */
export const defaultPathFor = (user) => DEFAULT_PATH_BY_USER_TYPE[user?.userType] ?? '/';

/**
 * 현재 사용자가 공통 필수 약관 동의를 마쳤는지.
 *
 * 백엔드 UserSummaryResponse.commonConsentCompleted — 현재 유효한 COMMON 필수 정책 전부에
 * 대해 철회되지 않은 동의를 갖고 있는지를 DB(consent_policy·user_consent)만 보고 판정한 값이다.
 * 브라우저 저장소를 지우거나 다른 기기에서 로그인해도 값이 같다.
 *
 * 필드가 없는 응답(구버전 서버)은 false로 읽혀 동의 화면으로 보내지지만, 동의 화면이 다시
 * 서버에서 COMMON 정책·내 동의 이력을 조회하므로 이미 동의한 사용자는 그대로 통과한다.
 */
export const hasCompletedCommonConsent = (user) => user?.commonConsentCompleted === true;

/**
 * ProtectedRoute 가 넘겨준 `location.state.from` 을 이동 가능한 내부 경로 문자열로 바꾼다.
 *
 * history state 는 브라우저에서 임의로 조작할 수 있으므로 신뢰하지 않는다. 앱 내부의
 * 절대경로 하나만 허용하고, 외부로 나가는 값(`//evil.com`, `/\evil.com`, `https://…`)과
 * 다시 로그인/동의 화면으로 돌아가는 값은 버린다.
 *
 * @param {{pathname?: string, search?: string, hash?: string}|string|null|undefined} from
 * @returns {string|null} pathname+search+hash 를 합친 내부 경로. 신뢰할 수 없으면 null
 */
export const resolveSafeRedirect = (from) => {
  const isLocationObject = typeof from === 'object' && from !== null;
  const pathname = typeof from === 'string' ? from : isLocationObject ? from.pathname : null;

  if (typeof pathname !== 'string') return null;
  if (!pathname.startsWith('/')) return null;
  // '//host' 는 프로토콜 상대 URL, '/\host' 는 브라우저가 '//host' 로 해석하는 우회 표기다.
  if (pathname.startsWith('//') || pathname.startsWith('/\\')) return null;
  if (pathname === LOGIN_PATH || pathname === CONSENT_PATH) return null;

  const search = isLocationObject && typeof from.search === 'string' ? from.search : '';
  const hash = isLocationObject && typeof from.hash === 'string' ? from.hash : '';
  return `${pathname}${search}${hash}`;
};

/**
 * 로그인/동의를 마친 사용자가 최종적으로 가야 할 경로.
 * 원래 요청했던 화면이 있으면 그곳으로, 없거나 신뢰할 수 없으면 역할별 기본 화면으로 보낸다.
 */
export const resolvePostAuthPath = (from, user) => resolveSafeRedirect(from) ?? defaultPathFor(user);
