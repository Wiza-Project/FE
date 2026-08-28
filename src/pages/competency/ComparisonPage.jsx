import { useQuery } from '@tanstack/react-query';
import { fetchAssessmentComparison } from '@/api/competency';
import { ApiError } from '@/api/client';
import { useCommonCode } from '@/hooks/useCommonCode';
import { COMP_COLOR, COMP_AVG_COLOR } from '@/data/competencyData';
import { formatDate } from '@/utils/date';
import { PageHeader, RadarChart, Button, EmptyState, SkeletonLoader } from '@/components/common';

const BEFORE_COLOR = COMP_AVG_COLOR; // 사전 진단: 방사형 오버레이의 점선 비교군과 같은 회색
const AFTER_COLOR = COMP_COLOR; // 사후 진단: 실선

const num = (v) => (v == null ? null : Number(v));

/** afterScore - beforeScore 부호별 표기. 하락(음수)도 마스킹 없이 그대로 보여준다. */
function DeltaCell({ value }) {
  const d = num(value);
  if (d == null) return <span className="text-[#9AA0A6]">-</span>;
  if (d > 0) return <span className="text-[#1A7F37] font-black">▲ +{d.toFixed(1)}</span>;
  if (d < 0) return <span className="text-[#CF222E] font-black">▼ {d.toFixed(1)}</span>;
  return <span className="text-[#9AA0A6]">- 0.0</span>;
}

/**
 * 사전·사후 비교. 진단 이력에서 고른 두 회차의 attemptId를 서버에 넘기면
 * 사전 → 사후 방향은 서버가 회차 구분(PRE/POST)으로 정하고, 겹친 방사형 차트용 점수와
 * 역량별 변화량을 내려준다. 이 화면은 그 응답을 그릴 뿐 방향·변화량을 다시 계산하지 않는다.
 *
 * @param {Object} props
 * @param {import('@/api/competency').AssessmentHistoryItem[]} [props.pair]
 *   진단 이력에서 체크박스로 고른 두 회차. 길이가 2가 아니면 선택 안내만 보여준다.
 * @param {() => void} props.onBack 진단 이력으로 돌아가기
 */
export default function ComparisonPage({ pair, onBack }) {
  const ready = Array.isArray(pair) && pair.length === 2;
  const [firstId, secondId] = ready ? [pair[0].attemptId, pair[1].attemptId] : [null, null];

  const { data: semesterCodes = [] } = useCommonCode('SEMESTER');
  const semesterLabel = (code) => semesterCodes.find((s) => s.code === code)?.codeName ?? code;

  const {
    data,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['assessmentComparison', firstId, secondId],
    queryFn: () => fetchAssessmentComparison(firstId, secondId),
    enabled: ready,
    // Q022(같은 응시)·Q023(사전·사후 쌍 아님)은 재시도해도 같은 결과라 스켈레톤만 길어진다.
    retry: (failureCount, err) =>
      !(err instanceof ApiError && ['Q018', 'Q022', 'Q023'].includes(err.code)) && failureCount < 1,
  });

  const header = (
    <PageHeader
      breadcrumbs={[{ label: '핵심역량 진단' }, { label: '사전·사후 비교' }]}
      title="사전·사후 비교"
      subtitle="두 회차의 핵심역량 점수 변화를 사전 → 사후 방향으로 비교합니다."
      accentColor={COMP_COLOR}
      actions={
        <Button size="sm" variant="outline" onClick={onBack}>
          ← 이력으로 돌아가기
        </Button>
      }
    />
  );

  if (!ready) {
    return (
      <div>
        {header}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-12">
          <EmptyState
            message="비교할 두 회차를 선택해 주세요."
            sub="진단 이력에서 회차 두 개를 체크한 뒤 비교하기를 누르면 사전·사후 비교를 볼 수 있습니다."
            action={
              <Button size="sm" style={{ background: COMP_COLOR }} onClick={onBack}>
                진단 이력으로 이동
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div>
        {header}
        <SkeletonLoader rows={3} cols={2} />
      </div>
    );
  }

  if (isError) {
    // Q023(NOT_PRE_POST_PAIR)·Q022(SAME_ATTEMPT)는 학생이 선택을 바꾸면 해결되는 안내성 에러다.
    const guided =
      error instanceof ApiError && ['Q022', 'Q023'].includes(error.code);
    return (
      <div>
        {header}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-12">
          <EmptyState
            message={
              error instanceof ApiError ? error.message : '비교 결과를 불러오지 못했습니다.'
            }
            sub={
              guided
                ? '진단 이력으로 돌아가 같은 학년도의 사전·사후 회차 한 쌍을 선택해 주세요.'
                : '잠시 후 다시 시도해 주세요.'
            }
            action={
              <Button size="sm" style={{ background: COMP_COLOR }} onClick={onBack}>
                진단 이력으로 이동
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const { before, after, deltas } = data;

  // 서버가 이미 축순서(displayOrder)로 정렬해 내려주지만, 방사형 차트 축과 표가
  // 어긋나지 않도록 한 번 더 정렬 기준을 고정한다.
  const rows = [...(deltas ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);

  const labels = rows.map((d) => d.competencyName);
  // 한쪽 점수만 있는 역량(데이터 이상)은 없는 쪽을 있는 쪽 값으로 채워 방사형 축에서
  // "변화 없음"으로 그린다 — 0으로 두면 그 역량만 중심까지 꺼져 실제 하락처럼 보인다.
  const beforeValues = rows.map((d) => num(d.beforeScore) ?? num(d.afterScore) ?? 0);
  const afterValues = rows.map((d) => num(d.afterScore) ?? num(d.beforeScore) ?? 0);

  const beforeAvg = num(before.overallAverageScore);
  const afterAvg = num(after.overallAverageScore);
  const avgDelta = beforeAvg != null && afterAvg != null ? afterAvg - beforeAvg : null;

  // 좋게만 보이도록 가공하지 않는다 — 가장 큰 상승과 가장 큰 하락을 사실 그대로 요약한다.
  const scored = rows.filter((d) => num(d.delta) != null);
  const topGain = scored.reduce((m, d) => (num(d.delta) > num(m?.delta ?? -Infinity) ? d : m), null);
  const topDrop = scored.reduce((m, d) => (num(d.delta) < num(m?.delta ?? Infinity) ? d : m), null);
  const summaryParts = [];
  if (topGain && num(topGain.delta) > 0)
    summaryParts.push(`가장 많이 오른 역량은 ${topGain.competencyName} (+${num(topGain.delta).toFixed(1)}점)`);
  if (topDrop && num(topDrop.delta) < 0)
    summaryParts.push(`가장 많이 내린 역량은 ${topDrop.competencyName} (${num(topDrop.delta).toFixed(1)}점)`);

  const sides = [
    { info: before, label: '사전 진단', color: BEFORE_COLOR, borderStyle: 'border-[#E5E7EB]' },
    { info: after, label: '사후 진단', color: AFTER_COLOR, borderStyle: 'border-[#7C3AED]' },
  ];

  return (
    <div>
      {header}

      {/* 비교 대상 회차 카드 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {sides.map(({ info, label, color, borderStyle }) => (
          <div
            key={label}
            className={`bg-white rounded-[8px] border-2 ${borderStyle} p-5 flex items-center gap-5`}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-[12px] flex-shrink-0"
              style={{ background: color }}
            >
              {label[0]}진
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex mb-1"
                style={{ background: color + '20', color }}
              >
                {label}
              </div>
              <div className="text-[14px] font-bold text-[#1F2328] truncate">
                {info.assessmentName}
              </div>
              <div className="text-[12px] text-[#656D76] mt-0.5">
                {info.academicYear}학년도 {semesterLabel(info.semesterCode)} · 응시일{' '}
                {formatDate(info.submittedAt)}
              </div>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-[26px] font-black" style={{ color }}>
                {num(info.overallAverageScore) != null ? `${num(info.overallAverageScore)}점` : '-'}
              </div>
              <div className="text-[11px] text-[#9AA0A6]">평균</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* 겹친 방사형 차트 */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#7C3AED]" />
            <h2 className="text-[14px] font-bold text-[#1F2328]">역량 변화 프로파일</h2>
          </div>
          <div className="flex justify-center">
            <RadarChart
              labels={labels}
              values={afterValues}
              compareValues={beforeValues}
              color={AFTER_COLOR}
              size={300}
            />
          </div>
          <div className="flex items-center gap-6 justify-center mt-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded" style={{ background: AFTER_COLOR }} />
              <span className="text-[12px] text-[#656D76] font-semibold">사후 진단</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="4" viewBox="0 0 16 4">
                <line
                  x1="0"
                  y1="2"
                  x2="16"
                  y2="2"
                  stroke={BEFORE_COLOR}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              </svg>
              <span className="text-[12px] text-[#656D76] font-semibold">사전 진단</span>
            </div>
          </div>
        </div>

        {/* 역량별 증감 표 */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#7C3AED]" />
            <h2 className="text-[14px] font-bold text-[#1F2328]">역량별 증감</h2>
          </div>
          <div className="overflow-x-auto">
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
                {rows.map((d) => {
                  const isTopGain =
                    topGain && d.competencyId === topGain.competencyId && num(d.delta) > 0;
                  return (
                    <tr
                      key={d.competencyId}
                      className={`border-t border-[#E5E7EB] transition-colors hover:bg-[#FAFAFA] ${isTopGain ? 'bg-[#F5F3FF]' : ''}`}
                    >
                      <td className="px-3 py-2.5 font-semibold text-[#1F2328]">
                        <span className="flex items-center gap-1.5">
                          {isTopGain && <span className="text-[#7C3AED] text-[10px]">★</span>}
                          {d.competencyName}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[#9AA0A6]">
                        {num(d.beforeScore) != null ? `${num(d.beforeScore)}점` : '-'}
                      </td>
                      <td
                        className="px-3 py-2.5 text-right font-bold"
                        style={{ color: AFTER_COLOR }}
                      >
                        {num(d.afterScore) != null ? `${num(d.afterScore)}점` : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <DeltaCell value={d.delta} />
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-[#E5E7EB] bg-[#F6F8FA]">
                  <td className="px-3 py-2.5 font-bold text-[#1F2328]">평균</td>
                  <td className="px-3 py-2.5 text-right text-[#9AA0A6] font-semibold">
                    {beforeAvg != null ? `${beforeAvg}점` : '-'}
                  </td>
                  <td
                    className="px-3 py-2.5 text-right font-black"
                    style={{ color: AFTER_COLOR }}
                  >
                    {afterAvg != null ? `${afterAvg}점` : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <DeltaCell value={avgDelta} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 사실 요약 — 상승·하락을 그대로 전달 */}
      <div className="bg-[#F6F8FA] border border-[#E5E7EB] rounded-[10px] px-6 py-4 mb-6 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={COMP_COLOR} strokeWidth="1.8" strokeLinecap="round">
            <path d="M10 6v5M10 14h.01" />
            <circle cx="10" cy="10" r="8" />
          </svg>
        </div>
        <p className="text-[13px] text-[#4B5563] leading-relaxed pt-1">
          {summaryParts.length > 0
            ? `${summaryParts.join(', ')}입니다. 전체 평균은 ${
                avgDelta == null
                  ? '변동이 없습니다'
                  : avgDelta > 0
                    ? `+${avgDelta.toFixed(1)}점 상승했습니다`
                    : avgDelta < 0
                      ? `${avgDelta.toFixed(1)}점 하락했습니다`
                      : '변동이 없습니다'
              }.`
            : '두 회차 사이 역량별 점수 변화가 없습니다.'}
        </p>
      </div>
    </div>
  );
}
