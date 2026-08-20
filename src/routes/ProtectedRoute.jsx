import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useIdleLogout } from '@/hooks/useIdleLogout';

/**
 * 로그인 여부와 사용자 유형으로 라우트를 막습니다.
 * 인증이 필요한 모든 화면(학생/교직원 포털, /consent)이 이 컴포넌트를 거치므로,
 * 30분 유휴 자동 로그아웃(useIdleLogout)도 여기 한 곳에서 마운트합니다.
 *
 * @param {Object}   props
 * @param {string[]} [props.allow] 허용할 사용자 유형. 비우면 로그인 여부만 확인
 *
 * 주의: 프론트의 차단은 UX용이지 보안 수단이 아닙니다.
 *       브라우저에서 우회 가능하므로 실제 권한 검증은 백엔드가 최종 책임집니다.
 */
export default function ProtectedRoute({ allow }) {
  const { isAuthenticated, user, logoutReason } = useAuthStore();
  const location = useLocation();

  useIdleLogout();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location, reason: logoutReason }} replace />;
  }

  if (allow && !allow.includes(user.userType)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
