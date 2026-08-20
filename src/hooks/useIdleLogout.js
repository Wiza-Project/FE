import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30분
const RESET_THROTTLE_MS = 1000; // mousemove/scroll 마다 타이머를 리셋하지 않도록 쓰로틀

// 실제 사용자 입력만 감지합니다. react-query refetch, 백그라운드 fetch 등은
// 이 이벤트들을 발생시키지 않으므로 "진짜 비활동"만 카운트됩니다.
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

/**
 * 로그인 상태에서만 동작하는 30분 유휴 자동 로그아웃.
 * ProtectedRoute 에 마운트해서 인증이 필요한 모든 화면을 한 곳에서 커버합니다.
 *
 * 타이머 만료 시 authStore.forceLogout('idle') 을 호출해 세션을 끊습니다.
 * 리다이렉트 자체는 ProtectedRoute 가 isAuthenticated 변화를 감지해 처리합니다
 * (reason 도 함께 location.state 로 전달).
 */
export function useIdleLogout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const forceLogout = useAuthStore((s) => s.forceLogout);
  const timerRef = useRef(null);
  const lastResetRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const expire = () => {
      forceLogout('idle');
    };

    const resetTimer = () => {
      const now = Date.now();
      if (now - lastResetRef.current < RESET_THROTTLE_MS) return;
      lastResetRef.current = now;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(expire, IDLE_LIMIT_MS);
    };

    timerRef.current = setTimeout(expire, IDLE_LIMIT_MS);
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isAuthenticated, forceLogout]);
}
