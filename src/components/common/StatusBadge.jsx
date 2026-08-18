const STATUS_STYLES = {
  info: 'bg-[#DBEAFE] text-[#0969DA]',
  success: 'bg-[#DCFCE7] text-[#1A7F37]',
  warning: 'bg-[#FEF3C7] text-[#D97706]',
  danger: 'bg-[#FEE2E2] text-[#CF222E]',
  neutral: 'bg-[#F3F4F6] text-[#6E7781]',
};

const STATUS_LABELS = {
  모집중: { variant: 'info', label: '모집중' },
  진행중: { variant: 'info', label: '진행중' },
  운영중: { variant: 'info', label: '운영중' },
  신청: { variant: 'info', label: '신청' },
  제출: { variant: 'info', label: '제출' },
  대표: { variant: 'info', label: '대표' },
  승인: { variant: 'success', label: '승인' },
  수료: { variant: 'success', label: '수료' },
  적립완료: { variant: 'success', label: '적립완료' },
  인증: { variant: 'success', label: '인증' },
  확정: { variant: 'success', label: '확정' },
  배정완료: { variant: 'success', label: '배정완료' },
  결과공개: { variant: 'success', label: '결과공개' },
  '동의 완료': { variant: 'success', label: '동의 완료' },
  대기: { variant: 'warning', label: '대기' },
  보완요청: { variant: 'warning', label: '보완요청' },
  마감임박: { variant: 'warning', label: '마감임박' },
  수정요청: { variant: 'warning', label: '수정요청' },
  미배정: { variant: 'warning', label: '미배정' },
  심사요청: { variant: 'warning', label: '심사요청' },
  검토중: { variant: 'warning', label: '검토중' },
  반려: { variant: 'danger', label: '반려' },
  미수료: { variant: 'danger', label: '미수료' },
  취소: { variant: 'danger', label: '취소' },
  마감: { variant: 'danger', label: '마감' },
  거절: { variant: 'danger', label: '거절' },
  종료: { variant: 'neutral', label: '종료' },
  비활성: { variant: 'neutral', label: '비활성' },
  작성중: { variant: 'neutral', label: '작성중' },
  계획: { variant: 'neutral', label: '계획' },
  만료: { variant: 'neutral', label: '만료' },
  재학: { variant: 'success', label: '재학' },
  휴학: { variant: 'warning', label: '휴학' },
  졸업: { variant: 'info', label: '졸업' },
  제적: { variant: 'danger', label: '제적' },
  자퇴: { variant: 'danger', label: '자퇴' },
};

/**
 * 도메인 상태 문자열(모집중/승인/반려 …)을 색상이 입혀진 배지로 보여줍니다.
 * `status`가 위 사전에 없으면 variant를 직접 지정하세요.
 * 화면 문구를 status 값과 다르게 보여줘야 하면 `label`로 덮어쓰세요
 * (예: status="대기"인데 "대기 (D-1)"처럼 보여줘야 하는 경우).
 *
 * @param {Object} props
 * @param {string} props.status
 * @param {'info'|'success'|'warning'|'danger'|'neutral'} [props.variant]
 * @param {string} [props.label]
 * @param {'sm'|'md'} [props.size]
 */
export function StatusBadge({ status, variant, label: labelOverride, size = 'md' }) {
  const cfg = STATUS_LABELS[status];
  const v = variant ?? cfg?.variant ?? 'neutral';
  const label = labelOverride ?? cfg?.label ?? status;
  const sizeClass = size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-[12px] px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-[999px] ${sizeClass} ${STATUS_STYLES[v]}`}
    >
      {label}
    </span>
  );
}
