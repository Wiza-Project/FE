import { apiClient } from './client';

/**
 * NotificationController(scms-be) 기준. CommonCodeResponseDTO 패턴과 동일하게
 * ApiResponse<T> 래핑이며, apiClient 응답 인터셉터가 이를 벗겨 data만 반환합니다.
 */

/**
 * 내 알림 목록 조회. GET /api/notifications?readStatus=&page=&size=
 * @param {Object} [params]
 * @param {'UNREAD'|'ALL'} [params.readStatus] 생략 시 백엔드 기본값 ALL(전체, 최신순).
 * @param {number} [params.page] 0-base 페이지 번호.
 * @param {number} [params.size] 페이지당 건수.
 * @returns {Promise<{content: {notificationId: number, notificationType: string, moduleCode: string, title: string, content: string, read: boolean, readAt: string|null, createdAt: string}[], page: number, size: number, totalElements: number, totalPages: number, first: boolean, last: boolean}>}
 */
export const fetchNotifications = async (params) => {
  const { data } = await apiClient.get('/notifications', { params });
  return data;
};

/**
 * 안읽은 알림 존재 여부 조회. GET /api/notifications/has-unread
 * 벨 아이콘 뱃지 표시 여부에만 씁니다.
 * @returns {Promise<boolean>}
 */
export const fetchHasUnreadNotifications = async () => {
  const { data } = await apiClient.get('/notifications/has-unread');
  return data;
};

/**
 * 개별 알림 읽음 처리. PATCH /api/notifications/{notificationId}/read
 * 본인 알림만 처리 가능(서버 검증). 응답 바디 없음(ApiResponse<Void>).
 * @param {number} notificationId
 */
export const markNotificationRead = async (notificationId) => {
  await apiClient.patch(`/notifications/${notificationId}/read`);
};

/**
 * 내 알림 전체 읽음 처리. PATCH /api/notifications/read-all
 * 응답 바디 없음(ApiResponse<Void>).
 */
export const markAllNotificationsRead = async () => {
  await apiClient.patch('/notifications/read-all');
};
