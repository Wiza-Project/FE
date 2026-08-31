import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/common';
import {
  getStaffJobPostings,
  getApplicantsByJobPosting,
  updateApplicantStatus,
} from '@/api/careerStaff';

const ACCENT = '#1F2937';

const STATUS_STYLE = {
  APPLIED: { label: '지원완료', bg: '#EFF6FF', text: '#1D4ED8' },
  UNDER_REVIEW: { label: '서류검토중', bg: '#F5F3FF', text: '#7C3AED' },
  PASSED: { label: '최종합격', bg: '#DCFCE7', text: '#15803D' },
  REJECTED: { label: '불합격', bg: '#FEE2E2', text: '#B91C1C' },
  CANCELED: { label: '지원취소', bg: '#F3F4F6', text: '#9AA0A6' },
};

// 잡매칭 및 지원자 전형 관리
export default function TabJobMatching() {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState('');

  const { data: postingsData } = useQuery({
    queryKey: ['staffAllJobPostings'],
    queryFn: () => getStaffJobPostings({ size: 100 }),
  });

  const postList = postingsData?.content || (Array.isArray(postingsData) ? postingsData : []);

  useEffect(() => {
    if (postList.length > 0 && !selectedJobId) {
      setSelectedJobId(String(postList[0].jobPostingId));
    }
  }, [postList, selectedJobId]);

  const { data: applicantsData, isLoading: isApplicantsLoading } = useQuery({
    queryKey: ['staffApplicants', selectedJobId],
    queryFn: () => getApplicantsByJobPosting(Number(selectedJobId)),
    enabled: !!selectedJobId,
  });

  const applicants = applicantsData?.content || (Array.isArray(applicantsData) ? applicantsData : []);

  const statusMutation = useMutation({
    mutationFn: ({ applicationId, applicationStatus }) =>
      updateApplicantStatus(applicationId, { applicationStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffApplicants', selectedJobId] });
      toast('지원자의 전형 단계가 변경되었습니다.', 'success');
    },
    onError: (err) => {
      toast(err?.response?.data?.message || '상태 변경에 실패했습니다.', 'error');
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <span className="text-[13px] font-bold text-[#1F2328]">공고별 온라인 지원자 및 매칭 현황</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[#656D76]">공고 선택:</span>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none max-w-[320px]"
            >
              {postList.map((p) => (
                <option key={p.jobPostingId} value={p.jobPostingId}>
                  [{p.jobPostingId}] {p.postingTitle} ({p.companyName})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F6F8FA]">
                {['학번', '성명', '공고명', '매칭 점수', '지원 경로', '지원일자', '전형 상태', '전형 단계 변경'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isApplicantsLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#9AA0A6]">지원자 전형 데이터를 불러오는 중입니다...</td>
                </tr>
              ) : applicants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#9AA0A6]">해당 공고에 접수된 온라인 지원 내역이 없습니다.</td>
                </tr>
              ) : (
                applicants.map((a) => {
                  const appId = a.applicationId || a.studentJobRelationId;
                  const st = STATUS_STYLE[a.applicationStatus] || { label: a.applicationStatus, bg: '#F3F4F6', text: '#374151' };
                  return (
                    <tr key={appId} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] text-center">{a.universityNo || a.userId}</td>
                      <td className="px-4 py-3 font-bold text-[#1F2328] text-center">{a.userName || '학생'}</td>
                      <td className="px-4 py-3 text-[#444D56] font-medium">{a.postingTitle}</td>
                      <td className="px-4 py-3 text-center font-black text-[#059669]">{a.matchingScore ? `${a.matchingScore}점` : '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">
                          {a.recommendationSource || '직접지원'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] text-center">
                        {a.appliedAt ? String(a.appliedAt).slice(0, 10) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.text }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={a.applicationStatus}
                          onChange={(e) =>
                            statusMutation.mutate({ applicationId: appId, applicationStatus: e.target.value })
                          }
                          className="h-7 px-2 text-[11px] font-semibold rounded border border-[#E5E7EB] bg-white focus:outline-none"
                        >
                          <option value="APPLIED">지원완료</option>
                          <option value="UNDER_REVIEW">서류검토중</option>
                          <option value="PASSED">최종합격</option>
                          <option value="REJECTED">불합격</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}