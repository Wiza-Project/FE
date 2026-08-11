import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/**
 * 로그인 여부와 사용자 유형으로 라우트를 막습니다.
 *
 * @param {Object}   props
 * @param {string[]} [props.allow] 허용할 사용자 유형. 비우면 로그인 여부만 확인
 *
 * 주의: 프론트의 차단은 UX용이지 보안 수단이 아닙니다.
 *       브라우저에서 우회 가능하므로 실제 권한 검증은 백엔드가 최종 책임집니다.
 */
export default function ProtectedRoute({ allow }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allow && !allow.includes(user.userType)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
