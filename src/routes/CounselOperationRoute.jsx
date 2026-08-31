import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { USER_ROLE } from '@/constants/domain';

/**
 * 상담 운영(/staff/counsel) 전용 라우트 가드. 이 라우트에 도달하기 전에 이미 바깥의
 * ProtectedRoute(allow=[STAFF])가 로그인·교직원 여부를 보장하므로, 여기서는 상담사(ST200)
 * 겸임 여부만 추가로 확인한다. ProtectedRoute를 한 번 더 중첩하면 useIdleLogout과
 * IdleWarningModal이 이중 마운트되어 유휴 경고 모달이 두 개 뜨는 회귀가 생기므로, 유휴
 * 로직이 없는 이 최소 가드로 이 라우트 하나만 막는다. 실제 데이터 접근 권한의 최종
 * 판단은 언제나 백엔드다.
 */
export default function CounselOperationRoute() {
  const user = useAuthStore((state) => state.user);
  const isCounselor = (user?.roleCodes ?? []).includes(USER_ROLE.COUNSELOR);

  return isCounselor ? <Outlet /> : <Navigate to="/forbidden" replace />;
}
