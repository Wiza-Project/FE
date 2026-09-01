import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { DEPARTMENT, USER_ROLE } from '@/constants/domain';
import { apiClient, ApiError } from '@/api/client';
import { fetchProgramsAdmin, fetchProgramApplications } from '@/api/programs';
import { fetchPendingCounselorReservations, fetchCounselorSchedules } from '@/api/counsel';
import { fetchBoardPosts } from '@/api/boards';
import { formatDate, formatDateTime } from '@/utils/date';
import { PageHeader, StatTile, Tabs, Button, ProgressBar, EmptyState } from '@/components/common';

const ACCENT = '#374151';

/**
 * 교직원용 외부활동 마일리지 증빙 심사 목록 조회. GET /api/staff/mileage/claims
 * status를 생략하면 서버가 심사 대기(REQUESTED) 건만 최신순으로 내려준다.
 */
const fetchMileageClaimsForReview = async (params) => {
  const { data } = await apiClient.get('/staff/mileage/claims', { params });
  return data;
};

/**
 * 교직원용 채용공고 전체/검수 목록 조회. GET /api/staff/career/job-postings
 */
const fetchStaffJobPostings = async (params) => {
  const { data } = await apiClient.get('/staff/career/job-postings', { params });
  return data;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error, fallback) {
  if (error instanceof ApiError) return error.message || fallback;
  return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function daysElapsed(iso) {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Number.isFinite(diff) ? Math.max(0, Math.floor(diff / 86400000)) : 0;
}

function RetryButton({ onClick, color = ACCENT, label = '다시 시도' }) {
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

// ── 업무유형별 색상(그레이스케일 명도 단계) ──────────────────────────────────
const TYPE_COLORS = {
  비교과신청: '#1F2937',
  마일리지증빙: '#4B5563',
  상담예약: '#6B7280',
  구인신청: '#9CA3AF',
};

// ── 처리 대기 항목을 도메인별 응답에서 공통 행 모양으로 변환 ──────────────────

function toProgramApplicationRow(app, program) {
  return {
    id: `program-${app.applicationId}`,
    type: '비교과신청',
    receivedAt: app.appliedAt,
    target: `${app.studentName ?? '-'} (${app.studentNo ?? '-'})`,
    targetType: '학생',
    content: `${program.programName} 신청${app.waitlistOrder != null ? ` · 대기 ${app.waitlistOrder}번` : ''}`,
  };
}

function toMileageClaimRow(claim) {
  return {
    id: `mileage-${claim.externalClaimId}`,
    type: '마일리지증빙',
    receivedAt: claim.applicationDate,
    target: `${claim.studentName ?? '-'} (${claim.studentNo ?? '-'})`,
    targetType: '학생',
    content: `${claim.activityTypeName ?? ''} · ${claim.activityName ?? ''} (${claim.requestedPoints ?? 0}점)`,
  };
}

function toCounselingReservationRow(reservation) {
  return {
    id: `counsel-${reservation.reservationId}`,
    type: '상담예약',
    receivedAt: reservation.createdAt,
    target: `학생 #${reservation.studentId}`,
    targetType: '학생',
    content: `${reservation.counselingTypeName ?? '상담'} 신청 — ${formatDateTime(reservation.startsAt)}`,
  };
}

function toJobPostingRow(posting) {
  return {
    id: `job-${posting.jobPostingId}`,
    type: '구인신청',
    receivedAt: posting.applicationStartsAt,
    target: posting.companyName ?? '-',
    targetType: '기업',
    content: `${posting.postingTitle} 공고 검수`,
  };
}

// ── Work item row ────────────────────────────────────────────────────────────

function WorkRow({ item, onProcess }) {
  const urgent = daysElapsed(item.receivedAt) >= 3;
  const elapsed = daysElapsed(item.receivedAt);
  return (
    <tr
      className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors ${urgent ? 'bg-[#FFFBEB]' : 'bg-white'}`}
    >
      <td className="px-3 py-3 text-center font-mono text-[11px] text-[#9AA0A6] whitespace-nowrap">
        {item.receivedAt ? formatDate(item.receivedAt) : '-'}
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap"
          style={{ background: TYPE_COLORS[item.type] }}
        >
          {item.type}
        </span>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="text-[12px] font-bold text-[#1F2328]">{item.target}</div>
        <div className="text-[10px] text-[#9AA0A6]">{item.targetType}</div>
      </td>
      <td className="px-3 py-3 max-w-[260px]">
        <p className="text-[12px] text-[#444D56] leading-snug">{item.content}</p>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={`text-[12px] font-black ${urgent ? 'text-[#D97706]' : 'text-[#9AA0A6]'}`}>
          {elapsed}일
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <button
          onClick={onProcess}
          className="h-6 px-3 text-[11px] font-bold rounded-[5px] text-white transition-colors hover:opacity-90"
          style={{ background: TYPE_COLORS[item.type] }}
        >
          처리하기
        </button>
      </td>
    </tr>
  );
}

// ── Stat tile async wrapper ───────────────────────────────────────────────────

function StatTileSkeleton() {
  return <div className="bg-white rounded-[8px] border border-[#E5E7EB] h-28 animate-pulse" />;
}

function StatTileErrorBox({ label, message, onRetry }) {
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

// ── Main component ───────────────────────────────────────────────────────────

/**
 * 교직원 포털 랜딩 화면. 학생 포털의 MyPage와 대응되는 업무 대시보드로,
 * 로그인한 사용자의 department·roleCodes 기준으로 접근 가능한 업무 영역만
 * 보여준다
 * 부서/역할 → 표시 영역 매핑:
 *   D200(비교과운영부서) — 비교과 신청 심사, 담당 프로그램 현황
 *   D100(학생역량센터)   — 마일리지 증빙 심사
 *   D400(취창업지원과)   — 구인 신청 검수
 *   ST200(카운셀러 역할) — 오늘의 본인 상담, 본인 상담 예약 승인·일정
 *   전체 교직원          — 공지 등록, 최근 공지
 *
 * ADMIN 계정은 이 화면(및 교직원 포털 전체)에 접근할 수 없다(router.jsx 참고 —
 * ProtectedRoute가 STAFF만 허용) 이므로 부서 판별에 별도 ADMIN 우회 분기는 두지 않았다.
 */
export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const department = user?.department;
  const roleCodes = user?.roleCodes ?? [];

  const canProgramReview = department === DEPARTMENT.NON_SUBJECT_OPERATION; // D200
  const canMileageReview = department === DEPARTMENT.STUDENT_COMPETENCY_CENTER; // D100
  const canCareerReview = department === DEPARTMENT.CAREER_SUPPORT_OFFICE; // D400
  const canCounsel = roleCodes.includes(USER_ROLE.COUNSELOR); // ST200

  const [activeTab, setActiveTab] = useState(null);

  // ── D200: 담당 프로그램 + 비교과 신청 심사 ──────────────────────────────
  const programsQuery = useQuery({
    queryKey: ['staffDashboardPrograms'],
    queryFn: () => fetchProgramsAdmin({ size: 50, sort: 'createdAt,desc' }),
    enabled: canProgramReview,
  });
  const ownedPrograms = programsQuery.data?.content ?? [];
  // 프로그램별 "심사 대기(APPLIED)" 신청 건수 집계 API가 따로 없어, 본인 소유
  // 프로그램마다 개별 조회해서 더한다 — 근사치가 아니라 정확한 합산이지만
  // 프로그램 수만큼 요청이 나간다(교직원 1인당 소유 프로그램 수가 많지 않다는 전제).
  const pendingByProgramQueries = useQueries({
    queries: ownedPrograms.map((program) => ({
      queryKey: ['staffDashboardPendingApplications', program.programId],
      queryFn: () =>
        fetchProgramApplications(program.programId, { status: 'APPLIED', size: 30 }),
      enabled: canProgramReview,
    })),
  });
  const programApplicationsLoading =
    canProgramReview &&
    (programsQuery.isLoading || pendingByProgramQueries.some((q) => q.isLoading));
  const programApplicationsError =
    canProgramReview && (programsQuery.isError || pendingByProgramQueries.some((q) => q.isError));
  const programApplicationRows = ownedPrograms.flatMap((program, i) =>
    (pendingByProgramQueries[i]?.data?.content ?? []).map((app) =>
      toProgramApplicationRow(app, program),
    ),
  );
  const programApplicationsCount = ownedPrograms.reduce(
    (sum, _program, i) => sum + (pendingByProgramQueries[i]?.data?.totalElements ?? 0),
    0,
  );
  const retryProgramApplications = () => {
    programsQuery.refetch();
    pendingByProgramQueries.forEach((q) => q.refetch());
  };
  const operatingPrograms = ownedPrograms.filter((p) => p.programStatusLabel === '운영중');

  // ── D100: 마일리지 증빙 심사 ─────────────────────────────────────────────
  const mileageClaimsQuery = useQuery({
    queryKey: ['staffDashboardMileageClaims'],
    queryFn: () => fetchMileageClaimsForReview({ size: 30 }),
    enabled: canMileageReview,
  });
  const mileageClaimRows = (mileageClaimsQuery.data?.content ?? []).map(toMileageClaimRow);
  const mileageClaimsCount = mileageClaimsQuery.data?.totalElements ?? 0;

  // ── ST200: 상담 예약 승인 + 본인 일정 ────────────────────────────────────
  const pendingReservationsQuery = useQuery({
    queryKey: ['staffDashboardPendingReservations'],
    queryFn: () => fetchPendingCounselorReservations({ size: 30 }),
    enabled: canCounsel,
  });
  const reservationRows = (pendingReservationsQuery.data?.content ?? []).map(
    toCounselingReservationRow,
  );
  const reservationsCount = pendingReservationsQuery.data?.totalElements ?? 0;

  const schedulesQuery = useQuery({
    queryKey: ['staffDashboardCounselorSchedules'],
    queryFn: fetchCounselorSchedules,
    enabled: canCounsel,
  });
  const todaySchedules = (schedulesQuery.data ?? []).filter((s) => isToday(s.startsAt));
  const todaySessionCount = todaySchedules.filter((s) => s.hasReservation).length;

  // ── D400: 구인 신청 검수 ─────────────────────────────────────────────────
  const jobPostingsQuery = useQuery({
    queryKey: ['staffDashboardJobPostings'],
    queryFn: () => fetchStaffJobPostings({ reviewStatus: 'REQUESTED', page: 0, size: 30 }),
    enabled: canCareerReview,
  });
  const jobPostingRows = (jobPostingsQuery.data?.content ?? []).map(toJobPostingRow);
  const jobPostingsCount = jobPostingsQuery.data?.totalElements ?? 0;

  // ── 전체 교직원: 최근 공지 ───────────────────────────────────────────────
  const noticesQuery = useQuery({
    queryKey: ['staffDashboardNotices'],
    queryFn: () => fetchBoardPosts('NOTICE', { page: 0, size: 5 }),
  });

  // ── 처리 대기 목록 탭 구성: 권한 있는 업무만 ──────────────────────────────
  const workTabs = [
    canProgramReview && {
      key: '비교과신청',
      label: '비교과 신청 심사',
      count: programApplicationsCount,
      loading: programApplicationsLoading,
      error: programApplicationsError,
      errorObj: programsQuery.error,
      rows: programApplicationRows,
      onRetry: retryProgramApplications,
      onProcess: () => navigate('/staff/programs'),
    },
    canMileageReview && {
      key: '마일리지증빙',
      label: '마일리지 증빙 심사',
      count: mileageClaimsCount,
      loading: mileageClaimsQuery.isLoading,
      error: mileageClaimsQuery.isError,
      errorObj: mileageClaimsQuery.error,
      rows: mileageClaimRows,
      onRetry: () => mileageClaimsQuery.refetch(),
      onProcess: () => navigate('/staff/mileage'),
    },
    canCounsel && {
      key: '상담예약',
      label: '상담 예약 승인',
      count: reservationsCount,
      loading: pendingReservationsQuery.isLoading,
      error: pendingReservationsQuery.isError,
      errorObj: pendingReservationsQuery.error,
      rows: reservationRows,
      onRetry: () => pendingReservationsQuery.refetch(),
      onProcess: () => navigate('/staff/counsel'),
    },
    canCareerReview && {
      key: '구인신청',
      label: '구인 신청 검수',
      count: jobPostingsCount,
      loading: jobPostingsQuery.isLoading,
      error: jobPostingsQuery.isError,
      errorObj: jobPostingsQuery.error,
      rows: jobPostingRows,
      onRetry: () => jobPostingsQuery.refetch(),
      onProcess: () => navigate('/staff/career'),
    },
  ].filter(Boolean);

  const currentTab = workTabs.find((t) => t.key === activeTab) ?? workTabs[0] ?? null;

  // 처리 대기 총합 = 지금 로그인한 사용자가 실제로 볼 수 있는(권한 있는) 업무만 합산.
  const totalPending = workTabs.reduce((sum, t) => sum + (t.count || 0), 0);
  const pendingCountsReady = workTabs.length > 0 && workTabs.every((t) => !t.loading && !t.error);

  // ── 상단 통계 타일: 권한 있고 실제 데이터가 있는 것만 구성 ────────────────
  const statTiles = [
    workTabs.length > 0 && {
      key: 'pending',
      label: '처리 대기',
      loading: !pendingCountsReady && workTabs.some((t) => t.loading),
      error: workTabs.some((t) => t.error),
      errorMessage: '일부 업무의 처리 대기 건수를 불러오지 못했습니다.',
      onRetry: () => workTabs.forEach((t) => t.onRetry()),
      value: `${totalPending}건`,
      sub: '즉시 처리 필요',
      accentColor: '#D97706',
    },
    canCounsel && {
      key: 'todayCounsel',
      label: '오늘 상담',
      loading: schedulesQuery.isLoading,
      error: schedulesQuery.isError,
      errorMessage: '오늘 상담 일정을 불러오지 못했습니다.',
      onRetry: () => schedulesQuery.refetch(),
      value: `${todaySessionCount}건`,
      sub: todaySchedules[0] ? `${formatDateTime(todaySchedules[0].startsAt)} 시작` : '오늘 일정 없음',
      accentColor: ACCENT,
    },
    canProgramReview && {
      key: 'operatingPrograms',
      label: '운영중 프로그램',
      loading: programsQuery.isLoading,
      error: programsQuery.isError,
      errorMessage: '프로그램 현황을 불러오지 못했습니다.',
      onRetry: () => programsQuery.refetch(),
      value: `${operatingPrograms.length}개`,
      sub: '현재 학기',
      accentColor: ACCENT,
    },
  ].filter(Boolean);

  const noWorkPermission = !canProgramReview && !canMileageReview && !canCounsel && !canCareerReview;

  const hasLeftColumn = workTabs.length > 0 || canProgramReview;
  const hasRightExtras = canCounsel || canProgramReview;
  const singleColumn = !hasLeftColumn && !hasRightExtras;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '교직원 포털' }, { label: '업무 대시보드' }]}
        title="업무 대시보드"
        subtitle={`${user?.name ?? ''}${user?.departmentName ? ` · ${user.departmentName}` : ''} · ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}`}
        accentColor={ACCENT}
        actions={
          <Button
            size="sm"
            style={{ background: ACCENT }}
            onClick={() => navigate('/staff/boards')}
          >
            공지 등록
          </Button>
        }
      />

      {/* ── Stat tiles ── */}
      {statTiles.length > 0 && (
        <div
          className="grid gap-4 mb-5"
          style={{ gridTemplateColumns: `repeat(${Math.min(statTiles.length, 4)}, minmax(0, 1fr))` }}
        >
          {statTiles.map((t) =>
            t.loading ? (
              <StatTileSkeleton key={t.key} />
            ) : t.error ? (
              <StatTileErrorBox
                key={t.key}
                label={t.label}
                message={t.errorMessage}
                onRetry={t.onRetry}
              />
            ) : (
              <StatTile
                key={t.key}
                label={t.label}
                value={t.value}
                sub={t.sub}
                accentColor={t.accentColor}
              />
            ),
          )}
        </div>
      )}

      {noWorkPermission && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-8 mb-5">
          <EmptyState
            message="표시할 업무 영역이 없습니다."
            sub="담당 부서·역할에 연결된 업무가 없으면 공지 관련 기능만 이용할 수 있습니다."
          />
        </div>
      )}

      {/* ── Main content ── */}
      <div
        className={singleColumn ? 'flex flex-col gap-5' : 'grid gap-5'}
        style={singleColumn ? undefined : { gridTemplateColumns: hasLeftColumn ? '1fr 300px' : '1fr' }}
      >
        {hasLeftColumn && (
          <div className="flex flex-col gap-5">
            {/* 처리 대기 목록 */}
            {workTabs.length > 0 && (
              <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-3 flex-wrap">
                  <div className="w-1 h-5 rounded-full bg-[#D97706]" />
                  <h2 className="text-[15px] font-bold text-[#1F2328]">처리 대기 목록</h2>
                  {pendingCountsReady && (
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E] ml-1">
                      {totalPending}건
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-[#9AA0A6] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#D97706] inline-block" />
                      3일 이상 경과
                    </span>
                  </div>
                </div>

                <div className="px-5 pt-3 pb-0">
                  <Tabs
                    tabs={workTabs.map((t) => ({ key: t.key, label: t.label, count: t.count }))}
                    active={currentTab?.key}
                    onChange={setActiveTab}
                    accentColor={ACCENT}
                  />
                </div>

                <div className="relative overflow-x-auto">
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                        {['접수일', '유형', '대상', '내용', '경과일', '처리'].map((h) => (
                          <th
                            key={h}
                            className={`px-3 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '내용' ? 'text-left' : 'text-center'}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentTab?.loading ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#656D76]">
                            불러오는 중입니다.
                          </td>
                        </tr>
                      ) : currentTab?.error ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center">
                            <EmptyState
                              message={getErrorMessage(
                                currentTab.errorObj,
                                '처리 대기 목록을 불러오지 못했습니다.',
                              )}
                              action={<RetryButton onClick={currentTab.onRetry} />}
                            />
                          </td>
                        </tr>
                      ) : !currentTab || currentTab.rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#9AA0A6]">
                            처리 대기 중인 항목이 없습니다. ✓
                          </td>
                        </tr>
                      ) : (
                        currentTab.rows
                          .slice(0, 8)
                          .map((item) => (
                            <WorkRow key={item.id} item={item} onProcess={currentTab.onProcess} />
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {currentTab && currentTab.rows.length > 8 && (
                  <div className="px-5 py-3 border-t border-[#E5E7EB] text-center">
                    <button
                      onClick={currentTab.onProcess}
                      className="text-[12px] text-[#374151] font-bold hover:underline"
                    >
                      +{currentTab.rows.length - 8}건 더 보기
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 담당 프로그램 현황 (D200) */}
            {canProgramReview && (
              <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
                  <h2 className="text-[14px] font-bold text-[#1F2328]">담당 프로그램 현황</h2>
                  {!programsQuery.isLoading && !programsQuery.isError && (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">
                      {ownedPrograms.length}개
                    </span>
                  )}
                </div>
                <div className="p-5">
                  {programsQuery.isLoading ? (
                    <div className="flex flex-col gap-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 bg-[#F3F4F6] rounded animate-pulse" />
                      ))}
                    </div>
                  ) : programsQuery.isError ? (
                    <EmptyState
                      message={getErrorMessage(
                        programsQuery.error,
                        '담당 프로그램 현황을 불러오지 못했습니다.',
                      )}
                      action={<RetryButton onClick={() => programsQuery.refetch()} />}
                    />
                  ) : ownedPrograms.length === 0 ? (
                    <EmptyState message="표시할 정보가 없습니다." sub="등록된 담당 프로그램이 없습니다." />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      {ownedPrograms.slice(0, 8).map((p) => {
                        const applied = p.applicantCount ?? 0;
                        const capacity = p.capacity ?? 0;
                        const pct = capacity > 0 ? Math.round((applied / capacity) * 100) : 0;
                        const nearFull = pct >= 90;
                        return (
                          <div key={p.programId}>
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-[12px] font-semibold text-[#1F2328] truncate max-w-[220px]">
                                {p.programName}
                              </span>
                              <span
                                className={`text-[11px] font-bold ml-2 flex-shrink-0 ${nearFull ? 'text-[#CF222E]' : 'text-[#656D76]'}`}
                              >
                                {applied}/{capacity}명
                              </span>
                            </div>
                            <ProgressBar
                              value={pct}
                              color={nearFull ? '#CF222E' : '#9CA3AF'}
                              showValue
                            />
                            <div className="text-[10px] text-[#9AA0A6] mt-0.5">
                              {p.programStatusLabel ?? '-'} · 모집마감{' '}
                              {p.recruitmentEndsAt ? formatDate(p.recruitmentEndsAt) : '-'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT column */}
        <div className="flex flex-col gap-4">
          {/* 본인 상담 일정 (ST200) */}
          {canCounsel && (
            <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
                <h3 className="text-[13px] font-bold text-[#1F2328]">본인 상담 일정</h3>
                <span className="ml-auto text-[11px] text-[#9AA0A6]">
                  {new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())}
                </span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {schedulesQuery.isLoading ? (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-12 bg-[#F3F4F6] rounded animate-pulse" />
                    ))}
                  </div>
                ) : schedulesQuery.isError ? (
                  <EmptyState
                    message={getErrorMessage(schedulesQuery.error, '상담 일정을 불러오지 못했습니다.')}
                    action={<RetryButton onClick={() => schedulesQuery.refetch()} />}
                  />
                ) : todaySchedules.length === 0 ? (
                  <EmptyState message="표시할 정보가 없습니다." sub="오늘 등록된 상담 일정이 없습니다." />
                ) : (
                  todaySchedules.map((s) => (
                    <div
                      key={s.scheduleId}
                      className={`flex gap-3 p-3 rounded-[6px] border bg-[#F9FAFB] border-[#E5E7EB] ${s.status === 'CLOSED' ? 'opacity-60' : ''}`}
                    >
                      <div className="text-center flex-shrink-0">
                        <div className="text-[14px] font-black text-[#374151]">
                          {new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date(s.startsAt))}
                        </div>
                        {s.hasReservation && (
                          <div className="text-[9px] font-bold text-[#059669]">예약있음</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold leading-snug text-[#1F2328]">
                          {s.hasReservation ? '배정된 상담' : '예약 가능 일정'}
                        </p>
                        <p className="text-[10px] text-[#9AA0A6] mt-0.5">{s.location ?? '장소 미정'}</p>
                      </div>
                    </div>
                  ))
                )}
                <button
                  onClick={() => navigate('/staff/counsel')}
                  className="text-[11px] text-[#374151] font-bold text-center hover:underline"
                >
                  전체 일정 보기 →
                </button>
              </div>
            </div>
          )}

          {/* 최근 공지 (전체 교직원) */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-[#656D76]" />
              <h3 className="text-[13px] font-bold text-[#1F2328]">최근 공지</h3>
            </div>
            {noticesQuery.isLoading ? (
              <div className="p-4 flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-[#F3F4F6] rounded animate-pulse" />
                ))}
              </div>
            ) : noticesQuery.isError ? (
              <div className="p-4">
                <EmptyState
                  message={getErrorMessage(noticesQuery.error, '공지사항을 불러오지 못했습니다.')}
                  action={<RetryButton onClick={() => noticesQuery.refetch()} />}
                />
              </div>
            ) : (noticesQuery.data?.content ?? []).length === 0 ? (
              <div className="p-4">
                <EmptyState message="표시할 정보가 없습니다." sub="등록된 공지사항이 없습니다." />
              </div>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {noticesQuery.data.content.map((n) => (
                  <button
                    key={n.postId}
                    onClick={() => navigate('/staff/boards')}
                    className="w-full flex items-start gap-2.5 px-4 py-3 hover:bg-[#F9FAFB] transition-colors text-left"
                  >
                    {n.pinned ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E] flex-shrink-0 mt-0.5">
                        고정
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E5E7EB] flex-shrink-0 mt-1.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#1F2328] leading-snug truncate">
                        {n.title}
                      </p>
                      <p className="text-[10px] text-[#9AA0A6] mt-0.5">
                        {n.publishedAt ? formatDate(n.publishedAt) : n.postStatusLabel}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="px-4 py-2.5 border-t border-[#F3F4F6]">
              <button
                onClick={() => navigate('/staff/boards')}
                className="text-[11px] text-[#374151] font-bold hover:underline w-full text-center"
              >
                공지 관리 →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
