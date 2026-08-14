import { useRef, useState } from 'react';
import {
  BarChart,
  Button,
  ConfirmDialog,
  DonutChart,
  Drawer,
  Modal,
  StatTile,
  Tabs,
  toast,
} from '@/components/common';

const ACCENT = '#7C3AED';

// ─── Static data ──────────────────────────────────────────────────────────────

const INITIAL_ROUNDS = [
  {
    id: 'D2026-1-PRE',
    name: '2026-1 핵심역량 사전진단',
    year: '2026',
    semester: '1학기',
    type: '사전',
    startDate: '2026-03-10',
    endDate: '2026-03-24',
    target: '재학생 전체',
    respondents: 1842,
    capacity: 2100,
    status: '결과공개',
  },
  {
    id: 'D2026-1-POST',
    name: '2026-1 핵심역량 사후진단',
    year: '2026',
    semester: '1학기',
    type: '사후',
    startDate: '2026-06-09',
    endDate: '2026-06-23',
    target: '재학생 전체',
    respondents: 1106,
    capacity: 1537,
    status: '진행중',
  },
  {
    id: 'D2025-2-PRE',
    name: '2025-2 핵심역량 사전진단',
    year: '2025',
    semester: '2학기',
    type: '사전',
    startDate: '2025-09-01',
    endDate: '2025-09-15',
    target: '재학생 전체',
    respondents: 1923,
    capacity: 2080,
    status: '결과공개',
  },
  {
    id: 'D2025-2-POST',
    name: '2025-2 핵심역량 사후진단',
    year: '2025',
    semester: '2학기',
    type: '사후',
    startDate: '2025-12-01',
    endDate: '2025-12-15',
    target: '재학생 전체',
    respondents: 1890,
    capacity: 2080,
    status: '결과공개',
  },
  {
    id: 'D2026-1-N',
    name: '2026 신입생 입학역량진단',
    year: '2026',
    semester: '1학기',
    type: '사전',
    startDate: '2026-03-10',
    endDate: '2026-03-14',
    target: '2026학번 신입생',
    respondents: 612,
    capacity: 620,
    status: '결과공개',
  },
  {
    id: 'D2026-2-PRE',
    name: '2026-2 핵심역량 사전진단',
    year: '2026',
    semester: '2학기',
    type: '사전',
    startDate: '2026-09-07',
    endDate: '2026-09-21',
    target: '재학생 전체',
    respondents: 0,
    capacity: 2150,
    status: '계획',
  },
];

const STATUS_STYLE = {
  계획: { bg: '#F3F4F6', text: '#6B7280' },
  진행중: { bg: '#EDE9FE', text: '#7C3AED' },
  마감: { bg: '#FEF3C7', text: '#D97706' },
  결과공개: { bg: '#D1FAE5', text: '#059669' },
};

const NON_RESPONDENTS = [
  {
    studentId: '20231500',
    name: '강다은',
    dept: '경영학과',
    grade: 3,
    lastLogin: '2026-06-05',
    notified: false,
  },
  {
    studentId: '20240102',
    name: '임채원',
    dept: '컴퓨터공학과',
    grade: 1,
    lastLogin: '2026-06-08',
    notified: true,
  },
  {
    studentId: '20232201',
    name: '송민준',
    dept: '산업공학과',
    grade: 2,
    lastLogin: '2026-05-30',
    notified: false,
  },
  {
    studentId: '20241300',
    name: '한소율',
    dept: '심리학과',
    grade: 1,
    lastLogin: '2026-06-09',
    notified: false,
  },
  {
    studentId: '20230912',
    name: '임수아',
    dept: '사회복지학과',
    grade: 4,
    lastLogin: '2026-05-28',
    notified: false,
  },
  {
    studentId: '20231654',
    name: '윤준호',
    dept: '경영학과',
    grade: 3,
    lastLogin: '2026-06-01',
    notified: true,
  },
  {
    studentId: '20232900',
    name: '배지수',
    dept: '컴퓨터공학과',
    grade: 2,
    lastLogin: '2026-06-07',
    notified: false,
  },
  {
    studentId: '20241122',
    name: '조민재',
    dept: '글로벌통상학과',
    grade: 1,
    lastLogin: '2026-06-09',
    notified: false,
  },
];

const COLLEGE_DATA = [
  {
    college: '공과대학',
    cnt: 312,
    c1: 68.2,
    c2: 65.1,
    c3: 70.4,
    c4: 59.3,
    c5: 72.1,
    c6: 74.8,
    avg: 68.3,
  },
  {
    college: '경영대학',
    cnt: 248,
    c1: 71.4,
    c2: 70.8,
    c3: 72.1,
    c4: 63.7,
    c5: 67.9,
    c6: 76.2,
    avg: 70.4,
  },
  {
    college: '사회과학대학',
    cnt: 198,
    c1: 73.1,
    c2: 72.5,
    c3: 74.8,
    c4: 61.2,
    c5: 64.3,
    c6: 78.1,
    avg: 70.7,
  },
  {
    college: '인문대학',
    cnt: 156,
    c1: 74.2,
    c2: 75.3,
    c3: 76.1,
    c4: 68.9,
    c5: 62.1,
    c6: 79.4,
    avg: 72.7,
  },
  {
    college: '자연과학대학',
    cnt: 112,
    c1: 66.8,
    c2: 63.4,
    c3: 68.2,
    c4: 57.1,
    c5: 74.5,
    c6: 72.3,
    avg: 67.1,
  },
  {
    college: '글로벌대학',
    cnt: 80,
    c1: 70.3,
    c2: 73.2,
    c3: 71.5,
    c4: 78.4,
    c5: 63.8,
    c6: 75.1,
    avg: 72.1,
  },
];

// ─── Tab 1: 회차 관리 ─────────────────────────────────────────────────────────

function RoundManage() {
  const [rounds, setRounds] = useState(INITIAL_ROUNDS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState(null);

  // Drawer form
  const [fName, setFName] = useState('');
  const [fYear, setFYear] = useState('2026');
  const [fSem, setFSem] = useState('1학기');
  const [fType, setFType] = useState('사전');
  const [fStart, setFStart] = useState('');
  const [fEnd, setFEnd] = useState('');
  const [fTargetMode, setFTM] = useState('전체');
  const [fGrades, setFGrades] = useState([]);
  const [fColleges, setFColl] = useState([]);
  const [fDepts, setFDepts] = useState([]);
  const [fActive, setFActive] = useState(true);
  const [dupError, setDupError] = useState('');

  const GRADES = ['1학년', '2학년', '3학년', '4학년'];
  const COLLEGES = [
    '공과대학',
    '경영대학',
    '사회과학대학',
    '인문대학',
    '자연과학대학',
    '글로벌대학',
  ];
  const DEPTS = [
    '컴퓨터공학과',
    '경영학과',
    '심리학과',
    '산업공학과',
    '사회복지학과',
    '글로벌통상학과',
  ];

  const openDrawer = () => {
    setFName('');
    setFYear('2026');
    setFSem('1학기');
    setFType('사전');
    setFStart('');
    setFEnd('');
    setFTM('전체');
    setFGrades([]);
    setFColl([]);
    setFDepts([]);
    setFActive(true);
    setDupError('');
    setDrawerOpen(true);
  };

  const toggleList = (list, val, set) => {
    set(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  const handleSave = () => {
    const dup = rounds.find((r) => r.year === fYear && r.semester === fSem && r.type === fType);
    if (dup) {
      setDupError(
        `${fYear}-${fSem === '1학기' ? '1' : '2'} ${fType}진단이 이미 등록되어 있습니다. (${dup.id})`,
      );
      return;
    }
    if (!fName || !fStart || !fEnd) {
      toast('필수 항목을 모두 입력해 주세요.', 'error');
      return;
    }
    const targetLabel =
      fTargetMode === '전체'
        ? '재학생 전체'
        : fTargetMode === '학년'
          ? fGrades.join(', ')
          : fTargetMode === '단과대'
            ? fColleges.join(', ')
            : fDepts.join(', ');
    const newRound = {
      id: `D${fYear}-${fSem === '1학기' ? '1' : '2'}-${fType === '사전' ? 'PRE' : 'POST'}-NEW`,
      name: fName,
      year: fYear,
      semester: fSem,
      type: fType,
      startDate: fStart,
      endDate: fEnd,
      target: targetLabel,
      respondents: 0,
      capacity: 0,
      status: '계획',
    };
    setRounds((prev) => [newRound, ...prev]);
    setDrawerOpen(false);
    toast('회차가 등록되었습니다.', 'success');
  };

  const handleStatus = (r, next) => {
    setRounds((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
    const labels = { 계획: '계획으로 변경', 진행중: '개시', 마감: '마감', 결과공개: '결과 공개' };
    toast(`'${r.name}'을 ${labels[next]}했습니다.`, 'success');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-black text-[#1F2328]">회차 관리</h2>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">핵심역량 진단 회차 개설·상태 전환</p>
        </div>
        <Button onClick={openDrawer} style={{ background: ACCENT }}>
          + 회차 등록
        </Button>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {[
                  '회차ID',
                  '진단명',
                  '학년도·학기',
                  '구분',
                  '응시기간',
                  '대상',
                  '응시/대상',
                  '상태',
                  '관리',
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 5 ? 'text-center' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => {
                const ss = STATUS_STYLE[r.status];
                const rate = r.capacity > 0 ? Math.round((r.respondents / r.capacity) * 100) : 0;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[10px] text-[#9AA0A6]">{r.id}</td>
                    <td className="px-4 py-3 font-bold text-[#1F2328] max-w-[200px]">
                      <p className="truncate">{r.name}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#656D76]">
                      {r.year}학년도 {r.semester}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${r.type === '사전' ? 'bg-[#DBEAFE] text-[#2563EB]' : 'bg-[#FEE2E2] text-[#CF222E]'}`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] whitespace-nowrap">
                      {r.startDate} ~ {r.endDate}
                    </td>
                    <td className="px-4 py-3 text-center text-[11px] text-[#656D76] whitespace-nowrap">
                      {r.target}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.capacity > 0 ? (
                        <div>
                          <span className="font-bold" style={{ color: ACCENT }}>
                            {r.respondents.toLocaleString()}
                          </span>
                          <span className="text-[#9AA0A6]">/{r.capacity.toLocaleString()}</span>
                          <div className="h-1 rounded-full bg-[#E5E7EB] mt-1 mx-auto w-16 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${rate}%`, background: ACCENT }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#D1D5DB]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: ss.bg, color: ss.text }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {r.status === '계획' && (
                          <button
                            onClick={() => handleStatus(r, '진행중')}
                            className="h-6 px-2 text-[10px] font-bold rounded-[4px] text-white"
                            style={{ background: ACCENT }}
                          >
                            개시
                          </button>
                        )}
                        {r.status === '진행중' && (
                          <button
                            onClick={() => setCloseTarget(r)}
                            className="h-6 px-2 text-[10px] font-bold rounded-[4px] bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A]"
                          >
                            마감
                          </button>
                        )}
                        {r.status === '마감' && (
                          <button
                            onClick={() => handleStatus(r, '결과공개')}
                            className="h-6 px-2 text-[10px] font-bold rounded-[4px] bg-[#D1FAE5] text-[#059669] hover:bg-[#A7F3D0]"
                          >
                            결과공개
                          </button>
                        )}
                        <button
                          onClick={() => toast('수정 기능은 다음 버전에서 제공됩니다.', 'info')}
                          className="h-6 px-2 text-[10px] font-bold rounded-[4px] bg-[#F5F3FF] hover:bg-[#EDE9FE] transition-colors"
                          style={{ color: ACCENT }}
                        >
                          수정
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Close confirm */}
      <ConfirmDialog
        open={!!closeTarget}
        title="진단 마감 확인"
        message={`'${closeTarget?.name}'을 마감합니다. 마감 후 추가 응시가 불가하며 결과 처리를 시작합니다.`}
        confirmLabel="마감 처리"
        danger
        onConfirm={() => {
          if (closeTarget) {
            handleStatus(closeTarget, '마감');
            setCloseTarget(null);
          }
        }}
        onCancel={() => setCloseTarget(null)}
      />

      {/* Register drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="회차 등록"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              취소
            </Button>
            <Button style={{ background: ACCENT }} onClick={handleSave}>
              등록
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              진단명 <span className="text-[#CF222E]">*</span>
            </label>
            <input
              value={fName}
              onChange={(e) => {
                setFName(e.target.value);
                setDupError('');
              }}
              placeholder="예) 2026-2 핵심역량 사전진단"
              className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#7C3AED] bg-white"
            />
          </div>

          {/* Year / Semester */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
                학년도
              </label>
              <select
                value={fYear}
                onChange={(e) => {
                  setFYear(e.target.value);
                  setDupError('');
                }}
                className="w-full h-9 px-2 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#7C3AED]"
              >
                {['2026', '2025', '2024'].map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">학기</label>
              <select
                value={fSem}
                onChange={(e) => {
                  setFSem(e.target.value);
                  setDupError('');
                }}
                className="w-full h-9 px-2 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#7C3AED]"
              >
                {['1학기', '2학기'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type radio */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-2">
              구분 (사전·사후) <span className="text-[#CF222E]">*</span>
            </label>
            <div className="flex gap-3">
              {['사전', '사후'].map((t) => (
                <label
                  key={t}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-[8px] border-2 cursor-pointer transition-all ${fType === t ? 'border-[#7C3AED] bg-[#F5F3FF]' : 'border-[#E5E7EB] bg-white hover:border-[#A78BFA]'}`}
                  onClick={() => {
                    setFType(t);
                    setDupError('');
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${fType === t ? 'border-[#7C3AED]' : 'border-[#D1D5DB]'}`}
                  >
                    {fType === t && (
                      <div className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />
                    )}
                  </div>
                  <span
                    className={`text-[13px] font-bold ${fType === t ? '' : 'text-[#656D76]'}`}
                    style={fType === t ? { color: ACCENT } : {}}
                  >
                    {t}진단
                  </span>
                </label>
              ))}
            </div>
            {dupError && (
              <div className="mt-2 p-2.5 rounded-[6px] bg-[#FEE2E2] border border-[#FECACA] text-[11px] text-[#CF222E] font-semibold">
                ⚠ {dupError}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '응시 시작일', val: fStart, set: setFStart },
              { label: '응시 종료일', val: fEnd, set: setFEnd },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
                  {f.label} <span className="text-[#CF222E]">*</span>
                </label>
                <input
                  type="date"
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
            ))}
          </div>

          {/* Target */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-2">대상 지정</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {['전체', '학년', '단과대', '학과'].map((m) => (
                <button
                  key={m}
                  onClick={() => setFTM(m)}
                  className={`h-7 px-3 text-[11px] font-bold rounded-full border transition-colors ${fTargetMode === m ? 'text-white border-[#7C3AED]' : 'bg-white text-[#656D76] border-[#E5E7EB] hover:border-[#A78BFA]'}`}
                  style={fTargetMode === m ? { background: ACCENT } : {}}
                >
                  {m}
                </button>
              ))}
            </div>

            {fTargetMode === '전체' && (
              <div className="p-3 rounded-[6px] bg-[#F5F3FF] text-[12px]" style={{ color: ACCENT }}>
                전체 재학생이 대상입니다.
              </div>
            )}
            {fTargetMode === '학년' && (
              <div className="flex gap-2 flex-wrap">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleList(fGrades, g, setFGrades)}
                    className={`h-7 px-3 text-[11px] font-bold rounded-full border transition-colors ${fGrades.includes(g) ? 'text-white border-[#7C3AED]' : 'bg-white text-[#656D76] border-[#E5E7EB]'}`}
                    style={fGrades.includes(g) ? { background: ACCENT } : {}}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
            {fTargetMode === '단과대' && (
              <div className="flex gap-2 flex-wrap">
                {COLLEGES.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleList(fColleges, c, setFColl)}
                    className={`h-7 px-3 text-[11px] font-bold rounded-full border transition-colors ${fColleges.includes(c) ? 'text-white border-[#7C3AED]' : 'bg-white text-[#656D76] border-[#E5E7EB]'}`}
                    style={fColleges.includes(c) ? { background: ACCENT } : {}}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {fTargetMode === '학과' && (
              <div className="flex gap-2 flex-wrap">
                {DEPTS.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleList(fDepts, d, setFDepts)}
                    className={`h-7 px-3 text-[11px] font-bold rounded-full border transition-colors ${fDepts.includes(d) ? 'text-white border-[#7C3AED]' : 'bg-white text-[#656D76] border-[#E5E7EB]'}`}
                    style={fDepts.includes(d) ? { background: ACCENT } : {}}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-semibold text-[#656D76]">사용여부</label>
            <button
              onClick={() => setFActive(!fActive)}
              className={`relative w-9 h-5 rounded-full transition-colors ${fActive ? '' : 'bg-[#D1D5DB]'}`}
              style={fActive ? { background: ACCENT } : {}}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${fActive ? 'translate-x-4' : ''}`}
              />
            </button>
            <span className="text-[11px] text-[#9AA0A6]">{fActive ? '사용' : '미사용'}</span>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

// ─── Tab 2: 응시 관리 ─────────────────────────────────────────────────────────

function ResponseManage() {
  const RESPONDENTS = 1106;
  const CAPACITY = 1537;
  const RATE = Math.round((RESPONDENTS / CAPACITY) * 100);

  const [notifOpen, setNotifOpen] = useState(false);
  const [channels, setChannels] = useState(['앱']);
  const [notifRows, setNotifRows] = useState(NON_RESPONDENTS);
  const [selected, setSelected] = useState(new Set());
  const [downloadInfo, setDownloadInfo] = useState(false);

  const CHANNEL_LIST = ['앱', 'SMS', '메일'];
  const gradeData = [
    { grade: '1학년', rate: 81, cnt: 310, total: 382 },
    { grade: '2학년', rate: 76, cnt: 298, total: 392 },
    { grade: '3학년', rate: 65, cnt: 318, total: 489 },
    { grade: '4학년', rate: 58, cnt: 180, total: 310 },
  ];

  const toggleChannel = (c) =>
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const notifyTarget =
    selected.size > 0 ? selected.size : notifRows.filter((r) => !r.notified).length;

  const allChecked = notifRows.length > 0 && notifRows.every((r) => selected.has(r.studentId));
  const toggleAll = () =>
    allChecked ? setSelected(new Set()) : setSelected(new Set(notifRows.map((r) => r.studentId)));
  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const sendNotification = () => {
    setNotifRows((prev) =>
      prev.map((r) => (!selected.size || selected.has(r.studentId) ? { ...r, notified: true } : r)),
    );
    setSelected(new Set());
    setNotifOpen(false);
    toast(`${notifyTarget}명에게 알림을 발송했습니다.`, 'success');
  };

  const donutData = [
    { label: '응시', value: RESPONDENTS, color: ACCENT },
    { label: '미응시', value: CAPACITY - RESPONDENTS, color: '#E5E7EB' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-black text-[#1F2328]">응시 관리</h2>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">진단 회차: 2026-1 핵심역량 사후진단</p>
        </div>
      </div>

      {/* Top: Donut + Grade bars */}
      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '260px 1fr' }}>
        {/* Donut */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 flex flex-col items-center gap-3">
          <p className="text-[12px] font-bold text-[#1F2328] self-start">전체 응시율</p>
          <DonutChart segments={donutData} size={140} centerValue={`${RATE}%`} />
          <div className="flex gap-6 text-[12px]">
            <div className="text-center">
              <div className="text-[20px] font-black" style={{ color: ACCENT }}>
                {RESPONDENTS.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#9AA0A6]">응시</div>
            </div>
            <div className="text-center">
              <div className="text-[20px] font-black text-[#9AA0A6]">
                {CAPACITY.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#9AA0A6]">대상</div>
            </div>
          </div>
        </div>

        {/* Grade bars */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
          <p className="text-[12px] font-bold text-[#1F2328] mb-4">학년별 응시율</p>
          <div className="flex flex-col gap-4">
            {gradeData.map((g) => {
              const pct = g.rate;
              const poor = pct < 65;
              const color = poor ? '#CF222E' : pct < 75 ? '#D97706' : ACCENT;
              return (
                <div key={g.grade}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-semibold text-[#1F2328] w-14">{g.grade}</span>
                    <div className="flex-1 mx-3 h-6 bg-[#F3F4F6] rounded-[4px] overflow-hidden relative">
                      <div
                        className="h-full rounded-[4px] transition-all flex items-center"
                        style={{ width: `${pct}%`, background: color, minWidth: '2rem' }}
                      >
                        <span className="text-[10px] font-black text-white ml-2 shrink-0">
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#9AA0A6] w-24 text-right">
                      {g.cnt}/{g.total}명
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Non-respondent table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-3 flex-wrap">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <span className="text-[13px] font-bold text-[#1F2328]">미응시자 목록</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E]">
            {CAPACITY - RESPONDENTS}명
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setDownloadInfo(true)}
              className="h-7 px-3 text-[11px] font-bold rounded-[6px] border border-[#E5E7EB] text-[#656D76] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors"
            >
              명단 엑셀 다운로드
            </button>
            <button
              onClick={() => setNotifOpen(true)}
              className="h-7 px-3 text-[11px] font-bold rounded-[6px] text-white transition-opacity hover:opacity-90"
              style={{ background: ACCENT }}
            >
              미응시자 알림 발송
            </button>
          </div>
        </div>

        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="accent-[#7C3AED] w-3.5 h-3.5 cursor-pointer"
                />
              </th>
              {['학번', '성명', '학과', '학년', '최근 로그인', '알림 발송'].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 4 ? 'text-center' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notifRows.map((r) => (
              <tr
                key={r.studentId}
                className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors ${selected.has(r.studentId) ? 'bg-[#F5F3FF]' : ''}`}
              >
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(r.studentId)}
                    onChange={() => toggle(r.studentId)}
                    className="accent-[#7C3AED] w-3.5 h-3.5 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">{r.studentId}</td>
                <td className="px-4 py-3 font-bold text-[#1F2328]">{r.name}</td>
                <td className="px-4 py-3 text-[#656D76]">{r.dept}</td>
                <td className="px-4 py-3 text-center text-[#656D76]">{r.grade}학년</td>
                <td className="px-4 py-3 text-center font-mono text-[11px] text-[#9AA0A6]">
                  {r.lastLogin}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.notified ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669]">
                      발송완료
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#9AA0A6]">
                      미발송
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notify modal */}
      <Modal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="미응시자 알림 발송"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNotifOpen(false)}>
              취소
            </Button>
            <Button style={{ background: ACCENT }} onClick={sendNotification}>
              발송
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-2">
              발송 채널 (다중 선택)
            </label>
            <div className="flex gap-2">
              {CHANNEL_LIST.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleChannel(c)}
                  className={`h-8 px-4 text-[12px] font-bold rounded-[6px] border-2 transition-colors ${channels.includes(c) ? 'text-white border-[#7C3AED]' : 'bg-white text-[#656D76] border-[#E5E7EB]'}`}
                  style={channels.includes(c) ? { background: ACCENT } : {}}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-2">
              문구 미리보기
            </label>
            <div className="p-4 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[12px] text-[#444D56] leading-relaxed">
              <p className="font-bold text-[#1F2328] mb-1">[학생지원팀] 핵심역량진단 참여 안내</p>
              <p>
                안녕하세요. 2026-1 핵심역량 사후진단 응시 기간입니다.
                <br />
                아직 응시하지 않으셨습니다. <strong>2026-06-23까지</strong> 접속해 주세요.
                <br />
                포털 로그인 → 핵심역량진단 메뉴에서 바로 응시 가능합니다.
              </p>
            </div>
          </div>

          <div
            className="p-3 rounded-[8px] bg-[#EDE9FE] border border-[#C4B5FD] text-[12px]"
            style={{ color: ACCENT }}
          >
            발송 대상: <span className="font-black">{notifyTarget}명</span>
            {selected.size > 0 && (
              <span className="text-[#9AA0A6] ml-1">(선택 {selected.size}명)</span>
            )}
          </div>
        </div>
      </Modal>

      {/* Download info modal */}
      <Modal
        open={downloadInfo}
        onClose={() => setDownloadInfo(false)}
        title="개인정보 다운로드 안내"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDownloadInfo(false)}>
              확인
            </Button>
          </div>
        }
      >
        <div className="p-4 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed">
          개인 식별 데이터 다운로드는 별도 권한이 필요하며 다운로드 이력이 기록됩니다.
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab 3: 결과 통계 ─────────────────────────────────────────────────────────

function ResultStats() {
  const [roundSel, setRoundSel] = useState('2026-1 사후진단');
  const [collegeSel, setCollegeSel] = useState('전체');
  const [gradeSel, setGradeSel] = useState('전체');
  const [deptSel, setDeptSel] = useState('전체');
  const [queried, setQueried] = useState(true);
  const [dropOpen, setDropOpen] = useState(false);
  const [privacyInfo, setPrivacyInfo] = useState(false);
  const dropRef = useRef(null);

  const COMP_AVGS = [
    { label: '자기관리', value: 71.3 },
    { label: '의사소통', value: 68.9 },
    { label: '대인관계', value: 70.4 },
    { label: '글로벌', value: 61.5 },
    { label: '문제해결', value: 69.8 },
    { label: '직업윤리', value: 75.2 },
  ];

  const COMP_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  const COMP_LABELS = ['자기관리', '의사소통', '대인관계', '글로벌', '문제해결', '직업윤리'];

  // Find minimum value per column for heatmap
  const minPerCol = {};
  COMP_KEYS.forEach((k) => {
    minPerCol[k] = Math.min(...COLLEGE_DATA.map((r) => r[k]));
  });
  minPerCol['avg'] = Math.min(...COLLEGE_DATA.map((r) => r.avg));

  const handleDownload = (type) => {
    setDropOpen(false);
    setPrivacyInfo(true);
    toast(`'${type}' 다운로드 요청이 기록되었습니다.`, 'info');
  };

  return (
    <div>
      {/* Condition bar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-5 flex gap-3 flex-wrap items-end">
        {[
          {
            label: '회차',
            val: roundSel,
            set: setRoundSel,
            opts: ['2026-1 사후진단', '2026-1 사전진단', '2025-2 사후진단', '2025-2 사전진단'],
          },
          {
            label: '단과대',
            val: collegeSel,
            set: setCollegeSel,
            opts: [
              '전체',
              '공과대학',
              '경영대학',
              '사회과학대학',
              '인문대학',
              '자연과학대학',
              '글로벌대학',
            ],
          },
          {
            label: '학년',
            val: gradeSel,
            set: setGradeSel,
            opts: ['전체', '1학년', '2학년', '3학년', '4학년'],
          },
          {
            label: '전공',
            val: deptSel,
            set: setDeptSel,
            opts: ['전체', '컴퓨터공학과', '경영학과', '심리학과', '산업공학과'],
          },
        ].map((f) => (
          <div key={f.label} className="flex flex-col gap-1 w-44">
            <label className="text-[10px] font-semibold text-[#656D76]">{f.label}</label>
            <select
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#7C3AED]"
            >
              {f.opts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
        <Button style={{ background: ACCENT }} onClick={() => setQueried(true)}>
          조회
        </Button>

        {/* Download dropdown */}
        <div className="relative ml-auto" ref={dropRef}>
          <button
            onClick={() => setDropOpen(!dropOpen)}
            className="h-8 px-4 text-[12px] font-bold rounded-[6px] border border-[#E5E7EB] text-[#656D76] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors flex items-center gap-1"
          >
            결과 내려받기 <span className="text-[10px]">▾</span>
          </button>
          {dropOpen && (
            <div className="absolute right-0 top-9 z-30 bg-white rounded-[8px] border border-[#E5E7EB] shadow-lg w-52 overflow-hidden">
              {[
                { label: '원시 응답 데이터(CSV)', icon: '📄' },
                { label: '집계 결과(XLSX)', icon: '📊' },
              ].map((d) => (
                <button
                  key={d.label}
                  onClick={() => handleDownload(d.label)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[12px] text-[#1F2328] hover:bg-[#F5F3FF] transition-colors text-left border-b border-[#F3F4F6] last:border-0"
                >
                  <span>{d.icon}</span>
                  {d.label}
                </button>
              ))}
              <div className="px-4 py-2.5 text-[10px] text-[#9AA0A6] leading-snug border-t border-[#F3F4F6]">
                개인 식별 데이터 다운로드는 별도 권한이 필요하며 다운로드 이력이 기록됩니다.
              </div>
            </div>
          )}
        </div>
      </div>

      {queried && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            <StatTile
              label="응시 대상"
              value="1,537명"
              sub="2026-1 사후진단"
              accentColor={ACCENT}
            />
            <StatTile label="응시 완료" value="1,106명" sub="미응시 431명" accentColor="#059669" />
            <StatTile
              label="응시율"
              value="72.0%"
              sub="전년 동기 대비"
              accentColor="#D97706"
              trend={{ value: '-3.2%p', up: false }}
            />
            <StatTile label="평균 점수" value="66.2점" sub="100점 기준" accentColor="#2563EB" />
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h3 className="text-[13px] font-bold text-[#1F2328]">역량별 평균 점수 분포</h3>
              <span className="text-[11px] text-[#9AA0A6] ml-1">100점 기준</span>
            </div>
            <div className="flex justify-center overflow-x-auto">
              <BarChart data={COMP_AVGS} color={ACCENT} height={160} />
            </div>
            {/* Threshold line annotation */}
            <div className="flex justify-center mt-2">
              <div className="flex items-center gap-1.5 text-[10px] text-[#D97706]">
                <div className="w-6 border-t-2 border-dashed border-[#D97706]" />
                <span>60점 기준선 (미달 시 역량 강화 권고)</span>
              </div>
            </div>
          </div>

          {/* Heatmap table */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h3 className="text-[13px] font-bold text-[#1F2328]">단과대별 역량 점수 비교</h3>
              <span className="text-[11px] text-[#9AA0A6] ml-1">옅은 빨강 = 해당 열 최솟값</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                    <th className="px-4 py-3 text-[10px] font-semibold text-[#656D76] text-left whitespace-nowrap">
                      단과대
                    </th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-[#656D76] text-center whitespace-nowrap">
                      응시자
                    </th>
                    {COMP_LABELS.map((l) => (
                      <th
                        key={l}
                        className="px-4 py-3 text-[10px] font-semibold text-[#656D76] text-center whitespace-nowrap"
                      >
                        {l}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-[10px] font-semibold text-[#656D76] text-center whitespace-nowrap">
                      종합 평균
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COLLEGE_DATA.map((row, ri) => (
                    <tr
                      key={row.college}
                      className={`border-b border-[#F3F4F6] last:border-0 ${ri % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#F5F3FF] transition-colors`}
                    >
                      <td className="px-4 py-3 font-bold text-[#1F2328] whitespace-nowrap">
                        {row.college}
                      </td>
                      <td className="px-4 py-3 text-center text-[#656D76]">{row.cnt}</td>
                      {COMP_KEYS.map((k) => {
                        const v = row[k];
                        const isMin = v === minPerCol[k];
                        return (
                          <td
                            key={k}
                            className="px-4 py-3 text-center"
                            style={isMin ? { background: '#FEF2F2' } : {}}
                          >
                            <span
                              className={`text-[12px] font-bold ${isMin ? 'text-[#CF222E]' : ''}`}
                            >
                              {v.toFixed(1)}
                            </span>
                          </td>
                        );
                      })}
                      <td
                        className="px-4 py-3 text-center"
                        style={row.avg === minPerCol['avg'] ? { background: '#FEF2F2' } : {}}
                      >
                        <span
                          className={`text-[12px] font-black ${row.avg === minPerCol['avg'] ? 'text-[#CF222E]' : ''}`}
                          style={row.avg !== minPerCol['avg'] ? { color: ACCENT } : {}}
                        >
                          {row.avg.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer: column min */}
                <tfoot>
                  <tr className="bg-[#F6F8FA] border-t border-[#E5E7EB]">
                    <td className="px-4 py-2.5 text-[10px] font-bold text-[#656D76]">최솟값</td>
                    <td className="px-4 py-2.5 text-center text-[10px] text-[#9AA0A6]">
                      {Math.min(...COLLEGE_DATA.map((r) => r.cnt))}
                    </td>
                    {COMP_KEYS.map((k) => (
                      <td
                        key={k}
                        className="px-4 py-2.5 text-center text-[10px] font-bold text-[#CF222E]"
                      >
                        {minPerCol[k].toFixed(1)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center text-[10px] font-bold text-[#CF222E]">
                      {minPerCol['avg'].toFixed(1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Privacy modal */}
      <Modal
        open={privacyInfo}
        onClose={() => setPrivacyInfo(false)}
        title="다운로드 안내"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setPrivacyInfo(false)}>
              확인
            </Button>
          </div>
        }
      >
        <div className="p-4 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[13px] text-[#92400E] leading-relaxed">
          개인 식별 데이터 다운로드는 별도 권한이 필요하며 <strong>다운로드 이력이 기록</strong>
          됩니다.
          <br />
          권한 신청은 시스템 관리자에게 문의하세요.
        </div>
      </Modal>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DiagnosisOps() {
  const [tab, setTab] = useState('round');

  const TABS = [
    { key: 'round', label: '① 회차 관리' },
    { key: 'response', label: '② 응시 관리' },
    { key: 'stats', label: '③ 결과 통계' },
  ];

  return (
    <div>
      <div className="mb-5">
        <Tabs tabs={TABS} active={tab} onChange={setTab} accentColor={ACCENT} />
      </div>

      {tab === 'round' && <RoundManage />}
      {tab === 'response' && <ResponseManage />}
      {tab === 'stats' && <ResultStats />}
    </div>
  );
}
