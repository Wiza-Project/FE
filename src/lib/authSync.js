const ACTIVITY_KEY = 'scms:last-activity-at';
const EVENT_KEY = 'scms:auth-event';
const CHANNEL_NAME = 'scms-auth';

const canUseWindow = typeof window !== 'undefined';
const channel = canUseWindow && 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;

const toTimestamp = (value) => {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
};

export const getLastActivityAt = () => {
  if (!canUseWindow) return null;
  return toTimestamp(window.localStorage.getItem(ACTIVITY_KEY));
};

export const publishActivity = (at = Date.now()) => {
  if (!canUseWindow) return;

  window.localStorage.setItem(ACTIVITY_KEY, String(at));
  channel?.postMessage({ type: 'ACTIVITY', at });
};

export const publishLogout = (reason = null) => {
  if (!canUseWindow) return;

  const event = { type: 'LOGOUT', reason, at: Date.now() };
  if (channel) {
    channel.postMessage(event);
    return;
  }

  // BroadcastChannel 미지원 브라우저에서도 storage 이벤트로 다른 탭에 전달합니다.
  window.localStorage.setItem(EVENT_KEY, JSON.stringify(event));
};

/** 다른 탭에서 발생한 인증·활동 이벤트만 구독합니다. */
export const subscribeToAuthSync = (listener) => {
  if (!canUseWindow) return () => {};

  const onMessage = (event) => listener(event.data);
  const onStorage = (event) => {
    if (event.key === ACTIVITY_KEY && event.newValue) {
      const at = toTimestamp(event.newValue);
      if (at) listener({ type: 'ACTIVITY', at });
    }

    if (!channel && event.key === EVENT_KEY && event.newValue) {
      try {
        listener(JSON.parse(event.newValue));
      } catch {
        // 잘못된 값은 무시합니다. 이 키는 이 앱만 기록합니다.
      }
    }
  };

  channel?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);

  return () => {
    channel?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
};
