import { create } from 'zustand';
import { setAccessToken, setSessionExpiredHandler } from '@/api/client';
import { logout as logoutApi } from '@/api/auth';

/**
 * 로그인 사용자 전역 상태.
 *
 * accessToken 은 메모리에만 있어 새로고침하면 사라집니다 — 앱 부팅 시
 * `AuthBootstrap` 이 /api/auth/reissue 로 세션 복구를 시도합니다.
 *
 * isBootstrapping: 부팅 시 reissue 시도가 끝났는지 여부. AuthBootstrap 이
 *   RouterProvider 를 이 값으로 게이팅하므로, ProtectedRoute 는 신경 쓸 필요가 없습니다.
 * logoutReason: 유휴 타임아웃/세션 만료처럼 "내가 누른 로그아웃이 아닌" 경우
 *   로그인 화면에 보여줄 안내 사유. 'idle' | 'session_expired' | null
 */
export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isBootstrapping: true,
  logoutReason: null,

  login: (user, token) => {
    setAccessToken(token);
    set({ user, isAuthenticated: true, logoutReason: null });
  },

  /** 사용자가 직접 누른 로그아웃 버튼 등에서 사용. */
  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, logoutReason: null });
    // best-effort: 실패해도 클라이언트 상태는 이미 정리됐으므로 무시합니다.
    logoutApi().catch(() => {});
  },

  /**
   * 유휴 타임아웃, axios 인터셉터의 재발급 실패처럼 컴포넌트 바깥/비동기 흐름에서
   * 강제로 세션을 끊을 때 사용합니다. isAuthenticated 가 false 로 바뀌면
   * ProtectedRoute 가 알아서 /login 으로 리다이렉트하며 reason 을 함께 넘깁니다.
   */
  forceLogout: (reason) => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, logoutReason: reason ?? null });
    logoutApi().catch(() => {});
  },

  finishBootstrap: () => set({ isBootstrapping: false }),

  /** 현재 사용자가 주어진 유형 중 하나인가 */
  hasType: (...types) => {
    const user = get().user;
    return user != null && types.includes(user.userType);
  },
}));

// client.js 는 authStore.js 를 import 할 수 없으므로(순환 참조),
// 401 재발급 실패 시 부를 콜백을 여기서 주입합니다.
setSessionExpiredHandler(() => {
  useAuthStore.getState().forceLogout('session_expired');
});
