import { PageHeader, Button, toast } from '@/components/common';

const ACCENT = '#059669';

const BOOKMARKED_JOBS = [
  {
    id: 'J001',
    title: '소프트웨어 개발자 (신입/경력)',
    company: '(주)테크노바',
    deadline: '2026-08-16',
    dDay: 3,
    category: '추천채용',
  },
  {
    id: 'J005',
    title: '임베디드 시스템 개발자',
    company: '현대모비스',
    deadline: '2026-08-13',
    dDay: 0,
    category: '추천채용',
  },
];

// Simple 7-day calendar grid showing deadline D-Days
function DeadlineCalendar() {
  const days = [
    { date: '08-13', day: '수', dDay: 0, jobs: ['임베디드 시스템 개발자'] },
    { date: '08-14', day: '목', dDay: 1, jobs: [] },
    { date: '08-15', day: '금', dDay: 2, jobs: [] },
    { date: '08-16', day: '토', dDay: 3, jobs: ['소프트웨어 개발자'] },
    { date: '08-17', day: '일', dDay: 4, jobs: [] },
    { date: '08-18', day: '월', dDay: 5, jobs: [] },
    { date: '08-19', day: '화', dDay: 6, jobs: [] },
  ];

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => (
        <div
          key={d.date}
          className={`rounded-[8px] border p-2.5 min-h-[80px] ${d.jobs.length > 0 ? 'border-[#059669] bg-[#F0FDF4]' : 'border-[#E5E7EB] bg-white'}`}
        >
          <div className="text-center mb-1.5">
            <div className="text-[10px] text-[#9AA0A6]">{d.day}</div>
            <div
              className={`text-[13px] font-black ${d.dDay <= 3 ? 'text-[#CF222E]' : 'text-[#1F2328]'}`}
            >
              {d.date}
            </div>
            {d.dDay <= 3 && d.jobs.length > 0 && (
              <div className="text-[9px] font-black text-[#CF222E]">D-{d.dDay}</div>
            )}
          </div>
          {d.jobs.map((j) => (
            <div
              key={j}
              className="text-[9px] font-semibold text-[#059669] bg-[#DCFCE7] rounded-[3px] px-1.5 py-0.5 leading-snug mb-1 truncate"
            >
              {j}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {(id: string) => void} props.onDetail
 */
export default function JobBookmarks({ onBack, onDetail }) {
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: '취업·창업' },
          { label: '채용공고', onClick: onBack },
          { label: '관심 공고' },
        ]}
        title="관심 공고"
        subtitle="스크랩한 공고와 마감 D-Day 캘린더를 확인하세요."
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 목록으로
          </Button>
        }
      />

      {/* Calendar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <h2 className="text-[14px] font-bold text-[#1F2328]">마감 D-Day 캘린더 — 2026년 8월</h2>
        </div>
        <DeadlineCalendar />
      </div>

      {/* Bookmarked list */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <h2 className="text-[14px] font-bold text-[#1F2328]">관심 공고 목록</h2>
          <span className="ml-auto text-[12px] text-[#9AA0A6]">총 {BOOKMARKED_JOBS.length}건</span>
        </div>
        <div className="divide-y divide-[#F3F4F6]">
          {BOOKMARKED_JOBS.map((j) => (
            <div
              key={j.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[#F0FDF4] transition-colors"
            >
              <div className="flex-1 cursor-pointer" onClick={() => onDetail(j.id)}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                    {j.category}
                  </span>
                  <span className="text-[13px] font-bold text-[#1F2328] hover:text-[#059669] transition-colors">
                    {j.title}
                  </span>
                </div>
                <div className="flex gap-3 text-[12px] text-[#9AA0A6]">
                  <span>{j.company}</span>
                  <span>마감 {j.deadline}</span>
                  <span
                    className={`font-black ${j.dDay <= 3 ? 'text-[#CF222E]' : 'text-[#656D76]'}`}
                  >
                    D-{j.dDay}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" style={{ background: ACCENT }} onClick={() => onDetail(j.id)}>
                  공고보기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast('관심 공고에서 제거되었습니다.', 'info')}
                >
                  ★ 해제
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
