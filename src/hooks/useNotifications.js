import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchHasUnreadNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications';

const NOTIFICATIONS_KEY = 'notifications';

/**
 * 알림 목록 조회 훅(알림 드롭다운용). 알림은 자주 바뀔 수 있어 staleTime을 짧게(30초) 둡니다.
 * 드롭다운이 닫혀 있을 때는 요청하지 않도록 `enabled`로 제어하세요.
 *
 * @param {Object} [params]
 * @param {'UNREAD'|'ALL'} [params.readStatus] 생략 시 백엔드 기본값 ALL.
 * @param {number} [params.page]
 * @param {number} [params.size]
 * @param {boolean} [enabled] 기본 true. 드롭다운이 열렸을 때만 true로 넘기면 불필요한 요청을 줄일 수 있습니다.
 */
export function useNotifications(params = {}, enabled = true) {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, 'list', params],
    queryFn: () => fetchNotifications(params),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * 안읽은 알림 존재 여부. 알림 벨 뱃지 표시용으로 30초 간격으로 폴링합니다.
 * 웹소켓/SSE 실시간 갱신은 이번 스코프가 아닙니다.
 */
export function useHasUnreadNotifications() {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, 'hasUnread'],
    queryFn: fetchHasUnreadNotifications,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/** 개별 알림 읽음 처리. 성공 시 목록/뱃지 카운트를 함께 리페치합니다. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}

/** 전체 알림 읽음 처리. 성공 시 목록/뱃지 카운트를 함께 리페치합니다. */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}
