import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Pagination, toast } from '@/components/common';
import { getStaffJobPostings, reviewJobPosting, getCompanies } from '@/api/careerStaff';

const ACCENT = '#1F2937';
const PAGE_SIZE = 10;

const REVIEW_STATUS_STYLE = {
  REQUESTED: { label: '검수 대기', bg: '#FEF3C7', text: '#D97706' },
  APPROVED: { label: '승인(게시)', bg: '#D1FAE5', text: '#059669' },
  REJECTED: { label: '반려', bg: '#FEE2E2', text: '#CF222E' },
};

export default function TabJobReview() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [reviewFilter, setReviewFilter] = useState('REQUESTED'); // REQUESTED | APPROVED | REJECTED | ALL
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 1. 전체 공고 지표 조회를 위한 쿼리 (실시간 통계용)
  const { data: allPostingsData } = useQuery({
    queryKey: ['staffAllJobPostingsStats'],
    queryFn: () => getStaffJobPostings({ size: 200 }),
  });
  const allPosts = allPostingsData?.content || (Array.isArray(allPostingsData) ? allPostingsData : []);

  // 2. 기업 인증 현황 조회를 위한 쿼리 (실시간 통계용)
  const { data: companiesData } = useQuery({
    queryKey: ['staffCompaniesListStats'],
    queryFn: () => getCompanies({ size: 200 }),
  });
  const allCompanies = companiesData?.content || (Array.isArray(companiesData) ? companiesData : []);

  // 실시간 지표 계산
  const requestedCount = allPosts.filter((p) => p.reviewStatus === 'REQUESTED').length;
  const publishedCount = allPosts.filter((p) => p.postingStatus === 'PUBLISHED').length;
  const pendingCompanyCount = allCompanies.filter((c) => c.verificationStatus === 'PENDING').length;
  const totalCompanyCount = allCompanies.length;

  // 3. 필터링된 구인신청 검수 목록 조회
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['staffJobReviewList', page, reviewFilter],
    queryFn: () =>
      getStaffJobPostings({
        page: page - 1,
        size: PAGE_SIZE,
        reviewStatus: reviewFilter === 'ALL' ? undefined : reviewFilter,
      }),
    keepPreviousData: true,
  });

  const posts = pageData?.content || (Array.isArray(pageData) ? pageData : []);
  const totalElements = pageData?.totalElements || posts.length || 0;
  const totalPages = pageData?.totalPages || 1;

  // 검수 승인 / 반려 Mutation
  const reviewMutation = useMutation({
    mutationFn: ({ jobPostingId, reviewStatus, rejectionReason }) =>
      reviewJobPosting(jobPostingId, { reviewStatus, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffJobReviewList'] });
      queryClient.invalidateQueries({ queryKey: ['staffAllJobPostings'] });
      queryClient.invalidateQueries({ queryKey: ['staffAllJobPostingsStats'] });
      setRejectTarget(null);
      setRejectionReason('');
      toast('검수 처리가 완료되었습니다.', 'success');
    },
    onError: (err) => {
      toast(err?.response?.data?.message || '검수 처리에 실패했습니다.', 'error');
    },
  });

  return (
    <div className="flex flex-col gap-5">
      {/* 실시간 연동 4개 주요 지표 카드 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '검수 대기 공고', value: requestedCount, unit: '건', color: '#D97706' },
          { label: '운영 게시중 공고', value: publishedCount, unit: '건', color: '#059669' },
          { label: '인증 심사 기업', value: pendingCompanyCount, unit: '건', color: '#4F46E5' },
          { label: '협약 기업 총계', value: totalCompanyCount, unit: '개사', color: '#1F2328' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <p className="text-[11px] text-[#656D76] font-medium">{c.label}</p>
            <p className="text-[22px] font-black mt-1" style={{ color: c.color }}>
              {c.value}
              <span className="text-[13px] font-normal text-[#656D76] ml-1">{c.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 필터 탭 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {[
            { key: 'REQUESTED', label: '검수 대기중' },
            { key: 'APPROVED', label: '승인 완료' },
            { key: 'REJECTED', label: '반려 목록' },
            { key: 'ALL', label: '전체 목록' },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => {
                setReviewFilter(st.key);
                setPage(1);
              }}
              className={`h-8 px-3 text-[12px] font-bold rounded-[6px] transition-colors ${
                reviewFilter === st.key
                  ? 'bg-[#1F2937] text-white shadow-sm'
                  : 'bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* 구인 신청 검수 목록 테이블 */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <span className="text-[13px] font-bold text-[#1F2328]">
              구인 신청 목록 ({reviewFilter === 'REQUESTED' ? '검수 대기' : reviewFilter === 'APPROVED' ? '승인' : reviewFilter === 'REJECTED' ? '반려' : '전체'})
            </span>
          </div>
          <span className="text-[12px] text-[#656D76] font-medium">총 {totalElements}건</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F6F8FA]">
                {['공고 ID', '기업명', '공고명', '직무(NCS)', '고용형태', '접수기간', '검수 상태', '심사 처리'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#9AA0A6]">신청 공고를 불러오는 중입니다...</td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#9AA0A6]">해당 조건의 신청 공고가 없습니다.</td>
                </tr>
              ) : (
                posts.map((p) => {
                  const s = REVIEW_STATUS_STYLE[p.reviewStatus] || { label: p.reviewStatus, bg: '#F3F4F6', text: '#374151' };
                  return (
                    <tr key={p.jobPostingId} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-mono text-[10px] text-center font-bold" style={{ color: ACCENT }}>{p.jobPostingId}</td>
                      <td className="px-4 py-3 font-bold text-[#1F2328]">{p.companyName}</td>
                      <td className="px-4 py-3 text-[#1F2328] font-medium">{p.postingTitle}</td>
                      <td className="px-4 py-3 text-[#656D76] text-center">{p.ncsCodeName || '—'}</td>
                      <td className="px-4 py-3 text-[#656D76] text-center">{p.employmentType || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] text-center whitespace-nowrap">
                        {p.applicationStartsAt ? String(p.applicationStartsAt).slice(5, 10) : ''} ~ {p.applicationEndsAt ? String(p.applicationEndsAt).slice(5, 10) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.text }}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.reviewStatus === 'REQUESTED' ? (
                          <div className="flex gap-1.5 justify-center">
                            <button
                              disabled={reviewMutation.isPending}
                              onClick={() => reviewMutation.mutate({ jobPostingId: p.jobPostingId, reviewStatus: 'APPROVED' })}
                              className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] text-white"
                              style={{ background: ACCENT }}
                            >
                              승인
                            </button>
                            <button
                              disabled={reviewMutation.isPending}
                              onClick={() => setRejectTarget(p)}
                              className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E]"
                            >
                              반려
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#9AA0A6]">처리 완료</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalElements > 0 && (
          <div className="px-4 py-3 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[12px] text-[#656D76]">총 {totalElements}건</span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={totalElements}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </div>

      {/* 반려 사유 입력 모달 */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="구인 신청 공고 반려"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>취소</Button>
            <Button
              variant="danger"
              loading={reviewMutation.isPending}
              onClick={() =>
                reviewMutation.mutate({
                  jobPostingId: rejectTarget.jobPostingId,
                  reviewStatus: 'REJECTED',
                  rejectionReason,
                })
              }
            >
              반려 확정
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-[12px]">
          <p><strong>{rejectTarget?.postingTitle}</strong> 공고를 반려 처리하시겠습니까?</p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="자격요건 불충분 등 구체적인 반려 사유를 입력하세요."
            rows={3}
            className="w-full p-2.5 rounded-[6px] border border-[#E5E7EB] focus:outline-none resize-none"
          />
        </div>
      </Modal>
    </div>
  );
}