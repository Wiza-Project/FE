import { useEffect } from 'react';
import { reissue } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';

/**
 * 앱 최초 진입 시 1회, /api/auth/reissue 로 세션 복구를 시도합니다.
 *
 * accessToken 은 메모리에만 있어 새로고침하면 사라지지만, httpOnly refresh
 * 쿠키가 살아있다면 재발급으로 로그인 상태를 복구할 수 있습니다.
 * 쿠키가 없거나 만료됐다면(A006 "세션이 만료되었습니다") 조용히 로그아웃 상태로 둡니다 —
 * 이건 에러가 아니라 "그냥 로그인 안 한 사용자" 라는 뜻입니다.
 *
 * 부팅 시도가 끝나기 전까지는 children(RouterProvider)을 렌더링하지 않습니다.
 * 그래야 ProtectedRoute 가 판단을 내리기 전에 로그인 화면으로 튕기는 깜빡임이 없습니다.
 */
export default function AuthBootstrap({ children }) {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const login = useAuthStore((s) => s.login);
  const finishBootstrap = useAuthStore((s) => s.finishBootstrap);

  useEffect(() => {
    let canceled = false;

    reissue()
      .then((data) => {
        if (!canceled) login(data.user, data.accessToken);
      })
      .catch(() => {
        // A006 등 — 로그인 이력 없음/만료. 조용히 무시합니다.
      })
      .finally(() => {
        if (!canceled) finishBootstrap();
      });

    return () => {
      canceled = true;
    };
  }, [login, finishBootstrap]);

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8FA]">
        <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return children;
}
