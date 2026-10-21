const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 상담 도메인 전용 포맷터. 백엔드가 내려주는 UTC ISO-8601 Instant를
// KST(Asia/Seoul, 서머타임 없이 UTC+9 고정) 기준 'yyyy-MM-dd HH:mm'로 변환한다.
// null/undefined/빈 문자열/파싱 불가능한 값은 모두 '-'로 반환한다.
// new Date(null)이 1970년으로 파싱되는 것을 막기 위해 new Date() 호출 전에 값 존재 여부를 먼저 확인한다.
export function formatKstDateTime(instant) {
  if (!instant) return '-';
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '-';
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const pad = (value) => String(value).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}
