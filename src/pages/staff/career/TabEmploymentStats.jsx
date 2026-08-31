import { useState } from 'react';
import { StatTile } from '@/components/common';

const ACCENT = '#1F2937';

// 취업 이력·통계
export default function TabEmploymentStats() {
  const [statsType, setStatsType] = useState('SELF');

  return (
    <div className="flex flex-col gap-5">
      <div className="px-5 py-3.5 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] flex gap-3">
        <span className="text-[16px] shrink-0">⚠️</span>
        <p className="text-[12px] text-[#92400E] leading-relaxed">
          취업률은 대학이 자체 산출하는 수치가 아니라 건강보험공단·국세청 등 공공 DB 연계로
          확정 제공됩니다. 본 화면의 수치는 <strong>실데이터 수집 기준 잠정 통계</strong>입니다.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1 bg-[#F3F4F6] rounded-[8px]">
          {['SELF', 'OFFICIAL'].map((t) => (
            <button
              key={t}
              onClick={() => setStatsType(t)}
              className="h-7 px-4 text-[11px] font-bold rounded-[6px] transition-colors"
              style={statsType === t ? { background: ACCENT, color: '#fff' } : { color: '#656D76' }}
            >
              {t === 'SELF' ? '자체조사 (SELF)' : '국가 확정 (OFFICIAL)'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile label="전체 지원 건수" value="1,204" accentColor={ACCENT} />
        <StatTile label="서류 합격 건수" value="482" accentColor={ACCENT} />
        <StatTile label="평균 매칭 만족도" value="84.2%" accentColor={ACCENT} />
        <StatTile label="협약 기업 수" value="128개사" accentColor={ACCENT} />
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden p-12 text-center text-[#656D76] text-[13px]">
        학생 취업 희망조건과 공고 간의 매칭 데이터가 집계되고 있습니다.
      </div>
    </div>
  );
}