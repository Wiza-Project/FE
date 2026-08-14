/**
 * 아직 구현되지 않은 화면 자리에 쓰는 공통 플레이스홀더.
 * PortalShell 내비게이션 항목은 모두 실제 라우트로 연결되어 있으므로,
 * 화면을 만들기 전까지 이 컴포넌트로 채워두세요.
 *
 * @param {Object} props
 * @param {string} [props.label]
 */
export function ComingSoon({ label = '이 화면' }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4">
          <span className="text-[28px]">🏫</span>
        </div>
        <div className="text-[18px] font-bold text-[#1F2328] mb-1">{label}</div>
        <div className="text-[13px] text-[#9AA0A6]">이 화면은 다음 단계에서 구현됩니다.</div>
      </div>
    </div>
  );
}
