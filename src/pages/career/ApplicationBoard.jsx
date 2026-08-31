import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog, toast } from '@/components/common';
import { getMyJobApplications, cancelJobApplication } from '@/api/career';
import { 
  JOB_APPLICATION_STATUS, 
  JOB_APPLICATION_STATUS_LABEL 
} from '@/constants/domain';

// 실제 백엔드 지원 상태 컬럼 그룹
const BOARD_COLUMNS = [
  { key: 'APPLIED', label: '지원완료', color: '#0969DA' },
  { key: 'UNDER_REVIEW', label: '서류검토중', color: '#7C3AED' },
  { key: 'PASSED', label: '합격', color: '#059669' },
  { key: 'REJECTED', label: '불합격', color: '#CF222E' },
];

function KanbanCard({ item, onCancelRequest }) {
  const isCancellable = item.applicationStatus === JOB_APPLICATION_STATUS.APPLIED;

  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-[13px] font-black text-[#1F2328] leading-tight">{item.companyName}</p>
          <p className="text-[11px] text-[#656D76] leading-snug mt-0.5">{item.postingTitle}</p>
        </div>
      </div>

      <p className="text-[10px] text-[#9AA0A6] font-mono mb-3">
        지원일: {item.appliedAt ? String(item.appliedAt).slice(0, 10) : '—'}
      </p>

      {isCancellable && (
        <div className="pt-2 border-t border-[#F3F4F6] flex justify-end">
          <button
            onClick={() => onCancelRequest(item.jobPostingId, item.postingTitle)}
            className="text-[11px] text-[#CF222E] hover:underline"
          >
            지원 취소
          </button>
        </div>
      )}
    </div>
  );
}

export default function ApplicationBoard() {
  const queryClient = useQueryClient();
  const [selectedPosting, setSelectedPosting] = useState(null);

  // 내 지원 내역 목록 조회
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['careerMyJobApplications'],
    queryFn: () => getMyJobApplications({ page: 0, size: 100 }),
  });

  const applications = pageData?.content || [];

  // 지원 취소 Mutation
  const cancelMutation = useMutation({
    mutationFn: (jobPostingId) => cancelJobApplication(jobPostingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['careerMyJobApplications'] });
      queryClient.invalidateQueries({ queryKey: ['careerJobPostings'] });
      setSelectedPosting(null);
      toast('입사지원이 취소되었습니다.', 'info');
    },
    onError: (err) => {
      setSelectedPosting(null);
      toast(err?.response?.data?.message || '지원 취소 처리에 실패했습니다.', 'error');
    },
  });

  const getColumnItems = (statusKey) =>
    applications.filter((app) => app.applicationStatus === statusKey);

  if (isLoading) {
    return <div className="p-16 text-center text-[#9AA0A6]">지원 현황 데이터를 불러오는 중입니다...</div>;
  }

  if (isError) {
    return <div className="p-16 text-center text-[#CF222E]">지원 현황을 불러오지 못했습니다.</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-4 gap-3">
        {BOARD_COLUMNS.map((col) => {
          const count = getColumnItems(col.key).length;
          const label = JOB_APPLICATION_STATUS_LABEL[col.key] || col.key;
          return (
            <div
              key={col.key}
              className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-4 py-3 flex items-center gap-3"
            >
              <div
                className="w-2 h-8 rounded-full flex-shrink-0"
                style={{ background: col.color }}
              />
              <div>
                <p className="text-[11px] text-[#9AA0A6]">{label}</p>
                <p className="text-[18px] font-black" style={{ color: col.color }}>
                  {count}건
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 칸반 보드 컬럼 */}
      <div className="grid grid-cols-4 gap-3">
        {BOARD_COLUMNS.map((col) => {
          const items = getColumnItems(col.key);
          const label = JOB_APPLICATION_STATUS_LABEL[col.key] || col.key;
          return (
            <div key={col.key} className="flex flex-col gap-3">
              <div
                className="flex items-center gap-2 pb-2 border-b-2"
                style={{ borderColor: col.color }}
              >
                <span className="text-[12px] font-black" style={{ color: col.color }}>
                  {label}
                </span>
                <span
                  className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
                  style={{ background: col.color }}
                >
                  {items.length}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-[8px] p-6 text-center text-[11px] text-[#C8D0D9]">
                  내역 없음
                </div>
              ) : (
                items.map((item) => (
                  <KanbanCard
                    key={item.applicationId || item.jobPostingId}
                    item={item}
                    onCancelRequest={(jobPostingId, title) =>
                      setSelectedPosting({ id: jobPostingId, title })
                    }
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* 지원 취소 확인 다이얼로그 */}
      <ConfirmDialog
        open={!!selectedPosting}
        title="지원 취소 확인"
        message={`[${selectedPosting?.title || ''}]\n해당 공고의 지원을 취소하시겠습니까?`}
        confirmLabel="지원 취소"
        onConfirm={() => cancelMutation.mutate(selectedPosting.id)}
        onCancel={() => setSelectedPosting(null)}
      />
    </div>
  );
}