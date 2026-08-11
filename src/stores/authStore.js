import { create } from 'zustand';
import { setAccessToken } from '@/api/client';

/**
 * 로그인 사용자 전역 상태.
 *
 * TODO:refresh token 방식이 정해지면
 * 앱 진입 시 /api/auth/me 를 호출해 복구하는 로직을 추가예정
 */
export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,

  login: (user, token) => {
    setAccessToken(token);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },

  /** 현재 사용자가 주어진 유형 중 하나인가 */
  hasType: (...types) => {
    const user = get().user;
    return user != null && types.includes(user.userType);
  },
}));
