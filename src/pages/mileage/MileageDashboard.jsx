import { useState } from 'react';
import { PageHeader, StatTile, Button, BarChart, Pagination, toast } from '@/components/common';

const ACCENT = '#D97706';

// ── Semester trend data ──
const TREND_DATA = [
  { label: '2024-2', value: 180 },
  { label: '2025-1', value: 240 },
  { label: '2025-2', value: 320 },
  { label: '2026-1', value: 430 },
];

// ── Competency distribution ──
const COMP_DATA = [
  { label: '자기관리', value: 85 },
  { label: '의사소통', value: 60 },
  { label: '글로벌', value: 45 },
  { label: '대인관계', value: 92 },
  { label: '종합사고', value: 70 },
  { label: '자원정보', value: 55 },
];

// ── Ledger records ──
const LEDGER = [
  {
    id: '1050',
    date: '2026-08-12',
    source: '비교과',
    name: '해외문화체험 워크숍',
    type: '문화·글로벌',
    competency: '글로벌',
    score: 200,
    policy: 'v2.1',
    processor: '김담당',
    txType: '적립',
  },
  {
    id: '1049',
    date: '2026-08-01',
    source: '비교과',
    name: '독서인증제',
    type: '자기개발',
    competency: '자기관리',
    score: 20,
    policy: 'v2.1',
    processor: '이담당',
    txType: '적립',
  },
  {
    id: '1048',
    date: '2026-07-25',
    source: '외부활동',
    name: 'TOEIC 860점',
    type: '어학',
    competency: '글로벌',
    score: 80,
    policy: 'v2.0',
    processor: '시스템',
    txType: '적립',
  },
  {
    id: '1047',
    date: '2026-07-20',
    source: '비교과',
    name: '진로탐색 워크숍',
    type: '진로',
    competency: '자기관리',
    score: 100,
    policy: 'v2.1',
    processor: '박담당',
    txType: '적립',
  },
  {
    id: '1046',
    date: '2026-07-15',
    source: '비교과',
    name: '리더십 캠프',
    type: '리더십',
    competency: '대인관계',
    score: 150,
    policy: 'v2.1',
    processor: '최담당',
    txType: '적립',
  },
  {
    id: '1045',
    date: '2026-06-30',
    source: '비교과',
    name: 'NCS 직업기초능력 특강',
    type: '역량',
    competency: '종합사고',
    score: 60,
    policy: 'v2.0',
    processor: '한담당',
    txType: '적립',
  },
  {
    id: '1044',
    date: '2026-05-20',
    source: '비교과',
    name: '캡스톤디자인 경진대회',
    type: '공모전',
    competency: '종합사고',
    score: 200,
    policy: 'v2.0',
    processor: '김담당',
    txType: '적립',
  },
  {
    id: '1043',
    date: '2026-04-10',
    source: '외부활동',
    name: '봉사활동 20시간',
    type: '봉사',
    competency: '대인관계',
    score: 60,
    policy: 'v2.0',
    processor: '시스템',
    txType: '적립',
  },
  {
    id: '1042',
    date: '2026-03-05',
    source: '비교과',
    name: '자기개발 세미나',
    type: '자기개발',
    competency: '자기관리',
    score: 80,
    policy: 'v2.0',
    processor: '이담당',
    txType: '적립',
  },
  {
    id: 'C1042',
    date: '2026-02-15',
    source: '비교과',
    name: '자기개발 세미나',
    type: '자기개발',
    competency: '자기관리',
    score: -80,
    policy: 'v2.0',
    processor: '박담당',
    txType: '취소',
    linkedId: '1042',
  },
  {
    id: '1041',
    date: '2026-02-10',
    source: '외부활동',
    name: 'OPIc IH 취득',
    type: '어학',
    competency: '글로벌',
    score: 70,
    policy: 'v1.9',
    processor: '시스템',
    txType: '적립',
  },
  {
    id: '1040',
    date: '2026-01-20',
    source: '외부활동',
    name: '정보처리기사 취득',
    type: '자격증',
    competency: '자원정보',
    score: 150,
    policy: 'v1.9',
    processor: '시스템',
    txType: '적립',
  },
];

// Ledger summary
const totalEarned = LEDGER.filter((r) => r.score > 0).reduce((s, r) => s + r.score, 0);
const totalCancelled = LEDGER.filter((r) => r.score < 0).reduce((s, r) => s + r.score, 0);
const balance = totalEarned + totalCancelled;

// Simulation recommendations
const SIM_RECS = [
  { name: '봉사활동 20시간', score: 60, period: '1~2주', key: 'R1' },
  { name: 'NCS 특강 참여', score: 60, period: '1일', key: 'R2' },
  { name: '교내 공모전 참가상', score: 80, period: '3주', key: 'R3' },
];

// ── Inline Trend Line Chart (SVG) ──
function TrendChart() {
  const W = 480;
  const H = 120;
  const PAD = { l: 36, r: 20, t: 16, b: 28 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const max = Math.max(...TREND_DATA.map((d) => d.value));
  const pts = TREND_DATA.map((d, i) => ({
    x: PAD.l + (i / (TREND_DATA.length - 1)) * cW,
    y: PAD.t + cH - (d.value / max) * cH * 0.88,
    d,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length - 1].x},${PAD.t + cH} L${pts[0].x},${PAD.t + cH} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
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
  const [simTarget, setSimTarget] = useState(1500);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const currentScore = 1250;
  const needed = Math.max(0, simTarget - currentScore);
  const paged = LEDGER.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
          <div className="grid grid-cols-3 gap-4">
            <div className="relative">
              <StatTile
                label="누적 마일리지"
                value="1,250점"
                sub="골드 등급"
                accentColor={ACCENT}
              />
              <span className="absolute top-4 right-4 text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                🥇 GOLD
              </span>
            </div>
            <StatTile label="이번 학기 적립" value="430점" sub="2026-1학기" accentColor={ACCENT} />
            <StatTile
              label="우수장학 인증까지"
              value="250점 부족"
              sub="목표 1,500점"
              accentColor="#CF222E"
            />
          </div>

          {/* Mid row: criteria table + bar chart */}
          <div className="grid gap-4" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
            {/* Criteria table */}
            <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-[#D97706]" />
                <h2 className="text-[14px] font-bold text-[#1F2328]">마일리지 인증·장학 기준</h2>
              </div>
              <table className="w-full text-[12px] border-collapse">
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
                  {[
                    { name: '장학금 신청', threshold: 1000, benefit: '200,000원', ok: true },
                    {
                      name: '우수 마일리지 장학',
                      threshold: 1500,
                      benefit: '500,000원',
                      ok: false,
                    },
                    { name: '핵심역량 인증', threshold: 1500, benefit: '인증서 발급', ok: false },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-[#F3F4F6] last:border-0 ${row.ok ? 'bg-[#F0FDF4]' : ''}`}
                    >
                      <td className="px-4 py-3 font-semibold text-[#1F2328]">{row.name}</td>
                      <td className="px-4 py-3 font-mono text-[#1F2328]">
                        {row.threshold.toLocaleString()}점
                      </td>
                      <td className="px-4 py-3 text-[#656D76]">{row.benefit}</td>
                      <td className="px-4 py-3">
                        {row.ok ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#1A7F37]">
                            가능
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                            250점 부족
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bar chart: competency distribution */}
            <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-[#D97706]" />
                <h2 className="text-[14px] font-bold text-[#1F2328]">역량별 적립 분포</h2>
                <span className="ml-auto text-[11px] text-[#9AA0A6]">단위: 점</span>
              </div>
              <div className="px-4 py-4 flex justify-center overflow-x-auto">
                <BarChart data={COMP_DATA} color={ACCENT} height={140} unit="점" />
              </div>
            </div>
          </div>

          {/* Semester trend */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-[#D97706]" />
              <h2 className="text-[14px] font-bold text-[#1F2328]">학기별 적립 추이</h2>
              <span className="ml-auto text-[11px] text-[#9AA0A6]">단위: 점</span>
            </div>
            <div className="px-6 py-4">
              <TrendChart />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ② LEDGER TAB */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'ledger' && (
        <div className="flex flex-col gap-4">
          {/* FilterBar */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 flex items-end flex-wrap gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {[
              { label: '학기', opts: ['전체', '2026-1', '2025-2', '2025-1', '2024-2'] },
              { label: '원천', opts: ['전체', '비교과', '외부활동'] },
              {
                label: '활동유형',
                opts: ['전체', '자기개발', '어학', '자격증', '봉사', '공모전', '역량'],
              },
            ].map((f) => (
              <div key={f.label} className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#656D76] uppercase">
                  {f.label}
                </label>
                <select className="h-9 px-3 pr-7 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#D97706] appearance-none">
                  {f.opts.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#656D76] uppercase">기간</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  className="h-9 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#D97706]"
                  defaultValue="2026-01-01"
                />
                <span className="text-[#9AA0A6]">~</span>
                <input
                  type="date"
                  className="h-9 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#D97706]"
                  defaultValue="2026-08-13"
                />
              </div>
            </div>
            <Button size="sm">조회</Button>
            <Button size="sm" variant="secondary">
              초기화
            </Button>
            <Button size="sm" variant="outline" className="ml-auto">
              엑셀 다운로드
            </Button>
          </div>

          {/* Ledger table */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {[
                    '적립일',
                    '원천',
                    '활동명',
                    '활동유형',
                    '연계역량',
                    '점수',
                    '정책',
                    '처리자',
                    '구분',
                  ].map((h) => (
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
                {paged.map((row, i) => {
                  const isCancelled = row.txType === '취소';
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-[#F3F4F6] last:border-0 ${isCancelled ? 'bg-[#FFF5F5]' : i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                    >
                      <td className="px-3 py-2.5 text-center text-[#9AA0A6] font-mono whitespace-nowrap">
                        {row.date}
                        {isCancelled && row.linkedId && (
                          <div className="text-[10px] text-[#CF222E] mt-0.5">
                            ↳ 원거래 #{row.linkedId}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.source === '비교과' ? 'bg-[#DBEAFE] text-[#0969DA]' : 'bg-[#F3E8FF] text-[#7C3AED]'}`}
                        >
                          {row.source}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2.5 font-semibold ${isCancelled ? 'text-[#CF222E] line-through' : 'text-[#1F2328]'}`}
                      >
                        {row.name}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[#656D76]">{row.type}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                          {row.competency}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2.5 text-center font-black ${row.score < 0 ? 'text-[#CF222E]' : 'text-[#1A7F37]'}`}
                      >
                        {row.score > 0 ? `+${row.score}` : row.score}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[11px] text-[#9AA0A6] font-mono">
                        {row.policy}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[#656D76]">{row.processor}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            isCancelled
                              ? 'bg-[#FEE2E2] text-[#CF222E]'
                              : row.txType === '정정'
                                ? 'bg-[#FEF3C7] text-[#D97706]'
                                : 'bg-[#DCFCE7] text-[#1A7F37]'
                          }`}
                        >
                          {row.txType}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* Summary row */}
                <tr className="bg-[#F6F8FA] border-t-2 border-[#E5E7EB]">
                  <td
                    colSpan={5}
                    className="px-3 py-3 text-right text-[12px] font-bold text-[#1F2328]"
                  >
                    합계
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="text-[11px] text-[#1A7F37] font-bold">+{totalEarned}</div>
                    <div className="text-[11px] text-[#CF222E] font-bold">{totalCancelled}</div>
                    <div className="text-[13px] font-black text-[#D97706] border-t border-[#E5E7EB] pt-1 mt-1">
                      ={balance}
                    </div>
                  </td>
                  <td colSpan={3} />
                </tr>
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-[#E5E7EB] flex items-center gap-3">
              <p className="text-[11px] text-[#9AA0A6]">
                ※ 취소·정정 건은 삭제되지 않고 별도 거래로 표시됩니다.
              </p>
              <div className="ml-auto">
                <Pagination
                  page={page}
                  totalPages={Math.ceil(LEDGER.length / PAGE_SIZE)}
                  onChange={setPage}
                  totalItems={LEDGER.length}
                  pageSize={PAGE_SIZE}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ③ SIMULATION TAB */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'simulation' && (
        <div className="max-w-[760px] flex flex-col gap-5">
          {/* Target input */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-4 rounded-full bg-[#D97706]" />
              <h2 className="text-[14px] font-bold text-[#1F2328]">목표 점수 설정</h2>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-[13px] text-[#656D76] w-20 flex-shrink-0">목표 점수</span>
              <input
                type="range"
                min={currentScore}
                max={2000}
                step={50}
                value={simTarget}
                onChange={(e) => setSimTarget(Number(e.target.value))}
                className="flex-1 accent-[#D97706]"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={simTarget}
                  min={currentScore}
                  max={2000}
                  step={50}
                  onChange={(e) =>
                    setSimTarget(Math.max(currentScore, Math.min(2000, Number(e.target.value))))
                  }
                  className="w-20 h-9 px-2 text-center text-[14px] font-black text-[#D97706] border-2 border-[#D97706] rounded-[6px] focus:outline-none"
                />
                <span className="text-[13px] text-[#656D76]">점</span>
              </div>
            </div>

            {/* Result bar */}
            <div className="bg-[#F9FAFB] rounded-[8px] p-4 mb-4">
              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-[#656D76]">현재 마일리지</span>
                <span className="font-black text-[#D97706]">{currentScore.toLocaleString()}점</span>
              </div>
              <div className="h-3 bg-[#E5E7EB] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (currentScore / simTarget) * 100)}%`,
                    background: ACCENT,
                  }}
                />
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#656D76]">목표까지 부족</span>
                <span
                  className={`font-black ${needed === 0 ? 'text-[#1A7F37]' : 'text-[#CF222E]'}`}
                >
                  {needed === 0 ? '✓ 달성!' : `-${needed}점`}
                </span>
              </div>
            </div>

            {/* Preset buttons */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-[12px] text-[#9AA0A6] self-center">빠른 선택:</span>
              {[
                { label: '장학금 신청 1,000점', val: 1000 },
                { label: '우수장학 1,500점', val: 1500 },
                { label: '핵심역량 인증 1,500점', val: 1500 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => setSimTarget(p.val)}
                  className={`h-7 px-3 text-[11px] font-bold rounded-[20px] border transition-colors ${simTarget === p.val ? 'border-[#D97706] bg-[#FEF3C7] text-[#D97706]' : 'border-[#E5E7EB] text-[#656D76] hover:border-[#D97706] hover:text-[#D97706]'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recommendation cards */}
          {needed > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-[#1F2328] mb-3">
                <span className="text-[#D97706]">{needed}점</span> 부족분 채우기 — 추천 활동
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {SIM_RECS.map((r) => (
                  <div
                    key={r.key}
                    className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-4 flex flex-col gap-3"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-[#1F2328] mb-1">{r.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                          +{r.score}점
                        </span>
                        <span className="text-[10px] text-[#9AA0A6]">⏱ {r.period}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toast(`${r.name} 신청 페이지로 이동합니다.`, 'info')}
                      className="h-8 rounded-[6px] text-[12px] font-bold text-white transition-colors"
                      style={{ background: ACCENT }}
                    >
                      신청하기
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {needed === 0 && (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[20px]">
                🎉
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#14532D]">목표 달성 완료!</p>
                <p className="text-[12px] text-[#1A7F37]">
                  현재 마일리지로 선택한 기준을 충족합니다. 장학금 신청 또는 인증서를 발급받으세요.
                </p>
              </div>
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
    </div>
  );
}
