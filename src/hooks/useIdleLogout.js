import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getLastActivityAt, publishActivity, subscribeToAuthSync } from '@/lib/authSync';

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30분 — 이 시점에 강제 로그아웃
const IDLE_WARNING_MS = 25 * 60 * 1000; // 25분 — 이 시점부터 경고 모달 노출
const RESET_THROTTLE_MS = 1000; // mousemove/scroll 마다 타이머를 리셋하지 않도록 쓰로틀

// 실제 사용자 입력만 감지합니다. react-query refetch, 백그라운드 fetch 등은
// 이 이벤트들을 발생시키지 않으므로 "진짜 비활동"만 카운트됩니다.
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

/**
 * 로그인 상태에서만 동작하는 유휴 자동 로그아웃.
 * ProtectedRoute 에 마운트해서 인증이 필요한 모든 화면을 한 곳에서 커버합니다.
 *
 * - 마지막 활동으로부터 25분: 반환하는 warningOpen 이 true 가 되어 경고 모달을 띄울 수 있습니다.
 * - 마지막 활동으로부터 30분: forceLogout('idle') 로 강제 로그아웃합니다.
 *
 * 모든 탭은 localStorage/BroadcastChannel로 마지막 활동 시각을 공유합니다.
 * 따라서 한 탭에서 계속 활동하면(또는 extendSession 을 호출하면) 다른 탭의
 * 경고 모달도 함께 닫히고 타이머도 함께 연장됩니다.
 * 리다이렉트 자체는 ProtectedRoute 가 isAuthenticated 변화를 감지해 처리합니다
 * (reason 도 함께 location.state 로 전달).
 */
export function useIdleLogout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const forceLogout = useAuthStore((s) => s.forceLogout);
  const logout = useAuthStore((s) => s.logout);
  const timerRef = useRef(null);
  const lastResetRef = useRef(0);
  const scheduleFromRef = useRef(null);
  const [warningOpen, setWarningOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setWarningOpen(false);
      return undefined;
    }

    const clearTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    // activityAt 기준으로 지금이 "정상" / "경고" / "만료" 중 어디에 해당하는지 판단하고,
    // 다음으로 상태가 바뀔 시점에 맞춰 타이머를 다시 예약합니다.
    const scheduleFrom = (activityAt) => {
      clearTimer();
      const elapsed = Date.now() - activityAt;

      if (elapsed >= IDLE_LIMIT_MS) {
        setWarningOpen(false);
        forceLogout('idle');
        return;
      }

      if (elapsed >= IDLE_WARNING_MS) {
        setWarningOpen(true);
        timerRef.current = setTimeout(() => checkExpiry(activityAt), IDLE_LIMIT_MS - elapsed);
        return;
      }

      setWarningOpen(false);
      timerRef.current = setTimeout(() => checkExpiry(activityAt), IDLE_WARNING_MS - elapsed);
    };
    scheduleFromRef.current = scheduleFrom;

    const checkExpiry = (fallbackActivityAt) => {
      // 타이머가 울린 시점에 다른 탭의 활동이 있었을 수 있으므로 저장된 값을 다시 확인합니다.
      const activityAt = getLastActivityAt() ?? fallbackActivityAt;
      scheduleFrom(activityAt);
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastResetRef.current < RESET_THROTTLE_MS) return;
      lastResetRef.current = now;
      publishActivity(now);
      scheduleFrom(now);
    };

    // 새 로그인은 여기서 시작 시각을 기록하고, 이미 열린 다른 탭은 기존 공유 시각을 존중합니다.
    const activityAt = getLastActivityAt();
    if (activityAt) scheduleFrom(activityAt);
    else recordActivity();

    const unsubscribe = subscribeToAuthSync((event) => {
      if (event?.type === 'ACTIVITY' && Number.isFinite(event.at)) {
        scheduleFrom(event.at);
      }
    });

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    return () => {
      clearTimer();
      unsubscribe();
      scheduleFromRef.current = null;
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, recordActivity));
    };
  }, [isAuthenticated, forceLogout]);

  /** 경고 모달의 "계속 사용" — 활동 시각을 지금으로 갱신하고 모든 탭의 타이머를 리셋합니다. */
  const extendSession = () => {
    const now = Date.now();
    lastResetRef.current = now;
    publishActivity(now);
    scheduleFromRef.current?.(now);
  };

  return { warningOpen, extendSession, logoutNow: logout };
}
