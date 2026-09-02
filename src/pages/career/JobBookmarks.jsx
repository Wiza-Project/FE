import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { PageHeader, Button, Pagination, toast } from '@/components/common';
import { getMyJobScraps, toggleJobScrap } from '@/api/career';

const ACCENT = '#059669';
const PAGE_SIZE = 10;

// TODO: 0902 현재 데이터 연결 테스트 선행, 이후 하드코딩 수정 필요

// D-Day 계산 헬퍼
function calculateDDay(endDateStr) {
  if (!endDateStr) return { diffDays: null, label: '상시', urgent: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { diffDays, label: '마감', urgent: false };
  if (diffDays === 0) return { diffDays: 0, label: 'D-DAY', urgent: true };
  return { diffDays, label: `D-${diffDays}`, urgent: diffDays <= 3 };
}

// 실데이터 기반 향후 7일 마감 D-Day 캘린더
function DeadlineCalendar({ scrapList }) {
  const today = new Date();
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  const toLocalDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const target = new Date(today);
    target.setDate(today.getDate() + i);
    const fullDateStr = toLocalDateStr(target);
    const dateStr = fullDateStr.slice(5, 10);
    const dayLabel = daysOfWeek[target.getDay()];

    const matchedJobs = scrapList.filter(
      (job) => job.applicationEndsAt && String(job.applicationEndsAt).slice(0, 10) === fullDateStr
    );

    return {
      date: dateStr,
      day: dayLabel,
      dDay: i,
      jobs: matchedJobs.map((j) => j.postingTitle),
    };
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {upcomingDays.map((d) => (
        <div
          key={d.date}
          className={`rounded-[8px] border p-2.5 min-h-[80px] ${
            d.jobs.length > 0 ? 'border-[#059669] bg-[#F0FDF4]' : 'border-[#E5E7EB] bg-white'
          }`}
        >
          <div className="text-center mb-1.5">
            <div className="text-[10px] text-[#9AA0A6]">{d.day}</div>
            <div
              className={`text-[13px] font-black ${
                d.dDay <= 3 && d.jobs.length > 0 ? 'text-[#CF222E]' : 'text-[#1F2328]'
              }`}
            >
              {d.date}
            </div>
            {d.dDay <= 3 && d.jobs.length > 0 && (
              <div className="text-[9px] font-black text-[#CF222E]">
                {d.dDay === 0 ? 'D-DAY' : `D-${d.dDay}`}
              </div>
            )}
          </div>
          {d.jobs.map((title, idx) => (
            <div
              key={idx}
              className="text-[9px] font-semibold text-[#059669] bg-[#DCFCE7] rounded-[3px] px-1.5 py-0.5 leading-snug mb-1 truncate"
            >
              {title}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {() => void} props.onBack 목록으로 돌아가기
 * @param {(id: number) => void} props.onDetail 공고 상세 이동
 */
export default function JobBookmarks({ onBack, onDetail }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // 관심 공고 목록 조회
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['careerMyJobScraps', page],
    queryFn: () => getMyJobScraps({ page: page - 1, size: PAGE_SIZE }),
    keepPreviousData: keepPreviousData,
  });

  const scrapList = pageData?.content || [];
  const totalElements = pageData?.totalElements || 0;
  const totalPages = pageData?.totalPages || 1;

  // 관심 공고 해제 Mutation
  const scrapMutation = useMutation({
    mutationFn: (jobId) => toggleJobScrap(jobId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['careerMyJobScraps'] });
      queryClient.invalidateQueries({ queryKey: ['careerJobPostings'] });
      toast(
        res?.isScrapped ? '관심 공고에 저장되었습니다.' : '관심 공고에서 제거되었습니다.',
        'info'
      );
    },
    onError: (err) => {
      toast(err?.response?.data?.message || '관심 공고 처리에 실패했습니다.', 'error');
    },
  });

  const handleRemoveScrap = (id) => {
    scrapMutation.mutate(id);
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: '취업·창업' },
          { label: '채용공고', onClick: onBack },
          { label: '관심 공고' },
        ]}
        title="관심 공고"
        subtitle="스크랩한 채용공고의 접수 마감 일정을 확인하세요."
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 채용공고 목록
          </Button>
        }
      />

      {/* D-Day 캘린더 */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <h2 className="text-[14px] font-bold text-[#1F2328]">마감 D-Day 캘린더 (향후 7일)</h2>
        </div>
        <DeadlineCalendar scrapList={scrapList} />
      </div>

      {/* 관심 공고 목록 */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <h2 className="text-[14px] font-bold text-[#1F2328]">관심 공고 보관함</h2>
          <span className="ml-auto text-[12px] text-[#9AA0A6]">총 {totalElements}건</span>
        </div>

        <div className="divide-y divide-[#F3F4F6]">
          {isLoading ? (
            <div className="p-12 text-center text-[#9AA0A6] text-[13px]">
              관심 공고 목록을 불러오는 중입니다...
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-[#CF222E] text-[13px]">
              관심 공고를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </div>
          ) : scrapList.length === 0 ? (
            <div className="p-12 text-center text-[#9AA0A6] text-[13px]">
              스크랩한 관심 공고가 없습니다. 채용공고 목록에서 공고를 저장해보세요.
            </div>
          ) : (
            scrapList.map((job) => {
              const { label: dDayLabel, urgent } = calculateDDay(job.applicationEndsAt);
              return (
                <div
                  key={job.jobPostingId}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#F0FDF4] transition-colors"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onDetail(job.jobPostingId)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-bold text-[#1F2328] hover:text-[#059669] transition-colors">
                        {job.postingTitle}
                      </span>
                    </div>
                    <div className="flex gap-3 text-[12px] text-[#9AA0A6]">
                      <span>{job.companyName}</span>
                      <span>
                        마감: {job.applicationEndsAt ? String(job.applicationEndsAt).slice(0, 10) : '—'}
                      </span>
                      <span
                        className={`font-black ${urgent ? 'text-[#CF222E]' : 'text-[#656D76]'}`}
                      >
                        {dDayLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      style={{ background: ACCENT }}
                      onClick={() => onDetail(job.jobPostingId)}
                    >
                      공고보기
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={scrapMutation.isPending}
                      onClick={() => handleRemoveScrap(job.jobPostingId)}
                    >
                      ★ 보관해제
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

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
    </div>
  );
}