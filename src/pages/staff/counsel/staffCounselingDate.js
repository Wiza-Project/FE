const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function formatKstDateTime(instant) {
  if (!instant) return '-';
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '-';
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const pad = (value) => String(value).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}
