// yyyy-MM-dd
export const formatDate = (iso) => (iso ? iso.slice(0, 10) : '');

// yyyy-MM-dd HH:mm (formatDate와 동일하게 타임존 변환 없이 ISO 문자열을 그대로 자른다)
export const formatDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ') : '');

// HH:mm
export const formatTime = (iso) => (iso ? iso.slice(11, 16) : '');

/**
 * 상대 시간 표시(알림 목록 등). 1분 미만은 "방금 전", 이후 분/시간/일 단위로 표시하고
 * 7일 이상 지나면 yyyy-MM-dd로 표시합니다.
 * @param {string} iso ISO 8601 문자열
 */
export const formatRelativeTime = (iso) => {
  if (!iso) return '';
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return formatDate(iso);
};
