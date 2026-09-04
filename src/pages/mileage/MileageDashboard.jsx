import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { fetchCurrentMileagePeriod } from '@/api/mileage';
import { formatSemester as formatSemesterCode } from '@/utils/academicPeriod';
import ScholarshipTab from './ScholarshipTab';
import ExternalActivity from './ExternalActivity';
import { PageHeader, StatTile, Button, BarChart, Pagination, Drawer } from '@/components/common';

const ACCENT = '#D97706';

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

const formatPoints = (value) => Number(value ?? 0).toLocaleString('ko-KR');
const formatSemester = (semesterCode) => formatSemesterCode(semesterCode, { emptyLabel: '-' });
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

  const rawMax = Math.max(0, ...chartData.map((d) => Number(d.value) || 0));
  const max = rawMax > 0 ? rawMax : 50;
  const pointDenominator = Math.max(chartData.length - 1, 1);
  const isSinglePoint = chartData.length === 1;
  const pts = chartData.map((d, i) => ({
    x: isSinglePoint ? PAD.l + 24 : PAD.l + (i / pointDenominator) * cW,
    y: PAD.t + cH - (d.value / max) * cH * 0.88,
    d,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length - 1].x},${PAD.t + cH} L${pts[0].x},${PAD.t + cH} Z`;

  // SVG 좌표(x, y)를 컨테이너 기준 % 위치로 변환 — 그래픽(선/점/그리드)은 SVG로 폭에 맞춰 스케일되지만,
  // 텍스트는 HTML로 겹쳐 그려서 카드 폭이 넓어져도 글씨 크기가 함께 커지지 않도록 분리한다.
  const toPct = (x, y) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

  return (
    <div className="relative w-full" style={{ paddingTop: `${(H / W) * 100}%` }}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
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
        {[0.2, 0.4, 0.6, 0.8, 1].map((r) => (
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
      </svg>
      {/* Y labels */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
        <span
          key={r}
          className="absolute -translate-x-full -translate-y-1/2 text-[14px] text-[#9AA0A6]"
          style={toPct(PAD.l - 4, PAD.t + cH - cH * r * 0.88)}
        >
          {Math.round(max * r)}
        </span>
      ))}
      {/* Points + point value + x-axis labels */}
      {pts.map((p, i) => (
        <span key={`${p.d.label}-${i}`}>
          <span
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
            style={{ ...toPct(p.x, p.y), background: ACCENT }}
          />
          <span
            className="absolute -translate-x-full -translate-y-1/2 text-[13px] font-bold"
            style={{ ...toPct(p.x - 8, p.y), color: ACCENT }}
          >
            {p.d.value}
          </span>
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[14px] text-[#656D76]"
            style={toPct(p.x, PAD.t + cH + 14)}
          >
            {p.d.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function MileageDashboard() {
  const [tab, setTab] = useState('dashboard');
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

  const [period, setPeriod] = useState(null);

  const loadPeriod = useCallback(() => {
    setDashboardLoading(true);
    setDashboardError('');
    setGradeLoading(true);
    setGradeError('');

    return fetchCurrentMileagePeriod()
      .then((data) => {
        setPeriod(data);
      })
      .catch((error) => {
        setDashboardError(error.message);
        setDashboardLoading(false);
        setGradeError(error.message);
        setGradeLoading(false);
      });
  }, []);

  useEffect(() => {
    loadPeriod();
  }, [loadPeriod]);

  useEffect(() => {
    if (!period) return undefined;
    let mounted = true;

    apiClient
      .get('/students/mileage/dashboard', {
        params: { semesterCode: period.semesterCode },
      })
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
  }, [period]);

  useEffect(() => {
    if (!period) return undefined;
    let mounted = true;

    apiClient
      .get('/students/mileage/grade', {
        params: { semesterCode: period.semesterCode },
      })
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
  }, [period]);

  useEffect(() => {
    if (tab !== 'ledger') return undefined;

    let mounted = true;
    setLedgerLoading(true);
    setLedgerError('');

    apiClient
      .get('/students/mileage/transactions', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
        },
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

  const hasDashboardData = Boolean(dashboardData);
  const currentScore = hasDashboardData ? Number(dashboardData.summary?.cumulativePoints ?? 0) : 0;
  const currentSemesterScore = hasDashboardData
    ? Number(dashboardData.summary?.currentSemesterPoints ?? 0)
    : 0;
  const currentPeriod = dashboardData?.period ?? period;
  const semesterLabel = currentPeriod ? formatSemester(currentPeriod.semesterCode) : '-';
  const shortenCompetencyLabel = (name) => (name ?? '').replace(/역량$/, '').trim() || name || '';
  const competencyData = (dashboardData?.competencyBreakdown ?? []).map((item) => ({
    label: shortenCompetencyLabel(item.competencyName),
    value: Number(item.points ?? 0),
  }));
  const trendData = (dashboardData?.semesterTrend ?? []).map((item) => ({
    label: formatSemester(item.semesterCode),
    value: Number(item.points ?? 0),
  }));
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
  const ledgerRows = ledgerData?.content ?? [];
  const ledgerTotalItems = ledgerData?.totalElements ?? 0;
  const ledgerTotalPages = Math.max(1, ledgerData?.totalPages ?? 1);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '마일리지' }]}
        title="마일리지"
        subtitle="핵심역량 활동 마일리지 현황을 확인하세요."
        accentColor={ACCENT}
      />

      {dashboardLoading && (
        <div className="mb-4 rounded-[8px] border border-[#E5E7EB] bg-white px-4 py-3 text-[12px] text-[#656D76]">
          마일리지 정보를 불러오는 중입니다.
        </div>
      )}
      {dashboardError && !dashboardLoading && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[12px] text-[#92400E]">
          <span>실제 마일리지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</span>
          <Button size="sm" variant="outline" onClick={loadPeriod}>
            다시 시도
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-[#F3F4F6] rounded-[8px] p-1 mb-5 w-fit">
        {[
          ['dashboard', '마일리지 현황'],
          ['ledger', '적립 원장'],
          ['scholarship', '장학금 신청'],
          ['external', '외부활동 등록'],
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative">
              <StatTile
                label="누적 마일리지"
                value={
                  dashboardLoading
                    ? '불러오는 중'
                    : hasDashboardData
                      ? `${formatPoints(currentScore)}점`
                      : '-'
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
          </div>

          {/* Mid row: semester trend + competency bar chart */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
            {/* Semester trend */}
            <div className="min-w-0 overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-[#D97706]" />
                <h2 className="text-[14px] font-bold text-[#1F2328]">학기별 적립 추이</h2>
                <span className="ml-auto text-[12px] font-medium text-[#656D76]">단위: 점</span>
              </div>
              <div className="overflow-x-auto px-6 py-4">
                <div className="w-full min-w-[560px]">
                  <TrendChart data={trendData} />
                </div>
              </div>
            </div>

            {/* Bar chart: competency distribution */}
            <div className="min-w-0 overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-[#D97706]" />
                <h2 className="text-[14px] font-bold text-[#1F2328]">역량별 적립 분포</h2>
                <span className="ml-auto text-[12px] font-medium text-[#656D76]">단위: 점</span>
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
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ② LEDGER TAB */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'ledger' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div>
              <p className="text-[13px] font-bold text-[#1F2328]">적립 내역</p>
              <p className="text-[13px] text-[#9AA0A6] mt-0.5">
                확정된 적립 내역을 최신순으로 보여드립니다.
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
                        TRANSACTION_STATUS_LABELS[row.transactionStatus] ??
                        row.transactionStatus ??
                        '-';

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
                          <td className="px-3 py-2.5 text-center text-[#656D76]">
                            {transactionType}
                          </td>
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
              <p className="text-[13px] text-[#9AA0A6]">
                ※ 확정된 적립 내역만 표시됩니다. 행을 클릭하면 상세 정보를 확인할 수 있습니다.
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

      {tab === 'scholarship' && (
        <ScholarshipTab currentPoints={hasDashboardData ? currentScore : null} />
      )}

      {tab === 'external' && <ExternalActivity embedded onBack={() => setTab('dashboard')} />}

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
                  {SOURCE_LABELS[transactionDetail.sourceType] ??
                    transactionDetail.sourceType ??
                    '-'}
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
                    <span className="font-mono text-[#1F2328]">
                      {transactionDetail.policy.activityCode ?? '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">분류</span>
                    <span className="text-[#1F2328]">
                      {transactionDetail.policy.categoryCode ?? '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#9AA0A6]">적용 학기</span>
                    <span className="text-[#1F2328]">
                      {formatSemester(transactionDetail.policy.semesterCode)}
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
