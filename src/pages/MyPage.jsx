import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROGRAMS, COMPETENCY_SCORES, CURRENT_USER, SEMESTERS } from '@/data/dummy';
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

/** 카드별로 독립적인 로딩 지연을 흉내내는 훅. 실제 API 연동 시 react-query의 isLoading으로 대체하세요. */
function useCardLoad(delay = 800) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return loaded;
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

// ── My Competency card ────────────────────────────────────────────────────────

const COMP_COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#CF222E'];

function MyCompetencyCard({ hasDiagnosis, onNavigate }) {
  const loaded = useCardLoad(600);
  return (
    <CardShell
      title="나의 핵심역량"
      accent="#7C3AED"
      action={{ label: '전체보기', onClick: () => onNavigate('competency') }}
    >
      {!loaded ? (
        <SkeletonLoader rows={4} cols={3} />
      ) : !hasDiagnosis ? (
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
      ) : (
        <div className="flex gap-4">
          {/* Radar */}
          <div className="flex-shrink-0 -ml-2 -mt-2">
            <RadarChart
              labels={COMPETENCY_SCORES.labels}
              values={COMPETENCY_SCORES.current}
              compareValues={COMPETENCY_SCORES.average}
              color="#7C3AED"
              size={240}
            />
            <div className="flex items-center gap-4 justify-center mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded bg-[#7C3AED]" />
                <span className="text-[11px] text-[#656D76]">나의 역량</span>
              </div>
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
                <span className="text-[11px] text-[#656D76]">전체 평균</span>
              </div>
            </div>
          </div>

          {/* Bar list */}
          <div className="flex-1 flex flex-col justify-center gap-2.5 min-w-0">
            {COMPETENCY_SCORES.labels.map((label, i) => {
              const val = COMPETENCY_SCORES.current[i];
              const avg = COMPETENCY_SCORES.average[i];
              const isLowest = val === Math.min(...COMPETENCY_SCORES.current);
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[12px] font-semibold truncate ${isLowest ? 'text-[#CF222E]' : 'text-[#1F2328]'}`}
                    >
                      {label} {isLowest && <span className="text-[10px]">▼최저</span>}
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
                        background: isLowest ? '#CF222E' : COMP_COLORS[i],
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-[#9AA0A6] mt-0.5">평균 {avg}점</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Buttons */}
      {loaded && hasDiagnosis && (
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

function RecommendedProgramsCard({ onNavigate }) {
  const loaded = useCardLoad(900);
  const recs = PROGRAMS.filter((p) => p.competency === '글로벌' || p.status === '모집중').slice(
    0,
    3,
  );

  return (
    <CardShell
      title="추천 비교과 프로그램"
      accent="#2563EB"
      action={{ label: '전체보기', onClick: () => onNavigate('extracurr') }}
    >
      {!loaded ? (
        <SkeletonLoader rows={3} cols={4} />
      ) : (
        <>
          {/* Banner */}
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
              <strong>글로벌 역량이 가장 낮습니다 (52점).</strong>
              <br />
              아래 프로그램으로 역량을 키워보세요.
            </p>
          </div>

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
                {recs.map((p, i) => {
                  const deadline = p.period.split(' ~ ')[1] ?? p.period;
                  const daysLeft = Math.ceil(
                    (new Date(deadline).getTime() - Date.now()) / 86400000,
                  );
                  return (
                    <tr
                      key={p.id}
                      className={`border-t border-[#F3F4F6] hover:bg-[#F9FAFB] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : ''}`}
                    >
                      <td className="px-3 py-2.5 text-[#1F2328] font-semibold">{p.name}</td>
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                          {p.competency}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span
                          className={`text-[11px] font-bold ${daysLeft <= 3 ? 'text-[#CF222E]' : daysLeft <= 7 ? 'text-[#D97706]' : 'text-[#6E7781]'}`}
                        >
                          {daysLeft > 0 ? `D-${daysLeft}` : '마감'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-[#D97706]">
                        {p.credit * 30}점
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

const MY_APPLICATIONS = [
  { name: '진로탐색 워크숍', status: '신청', period: '2026-03-10 ~ 03-14' },
  { name: '독서인증제', status: '진행중', period: '2026-03-01 ~ 06-30' },
  { name: '영어 프레젠테이션 클리닉', status: '수료', period: '2026-01-15 ~ 02-28' },
];

function MyApplicationsCard({ onNavigate }) {
  const loaded = useCardLoad(1100);
  return (
    <CardShell
      title="나의 신청 현황"
      accent="#2563EB"
      action={{ label: '전체보기', onClick: () => onNavigate('extracurr') }}
    >
      {!loaded ? (
        <SkeletonLoader rows={3} cols={3} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-[#F6F8FA] text-[#656D76] uppercase text-[11px] tracking-wide">
                <th className="text-left px-3 py-2 font-semibold">프로그램명</th>
                <th className="text-center px-2 py-2 font-semibold">상태</th>
                <th className="text-right px-3 py-2 font-semibold">일정</th>
              </tr>
            </thead>
            <tbody>
              {MY_APPLICATIONS.map((a, i) => (
                <tr
                  key={i}
                  className={`border-t border-[#F3F4F6] hover:bg-[#F9FAFB] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : ''}`}
                >
                  <td className="px-3 py-2.5 font-semibold text-[#1F2328]">{a.name}</td>
                  <td className="px-2 py-2.5 text-center">
                    <StatusBadge status={a.status} size="sm" />
                  </td>
                  <td className="px-3 py-2.5 text-right text-[#656D76]">{a.period}</td>
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

function CounselingCard({ onNavigate }) {
  const loaded = useCardLoad(750);
  return (
    <CardShell
      title="상담 예약 현황"
      accent="#0891B2"
      action={{ label: '전체보기', onClick: () => onNavigate('counseling') }}
    >
      {!loaded ? (
        <SkeletonLoader rows={2} cols={3} />
      ) : (
        <div>
          {/* Upcoming counseling */}
          <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-[8px] px-4 py-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0891B2]" />
                <span className="text-[13px] font-bold text-[#0891B2]">예정된 상담</span>
              </div>
              <StatusBadge status="신청" size="sm" />
            </div>
            <div className="flex flex-col gap-1.5 text-[12px]">
              {[
                { label: '일시', value: '2026-08-20 (목) 14:00 ~ 15:00' },
                { label: '상담사', value: '박상담 (전문상담사)' },
                { label: '장소', value: '학생상담센터 301호' },
                { label: '유형', value: '진로·취업 상담' },
              ].map((r) => (
                <div key={r.label} className="flex gap-2">
                  <span className="text-[#9AA0A6] w-12 flex-shrink-0">{r.label}</span>
                  <span className="text-[#1F2328] font-semibold">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 h-7 text-[12px] font-semibold text-[#0891B2] border border-[#0891B2] rounded-[5px] hover:bg-[#E0F2FE] transition-colors">
                예약 변경
              </button>
              <button className="h-7 px-3 text-[12px] font-semibold text-[#CF222E] border border-[#FECACA] rounded-[5px] hover:bg-[#FEF2F2] transition-colors">
                취소
              </button>
            </div>
          </div>
          <button
            onClick={() => onNavigate('counseling')}
            className="w-full mt-3 h-8 text-[12px] font-semibold text-[#0891B2] border border-[#BAE6FD] rounded-[6px] hover:bg-[#F0F9FF] transition-colors"
          >
            + 새 상담 예약
          </button>
        </div>
      )}
    </CardShell>
  );
}

// ── Announcements card ────────────────────────────────────────────────────────

const NOTICES = [
  {
    id: 1,
    type: '공지',
    title: '2026학년도 1학기 비교과 프로그램 운영 안내',
    date: '2026-03-05',
    hot: true,
  },
  {
    id: 2,
    type: '공지',
    title: '핵심역량 진단 시스템 사전 진단 신청 기간 안내',
    date: '2026-03-03',
    hot: true,
  },
  {
    id: 3,
    type: '공지',
    title: '학생상담센터 2026학년도 1학기 운영 시간 변경 안내',
    date: '2026-02-28',
    hot: false,
  },
  {
    id: 4,
    type: '안내',
    title: '마일리지 이의신청 절차 및 기간 안내',
    date: '2026-02-25',
    hot: false,
  },
  {
    id: 5,
    type: '취업',
    title: '(주)삼성SDS 소프트웨어 개발 인턴 채용 설명회 안내',
    date: '2026-02-20',
    hot: false,
  },
];

const NOTICE_TYPE_COLORS = {
  공지: 'bg-[#DBEAFE] text-[#0969DA]',
  안내: 'bg-[#F3F4F6] text-[#6E7781]',
  취업: 'bg-[#DCFCE7] text-[#1A7F37]',
};

function NoticesCard({ onNavigate }) {
  const loaded = useCardLoad(650);
  return (
    <CardShell
      title="공지사항"
      accent="#6B7280"
      action={{ label: '전체보기', onClick: () => onNavigate('notice') }}
    >
      {!loaded ? (
        <SkeletonLoader rows={5} cols={3} />
      ) : (
        <div className="flex flex-col">
          {NOTICES.map((n, i) => (
            <div
              key={n.id}
              className={`flex items-center gap-2.5 py-2.5 cursor-pointer hover:bg-[#F9FAFB] px-1 rounded transition-colors ${i < NOTICES.length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}
            >
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${NOTICE_TYPE_COLORS[n.type] ?? 'bg-[#F3F4F6] text-[#6E7781]'}`}
              >
                {n.type}
              </span>
              {n.hot && (
                <span className="text-[10px] font-bold text-[#CF222E] flex-shrink-0">NEW</span>
              )}
              <span className="text-[13px] text-[#1F2328] truncate flex-1">{n.title}</span>
              <span className="text-[11px] text-[#9AA0A6] flex-shrink-0">{n.date}</span>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

// ── Main MyPage ───────────────────────────────────────────────────────────────

/**
 * 학생 포털 랜딩 화면. 마일리지/역량/신청현황/상담/공지를 카드로 요약해서 보여줍니다.
 * 각 카드는 dummy.js의 목업 데이터로 채워져 있으니, 도메인별 API가 준비되는 대로
 * react-query 훅으로 교체하세요 (dummy.js 상단 주석 참고).
 */
export default function MyPage() {
  const navigate = useNavigate();
  const onNavigate = (key) => navigate(NAV_PATH[key] ?? '/my');

  const [semester, setSemester] = useState(SEMESTERS[1] ?? SEMESTERS[0]);
  const [hasDiagnosis] = useState(true); // false로 바꾸면 EmptyState 확인 가능
  const statsLoaded = useCardLoad(400);

  return (
    <div className="min-h-full">
      {/* Page header */}
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '마이페이지' }]}
        title=""
        accentColor="#2563EB"
      />

      {/* Greeting row */}
      <div className="flex items-center justify-between mb-6 -mt-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1F2328] leading-tight">
            안녕하세요, <span className="text-[#2563EB]">{CURRENT_USER.name}</span> 님 👋
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[12px] text-[#656D76]">{CURRENT_USER.studentId}</span>
            <span className="text-[#E5E7EB]">·</span>
            <span className="text-[12px] font-semibold text-[#1F2328]">
              {CURRENT_USER.department}
            </span>
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB]">
              {CURRENT_USER.grade}학년
            </span>
            <StatusBadge status={CURRENT_USER.status} size="sm" />
          </div>
        </div>
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="h-9 px-3 pr-8 text-[13px] font-semibold text-[#1F2328] bg-white border border-[#E5E7EB] rounded-[6px] appearance-none focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] cursor-pointer"
        >
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        {!statsLoaded ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[8px] border border-[#E5E7EB] h-28 animate-pulse"
            />
          ))
        ) : (
          <>
            <StatTile
              label="나의 마일리지"
              value="1,250"
              sub="골드 등급 · 인증까지 250점"
              accentColor="#D97706"
              trend={{ value: '+80점', up: true }}
              icon={<span className="text-[18px]">🏅</span>}
            />
            <StatTile
              label="핵심역량 평균"
              value="72.4점"
              sub="전체 평균 68.1 · 상위 32%"
              accentColor="#7C3AED"
              trend={{ value: '+4.3', up: true }}
              icon={<span className="text-[18px]">⭐</span>}
            />
            <StatTile
              label="비교과 수료"
              value="6건"
              sub="신청 8 · 진행중 2"
              accentColor="#2563EB"
              icon={<span className="text-[18px]">📋</span>}
            />
            <StatTile
              label="상담 예약"
              value="1건"
              sub="2026-08-20 14:00"
              accentColor="#0891B2"
              icon={<span className="text-[18px]">💬</span>}
            />
          </>
        )}
      </div>

      {/* Main 2-column grid */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        {/* Left — Competency */}
        <MyCompetencyCard hasDiagnosis={hasDiagnosis} onNavigate={onNavigate} />

        {/* Right — stacked */}
        <div className="flex flex-col gap-4">
          <RecommendedProgramsCard onNavigate={onNavigate} />
          <MyApplicationsCard onNavigate={onNavigate} />
        </div>
      </div>

      {/* Bottom 2-column */}
      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <CounselingCard onNavigate={onNavigate} />
        <NoticesCard onNavigate={onNavigate} />
      </div>
    </div>
  );
}
