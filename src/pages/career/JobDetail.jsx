import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, Button, ConfirmDialog, toast } from '@/components/common';
import { apiClient } from '@/api/client';
import { 
  getJobPostingDetail, 
  applyJobPosting, 
  cancelJobApplication, 
  toggleJobScrap 
} from '@/api/career';
import { POSTING_TYPE_LABEL } from '@/constants/domain';

const ACCENT = '#059669';

// TODO: 0902 현재 데이터 연결 테스트 선행, 이후 하드코딩 수정 필요

function SectionTitle({ children, color = ACCENT }) {
  return (
    <h3 className="flex items-center gap-2 text-[14px] font-bold text-[#1F2328] mb-3">
      <div className="w-1 h-4 rounded-full" style={{ background: color }} />
      {children}
    </h3>
  );
}

function DefRow({ label, value }) {
  return (
    <div className="flex px-0 py-2.5 border-b border-[#F3F4F6] last:border-0">
      <span className="w-28 flex-shrink-0 text-[12px] font-semibold text-[#656D76]">{label}</span>
      <span className="text-[13px] text-[#1F2328]">{value || '—'}</span>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {number} props.jobId 채용공고 식별자
 * @param {() => void} props.onBack 목록으로 돌아가기
 */
export default function JobDetail({ jobId, onBack }) {
  const queryClient = useQueryClient();

  const [agreed, setAgreed] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);

  // 공고 상세 조회 (TanStack Query)
  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['careerJobDetail', jobId],
    queryFn: () => getJobPostingDetail(jobId),
    enabled: !!jobId,
  });

  // img 태그는 메모리에만 보관하는 Bearer 토큰을 자동으로 보낼 수 없다.
  // 인증 헤더가 붙는 apiClient로 이미지를 받아 Object URL로 렌더링한다.
  useEffect(() => {
    if (!job?.fileGroupId || !jobId) {
      setPosterUrl(null);
      return undefined;
    }

    let objectUrl = null;
    let cancelled = false;

    apiClient
      .get(`/students/career/job-postings/${jobId}/poster`, { responseType: 'blob' })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        if (!cancelled) {
          setPosterUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPosterUrl(null);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [job?.fileGroupId, jobId]);

  // 온라인 입사지원 Mutation
  const applyMutation = useMutation({
    mutationFn: () => applyJobPosting({
      jobPostingId: jobId,
      isThirdPartyConsent: Boolean(agreed),
      coverLetter: coverLetter || undefined,
      portfolioUrl: portfolioUrl || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['careerJobDetail', jobId] });
      queryClient.invalidateQueries({ queryKey: ['careerJobPostings'] });
      queryClient.invalidateQueries({ queryKey: ['careerMyJobApplications'] });
      setConfirmOpen(false);
      toast('온라인 입사지원이 성공적으로 완료되었습니다!', 'success');
    },
    onError: (err) => {
      setConfirmOpen(false);
      toast(err?.response?.data?.message || '지원 처리에 실패했습니다.', 'error');
    },
  });

  // 지원 취소 Mutation
  const cancelMutation = useMutation({
    mutationFn: () => cancelJobApplication(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['careerJobDetail', jobId] });
      queryClient.invalidateQueries({ queryKey: ['careerJobPostings'] });
      queryClient.invalidateQueries({ queryKey: ['careerMyJobApplications'] });
      setCancelConfirm(false);
      setAgreed(false);
      toast('지원이 취소되었습니다.', 'info');
    },
    onError: (err) => {
      setCancelConfirm(false);
      toast(err?.response?.data?.message || '지원 취소에 실패했습니다.', 'error');
    },
  });

  // 스크랩 토글 Mutation
  const scrapMutation = useMutation({
    mutationFn: () => toggleJobScrap(jobId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['careerJobDetail', jobId] });
      queryClient.invalidateQueries({ queryKey: ['careerJobPostings'] });
      queryClient.invalidateQueries({ queryKey: ['careerMyJobScraps'] });
      toast(res?.isScrapped ? '관심 공고에 저장되었습니다.' : '관심 공고에서 제거되었습니다.', 'success');
    },
    onError: (err) => {
      toast(err?.response?.data?.message || '관심 공고 처리에 실패했습니다.', 'error');
    },
  });

  if (isLoading) {
    return <div className="p-16 text-center text-[#9AA0A6]">공고 상세 정보를 불러오는 중입니다...</div>;
  }

  if (isError || !job) {
    return (
      <div className="p-16 text-center text-[#CF222E]">
        공고 정보를 찾을 수 없습니다.
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onBack}>목록으로</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: '취업·창업' },
          { label: '채용공고', onClick: onBack },
          { label: job.postingTitle },
        ]}
        title={job.postingTitle}
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 목록으로
          </Button>
        }
      />

      {/* 구분 및 접수 기간 정보 */}
      <div className="flex items-center gap-2 -mt-2 mb-5">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
          {POSTING_TYPE_LABEL[job.postingType] || job.postingType || '일반채용'}
        </span>
        <span className="text-[11px] text-[#9AA0A6]">
          접수기간: {job.applicationStartsAt ? String(job.applicationStartsAt).slice(0, 10) : ''} ~ {job.applicationEndsAt ? String(job.applicationEndsAt).slice(0, 10) : '마감일 미지정'}
        </span>
      </div>

      {/* 추천 혜택 안내 */}
      {job.benefitType && (
        <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-[8px] px-5 py-3 mb-5 flex items-center gap-3">
          <p className="text-[13px] text-[#14532D]">
            <strong>[추천 혜택]</strong> {job.benefitType}
          </p>
        </div>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* LEFT: 공고 상세 본문 */}
        <div className="flex flex-col gap-5">
          {/* 기업 정보 */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <SectionTitle>기업 정보</SectionTitle>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-[8px] bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[20px] font-black text-[#059669] flex-shrink-0">
                {job.companyName ? job.companyName.charAt(0) : '企'}
              </div>
              <div className="flex-1">
                <p className="text-[16px] font-black text-[#1F2328]">{job.companyName}</p>
                <p className="text-[12px] text-[#656D76] mt-1">근무지: {job.regionCodeName || '본사'}</p>
              </div>
            </div>
          </div>

          {/* 모집 요강 */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <SectionTitle>모집 요강</SectionTitle>
            <DefRow label="직무 분야" value={job.ncsCodeName} />
            <DefRow label="고용 형태" value={job.employmentType} />
            <DefRow label="모집 인원" value={job.recruitmentCount ? `${job.recruitmentCount}명` : '0명'} />
            <DefRow label="급여 조건" value={<span className="font-bold text-[#059669]">{job.salaryText}</span>} />
            <DefRow label="근무 지역" value={job.regionCodeName} />
          </div>

          {/* 직무 상세 내용 및 포스터 뷰어 */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <SectionTitle>직무 상세 설명</SectionTitle>
            <div className="text-[13px] text-[#1F2328] leading-relaxed whitespace-pre-line mb-4">
              {job.jobDescription}
            </div>

            {/* 공통 파일 스토리지 포스터 뷰어 (학생 화면은 업로드/다운로드 없이 뷰잉 전용) */}
            {job.fileGroupId && (
              <div className="mt-4 pt-4 border-t border-[#F3F4F6]">
                <p className="text-[12px] font-bold text-[#656D76] mb-2">📋 상세 채용 포스터</p>
                <div className="border border-[#E5E7EB] rounded-[8px] p-2 bg-[#FAFAFA] flex justify-center">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt="채용공고 포스터"
                      className="max-w-full h-auto rounded"
                    />
                  ) : (
                    <p className="py-4 text-[12px] text-[#656D76]">포스터를 불러오는 중이거나 표시할 수 없습니다.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: 지원하기 패널 */}
        <div className="self-start sticky top-4 flex flex-col gap-3">
          <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1.5" style={{ background: ACCENT }} />
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
                <h2 className="text-[14px] font-bold text-[#1F2328]">온라인 입사지원</h2>
              </div>

              {job.isApplied ? (
                <>
                  <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] px-4 py-3 text-center">
                    <p className="text-[12px] font-bold text-[#059669]">✓ 지원이 완료된 공고입니다</p>
                  </div>
                  <button
                    disabled
                    className="w-full h-10 rounded-[6px] text-[13px] font-bold bg-[#F3F4F6] text-[#9AA0A6] cursor-not-allowed"
                  >
                    지원 완료
                  </button>
                  <button
                    onClick={() => setCancelConfirm(true)}
                    className="text-center text-[12px] text-[#CF222E] underline hover:no-underline"
                  >
                    지원 취소하기
                  </button>
                </>
              ) : (
                <>
                  {/* 포트폴리오 링크 입력 */}
                  <div>
                    <label className="text-[12px] font-semibold text-[#1F2328] mb-1.5 block">
                      포트폴리오 URL <span className="text-[#9AA0A6] font-normal">(선택)</span>
                    </label>
                    <input
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  {/* 자기소개서 간이 입력 */}
                  <div>
                    <label className="text-[12px] font-semibold text-[#1F2328] mb-1.5 block">
                      간단 지원 코멘트 <span className="text-[#9AA0A6] font-normal">(선택)</span>
                    </label>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows={3}
                      placeholder="지원 동기나 전달할 내용을 간략히 적어주세요."
                      className="w-full p-2.5 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] resize-none"
                    />
                  </div>

                  {/* 개인정보 제3자 제공 동의 */}
                  <div>
                    <div className="bg-[#FFF7ED] border border-[#FDE68A] rounded-[6px] px-3 py-2.5 mb-2">
                      <p className="text-[11px] text-[#92400E] leading-snug">
                        <strong>제공 항목:</strong> 학생 기본정보, 이력서, 포트폴리오가 채용기업 <strong>{job.companyName}</strong>에 제공됩니다.
                      </p>
                    </div>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 w-4 h-4 flex-shrink-0"
                        style={{ accentColor: ACCENT }}
                      />
                      <span className="text-[12px] text-[#1F2328] leading-snug">
                        제3자 제공에 동의합니다. <span className="text-[#CF222E] font-bold">(필수)</span>
                      </span>
                    </label>
                  </div>

                  {/* 지원 버튼 */}
                  <Button
                    size="md"
                    className="w-full justify-center"
                    loading={applyMutation.isPending}
                    disabled={!agreed}
                    style={agreed ? { background: ACCENT } : {}}
                    onClick={() => setConfirmOpen(true)}
                  >
                    지원하기
                  </Button>
                </>
              )}

              {/* 스크랩(북마크) 버튼 */}
              <button
                onClick={() => scrapMutation.mutate()}
                className={`w-full h-9 text-[12px] font-semibold rounded-[6px] border transition-colors flex items-center justify-center gap-1.5 ${
                  job.isScrapped 
                    ? 'border-[#D97706] bg-[#FFFBEB] text-[#D97706]' 
                    : 'border-[#E5E7EB] text-[#656D76] hover:border-[#059669] hover:text-[#059669]'
                }`}
              >
                {job.isScrapped ? '★ 관심 공고 저장됨' : '☆ 관심 공고 저장'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 지원 확인 다이얼로그 */}
      <ConfirmDialog
        open={confirmOpen}
        title="입사지원 확인"
        message={`[${job.postingTitle}] — ${job.companyName}\n\n해당 채용공고에 입사지원을 진행하시겠습니까?`}
        confirmLabel="지원하기"
        loading={applyMutation.isPending}
        onConfirm={() => applyMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* 지원 취소 다이얼로그 */}
      <ConfirmDialog
        open={cancelConfirm}
        title="지원 취소"
        message="온라인 입사지원을 취소하시겠습니까?"
        confirmLabel="지원 취소"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setCancelConfirm(false)}
      />
    </div>
  );
}
