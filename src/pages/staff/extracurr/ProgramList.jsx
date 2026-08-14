import { useState } from 'react';
import { Button, ConfirmDialog, Modal, toast } from '@/components/common';

// ─── Data ─────────────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  작성중: { bg: '#F3F4F6', text: '#6B7280', label: '작성중' },
  심사요청: { bg: '#FEF3C7', text: '#D97706', label: '심사요청' },
  승인: { bg: '#D1FAE5', text: '#059669', label: '승인' },
  반려: { bg: '#FEE2E2', text: '#CF222E', label: '반려' },
  모집중: { bg: '#DBEAFE', text: '#2563EB', label: '모집중' },
  운영중: { bg: '#DBEAFE', text: '#1D4ED8', label: '운영중' },
  종료: { bg: '#F3F4F6', text: '#9AA0A6', label: '종료' },
};

const PROGRAMS = [
  {
    id: 'P001',
    name: '해외문화체험 워크숍',
    category: '글로벌',
    operPeriod: '2026-09-01~09-07',
    recruitPeriod: '2026-08-01~08-16',
    applied: 20,
    capacity: 30,
    status: '모집중',
    dept: '비교과운영부서',
    semester: '2026-1',
  },
  {
    id: 'P002',
    name: '진로탐색 워크숍 A',
    category: '진로',
    operPeriod: '2026-09-10~09-11',
    recruitPeriod: '2026-08-01~08-20',
    applied: 15,
    capacity: 20,
    status: '모집중',
    dept: '취업지원팀',
    semester: '2026-1',
  },
  {
    id: 'P003',
    name: '리더십 캠프',
    category: '리더십',
    operPeriod: '2026-09-15~09-16',
    recruitPeriod: '2026-08-05~08-22',
    applied: 28,
    capacity: 30,
    status: '운영중',
    dept: '학생지원팀',
    semester: '2026-1',
  },
  {
    id: 'P004',
    name: '독서인증제 2026-1',
    category: '학습',
    operPeriod: '2026-03-02~08-31',
    recruitPeriod: '2026-03-02~03-14',
    applied: 42,
    capacity: 50,
    status: '운영중',
    dept: '비교과운영부서',
    semester: '2026-1',
  },
  {
    id: 'P005',
    name: 'NCS 직업기초 특강',
    category: '취업',
    operPeriod: '2026-09-20~09-21',
    recruitPeriod: '2026-08-10~08-25',
    applied: 18,
    capacity: 25,
    status: '모집중',
    dept: '취업지원팀',
    semester: '2026-1',
  },
  {
    id: 'P006',
    name: '빅데이터 분석 워크숍',
    category: '학습',
    operPeriod: '2026-09-25~09-26',
    recruitPeriod: '2026-08-10~08-22',
    applied: 12,
    capacity: 15,
    status: '모집중',
    dept: '비교과운영부서',
    semester: '2026-1',
  },
  {
    id: 'P007',
    name: '창업 아이디어 경진대회',
    category: '창업',
    operPeriod: '2026-10-01~10-02',
    recruitPeriod: '2026-08-15~08-30',
    applied: 8,
    capacity: 20,
    status: '승인',
    dept: '창업지원센터',
    semester: '2026-1',
  },
  {
    id: 'P008',
    name: '글쓰기 클리닉',
    category: '학습',
    operPeriod: '2026-10-05~10-06',
    recruitPeriod: '2026-08-20~09-05',
    applied: 0,
    capacity: 20,
    status: '심사요청',
    dept: '교양교육원',
    semester: '2026-1',
  },
  {
    id: 'P009',
    name: '영어 프레젠테이션 클리닉',
    category: '글로벌',
    operPeriod: '2026-10-10',
    recruitPeriod: '2026-08-20~09-10',
    applied: 0,
    capacity: 15,
    status: '작성중',
    dept: '어학교육원',
    semester: '2026-1',
  },
  {
    id: 'P010',
    name: '봉사단 해외봉사 프로그램',
    category: '봉사',
    operPeriod: '2025-12-20~12-27',
    recruitPeriod: '2025-11-01~11-15',
    applied: 24,
    capacity: 24,
    status: '종료',
    dept: '사회봉사팀',
    semester: '2025-2',
  },
  {
    id: 'P011',
    name: '멘토링 프로그램 2025-2',
    category: '진로',
    operPeriod: '2025-09-01~12-15',
    recruitPeriod: '2025-08-01~08-20',
    applied: 60,
    capacity: 60,
    status: '종료',
    dept: '취업지원팀',
    semester: '2025-2',
  },
  {
    id: 'P012',
    name: '문화예술 체험 프로그램',
    category: '문화',
    operPeriod: '2026-10-15~10-16',
    recruitPeriod: '2026-09-01~09-20',
    applied: 0,
    capacity: 30,
    status: '반려',
    dept: '비교과운영부서',
    semester: '2026-1',
  },
];

const WAITLIST = [
  {
    rank: 1,
    studentId: '20231500',
    name: '강다은',
    dept: '경영학과',
    appliedAt: '2026-08-12 14:22',
  },
  {
    rank: 2,
    studentId: '20240102',
    name: '임채원',
    dept: '컴퓨터공학과',
    appliedAt: '2026-08-12 15:03',
  },
  {
    rank: 3,
    studentId: '20232201',
    name: '송민준',
    dept: '산업공학과',
    appliedAt: '2026-08-12 16:45',
  },
  {
    rank: 4,
    studentId: '20241300',
    name: '한소율',
    dept: '심리학과',
    appliedAt: '2026-08-13 09:11',
  },
];

const SEMESTERS = ['전체', '2026-1', '2025-2', '2025-1'];
const STATUS_LIST = ['전체', '작성중', '심사요청', '승인', '반려', '모집중', '운영중', '종료'];
const CATEGORIES = ['전체', '학습', '진로', '취업', '리더십', '글로벌', '봉사', '창업', '문화'];
const DEPTS = [
  '전체',
  '비교과운영부서',
  '취업지원팀',
  '학생지원팀',
  '창업지원센터',
  '교양교육원',
  '어학교육원',
  '사회봉사팀',
];

// ─── Which actions are available per status ───────────────────────────────────

function canEdit(s) {
  return s === '작성중' || s === '반려';
}
function canCloseRecruit(s) {
  return s === '모집중';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const { bg, text, label } = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: bg, color: text }}
    >
      {label}
    </span>
  );
}

function ApplyBar({ applied, capacity }) {
  const pct = capacity > 0 ? Math.min(100, (applied / capacity) * 100) : 0;
  const full = pct >= 100;
  const near = pct >= 80;
  const color = full ? '#CF222E' : near ? '#D97706' : '#2563EB';
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="font-bold" style={{ color }}>
          {applied}
        </span>
        <span className="text-[#9AA0A6]">/{capacity}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden w-[64px]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {() => void} props.onNew
 * @param {(id: string) => void} props.onEdit
 * @param {() => void} props.onParticipation
 */
export default function ProgramList({ onNew, onEdit, onParticipation }) {
  const [semester, setSemester] = useState('전체');
  const [status, setStatus] = useState('전체');
  const [category, setCategory] = useState('전체');
  const [dept, setDept] = useState('전체');
  const [keyword, setKeyword] = useState('');

  const [closeTarget, setCloseTarget] = useState(null);
  const [waitlistTarget, setWaitlistTarget] = useState(null);
  const [waitlist, setWaitlist] = useState(WAITLIST);
  const [promoteTarget, setPromoteTarget] = useState(null);

  const filtered = PROGRAMS.filter(
    (p) =>
      (semester === '전체' || p.semester === semester) &&
      (status === '전체' || p.status === status) &&
      (category === '전체' || p.category === category) &&
      (dept === '전체' || p.dept === dept) &&
      (!keyword || p.name.includes(keyword) || p.id.includes(keyword)),
  );

  const handleCopy = (p) => {
    toast(`'${p.name}'을 복사했습니다. 새 프로그램으로 저장하세요.`, 'success');
  };

  const handleCloseConfirm = () => {
    if (!closeTarget) return;
    toast(`'${closeTarget.name}' 모집을 마감했습니다.`, 'success');
    setCloseTarget(null);
  };

  const handlePromote = () => {
    if (!promoteTarget) return;
    const remaining = (waitlistTarget?.capacity ?? 0) - (waitlistTarget?.applied ?? 0);
    toast(
      `${promoteTarget.rank}번 대기자 ${promoteTarget.name}을(를) 참여자로 전환했습니다. 잔여 정원 ${remaining - 1}명. 학생에게 알림이 발송됩니다.`,
      'success',
    );
    setWaitlist((prev) =>
      prev.filter((w) => w.rank !== promoteTarget.rank).map((w, i) => ({ ...w, rank: i + 1 })),
    );
    setPromoteTarget(null);
  };

  const handleExclude = (entry) => {
    setWaitlist((prev) =>
      prev.filter((w) => w.rank !== entry.rank).map((w, i) => ({ ...w, rank: i + 1 })),
    );
    toast(`${entry.name} 학생을 대기열에서 제외했습니다.`, 'info');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-black text-[#1F2328]">비교과 프로그램 관리</h1>
          <p className="text-[13px] text-[#9AA0A6] mt-0.5">
            프로그램 개설·심사·모집·운영 전 주기를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onParticipation}>
            참여·결과 관리
          </Button>
          <Button onClick={onNew} style={{ background: '#2563EB' }}>
            + 프로그램 등록
          </Button>
        </div>
      </div>

      {/* FilterBar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-4 grid grid-cols-5 gap-3">
        {[
          { label: '학기', value: semester, set: setSemester, opts: SEMESTERS },
          { label: '상태', value: status, set: setStatus, opts: STATUS_LIST },
          { label: '분류', value: category, set: setCategory, opts: CATEGORIES },
          { label: '주관부서', value: dept, set: setDept, opts: DEPTS },
        ].map((f) => (
          <div key={f.label}>
            <label className="block text-[10px] font-semibold text-[#656D76] mb-1">{f.label}</label>
            <select
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="w-full h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              {f.opts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
        <div>
          <label className="block text-[10px] font-semibold text-[#656D76] mb-1">
            프로그램명·ID
          </label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="검색..."
            className="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#1F2328]">프로그램 목록</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#2563EB]">
            {filtered.length}개
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {[
                  'ID',
                  '프로그램명',
                  '분류',
                  '운영기간',
                  '모집기간',
                  '신청/정원',
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[#9AA0A6]">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] whitespace-nowrap">
                      {p.id}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-semibold text-[#1F2328] truncate">{p.name}</p>
                      <p className="text-[10px] text-[#9AA0A6]">{p.dept}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#656D76]">{p.category}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#444D56] whitespace-nowrap">
                      {p.operPeriod}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#444D56] whitespace-nowrap">
                      {p.recruitPeriod}
                    </td>
                    <td className="px-4 py-3">
                      <ApplyBar applied={p.applied} capacity={p.capacity} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-center flex-wrap">
                        <button
                          disabled={!canEdit(p.status)}
                          onClick={() => onEdit(p.id)}
                          className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]"
                        >
                          수정
                        </button>
                        <button
                          disabled={!canCloseRecruit(p.status)}
                          onClick={() => setCloseTarget(p)}
                          className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A]"
                        >
                          모집마감
                        </button>
                        {(p.status === '모집중' || p.status === '운영중') &&
                          p.applied >= p.capacity && (
                            <button
                              onClick={() => {
                                setWaitlistTarget(p);
                                setWaitlist(WAITLIST);
                              }}
                              className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB] transition-colors"
                            >
                              대기열
                            </button>
                          )}
                        <button
                          onClick={() => handleCopy(p)}
                          className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] transition-colors bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB]"
                        >
                          복사
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Close recruit confirm */}
      <ConfirmDialog
        open={!!closeTarget}
        title="모집 마감 확인"
        message={`'${closeTarget?.name}' 모집을 마감합니다.\n마감 후에는 신규 신청을 받을 수 없습니다.`}
        confirmLabel="마감 처리"
        danger
        onConfirm={handleCloseConfirm}
        onCancel={() => setCloseTarget(null)}
      />

      {/* Waitlist modal */}
      <Modal
        open={!!waitlistTarget}
        onClose={() => setWaitlistTarget(null)}
        title={`대기열 관리 — ${waitlistTarget?.name ?? ''}`}
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setWaitlistTarget(null)}>
              닫기
            </Button>
          </div>
        }
      >
        <div className="mb-4 p-3 rounded-[8px] bg-[#EFF6FF] border border-[#BFDBFE] text-[12px] text-[#1D4ED8]">
          <span className="font-bold">정원 초과 대기자 {waitlist.length}명</span>이 있습니다. 승격
          시 학생에게 자동 알림이 발송됩니다.
        </div>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['순번', '학번', '성명', '학과', '신청일시', '관리'].map((h, i) => (
                <th
                  key={h}
                  className={`px-3 py-2.5 text-[10px] font-semibold text-[#656D76] ${i < 4 ? 'text-center' : i === 4 ? 'text-left' : 'text-center'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waitlist.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[12px] text-[#9AA0A6]">
                  대기자가 없습니다.
                </td>
              </tr>
            ) : (
              waitlist.map((w) => (
                <tr
                  key={w.rank}
                  className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]"
                >
                  <td className="px-3 py-3 text-center font-black text-[13px] text-[#2563EB]">
                    {w.rank}
                  </td>
                  <td className="px-3 py-3 text-center font-mono text-[11px] text-[#9AA0A6]">
                    {w.studentId}
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-[#1F2328]">{w.name}</td>
                  <td className="px-3 py-3 text-center text-[#656D76]">{w.dept}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-[#9AA0A6]">{w.appliedAt}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex gap-1.5 justify-center">
                      <button
                        onClick={() => setPromoteTarget(w)}
                        className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#D1FAE5] text-[#059669] hover:bg-[#A7F3D0] transition-colors"
                      >
                        승격
                      </button>
                      <button
                        onClick={() => handleExclude(w)}
                        className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors"
                      >
                        제외
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Modal>

      {/* Promote confirm */}
      <ConfirmDialog
        open={!!promoteTarget}
        title="대기자 승격 확인"
        message={`${promoteTarget?.rank}번 대기자 ${promoteTarget?.name}을(를) 참여자로 전환합니다.\n잔여 정원 ${(waitlistTarget?.capacity ?? 0) - (waitlistTarget?.applied ?? 0) - 1 > 0 ? (waitlistTarget?.capacity ?? 0) - (waitlistTarget?.applied ?? 0) - 1 : 0}명.\n학생에게 카카오 알림톡·이메일이 자동 발송됩니다.`}
        confirmLabel="승격 처리"
        onConfirm={handlePromote}
        onCancel={() => setPromoteTarget(null)}
      />
    </div>
  );
}
