import { useState } from 'react';
import {
  PageHeader,
  StatTile,
  Tabs,
  Button,
  ProgressBar,
  DonutChart,
  toast,
} from '@/components/common';

// ─── Dummy data ───────────────────────────────────────────────────────────────

const WORK_TABS = [
  { key: '비교과신청', label: '비교과 신청 심사', count: 12 },
  { key: '마일리지증빙', label: '마일리지 증빙 심사', count: 8 },
  { key: '상담예약', label: '상담 예약 승인', count: 2 },
  { key: '구인신청', label: '구인 신청 검수', count: 1 },
];

const WORK_ITEMS = [
  // 비교과신청
  {
    id: 'W001',
    receivedAt: '2026-08-10',
    type: '비교과신청',
    target: '홍길동 (20231234)',
    targetType: '학생',
    content: '해외문화체험 워크숍 개인 신청',
    elapsedDays: 3,
  },
  {
    id: 'W002',
    receivedAt: '2026-08-11',
    type: '비교과신청',
    target: '김영희 (20231111)',
    targetType: '학생',
    content: '캡스톤디자인 경진대회 그룹 신청',
    elapsedDays: 2,
  },
  {
    id: 'W003',
    receivedAt: '2026-08-12',
    type: '비교과신청',
    target: '이민수 (20230777)',
    targetType: '학생',
    content: '리더십 캠프 개인 신청',
    elapsedDays: 1,
  },
  {
    id: 'W004',
    receivedAt: '2026-08-09',
    type: '비교과신청',
    target: '박철수 (20241002)',
    targetType: '학생',
    content: '진로탐색 워크숍 개인 신청',
    elapsedDays: 4,
  },
  {
    id: 'W005',
    receivedAt: '2026-08-08',
    type: '비교과신청',
    target: '최지수 (20232050)',
    targetType: '학생',
    content: '영어 프레젠테이션 클리닉 신청',
    elapsedDays: 5,
  },
  {
    id: 'W006',
    receivedAt: '2026-08-11',
    type: '비교과신청',
    target: '정하준 (20231876)',
    targetType: '학생',
    content: '독서인증제 참여 신청',
    elapsedDays: 2,
  },
  {
    id: 'W007',
    receivedAt: '2026-08-12',
    type: '비교과신청',
    target: '오수빈 (20240345)',
    targetType: '학생',
    content: 'NCS 직업기초능력 특강 신청',
    elapsedDays: 1,
  },
  {
    id: 'W008',
    receivedAt: '2026-08-10',
    type: '비교과신청',
    target: '윤태양 (20231654)',
    targetType: '학생',
    content: '빅데이터 분석 워크숍 신청',
    elapsedDays: 3,
  },
  {
    id: 'W009',
    receivedAt: '2026-08-09',
    type: '비교과신청',
    target: '임채원 (20230912)',
    targetType: '학생',
    content: '해외봉사 프로그램 신청',
    elapsedDays: 4,
  },
  {
    id: 'W010',
    receivedAt: '2026-08-11',
    type: '비교과신청',
    target: '강다은 (20232200)',
    targetType: '학생',
    content: '창업 아이디어 경진대회 신청',
    elapsedDays: 2,
  },
  {
    id: 'W011',
    receivedAt: '2026-08-12',
    type: '비교과신청',
    target: '송민준 (20231390)',
    targetType: '학생',
    content: '자격증 취득 지원 신청',
    elapsedDays: 1,
  },
  {
    id: 'W012',
    receivedAt: '2026-08-07',
    type: '비교과신청',
    target: '한소율 (20240799)',
    targetType: '학생',
    content: '멘토링 프로그램 신청',
    elapsedDays: 6,
  },
  // 마일리지증빙
  {
    id: 'M001',
    receivedAt: '2026-08-10',
    type: '마일리지증빙',
    target: '홍길동 (20231234)',
    targetType: '학생',
    content: 'TOEIC 860점 어학 증빙 (80점)',
    elapsedDays: 3,
  },
  {
    id: 'M002',
    receivedAt: '2026-08-11',
    type: '마일리지증빙',
    target: '김영희 (20231111)',
    targetType: '학생',
    content: '봉사활동 40시간 증빙 (120점)',
    elapsedDays: 2,
  },
  {
    id: 'M003',
    receivedAt: '2026-08-09',
    type: '마일리지증빙',
    target: '이민수 (20230777)',
    targetType: '학생',
    content: '정보처리기사 자격증 (150점)',
    elapsedDays: 4,
  },
  {
    id: 'M004',
    receivedAt: '2026-08-08',
    type: '마일리지증빙',
    target: '박철수 (20241002)',
    targetType: '학생',
    content: '교외 공모전 수상(최우수) (200점)',
    elapsedDays: 5,
  },
  {
    id: 'M005',
    receivedAt: '2026-08-12',
    type: '마일리지증빙',
    target: '최지수 (20232050)',
    targetType: '학생',
    content: 'OPIc IH 어학 증빙 (70점)',
    elapsedDays: 1,
  },
  {
    id: 'M006',
    receivedAt: '2026-08-11',
    type: '마일리지증빙',
    target: '정하준 (20231876)',
    targetType: '학생',
    content: 'AWS SAA 자격증 증빙 (80점)',
    elapsedDays: 2,
  },
  {
    id: 'M007',
    receivedAt: '2026-08-10',
    type: '마일리지증빙',
    target: '오수빈 (20240345)',
    targetType: '학생',
    content: '봉사활동 20시간 증빙 (60점)',
    elapsedDays: 3,
  },
  {
    id: 'M008',
    receivedAt: '2026-08-09',
    type: '마일리지증빙',
    target: '윤태양 (20231654)',
    targetType: '학생',
    content: 'TOEIC Speaking 130점 (60점)',
    elapsedDays: 4,
  },
  // 상담예약
  {
    id: 'C001',
    receivedAt: '2026-08-12',
    type: '상담예약',
    target: '홍길동 (20231234)',
    targetType: '학생',
    content: '지도교수 진로·역량 상담 신청 — 2026-08-20 14:00',
    elapsedDays: 1,
  },
  {
    id: 'C002',
    receivedAt: '2026-08-11',
    type: '상담예약',
    target: '박철수 (20241002)',
    targetType: '학생',
    content: '상담센터 개인상담 신청 — 2026-08-22 10:00',
    elapsedDays: 2,
  },
  // 구인신청
  {
    id: 'J001',
    receivedAt: '2026-08-09',
    type: '구인신청',
    target: '(주)테크노바',
    targetType: '기업',
    content: '소프트웨어 개발자 (신입/경력) 공고 검수',
    elapsedDays: 4,
  },
];

// 업무유형 구분은 색상 대신 명도 단계(그레이스케일)로 표시합니다.
const TYPE_COLORS = {
  비교과신청: '#1F2937',
  마일리지증빙: '#4B5563',
  상담예약: '#6B7280',
  구인신청: '#9CA3AF',
};

// ─── Today's schedule ────────────────────────────────────────────────────────

const TODAY_SCHEDULE = [
  {
    time: '10:00',
    title: '홍길동 — 지도교수 진로 상담',
    location: '산학협력관 305호',
    type: '상담',
    done: true,
  },
  {
    time: '14:00',
    title: '박철수 — 역량진단 사전 상담',
    location: '학생지원팀 201호',
    type: '상담',
    done: false,
  },
];

// ─── Running programs ────────────────────────────────────────────────────────

// 개별 프로그램은 색상으로 구분하지 않고, 정원 임박 여부만 강조합니다(렌더링부에서 처리).
const PROGRAMS = [
  { name: '해외문화체험 워크숍', applied: 20, capacity: 30, deadline: '2026-08-16' },
  { name: '진로탐색 워크숍', applied: 15, capacity: 20, deadline: '2026-08-19' },
  { name: '리더십 캠프', applied: 28, capacity: 30, deadline: '2026-08-20' },
  { name: '독서인증제', applied: 42, capacity: 50, deadline: '2026-09-01' },
  { name: 'NCS 직업기초 특강', applied: 18, capacity: 25, deadline: '2026-08-25' },
  { name: '빅데이터 분석 워크숍', applied: 12, capacity: 15, deadline: '2026-08-22' },
  { name: '창업 아이디어 경진대회', applied: 8, capacity: 20, deadline: '2026-08-30' },
];

// ─── Semester summary ────────────────────────────────────────────────────────

const NOTICES = [
  { title: '2026-1학기 비교과 수료 처리 마감 안내', date: '2026-08-10', urgent: true },
  { title: '핵심역량 진단 결과 일괄 열람 개시', date: '2026-08-08', urgent: false },
  { title: '마일리지 정책 v2.1 시행 공지', date: '2026-08-05', urgent: false },
  { title: '교직원 포털 UI 개편 안내', date: '2026-08-01', urgent: false },
];

// ─── Donut chart colors ───────────────────────────────────────────────────────

const COMPLETION_DATA = [
  { label: '수료', value: 82, color: '#059669' },
  { label: '미수료', value: 11, color: '#E5E7EB' },
  { label: '진행중', value: 7, color: '#D97706' },
];

// ─── Work item row ────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {typeof WORK_ITEMS[0]} props.item
 * @param {(id: string) => void} props.onProcess
 */
function WorkRow({ item, onProcess }) {
  const urgent = item.elapsedDays >= 3;
  return (
    <tr
      className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors ${urgent ? 'bg-[#FFFBEB]' : 'bg-white'}`}
    >
      <td className="pl-0 pr-3 py-3 w-1">
        {urgent && (
          <div className="w-0.5 h-full min-h-[36px] rounded-r-full bg-[#D97706] absolute left-0 top-0" />
        )}
      </td>
      <td className="px-3 py-3 text-center font-mono text-[11px] text-[#9AA0A6] whitespace-nowrap">
        {item.receivedAt}
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
          {item.elapsedDays}일
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <button
          onClick={() => onProcess(item.id)}
          className="h-6 px-3 text-[11px] font-bold rounded-[5px] text-white transition-colors hover:opacity-90"
          style={{ background: TYPE_COLORS[item.type] }}
        >
          처리하기
        </button>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * 교직원 포털 랜딩 화면. 학생 포털의 MyPage와 대응되는 업무 대시보드로,
 * 처리 대기 업무·오늘 일정·운영 프로그램·최근 공지를 한 화면에 모아 보여줍니다.
 */
export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState('비교과신청');
  const [processedIds, setProcessedIds] = useState(new Set());

  const tabItems = WORK_ITEMS.filter((w) => w.type === activeTab && !processedIds.has(w.id));

  const handleProcess = (id) => {
    setProcessedIds((prev) => new Set([...prev, id]));
    toast('처리 완료로 표시되었습니다.', 'success');
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '교직원 포털' }, { label: '업무 대시보드' }]}
        title="업무 대시보드"
        subtitle={`김담당 · 비교과운영부서 · ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}`}
        accentColor="#374151"
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast('보고서를 생성합니다.', 'info')}
            >
              보고서 출력
            </Button>
            <Button
              size="sm"
              style={{ background: '#374151' }}
              onClick={() => toast('공지를 등록합니다.', 'info')}
            >
              공지 등록
            </Button>
          </div>
        }
      />

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatTile
          label="처리 대기"
          value="23건"
          sub="즉시 처리 필요"
          accentColor="#D97706"
          trend={{ value: '어제 대비 +3', up: true }}
        />
        <StatTile label="오늘 상담" value="2건" sub="14:00 다음 예정" accentColor="#374151" />
        <StatTile label="운영중 프로그램" value="7개" sub="2026-1학기" accentColor="#374151" />
        <StatTile
          label="이번 달 수료 처리"
          value="142건"
          sub="8월 누계"
          accentColor="#059669"
          trend={{ value: '지난달 대비 +18', up: true }}
        />
      </div>

      {/* ── Main content: pending list + right column ── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 300px' }}>
        {/* LEFT: Pending work list */}
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Card header */}
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-[#D97706]" />
              <h2 className="text-[15px] font-bold text-[#1F2328]">처리 대기 목록</h2>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E] ml-1">
                {23 - processedIds.size}건
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-[#9AA0A6] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#D97706] inline-block" />
                  3일 이상 경과
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast('일괄 처리 화면으로 이동합니다.', 'info')}
                >
                  일괄 처리
                </Button>
              </div>
            </div>

            {/* Work type tabs */}
            <div className="px-5 pt-3 pb-0">
              <Tabs
                tabs={WORK_TABS.map((t) => ({
                  key: t.key,
                  label: (
                    <span className="flex items-center gap-1.5">
                      {t.label}
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-[#374151] text-white' : 'bg-[#E5E7EB] text-[#9AA0A6]'}`}
                      >
                        {t.count -
                          [...processedIds].filter(
                            (id) => WORK_ITEMS.find((w) => w.id === id)?.type === t.key,
                          ).length}
                      </span>
                    </span>
                  ),
                }))}
                active={activeTab}
                onChange={setActiveTab}
                accentColor="#374151"
              />
            </div>

            {/* Table */}
            <div className="relative overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                    <th className="w-1 px-0 py-0" />
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
                <tbody className="relative">
                  {tabItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-[12px] text-[#9AA0A6]">
                        모든 항목이 처리되었습니다. ✓
                      </td>
                    </tr>
                  ) : (
                    tabItems
                      .slice(0, 8)
                      .map((item) => (
                        <WorkRow key={item.id} item={item} onProcess={handleProcess} />
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {tabItems.length > 8 && (
              <div className="px-5 py-3 border-t border-[#E5E7EB] text-center">
                <button className="text-[12px] text-[#374151] font-bold hover:underline">
                  +{tabItems.length - 8}건 더 보기
                </button>
              </div>
            )}
          </div>

          {/* ── Bottom: semester summary ── */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full bg-[#374151]" />
              <h2 className="text-[14px] font-bold text-[#1F2328]">이번 학기 운영 요약</h2>
              <span className="text-[11px] text-[#9AA0A6] ml-1">2026학년도 1학기</span>
            </div>
            <div className="grid grid-cols-4 gap-5 items-center">
              {/* Numbers */}
              <div className="flex flex-col gap-4">
                {[
                  { label: '프로그램 개설', value: '24개', color: '#374151' },
                  { label: '총 참여 학생', value: '1,284명', color: '#374151' },
                  { label: '총 수료 처리', value: '1,062건', color: '#059669' },
                  { label: '평균 만족도', value: '4.3 / 5.0', color: '#D97706' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: s.color }}
                    />
                    <div className="flex-1">
                      <div className="text-[11px] text-[#9AA0A6]">{s.label}</div>
                      <div className="text-[16px] font-black" style={{ color: s.color }}>
                        {s.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Donut chart */}
              <div className="flex flex-col items-center gap-2 col-span-2">
                <div className="text-[12px] font-bold text-[#1F2328] mb-1">평균 수료율</div>
                <DonutChart segments={COMPLETION_DATA} size={140} centerValue="82%" />
                <div className="flex gap-4 text-[11px]">
                  {COMPLETION_DATA.map((d) => (
                    <div key={d.label} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-[#656D76]">{d.label}</span>
                      <span className="font-bold text-[#1F2328]">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Satisfaction bar */}
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold text-[#1F2328] mb-1">유형별 만족도</div>
                {[
                  { name: '진로·역량', score: 4.5 },
                  { name: '문화·글로벌', score: 4.3 },
                  { name: '리더십', score: 4.1 },
                  { name: '봉사', score: 3.9 },
                ].map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#656D76]">{s.name}</span>
                      <span className="font-bold text-[#1F2328]">{s.score}</span>
                    </div>
                    <ProgressBar value={(s.score / 5) * 100} color="#D97706" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div className="flex flex-col gap-4">
          {/* Today's schedule */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-[#374151]" />
              <h3 className="text-[13px] font-bold text-[#1F2328]">오늘의 일정</h3>
              <span className="ml-auto text-[11px] text-[#9AA0A6]">2026-08-13 (수)</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {TODAY_SCHEDULE.map((s, i) => (
                <div
                  key={i}
                  className={`flex gap-3 p-3 rounded-[6px] border ${s.done ? 'bg-[#F9FAFB] border-[#E5E7EB] opacity-60' : 'bg-[#F9FAFB] border-[#E5E7EB]'}`}
                >
                  <div className="text-center flex-shrink-0">
                    <div
                      className={`text-[14px] font-black ${s.done ? 'text-[#9AA0A6] line-through' : 'text-[#374151]'}`}
                    >
                      {s.time}
                    </div>
                    {s.done && <div className="text-[9px] font-bold text-[#059669]">완료</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[12px] font-bold leading-snug ${s.done ? 'text-[#9AA0A6]' : 'text-[#1F2328]'}`}
                    >
                      {s.title}
                    </p>
                    <p className="text-[10px] text-[#9AA0A6] mt-0.5">{s.location}</p>
                  </div>
                </div>
              ))}
              <button className="text-[11px] text-[#374151] font-bold text-center hover:underline">
                전체 일정 보기 →
              </button>
            </div>
          </div>

          {/* Running programs */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-[#374151]" />
              <h3 className="text-[13px] font-bold text-[#1F2328]">운영중 프로그램</h3>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">
                7개
              </span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {PROGRAMS.map((p) => {
                const pct = Math.round((p.applied / p.capacity) * 100);
                const nearFull = pct >= 90;
                return (
                  <div key={p.name}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[12px] font-semibold text-[#1F2328] truncate max-w-[160px]">
                        {p.name}
                      </span>
                      <span
                        className={`text-[11px] font-bold ml-2 flex-shrink-0 ${nearFull ? 'text-[#CF222E]' : 'text-[#656D76]'}`}
                      >
                        {p.applied}/{p.capacity}명
                      </span>
                    </div>
                    <ProgressBar value={pct} color={nearFull ? '#CF222E' : '#9CA3AF'} showValue />
                    <div className="text-[10px] text-[#9AA0A6] mt-0.5">마감 {p.deadline}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent notices */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-[#656D76]" />
              <h3 className="text-[13px] font-bold text-[#1F2328]">최근 공지</h3>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {NOTICES.map((n, i) => (
                <button
                  key={i}
                  onClick={() => toast(`공지 상세를 엽니다: ${n.title}`, 'info')}
                  className="w-full flex items-start gap-2.5 px-4 py-3 hover:bg-[#F9FAFB] transition-colors text-left"
                >
                  {n.urgent ? (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E] flex-shrink-0 mt-0.5">
                      중요
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E5E7EB] flex-shrink-0 mt-1.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#1F2328] leading-snug truncate">
                      {n.title}
                    </p>
                    <p className="text-[10px] text-[#9AA0A6] mt-0.5">{n.date}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-[#F3F4F6]">
              <button className="text-[11px] text-[#374151] font-bold hover:underline w-full text-center">
                공지 관리 →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
