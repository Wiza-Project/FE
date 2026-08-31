import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, Button, Pagination, ConfirmDialog, toast } from '@/components/common';
import { getJobPostings, getRecommendedPostings, toggleJobScrap } from '@/api/career';
import { POSTING_TYPE, POSTING_TYPE_LABEL } from '@/constants/domain';

const ACCENT = '#059669';
const PAGE_SIZE = 10;

// D-Day 계산 헬퍼
function calculateDDay(endDateStr) {
  if (!endDateStr) return { label: '상시', urgent: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: '마감', urgent: false };
  if (diffDays === 0) return { label: 'D-DAY', urgent: true };
  return { label: `D-${diffDays}`, urgent: diffDays <= 3 };
}

function DDayBadge({ endDate }) {
  const { label, urgent } = calculateDDay(endDate);
  return (
    <div className="text-center">
      <div className={`text-[11px] font-black ${urgent ? 'text-[#CF222E]' : 'text-[#656D76]'}`}>
        {label}
      </div>
    </div>
  );
}

/**
 * AI 맞춤 매칭 추천 배너 컴포넌트
 * - 동의 여부와 무관하게 상시 노출
 * - 설정 버튼 클릭 시 개인정보 선택동의(PROFILING) 안내 모달 호출
 */
function AiRecommendationBanner({ onDetail, onRequireConsent }) {
  const { data: resData, isLoading } = useQuery({
    queryKey: ['careerRecommendedJobs'],
    queryFn: () => getRecommendedPostings(),
  });

  // resData가 { success: true, data: [...] } 또는 { content: [...] } 또는 일반 배열 형태인 경우 모두 안전하게 처리
  const rawList = resData?.data || resData?.content || resData;
  const recommendedJobs = Array.isArray(rawList) ? rawList : [];

  return (
    <div className="bg-gradient-to-r from-[#ECFDF5] to-[#F0FDF4] border border-[#A7F3D0] rounded-[10px] p-4 mb-5 shadow-[0_1px_4px_rgba(5,150,105,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">✨</span>
          <h2 className="text-[14px] font-bold text-[#065F46]">AI 역량 기반 맞춤 추천 공고</h2>
          <span className="text-[11px] text-[#059669] bg-[#DCFCE7] px-2 py-0.5 rounded-full font-semibold">
            PROFILING MATCH
          </span>
        </div>
        <button
          onClick={onRequireConsent}
          className="text-[11px] font-semibold text-[#059669] hover:underline"
        >
          맞춤 추천 설정/동의 관리 ⚙️
        </button>
      </div>

      {isLoading ? (
        <div className="text-[12px] text-[#059669] py-4 text-center">AI가 최적의 채용공고를 선별 중입니다...</div>
      ) : recommendedJobs.length === 0 ? (
        <div className="text-[12px] text-[#656D76] py-4 text-center">
          현재 등록된 맞춤 추천 공고가 없습니다. 취업 희망 조건을 설정해보세요.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {recommendedJobs.slice(0, 3).map((job) => (
            <div
              key={job.jobPostingId}
              onClick={() => onDetail(job.jobPostingId)}
              className="bg-white rounded-[8px] border border-[#D1FAE5] p-3 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#059669] bg-[#DCFCE7] px-1.5 py-0.5 rounded">
                    {job.ncsCodeName || '직무맞춤'}
                  </span>
                  <span className="text-[10px] text-[#CF222E] font-bold">
                    {job.applicationEndsAt ? calculateDDay(job.applicationEndsAt).label : ''}
                  </span>
                </div>
                <p className="text-[12px] font-bold text-[#1F2328] line-clamp-1 hover:text-[#059669]">
                  {job.postingTitle}
                </p>
                <p className="text-[11px] text-[#656D76] mt-0.5">{job.companyName}</p>
              </div>
              <div className="mt-2 pt-2 border-t border-[#F3F4F6] flex items-center justify-between text-[10px] text-[#9AA0A6]">
                <span>{job.employmentType || '고용형태 미지정'}</span>
                <span className="text-[#059669] font-bold">바로 지원 →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {(id: number) => void} props.onDetail
 * @param {() => void} props.onBookmarks
 */
export default function JobList({ onDetail, onBookmarks }) {
  const queryClient = useQueryClient();

  // 검색/필터 상태
  const [activeType, setActiveType] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [empType, setEmpType] = useState('');
  const [page, setPage] = useState(1);
  const [consentModalOpen, setConsentModalOpen] = useState(false);

  // 일반 채용공고 목록 조회
  const searchParams = {
    page: page - 1,
    size: PAGE_SIZE,
    postingType: activeType === 'ALL' ? undefined : activeType,
    companyName: keyword || undefined,
    employmentType: empType || undefined,
  };

  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['careerJobPostings', searchParams],
    queryFn: () => getJobPostings(searchParams),
    keepPreviousData: true,
  });

  const jobList = pageData?.content || [];
  const totalElements = pageData?.totalElements || 0;
  const totalPages = pageData?.totalPages || 1;

  // 스크랩(북마크) 토글 Mutation
  const scrapMutation = useMutation({
    mutationFn: (jobId) => toggleJobScrap(jobId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['careerJobPostings'] });
      toast(res?.isScrapped ? '관심 공고에 저장되었습니다.' : '관심 공고에서 제거되었습니다.', 'success');
    },
    onError: (err) => {
      toast(err?.response?.data?.message || '관심 공고 처리에 실패했습니다.', 'error');
    },
  });

  const handleToggleScrap = (id, e) => {
    e.stopPropagation();
    scrapMutation.mutate(id);
  };

  const handleReset = () => {
    setKeyword('');
    setEmpType('');
    setActiveType('ALL');
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '취업·창업' }, { label: '채용공고' }]}
        title="채용공고"
        subtitle="AI 맞춤 추천부터 일반 채용까지 다양한 채용 기회를 탐색하세요."
        accentColor={ACCENT}
        actions={
          <button
            onClick={onBookmarks}
            className="flex items-center gap-1.5 h-8 px-4 text-[13px] font-bold rounded-[6px] border border-[#E5E7EB] text-[#656D76] hover:border-[#059669] hover:text-[#059669] transition-colors"
          >
            <span className="text-[15px]">★</span> 관심 공고
          </button>
        }
      />

      {/* AI 맞춤 매칭 추천 배너 (상시 노출) */}
      <AiRecommendationBanner
        onDetail={onDetail}
        onRequireConsent={() => setConsentModalOpen(true)}
      />

      {/* 필터 바 */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 mb-4 flex items-end flex-wrap gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76] uppercase">고용형태</label>
          <select
            value={empType}
            onChange={(e) => { setEmpType(e.target.value); setPage(1); }}
            className="h-9 px-3 pr-8 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] appearance-none min-w-[130px]"
          >
            <option value="">전체 고용형태</option>
            <option value="정규직">정규직</option>
            <option value="계약직">계약직</option>
            <option value="인턴">인턴</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-[11px] font-semibold text-[#656D76] uppercase">기업명 검색</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            placeholder="기업명 입력 후 엔터"
            className="h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] w-full"
          />
        </div>

        <Button size="sm" style={{ background: ACCENT }} onClick={() => setPage(1)}>
          조회
        </Button>
        <Button size="sm" variant="secondary" onClick={handleReset}>
          초기화
        </Button>
      </div>

      {/* 공고 구분 탭 */}
      <div className="flex gap-1 mb-4 bg-[#F3F4F6] rounded-[8px] p-1 w-fit">
        <button
          onClick={() => { setActiveType('ALL'); setPage(1); }}
          className={`h-8 px-4 text-[12px] font-semibold rounded-[6px] transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeType === 'ALL' ? 'bg-white text-[#1F2328] shadow-sm' : 'text-[#656D76] hover:text-[#1F2328]'
          }`}
        >
          전체
        </button>
        {Object.entries(POSTING_TYPE).map(([key, value]) => (
          <button
            key={key}
            onClick={() => { setActiveType(value); setPage(1); }}
            className={`h-8 px-4 text-[12px] font-semibold rounded-[6px] transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeType === value ? 'bg-white text-[#1F2328] shadow-sm' : 'text-[#656D76] hover:text-[#1F2328]'
            }`}
          >
            {POSTING_TYPE_LABEL[value] || value}
          </button>
        ))}
      </div>

      {/* 테이블 목록 */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['구분', '공고명', '기업명', '직무(NCS)', '지역', '접수마감', '고용형태', '관심'].map((h) => (
                <th
                  key={h}
                  className={`px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${
                    ['공고명', '기업명'].includes(h) ? 'text-left' : 'text-center'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-[#9AA0A6] text-[13px]">
                  공고 목록을 불러오는 중입니다...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-[#CF222E] text-[13px]">
                  채용공고를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
                </td>
              </tr>
            ) : jobList.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-[#9AA0A6] text-[13px]">
                  조건에 맞는 채용공고가 없습니다.
                </td>
              </tr>
            ) : (
              jobList.map((j, i) => (
                <tr
                  key={j.jobPostingId}
                  onClick={() => onDetail(j.jobPostingId)}
                  className={`border-b border-[#F3F4F6] last:border-0 cursor-pointer hover:bg-[#F0FDF4] transition-colors ${
                    j.isApplied ? 'opacity-75' : ''
                  } ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                >
                  <td className="px-3 py-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6E7781]">
                      {POSTING_TYPE_LABEL[j.postingType] || j.postingType || '일반채용'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {j.isApplied && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-[3px] bg-[#DCFCE7] text-[#059669] flex-shrink-0">
                          지원완료
                        </span>
                      )}
                      <span className="font-semibold text-[#1F2328] hover:text-[#059669] transition-colors leading-snug">
                        {j.postingTitle}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[#656D76] whitespace-nowrap">
                    {j.companyName}
                  </td>
                  <td className="px-3 py-3 text-center text-[#656D76] whitespace-nowrap">
                    {j.ncsCodeName || '—'}
                  </td>
                  <td className="px-3 py-3 text-center text-[12px] text-[#656D76] whitespace-nowrap">
                    {j.regionCodeName || '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="text-[11px] text-[#9AA0A6]">
                      {j.applicationEndsAt ? String(j.applicationEndsAt).slice(0, 10) : '—'}
                    </div>
                    <DDayBadge endDate={j.applicationEndsAt} />
                  </td>
                  <td className="px-3 py-3 text-center text-[11px] text-[#656D76]">
                    {j.employmentType || '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={(e) => handleToggleScrap(j.jobPostingId, e)}
                      className={`text-[18px] transition-colors hover:scale-110 ${
                        j.isScrapped ? 'text-[#D97706]' : 'text-[#D1D5DB] hover:text-[#D97706]'
                      }`}
                    >
                      {j.isScrapped ? '★' : '☆'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 페이징 */}
        {totalElements > 0 && (
          <div className="px-4 py-3 border-t border-[#E5E7EB]">
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

      {/* 개인정보 선택동의(PROFILING) 유도 다이얼로그 */}
      <ConfirmDialog
        open={consentModalOpen}
        title="AI 맞춤 추천 서비스 동의 안내"
        message="AI 역량 분석 및 희망 조건 기반 맞춤 채용공고를 추천받으시려면 [개인정보 맞춤 프로파일링(PROFILING)] 선택 동의가 필요합니다. 동의 설정 페이지로 이동하시겠습니까?"
        confirmLabel="설정하러 가기"
        cancelLabel="다음에 하기"
        onConfirm={() => {
          setConsentModalOpen(false);
          window.location.href = '/mypage/consent';
        }}
        onCancel={() => setConsentModalOpen(false)}
      />
    </div>
  );
}