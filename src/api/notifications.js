import { apiClient } from './client';

/**
 * ⚠️ 백엔드 알림 API는 별도 세션에서 동시 진행 중입니다.
 * 아래 경로 및 응답 필드명(특히 notificationId/title/content/readStatus/createdAt,
 * unread-count 응답 형태)은 가정치입니다. 실제 merge된 컨트롤러/DTO를 확인한 뒤
 * 맞춰주세요. CommonCodeResponseDTO 패턴과 동일하게 ApiResponse<T> 래핑을 가정하며,
 * apiClient 응답 인터셉터가 이를 벗겨 data만 반환합니다.
 */

/**
 * 알림 목록 조회. GET /api/notifications?readStatus=&page=&size=
 * @param {Object} [params]
 * @param {'READ'|'UNREAD'} [params.readStatus] 생략 시 전체.
 * @param {number} [params.page] 0-base 페이지 번호.
 * @param {number} [params.size] 페이지당 건수.
 * @returns {Promise<{content: object[], page: number, size: number, totalElements: number, totalPages: number, first: boolean, last: boolean}>}
 */
export const fetchNotifications = async (params) => {
  const { data } = await apiClient.get('/notifications', { params });
  return data;
};

/**
 * 안읽은 알림 개수 조회. GET /api/notifications/unread-count
 * 응답이 숫자 그대로 내려오는지 { unreadCount } 객체로 감싸 내려오는지 아직 확정되지 않아
 * 방어적으로 둘 다 처리합니다.
 * @returns {Promise<number>}
 */
export const fetchUnreadNotificationCount = async () => {
  const { data } = await apiClient.get('/notifications/unread-count');
  return typeof data === 'number' ? data : (data?.unreadCount ?? 0);
};

/**
 * 개별 알림 읽음 처리. PATCH /api/notifications/{id}/read
 * @param {number} notificationId
 */
export const markNotificationRead = async (notificationId) => {
  const { data } = await apiClient.patch(`/notifications/${notificationId}/read`);
  return data;
};

/**
 * 전체 알림 읽음 처리. PATCH /api/notifications/read-all
 */
export const markAllNotificationsRead = async () => {
  const { data } = await apiClient.patch('/notifications/read-all');
  return data;
};
