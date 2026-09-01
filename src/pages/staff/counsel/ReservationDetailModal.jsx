import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal } from '@/components/common';
import { fetchCounselorReservationDetail } from '@/api/counsel';

// 신청 원문 상세는 열람 시에만 조회하고 닫을 때 캐시에서 제거한다.
export default function ReservationDetailModal({ reservationId, onClose }) {
  const queryClient = useQueryClient();
  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailIsError,
  } = useQuery({
    queryKey: ['counselorReservationDetail', reservationId],
    queryFn: () => fetchCounselorReservationDetail(reservationId),
    enabled: reservationId !== null,
  });

  const closeDetail = () => {
    if (reservationId !== null) {
      // 상담 신청 원문을 캐시에 남겨두지 않는다.
      queryClient.removeQueries({ queryKey: ['counselorReservationDetail', reservationId] });
    }
    onClose();
  };

  return (
    <Modal
      open={reservationId !== null}
      onClose={closeDetail}
      title="신청 내용 확인"
      footer={
        <Button variant="outline" onClick={closeDetail}>
          닫기
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {detailLoading ? (
          <p className="text-center text-[12px] text-[#656D76] py-4">불러오는 중입니다.</p>
        ) : detailIsError ? (
          <p className="text-[12px] text-[#CF222E]" role="alert">
            신청 내용을 불러오지 못했습니다. 다시 시도해 주세요.
          </p>
        ) : detail ? (
          <>
            <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB]">
              <p className="text-[10px] font-mono text-[#9AA0A6] mb-1">
                #{detail.reservationId} · {detail.counselingTypeName}
              </p>
              <p className="text-[12px] font-bold text-[#1F2328] whitespace-pre-wrap">
                {detail.requestContent}
              </p>
            </div>
            {detail.decisionReason && (
              <div className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA]">
                <p className="text-[10px] font-semibold text-[#CF222E] mb-1">기존 처리 사유</p>
                <p className="text-[12px] text-[#1F2328]">{detail.decisionReason}</p>
              </div>
            )}
            <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[11px] text-[#92400E]">
              🔒 상담 신청 원문은 담당 상담사만 열람할 수 있습니다.
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
