import { useState } from 'react';
import CompetencyManage from './CompetencyManage';
import ScaleManage from './ScaleManage';
import QuestionManage from './QuestionManage';
import DiagnosisOps from './DiagnosisOps';

const NAV_ITEMS = [
  { key: 'competency', label: '역량 관리', icon: '⬡', desc: '핵심역량 코드 및 구조 관리' },
  { key: 'scale', label: '척도 관리', icon: '⊞', desc: '리커트 척도 템플릿 관리' },
  { key: 'question', label: '문항 관리', icon: '❓', desc: '역량 측정 문항 등록·버전 관리' },
  { key: 'diagnosis', label: '진단 운영', icon: '▷', desc: '진단 회차 개설·결과 확인' },
];

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

/**
 * 교직원 핵심역량 관리 화면 허브. 좌측 네비게이션으로 역량/척도/문항/진단운영
 * 4개 하위 화면을 로컬 상태로 전환합니다.
 */
export default function StaffCompetencyPage() {
  const [nav, setNav] = useState('competency');
  const current = NAV_ITEMS.find((n) => n.key === nav);

  return (
    <div className="flex gap-0 min-h-[calc(100vh-120px)]">
      {/* Left sidebar */}
      <aside className="w-52 shrink-0 mr-5">
        {/* Header */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-black shrink-0"
              style={{ background: ACCENT }}
            >
              ✦
            </div>
            <span className="text-[12px] font-black text-[#1F2328]">핵심역량 관리</span>
          </div>
          <p className="text-[10px] text-[#9AA0A6] leading-relaxed">
            기준정보 및 진단 운영 전체 관리
          </p>
        </div>

        {/* Nav items */}
        <nav className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
          {NAV_ITEMS.map((item, i) => {
            const active = nav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setNav(item.key)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${i > 0 ? 'border-t border-[#F3F4F6]' : ''} ${active ? 'bg-[#F3F4F6]' : 'hover:bg-[#FAFAFA]'}`}
              >
                <span
                  className={`text-[14px] mt-0.5 shrink-0 ${active ? '' : 'opacity-50'}`}
                  style={active ? { color: ACCENT } : {}}
                >
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-[12px] font-bold leading-tight ${active ? '' : 'text-[#444D56]'}`}
                    style={active ? { color: ACCENT } : {}}
                  >
                    {item.label}
                  </p>
                  <p className="text-[10px] text-[#9AA0A6] leading-snug mt-0.5">{item.desc}</p>
                </div>
                {active && (
                  <div
                    className="ml-auto w-1 self-stretch rounded-full shrink-0"
                    style={{ background: ACCENT }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick stats */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mt-3 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-[#656D76] mb-1">현황</p>
          {[
            { label: '핵심역량', value: '6개' },
            { label: '문항', value: '90개' },
            { label: '척도 템플릿', value: '3개' },
          ].map((s) => (
            <div key={s.label} className="flex justify-between">
              <span className="text-[11px] text-[#9AA0A6]">{s.label}</span>
              <span className="text-[11px] font-bold text-[#1F2328]">{s.value}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] text-[#9AA0A6]">핵심역량 관리</span>
          <span className="text-[11px] text-[#D1D5DB]">/</span>
          <span className="text-[11px] font-bold" style={{ color: ACCENT }}>
            {current.label}
          </span>
        </div>

        {nav === 'competency' && <CompetencyManage />}
        {nav === 'scale' && <ScaleManage />}
        {nav === 'question' && <QuestionManage />}
        {nav === 'diagnosis' && <DiagnosisOps />}
      </main>
    </div>
  );
}
