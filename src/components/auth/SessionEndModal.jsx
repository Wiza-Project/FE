import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

/**
 * 다른 기기에서 로그인되어 이 세션이 강제 종료됐을 때 뜨는 모달.
 * dismissible={false}로 배경 클릭/X 닫기를 막아 "확인"으로만 넘어갈 수 있습니다.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onConfirm
 */
export function SessionEndModal({ open, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={() => {}}
      dismissible={false}
      title="로그인 종료"
      size="sm"
      footer={
        <Button variant="primary" size="sm" onClick={onConfirm}>
          확인
        </Button>
      }
    >
      <p className="text-[13px] text-[#1F2328]">다른 기기에서 로그인되었습니다.</p>
    </Modal>
  );
}
