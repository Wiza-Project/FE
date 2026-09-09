import { create } from 'zustand';
import { setAccessToken, setSessionExpiredHandler } from '@/api/client';
import { logout as logoutApi } from '@/api/auth';
import { queryClient } from '@/lib/queryClient';
import { publishLogout, subscribeToAuthSync } from '@/lib/authSync';

const clearLocalAuth = (set, reason = null) => {
  setAccessToken(null);
  queryClient.clear();
  set({ user: null, isAuthenticated: false, logoutReason: reason });
};

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
    clearLocalAuth(set);
    publishLogout();
    // best-effort: 실패해도 클라이언트 상태는 이미 정리됐으므로 무시합니다.
    logoutApi().catch(() => {});
  },

  /**
   * 유휴 타임아웃, axios 인터셉터의 재발급 실패처럼 컴포넌트 바깥/비동기 흐름에서
   * 강제로 세션을 끊을 때 사용합니다. isAuthenticated 가 false 로 바뀌면
   * ProtectedRoute 가 알아서 /login 으로 리다이렉트하며 reason 을 함께 넘깁니다.
   */
  forceLogout: (reason) => {
    const logoutReason = reason ?? null;
    clearLocalAuth(set, logoutReason);
    publishLogout(logoutReason);
    logoutApi().catch(() => {});
  },

  /** 다른 탭의 로그아웃을 받았을 때 사용. 서버 호출/재전파는 하지 않습니다. */
  logoutFromOtherTab: (reason) => clearLocalAuth(set, reason ?? null),

  finishBootstrap: () => set({ isBootstrapping: false }),

  // 사용자 약관 동의
  markCommonConsentCompleted: () =>
    set((state) =>
      state.user ? { user: { ...state.user, commonConsentCompleted: true } } : state,
    ),

  /** 현재 사용자가 주어진 유형 중 하나인가 */
  hasType: (...types) => {
    const user = get().user;
    return user != null && types.includes(user.userType);
  },

  /**
   * 현재 사용자가 주어진 role_code 중 하나라도 가지고 있는가.
   * user.roleCodes 는 겸임을 포함한 배열이라 일부만 일치해도 true.
   */
  hasRole: (...roleCodes) => {
    const user = get().user;
    return user != null && (user.roleCodes ?? []).some((code) => roleCodes.includes(code));
  },
}));

// client.js 는 authStore.js 를 import 할 수 없으므로(순환 참조),
// 401 재발급 실패 시 부를 콜백을 여기서 주입합니다.
setSessionExpiredHandler(() => {
  useAuthStore.getState().forceLogout('session_expired');
});

// 모듈은 탭마다 한 번만 평가되므로 구독도 한 번만 등록됩니다.
subscribeToAuthSync((event) => {
  if (event?.type === 'LOGOUT') {
    useAuthStore.getState().logoutFromOtherTab(event.reason);
  }
});
