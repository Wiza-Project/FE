import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useIdleLogout } from '@/hooks/useIdleLogout';

/**
 * 로그인 여부, 사용자 유형, role_code로 라우트를 막습니다.
 * 인증이 필요한 모든 화면(학생/교직원 포털, /consent)이 이 컴포넌트를 거치므로,
 * 30분 유휴 자동 로그아웃(useIdleLogout)도 여기 한 곳에서 마운트합니다.
 *
 * @param {Object}   props
 * @param {string[]} [props.allow] 허용할 사용자 유형(USER_TYPE). 비우면 로그인 여부만 확인
 * @param {string[]} [props.allowRole] 허용할 role_code(USER_ROLE). 비우면 검사 안 함.
 *   allow와 함께 쓰면 둘 다(AND) 통과해야 합니다 — 예: 교직원이면서 카운셀러(ST200)인
 *   사람만 들여보내려면 allow={[USER_TYPE.STAFF]} allowRole={[USER_ROLE.COUNSELOR]}.
 *   user.roleCodes는 겸임을 포함한 배열이라 allowRole 중 하나만 겹쳐도 통과합니다.
 *
 * 주의: 프론트의 차단은 UX용이지 보안 수단이 아닙니다.
 *       브라우저에서 우회 가능하므로 실제 권한 검증은 백엔드가 최종 책임집니다.
 */
export default function ProtectedRoute({ allow, allowRole }) {
  const { isAuthenticated, user, logoutReason } = useAuthStore();
  const location = useLocation();

  useIdleLogout();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location, reason: logoutReason }} replace />;
  }

  if (allow && !allow.includes(user.userType)) {
    return <Navigate to="/forbidden" replace />;
  }

  if (allowRole && !(user.roleCodes ?? []).some((code) => allowRole.includes(code))) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
