import { useEffect, useRef, useState } from 'react';
import { Button, ConfirmDialog, Modal, Tabs, toast, DonutChart } from '@/components/common';

// ─── Shared program summary bar ───────────────────────────────────────────────

function ProgramBar({ onBack }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-3 mb-5 flex items-center gap-5 flex-wrap">
      <button
        onClick={onBack}
        className="text-[12px] text-[#9AA0A6] hover:text-[#1F2328] transition-colors shrink-0"
      >
        ← 목록
      </button>
      <div className="h-4 w-px bg-[#E5E7EB] shrink-0" />
      <div className="min-w-0">
        <p className="text-[13px] font-black text-[#1F2328] truncate">해외문화체험 워크숍</p>
        <p className="text-[10px] text-[#9AA0A6]">모집기간: 2026-08-01 ~ 08-16</p>
      </div>
      <div className="ml-auto flex gap-4 flex-wrap shrink-0">
        {[
          { label: '신청', value: 20, color: '#2563EB' },
          { label: '승인', value: 14, color: '#059669' },
          { label: '대기', value: 4, color: '#D97706' },
          { label: '잔여 정원', value: 10, color: '#6B7280' },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-[16px] font-black" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[10px] text-[#9AA0A6]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dummy data ───────────────────────────────────────────────────────────────

const QUAL_STYLE = {
  적합: { bg: '#D1FAE5', text: '#059669' },
  '학년 미달': { bg: '#FEE2E2', text: '#CF222E' },
  '선수요건 미충족': { bg: '#FEE2E2', text: '#CF222E' },
  중복신청: { bg: '#FEF3C7', text: '#D97706' },
};
const APPR_STYLE = {
  검토중: { bg: '#F3F4F6', text: '#6B7280' },
  승인: { bg: '#D1FAE5', text: '#059669' },
  반려: { bg: '#FEE2E2', text: '#CF222E' },
  대기: { bg: '#FEF3C7', text: '#D97706' },
};

const APPLICANTS = [
  {
    id: 'A01',
    appliedAt: '08-01',
    studentId: '20231234',
    name: '홍길동',
    dept: '컴퓨터공학과',
    grade: 3,
    qual: '적합',
    status: '승인',
  },
  {
    id: 'A02',
    appliedAt: '08-01',
    studentId: '20231111',
    name: '김영희',
    dept: '경영학과',
    grade: 2,
    qual: '적합',
    status: '승인',
  },
  {
    id: 'A03',
    appliedAt: '08-02',
    studentId: '20230777',
    name: '이민수',
    dept: '산업공학과',
    grade: 3,
    qual: '적합',
    status: '승인',
  },
  {
    id: 'A04',
    appliedAt: '08-02',
    studentId: '20241002',
    name: '박철수',
    dept: '경영학과',
    grade: 1,
    qual: '학년 미달',
    status: '검토중',
  },
  {
    id: 'A05',
    appliedAt: '08-03',
    studentId: '20232050',
    name: '최지수',
    dept: '심리학과',
    grade: 3,
    qual: '적합',
    status: '승인',
  },
  {
    id: 'A06',
    appliedAt: '08-03',
    studentId: '20231876',
    name: '정하준',
    dept: '컴퓨터공학과',
    grade: 3,
    qual: '적합',
    status: '승인',
  },
  {
    id: 'A07',
    appliedAt: '08-04',
    studentId: '20240345',
    name: '오수빈',
    dept: '사회복지학과',
    grade: 1,
    qual: '학년 미달',
    status: '검토중',
  },
  {
    id: 'A08',
    appliedAt: '08-04',
    studentId: '20231654',
    name: '윤태양',
    dept: '경영학과',
    grade: 3,
    qual: '적합',
    status: '승인',
  },
  {
    id: 'A09',
    appliedAt: '08-05',
    studentId: '20230912',
    name: '임채원',
    dept: '컴퓨터공학과',
    grade: 4,
    qual: '적합',
    status: '승인',
  },
  {
    id: 'A10',
    appliedAt: '08-05',
    studentId: '20232200',
    name: '강다은',
    dept: '심리학과',
    grade: 3,
    qual: '적합',
    status: '승인',
  },
  {
    id: 'A11',
    appliedAt: '08-06',
    studentId: '20231390',
    name: '송민준',
    dept: '산업공학과',
    grade: 2,
    qual: '선수요건 미충족',
    status: '검토중',
  },
  {
    id: 'A12',
    appliedAt: '08-06',
    studentId: '20240799',
    name: '한소율',
    dept: '심리학과',
    grade: 2,
    qual: '적합',
    status: '대기',
  },
  {
    id: 'A13',
    appliedAt: '08-07',
    studentId: '20241300',
    name: '류진서',
    dept: '경영학과',
    grade: 2,
    qual: '적합',
    status: '대기',
  },
  {
    id: 'A14',
    appliedAt: '08-08',
    studentId: '20232900',
    name: '배수아',
    dept: '컴퓨터공학과',
    grade: 3,
    qual: '중복신청',
    status: '검토중',
  },
  {
    id: 'A15',
    appliedAt: '08-08',
    studentId: '20231010',
    name: '조현우',
    dept: '사회복지학과',
    grade: 3,
    qual: '적합',
    status: '승인',
  },
  {
    id: 'A16',
    appliedAt: '08-09',
    studentId: '20232510',
    name: '신지민',
    dept: '심리학과',
    grade: 2,
    qual: '적합',
    status: '대기',
  },
  {
    id: 'A17',
    appliedAt: '08-10',
    studentId: '20231780',
    name: '전민재',
    dept: '경영학과',
    grade: 3,
    qual: '적합',
    status: '승인',
  },
  {
    id: 'A18',
    appliedAt: '08-11',
    studentId: '20240610',
    name: '황은서',
    dept: '산업공학과',
    grade: 1,
    qual: '학년 미달',
    status: '검토중',
  },
  {
    id: 'A19',
    appliedAt: '08-12',
    studentId: '20231900',
    name: '문지호',
    dept: '컴퓨터공학과',
    grade: 3,
    qual: '적합',
    status: '승인',
  },
  {
    id: 'A20',
    appliedAt: '08-13',
    studentId: '20232100',
    name: '방수진',
    dept: '경영학과',
    grade: 2,
    qual: '적합',
    status: '대기',
  },
];

const ATT_STYLE = {
  출: { bg: '#D1FAE5', text: '#059669', label: '출' },
  지: { bg: '#FEF3C7', text: '#D97706', label: '지' },
  결: { bg: '#FEE2E2', text: '#CF222E', label: '결' },
};

const ATT_CYCLE = ['출', '지', '결'];

const STUDENTS_RAW = [
  {
    studentId: '20231234',
    name: '홍길동',
    dept: '컴퓨터공학과',
    att: ['출', '출', '출', '출', '출'],
    journalCount: 5,
    surveyDone: true,
  },
  {
    studentId: '20231111',
    name: '김영희',
    dept: '경영학과',
    att: ['출', '출', '출', '지', '출'],
    journalCount: 5,
    surveyDone: true,
  },
  {
    studentId: '20230777',
    name: '이민수',
    dept: '산업공학과',
    att: ['출', '출', '결', '출', '출'],
    journalCount: 4,
    surveyDone: true,
  },
  {
    studentId: '20232050',
    name: '최지수',
    dept: '심리학과',
    att: ['출', '출', '출', '출', '지'],
    journalCount: 5,
    surveyDone: false,
  },
  {
    studentId: '20231876',
    name: '정하준',
    dept: '컴퓨터공학과',
    att: ['출', '결', '결', '출', '출'],
    journalCount: 3,
    surveyDone: true,
  },
  {
    studentId: '20231654',
    name: '윤태양',
    dept: '경영학과',
    att: ['출', '출', '출', '출', '결'],
    journalCount: 5,
    surveyDone: true,
  },
  {
    studentId: '20230912',
    name: '임채원',
    dept: '컴퓨터공학과',
    att: ['출', '출', '지', '출', '출'],
    journalCount: 5,
    surveyDone: true,
  },
  {
    studentId: '20232200',
    name: '강다은',
    dept: '심리학과',
    att: ['결', '결', '결', '출', '출'],
    journalCount: 2,
    surveyDone: false,
  },
  {
    studentId: '20231010',
    name: '조현우',
    dept: '사회복지학과',
    att: ['출', '출', '출', '출', '출'],
    journalCount: 5,
    surveyDone: true,
  },
  {
    studentId: '20231780',
    name: '전민재',
    dept: '경영학과',
    att: ['출', '출', '출', '결', '출'],
    journalCount: 4,
    surveyDone: true,
  },
  {
    studentId: '20231900',
    name: '문지호',
    dept: '컴퓨터공학과',
    att: ['출', '출', '출', '출', '출'],
    journalCount: 5,
    surveyDone: true,
  },
  {
    studentId: '20232510',
    name: '신지민',
    dept: '심리학과',
    att: ['출', '지', '출', '출', '출'],
    journalCount: 5,
    surveyDone: true,
  },
  {
    studentId: '20232100',
    name: '방수진',
    dept: '경영학과',
    att: ['결', '결', '출', '출', '결'],
    journalCount: 1,
    surveyDone: false,
  },
  {
    studentId: '20240610',
    name: '황은서',
    dept: '산업공학과',
    att: ['출', '출', '출', '출', '지'],
    journalCount: 5,
    surveyDone: true,
  },
];

const REJECTION_REASONS = ['선택하세요', '자격요건 미달', '서류 미비', '정원 초과', '기타'];

// ─── helpers ─────────────────────────────────────────────────────────────────

function attRate(att) {
  const present = att.filter((a) => a === '출' || a === '지').length;
  return Math.round((present / att.length) * 100);
}

function computeVerdict(s) {
  const rate = attRate(s.att);
  if (rate >= 80 && s.journalCount >= 5 && s.surveyDone) return '수료';
  if (rate < 80 || s.journalCount < 5) return '미수료';
  return '보류';
}

function missReason(s) {
  const parts = [];
  if (attRate(s.att) < 80) parts.push(`출석률 기준(80%) 미달 (실제 ${attRate(s.att)}%)`);
  if (s.journalCount < 5) parts.push(`활동일지 미제출 (${s.journalCount}/5회)`);
  if (!s.surveyDone) parts.push('만족도 설문 미완료');
  return parts.join(', ');
}

// ─── ① 신청 심사 ─────────────────────────────────────────────────────────────

function ApplicationReview() {
  const [rows, setRows] = useState(APPLICANTS);
  const [selected, setSelected] = useState(new Set());
  const [filterStatus, setFs] = useState('전체');
  const [filterDept, setFd] = useState('전체');
  const [filterGrade, setFg] = useState('전체');
  const [keyword, setKw] = useState('');
  const [rejectOpen, setRjOpen] = useState(false);
  const [rejectReason, setRjReason] = useState('선택하세요');
  const [rejectDetail, setRjDetail] = useState('');

  const depts = ['전체', ...Array.from(new Set(APPLICANTS.map((a) => a.dept)))];
  const grades = ['전체', '1학년', '2학년', '3학년', '4학년'];
  const statuses = ['전체', '검토중', '승인', '반려', '대기'];

  const filtered = rows.filter(
    (a) =>
      (filterStatus === '전체' || a.status === filterStatus) &&
      (filterDept === '전체' || a.dept === filterDept) &&
      (filterGrade === '전체' || `${a.grade}학년` === filterGrade) &&
      (!keyword || a.name.includes(keyword) || a.studentId.includes(keyword)),
  );

  const allChecked = filtered.length > 0 && filtered.every((a) => selected.has(a.id));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleApprove = (ids) => {
    setRows((prev) =>
      prev.map((a) => (ids.includes(a.id) && a.qual === '적합' ? { ...a, status: '승인' } : a)),
    );
    setSelected(new Set());
    toast(`${ids.length}건을 승인했습니다.`, 'success');
  };

  const handleRejectConfirm = () => {
    if (rejectReason === '선택하세요') {
      toast('반려 사유 코드를 선택해 주세요.', 'error');
      return;
    }
    const ids = [...selected];
    setRows((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, status: '반려' } : a)));
    setSelected(new Set());
    setRjOpen(false);
    setRjReason('선택하세요');
    setRjDetail('');
    toast(`${ids.length}건을 반려했습니다. 학생에게 사유가 공개됩니다.`, 'info');
  };

  return (
    <div>
      {/* FilterBar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-4 flex gap-3 flex-wrap items-end">
        {[
          { label: '상태', value: filterStatus, set: setFs, opts: statuses },
          { label: '학과', value: filterDept, set: setFd, opts: depts },
          { label: '학년', value: filterGrade, set: setFg, opts: grades },
        ].map((f) => (
          <div key={f.label} className="flex flex-col gap-1 w-36">
            <label className="text-[10px] font-semibold text-[#656D76]">{f.label}</label>
            <select
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#2563EB]"
            >
              {f.opts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-[10px] font-semibold text-[#656D76]">학번·성명</label>
          <input
            value={keyword}
            onChange={(e) => setKw(e.target.value)}
            placeholder="검색..."
            className="h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#2563EB]"
          />
        </div>
        <button
          onClick={() => toast('엑셀 파일을 다운로드합니다.', 'info')}
          className="h-8 px-4 text-[12px] font-bold rounded-[6px] border border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors self-end"
        >
          엑셀 다운로드
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="accent-[#2563EB] w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                {['신청일', '학번', '성명', '학과', '학년', '자격검증', '상태', '처리'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 5 ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const qStyle = QUAL_STYLE[a.qual];
                const aStyle = APPR_STYLE[a.status];
                const canApprove = a.qual === '적합' && a.status !== '승인';
                return (
                  <tr
                    key={a.id}
                    className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors ${selected.has(a.id) ? 'bg-[#EFF6FF]' : ''}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggle(a.id)}
                        className="accent-[#2563EB] w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                      {a.appliedAt}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                      {a.studentId}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1F2328]">{a.name}</td>
                    <td className="px-4 py-3 text-[#656D76]">{a.dept}</td>
                    <td className="px-4 py-3 text-center text-[#656D76]">{a.grade}학년</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: qStyle.bg, color: qStyle.text }}
                      >
                        {a.qual}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: aStyle.bg, color: aStyle.text }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button
                          disabled={!canApprove}
                          onClick={() => handleApprove([a.id])}
                          className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#D1FAE5] text-[#059669] hover:bg-[#A7F3D0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          승인
                        </button>
                        <button
                          disabled={a.status === '반려'}
                          onClick={() => {
                            setSelected(new Set([a.id]));
                            setRjOpen(true);
                          }}
                          className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          반려
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

      {/* Fixed bottom bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-[#E5E7EB] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] z-40">
          <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-4">
            <span className="text-[13px] font-bold text-[#1F2328]">{selected.size}건 선택됨</span>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                style={{ background: '#059669' }}
                onClick={() =>
                  handleApprove(
                    [...selected].filter((id) => {
                      const a = rows.find((r) => r.id === id);
                      return a?.qual === '적합';
                    }),
                  )
                }
              >
                선택 일괄 승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                style={{ borderColor: '#CF222E', color: '#CF222E' }}
                onClick={() => {
                  setRjOpen(true);
                }}
              >
                선택 반려
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRjOpen(false)}
        title="반려 · 수정요청"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRjOpen(false)}>
              취소
            </Button>
            <Button style={{ background: '#CF222E' }} onClick={handleRejectConfirm}>
              반려 처리
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              사유 코드 <span className="text-[#CF222E]">*</span>
            </label>
            <select
              value={rejectReason}
              onChange={(e) => setRjReason(e.target.value)}
              className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#2563EB]"
            >
              {REJECTION_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              상세 사유
            </label>
            <textarea
              value={rejectDetail}
              onChange={(e) => setRjDetail(e.target.value)}
              rows={4}
              placeholder="학생에게 공개되는 사유를 작성해 주세요."
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white resize-none focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#92400E]">
            ⚠ 입력한 사유는 학생에게 그대로 공개됩니다.
          </div>
        </div>
      </Modal>

      <div className="h-16" />
    </div>
  );
}

// ─── ② 출결 관리 ─────────────────────────────────────────────────────────────

function AttendanceManage() {
  const TOTAL_ROUNDS = 5;
  const [students, setStudents] = useState(STUDENTS_RAW.map((s) => ({ ...s, att: [...s.att] })));
  const [editTarget, setEditTarget] = useState(null);
  const [editReason, setEditReason] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const timerRef = useRef(null);

  const openQr = () => {
    setQrOpen(true);
    setCountdown(300);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const handleAttChange = (sid, round) => {
    setEditTarget({ sid, round });
    setEditReason('');
  };

  const confirmAttChange = () => {
    if (!editReason.trim()) {
      toast('수정 사유를 입력해 주세요.', 'error');
      return;
    }
    if (!editTarget) return;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== editTarget.sid) return s;
        const att = [...s.att];
        const cur = att[editTarget.round];
        const idx = ATT_CYCLE.indexOf(cur);
        att[editTarget.round] = ATT_CYCLE[(idx + 1) % 3];
        return { ...s, att };
      }),
    );
    toast('출결이 수정되었습니다. 수정 이력이 기록됩니다.', 'success');
    setEditTarget(null);
    setEditReason('');
  };

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div>
      {/* QR button */}
      <div className="flex justify-end mb-4">
        <Button onClick={openQr} style={{ background: '#2563EB' }}>
          QR 출석 코드 생성
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {[
                  '학번',
                  '성명',
                  '학과',
                  ...Array.from({ length: TOTAL_ROUNDS }, (_, i) => `${i + 1}회차`),
                  '출석률',
                ].map((h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 3 ? 'text-center' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const rate = attRate(s.att);
                const fail = rate < 80;
                return (
                  <tr
                    key={s.studentId}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                      {s.studentId}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1F2328]">{s.name}</td>
                    <td className="px-4 py-3 text-[#656D76]">{s.dept}</td>
                    {s.att.map((a, ri) => {
                      const style = ATT_STYLE[a];
                      return (
                        <td key={ri} className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleAttChange(s.studentId, ri)}
                            className="w-7 h-7 rounded-full text-[10px] font-black transition-all hover:scale-110 hover:shadow-md"
                            style={{ background: style.bg, color: style.text }}
                          >
                            {style.label}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[12px] font-black ${fail ? 'text-[#CF222E]' : 'text-[#059669]'}`}
                      >
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Att edit modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="출결 수정"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              취소
            </Button>
            <Button style={{ background: '#2563EB' }} onClick={confirmAttChange}>
              수정 확정
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {editTarget && (
            <div className="p-3 rounded-[8px] bg-[#EFF6FF] border border-[#BFDBFE] text-[12px] text-[#1D4ED8]">
              <span className="font-bold">
                {students.find((s) => s.studentId === editTarget.sid)?.name}
              </span>{' '}
              {editTarget.round + 1}회차 출결을 변경합니다.
            </div>
          )}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              수정 사유 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              rows={3}
              placeholder="수정 사유를 입력하세요. (필수)"
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white resize-none focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#92400E]">
            수정 이력이 시스템에 기록됩니다.
          </div>
        </div>
      </Modal>

      {/* QR Modal */}
      <Modal
        open={qrOpen}
        onClose={() => {
          setQrOpen(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }}
        title="QR 출석 코드"
        footer={
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-[#9AA0A6]">
              코드는 1회차에 한정, 사용 후 자동 만료됩니다.
            </span>
            <Button variant="outline" onClick={() => setQrOpen(false)}>
              닫기
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-5 py-2">
          {/* SVG QR placeholder */}
          <div className="relative">
            <svg
              width="180"
              height="180"
              viewBox="0 0 180 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* QR-style pattern */}
              <rect width="180" height="180" fill="white" />
              {/* Top-left finder */}
              <rect x="10" y="10" width="50" height="50" rx="4" fill="#1F2328" />
              <rect x="18" y="18" width="34" height="34" rx="2" fill="white" />
              <rect x="26" y="26" width="18" height="18" rx="1" fill="#1F2328" />
              {/* Top-right finder */}
              <rect x="120" y="10" width="50" height="50" rx="4" fill="#1F2328" />
              <rect x="128" y="18" width="34" height="34" rx="2" fill="white" />
              <rect x="136" y="26" width="18" height="18" rx="1" fill="#1F2328" />
              {/* Bottom-left finder */}
              <rect x="10" y="120" width="50" height="50" rx="4" fill="#1F2328" />
              <rect x="18" y="128" width="34" height="34" rx="2" fill="white" />
              <rect x="26" y="136" width="18" height="18" rx="1" fill="#1F2328" />
              {/* Data pattern */}
              {[70, 80, 90, 100, 110].flatMap((x) =>
                [70, 80, 90, 100, 110].map((y) =>
                  Math.random() > 0.5 ? (
                    <rect
                      key={`${x}-${y}`}
                      x={x}
                      y={y}
                      width="8"
                      height="8"
                      fill="#1F2328"
                      rx="1"
                    />
                  ) : null,
                ),
              )}
              {/* Timing */}
              {Array.from({ length: 8 }, (_, i) =>
                i % 2 === 0 ? (
                  <rect key={`t${i}`} x={70 + i * 8} y={62} width="6" height="6" fill="#1F2328" />
                ) : null,
              )}
              {/* Logo center */}
              <rect x="76" y="76" width="28" height="28" rx="4" fill="white" />
              <rect x="80" y="80" width="20" height="20" rx="3" fill="#2563EB" />
              <text x="90" y="94" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                QR
              </text>
            </svg>
            {countdown === 0 && (
              <div className="absolute inset-0 flex items-center justify-center rounded-[4px] bg-white/90">
                <p className="text-[13px] font-bold text-[#CF222E]">만료됨</p>
              </div>
            )}
          </div>

          <div
            className={`text-[32px] font-black tabular-nums ${countdown <= 30 ? 'text-[#CF222E]' : countdown <= 60 ? 'text-[#D97706]' : 'text-[#2563EB]'}`}
          >
            {fmt(countdown)}
          </div>
          <p className="text-[12px] text-[#9AA0A6]">학생이 이 QR을 스캔하면 출석이 기록됩니다.</p>
          {countdown === 0 && (
            <Button onClick={openQr} style={{ background: '#2563EB' }}>
              새 코드 생성
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ─── ③ 결과 등록·이수 판정 ───────────────────────────────────────────────────

function ResultJudge() {
  const initial = STUDENTS_RAW.map((s) => ({
    ...s,
    att: [...s.att],
    verdict: computeVerdict(s),
    confirmState: 'pending',
    overrideReason: '',
  }));

  const [rows, setRows] = useState(initial);
  const [selected, setSelected] = useState(new Set());
  const [confirmOpen, setConfirmOpen] = useState(null);
  const [reasonEdit, setReasonEdit] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const confirmed = rows.filter((r) => r.confirmState === 'confirmed');
  const passCount = confirmed.filter((r) => r.verdict === '수료').length;
  const failCount = confirmed.filter((r) => r.verdict === '미수료').length;
  const holdCount = rows.filter((r) => r.confirmState === 'pending').length;

  const VERDICT_STYLE = {
    수료: { bg: '#D1FAE5', text: '#059669' },
    미수료: { bg: '#FEE2E2', text: '#CF222E' },
    보류: { bg: '#F3F4F6', text: '#6B7280' },
  };

  const toggle = (sid) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(sid) ? n.delete(sid) : n.add(sid);
      return n;
    });
  const allChecked =
    rows.length > 0 &&
    rows.filter((r) => r.confirmState === 'pending').every((r) => selected.has(r.studentId));
  const toggleAll = () => {
    const pending = rows.filter((r) => r.confirmState === 'pending').map((r) => r.studentId);
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(pending));
  };

  const doConfirm = (verdict) => {
    const ids = [...selected];
    const targetVerdict = verdict === 'pass' ? '수료' : '미수료';
    // Validate: 미수료 rows need reason
    const needReason = rows.filter(
      (r) => ids.includes(r.studentId) && r.verdict === '미수료' && !r.overrideReason.trim(),
    );
    if (verdict === 'fail' && needReason.length > 0) {
      toast(`미수료 처리 시 사유 입력이 필수입니다. (${needReason.length}건)`, 'error');
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        ids.includes(r.studentId) ? { ...r, verdict: targetVerdict, confirmState: 'confirmed' } : r,
      ),
    );
    setSelected(new Set());
    setConfirmOpen(null);
    setSubmitted(true);
    toast(
      `${ids.length}건을 ${targetVerdict === '수료' ? '수료' : '미수료'} 확정했습니다. ${targetVerdict === '수료' ? '마일리지 200점이 자동 적립됩니다.' : ''}`,
      'success',
    );
  };

  const attPct = Math.round((rows.filter((r) => r.verdict === '수료').length / rows.length) * 100);
  const donutData = [
    { label: '수료', value: rows.filter((r) => r.verdict === '수료').length, color: '#059669' },
    { label: '미수료', value: rows.filter((r) => r.verdict === '미수료').length, color: '#CF222E' },
    { label: '보류', value: rows.filter((r) => r.verdict === '보류').length, color: '#D1D5DB' },
  ];

  return (
    <div>
      {/* Criterion card + donut */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 mb-5 flex items-start gap-8">
        <div className="flex-1">
          <h3 className="text-[13px] font-bold text-[#1F2328] mb-3">이수 기준</h3>
          <div className="flex flex-col gap-2">
            {[
              { label: '출석률', req: '80% 이상', icon: '📅' },
              { label: '활동일지', req: '5회 모두', icon: '📝' },
              { label: '만족도 설문', req: '완료', icon: '✅' },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="text-[16px]">{c.icon}</span>
                <span className="text-[12px] font-semibold text-[#1F2328] w-24">{c.label}</span>
                <span className="text-[12px] text-[#059669] font-bold">{c.req}</span>
              </div>
            ))}
          </div>
          {submitted && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {[
                { label: `수료 ${passCount}`, bg: '#D1FAE5', text: '#059669' },
                { label: `미수료 ${failCount}`, bg: '#FEE2E2', text: '#CF222E' },
                { label: `보류 ${holdCount}`, bg: '#F3F4F6', text: '#9AA0A6' },
              ].map((b) => (
                <span
                  key={b.label}
                  className="text-[11px] font-black px-3 py-1 rounded-full"
                  style={{ background: b.bg, color: b.text }}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <p className="text-[11px] font-bold text-[#656D76] mb-2 text-center">수료 예정률</p>
          <DonutChart segments={donutData} size={140} centerValue={`${attPct}%`} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden mb-24">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="accent-[#2563EB] w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                {['학번', '성명', '출석률', '활동일지', '설문', '판정', '미수료 사유', '처리'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 2 ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rate = attRate(r.att);
                const vStyle = VERDICT_STYLE[r.verdict];
                const isFail = r.verdict === '미수료';
                const confirmed_ = r.confirmState === 'confirmed';
                return (
                  <tr
                    key={r.studentId}
                    className={`border-b border-[#F3F4F6] last:border-0 transition-colors ${isFail ? 'bg-[#FFF5F5] hover:bg-[#FEE2E2]/40' : selected.has(r.studentId) ? 'bg-[#EFF6FF]' : 'hover:bg-[#FAFAFA]'}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(r.studentId)}
                        onChange={() => toggle(r.studentId)}
                        disabled={confirmed_}
                        className="accent-[#2563EB] w-3.5 h-3.5 cursor-pointer disabled:opacity-40"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                      {r.studentId}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1F2328]">{r.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-black text-[12px] ${rate < 80 ? 'text-[#CF222E]' : 'text-[#059669]'}`}
                      >
                        {rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-bold text-[12px] ${r.journalCount < 5 ? 'text-[#CF222E]' : 'text-[#059669]'}`}
                      >
                        {r.journalCount}/5
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.surveyDone ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#FEE2E2] text-[#CF222E]'}`}
                      >
                        {r.surveyDone ? '완료' : '미완료'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: vStyle.bg, color: vStyle.text }}
                        >
                          {r.verdict}
                        </span>
                        {confirmed_ && (
                          <span className="text-[9px] font-bold text-[#059669]">확정</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {isFail ? (
                        reasonEdit?.sid === r.studentId ? (
                          <div className="flex gap-1.5">
                            <input
                              value={reasonEdit.val}
                              onChange={(e) =>
                                setReasonEdit({ sid: r.studentId, val: e.target.value })
                              }
                              className="flex-1 h-7 px-2 text-[11px] rounded-[4px] border border-[#2563EB] bg-white focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                setRows((prev) =>
                                  prev.map((row) =>
                                    row.studentId === r.studentId
                                      ? { ...row, overrideReason: reasonEdit?.val ?? '' }
                                      : row,
                                  ),
                                );
                                setReasonEdit(null);
                              }}
                              className="h-7 px-2 text-[10px] font-bold text-white rounded-[4px] bg-[#2563EB]"
                            >
                              저장
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              setReasonEdit({
                                sid: r.studentId,
                                val: r.overrideReason || missReason(r),
                              })
                            }
                            className={`text-left text-[11px] leading-snug w-full ${r.overrideReason || missReason(r) ? 'text-[#CF222E]' : 'text-[#9AA0A6] italic'} hover:underline`}
                          >
                            {r.overrideReason || missReason(r) || '사유 입력 (필수)'}
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] text-[#D1D5DB]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {confirmed_ ? (
                        <span className="text-[10px] font-bold text-[#9AA0A6]">처리완료</span>
                      ) : (
                        <button
                          onClick={() => {
                            if (r.verdict === '미수료' && !(r.overrideReason || missReason(r))) {
                              toast('미수료 사유를 먼저 입력해 주세요.', 'error');
                              return;
                            }
                            setSelected(new Set([r.studentId]));
                            setConfirmOpen(r.verdict === '수료' ? 'pass' : 'fail');
                          }}
                          className={`h-6 px-2.5 text-[10px] font-bold rounded-[4px] transition-colors ${r.verdict === '수료' ? 'bg-[#D1FAE5] text-[#059669] hover:bg-[#A7F3D0]' : 'bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA]'}`}
                        >
                          확정
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed action bar */}
      <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-[#E5E7EB] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] z-40">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-4">
          <span className="text-[13px] text-[#9AA0A6]">
            {selected.size > 0 ? `${selected.size}건 선택됨` : '행을 선택해 일괄 처리하세요.'}
          </span>
          <div className="ml-auto flex gap-2 flex-wrap">
            <Button
              size="sm"
              disabled={selected.size === 0}
              style={{ background: '#059669' }}
              onClick={() => {
                if (selected.size > 0) setConfirmOpen('pass');
              }}
            >
              선택 수료 확정
            </Button>
            <Button
              size="sm"
              disabled={selected.size === 0}
              variant="outline"
              style={{ borderColor: '#CF222E', color: '#CF222E' }}
              onClick={() => {
                if (selected.size > 0) setConfirmOpen('fail');
              }}
            >
              미수료 확정
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setConfirmOpen('cert');
              }}
            >
              이수증 일괄 발급
            </Button>
          </div>
        </div>
      </div>

      {/* Pass confirm */}
      <Modal
        open={confirmOpen === 'pass'}
        onClose={() => setConfirmOpen(null)}
        title="수료 확정"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(null)}>
              취소
            </Button>
            <Button size="sm" style={{ background: '#059669' }} onClick={() => doConfirm('pass')}>
              수료 확정
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[#444D56]">
            선택한 <span className="font-bold">{selected.size}건</span>을 수료로 확정합니다.
          </p>
          <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#92400E] leading-relaxed">
            수료 확정 시 <strong>마일리지 200점이 자동 적립</strong>됩니다(설문 완료자 한정).
            <br />
            동일 프로그램 중복 적립은 차단됩니다.
          </div>
        </div>
      </Modal>

      {/* Fail confirm */}
      <ConfirmDialog
        open={confirmOpen === 'fail'}
        title="미수료 확정"
        message={`선택한 ${selected.size}건을 미수료로 확정합니다. 미수료 사유가 학생에게 공개됩니다.`}
        confirmLabel="미수료 확정"
        danger
        onConfirm={() => doConfirm('fail')}
        onCancel={() => setConfirmOpen(null)}
      />

      {/* Cert confirm */}
      <ConfirmDialog
        open={confirmOpen === 'cert'}
        title="이수증 일괄 발급"
        message={`수료 확정된 ${passCount}건의 이수증을 PDF로 일괄 발급합니다.`}
        confirmLabel="발급 시작"
        onConfirm={() => {
          setConfirmOpen(null);
          toast(`이수증 ${passCount}부 PDF 생성을 시작합니다.`, 'success');
        }}
        onCancel={() => setConfirmOpen(null)}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

/**
 * 비교과 프로그램 참여·결과 관리 3탭 (신청심사/출결관리/결과등록·이수판정).
 *
 * @param {Object} props
 * @param {() => void} props.onBack
 */
export default function ParticipationPage({ onBack }) {
  const [tab, setTab] = useState('review');

  const TABS = [
    { key: 'review', label: '① 신청 심사' },
    { key: 'attendance', label: '② 출결 관리' },
    { key: 'result', label: '③ 결과 등록·이수 판정' },
  ];

  return (
    <div>
      <ProgramBar onBack={onBack} />

      <div className="mb-5">
        <Tabs tabs={TABS} active={tab} onChange={setTab} accentColor="#2563EB" />
      </div>

      {tab === 'review' && <ApplicationReview />}
      {tab === 'attendance' && <AttendanceManage />}
      {tab === 'result' && <ResultJudge />}
    </div>
  );
}
