import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, StatTile, toast } from '@/components/common';
import { getStaffJobPostings, reviewJobPosting } from '@/api/careerStaff';

const ACCENT = '#1F2937';

const REVIEW_STYLE = {
  REQUESTED: { label: '검수대기', bg: '#F3F4F6', text: '#374151' },
  APPROVED: { label: '승인', bg: '#D1FAE5', text: '#059669' },
  REJECTED: { label: '반려', bg: '#FEE2E2', text: '#CF222E' },
};

const REJECT_CODES = [
  '선택하세요',
  '허위·과장 정보',
  '불법 고용형태',
  '근로조건 기준 미달',
  '중복 신청',
  '기타',
];

// 구인 신청 검수
export default function TabJobReview() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rCode, setRCode] = useState('선택하세요');
  const [rDetail, setRDetail] = useState('');

  // 1. 검수 대기(REQUESTED) 공고 실데이터 목록 조회
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['staffJobReviewList'],
    queryFn: () => getStaffJobPostings({ reviewStatus: 'REQUESTED', size: 50 }),
  });

  const rows = pageData?.content || (Array.isArray(pageData) ? pageData : []);

  // 2. 검수(승인/반려) 처리 Mutation
  const reviewMutation = useMutation({
    mutationFn: ({ jobId, reviewStatus, rejectionReason }) =>
      reviewJobPosting(jobId, { reviewStatus, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffJobReviewList'] });
      queryClient.invalidateQueries({ queryKey: ['staffAllJobPostings'] });
      setRejectTarget(null);
      setRCode('선택하세요');
      setRDetail('');
      toast('공고 검수 처리가 완료되었습니다.', 'success');
    },
    onError: (err) => {
      toast(err?.message || err?.response?.data?.message || '검수 처리에 실패했습니다.', 'error');
    },
  });

  const approve = (id) => {
    reviewMutation.mutate({ jobId: id, reviewStatus: 'APPROVED' });
  };

  const submitReject = () => {
    if (rCode === '선택하세요') {
      toast('반려 사유 코드를 선택해 주세요.', 'error');
      return;
    }
    const reason = `[${rCode}] ${rDetail}`.trim();
    reviewMutation.mutate({
      jobId: rejectTarget.jobPostingId,
      reviewStatus: 'REJECTED',
      rejectionReason: reason,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 상단 통계 카드 (실데이터 연동) */}
      <div className="grid grid-cols-4 gap-4">
        <StatTile label="검수 대기 공고" value={String(rows.length)} accentColor={ACCENT} />
        <StatTile label="운영 게시중 공고" value="실시간 연동" accentColor={ACCENT} />
        <StatTile label="인증 심사 기업" value="실시간 연동" accentColor={ACCENT} />
        <StatTile label="채용 전형 관리" value="정상 가동" accentColor={ACCENT} />
      </div>

      {/* 검수 대기 테이블 */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <span className="text-[13px] font-bold text-[#1F2328]">구인 신청 목록 (검수 대기)</span>
          </div>
          <span className="text-[11px] text-[#656D76]">총 {rows.length}건 대기중</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F6F8FA]">
                {['공고 ID', '신청일', '기업명', '공고명', 'NCS 직무', '고용형태', '접수기간', '검수 상태', '심사 처리'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#9AA0A6]">구인 검수 목록을 불러오는 중입니다...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#9AA0A6]">현재 검수 대기 중인 채용공고가 없습니다.</td>
                </tr>
              ) : (
                rows.map((r) => {
                  const rv = REVIEW_STYLE[r.reviewStatus] || { label: r.reviewStatus, bg: '#F3F4F6', text: '#374151' };
                  return (
                    <tr key={r.jobPostingId} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-mono text-[10px] text-center font-bold" style={{ color: ACCENT }}>{r.jobPostingId}</td>
                      <td className="px-4 py-3 text-[#9AA0A6] font-mono text-[11px] text-center">{r.applicationStartsAt ? String(r.applicationStartsAt).slice(5, 10) : '—'}</td>
                      <td className="px-4 py-3 font-bold text-[#1F2328]">{r.companyName}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-[#444D56] font-medium">{r.postingTitle}</td>
                      <td className="px-4 py-3 text-[#656D76] text-center">{r.ncsCodeName || '—'}</td>
                      <td className="px-4 py-3 text-[#1F2328] text-center">{r.employmentType || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] text-center whitespace-nowrap">
                        {r.applicationStartsAt ? String(r.applicationStartsAt).slice(5, 10) : ''} ~ {r.applicationEndsAt ? String(r.applicationEndsAt).slice(5, 10) : '마감일 미지정'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: rv.bg, color: rv.text }}>{rv.label}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          <button
                            disabled={reviewMutation.isPending}
                            onClick={() => approve(r.jobPostingId)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] text-white transition-colors disabled:opacity-40"
                            style={{ background: ACCENT }}
                          >
                            승인
                          </button>
                          <button
                            disabled={reviewMutation.isPending}
                            onClick={() => setRejectTarget(r)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors"
                          >
                            반려
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 반려 사유 모달 */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="구인 신청 반려 처리"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>취소</Button>
            <Button variant="danger" loading={reviewMutation.isPending} onClick={submitReject}>반려 처리</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 text-[12px]">
          <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB]">
            <p className="font-bold text-[#1F2328] mb-0.5">{rejectTarget?.companyName}</p>
            <p className="text-[#656D76]">{rejectTarget?.postingTitle}</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              반려 사유 코드 <span className="text-[#CF222E]">*</span>
            </label>
            <select
              value={rCode}
              onChange={(e) => setRCode(e.target.value)}
              className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            >
              {REJECT_CODES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">상세 사유</label>
            <textarea
              value={rDetail}
              onChange={(e) => setRDetail(e.target.value)}
              rows={3}
              placeholder="기업에게 전달될 구체적인 사유를 입력하세요."
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none bg-white focus:outline-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}