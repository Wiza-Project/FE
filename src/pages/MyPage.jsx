import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { fetchMyAcademicRecord } from '@/api/students';
import { fetchMileageDashboard, fetchMileageGrade } from '@/api/mileage';
import {
  fetchAssessmentHistory,
  fetchAssessmentResult,
  fetchRecommendedPrograms,
} from '@/api/competency';
import { fetchMyApplications } from '@/api/programApplications';
import { fetchCounselingReservations, fetchCounselingTypes } from '@/api/counsel';
import { fetchBoardPosts } from '@/api/boards';
import { COUNSELING_RESERVATION_STATUS_LABEL } from '@/constants/domain';
import { formatDate } from '@/utils/date';
import {
  StatTile,
  PageHeader,
  StatusBadge,
  RadarChart,
  EmptyState,
  SkeletonLoader,
} from '@/components/common';

// PortalShell 사이드바 nav key → 실제 라우트 경로 매핑 (src/components/layout/PortalShell.jsx 참고)
const NAV_PATH = {
  mypage: '/my',
  competency: '/competency',
  extracurr: '/programs',
  counseling: '/counsel',
  mileage: '/mileage',
  career: '/career',
  notice: '/notice',
};

// 마일리지 현황 조회 기준 학기. "현재 학기 자동 판별" API가 아직 없어 마일리지 화면
// (src/pages/mileage/MileageDashboard.jsx)과 동일한 값을 그대로 사용한다.
const MILEAGE_PERIOD = { academicYear: 2026, semesterCode: '1' };

// 대시보드 요약 카드용으로 넉넉히 끌어오는 신청 내역 건수. 승인/진행중 집계용 API가
// 따로 없어 이 범위 안에서 근사치를 낸다 (src/pages/program/MyApplications.jsx와 동일한 한계).
const APPLICATIONS_FETCH_SIZE = 50;

function getErrorMessage(error, fallback) {
  if (error instanceof ApiError) return error.message || fallback;
  return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
}

function RetryButton({ onClick, color = '#2563EB', label = '다시 시도' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 px-5 text-[13px] font-bold text-white rounded-[6px] transition-opacity hover:opacity-90"
      style={{ background: color }}
    >
      {label}
    </button>
  );
}

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.accent]
 * @param {{label: string, onClick: () => void}} [props.action]
 * @param {import('react').ReactNode} props.children
 */
function CardShell({ title, accent, action, children }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          {accent && (
            <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: accent }} />
          )}
          <h2 className="text-[14px] font-bold text-[#1F2328]">{title}</h2>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-[12px] text-[#2563EB] hover:underline font-semibold"
          >
            {action.label} &rsaquo;
          </button>
        )}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </div>
  );
}

// ── Stat tiles ──────────────────────────────────────────────────────────────

function StatTileSkeleton() {
  return <div className="bg-white rounded-[8px] border border-[#E5E7EB] h-28 animate-pulse" />;
}

function StatTileError({ label, message, onRetry }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-4 flex flex-col gap-2 justify-center h-28">
      <span className="text-[12px] font-semibold text-[#656D76] uppercase tracking-wide">
        {label}
      </span>
      <span className="text-[12px] text-[#CF222E] leading-snug">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="self-start text-[11px] font-bold text-[#2563EB] hover:underline"
      >
        다시 시도
      </button>
    </div>
  );
}

function MileageStatTile({ dashboardQuery, gradeQuery }) {
  if (dashboardQuery.isLoading) return <StatTileSkeleton />;
  if (dashboardQuery.isError) {
    return (
      <StatTileError
        label="나의 마일리지"
        message={getErrorMessage(dashboardQuery.error, '마일리지 정보를 불러오지 못했습니다.')}
        onRetry={() => dashboardQuery.refetch()}
      />
    );
  }

  const cumulativePoints = Number(dashboardQuery.data?.summary?.cumulativePoints ?? 0);
  const currentSemesterPoints = Number(dashboardQuery.data?.summary?.currentSemesterPoints ?? 0);
  const gradeName = gradeQuery.data?.currentGrade?.gradeName;
  const nextGradeName = gradeQuery.data?.nextGrade?.gradeName;
  const pointsToNextGrade = Number(gradeQuery.data?.pointsToNextGrade ?? 0);

  const sub = gradeQuery.isLoading
    ? '등급 조회 중'
    : gradeQuery.isError
      ? '등급 정보를 불러오지 못했습니다.'
      : gradeName
        ? nextGradeName && pointsToNextGrade > 0
          ? `${gradeName} · ${nextGradeName}까지 ${pointsToNextGrade.toLocaleString('ko-KR')}점`
          : `${gradeName} · 최고 등급`
        : '등급 기준 없음';

  return (
    <StatTile
      label="나의 마일리지"
      value={cumulativePoints.toLocaleString('ko-KR')}
      sub={sub}
      accentColor="#D97706"
      trend={
        currentSemesterPoints > 0
          ? { value: `+${currentSemesterPoints.toLocaleString('ko-KR')}점`, up: true }
          : undefined
      }
      icon={<span className="text-[18px]">🏅</span>}
    />
  );
}

function CompetencyStatTile({ historyQuery, resultQuery, hasAttempt }) {
  if (historyQuery.isLoading || (hasAttempt && resultQuery.isLoading)) return <StatTileSkeleton />;
  if (historyQuery.isError) {
    return (
      <StatTileError
        label="핵심역량 평균"
        message={getErrorMessage(historyQuery.error, '진단 이력을 불러오지 못했습니다.')}
        onRetry={() => historyQuery.refetch()}
      />
    );
  }
  if (!hasAttempt) {
    return (
      <StatTile
        label="핵심역량 평균"
        value="-"
        sub="응시한 진단이 없습니다."
        accentColor="#7C3AED"
        icon={<span className="text-[18px]">⭐</span>}
      />
    );
  }
  if (resultQuery.isError) {
    return (
      <StatTileError
        label="핵심역량 평균"
        message={getErrorMessage(resultQuery.error, '진단 결과를 불러오지 못했습니다.')}
        onRetry={() => resultQuery.refetch()}
      />
    );
  }

  const overall = Number(resultQuery.data?.overallAverageScore ?? 0);
  const submittedAt = resultQuery.data?.submittedAt;

  return (
    <StatTile
      label="핵심역량 평균"
      value={`${overall.toFixed(1)}점`}
      sub={submittedAt ? `최근 진단 제출일 ${formatDate(submittedAt)}` : '최근 진단 결과'}
      accentColor="#7C3AED"
      icon={<span className="text-[18px]">⭐</span>}
    />
  );
}

function ApplicationsStatTile({ query }) {
  if (query.isLoading) return <StatTileSkeleton />;
  if (query.isError) {
    return (
      <StatTileError
        label="비교과 수료"
        message={getErrorMessage(query.error, '신청 현황을 불러오지 못했습니다.')}
        onRetry={() => query.refetch()}
      />
    );
  }

  const rows = query.data?.content ?? [];
  const totalApplied = query.data?.totalElements ?? rows.length;
  const completedCount = rows.filter((r) => r.completionStatus === 'COMPLETED').length;
  // 진행중 = 승인됐지만 아직 이수 판정이 나지 않은 건. 서버 집계 API가 없어 위에서
  // 끌어온 범위(APPLICATIONS_FETCH_SIZE) 안에서의 근사치다.
  const inProgressCount = rows.filter(
    (r) => r.applicationStatus === 'APPROVED' && r.completionStatus == null,
  ).length;

  return (
    <StatTile
      label="비교과 수료"
      value={`${completedCount}건`}
      sub={`신청 ${totalApplied} · 진행중 ${inProgressCount}`}
      accentColor="#2563EB"
      icon={<span className="text-[18px]">📋</span>}
    />
  );
}

function ReservationsStatTile({ query }) {
  if (query.isLoading) return <StatTileSkeleton />;
  if (query.isError) {
    return (
      <StatTileError
        label="상담 예약"
        message={getErrorMessage(query.error, '상담 예약 현황을 불러오지 못했습니다.')}
        onRetry={() => query.refetch()}
      />
    );
  }

  const rows = query.data?.content ?? [];
  // 서버가 최신 신청일 순으로 내려주므로 첫 번째로 걸리는 활성 예약이 가장 최근 건이다.
  const active = rows.filter(
    (r) => r.reservationStatus === 'REQUESTED' || r.reservationStatus === 'APPROVED',
  );
  const latest = active[0];

  return (
    <StatTile
      label="상담 예약"
      value={`${active.length}건`}
      sub={
        latest
          ? `최근 상태 ${COUNSELING_RESERVATION_STATUS_LABEL[latest.reservationStatus] ?? latest.reservationStatus}`
          : '예정된 상담 없음'
      }
      accentColor="#0891B2"
      icon={<span className="text-[18px]">💬</span>}
    />
  );
}

// ── My Competency card ────────────────────────────────────────────────────────

const COMP_COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#CF222E'];

function MyCompetencyCard({ historyQuery, resultQuery, hasAttempt, onNavigate }) {
  const isLoading = historyQuery.isLoading || (hasAttempt && resultQuery.isLoading);
  const isError = historyQuery.isError || (hasAttempt && resultQuery.isError);
  const retry = () => {
    historyQuery.refetch();
    if (hasAttempt) resultQuery.refetch();
  };

  const scores = [...(resultQuery.data?.scores ?? [])].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const percentileAvailable = !!resultQuery.data?.percentileAvailable;

  return (
    <CardShell
      title="나의 핵심역량"
      accent="#7C3AED"
      action={{ label: '전체보기', onClick: () => onNavigate('competency') }}
    >
      {isLoading ? (
        <SkeletonLoader rows={4} cols={3} />
      ) : isError ? (
        <EmptyState
          message={getErrorMessage(
            historyQuery.error ?? resultQuery.error,
            '핵심역량 정보를 불러오지 못했습니다.',
          )}
          sub="잠시 후 다시 시도해 주세요."
          action={<RetryButton color="#7C3AED" onClick={retry} />}
        />
      ) : !hasAttempt ? (
        <EmptyState
          message="아직 역량 진단에 응시하지 않았습니다."
          sub="핵심역량 진단을 응시하여 나의 역량 수준을 확인해 보세요."
          action={
            <button
              onClick={() => onNavigate('competency')}
              className="mt-1 px-4 py-2 bg-[#2563EB] text-white text-[13px] font-bold rounded-[6px] hover:bg-[#1D4ED8] transition-colors"
            >
              진단 바로가기
            </button>
          }
        />
      ) : scores.length === 0 ? (
        <EmptyState message="표시할 정보가 없습니다." />
      ) : (
        <div className="flex gap-4">
          {/* Radar */}
          <div className="flex-shrink-0 -ml-2 -mt-2">
            <RadarChart
              labels={scores.map((s) => s.competencyName)}
              values={scores.map((s) => s.convertedScore)}
              compareValues={
                percentileAvailable ? scores.map((s) => s.percentile ?? 0) : undefined
              }
              color="#7C3AED"
              size={240}
            />
            <div className="flex items-center gap-4 justify-center mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded bg-[#7C3AED]" />
                <span className="text-[11px] text-[#656D76]">나의 역량</span>
              </div>
              {percentileAvailable && (
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="4" viewBox="0 0 12 4">
                    <line
                      x1="0"
                      y1="2"
                      x2="12"
                      y2="2"
                      stroke="#7C3AED"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      opacity=".5"
                    />
                  </svg>
                  <span className="text-[11px] text-[#656D76]">백분위</span>
                </div>
              )}
            </div>
          </div>

          {/* Bar list */}
          <div className="flex-1 flex flex-col justify-center gap-2.5 min-w-0">
            {scores.map((s) => {
              const val = s.convertedScore;
              const isLowest = val === Math.min(...scores.map((x) => x.convertedScore));
              return (
                <div key={s.competencyId}>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[12px] font-semibold truncate ${isLowest ? 'text-[#CF222E]' : 'text-[#1F2328]'}`}
                    >
                      {s.competencyName} {isLowest && <span className="text-[10px]">▼최저</span>}
                    </span>
                    <span
                      className={`text-[12px] font-bold ml-2 flex-shrink-0 ${isLowest ? 'text-[#CF222E]' : 'text-[#1F2328]'}`}
                    >
                      {val}점
                    </span>
                  </div>
                  <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${val}%`,
                        background: isLowest
                          ? '#CF222E'
                          : COMP_COLORS[s.displayOrder % COMP_COLORS.length],
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-[#9AA0A6] mt-0.5">
                    {s.percentile != null ? `백분위 ${s.percentile}` : '백분위 정보 없음'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Buttons */}
      {!isLoading && !isError && hasAttempt && scores.length > 0 && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onNavigate('competency')}
            className="flex-1 h-8 rounded-[6px] border border-[#E5E7EB] text-[12px] font-semibold text-[#1F2328] hover:bg-[#F9FAFB] transition-colors"
          >
            상세 결과 보기
          </button>
          <button
            onClick={() => onNavigate('competency')}
            className="flex-1 h-8 rounded-[6px] bg-[#7C3AED] text-[12px] font-bold text-white hover:bg-[#6D28D9] transition-colors"
          >
            사후 진단 응시
          </button>
        </div>
      )}
    </CardShell>
  );
}

// ── Recommended Programs card ─────────────────────────────────────────────────

function daysLeftFrom(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function RecommendedProgramsCard({ historyQuery, recommendedQuery, hasAttempt, onNavigate }) {
  const isLoading = historyQuery.isLoading || (hasAttempt && recommendedQuery.isLoading);
  const isError = historyQuery.isError || (hasAttempt && recommendedQuery.isError);
  const retry = () => {
    historyQuery.refetch();
    if (hasAttempt) recommendedQuery.refetch();
  };

  const weakCompetencies = recommendedQuery.data?.weakCompetencies ?? [];
  // 취약 역량이 앞에 오도록 서버가 정렬해 내려주므로 첫 항목이 가장 취약한 역량이다.
  const lowest = weakCompetencies[0];
  const programs = weakCompetencies
    .flatMap((group) =>
      (group.programs ?? []).map((p) => ({ ...p, competencyName: group.competencyName })),
    )
    .slice(0, 3);

  return (
    <CardShell
      title="추천 비교과 프로그램"
      accent="#2563EB"
      action={{ label: '전체보기', onClick: () => onNavigate('extracurr') }}
    >
      {isLoading ? (
        <SkeletonLoader rows={3} cols={4} />
      ) : isError ? (
        <EmptyState
          message={getErrorMessage(
            historyQuery.error ?? recommendedQuery.error,
            '추천 프로그램을 불러오지 못했습니다.',
          )}
          sub="잠시 후 다시 시도해 주세요."
          action={<RetryButton color="#2563EB" onClick={retry} />}
        />
      ) : !hasAttempt ? (
        <EmptyState
          message="핵심역량 진단 결과가 필요합니다."
          sub="진단에 응시하면 취약 역량에 맞는 프로그램을 추천해 드립니다."
          action={
            <button
              onClick={() => onNavigate('competency')}
              className="mt-1 px-4 py-2 bg-[#2563EB] text-white text-[13px] font-bold rounded-[6px] hover:bg-[#1D4ED8] transition-colors"
            >
              진단 바로가기
            </button>
          }
        />
      ) : programs.length === 0 ? (
        <EmptyState message="표시할 정보가 없습니다." sub="현재 추천할 수 있는 프로그램이 없습니다." />
      ) : (
        <>
          {/* Banner */}
          {lowest && (
            <div className="flex items-start gap-2.5 mb-3 bg-[#FFF7ED] border border-[#FDE68A] rounded-[6px] px-3.5 py-2.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="#D97706"
                className="flex-shrink-0 mt-0.5"
              >
                <path d="M8 1L1 14h14L8 1z" />
                <path d="M8 6v4M8 12h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-[12px] text-[#92400E] leading-snug">
                <strong>
                  {lowest.competencyName}이(가) 가장 낮습니다 ({lowest.convertedScore}점).
                </strong>
                <br />
                아래 프로그램으로 역량을 키워보세요.
              </p>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-[#F6F8FA] text-[#656D76] uppercase text-[11px] tracking-wide">
                  <th className="text-left px-3 py-2 font-semibold rounded-tl-[4px]">프로그램</th>
                  <th className="text-center px-2 py-2 font-semibold">연계역량</th>
                  <th className="text-center px-2 py-2 font-semibold">마감</th>
                  <th className="text-right px-3 py-2 font-semibold rounded-tr-[4px]">적립</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p, i) => {
                  const daysLeft = daysLeftFrom(p.recruitmentEndsAt);
                  return (
                    <tr
                      key={p.programId}
                      className={`border-t border-[#F3F4F6] hover:bg-[#F9FAFB] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : ''}`}
                    >
                      <td className="px-3 py-2.5 text-[#1F2328] font-semibold">{p.programName}</td>
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                          {p.competencyName}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span
                          className={`text-[11px] font-bold ${daysLeft != null && daysLeft <= 3 ? 'text-[#CF222E]' : daysLeft != null && daysLeft <= 7 ? 'text-[#D97706]' : 'text-[#6E7781]'}`}
                        >
                          {daysLeft == null ? '-' : daysLeft > 0 ? `D-${daysLeft}` : '마감'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-[#D97706]">
                        {p.mileagePoints != null ? `${p.mileagePoints}점` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CardShell>
  );
}

// ── My Applications card ──────────────────────────────────────────────────────

const APPLICATION_STATUS_LABEL = {
  COMPLETED: '수료',
  FAILED: '미수료',
};

function MyApplicationsCard({ query, onNavigate }) {
  const rows = (query.data?.content ?? []).slice(0, 5);

  return (
    <CardShell
      title="나의 신청 현황"
      accent="#2563EB"
      action={{ label: '전체보기', onClick: () => onNavigate('extracurr') }}
    >
      {query.isLoading ? (
        <SkeletonLoader rows={3} cols={3} />
      ) : query.isError ? (
        <EmptyState
          message={getErrorMessage(query.error, '신청 현황을 불러오지 못했습니다.')}
          sub="잠시 후 다시 시도해 주세요."
          action={<RetryButton color="#2563EB" onClick={() => query.refetch()} />}
        />
      ) : rows.length === 0 ? (
        <EmptyState message="표시할 정보가 없습니다." sub="아직 신청한 비교과 프로그램이 없습니다." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-[#F6F8FA] text-[#656D76] uppercase text-[11px] tracking-wide">
                <th className="text-left px-3 py-2 font-semibold">프로그램명</th>
                <th className="text-center px-2 py-2 font-semibold">상태</th>
                <th className="text-right px-3 py-2 font-semibold">신청일</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr
                  key={a.applicationId}
                  className={`border-t border-[#F3F4F6] hover:bg-[#F9FAFB] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : ''}`}
                >
                  <td className="px-3 py-2.5 font-semibold text-[#1F2328]">{a.programName}</td>
                  <td className="px-2 py-2.5 text-center">
                    <StatusBadge
                      status={
                        APPLICATION_STATUS_LABEL[a.completionStatus] ?? a.applicationStatusLabel
                      }
                      size="sm"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right text-[#656D76]">
                    {formatDate(a.appliedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardShell>
  );
}

// ── Counseling card ───────────────────────────────────────────────────────────

function CounselingCard({ reservationsQuery, typesQuery, onNavigate }) {
  const isLoading = reservationsQuery.isLoading || typesQuery.isLoading;
  const isError = reservationsQuery.isError;

  const rows = reservationsQuery.data?.content ?? [];
  const typeNameById = new Map(
    (typesQuery.data ?? []).map((t) => [t.counselingTypeId, t.typeName]),
  );
  // 서버가 최신 신청일 순으로 내려주므로 첫 번째로 걸리는 활성 예약이 가장 최근 건이다.
  const active = rows.find(
    (r) => r.reservationStatus === 'REQUESTED' || r.reservationStatus === 'APPROVED',
  );

  return (
    <CardShell
      title="상담 예약 현황"
      accent="#0891B2"
      action={{ label: '전체보기', onClick: () => onNavigate('counseling') }}
    >
      {isLoading ? (
        <SkeletonLoader rows={2} cols={3} />
      ) : isError ? (
        <EmptyState
          message={getErrorMessage(reservationsQuery.error, '상담 예약 현황을 불러오지 못했습니다.')}
          sub="잠시 후 다시 시도해 주세요."
          action={<RetryButton color="#0891B2" onClick={() => reservationsQuery.refetch()} />}
        />
      ) : !active ? (
        <EmptyState
          message="표시할 정보가 없습니다."
          sub="예정된 상담 예약이 없습니다."
          action={
            <button
              onClick={() => onNavigate('counseling')}
              className="mt-1 px-4 py-2 bg-[#0891B2] text-white text-[13px] font-bold rounded-[6px] hover:bg-[#0E7490] transition-colors"
            >
              + 새 상담 예약
            </button>
          }
        />
      ) : (
        <div>
          <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-[8px] px-4 py-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0891B2]" />
                <span className="text-[13px] font-bold text-[#0891B2]">예정된 상담</span>
              </div>
              <StatusBadge
                status={
                  COUNSELING_RESERVATION_STATUS_LABEL[active.reservationStatus] ??
                  active.reservationStatus
                }
                size="sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-[12px]">
              {[
                {
                  label: '유형',
                  value: typeNameById.get(active.counselingTypeId) ?? '상담 유형 정보 없음',
                },
                { label: '신청일', value: formatDate(active.createdAt) },
              ].map((r) => (
                <div key={r.label} className="flex gap-2">
                  <span className="text-[#9AA0A6] w-12 flex-shrink-0">{r.label}</span>
                  <span className="text-[#1F2328] font-semibold">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => onNavigate('counseling')}
            className="w-full mt-3 h-8 text-[12px] font-semibold text-[#0891B2] border border-[#BAE6FD] rounded-[6px] hover:bg-[#F0F9FF] transition-colors"
          >
            상담 예약 관리로 이동
          </button>
        </div>
      )}
    </CardShell>
  );
}

// ── Announcements card ────────────────────────────────────────────────────────

function NoticesCard({ query, onNavigate }) {
  const rows = query.data?.content ?? [];

  return (
    <CardShell
      title="공지사항"
      accent="#6B7280"
      action={{ label: '전체보기', onClick: () => onNavigate('notice') }}
    >
      {query.isLoading ? (
        <SkeletonLoader rows={5} cols={3} />
      ) : query.isError ? (
        <EmptyState
          message={getErrorMessage(query.error, '공지사항을 불러오지 못했습니다.')}
          sub="잠시 후 다시 시도해 주세요."
          action={<RetryButton color="#6B7280" onClick={() => query.refetch()} />}
        />
      ) : rows.length === 0 ? (
        <EmptyState message="표시할 정보가 없습니다." sub="등록된 공지사항이 없습니다." />
      ) : (
        <div className="flex flex-col">
          {rows.map((n, i) => (
            <button
              key={n.postId}
              onClick={() => onNavigate('notice')}
              className={`flex items-center gap-2.5 py-2.5 text-left cursor-pointer hover:bg-[#F9FAFB] px-1 rounded transition-colors ${i < rows.length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}
            >
              {n.pinned && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 bg-[#FEF3C7] text-[#D97706]">
                  고정
                </span>
              )}
              <span className="text-[13px] text-[#1F2328] truncate flex-1">{n.title}</span>
              <span className="text-[11px] text-[#9AA0A6] flex-shrink-0">
                {n.publishedAt ? formatDate(n.publishedAt) : n.postStatusLabel}
              </span>
            </button>
          ))}
        </div>
      )}
    </CardShell>
  );
}

// ── Main MyPage ───────────────────────────────────────────────────────────────

/**
 * 학생 포털 랜딩 화면. 마일리지/역량/신청현황/상담/공지를 카드로 요약해서 보여줍니다.
 * 각 카드는 해당 도메인의 실제 API를 조회하며(src/api/*.js), 데이터가 없거나 조회에
 * 실패하면 더미 데이터 대신 빈 상태/재시도 안내를 보여줍니다.
 */
export default function MyPage() {
  const navigate = useNavigate();
  const onNavigate = (key) => navigate(NAV_PATH[key] ?? '/my');

  const profileQuery = useQuery({
    queryKey: ['dashboardProfile'],
    queryFn: fetchMyAcademicRecord,
  });

  const mileageQuery = useQuery({
    queryKey: ['dashboardMileageSummary', MILEAGE_PERIOD],
    queryFn: () => fetchMileageDashboard(MILEAGE_PERIOD),
  });
  const mileageGradeQuery = useQuery({
    queryKey: ['dashboardMileageGrade', MILEAGE_PERIOD],
    queryFn: () => fetchMileageGrade(MILEAGE_PERIOD),
  });

  const historyQuery = useQuery({
    queryKey: ['dashboardAssessmentHistory'],
    queryFn: () => fetchAssessmentHistory({ page: 0, size: 1 }),
  });
  const latestAttemptId = historyQuery.data?.content?.[0]?.attemptId;
  const hasAttempt = latestAttemptId != null;

  const resultQuery = useQuery({
    queryKey: ['dashboardAssessmentResult', latestAttemptId],
    queryFn: () => fetchAssessmentResult(latestAttemptId),
    enabled: hasAttempt,
  });
  const recommendedQuery = useQuery({
    queryKey: ['dashboardRecommendedPrograms', latestAttemptId],
    queryFn: () => fetchRecommendedPrograms(latestAttemptId),
    enabled: hasAttempt,
  });

  const applicationsQuery = useQuery({
    queryKey: ['dashboardMyApplications'],
    queryFn: () => fetchMyApplications({ page: 0, size: APPLICATIONS_FETCH_SIZE, sort: 'createdAt,desc' }),
  });

  const reservationsQuery = useQuery({
    queryKey: ['dashboardCounselingReservations'],
    queryFn: () => fetchCounselingReservations({ page: 0, size: 20 }),
  });
  // MyCounseling.jsx와 동일한 쿼리 키를 써서 캐시를 공유한다.
  const counselingTypesQuery = useQuery({
    queryKey: ['counselingTypes'],
    queryFn: fetchCounselingTypes,
  });

  const noticesQuery = useQuery({
    queryKey: ['dashboardNotices'],
    queryFn: () => fetchBoardPosts('NOTICE', { page: 0, size: 5 }),
  });

  const profile = profileQuery.data;
  const period = mileageQuery.data?.period;

  return (
    <div className="min-h-full">
      {/* Page header */}
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '마이페이지' }]}
        title="마이페이지"
        accentColor="#2563EB"
      />

      {/* Greeting row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {profileQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              <div className="h-6 w-60 bg-[#F3F4F6] rounded animate-pulse" />
              <div className="h-4 w-72 bg-[#F3F4F6] rounded animate-pulse" />
            </div>
          ) : profileQuery.isError ? (
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[22px] font-bold text-[#1F2328] leading-tight">안녕하세요 👋</h1>
              <span className="text-[12px] text-[#CF222E]">
                {getErrorMessage(profileQuery.error, '내 정보를 불러오지 못했습니다.')}
              </span>
              <button
                type="button"
                onClick={() => profileQuery.refetch()}
                className="text-[12px] font-bold text-[#2563EB] hover:underline"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-[22px] font-bold text-[#1F2328] leading-tight">
                안녕하세요, <span className="text-[#2563EB]">{profile.name}</span> 님 👋
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[12px] text-[#656D76]">{profile.studentId}</span>
                {profile.majorName && (
                  <>
                    <span className="text-[#E5E7EB]">·</span>
                    <span className="text-[12px] font-semibold text-[#1F2328]">
                      {profile.majorName}
                    </span>
                  </>
                )}
                {profile.grade != null && (
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB]">
                    {profile.grade}학년
                  </span>
                )}
                <StatusBadge status={profile.status} size="sm" />
              </div>
            </>
          )}
        </div>
        {period && (
          <span className="h-9 px-3 inline-flex items-center text-[13px] font-semibold text-[#1F2328] bg-white border border-[#E5E7EB] rounded-[6px]">
            {period.academicYear}학년도 {period.semesterCode}학기
          </span>
        )}
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <MileageStatTile dashboardQuery={mileageQuery} gradeQuery={mileageGradeQuery} />
        <CompetencyStatTile
          historyQuery={historyQuery}
          resultQuery={resultQuery}
          hasAttempt={hasAttempt}
        />
        <ApplicationsStatTile query={applicationsQuery} />
        <ReservationsStatTile query={reservationsQuery} />
      </div>

      {/* Main 2-column grid */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        {/* Left — Competency */}
        <MyCompetencyCard
          historyQuery={historyQuery}
          resultQuery={resultQuery}
          hasAttempt={hasAttempt}
          onNavigate={onNavigate}
        />

        {/* Right — stacked */}
        <div className="flex flex-col gap-4">
          <RecommendedProgramsCard
            historyQuery={historyQuery}
            recommendedQuery={recommendedQuery}
            hasAttempt={hasAttempt}
            onNavigate={onNavigate}
          />
          <MyApplicationsCard query={applicationsQuery} onNavigate={onNavigate} />
        </div>
      </div>

      {/* Bottom 2-column */}
      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <CounselingCard
          reservationsQuery={reservationsQuery}
          typesQuery={counselingTypesQuery}
          onNavigate={onNavigate}
        />
        <NoticesCard query={noticesQuery} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
