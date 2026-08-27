import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { fetchMileageSimulationOptions, simulateMileage } from '@/api/mileage';
import {
  PageHeader,
  StatTile,
  Button,
  BarChart,
  Pagination,
  Drawer,
  toast,
} from '@/components/common';

const ACCENT = '#D97706';
const DASHBOARD_PERIOD = { academicYear: 2026, semesterCode: '1' };

const PAGE_SIZE = 10;
const SOURCE_LABELS = {
  EXTRACURRICULAR_PROGRAM: '비교과',
  EXTERNAL_ACTIVITY: '외부활동',
  OTHER: '기타',
};
const TRANSACTION_TYPE_LABELS = {
  EARN: '적립',
  CANCEL: '취소',
  ADJUST: '정정',
};
const TRANSACTION_STATUS_LABELS = {
  POSTED: '확정',
  REQUESTED: '처리중',
  REJECTED: '반려',
};
const BENEFIT_STATUS_LABELS = {
  ELIGIBLE: '가능',
  APPLIED: '신청완료',
  INSUFFICIENT_POINTS: '점수 부족',
  APPLICATION_NOT_OPEN: '신청 전',
  APPLICATION_CLOSED: '신청 마감',
};

const formatPoints = (value) => Number(value ?? 0).toLocaleString('ko-KR');
const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('ko-KR').format(date);
};
const formatDateTime = (value) => {
  const date = parseDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

// ── Inline Trend Line Chart (SVG) ──
function TrendChart({ data = [] }) {
  const W = 480;
  const H = 120;
  const PAD = { l: 36, r: 20, t: 16, b: 28 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const chartData = Array.isArray(data) ? data : [];
  if (chartData.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-[12px] text-[#9AA0A6]">
        학기별 적립 내역이 없습니다.
      </div>
    );
  }

  const max = Math.max(...chartData.map((d) => d.value), 1);
  const pointDenominator = Math.max(chartData.length - 1, 1);
  const pts = chartData.map((d, i) => ({
    x: PAD.l + (i / pointDenominator) * cW,
    y: PAD.t + cH - (d.value / max) * cH * 0.88,
    d,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length - 1].x},${PAD.t + cH} L${pts[0].x},${PAD.t + cH} Z`;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="학기별 적립 추이 그래프"
    >
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.25" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Y gridlines */}
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <line
          key={r}
          x1={PAD.l}
          y1={PAD.t + cH * (1 - r * 0.88)}
          x2={W - PAD.r}
          y2={PAD.t + cH * (1 - r * 0.88)}
          stroke="#E5E7EB"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}
      {/* Y labels */}
      {[0, 150, 300, 450].map((v, i) => (
        <text
          key={i}
          x={PAD.l - 4}
          y={PAD.t + cH - (v / max) * cH * 0.88 + 4}
          textAnchor="end"
          fontSize="9"
          fill="#9AA0A6"
          fontFamily="Pretendard, sans-serif"
        >
          {v}
        </text>
      ))}
      {/* Area */}
      <path d={areaD} fill="url(#trendGrad)" />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={ACCENT}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Points + labels */}
      {pts.map((p) => (
        <g key={p.d.label}>
          <circle cx={p.x} cy={p.y} r="4" fill={ACCENT} stroke="white" strokeWidth="2" />
          <text
            x={p.x}
            y={p.y - 9}
            textAnchor="middle"
            fontSize="10"
            fill={ACCENT}
            fontFamily="Pretendard, sans-serif"
            fontWeight="700"
          >
            {p.d.value}점
          </text>
          <text
            x={p.x}
            y={PAD.t + cH + 14}
            textAnchor="middle"
            fontSize="9"
            fill="#656D76"
            fontFamily="Pretendard, sans-serif"
          >
            {p.d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * @param {Object} props
 * @param {() => void} props.onExternal
 */
export default function MileageDashboard({ onExternal }) {
  const [tab, setTab] = useState('dashboard');
  const [simTarget, setSimTarget] = useState('');
  const [simulationOptions, setSimulationOptions] = useState(null);
  const [simulationOptionsLoading, setSimulationOptionsLoading] = useState(false);
  const [simulationOptionsError, setSimulationOptionsError] = useState('');
  const [selectedTargetBenefitPolicyId, setSelectedTargetBenefitPolicyId] = useState(null);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState('');
  const [page, setPage] = useState(1);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [gradeData, setGradeData] = useState(null);
  const [gradeLoading, setGradeLoading] = useState(true);
  const [gradeError, setGradeError] = useState('');
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [transactionDetail, setTransactionDetail] = useState(null);
  const [transactionDetailLoading, setTransactionDetailLoading] = useState(false);
  const [transactionDetailError, setTransactionDetailError] = useState('');

  useEffect(() => {
    let mounted = true;

    apiClient
      .get('/students/mileage/dashboard', { params: DASHBOARD_PERIOD })
      .then(({ data }) => {
        if (mounted) {
          setDashboardData(data);
          setDashboardError('');
        }
      })
      .catch((error) => {
        if (mounted) setDashboardError(error.message);
      })
      .finally(() => {
        if (mounted) setDashboardLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== 'simulation') return undefined;

    let mounted = true;
    setSimulationOptionsLoading(true);
    setSimulationOptionsError('');

    fetchMileageSimulationOptions(DASHBOARD_PERIOD)
      .then((data) => {
        if (!mounted) return;

        const targets = Array.isArray(data?.targets) ? data.targets : [];
        const firstTarget = targets[0];
        setSimulationOptions(data ?? { targets: [], activities: [] });
        setSelectedTargetBenefitPolicyId(firstTarget?.benefitPolicyId ?? null);
        setSimTarget(String(firstTarget?.targetPoints ?? data?.currentPoints ?? ''));
        setSelectedActivities([]);
        setSimulationResult(null);
        setSimulationError('');
      })
      .catch((error) => {
        if (mounted) setSimulationOptionsError(error.message);
      })
      .finally(() => {
        if (mounted) setSimulationOptionsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [tab]);

  useEffect(() => {
    let mounted = true;

    apiClient
      .get('/students/mileage/grade', { params: DASHBOARD_PERIOD })
      .then(({ data }) => {
        if (mounted) {
          setGradeData(data);
          setGradeError('');
        }
      })
      .catch((error) => {
        if (mounted) setGradeError(error.message);
      })
      .finally(() => {
        if (mounted) setGradeLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== 'ledger') return undefined;

    let mounted = true;
    setLedgerLoading(true);
    setLedgerError('');

    apiClient
      .get('/students/mileage/transactions', {
        params: { page: page - 1, size: PAGE_SIZE },
      })
      .then(({ data }) => {
        if (mounted) {
          setLedgerData(data);
          setLedgerError('');
        }
      })
      .catch((error) => {
        if (mounted) setLedgerError(error.message);
      })
      .finally(() => {
        if (mounted) setLedgerLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [page, tab]);

  const openTransactionDetail = async (transactionId) => {
    setSelectedTransactionId(transactionId);
    setTransactionDetail(null);
    setTransactionDetailError('');
    setTransactionDetailLoading(true);

    try {
      const { data } = await apiClient.get(`/students/mileage/transactions/${transactionId}`);
      setTransactionDetail(data);
    } catch (error) {
      setTransactionDetailError(error.message);
    } finally {
      setTransactionDetailLoading(false);
    }
  };

  const closeTransactionDetail = () => {
    setSelectedTransactionId(null);
    setTransactionDetail(null);
    setTransactionDetailError('');
  };

  const selectSimulationTarget = (target) => {
    setSelectedTargetBenefitPolicyId(target.benefitPolicyId);
    setSimTarget(String(target.targetPoints ?? ''));
    setSimulationResult(null);
    setSimulationError('');
  };

  const selectCustomSimulationTarget = (value) => {
    setSelectedTargetBenefitPolicyId(null);
    setSimTarget(value);
    setSimulationResult(null);
    setSimulationError('');
  };

  const toggleSimulationActivity = (mileagePolicyId) => {
    setSelectedActivities((current) => {
      const exists = current.some((item) => item.mileagePolicyId === mileagePolicyId);
      if (exists) {
        return current.filter((item) => item.mileagePolicyId !== mileagePolicyId);
      }
      return [...current, { mileagePolicyId, quantity: 1 }];
    });
    setSimulationResult(null);
    setSimulationError('');
  };

  const updateSimulationActivityQuantity = (mileagePolicyId, quantity) => {
    const nextQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
    setSelectedActivities((current) =>
      current.map((item) =>
        item.mileagePolicyId === mileagePolicyId ? { ...item, quantity: nextQuantity } : item,
      ),
    );
    setSimulationResult(null);
    setSimulationError('');
  };

  const runMileageSimulation = async () => {
    const hasBenefitTarget = selectedTargetBenefitPolicyId != null;
    const targetText = String(simTarget).trim();
    const [integerPart = '', decimalPart = ''] = targetText.split('.');
    const normalizedIntegerPart = integerPart.replace(/^0+(?=\d)/, '');
    const targetPoints = Number(targetText);
    const isValidTargetPoints =
      targetText !== '' &&
      targetText.split('.').length <= 2 &&
      /^\d+$/.test(integerPart) &&
      /^\d*$/.test(decimalPart) &&
      normalizedIntegerPart.length <= 10 &&
      decimalPart.length <= 2;

    if (
      !hasBenefitTarget &&
      (!isValidTargetPoints || !Number.isFinite(targetPoints) || targetPoints < 0)
    ) {
      setSimulationError('목표 점수는 0 이상이며 정수 10자리·소수 둘째 자리까지 입력해주세요.');
      return;
    }

    setSimulationLoading(true);
    setSimulationError('');

    try {
      const data = await simulateMileage({
        academicYear: DASHBOARD_PERIOD.academicYear,
        semesterCode: DASHBOARD_PERIOD.semesterCode,
        targetBenefitPolicyId: hasBenefitTarget ? selectedTargetBenefitPolicyId : null,
        targetPoints: hasBenefitTarget ? null : targetPoints,
        plannedActivities: selectedActivities,
      });
      setSimulationResult(data);
    } catch (error) {
      setSimulationError(error.message);
      setSimulationResult(null);
    } finally {
      setSimulationLoading(false);
    }
  };

  const hasDashboardData = Boolean(dashboardData);
  const currentScore = hasDashboardData
    ? Number(dashboardData.summary?.cumulativePoints ?? 0)
    : 0;
  const currentSemesterScore = hasDashboardData
    ? Number(dashboardData.summary?.currentSemesterPoints ?? 0)
    : 0;
  const semesterLabel = dashboardData?.period
    ? `${dashboardData.period.academicYear}-${dashboardData.period.semesterCode}학기`
    : '-';
  const competencyData = (dashboardData?.competencyBreakdown ?? []).map((item) => ({
    label: item.competencyName,
    value: Number(item.points ?? 0),
  }));
  const trendData = (dashboardData?.semesterTrend ?? []).map((item) => ({
    label: `${item.academicYear}-${item.semesterCode}`,
    value: Number(item.points ?? 0),
  }));
  const benefitProgress = dashboardData?.benefitProgress ?? [];
  const scholarshipBenefit = benefitProgress.find(
    (item) =>
      item.benefitName?.includes('우수') || item.benefitType?.toUpperCase().includes('SCHOLARSHIP'),
  );
  const scholarshipNeeded = scholarshipBenefit
    ? Number(scholarshipBenefit.shortagePoints ?? 0)
    : null;
  const scholarshipTarget = scholarshipBenefit ? Number(scholarshipBenefit.targetPoints ?? 0) : null;
  const currentGradeName = gradeData?.currentGrade?.gradeName;
  const nextGradeName = gradeData?.nextGrade?.gradeName;
  const pointsToNextGrade = Number(gradeData?.pointsToNextGrade ?? 0);
  const gradeSub = gradeLoading
    ? '등급을 불러오는 중'
    : gradeError
      ? '등급 조회 실패'
      : currentGradeName
        ? nextGradeName && pointsToNextGrade > 0
          ? `${currentGradeName} · ${nextGradeName}까지 ${formatPoints(pointsToNextGrade)}점`
          : `${currentGradeName} · 최고 등급`
        : nextGradeName
          ? `${nextGradeName}까지 ${formatPoints(pointsToNextGrade)}점`
          : '등급 기준 없음';
  const simulationTargets = simulationOptions?.targets ?? [];
  const simulationActivities = simulationOptions?.activities ?? [];
  const simulationResultShortage = Number(simulationResult?.shortagePoints ?? 0);
  const simulationResultActivities = simulationResult?.plannedActivities ?? [];
  const ledgerRows = ledgerData?.content ?? [];
  const ledgerTotalItems = ledgerData?.totalElements ?? 0;
  const ledgerTotalPages = Math.max(1, ledgerData?.totalPages ?? 1);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '마일리지' }]}
        title="마일리지"
        subtitle="핵심역량 활동 마일리지 현황과 인증·장학 기준을 확인하세요."
        accentColor={ACCENT}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onExternal}>
              외부활동 등록
            </Button>
            <Button
              size="sm"
              style={{ background: ACCENT }}
              onClick={() => toast('장학금 신청 화면으로 이동합니다.', 'info')}
            >
              장학금 신청
            </Button>
          </div>
        }
      />

      {dashboardLoading && (
        <div className="mb-4 rounded-[8px] border border-[#E5E7EB] bg-white px-4 py-3 text-[12px] text-[#656D76]">
          마일리지 정보를 불러오는 중입니다.
        </div>
      )}
      {dashboardError && !dashboardLoading && (
        <div className="mb-4 rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[12px] text-[#92400E]">
          실제 마일리지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-[#F3F4F6] rounded-[8px] p-1 mb-5 w-fit">
        {[
          ['dashboard', '마일리지 현황'],
          ['ledger', '적립 원장'],
          ['simulation', '인증·장학 시뮬레이션'],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`h-8 px-5 text-[13px] font-semibold rounded-[6px] transition-colors whitespace-nowrap ${tab === k ? 'bg-white text-[#1F2328] shadow-sm' : 'text-[#656D76] hover:text-[#1F2328]'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ① DASHBOARD TAB */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <div className="flex flex-col gap-5">
          {/* Stat tiles */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="relative">
              <StatTile
                label="누적 마일리지"
                value={
                  dashboardLoading ? '불러오는 중' : hasDashboardData ? `${formatPoints(currentScore)}점` : '-'
                }
                sub={gradeSub}
                accentColor={ACCENT}
              />
              {currentGradeName && !gradeLoading && !gradeError && (
                <span className="absolute right-4 top-4 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-black text-[#D97706]">
                  {currentGradeName}
                </span>
              )}
            </div>
            <StatTile
              label="이번 학기 적립"
              value={
                dashboardLoading
                  ? '불러오는 중'
                  : hasDashboardData
                    ? `${formatPoints(currentSemesterScore)}점`
                    : '-'
              }
              sub={semesterLabel}
              accentColor={ACCENT}
            />
            <StatTile
              label={scholarshipBenefit?.benefitName ?? '장학·인증 기준'}
              value={
                !hasDashboardData
                  ? '-'
                  : scholarshipBenefit == null
                    ? '기준 없음'
                    : scholarshipNeeded === 0
                      ? '달성'
                      : `${formatPoints(scholarshipNeeded)}점 부족`
              }
              sub={
                scholarshipTarget == null
                  ? '백엔드 기준 없음'
                  : `목표 ${formatPoints(scholarshipTarget)}점`
              }
              accentColor="#CF222E"
            />
          </div>

          {/* Mid row: criteria table + bar chart */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
            {/* Criteria table */}
            <div className="min-w-0 overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-[#D97706]" />
                <h2 className="text-[14px] font-bold text-[#1F2328]">마일리지 인증·장학 기준</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                    {['구분', '기준 점수', '혜택', '현재 상태'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benefitProgress.length > 0 ? (
                    benefitProgress.map((row) => {
                      const rowNeeded = Number(row.shortagePoints ?? 0);
                      const attainable = Boolean(row.canApply) || row.progressStatus === 'ELIGIBLE';
                      const statusLabel = attainable
                        ? '가능'
                        : BENEFIT_STATUS_LABELS[row.progressStatus] ??
                          `${formatPoints(rowNeeded)}점 부족`;

                      return (
                        <tr
                          key={row.benefitPolicyId}
                          className={`border-b border-[#F3F4F6] last:border-0 ${attainable ? 'bg-[#F0FDF4]' : ''}`}
                        >
                          <td className="px-4 py-3 font-semibold text-[#1F2328]">
                            {row.benefitName}
                          </td>
                          <td className="px-4 py-3 font-mono text-[#1F2328]">
                            {formatPoints(row.targetPoints)}점
                          </td>
                          <td className="px-4 py-3 text-[#656D76]">
                            {row.benefitAmount == null ? '-' : `${formatPoints(row.benefitAmount)}원`}
                          </td>
                          <td className="px-4 py-3">
                            {attainable ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#1A7F37]">
                                {statusLabel}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                                {statusLabel}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[12px] text-[#9AA0A6]">
                        {dashboardLoading
                          ? '기준을 불러오는 중입니다.'
                          : '등록된 인증·장학 기준이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
                </table>
              </div>
            </div>

            {/* Bar chart: competency distribution */}
            <div className="min-w-0 overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-[#D97706]" />
                <h2 className="text-[14px] font-bold text-[#1F2328]">역량별 적립 분포</h2>
                <span className="ml-auto text-[11px] text-[#9AA0A6]">단위: 점</span>
              </div>
              <div className="flex min-h-[188px] justify-center overflow-x-auto px-4 py-4">
                {competencyData.length > 0 ? (
                  <BarChart data={competencyData} color={ACCENT} height={140} unit="점" />
                ) : (
                  <div className="flex items-center text-[12px] text-[#9AA0A6]">
                    역량별 적립 내역이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Semester trend */}
          <div className="min-w-0 overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-[#D97706]" />
              <h2 className="text-[14px] font-bold text-[#1F2328]">학기별 적립 추이</h2>
              <span className="ml-auto text-[11px] text-[#9AA0A6]">단위: 점</span>
            </div>
            <div className="overflow-x-auto px-6 py-4">
              <div className="min-w-[560px]">
                <TrendChart data={trendData} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ② LEDGER TAB */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'ledger' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div>
              <p className="text-[13px] font-bold text-[#1F2328]">확정 적립 원장</p>
              <p className="text-[11px] text-[#9AA0A6] mt-0.5">
                백엔드에 저장된 POSTED 적립 거래를 최신순으로 조회합니다.
              </p>
            </div>
            <span className="ml-auto text-[12px] text-[#656D76]">
              총 {ledgerTotalItems.toLocaleString()}건
            </span>
          </div>

          {/* Ledger table */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                    {['적립일', '원천', '활동명', '거래 유형', '점수', '상태', '상세'].map((h) => (
                      <th
                        key={h}
                        className={`px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '활동명' ? 'text-left' : 'text-center'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[12px] text-[#656D76]">
                        적립 원장을 불러오는 중입니다.
                      </td>
                    </tr>
                  ) : ledgerError ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[12px] text-[#CF222E]">
                        적립 원장을 불러오지 못했습니다.
                      </td>
                    </tr>
                  ) : ledgerRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[12px] text-[#9AA0A6]">
                        확정된 적립 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    ledgerRows.map((row, i) => {
                      const points = Number(row.points ?? 0);
                      const sourceLabel = SOURCE_LABELS[row.sourceType] ?? row.sourceType ?? '-';
                      const transactionType =
                        TRANSACTION_TYPE_LABELS[row.transactionType] ?? row.transactionType ?? '-';
                      const statusLabel =
                        TRANSACTION_STATUS_LABELS[row.transactionStatus] ?? row.transactionStatus ?? '-';

                      return (
                        <tr
                          key={row.transactionId}
                          onClick={() => openTransactionDetail(row.transactionId)}
                          className={`cursor-pointer border-b border-[#F3F4F6] last:border-0 hover:bg-[#FFFBEB] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                        >
                          <td className="px-3 py-2.5 text-center text-[#9AA0A6] font-mono whitespace-nowrap">
                            {formatDate(row.occurredAt)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.sourceType === 'EXTRACURRICULAR_PROGRAM' ? 'bg-[#DBEAFE] text-[#0969DA]' : 'bg-[#F3E8FF] text-[#7C3AED]'}`}
                            >
                              {sourceLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-left font-semibold text-[#1F2328]">
                            {row.activityName ?? '-'}
                          </td>
                          <td className="px-3 py-2.5 text-center text-[#656D76]">{transactionType}</td>
                          <td className="px-3 py-2.5 text-center font-black text-[#1A7F37]">
                            {points > 0 ? '+' : ''}
                            {formatPoints(points)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#1A7F37]">
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                openTransactionDetail(row.transactionId);
                              }}
                            >
                              상세
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[#E5E7EB] flex items-center gap-3">
              <p className="text-[11px] text-[#9AA0A6]">
                ※ 백엔드의 확정(EARN·POSTED) 적립 거래 기준입니다. 행을 클릭하면 상세 정보를 확인할 수 있습니다.
              </p>
              {ledgerTotalItems > 0 && (
                <Pagination
                  page={page}
                  totalPages={ledgerTotalPages}
                  onChange={setPage}
                  totalItems={ledgerTotalItems}
                  pageSize={PAGE_SIZE}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ③ SIMULATION TAB */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'simulation' && (
        <div className="max-w-[760px] flex flex-col gap-5">
          {/* Simulation target */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-4 rounded-full bg-[#D97706]" />
              <h2 className="text-[14px] font-bold text-[#1F2328]">목표 점수 설정</h2>
            </div>
            {simulationOptionsLoading && (
              <div className="rounded-[8px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-5 text-center text-[12px] text-[#656D76]">
                시뮬레이션 선택지를 불러오는 중입니다.
              </div>
            )}
            {!simulationOptionsLoading && simulationOptionsError && (
              <div className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#CF222E]">
                시뮬레이션 선택지를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
              </div>
            )}
            {!simulationOptionsLoading && !simulationOptionsError && (
              <>
                <div className="mb-4">
                  <p className="mb-2 text-[12px] font-semibold text-[#656D76]">목표 기준</p>
                  <div className="flex flex-wrap gap-2">
                    {simulationTargets.map((target) => {
                      const selected = selectedTargetBenefitPolicyId === target.benefitPolicyId;
                      return (
                        <button
                          key={target.benefitPolicyId}
                          type="button"
                          onClick={() => selectSimulationTarget(target)}
                          className={`h-8 rounded-[20px] border px-3 text-[11px] font-bold transition-colors ${selected ? 'border-[#D97706] bg-[#FEF3C7] text-[#D97706]' : 'border-[#E5E7EB] text-[#656D76] hover:border-[#D97706] hover:text-[#D97706]'}`}
                        >
                          {target.benefitName ?? '목표 기준'} {formatPoints(target.targetPoints)}점
                        </button>
                      );
                    })}
                    {simulationTargets.length === 0 && (
                      <span className="text-[12px] text-[#9AA0A6]">
                        등록된 목표 기준이 없습니다.
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-4">
                  <span className="w-24 flex-shrink-0 text-[13px] text-[#656D76]">목표 점수</span>
                  <input
                    type="number"
                    min="0"
                    value={simTarget}
                    onChange={(event) => selectCustomSimulationTarget(event.target.value)}
                    className="h-9 w-28 rounded-[6px] border-2 border-[#D97706] px-2 text-center text-[14px] font-black text-[#D97706] focus:outline-none"
                  />
                  <span className="text-[13px] text-[#656D76]">점</span>
                  {selectedTargetBenefitPolicyId == null && (
                    <span className="text-[11px] text-[#9AA0A6]">직접 입력 목표</span>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    style={{ background: ACCENT }}
                    loading={simulationLoading}
                    disabled={simulationOptions == null}
                    onClick={runMileageSimulation}
                  >
                    시뮬레이션 실행
                  </Button>
                </div>
              </>
            )}
          </div>

          {simulationError && (
            <div className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#CF222E]">
              {simulationError}
            </div>
          )}

          {!simulationOptionsLoading && !simulationOptionsError && simulationOptions && (
            <div>
              <h3 className="mb-3 text-[13px] font-bold text-[#1F2328]">계획 활동 선택</h3>
              {simulationActivities.length === 0 ? (
                <div className="rounded-[8px] border border-[#E5E7EB] bg-white px-4 py-8 text-center text-[12px] text-[#9AA0A6]">
                  선택 가능한 활동이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {simulationActivities.map((activity) => {
                    const selectedActivity = selectedActivities.find(
                      (item) => item.mileagePolicyId === activity.mileagePolicyId,
                    );
                    const selected = selectedActivity != null;
                    return (
                      <div
                        key={activity.mileagePolicyId}
                        className={`flex flex-col gap-3 rounded-[8px] border bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] ${selected ? 'border-[#D97706]' : 'border-[#E5E7EB]'}`}
                      >
                        <div>
                          <p className="mb-1 text-[13px] font-bold text-[#1F2328]">
                            {activity.activityName ?? activity.activityCode ?? '마일리지 활동'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-black text-[#D97706]">
                              +{formatPoints(activity.points)}점
                            </span>
                            {activity.maximumPoints != null && (
                              <span className="text-[10px] text-[#9AA0A6]">
                                최대 {formatPoints(activity.maximumPoints)}점
                              </span>
                            )}
                          </div>
                        </div>
                        {selected && (
                          <label className="flex items-center gap-2 text-[11px] text-[#656D76]">
                            수량
                            <input
                              type="number"
                              min="1"
                              value={selectedActivity.quantity}
                              onChange={(event) =>
                                updateSimulationActivityQuantity(
                                  activity.mileagePolicyId,
                                  event.target.value,
                                )
                              }
                              className="h-7 w-16 rounded-[6px] border border-[#E5E7EB] px-2 text-center text-[12px] text-[#1F2328] focus:border-[#D97706] focus:outline-none"
                            />
                          </label>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleSimulationActivity(activity.mileagePolicyId)}
                          className="h-8 rounded-[6px] text-[12px] font-bold text-white transition-colors"
                          style={{ background: selected ? '#656D76' : ACCENT }}
                        >
                          {selected ? '선택 해제' : '활동 선택'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {simulationResult && (
            <div className="rounded-[8px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-[#D97706]" />
                <h3 className="text-[14px] font-bold text-[#1F2328]">시뮬레이션 결과</h3>
                <span
                  className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-black ${simulationResult.achieved ? 'bg-[#DCFCE7] text-[#1A7F37]' : 'bg-[#FEF2F2] text-[#CF222E]'}`}
                >
                  {simulationResult.achieved ? '목표 달성' : '목표 미달성'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ['현재 마일리지', simulationResult.currentPoints],
                  ['계획 활동 점수', simulationResult.plannedPoints],
                  ['예상 마일리지', simulationResult.projectedPoints],
                  ['부족 점수', simulationResultShortage],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[8px] bg-[#F9FAFB] p-3">
                    <p className="text-[11px] text-[#9AA0A6]">{label}</p>
                    <p className="mt-1 text-[16px] font-black text-[#D97706]">
                      {formatPoints(value)}점
                    </p>
                  </div>
                ))}
              </div>
              {simulationResult.target && (
                <p className="mt-4 text-[12px] text-[#656D76]">
                  목표 기준: {simulationResult.target.benefitName ?? '직접 입력 목표'}{' '}
                  {formatPoints(simulationResult.target.targetPoints)}점
                </p>
              )}
              {simulationResultActivities.length > 0 && (
                <div className="mt-4 border-t border-[#F3F4F6] pt-4">
                  <p className="mb-2 text-[12px] font-bold text-[#1F2328]">반영된 계획 활동</p>
                  <div className="flex flex-col gap-2">
                    {simulationResultActivities.map((plannedActivity) => {
                      const activity = simulationActivities.find(
                        (item) => item.mileagePolicyId === plannedActivity.mileagePolicyId,
                      );
                      return (
                        <div
                          key={plannedActivity.mileagePolicyId}
                          className="flex items-center justify-between text-[12px]"
                        >
                          <span className="text-[#656D76]">
                            {activity?.activityName ?? `정책 #${plannedActivity.mileagePolicyId}`}
                          </span>
                          <span className="font-semibold text-[#1F2328]">
                            {plannedActivity.quantity}개
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-4 py-3">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="#9AA0A6"
              className="flex-shrink-0 mt-0.5"
            >
              <circle cx="8" cy="8" r="7" />
              <path d="M8 4v5M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-[12px] text-[#9AA0A6] leading-snug">
              시뮬레이션 결과는 참고값이며 실제 지급을 보장하지 않습니다. 장학금 지급 기준 및 세부
              사항은 매 학기 장학 공지를 확인하시기 바랍니다.
            </p>
          </div>
        </div>
      )}

      <Drawer
        open={selectedTransactionId != null}
        onClose={closeTransactionDetail}
        title="적립 내역 상세"
      >
        {transactionDetailLoading && (
          <div className="py-10 text-center text-[12px] text-[#656D76]">
            상세 정보를 불러오는 중입니다.
          </div>
        )}
        {!transactionDetailLoading && transactionDetailError && (
          <div className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#CF222E]">
            적립 내역 상세를 불러오지 못했습니다.
          </div>
        )}
        {!transactionDetailLoading && !transactionDetailError && transactionDetail && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 rounded-[8px] bg-[#F9FAFB] p-4 text-[12px]">
              <div>
                <p className="text-[#9AA0A6]">거래 번호</p>
                <p className="mt-1 font-bold text-[#1F2328]">#{transactionDetail.transactionId}</p>
              </div>
              <div>
                <p className="text-[#9AA0A6]">원천</p>
                <p className="mt-1 font-bold text-[#1F2328]">
                  {SOURCE_LABELS[transactionDetail.sourceType] ?? transactionDetail.sourceType ?? '-'}
                </p>
              </div>
              <div>
                <p className="text-[#9AA0A6]">적립 점수</p>
                <p className="mt-1 font-black text-[#D97706]">
                  +{formatPoints(transactionDetail.points)}점
                </p>
              </div>
              <div>
                <p className="text-[#9AA0A6]">처리일</p>
                <p className="mt-1 font-bold text-[#1F2328]">
                  {formatDateTime(transactionDetail.occurredAt)}
                </p>
              </div>
            </div>

            <section>
              <h3 className="mb-2 text-[13px] font-bold text-[#1F2328]">적립 정보</h3>
              <div className="flex flex-col gap-2 rounded-[8px] border border-[#E5E7EB] p-4 text-[12px]">
                <div className="flex justify-between gap-3">
                  <span className="text-[#9AA0A6]">활동명</span>
                  <span className="text-right font-semibold text-[#1F2328]">
                    {transactionDetail.policy?.activityName ?? '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#9AA0A6]">거래 상태</span>
                  <span className="font-semibold text-[#1F2328]">
                    {TRANSACTION_STATUS_LABELS[transactionDetail.transactionStatus] ??
                      transactionDetail.transactionStatus ??
                      '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#9AA0A6]">적립 사유</span>
                  <span className="text-right font-semibold text-[#1F2328]">
                    {transactionDetail.transactionReason ?? '-'}
                  </span>
                </div>
              </div>
            </section>

            {transactionDetail.policy && (
              <section>
                <h3 className="mb-2 text-[13px] font-bold text-[#1F2328]">적용 정책</h3>
                <div className="flex flex-col gap-2 rounded-[8px] border border-[#E5E7EB] p-4 text-[12px]">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">활동 코드</span>
                    <span className="font-mono text-[#1F2328]">{transactionDetail.policy.activityCode ?? '-'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">분류</span>
                    <span className="text-[#1F2328]">{transactionDetail.policy.categoryCode ?? '-'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">적용 학기</span>
                    <span className="text-[#1F2328]">
                      {transactionDetail.policy.academicYear ?? '-'}-{transactionDetail.policy.semesterCode ?? '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">정책 점수</span>
                    <span className="font-semibold text-[#D97706]">
                      {formatPoints(transactionDetail.policy.policyPoints)}점
                    </span>
                  </div>
                </div>
              </section>
            )}

            {transactionDetail.extracurricularProgram && (
              <section>
                <h3 className="mb-2 text-[13px] font-bold text-[#1F2328]">비교과 출처</h3>
                <div className="flex flex-col gap-2 rounded-[8px] border border-[#E5E7EB] p-4 text-[12px]">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">프로그램명</span>
                    <span className="text-right font-semibold text-[#1F2328]">
                      {transactionDetail.extracurricularProgram.programName ?? '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">이수 상태</span>
                    <span className="font-semibold text-[#1F2328]">
                      {transactionDetail.extracurricularProgram.completionStatus ?? '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">수료증 번호</span>
                    <span className="font-mono text-[#1F2328]">
                      {transactionDetail.extracurricularProgram.certificateNo ?? '-'}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {transactionDetail.externalActivity && (
              <section>
                <h3 className="mb-2 text-[13px] font-bold text-[#1F2328]">외부활동 출처</h3>
                <div className="flex flex-col gap-2 rounded-[8px] border border-[#E5E7EB] p-4 text-[12px]">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">활동명</span>
                    <span className="text-right font-semibold text-[#1F2328]">
                      {transactionDetail.externalActivity.activityName ?? '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">활동일</span>
                    <span className="text-[#1F2328]">
                      {formatDate(transactionDetail.externalActivity.activityDate)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">신청 상태</span>
                    <span className="font-semibold text-[#1F2328]">
                      {transactionDetail.externalActivity.claimStatus ?? '-'}
                    </span>
                  </div>
                  {transactionDetail.externalActivity.reviewReason && (
                    <div className="flex justify-between gap-3">
                      <span className="text-[#9AA0A6]">심사 의견</span>
                      <span className="text-right text-[#1F2328]">
                        {transactionDetail.externalActivity.reviewReason}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
