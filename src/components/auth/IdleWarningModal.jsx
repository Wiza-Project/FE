import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

/**
 * 마지막 활동으로부터 25분이 지나면 모든 로그인 탭에 뜨는 유휴 경고 모달.
 * useIdleLogout 이 계산한 warningOpen 을 그대로 받아 그리기만 합니다.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onExtend "계속 사용" — 활동 시각을 갱신하고 모든 탭의 타이머를 리셋
 * @param {() => void} props.onLogout "로그아웃" — 즉시 로그아웃
 */
export function IdleWarningModal({ open, onExtend, onLogout }) {
  return (
    <Modal
      open={open}
      onClose={onExtend}
      title="자동 로그아웃 예정"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onLogout}>
            로그아웃
          </Button>
          <Button variant="primary" size="sm" onClick={onExtend}>
            계속 사용
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-[#1F2328] leading-relaxed">
        장시간 활동이 없어 <span className="font-semibold text-[#D85A30]">5분 후 자동 로그아웃</span>됩니다.
        <br />
        계속 이용하시려면 아래 버튼을 눌러주세요.
      </p>
    </Modal>
  );
}
