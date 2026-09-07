export const formatKstDateTime = (iso) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '표시할 수 없음';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
};
