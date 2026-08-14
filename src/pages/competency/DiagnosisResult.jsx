import { useState } from 'react';
import {
  COMP_LABELS,
  MY_SCORES,
  AVG_SCORES,
  SUB_COMPETENCIES,
  COMP_COLOR,
} from '@/data/competencyData';
import { PageHeader, RadarChart, Tabs, Button, toast } from '@/components/common';

const judgment = (score) => (score >= 75 ? '우수' : score >= 60 ? '보통' : '보완 필요');
const JUDG_STYLE = {
  우수: 'bg-[#DCFCE7] text-[#1A7F37]',
  보통: 'bg-[#F3F4F6] text-[#6E7781]',
  '보완 필요': 'bg-[#FEE2E2] text-[#CF222E]',
};

const PERCENTILES = [32, 45, 78, 28, 40, 52];
const MY_AVG = Math.round((MY_SCORES.reduce((a, b) => a + b, 0) / MY_SCORES.length) * 10) / 10;

/**
 * @param {Object} props
 * @param {() => void} [props.onBack] 현재 화면엔 뒤로가기 버튼이 없어 미사용 — CompetencyPage 호출부와의
 *   인터페이스 대칭을 위해 남겨둡니다. 화면에 뒤로가기가 필요해지면 이 콜백을 연결하세요.
 * @param {() => void} props.onCompare
 * @param {() => void} props.onRecommend
 */
export default function DiagnosisResult({ onBack: _onBack, onCompare, onRecommend }) {
  const [activeTab, setActiveTab] = useState('글로벌');

  const tabs = COMP_LABELS.map((l) => ({ key: l, label: l }));
  const subComps = SUB_COMPETENCIES[activeTab] ?? [];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '핵심역량 진단' }, { label: '진단 결과' }]}
        title="핵심역량 진단 결과"
        subtitle="2026학년도 1학기 사전진단 · 응시일 2026-03-08 · 백분위 상위 32%"
        accentColor={COMP_COLOR}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast('PDF 저장 준비 중', 'info')}
              icon={
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.5 14h11V15.5h-11zM8 12L3.5 7.5h3V.5h3v7h3z" />
                </svg>
              }
            >
              결과 PDF 저장
            </Button>
            <Button size="sm" style={{ background: COMP_COLOR }} onClick={onCompare}>
              사전·사후 비교
            </Button>
          </>
        }
      />

      {/* 2-col grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Left — Radar */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#7C3AED]" />
            <h2 className="text-[14px] font-bold text-[#1F2328]">역량 프로파일</h2>
          </div>

          <div className="flex justify-center">
            <RadarChart
              labels={[...COMP_LABELS]}
              values={MY_SCORES}
              compareValues={AVG_SCORES}
              color={COMP_COLOR}
              size={300}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 justify-center mt-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded bg-[#7C3AED]" />
              <span className="text-[12px] text-[#656D76] font-semibold">내 점수</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="4" viewBox="0 0 16 4">
                <line
                  x1="0"
                  y1="2"
                  x2="16"
                  y2="2"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              </svg>
              <span className="text-[12px] text-[#656D76] font-semibold">전체 평균</span>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="text-center p-3 bg-[#F5F3FF] rounded-[6px]">
              <div className="text-[20px] font-black text-[#7C3AED]">{MY_AVG}</div>
              <div className="text-[11px] text-[#656D76] font-semibold mt-0.5">나의 평균</div>
            </div>
            <div className="text-center p-3 bg-[#F9FAFB] rounded-[6px]">
              <div className="text-[20px] font-black text-[#6E7781]">
                {Math.round((AVG_SCORES.reduce((a, b) => a + b, 0) / AVG_SCORES.length) * 10) / 10}
              </div>
              <div className="text-[11px] text-[#656D76] font-semibold mt-0.5">전체 평균</div>
            </div>
            <div className="text-center p-3 bg-[#EFF6FF] rounded-[6px]">
              <div className="text-[20px] font-black text-[#2563EB]">상위 32%</div>
              <div className="text-[11px] text-[#656D76] font-semibold mt-0.5">백분위</div>
            </div>
          </div>
        </div>

        {/* Right — Score table */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#7C3AED]" />
            <h2 className="text-[14px] font-bold text-[#1F2328]">역량별 점수</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F6F8FA] text-[#656D76] text-[11px] uppercase tracking-wide">
                  <th className="text-left px-3 py-2.5 font-semibold">역량</th>
                  <th className="text-right px-3 py-2.5 font-semibold">내 점수</th>
                  <th className="text-right px-3 py-2.5 font-semibold">전체 평균</th>
                  <th className="text-right px-3 py-2.5 font-semibold">백분위</th>
                  <th className="text-center px-3 py-2.5 font-semibold">판정</th>
                </tr>
              </thead>
              <tbody>
                {COMP_LABELS.map((label, i) => {
                  const my = MY_SCORES[i];
                  const avg = AVG_SCORES[i];
                  const pct = PERCENTILES[i];
                  const jdg = judgment(my);
                  const isLowest = label === '글로벌';
                  return (
                    <tr
                      key={label}
                      className={`border-t border-[#E5E7EB] transition-colors hover:bg-[#FAFAFA] ${isLowest ? 'bg-[#FEF2F2]' : ''}`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {isLowest && (
                            <span className="text-[10px] text-[#CF222E] font-black">▼</span>
                          )}
                          <span
                            className={`font-semibold ${isLowest ? 'text-[#CF222E]' : 'text-[#1F2328]'}`}
                          >
                            {label}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-3 py-3 text-right font-black"
                        style={{ color: isLowest ? '#CF222E' : '#7C3AED' }}
                      >
                        {my}점
                      </td>
                      <td className="px-3 py-3 text-right text-[#9AA0A6]">{avg}점</td>
                      <td className="px-3 py-3 text-right text-[#656D76]">상위 {pct}%</td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${JUDG_STYLE[jdg]}`}
                        >
                          {jdg}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mini bar chart */}
          <div className="mt-5 pt-4 border-t border-[#F3F4F6]">
            <div className="text-[11px] font-semibold text-[#9AA0A6] uppercase mb-3">점수 분포</div>
            <div className="flex flex-col gap-2">
              {COMP_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[11px] text-[#656D76] w-24 truncate flex-shrink-0">
                    {label}
                  </span>
                  <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${MY_SCORES[i]}%`,
                        background: label === '글로벌' ? '#CF222E' : COMP_COLOR,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#1F2328] w-8 text-right flex-shrink-0">
                    {MY_SCORES[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-competency detail */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] mb-6">
        <div className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#7C3AED]" />
            <h2 className="text-[14px] font-bold text-[#1F2328]">하위역량 상세</h2>
            <span className="text-[12px] text-[#9AA0A6]">
              역량을 선택하면 하위 항목을 확인할 수 있습니다.
            </span>
          </div>
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} accentColor={COMP_COLOR} />
        </div>

        <div className="px-5 pb-5">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F6F8FA] text-[#656D76] text-[11px] uppercase tracking-wide">
                <th className="text-left px-3 py-2.5 font-semibold rounded-tl-[4px]">하위역량</th>
                <th className="text-right px-3 py-2.5 font-semibold w-24">점수</th>
                <th className="text-right px-3 py-2.5 font-semibold w-20">판정</th>
                <th className="text-left px-3 py-2.5 font-semibold rounded-tr-[4px]">해석</th>
              </tr>
            </thead>
            <tbody>
              {subComps.map((sub, i) => {
                const jdg = judgment(sub.score);
                const isLowest = i === 0 && activeTab === '글로벌';
                return (
                  <tr
                    key={sub.name}
                    className={`border-t border-[#E5E7EB] hover:bg-[#FAFAFA] transition-colors ${isLowest ? 'bg-[#FEF2F2]' : i % 2 === 1 ? 'bg-[#FAFAFA]' : ''}`}
                  >
                    <td className="px-3 py-3 font-semibold text-[#1F2328]">
                      <div className="flex items-center gap-2">
                        {isLowest && (
                          <span className="text-[10px] font-bold text-[#CF222E]">★ 최저</span>
                        )}
                        {sub.name}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className="font-black"
                        style={{ color: jdg === '보완 필요' ? '#CF222E' : COMP_COLOR }}
                      >
                        {sub.score}점
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${JUDG_STYLE[jdg]}`}
                      >
                        {jdg}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#656D76]">{sub.interpretation}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] rounded-[10px] p-6 flex items-center justify-between">
        <div>
          <div className="text-white font-bold text-[16px]">
            취약 역량 기반 추천 비교과 프로그램
          </div>
          <div className="text-[#C4B5FD] text-[13px] mt-1">
            글로벌 역량(52점) 향상을 위한 맞춤 프로그램을 확인하세요.
          </div>
        </div>
        <Button
          size="lg"
          variant="secondary"
          onClick={onRecommend}
          className="flex-shrink-0 !bg-white !text-[#7C3AED] font-bold hover:!bg-[#F5F3FF]"
        >
          추천 프로그램 보기 →
        </Button>
      </div>
    </div>
  );
}
