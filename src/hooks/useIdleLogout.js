import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getLastActivityAt, publishActivity, subscribeToAuthSync } from '@/lib/authSync';

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30분
const RESET_THROTTLE_MS = 1000; // mousemove/scroll 마다 타이머를 리셋하지 않도록 쓰로틀

// 실제 사용자 입력만 감지합니다. react-query refetch, 백그라운드 fetch 등은
// 이 이벤트들을 발생시키지 않으므로 "진짜 비활동"만 카운트됩니다.
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

/**
 * 로그인 상태에서만 동작하는 30분 유휴 자동 로그아웃.
 * ProtectedRoute 에 마운트해서 인증이 필요한 모든 화면을 한 곳에서 커버합니다.
 *
 * 모든 탭은 localStorage/BroadcastChannel로 마지막 활동 시각을 공유합니다.
 * 따라서 한 탭에서 계속 활동하면 다른 탭의 유휴 타이머도 함께 연장됩니다.
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

    const clearTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const scheduleExpiry = (activityAt) => {
      clearTimer();
      const remaining = Math.max(0, IDLE_LIMIT_MS - (Date.now() - activityAt));
      timerRef.current = setTimeout(checkExpiry, remaining);
    };

    const checkExpiry = () => {
      // 만료 직전에 다른 탭의 활동이 있었을 수 있으므로 저장된 값을 다시 확인합니다.
      const activityAt = getLastActivityAt() ?? Date.now();
      if (Date.now() - activityAt < IDLE_LIMIT_MS) {
        scheduleExpiry(activityAt);
        return;
      }
      forceLogout('idle');
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastResetRef.current < RESET_THROTTLE_MS) return;
      lastResetRef.current = now;
      publishActivity(now);
      scheduleExpiry(now);
    };

    // 새 로그인은 여기서 시작 시각을 기록하고, 이미 열린 다른 탭은 기존 공유 시각을 존중합니다.
    const activityAt = getLastActivityAt();
    if (activityAt) scheduleExpiry(activityAt);
    else recordActivity();

    const unsubscribe = subscribeToAuthSync((event) => {
      if (event?.type === 'ACTIVITY' && Number.isFinite(event.at)) {
        scheduleExpiry(event.at);
      }
    });

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    return () => {
      clearTimer();
      unsubscribe();
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, recordActivity));
    };
  }, [isAuthenticated, forceLogout]);
}
