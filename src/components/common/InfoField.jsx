/**
 * 라벨 + 값 형태의 읽기 전용 정보 한 칸. 여러 화면의 "상세 정보" 그리드에서 공통으로 씁니다
 * (예: 학생 포털 학적 정보, 교직원 학적부 상세). `value`가 없고 `children`을 넘기면
 * 값 자리를 커스텀 콘텐츠(뱃지, 입력 필드 등)로 대체할 수 있습니다.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {import('react').ReactNode} [props.value]
 * @param {import('react').ReactNode} [props.children]
 * @param {string} [props.className]
 */
export function InfoField({ label, value, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold text-[#656D76]">{label}</span>
      {children ?? (
        <span className="text-[13px] font-semibold text-[#1F2328]">{value ?? '-'}</span>
      )}
    </div>
  );
}
