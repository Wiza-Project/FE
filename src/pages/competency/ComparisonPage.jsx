import { COMP_LABELS, MY_SCORES, POST_SCORES, COMP_COLOR } from '@/data/competencyData';
import { PageHeader, RadarChart, EmptyState, Button } from '@/components/common';

const PRE_SCORES = MY_SCORES;
const BEFORE_INFO = { name: '2026학년도 1학기 사전 진단', date: '2026-03-08', avg: 69.0 };
const AFTER_INFO = { name: '2025학년도 2학기 사후 진단', date: '2025-11-28', avg: 74.8 };

/**
 * @param {Object} props
 * @param {boolean} [props.hasBoth]
 * @param {() => void} props.onBack
 */
export default function ComparisonPage({ hasBoth = true, onBack }) {
  if (!hasBoth) {
    return (
      <div>
        <PageHeader
          breadcrumbs={[{ label: '핵심역량 진단' }, { label: '사전·사후 비교' }]}
          title="사전·사후 비교"
          accentColor={COMP_COLOR}
        />
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-12">
          <EmptyState
            message="사전 진단 미응시로 비교할 수 없습니다."
            sub="사전 진단과 사후 진단을 모두 응시해야 비교 결과를 확인할 수 있습니다."
            action={
              <Button size="sm" style={{ background: COMP_COLOR }}>
                사전 진단 응시하기
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const deltas = COMP_LABELS.map((_, i) => POST_SCORES[i] - PRE_SCORES[i]);
  const maxDelta = deltas.reduce((m, v, i) => (v > deltas[m] ? i : m), 0);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '핵심역량 진단' }, { label: '사전·사후 비교' }]}
        title="사전·사후 비교"
        subtitle="두 회차의 핵심역량 점수 변화를 분석합니다."
        accentColor={COMP_COLOR}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 이력으로 돌아가기
          </Button>
        }
      />

      {/* Comparison subject cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[
          {
            info: BEFORE_INFO,
            label: '사전 진단',
            scores: PRE_SCORES,
            color: '#9CA3AF',
            style: 'border-[#E5E7EB]',
          },
          {
            info: AFTER_INFO,
            label: '사후 진단',
            scores: POST_SCORES,
            color: COMP_COLOR,
            style: 'border-[#7C3AED]',
          },
        ].map(({ info, label, color, style }) => (
          <div
            key={label}
            className={`bg-white rounded-[8px] border-2 ${style} p-5 flex items-center gap-5`}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-[12px] flex-shrink-0"
              style={{ background: color }}
            >
              {label[0]}진
            </div>
            <div className="flex-1">
              <div
                className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex mb-1"
                style={{ background: color + '20', color }}
              >
                {label}
              </div>
              <div className="text-[14px] font-bold text-[#1F2328]">{info.name}</div>
              <div className="text-[12px] text-[#656D76] mt-0.5">응시일: {info.date}</div>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-[26px] font-black" style={{ color }}>
                {info.avg}점
              </div>
              <div className="text-[11px] text-[#9AA0A6]">평균</div>
            </div>
          </div>
        ))}
      </div>

      {/* Radar + Table */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Radar overlay */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#7C3AED]" />
            <h2 className="text-[14px] font-bold text-[#1F2328]">역량 변화 프로파일</h2>
          </div>
          <div className="flex justify-center">
            <RadarChart
              labels={[...COMP_LABELS]}
              values={POST_SCORES}
              compareValues={PRE_SCORES}
              color={COMP_COLOR}
              size={300}
            />
          </div>
          <div className="flex items-center gap-6 justify-center mt-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded bg-[#7C3AED]" />
              <span className="text-[12px] text-[#656D76] font-semibold">사후 진단</span>
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
              <span className="text-[12px] text-[#656D76] font-semibold">사전 진단</span>
            </div>
          </div>
        </div>

        {/* Delta table */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#7C3AED]" />
            <h2 className="text-[14px] font-bold text-[#1F2328]">역량별 증감</h2>
          </div>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F6F8FA] text-[#656D76] text-[11px] uppercase tracking-wide">
                <th className="text-left px-3 py-2.5 font-semibold">역량</th>
                <th className="text-right px-3 py-2.5 font-semibold">사전</th>
                <th className="text-right px-3 py-2.5 font-semibold">사후</th>
                <th className="text-right px-3 py-2.5 font-semibold">증감</th>
              </tr>
            </thead>
            <tbody>
              {COMP_LABELS.map((label, i) => {
                const pre = PRE_SCORES[i];
                const post = POST_SCORES[i];
                const delta = post - pre;
                const isMax = i === maxDelta;
                return (
                  <tr
                    key={label}
                    className={`border-t border-[#E5E7EB] transition-colors hover:bg-[#FAFAFA] ${isMax ? 'bg-[#F5F3FF]' : ''}`}
                  >
                    <td className="px-3 py-2.5 font-semibold text-[#1F2328] flex items-center gap-1.5">
                      {isMax && <span className="text-[#7C3AED] text-[10px]">★</span>}
                      {label}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#9AA0A6]">{pre}점</td>
                    <td className="px-3 py-2.5 text-right font-bold" style={{ color: COMP_COLOR }}>
                      {post}점
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {delta > 0 ? (
                        <span className="text-[#1A7F37] font-black">▲ +{delta.toFixed(1)}</span>
                      ) : delta < 0 ? (
                        <span className="text-[#CF222E] font-black">▼ {delta.toFixed(1)}</span>
                      ) : (
                        <span className="text-[#9AA0A6]">- 0.0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr className="border-t-2 border-[#E5E7EB] bg-[#F6F8FA]">
                <td className="px-3 py-2.5 font-bold text-[#1F2328]">평균</td>
                <td className="px-3 py-2.5 text-right text-[#9AA0A6] font-semibold">
                  {BEFORE_INFO.avg}점
                </td>
                <td className="px-3 py-2.5 text-right font-black" style={{ color: COMP_COLOR }}>
                  {AFTER_INFO.avg}점
                </td>
                <td className="px-3 py-2.5 text-right font-black text-[#1A7F37]">
                  ▲ +{(AFTER_INFO.avg - BEFORE_INFO.avg).toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Insight banner */}
      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] px-6 py-5 flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center flex-shrink-0">
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="#1A7F37"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" opacity=".2" fill="#1A7F37" />
            <path d="M7 10l2 2 4-4" />
          </svg>
        </div>
        <div>
          <div className="text-[14px] font-bold text-[#14532D] mb-1">성장 인사이트</div>
          <p className="text-[13px] text-[#166534] leading-relaxed">
            <strong>글로벌 역량이 11.0점 상승</strong>했습니다. 이번 학기 참여한{' '}
            <span className="bg-[#DCFCE7] px-1.5 py-0.5 rounded font-semibold">
              해외문화체험 워크숍
            </span>
            ·
            <span className="bg-[#DCFCE7] px-1.5 py-0.5 rounded font-semibold">
              영어 프레젠테이션 클리닉
            </span>
            이 반영된 결과입니다. 꾸준한 참여로 역량을 더 발전시켜 보세요.
          </p>
        </div>
      </div>
    </div>
  );
}
