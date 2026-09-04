import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/api/client';
import { fetchCurrentMileagePeriod } from '@/api/mileage';
import {
  Button,
  EmptyState,
  Modal,
  Pagination,
  StatTile,
  toast,
} from '@/components/common';
import { formatSemester } from '@/utils/academicPeriod';

const ACCENT = '#D97706';
const HISTORY_PAGE_SIZE = 10;

const APPLICATION_STATUS_LABELS = {
  APPLIED: '신청 접수',
  APPROVED: '지급 승인',
  REJECTED: '반려',
  CANCELLED: '취소',
};

const ELIGIBILITY_STATUS_LABELS = {
  ELIGIBLE: '신청 가능',
  INSUFFICIENT_POINTS: '점수 미달',
  APPLICATION_NOT_OPEN: '신청 전',
  APPLICATION_CLOSED: '신청 마감',
};

const STATUS_STYLES = {
  ELIGIBLE: { background: '#FEF3C7', color: '#B45309' },
  INSUFFICIENT_POINTS: { background: '#F3F4F6', color: '#6B7280' },
  APPLICATION_NOT_OPEN: { background: '#DBEAFE', color: '#1D4ED8' },
  APPLICATION_CLOSED: { background: '#F3F4F6', color: '#6B7280' },
  APPLIED: { background: '#DBEAFE', color: '#1D4ED8' },
  APPROVED: { background: '#D1FAE5', color: '#047857' },
  REJECTED: { background: '#FEE2E2', color: '#B91C1C' },
  CANCELLED: { background: '#E5E7EB', color: '#6B7280' },
};

const formatPoints = (value) => {
  if (value == null || value === '') return '-';
  const points = Number(value);
  return Number.isFinite(points)
    ? `${points.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}점`
    : `${value}점`;
};

const formatAmount = (value) => {
  if (value == null || value === '') return '별도 지급액 없음';
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${amount.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`
    : String(value);
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPeriod = (semesterCode) =>
  formatSemester(semesterCode, { allLabel: '연간', emptyLabel: '연간' });

const isSemesterBenefit = (item) => item.semesterCode != null && item.semesterCode !== 'ALL';
const isCumulativeBenefit = (item) => Number(item.cumulativeYears ?? 1) >= 2;
const isAnnualBenefit = (item) => !isSemesterBenefit(item) && !isCumulativeBenefit(item);

const getDisabledReason = (item, { period }) => {
  if (isCumulativeBenefit(item)) {
    return null;
  }
  if (isAnnualBenefit(item)) {
    return period?.semesterCode === 'FALL' ? null : '2학기에만 신청할 수 있는 장학금입니다.';
  }
  return null;
};

const getStatusLabel = (item) => {
  const status = item.applicationStatus ?? item.eligibilityStatus;
  return APPLICATION_STATUS_LABELS[status]
    ?? ELIGIBILITY_STATUS_LABELS[status]
    ?? status
    ?? '상태 확인 필요';
};

const getStatusStyle = (item) => {
  const status = item.applicationStatus ?? item.eligibilityStatus;
  return STATUS_STYLES[status] ?? STATUS_STYLES.INSUFFICIENT_POINTS;
};

const getCriteriaEntries = (criteriaData) => {
  if (criteriaData == null) return [];
  if (Array.isArray(criteriaData)) {
    return criteriaData.map((value, index) => [String(index + 1), value]);
  }
  if (typeof criteriaData === 'object') return Object.entries(criteriaData);
  return [['기준', criteriaData]];
};

const formatCriteriaValue = (value) => {
  if (value == null || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function StatusChip({ item }) {
  const style = getStatusStyle(item);
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black"
      style={style}
    >
      {getStatusLabel(item)}
    </span>
  );
}

function CriteriaList({ criteriaData }) {
  const entries = getCriteriaEntries(criteriaData);
  if (entries.length === 0) {
    return <p className="text-[12px] text-[#9AA0A6]">등록된 세부 기준이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-[#F3F4F6] rounded-[8px] border border-[#E5E7EB]">
      {entries.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4 px-3 py-2.5 text-[12px]">
          <span className="shrink-0 text-[#9AA0A6]">{label}</span>
          <span className="text-right font-semibold text-[#1F2328]">
            {formatCriteriaValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScholarshipCard({ item, onSelect, disabledReason }) {
  const minimumPoints = Number(item.minimumPoints ?? 0);
  const currentPoints = Number(item.currentPoints ?? 0);
  const progress = minimumPoints > 0
    ? Math.min(100, Math.max(0, (currentPoints / minimumPoints) * 100))
    : 100;
  const shortagePoints = Number(item.shortagePoints ?? Math.max(0, minimumPoints - currentPoints));
  const isDisabled = Boolean(disabledReason);

  return (
    <article
      className={`flex min-w-0 flex-col gap-4 rounded-[8px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] ${isDisabled ? 'opacity-60 grayscale' : ''}`}
      title={disabledReason ?? undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold text-[#9AA0A6]">
            {formatPeriod(item.semesterCode)}
          </p>
          <h3 className="truncate text-[15px] font-black text-[#1F2328]" title={item.benefitName}>
            {item.benefitName ?? '장학금 기준'}
          </h3>
        </div>
        <StatusChip item={item} />
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-[8px] bg-[#F9FAFB] p-3 text-[12px]">
        <div>
          <p className="text-[#9AA0A6]">지급액</p>
          <p className="mt-1 font-black text-[#D97706]">{formatAmount(item.benefitAmount)}</p>
        </div>
        <div>
          <p className="text-[#9AA0A6]">최소 기준</p>
          <p className="mt-1 font-black text-[#1F2328]">{formatPoints(item.minimumPoints)}</p>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="text-[#656D76]">현재 {formatPoints(item.currentPoints)}</span>
          <span className={shortagePoints > 0 ? 'font-bold text-[#CF222E]' : 'font-bold text-[#047857]'}>
            {shortagePoints > 0 ? `${formatPoints(shortagePoints)} 부족` : '기준 달성'}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: shortagePoints > 0 ? ACCENT : '#059669' }}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-[#F3F4F6] pt-3">
        <Button
          size="sm"
          variant={item.canApply && !isDisabled ? 'primary' : 'outline'}
          style={item.canApply && !isDisabled ? { background: ACCENT } : undefined}
          onClick={() => onSelect(item)}
        >
          {item.canApply && !isDisabled ? '신청하기' : '상세 보기'}
        </Button>
      </div>
    </article>
  );
}

/**
 * 학생 장학금 탭.
 *
 * 백엔드 계약:
 * - GET /students/mileage/scholarships?semesterCode=
 * - GET /students/mileage/scholarships/applications
 * - POST /students/mileage/scholarships/{benefitPolicyId}/applications
 *
 * @param {Object} props
 * @param {number|null} [props.currentPoints] 마일리지 대시보드에서 이미 조회한 현재 점수
 */
export default function ScholarshipTab({ currentPoints = null }) {
  const [scholarships, setScholarships] = useState([]);
  const [scholarshipsLoading, setScholarshipsLoading] = useState(true);
  const [scholarshipsError, setScholarshipsError] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [period, setPeriod] = useState(null);

  const loadPeriod = useCallback(async () => {
    setScholarshipsError('');
    try {
      const data = await fetchCurrentMileagePeriod();
      setPeriod(data);
    } catch (error) {
      setScholarshipsError(error.message ?? '학기 정보를 불러오지 못했습니다.');
      setScholarshipsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeriod();
  }, [loadPeriod]);

  const loadScholarships = useCallback(async () => {
    if (!period) return;
    setScholarshipsLoading(true);
    setScholarshipsError('');
    try {
      const { data } = await apiClient.get('/students/mileage/scholarships', {
        params: { semesterCode: period.semesterCode },
      });
      setScholarships(Array.isArray(data) ? data : data?.content ?? []);
    } catch (error) {
      setScholarshipsError(error.message ?? '장학금 기준을 불러오지 못했습니다.');
      setScholarships([]);
    } finally {
      setScholarshipsLoading(false);
    }
  }, [period]);

  const loadHistory = useCallback(async (page) => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const { data } = await apiClient.get('/students/mileage/scholarships/applications', {
        params: {
          page: page - 1,
          size: HISTORY_PAGE_SIZE,
          sort: 'appliedAt,desc',
        },
      });
      setHistoryData(data ?? { content: [], totalElements: 0, totalPages: 0 });
    } catch (error) {
      setHistoryError(error.message ?? '장학금 신청 이력을 불러오지 못했습니다.');
      setHistoryData({ content: [], totalElements: 0, totalPages: 0 });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScholarships();
  }, [loadScholarships]);

  useEffect(() => {
    loadHistory(historyPage);
  }, [historyPage, loadHistory]);

  const handleApply = async () => {
    const benefitPolicyId = selectedScholarship?.benefitPolicyId;
    if (benefitPolicyId == null || applyingId != null) return;

    setApplyingId(benefitPolicyId);
    try {
      await apiClient.post(`/students/mileage/scholarships/${benefitPolicyId}/applications`);
      toast('장학금 신청이 접수되었습니다.', 'success');
      setSelectedScholarship(null);
      await Promise.allSettled([loadScholarships(), loadHistory(historyPage)]);
    } catch (error) {
      toast(error.message ?? '장학금 신청에 실패했습니다.', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const summary = useMemo(() => {
    const firstPoints = scholarships[0]?.currentPoints;
    const eligibleCount = scholarships.filter(
      (item) => item.canApply && !getDisabledReason(item, { period }),
    ).length;
    const appliedCount = scholarships.filter((item) => item.applicationStatus != null).length;
    return {
      points: firstPoints ?? currentPoints,
      eligibleCount,
      appliedCount,
    };
  }, [currentPoints, period, scholarships]);

  const historyRows = historyData?.content ?? [];
  const historyTotalPages = Math.max(1, historyData?.totalPages ?? 1);
  const selectedDisabledReason = selectedScholarship
    ? getDisabledReason(selectedScholarship, { period })
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-black text-[#1F2328]">장학금 신청</h2>
          <p className="mt-1 text-[12px] text-[#9AA0A6]">
            {period ? `${formatPeriod(period.semesterCode)} ` : ''}
            장학금 기준과 신청 현황을 확인하세요.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            loadScholarships();
            loadHistory(historyPage);
          }}
          loading={scholarshipsLoading || historyLoading}
        >
          새로고침
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatTile
          label="현재 마일리지"
          value={summary.points == null ? '-' : formatPoints(summary.points)}
          sub="장학금 산정 기준 점수"
          accentColor={ACCENT}
        />
        <StatTile
          label="신청 가능 장학금"
          value={`${summary.eligibleCount}건`}
          sub="현재 학기 기준"
          accentColor="#059669"
        />
        <StatTile
          label="현재 학기 신청"
          value={`${summary.appliedCount}건`}
          sub="기준별 신청 상태"
          accentColor="#2563EB"
        />
      </div>

      {scholarshipsError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#CF222E]">
          <span>{scholarshipsError}</span>
          <Button size="sm" variant="outline" onClick={loadPeriod}>
            다시 시도
          </Button>
        </div>
      )}

      <section className="overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full" style={{ background: ACCENT }} />
            <h3 className="text-[14px] font-bold text-[#1F2328]">장학금 기준</h3>
            <span className="text-[11px] font-normal text-[#9AA0A6]">
              학기, 연간, 4년 누적 장학금은 각각 2개의 선택지 중 하나만 신청 가능
            </span>
          </div>
          <span className="text-[11px] text-[#9AA0A6]">총 {scholarships.length}건</span>
        </div>
        <div className="p-5">
          {scholarshipsLoading ? (
            <div className="py-10 text-center text-[12px] text-[#656D76]">
              장학금 기준을 불러오는 중입니다.
            </div>
          ) : scholarships.length === 0 ? (
            <EmptyState
              message="현재 학기에 등록된 장학금 기준이 없습니다."
              sub="교직원이 장학금 정책을 등록하면 이곳에서 확인할 수 있습니다."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {scholarships.map((item) => (
                  <ScholarshipCard
                    key={item.benefitPolicyId}
                    item={item}
                    onSelect={setSelectedScholarship}
                    disabledReason={getDisabledReason(item, { period })}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[#2563EB]" />
            <h3 className="text-[14px] font-bold text-[#1F2328]">나의 장학금 신청 이력</h3>
          </div>
          <span className="text-[11px] text-[#9AA0A6]">
            총 {Number(historyData?.totalElements ?? 0).toLocaleString('ko-KR')}건
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F6F8FA]">
                {['신청일', '장학금명', '적용 학기', '신청 당시 점수', '지급액', '상태', '처리일', '처리 사유'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-semibold text-[#656D76]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[12px] text-[#656D76]">
                    신청 이력을 불러오는 중입니다.
                  </td>
                </tr>
              ) : historyError ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[12px] text-[#CF222E]">
                    {historyError}
                  </td>
                </tr>
              ) : historyRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState message="장학금 신청 이력이 없습니다." />
                  </td>
                </tr>
              ) : (
                historyRows.map((row, index) => (
                  <tr key={row.benefitApplicationId} className={`border-b border-[#F3F4F6] last:border-0 ${index % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[#656D76]">{formatDateTime(row.appliedAt)}</td>
                    <td className="px-3 py-3 text-left font-semibold text-[#1F2328]">{row.benefitName ?? '-'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[#656D76]">{formatPeriod(row.semesterCode)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-center font-bold text-[#D97706]">{formatPoints(row.pointsSnapshot)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-center font-semibold text-[#1F2328]">{formatAmount(row.benefitAmount)}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black"
                        style={STATUS_STYLES[row.applicationStatus] ?? STATUS_STYLES.INSUFFICIENT_POINTS}
                      >
                        {APPLICATION_STATUS_LABELS[row.applicationStatus] ?? row.applicationStatus ?? '-'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[#656D76]">{formatDateTime(row.processedAt)}</td>
                    <td className="max-w-[220px] px-3 py-3 text-left text-[#656D76]">{row.decisionReason ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {historyData?.totalElements > 0 && (
          <div className="border-t border-[#E5E7EB] px-4 py-2">
            <Pagination
              page={historyPage}
              totalPages={historyTotalPages}
              onChange={setHistoryPage}
              totalItems={historyData.totalElements}
              pageSize={HISTORY_PAGE_SIZE}
            />
          </div>
        )}
      </section>

      <div className="rounded-[8px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[11px] leading-relaxed text-[#656D76]">
        장학금 지급 여부는 신청 당시 점수와 학교의 최종 심사 결과에 따라 결정됩니다.
      </div>

      <Modal
        open={selectedScholarship != null}
        onClose={() => applyingId == null && setSelectedScholarship(null)}
        title={selectedScholarship?.benefitName ?? '장학금 상세'}
        size="lg"
        footer={(
          <>
            <Button
              variant="outline"
              onClick={() => setSelectedScholarship(null)}
              disabled={applyingId != null}
            >
              닫기
            </Button>
            {selectedScholarship?.canApply && !selectedDisabledReason && (
              <Button
                style={{ background: ACCENT }}
                onClick={handleApply}
                loading={applyingId === selectedScholarship.benefitPolicyId}
              >
                장학금 신청
              </Button>
            )}
          </>
        )}
      >
        {selectedScholarship && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3 rounded-[8px] bg-[#FFFBEB] p-4">
              <div>
                <p className="text-[11px] text-[#92400E]">
                  {formatPeriod(selectedScholarship.semesterCode)}
                </p>
                <p className="mt-1 text-[20px] font-black text-[#B45309]">
                  {formatAmount(selectedScholarship.benefitAmount)}
                </p>
              </div>
              <StatusChip item={selectedScholarship} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px] md:grid-cols-4">
              <div>
                <p className="text-[#9AA0A6]">현재 점수</p>
                <p className="mt-1 font-bold text-[#1F2328]">{formatPoints(selectedScholarship.currentPoints)}</p>
              </div>
              <div>
                <p className="text-[#9AA0A6]">최소 기준</p>
                <p className="mt-1 font-bold text-[#1F2328]">{formatPoints(selectedScholarship.minimumPoints)}</p>
              </div>
              <div>
                <p className="text-[#9AA0A6]">부족 점수</p>
                <p className="mt-1 font-bold text-[#CF222E]">{formatPoints(selectedScholarship.shortagePoints)}</p>
              </div>
              <div>
                <p className="text-[#9AA0A6]">신청 상태</p>
                <p className="mt-1 font-bold text-[#1F2328]">{getStatusLabel(selectedScholarship)}</p>
              </div>
            </div>

            <section>
              <h4 className="mb-2 text-[12px] font-bold text-[#1F2328]">세부 지급 기준</h4>
              <CriteriaList criteriaData={selectedScholarship.criteriaData} />
            </section>

            {selectedScholarship.canApply && !selectedDisabledReason && (
              <p className="rounded-[8px] border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2.5 text-[11px] leading-relaxed text-[#166534]">
                현재 기준을 충족했습니다. 신청 버튼을 누르면 현재 점수가 신청 이력에 저장됩니다.
              </p>
            )}
            {selectedDisabledReason && (
              <p className="rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5 text-[11px] leading-relaxed text-[#92400E]">
                {selectedDisabledReason}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
