import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/api/client';

const SESSION_EVENTS_PATH = '/auth/session-events';
const SESSION_REPLACED_EVENT = 'session-replaced';

/**
 * 로그인 상태일 때만 GET /api/auth/session-events 에 SSE로 연결해
 * "다른 기기에서 로그인됨" 통지(session-replaced 이벤트, payload
 * { type: 'SESSION_REPLACED', message }) 를 구독합니다.
 *
 * httpOnly refresh 쿠키로 인증하므로 withCredentials: true 로 연결합니다
 * (EventSource는 커스텀 Authorization 헤더를 지원하지 않습니다).
 *
 * 연결 오류(네트워크 문제 등)는 여기서 로그인 상태를 바로 해제하지 않고
 * EventSource의 자동 재연결에 맡깁니다 — 실제 세션 만료는 api/client.js의
 * 401 → reissue 실패 처리(session_expired)가 최종 안전망입니다.
 *
 * 로그아웃되거나(isAuthenticated=false) 컴포넌트가 언마운트되면 연결을 닫습니다.
 */
export function useSessionReplaced() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionReplaced = useAuthStore((s) => s.sessionReplaced);
  const [open, setOpen] = useState(false);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const url = `${apiClient.defaults.baseURL}${SESSION_EVENTS_PATH}`;
    const source = new EventSource(url, { withCredentials: true });
    sourceRef.current = source;

    const onSessionReplaced = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'SESSION_REPLACED') setOpen(true);
      } catch {
        // 알 수 없는 payload는 무시합니다.
      }
    };

    source.addEventListener(SESSION_REPLACED_EVENT, onSessionReplaced);
    // 'error' 리스너는 의도적으로 달지 않습니다 — EventSource가 알아서 재연결을 시도합니다.

    return () => {
      source.removeEventListener(SESSION_REPLACED_EVENT, onSessionReplaced);
      source.close();
      sourceRef.current = null;
    };
  }, [isAuthenticated]);

  /** 모달의 "확인" — 연결을 닫고 클라이언트 상태를 정리한 뒤 /login으로 이동합니다. */
  const confirm = () => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setOpen(false);
    sessionReplaced();
    // 이 훅은 라우터 트리 바깥(main.jsx)에 마운트되어 useNavigate를 쓸 수 없고,
    // 현재 화면이 어떤 라우트든 확실히 로그인 화면으로 보내야 하므로 하드 네비게이션을 씁니다.
    window.location.replace('/login');
  };

  return { open, confirm };
}
