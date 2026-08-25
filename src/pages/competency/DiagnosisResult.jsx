import { useQuery } from '@tanstack/react-query';
import { fetchAssessmentResult } from '@/api/competency';
import { ApiError } from '@/api/client';
import { COMP_COLOR } from '@/data/competencyData';
import { formatDateTime } from '@/utils/date';
import { PageHeader, RadarChart, Button, EmptyState, SkeletonLoader, toast } from '@/components/common';

const judgment = (score) => (score >= 75 ? '우수' : score >= 60 ? '보통' : '보완 필요');
const JUDG_STYLE = {
  우수: 'bg-[#DCFCE7] text-[#1A7F37]',
  보통: 'bg-[#F3F4F6] text-[#6E7781]',
  '보완 필요': 'bg-[#FEE2E2] text-[#CF222E]',
};

/**
 * @param {Object} props
 * @param {number} props.attemptId
 * @param {() => void} [props.onBack]
 * @param {() => void} props.onCompare
 * @param {() => void} props.onRecommend
 */
export default function DiagnosisResult({ attemptId, onBack, onCompare, onRecommend }) {
  const {
    data: result,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['assessmentResult', attemptId],
    queryFn: () => fetchAssessmentResult(attemptId),
    enabled: !!attemptId,
  });

  if (!attemptId) {
    return <EmptyState message="진단 결과 정보를 찾을 수 없습니다." />;
  }

  // isPending(데이터 없음)을 기준으로 삼아야 한다 — isLoading(=isPending && isFetching)은
  // fetch effect가 아직 시작되기 전 첫 렌더에서 false일 수 있어, 그 틈에 result.scores 접근이 터진다.
  if (isPending) {
    return (
      <div className="px-6 py-6">
        <SkeletonLoader rows={3} cols={2} />
      </div>
    );
  }

  if (isError) {
    // Q018(RESULT_NOT_AVAILABLE): 아직 제출 전이라 채점되지 않은 attempt
    const notAvailable = error instanceof ApiError && error.code === 'Q018';
    return (
      <EmptyState
        message={
          notAvailable
            ? '아직 채점되지 않은 진단입니다.'
            : error instanceof ApiError
              ? error.message
              : '결과를 불러오지 못했습니다.'
        }
        sub={notAvailable ? '진단을 제출하면 결과를 확인할 수 있습니다.' : '잠시 후 다시 시도해 주세요.'}
        action={
          notAvailable ? (
            onBack && (
              <button
                type="button"
                onClick={onBack}
                className="h-9 px-5 text-[13px] font-semibold text-[#656D76] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
              >
                ← 진단 안내로 돌아가기
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => refetch()}
              className="h-9 px-5 text-[13px] font-bold text-white rounded-[6px]"
              style={{ background: '#7C3AED' }}
            >
              다시 시도
            </button>
          )
        }
      />
    );
  }

  // scores가 비어있으면 200을 내려주지 않는 게 BE 계약(AssessmentResultService)이지만,
  // 계약이 어긋나도 아래 lowest.competencyName 접근에서 죽지 않도록 방어한다.
  if (result.scores.length === 0) {
    return <EmptyState message="집계된 역량 점수가 없습니다." sub="잠시 후 다시 시도해 주세요." />;
  }

  // 응답 배열 순서에 기대지 않고 displayOrder로 직접 정렬한다 — 여러 화면에서 축 순서를
  // 동일하게 맞춰야 하는 기준이 이 필드라 서버가 명시적으로 내려준다.
  const scores = [...result.scores].sort((a, b) => a.displayOrder - b.displayOrder);

  const labels = scores.map((s) => s.competencyName);
  const values = scores.map((s) => Number(s.convertedScore));
  const compareValues = values.map(() => Number(result.overallAverageScore));

  const lowest = scores.reduce((min, s) => (s.convertedScore < min.convertedScore ? s : min), scores[0]);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '핵심역량 진단' }, { label: '진단 결과' }]}
        title="핵심역량 진단 결과"
        subtitle={`응시일 ${formatDateTime(result.submittedAt)} · ${result.percentileAvailable ? '백분위 산출 완료' : '백분위 집계중'}`}
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
            <RadarChart labels={labels} values={values} compareValues={compareValues} color={COMP_COLOR} size={300} />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 justify-center mt-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded bg-[#7C3AED]" />
              <span className="text-[12px] text-[#656D76] font-semibold">내 점수</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="4" viewBox="0 0 16 4">
                <line x1="0" y1="2" x2="16" y2="2" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4 3" />
              </svg>
              <span className="text-[12px] text-[#656D76] font-semibold">나의 평균</span>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="text-center p-3 bg-[#F5F3FF] rounded-[6px]">
              <div className="text-[20px] font-black text-[#7C3AED]">{result.overallAverageScore}</div>
              <div className="text-[11px] text-[#656D76] font-semibold mt-0.5">나의 평균</div>
            </div>
            <div className="text-center p-3 bg-[#EFF6FF] rounded-[6px]">
              <div className="text-[20px] font-black text-[#2563EB]">
                {result.percentileAvailable ? '산출 완료' : '집계중'}
              </div>
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
                  <th className="text-right px-3 py-2.5 font-semibold">점수</th>
                  <th className="text-right px-3 py-2.5 font-semibold">백분위</th>
                  <th className="text-center px-3 py-2.5 font-semibold">판정</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s) => {
                  const jdg = judgment(s.convertedScore);
                  const isLowest = s.competencyId === lowest.competencyId;
                  return (
                    <tr
                      key={s.competencyId}
                      className={`border-t border-[#E5E7EB] transition-colors hover:bg-[#FAFAFA] ${isLowest ? 'bg-[#FEF2F2]' : ''}`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {isLowest && <span className="text-[10px] text-[#CF222E] font-black">▼</span>}
                          <span className={`font-semibold ${isLowest ? 'text-[#CF222E]' : 'text-[#1F2328]'}`}>
                            {s.competencyName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-black" style={{ color: isLowest ? '#CF222E' : '#7C3AED' }}>
                        {s.convertedScore}점
                      </td>
                      <td className="px-3 py-3 text-right text-[#656D76]">
                        {result.percentileAvailable && s.percentile != null ? `상위 ${s.percentile}%` : '집계중'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${JUDG_STYLE[jdg]}`}>{jdg}</span>
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
              {scores.map((s) => {
                const isLowest = s.competencyId === lowest.competencyId;
                return (
                  <div key={s.competencyId} className="flex items-center gap-2">
                    <span className="text-[11px] text-[#656D76] w-24 truncate flex-shrink-0">
                      {s.competencyName}
                    </span>
                    <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.convertedScore}%`,
                          background: isLowest ? '#CF222E' : COMP_COLOR,
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#1F2328] w-8 text-right flex-shrink-0">
                      {s.convertedScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] rounded-[10px] p-6 flex items-center justify-between">
        <div>
          <div className="text-white font-bold text-[16px]">취약 역량 기반 추천 비교과 프로그램</div>
          <div className="text-[#C4B5FD] text-[13px] mt-1">
            {lowest.competencyName} 역량({lowest.convertedScore}점) 향상을 위한 맞춤 프로그램을 확인하세요.
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
