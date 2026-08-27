import { useSessionReplaced } from '@/hooks/useSessionReplaced';
import { SessionEndModal } from './SessionEndModal';

/**
 * 앱 최상위(main.jsx)에 한 번 마운트해서, 로그인 상태인 동안 계속
 * /api/auth/session-events SSE를 구독하고 다른 기기 로그인 알림을
 * 받으면 강제 종료 모달을 띄웁니다. 라우트와 무관하게 항상 떠 있어야
 * 해서 ProtectedRoute가 아니라 AuthBootstrap과 나란히 마운트합니다.
 */
export default function SessionEventsListener() {
  const { open, confirm } = useSessionReplaced();
  return <SessionEndModal open={open} onConfirm={confirm} />;
}
