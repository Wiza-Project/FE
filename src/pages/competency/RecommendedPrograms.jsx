import { useState } from 'react';
import { PROGRAMS } from '@/data/dummy';
import { COMP_LABELS, COMP_COLOR } from '@/data/competencyData';
import { PageHeader, Tabs, StatusBadge, toast } from '@/components/common';

const CHIP_TYPES = ['취약역량 기반', '관심사 기반', '학과 추천'];

const CHIP_COLORS = {
  '취약역량 기반': 'bg-[#FEE2E2] text-[#CF222E]',
  '관심사 기반': 'bg-[#DBEAFE] text-[#0969DA]',
  '학과 추천': 'bg-[#DCFCE7] text-[#1A7F37]',
};

// Assign recommendation types to programs
const CHIP_MAP = {
  P002: '취약역량 기반',
  P006: '취약역량 기반',
  P011: '취약역량 기반',
  P001: '관심사 기반',
  P007: '관심사 기반',
  P015: '관심사 기반',
  P003: '학과 추천',
  P010: '학과 추천',
  P014: '학과 추천',
  P004: '관심사 기반',
  P008: '학과 추천',
  P013: '관심사 기반',
  P005: '취약역량 기반',
  P009: '관심사 기반',
  P012: '학과 추천',
};

const ALL_TABS = ['전체', ...COMP_LABELS];

const DEPT_MAP = {
  P001: '학생처',
  P002: '국제교류원',
  P003: '공과대학',
  P004: '도서관',
  P005: '학생처',
  P006: '어학센터',
  P007: '창업지원단',
  P008: '봉사활동센터',
  P009: '취창업지원과',
  P010: '정보화지원처',
  P011: '국제교류원',
  P012: '상담센터',
  P013: '교수학습지원센터',
  P014: '정보화지원처',
  P015: '취창업지원과',
};

/**
 * @param {Object} props
 * @param {(id: string) => void} [props.onApply]
 */
export default function RecommendedPrograms({ onApply }) {
  const [tab, setTab] = useState('글로벌');
  const [applying, setApplying] = useState(null);

  const filtered = PROGRAMS.filter((p) => tab === '전체' || p.competency === tab);

  const tabs = ALL_TABS.map((t) => ({
    key: t,
    label: t,
    count: t === '전체' ? PROGRAMS.length : PROGRAMS.filter((p) => p.competency === t).length,
  }));

  const handleApply = async (id) => {
    setApplying(id);
    await new Promise((r) => setTimeout(r, 700));
    setApplying(null);
    toast('신청이 완료되었습니다.', 'success');
    onApply?.(id);
  };

  const isClosed = (p) => p.applied >= p.capacity || p.status === '종료';

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '핵심역량 진단' }, { label: '추천 프로그램' }]}
        title="취약역량 기반 추천 프로그램"
        subtitle="내 핵심역량 진단 결과를 바탕으로 추천된 비교과 프로그램입니다."
        accentColor={COMP_COLOR}
      />

      {/* Reason banner */}
      <div className="bg-gradient-to-r from-[#EDE9FE] to-[#F5F3FF] border border-[#C4B5FD] rounded-[10px] px-6 py-4 mb-5 flex items-start gap-4">
        <div className="w-9 h-9 rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <path d="M8 1l1.854 3.756L14 5.522l-3 2.923.708 4.127L8 10.5l-3.708 2.072L5 8.445 2 5.522l4.146-.766z" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] text-[#4C1D95] leading-relaxed">
            회원님의 최저 역량은 <strong className="text-[#7C3AED]">글로벌(52점)</strong>, 그 중{' '}
            <strong className="text-[#7C3AED]">외국어 능력(41점)</strong>이 가장 낮습니다. 아래
            프로그램이 추천되었습니다.
          </p>
          <div className="flex items-center gap-3 mt-2">
            {CHIP_TYPES.map((c) => (
              <div key={c} className="flex items-center gap-1.5 text-[11px]">
                <span className={`px-2 py-0.5 rounded-full font-bold ${CHIP_COLORS[c]}`}>{c}</span>
                <span className="text-[#6D28D9]">추천 포함</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} active={tab} onChange={setTab} accentColor={COMP_COLOR} />

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] py-16 text-center">
          <p className="text-[13px] text-[#9AA0A6]">해당 역량에 연계된 추천 프로그램이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((p) => {
            const closed = isClosed(p);
            const chip = CHIP_MAP[p.id] ?? '관심사 기반';
            const fillPct = Math.round((p.applied / p.capacity) * 100);
            const deadline = p.period.split(' ~ ')[1] ?? p.period;
            const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);

            return (
              <div
                key={p.id}
                className={`bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] ${closed ? 'opacity-50 grayscale-[30%]' : ''}`}
              >
                {/* Card top accent */}
                <div className="h-1" style={{ background: closed ? '#9CA3AF' : COMP_COLOR }} />

                <div className="p-4 flex flex-col flex-1 gap-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CHIP_COLORS[chip]}`}
                        >
                          {chip}
                        </span>
                        <StatusBadge status={p.status} size="sm" />
                      </div>
                      <h3
                        className={`text-[14px] font-bold leading-snug ${closed ? 'text-[#9AA0A6]' : 'text-[#1F2328]'}`}
                      >
                        {p.name}
                      </h3>
                    </div>
                  </div>

                  {/* Competency badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                      {p.competency}
                    </span>
                    <span className="text-[11px] text-[#9AA0A6]">{DEPT_MAP[p.id] ?? '학생처'}</span>
                  </div>

                  {/* Info rows */}
                  <div className="flex flex-col gap-1.5 text-[12px] text-[#656D76]">
                    <div className="flex items-center gap-1.5">
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="#9AA0A6">
                        <rect x="2" y="3" width="12" height="11" rx="1.5" />
                        <path d="M5 1v4M11 1v4M2 7h12" stroke="white" strokeWidth="1.2" />
                      </svg>
                      {p.period}
                    </div>
                    {daysLeft > 0 && !closed && (
                      <div
                        className={`flex items-center gap-1.5 font-semibold ${daysLeft <= 3 ? 'text-[#CF222E]' : daysLeft <= 7 ? 'text-[#D97706]' : 'text-[#656D76]'}`}
                      >
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="8" cy="8" r="7" />
                          <path
                            d="M8 4v4l3 3"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        마감 D-{daysLeft}
                      </div>
                    )}
                  </div>

                  {/* Capacity bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-[#9AA0A6] mb-1">
                      <span>신청 현황</span>
                      <span className="font-semibold text-[#1F2328]">
                        {p.applied}/{p.capacity}명
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(fillPct, 100)}%`,
                          background: fillPct >= 90 ? '#CF222E' : COMP_COLOR,
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6] mt-auto">
                    <div className="flex items-center gap-1 text-[#D97706]">
                      <span className="text-[13px]">🏅</span>
                      <span className="text-[12px] font-bold">{p.credit * 30}점</span>
                    </div>
                    <button
                      disabled={closed || applying === p.id}
                      onClick={() => handleApply(p.id)}
                      className={`h-8 px-4 text-[12px] font-bold rounded-[6px] transition-colors flex items-center gap-1.5
                        ${closed ? 'bg-[#F3F4F6] text-[#9AA0A6] cursor-not-allowed' : 'text-white hover:opacity-90'}`}
                      style={closed ? {} : { background: COMP_COLOR }}
                    >
                      {applying === p.id && (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {closed ? '마감' : '신청하기'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
