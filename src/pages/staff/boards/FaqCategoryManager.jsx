import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/common';
import { fetchFaqCategories } from '@/api/boards';
import { ApiError } from '@/api/client';

function getErrorMessage(error, fallback) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  return error.message || fallback;
}

/**
 * FAQ 카테고리 목록(읽기 전용) 모달. GET /api/boards/FAQ/categories.
 *
 * 확정: 카테고리는 게시판 API가 아니라 공통코드(common_code, code_group=FAQ_CATEGORY)로
 * 관리되고, 등록/수정/비활성화는 화면 기능 없이 백엔드가 시드(CommonCodeSeeder)를 고쳐
 * 배포할 때 반영하는 방식으로 최종 확정됐다(백엔드팀 확인 회신, WP-220/229) — 별도
 * 관리자 CRUD API를 만들 계획은 없다. 이 화면은 임시가 아니라 최종 형태이며, 카테고리
 * 추가·변경이 필요하면 화면이 아니라 백엔드 채널로 요청해야 한다.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 */
export default function FaqCategoryManager({ open, onClose }) {
  const { data: categories = [], isLoading, isError, error } = useQuery({
    queryKey: ['faqCategories'],
    queryFn: fetchFaqCategories,
    enabled: open,
  });

  return (
    <Modal open={open} onClose={onClose} title="FAQ 카테고리 목록" size="sm">
      {isLoading && <p className="text-[13px] text-[#9AA0A6] text-center py-6">불러오는 중...</p>}
      {isError && (
        <p className="text-[13px] text-[#CF222E] text-center py-6">
          {getErrorMessage(error, '카테고리 목록을 불러오지 못했습니다.')}
        </p>
      )}
      {!isLoading && !isError && (
        <>
          <div className="border border-[#E5E7EB] rounded-[8px] mb-4 max-h-[280px] overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-[12px] text-[#9AA0A6] text-center py-6">등록된 카테고리가 없습니다.</p>
            ) : (
              categories.map((c) => (
                <div key={c.categoryCode} className="flex items-center gap-2 px-3 py-2 border-b border-[#F3F4F6] last:border-0">
                  <span className={`flex-1 text-[13px] font-medium ${c.active === false ? 'text-[#9AA0A6] line-through' : 'text-[#1F2328]'}`}>
                    {c.categoryName}
                  </span>
                  {c.active === false && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#9AA0A6]">
                      비활성
                    </span>
                  )}
                  <span className="text-[11px] text-[#9AA0A6]">{c.categoryCode}</span>
                </div>
              ))
            )}
          </div>

          <p className="text-[11px] text-[#9AA0A6]">
            카테고리는 백엔드에서 관리합니다. 추가·수정·비활성화가 필요하면 이 화면이 아니라
            담당팀에 요청해 주세요.
          </p>
        </>
      )}
    </Modal>
  );
}
