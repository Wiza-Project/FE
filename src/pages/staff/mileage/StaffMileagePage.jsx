import { useState } from 'react';
import { Button, Modal, Drawer, StatTile, toast } from '@/components/common';

const A = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// ─── shared helpers ────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {import('react').ReactNode} props.children
 * @param {import('react').ReactNode} [props.right]
 */
function SCard({ title, children, right }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: A }} />
          <span className="text-[13px] font-bold text-[#1F2328]">{title}</span>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Chip({ label, bg, text }) {
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: bg, color: text }}
    >
      {label}
    </span>
  );
}

function TH({ children, center }) {
  return (
    <th
      className={`px-4 py-2.5 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap bg-[#F6F8FA] ${center ? 'text-center' : 'text-left'}`}
    >
      {children}
    </th>
  );
}

function TD({ children, center, cls }) {
  return (
    <td className={`px-4 py-3 text-[12px] ${center ? 'text-center' : ''} ${cls ?? ''}`}>
      {children}
    </td>
  );
}

// ─── data ──────────────────────────────────────────────────────────────────────

const INIT_POLICIES = [
  {
    id: 'ACT-001',
    cat: '어학·국제',
    name: '해외 어학연수',
    path: 'CLAIM',
    score: 80,
    formula: '기본',
    max: 160,
    dup: 'ONCE',
    valid: '2026-v1',
  },
  {
    id: 'ACT-002',
    cat: '자격·면허',
    name: '국가공인자격증',
    path: 'CLAIM',
    score: 60,
    formula: '기본',
    max: 120,
    dup: 'PER_YEAR',
    valid: '2026-v1',
  },
  {
    id: 'ACT-003',
    cat: '봉사·참여',
    name: '자원봉사',
    path: 'AUTO',
    score: 1,
    formula: '시간×1점',
    max: 80,
    dup: 'PER_TERM',
    valid: '2026-v1',
  },
  {
    id: 'ACT-004',
    cat: '비교과',
    name: '비교과 프로그램 이수',
    path: 'AUTO',
    score: 30,
    formula: '기본',
    max: 120,
    dup: 'NONE',
    valid: '2026-v1',
  },
  {
    id: 'ACT-005',
    cat: '교내활동',
    name: '학생회·동아리 임원',
    path: 'CLAIM',
    score: 50,
    formula: '기본',
    max: 100,
    dup: 'PER_TERM',
    valid: '2026-v1',
  },
];
const COMP_MAP = [
  { act: '해외 어학연수', comp: '글로벌역량', sub: '언어소통', weight: 50 },
  { act: '국가공인자격증', comp: '전문역량', sub: '전공지식', weight: 70 },
  { act: '자원봉사', comp: '공동체역량', sub: '사회참여', weight: 30 },
  { act: '비교과 프로그램 이수', comp: '자기개발', sub: '진로설계', weight: 40 },
  { act: '학생회·동아리 임원', comp: '리더십역량', sub: '조직관리', weight: 45 },
];
const CERT_CRITERIA = [
  { cat: '취업지원장학', range: '300~499점', amount: '30만원', tie: '동등지급' },
  { cat: '취업지원장학', range: '500점 이상', amount: '60만원', tie: '동등지급' },
  { cat: '졸업인증', range: '200점 이상', amount: '—', tie: '—' },
  { cat: '인증서 A등급', range: '400점 이상', amount: '—', tie: '선착순' },
];
const INIT_REVIEWS = [
  {
    id: 'ML-2026-0541',
    date: '08-13',
    studentId: '20231234',
    name: '홍길동',
    type: '해외 어학연수',
    content: '영국 4주 어학연수 수료 (IELTS 7.5)',
    score: 80,
    auto: '통과',
    status: '대기',
  },
  {
    id: 'ML-2026-0540',
    date: '08-13',
    studentId: '20232050',
    name: '최지수',
    type: '국가공인자격증',
    content: 'SQLD 자격증 취득 (2026-07-15)',
    score: 60,
    auto: '중복 의심',
    status: '검토중',
  },
  {
    id: 'ML-2026-0539',
    date: '08-12',
    studentId: '20231111',
    name: '김영희',
    type: '비교과 이수',
    content: '진로설계 프로그램 이수 (2024-09)',
    score: 30,
    auto: '유효기간 만료',
    status: '대기',
  },
  {
    id: 'ML-2026-0538',
    date: '08-12',
    studentId: '20231500',
    name: '정유진',
    type: '자원봉사',
    content: '지역 복지관 봉사 120시간 완료',
    score: 40,
    auto: '통과',
    status: '대기',
  },
  {
    id: 'ML-2026-0537',
    date: '08-11',
    studentId: '20230777',
    name: '이민수',
    type: '교내 경진대회',
    content: '캡스톤 디자인 최우수상 수상',
    score: 100,
    auto: '통과',
    status: '승인',
  },
  {
    id: 'ML-2026-0535',
    date: '08-10',
    studentId: '20231876',
    name: '정하준',
    type: '해외 어학연수',
    content: '미국 2주 연수 (2025-07 취득)',
    score: 40,
    auto: '중복 의심',
    status: '보완요청',
  },
];

const AUTO_STYLE = {
  통과: { bg: '#D1FAE5', text: '#059669' },
  '중복 의심': { bg: '#FEF3C7', text: '#D97706' },
  '유효기간 만료': { bg: '#FEE2E2', text: '#CF222E' },
};
const REVIEW_STYLE = {
  대기: { bg: '#F3F4F6', text: '#374151' },
  검토중: { bg: '#FEF3C7', text: '#D97706' },
  승인: { bg: '#D1FAE5', text: '#059669' },
  보완요청: { bg: '#FDE68A', text: '#92400E' },
  반려: { bg: '#FEE2E2', text: '#CF222E' },
};

const SUPPLEMENT_CODES = ['선택하세요', '증빙 불충분', '내용 불일치', '기간 확인 필요', '기타'];
const REJECT_CODES = ['선택하세요', '허위 증빙', '유효기간 초과', '중복 적립 해당', '기타'];

// ─── Tab ① 기준 설정 ─────────────────────────────────────────────────────────────

function TabPolicySettings() {
  const [policies, setPolicies] = useState(INIT_POLICIES);
  const [version, setVersion] = useState('2026-v1');
  const [pForm, setPForm] = useState({
    cat: '어학·국제',
    name: '',
    score: '',
    path: 'CLAIM',
    max: '',
    dup: 'NONE',
  });
  const [editId, setEditId] = useState(null);
  const [newVerOpen, setNewVerOpen] = useState(false);

  const addPolicy = () => {
    if (!pForm.name.trim() || !pForm.score) {
      toast('활동유형명과 기본점수를 입력해 주세요.', 'error');
      return;
    }
    const id = `ACT-${String(policies.length + 1).padStart(3, '0')}`;
    setPolicies((p) => [
      ...p,
      {
        id,
        cat: pForm.cat,
        name: pForm.name,
        path: pForm.path,
        score: +pForm.score,
        formula: '기본',
        max: +pForm.max || 200,
        dup: pForm.dup,
        valid: version,
      },
    ]);
    setPForm({ cat: '어학·국제', name: '', score: '', path: 'CLAIM', max: '', dup: 'NONE' });
    toast('기준이 등록되었습니다.', 'success');
  };

  const delPolicy = (id) => {
    setPolicies((p) => p.filter((r) => r.id !== id));
    toast('삭제되었습니다.', 'info');
  };

  const PATH_CHIP = (p) =>
    p === 'AUTO' ? { bg: '#D1FAE5', text: '#059669' } : { bg: '#F3F4F6', text: '#374151' };
  const DUP_LABELS = { NONE: '무제한', ONCE: '1회', PER_TERM: '학기당', PER_YEAR: '연도당' };

  return (
    <div className="flex flex-col gap-5">
      {/* Version bar */}
      <div className="flex items-center gap-3">
        <label className="text-[11px] font-semibold text-[#656D76]">정책 버전</label>
        <select
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="h-8 px-3 text-[13px] font-bold rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
          style={{ color: A }}
        >
          {['2026-v1', '2025-v2', '2025-v1'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => setNewVerOpen(true)}
          className="h-8 px-4 text-[12px] font-bold text-white rounded-[6px]"
          style={{ background: A }}
        >
          새 버전 만들기
        </button>
        <span className="text-[11px] text-[#9AA0A6]">
          현재 적용 버전: <strong>{version}</strong>
        </span>
      </div>

      {/* Warning banner */}
      <div className="px-5 py-3 rounded-[8px] bg-[#FFFBEB] border border-[#FDE68A] flex gap-3">
        <span className="text-[14px] shrink-0">ℹ️</span>
        <p className="text-[12px] text-[#92400E] leading-relaxed">
          정책은 버전으로 관리되며 원장에 적용 시점의 버전이 함께 저장됩니다. 정책을 변경해도 과거
          적립 내역은 바뀌지 않습니다.
        </p>
      </div>

      {/* Inline registration form */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: A }} />
          <span className="text-[12px] font-bold text-[#1F2328]">활동유형 등록</span>
        </div>
        <div className="flex gap-3 items-end flex-wrap">
          {[
            {
              label: '대분류',
              el: (
                <select
                  value={pForm.cat}
                  onChange={(e) => setPForm((p) => ({ ...p, cat: e.target.value }))}
                  className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none w-28"
                >
                  {['어학·국제', '자격·면허', '봉사·참여', '비교과', '교내활동', '창업·혁신'].map(
                    (v) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
              ),
            },
            {
              label: '활동유형명',
              el: (
                <input
                  value={pForm.name}
                  onChange={(e) => setPForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="예) 토익 취득"
                  className="h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none w-40"
                />
              ),
            },
            {
              label: '기본점수',
              el: (
                <input
                  value={pForm.score}
                  onChange={(e) => setPForm((p) => ({ ...p, score: e.target.value }))}
                  type="number"
                  className="h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none w-20"
                />
              ),
            },
            {
              label: '적립경로',
              el: (
                <select
                  value={pForm.path}
                  onChange={(e) => setPForm((p) => ({ ...p, path: e.target.value }))}
                  className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none w-24"
                >
                  {['AUTO', 'CLAIM'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              ),
            },
            {
              label: '상한',
              el: (
                <input
                  value={pForm.max}
                  onChange={(e) => setPForm((p) => ({ ...p, max: e.target.value }))}
                  type="number"
                  placeholder="200"
                  className="h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none w-20"
                />
              ),
            },
            {
              label: '중복 규칙',
              el: (
                <select
                  value={pForm.dup}
                  onChange={(e) => setPForm((p) => ({ ...p, dup: e.target.value }))}
                  className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none w-28"
                >
                  {['NONE', 'ONCE', 'PER_TERM', 'PER_YEAR'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              ),
            },
          ].map(({ label, el }) => (
            <div key={label}>
              <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">{label}</label>
              {el}
            </div>
          ))}
          <div>
            <div className="h-5" />
            <button
              onClick={addPolicy}
              className="h-8 px-4 text-[12px] font-bold text-white rounded-[6px]"
              style={{ background: A }}
            >
              등록
            </button>
          </div>
        </div>
      </div>

      {/* Policy table */}
      <SCard
        title="등록된 기준"
        right={<Chip label={`${policies.length}종`} bg="#FEF3C7" text={A} />}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <TH>유형 ID</TH>
                <TH>대분류</TH>
                <TH>활동유형</TH>
                <TH center>적립경로</TH>
                <TH center>기본점수</TH>
                <TH>산식</TH>
                <TH center>상한</TH>
                <TH center>중복규칙</TH>
                <TH>유효정책</TH>
                <TH center>관리</TH>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => {
                const pc = PATH_CHIP(p.path);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] ${editId === p.id ? 'bg-[#FFFBEB]' : ''}`}
                  >
                    <TD cls="font-mono text-[10px]">
                      <span style={{ color: A }}>{p.id}</span>
                    </TD>
                    <TD cls="text-[#656D76]">{p.cat}</TD>
                    <TD cls="font-semibold text-[#1F2328]">{p.name}</TD>
                    <TD center>
                      <Chip label={p.path} bg={pc.bg} text={pc.text} />
                    </TD>
                    <TD center cls="font-black">
                      <span style={{ color: A }}>{p.score}점</span>
                    </TD>
                    <TD cls="text-[#656D76]">{p.formula}</TD>
                    <TD center cls="text-[#444D56]">
                      {p.max}점
                    </TD>
                    <TD center>
                      <span className="text-[10px] font-semibold text-[#656D76]">
                        {DUP_LABELS[p.dup]}
                      </span>
                    </TD>
                    <TD cls="font-mono text-[10px] text-[#9AA0A6]">{p.valid}</TD>
                    <TD center>
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => setEditId(editId === p.id ? null : p.id)}
                          className="h-6 px-2 text-[9px] font-bold rounded-[4px] bg-[#FEF3C7] hover:bg-[#FDE68A] transition-colors"
                          style={{ color: A }}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => delPolicy(p.id)}
                          className="h-6 px-2 text-[9px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SCard>

      {/* Bottom 2-col */}
      <div className="grid grid-cols-2 gap-5">
        <SCard title="활동유형–핵심역량 매핑">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <TH>활동유형</TH>
                  <TH>핵심역량</TH>
                  <TH>하위역량</TH>
                  <TH center>가중치</TH>
                </tr>
              </thead>
              <tbody>
                {COMP_MAP.map((r) => (
                  <tr
                    key={r.act}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]"
                  >
                    <TD cls="text-[#444D56]">{r.act}</TD>
                    <TD cls="font-semibold text-[#1F2328]">{r.comp}</TD>
                    <TD cls="text-[#656D76]">{r.sub}</TD>
                    <TD center>
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${r.weight}%`, background: A }}
                          />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: A }}>
                          {r.weight}%
                        </span>
                      </div>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SCard>

        <SCard title="인증·장학 기준">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <TH>구분</TH>
                  <TH>기준 구간</TH>
                  <TH center>지급액</TH>
                  <TH center>동점 처리</TH>
                </tr>
              </thead>
              <tbody>
                {CERT_CRITERIA.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]"
                  >
                    <TD cls="font-semibold text-[#1F2328]">{r.cat}</TD>
                    <TD cls="font-mono text-[11px]">
                      <span style={{ color: A }}>{r.range}</span>
                    </TD>
                    <TD center cls="font-bold text-[#1F2328]">
                      {r.amount}
                    </TD>
                    <TD center cls="text-[#9AA0A6]">
                      {r.tie}
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SCard>
      </div>

      {/* New version modal */}
      <Modal
        open={newVerOpen}
        onClose={() => setNewVerOpen(false)}
        title="새 정책 버전 만들기"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNewVerOpen(false)}>
              취소
            </Button>
            <button
              className="h-8 px-5 text-[13px] font-bold text-white rounded-[6px]"
              style={{ background: A }}
              onClick={() => {
                setVersion('2026-v2');
                setNewVerOpen(false);
                toast('2026-v2 버전이 생성되었습니다. 현재 기준을 복사했습니다.', 'success');
              }}
            >
              생성
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              새 버전 이름
            </label>
            <input
              defaultValue="2026-v2"
              className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-[#9AA0A6]">
            현재 버전 <strong>{version}</strong>의 기준을 복사하여 새 버전을 생성합니다. 변경 후
            학사운영위원회 승인이 필요합니다.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab ② 심사 접수함 ─────────────────────────────────────────────────────────

function TabReviewInbox() {
  const [reviews, setReviews] = useState(INIT_REVIEWS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState(null);
  const [decision, setDecision] = useState('승인');
  const [rCode, setRCode] = useState('선택 안 함');
  const [opinion, setOpinion] = useState('');
  const [cancelOpen, setCancelOpen] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelEntries, setCancelEntries] = useState([]);
  const [selected, setSelected] = useState([]);

  const openDrawer = (item) => {
    setDrawerItem(item);
    setDecision('승인');
    setRCode('선택 안 함');
    setOpinion('');
    setDrawerOpen(true);
  };

  const submitReview = () => {
    if (!drawerItem) return;
    setReviews((p) => p.map((r) => (r.id === drawerItem.id ? { ...r, status: decision } : r)));
    setDrawerOpen(false);
    toast(
      decision === '승인' ? '승인 완료. EARN 거래가 생성됩니다.' : `${decision} 처리 완료.`,
      decision === '승인' ? 'success' : 'info',
    );
  };

  const submitCancel = () => {
    if (!cancelReason.trim()) {
      toast('취소 사유를 입력해 주세요.', 'error');
      return;
    }
    if (!cancelOpen) return;
    const entry = {
      id: `CXL-${Date.now()}`,
      origId: cancelOpen.id,
      date: '2026-08-13',
      name: cancelOpen.name,
      type: cancelOpen.type,
      score: cancelOpen.score,
      reason: cancelReason,
    };
    setCancelEntries((p) => [entry, ...p]);
    setReviews((p) => p.map((r) => (r.id === cancelOpen.id ? { ...r, status: '반려' } : r)));
    setCancelOpen(null);
    setCancelReason('');
    toast('승인 취소 완료. CANCEL 거래가 생성되었습니다.', 'info');
  };

  const rCodes =
    decision === '승인'
      ? ['선택 안 함', '정상 처리']
      : decision === '보완요청'
        ? SUPPLEMENT_CODES
        : REJECT_CODES;

  const toggleSel = (id) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4">
        <StatTile
          label="심사 대기"
          value="23"
          accentColor={A}
          trend={{ value: '어제 대비 +4', up: true }}
        />
        <StatTile label="검토중" value="5" accentColor={A} />
        <StatTile
          label="이번 달 승인"
          value="142"
          accentColor="#059669"
          trend={{ value: '전월 대비 +18', up: true }}
        />
        <StatTile label="보완 요청" value="8" accentColor="#CF222E" />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 flex flex-wrap gap-3 items-end shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        {[
          {
            label: '상태',
            el: (
              <select className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white w-28">
                {['전체', '대기', '검토중', '승인', '보완요청', '반려'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            ),
          },
          {
            label: '활동유형',
            el: (
              <select className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white w-32">
                {[
                  '전체',
                  '해외 어학연수',
                  '국가공인자격증',
                  '자원봉사',
                  '비교과 이수',
                  '교내 경진대회',
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            ),
          },
          {
            label: '학과',
            el: (
              <select className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white w-32">
                {['전체', '컴퓨터공학과', '경영학과', '심리학과', '산업공학과'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            ),
          },
          {
            label: '신청기간',
            el: (
              <input
                type="date"
                className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white w-36"
              />
            ),
          },
          {
            label: '학번·성명',
            el: (
              <input
                placeholder="검색"
                className="h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white w-28"
              />
            ),
          },
        ].map(({ label, el }) => (
          <div key={label}>
            <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">{label}</label>
            {el}
          </div>
        ))}
        <div>
          <div className="h-5" />
          <button
            className="h-8 px-4 text-[12px] font-bold text-white rounded-[6px]"
            style={{ background: A }}
          >
            조회
          </button>
        </div>
      </div>

      <SCard
        title="심사 목록"
        right={
          selected.length > 0 ? (
            <span className="text-[11px] text-[#9AA0A6]">{selected.length}건 선택</span>
          ) : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="w-10 px-4 py-2.5 bg-[#F6F8FA]">
                  <input
                    type="checkbox"
                    onChange={(e) => setSelected(e.target.checked ? reviews.map((r) => r.id) : [])}
                  />
                </th>
                <TH>신청 ID</TH>
                <TH>신청일</TH>
                <TH>학번</TH>
                <TH>성명</TH>
                <TH>활동유형</TH>
                <TH>활동 내용</TH>
                <TH center>점수</TH>
                <TH center>증빙</TH>
                <TH center>자동검증</TH>
                <TH center>상태</TH>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => {
                const as = AUTO_STYLE[r.auto];
                const rs = REVIEW_STYLE[r.status];
                return (
                  <tr
                    key={r.id}
                    onClick={() => openDrawer(r)}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FFFBEB] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.includes(r.id)}
                        onChange={() => toggleSel(r.id)}
                      />
                    </td>
                    <TD cls="font-mono text-[10px]">
                      <span style={{ color: A }}>{r.id}</span>
                    </TD>
                    <TD cls="font-mono text-[11px] text-[#9AA0A6]">{r.date}</TD>
                    <TD cls="font-mono text-[11px] text-[#9AA0A6]">{r.studentId}</TD>
                    <TD cls="font-bold text-[#1F2328]">{r.name}</TD>
                    <TD cls="text-[#656D76]">{r.type}</TD>
                    <TD cls="text-[#444D56] max-w-[180px] truncate">{r.content}</TD>
                    <TD center cls="font-black">
                      <span style={{ color: A }}>{r.score}점</span>
                    </TD>
                    <TD center>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="h-5 px-2 text-[9px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB]"
                      >
                        보기
                      </button>
                    </TD>
                    <TD center>
                      <Chip label={r.auto} bg={as.bg} text={as.text} />
                    </TD>
                    <TD center>
                      <div className="flex items-center gap-1.5 justify-center">
                        <Chip label={r.status} bg={rs.bg} text={rs.text} />
                        {r.status === '승인' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelOpen(r);
                            }}
                            className="h-5 px-2 text-[9px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors"
                          >
                            승인 취소
                          </button>
                        )}
                      </div>
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SCard>

      {/* CANCEL ledger — shown after any cancellations */}
      {cancelEntries.length > 0 && (
        <SCard title={`원장 취소 거래 (CANCEL) — ${cancelEntries.length}건`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <TH>취소 ID</TH>
                  <TH>원신청 ID</TH>
                  <TH>처리일</TH>
                  <TH>학생</TH>
                  <TH>활동유형</TH>
                  <TH center>점수 조정</TH>
                  <TH>처리 유형</TH>
                  <TH>사유</TH>
                </tr>
              </thead>
              <tbody>
                {cancelEntries.map((c) => (
                  <tr key={c.id} className="border-b border-[#F3F4F6] last:border-0 bg-[#FEF2F2]">
                    <TD cls="font-mono text-[10px] text-[#CF222E]">{c.id}</TD>
                    <TD cls="font-mono text-[10px] text-[#9AA0A6]">{c.origId}</TD>
                    <TD cls="font-mono text-[11px] text-[#9AA0A6]">{c.date}</TD>
                    <TD cls="font-bold text-[#1F2328]">{c.name}</TD>
                    <TD cls="text-[#656D76]">{c.type}</TD>
                    <TD center cls="font-black text-[#CF222E]">
                      −{c.score}점
                    </TD>
                    <TD center>
                      <Chip label="CANCEL" bg="#FEE2E2" text="#CF222E" />
                    </TD>
                    <TD cls="text-[#656D76] text-[11px]">{c.reason}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SCard>
      )}

      {/* Review drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="심사 처리"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              취소
            </Button>
            <button
              onClick={submitReview}
              className="h-8 px-5 text-[13px] font-bold text-white rounded-[6px]"
              style={{ background: A }}
            >
              처리
            </button>
          </div>
        }
      >
        {drawerItem && (
          <div className="flex flex-col gap-5 text-[12px]">
            {/* Student + activity header */}
            <div className="p-4 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB]">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: '학번', v: drawerItem.studentId },
                  { l: '성명', v: drawerItem.name },
                  { l: '활동유형', v: drawerItem.type },
                  { l: '사전 점수', v: `${drawerItem.score}점` },
                ].map((f) => (
                  <div key={f.l}>
                    <p className="text-[10px] text-[#9AA0A6] mb-0.5">{f.l}</p>
                    <p className="font-bold text-[#1F2328]">{f.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Submitted content definition table */}
            <div>
              <p className="text-[11px] font-bold text-[#656D76] mb-2">제출 내용</p>
              <table className="w-full border border-[#E5E7EB] rounded-[6px] overflow-hidden text-[11px]">
                <tbody>
                  {[
                    ['활동 내용', drawerItem.content],
                    ['신청일', drawerItem.date],
                    ['점수 요청', `${drawerItem.score}점`],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="px-3 py-2 font-semibold text-[#656D76] bg-[#F9FAFB] w-24 whitespace-nowrap">
                        {k}
                      </td>
                      <td className="px-3 py-2 text-[#1F2328]">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Evidence preview area */}
            <div>
              <p className="text-[11px] font-bold text-[#656D76] mb-2">증빙 파일 미리보기</p>
              <div className="h-32 rounded-[8px] bg-[#F3F4F6] border border-dashed border-[#D1D5DB] flex items-center justify-center text-[11px] text-[#9AA0A6]">
                <div className="text-center">
                  <div className="text-[28px] mb-1">📄</div>
                  <div>certificate_2026.pdf</div>
                  <div className="text-[10px] mt-0.5 text-[#D1D5DB]">이미지·PDF 뷰어 영역</div>
                </div>
              </div>
            </div>

            {/* Auto validation badges */}
            <div>
              <p className="text-[11px] font-bold text-[#656D76] mb-2">자동 검증 결과</p>
              <div className="flex gap-2">
                {['통과', '중복 의심', '유효기간 만료'].map((b) => {
                  const st = AUTO_STYLE[b];
                  const active = drawerItem.auto === b;
                  return (
                    <span
                      key={b}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full transition-opacity ${active ? 'opacity-100' : 'opacity-25'}`}
                      style={{ background: st.bg, color: st.text }}
                    >
                      {active && '● '}
                      {b}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Decision radios */}
            <div>
              <p className="text-[11px] font-bold text-[#656D76] mb-2">처리 결정</p>
              <div className="flex gap-2 mb-3">
                {['승인', '보완요청', '반려'].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDecision(d);
                      setRCode(d === '승인' ? '선택 안 함' : '선택하세요');
                    }}
                    className="h-8 px-4 text-[12px] font-bold rounded-[6px] border-2 transition-all"
                    style={
                      decision === d
                        ? {
                            background: d === '승인' ? A : d === '보완요청' ? '#D97706' : '#CF222E',
                            color: '#fff',
                            borderColor: 'transparent',
                          }
                        : { background: '#fff', color: '#656D76', borderColor: '#E5E7EB' }
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#656D76] mb-1">
                    사유 코드
                  </label>
                  <select
                    value={rCode}
                    onChange={(e) => setRCode(e.target.value)}
                    className="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                  >
                    {rCodes.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#656D76] mb-1">
                    심사 의견
                  </label>
                  <textarea
                    value={opinion}
                    onChange={(e) => setOpinion(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white resize-none focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Earn preview — only when 승인 selected */}
            {decision === '승인' && (
              <div className="rounded-[8px] border-2 overflow-hidden" style={{ borderColor: A }}>
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: '#FFFBEB' }}
                >
                  <div className="w-1 h-4 rounded-full" style={{ background: A }} />
                  <span className="text-[11px] font-bold" style={{ color: A }}>
                    적립 결과 미리보기
                  </span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {[
                    { l: '처리유형', v: 'EARN' },
                    { l: '적립 점수', v: `+${drawerItem.score}점` },
                    { l: '적용 정책', v: '2026-v1' },
                    { l: '연계 역량', v: '글로벌역량' },
                    { l: '처리자', v: '김담당' },
                    { l: '처리 일시', v: '2026-08-13 (현재)' },
                  ].map((f) => (
                    <div key={f.l}>
                      <p className="text-[10px] text-[#9AA0A6]">{f.l}</p>
                      <p className="text-[12px] font-black text-[#1F2328]">{f.v}</p>
                    </div>
                  ))}
                </div>
                <div
                  className="px-4 pb-3 text-[10px] leading-relaxed bg-[#FFFBEB]"
                  style={{ color: A }}
                >
                  ✓ 승인 즉시 원장에 EARN 거래가 생성됩니다. 동일 원천의 중복 적립은 시스템이
                  차단합니다.
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Cancel modal */}
      <Modal
        open={!!cancelOpen}
        onClose={() => setCancelOpen(null)}
        title="승인 취소 (역분개)"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(null)}>
              닫기
            </Button>
            <Button variant="danger" onClick={submitCancel}>
              취소 확정
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[12px]">
            <p className="font-bold text-[#1F2328] mb-0.5">
              {cancelOpen?.name} · {cancelOpen?.type}
            </p>
            <p className="text-[#656D76]">
              기적립 점수: <span className="font-bold text-[#059669]">+{cancelOpen?.score}점</span>
            </p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              취소 사유 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="예) 증빙 허위 확인, 중복 적립 발견 등"
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none bg-white focus:outline-none"
            />
          </div>
          <div className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] text-[11px] text-[#991B1B] leading-relaxed">
            원본 신청은 수정되지 않습니다.{' '}
            <strong>−{cancelOpen?.score}점 취소 거래(CANCEL)가 새로 생성</strong>
            되며 이력은 모두 보존됩니다.
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * 교직원 마일리지 관리 화면. 기준 설정과 심사 접수함 2개 탭으로 구성됩니다.
 */
export default function StaffMileagePage() {
  const [tab, setTab] = useState(0);
  const TABS = ['기준 설정', '심사 접수함'];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-black text-[#1F2328]">마일리지 관리</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            기준 설정 · 증빙 심사 · 적립 취소(역분개)
          </p>
        </div>
        <Chip label="2026-v1 적용중" bg="#FEF3C7" text={A} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB]">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`h-10 px-6 text-[13px] font-bold transition-colors border-b-2 -mb-px ${tab === i ? '' : 'border-transparent text-[#656D76] hover:text-[#1F2328]'}`}
            style={tab === i ? { color: A, borderColor: A } : {}}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <TabPolicySettings />}
      {tab === 1 && <TabReviewInbox />}
    </div>
  );
}
