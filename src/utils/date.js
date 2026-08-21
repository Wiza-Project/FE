// yyyy-MM-dd
export const formatDate = (iso) => (iso ? iso.slice(0, 10) : '');

// yyyy-MM-dd HH:mm (formatDate와 동일하게 타임존 변환 없이 ISO 문자열을 그대로 자른다)
export const formatDateTime = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ') : '');
