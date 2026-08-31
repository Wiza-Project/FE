import { useState } from 'react';
import { PageHeader } from '@/components/common';
import ResumeEditor from './ResumeEditor';
import PortfolioPrefs from './PortfolioPrefs';
import ApplicationBoard from './ApplicationBoard';

const ACCENT = '#059669';

const NAV_ITEMS = [
  {
    key: 'resume',
    label: '이력서·자기소개서',
    icon: '📄',
    desc: '이력서 작성 · 자기소개서 AI 첨삭',
  },
  {
    key: 'portfolio',
    label: '포트폴리오·희망조건',
    icon: '🗂️',
    desc: '포트폴리오 관리 · 희망 조건 설정',
  },
  { key: 'board', label: '지원 현황', icon: '📊', desc: '지원 칸반 · 취업 신고' },
];

/**
 * 학생 취업 준비 허브 화면
 * 이력서/자기소개서 작성, 포트폴리오 및 희망직무 설정, 실시간 온라인 지원 현황(칸반) 서브 뷰
 *
 * @param {Object} props
 * @param {() => void} props.onJobList 채용공고 목록 화면으로 이동하는 콜백
 */
export default function CareerPrepPage({ onJobList }) {
  const [view, setView] = useState('resume');
  const current = NAV_ITEMS.find((n) => n.key === view) || NAV_ITEMS[0];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '취업·창업' }, { label: '취업 준비' }, { label: current.label }]}
        title="취업 준비"
        subtitle="이력서부터 지원 현황까지 취업 준비를 한 곳에서 관리하세요."
        accentColor={ACCENT}
        actions={
          <button
            onClick={onJobList}
            className="h-8 px-4 text-[13px] font-semibold rounded-[6px] border border-[#E5E7EB] text-[#656D76] hover:border-[#059669] hover:text-[#059669] transition-colors"
          >
            채용공고 보기 →
          </button>
        }
      />

      {/* Sub-nav cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {NAV_ITEMS.map((item) => {
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`flex items-center gap-3 rounded-[8px] border-2 px-4 py-3 text-left transition-all ${
                active
                  ? 'bg-[#F0FDF4] shadow-[0_0_0_1px_rgba(5,150,105,0.15)]'
                  : 'bg-white border-[#E5E7EB] hover:border-[#6EE7B7]'
              }`}
              style={active ? { borderColor: ACCENT } : {}}
            >
              <span className="text-[20px]">{item.icon}</span>
              <div>
                <p
                  className={`text-[13px] font-bold ${active ? 'text-[#059669]' : 'text-[#1F2328]'}`}
                >
                  {item.label}
                </p>
                <p className="text-[11px] text-[#9AA0A6]">{item.desc}</p>
              </div>
              {active && (
                <div
                  className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: ACCENT }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {view === 'resume' && <ResumeEditor />}
      {view === 'portfolio' && <PortfolioPrefs />}
      {view === 'board' && <ApplicationBoard />}
    </div>
  );
}
