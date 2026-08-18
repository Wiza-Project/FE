import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Modal, StatTile, toast } from '@/components/common';

const A = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// ─── shared helpers ────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {import('react').ReactNode} props.children
 * @param {import('react').ReactNode} [props.right]
 */
function SectionCard({ title, children, right }) {
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
      className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap bg-[#F6F8FA] ${center ? 'text-center' : 'text-left'}`}
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

// ─── Tab 1: 구인 신청 검수 ──────────────────────────────────────────────────────

const JOB_REQUESTS = [
  {
    id: 'JR-2026-0041',
    date: '08-13',
    company: '(주)넥스트커리어',
    bizNo: '123-45-67890',
    certStatus: '인증',
    title: '백엔드 개발자 채용',
    ncs: '소프트웨어개발',
    headcount: 3,
    period: '08-20~09-10',
    status: '검수대기',
  },
  {
    id: 'JR-2026-0040',
    date: '08-13',
    company: '그린에너지(주)',
    bizNo: '234-56-78901',
    certStatus: '미인증',
    title: '재생에너지 연구원',
    ncs: '환경·에너지',
    headcount: 1,
    period: '08-25~09-20',
    status: '검수대기',
  },
  {
    id: 'JR-2026-0039',
    date: '08-12',
    company: '데이터랩스',
    bizNo: '345-67-89012',
    certStatus: '인증',
    title: 'AI 엔지니어 인턴',
    ncs: '인공지능',
    headcount: 2,
    period: '09-01~09-30',
    status: '검수대기',
  },
  {
    id: 'JR-2026-0038',
    date: '08-12',
    company: '(주)브릿지HR',
    bizNo: '456-78-90123',
    certStatus: '심사중',
    title: '인사관리 담당자',
    ncs: '인사·노무관리',
    headcount: 1,
    period: '08-22~09-15',
    status: '보완요청',
  },
  {
    id: 'JR-2026-0035',
    date: '08-10',
    company: '파인테크(주)',
    bizNo: '567-89-01234',
    certStatus: '인증',
    title: '핀테크 마케터',
    ncs: '마케팅',
    headcount: 2,
    period: '08-18~09-08',
    status: '승인',
  },
  {
    id: 'JR-2026-0030',
    date: '08-08',
    company: '글로벌트레이드',
    bizNo: '678-90-12345',
    certStatus: '인증',
    title: '해외영업 담당',
    ncs: '영업·판매',
    headcount: 3,
    period: '08-15~09-05',
    status: '반려',
  },
];

const CERT_STYLE = {
  인증: { bg: '#D1FAE5', text: '#059669' },
  미인증: { bg: '#FEE2E2', text: '#CF222E' },
  심사중: { bg: '#FEF3C7', text: '#D97706' },
};
const VERIFY_STYLE = {
  검수대기: { bg: '#F3F4F6', text: '#374151' },
  승인: { bg: '#D1FAE5', text: '#059669' },
  반려: { bg: '#FEE2E2', text: '#CF222E' },
  보완요청: { bg: '#FEF3C7', text: '#D97706' },
};
const REJECT_CODES = [
  '선택하세요',
  '허위·과장 정보',
  '불법 고용형태',
  '근로조건 기준 미달',
  '중복 신청',
  '기타',
];

function TabJobReview() {
  const [rows, setRows] = useState(JOB_REQUESTS);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rCode, setRCode] = useState('선택하세요');
  const [rDetail, setRDetail] = useState('');
  const [tooltip, setTooltip] = useState(null);

  const approve = (id) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status: '승인' } : r)));
    toast('공고가 승인되었습니다. 게시 관리 탭에서 전환하세요.', 'success');
  };
  const submitReject = () => {
    if (rCode === '선택하세요') {
      toast('반려 사유를 선택해 주세요.', 'error');
      return;
    }
    if (!rejectTarget) return;
    setRows((p) => p.map((r) => (r.id === rejectTarget.id ? { ...r, status: '반려' } : r)));
    toast('반려 처리되었습니다. 이력이 보존됩니다.', 'info');
    setRejectTarget(null);
    setRCode('선택하세요');
    setRDetail('');
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4">
        <StatTile
          label="검수 대기"
          value="7"
          accentColor={A}
          trend={{ value: '전일 대비 +2', up: true }}
        />
        <StatTile label="게시중 공고" value="342" accentColor={A} />
        <StatTile label="인증 대기 기업" value="3" accentColor={A} />
        <StatTile
          label="이번 달 지원"
          value="1,204"
          accentColor={A}
          trend={{ value: '전월 대비 +18%', up: true }}
        />
      </div>

      <SectionCard title="구인 신청 목록">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <TH>신청 ID</TH>
                <TH>신청일</TH>
                <TH>기업명</TH>
                <TH>사업자번호</TH>
                <TH center>인증 상태</TH>
                <TH>공고명</TH>
                <TH>NCS 직무</TH>
                <TH center>모집</TH>
                <TH>접수기간</TH>
                <TH center>상태</TH>
                <TH center>검수</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const cs = CERT_STYLE[r.certStatus];
                const vs = VERIFY_STYLE[r.status];
                const blocked = r.certStatus !== '인증';
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <TD cls="font-mono text-[10px]">
                      <span style={{ color: A }}>{r.id}</span>
                    </TD>
                    <TD cls="text-[#9AA0A6] font-mono text-[11px]">{r.date}</TD>
                    <TD cls="font-bold text-[#1F2328]">{r.company}</TD>
                    <TD cls="font-mono text-[11px] text-[#9AA0A6]">{r.bizNo}</TD>
                    <TD center>
                      <Chip label={r.certStatus} bg={cs.bg} text={cs.text} />
                    </TD>
                    <TD cls="max-w-[180px] truncate text-[#444D56]">{r.title}</TD>
                    <TD cls="text-[#656D76]">{r.ncs}</TD>
                    <TD center cls="text-[#1F2328] font-semibold">
                      {r.headcount}명
                    </TD>
                    <TD cls="font-mono text-[11px] text-[#9AA0A6] whitespace-nowrap">{r.period}</TD>
                    <TD center>
                      <Chip label={r.status} bg={vs.bg} text={vs.text} />
                    </TD>
                    <TD center>
                      <div className="flex gap-1.5 justify-center">
                        <div
                          className="relative"
                          onMouseEnter={() => (blocked ? setTooltip(r.id) : null)}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <button
                            disabled={blocked || r.status === '승인' || r.status === '반려'}
                            onClick={() => approve(r.id)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: A }}
                          >
                            승인
                          </button>
                          {tooltip === r.id && blocked && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 px-2.5 py-1.5 rounded-[6px] bg-[#1F2328] text-white text-[10px] leading-snug whitespace-normal z-20 text-center shadow-lg">
                              기업 인증 완료 후 승인할 수 있습니다.
                            </div>
                          )}
                        </div>
                        {r.status !== '반려' && r.status !== '승인' && (
                          <button
                            onClick={() => setRejectTarget(r)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors"
                          >
                            반려
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
      </SectionCard>

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="구인 신청 반려"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              취소
            </Button>
            <Button variant="danger" onClick={submitReject}>
              반려 처리
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[12px]">
            <p className="font-bold text-[#1F2328] mb-0.5">{rejectTarget?.company}</p>
            <p className="text-[#656D76]">{rejectTarget?.title}</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              반려 사유 코드 <span className="text-[#CF222E]">*</span>
            </label>
            <select
              value={rCode}
              onChange={(e) => setRCode(e.target.value)}
              className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none appearance-none"
            >
              {REJECT_CODES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              상세 사유
            </label>
            <textarea
              value={rDetail}
              onChange={(e) => setRDetail(e.target.value)}
              rows={3}
              placeholder="기업에게 공개될 사유를 입력하세요."
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none bg-white focus:outline-none"
            />
          </div>
          <div className="p-3 rounded-[8px] bg-[#F3F4F6] border border-[#E5E7EB] text-[11px] text-[#374151]">
            검수자·사유·일시가 이력으로 보존됩니다.
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab 2: 공고 게시 관리 ──────────────────────────────────────────────────────

const POSTS = [
  {
    id: 'JO-2026-0188',
    title: '백엔드 개발자 채용',
    company: '(주)넥스트커리어',
    category: '추천',
    type: '정규직',
    period: '08-20~09-10',
    status: '게시',
    views: 342,
    applicants: 18,
  },
  {
    id: 'JO-2026-0187',
    title: 'AI 엔지니어 인턴',
    company: '데이터랩스',
    category: '인턴십',
    type: '인턴',
    period: '09-01~09-30',
    status: '게시',
    views: 213,
    applicants: 9,
  },
  {
    id: 'JO-2026-0186',
    title: '핀테크 마케터',
    company: '파인테크(주)',
    category: '일반',
    type: '계약직',
    period: '08-18~09-08',
    status: '마감',
    views: 580,
    applicants: 42,
  },
  {
    id: 'JO-2026-0185',
    title: '해외영업 담당',
    company: '글로벌트레이드',
    category: '교내',
    type: '정규직',
    period: '08-15~09-05',
    status: '게시',
    views: 410,
    applicants: 27,
  },
];

const POST_STATUS_STYLE = {
  게시: { bg: '#D1FAE5', text: '#059669' },
  마감: { bg: '#FEE2E2', text: '#CF222E' },
  숨김: { bg: '#F3F4F6', text: '#9AA0A6' },
};

function TabPostManagement() {
  const [form, setForm] = useState({
    category: '추천',
    benefit: '없음',
    ncs: '소프트웨어개발',
    empType: '정규직',
    region: '서울',
    startDate: '2026-08-20',
    endDate: '2026-09-10',
    postStatus: '게시',
  });
  const [posts, setPosts] = useState(POSTS);
  const [selected, setSelected] = useState([]);

  const toggleSel = (id) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const bulkClose = () => {
    setPosts((p) => p.map((r) => (selected.includes(r.id) ? { ...r, status: '마감' } : r)));
    setSelected([]);
    toast(`${selected.length}건 마감 처리`, 'info');
  };
  const bulkHide = () => {
    setPosts((p) => p.map((r) => (selected.includes(r.id) ? { ...r, status: '숨김' } : r)));
    setSelected([]);
    toast(`${selected.length}건 숨김 처리`, 'info');
  };

  const f = form;
  return (
    <div className="flex flex-col gap-5">
      {/* Form + preview side-by-side */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 320px' }}>
        <SectionCard title="공고 전환 설정">
          <div className="p-5 grid grid-cols-2 gap-4">
            {[
              {
                label: '공고 구분',
                el: (
                  <select
                    value={f.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                  >
                    {['추천', '교내', '일반', '인턴십', '채용행사'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                ),
              },
              {
                label: '혜택 유형',
                el: (
                  <select
                    value={f.benefit}
                    onChange={(e) => setForm((p) => ({ ...p, benefit: e.target.value }))}
                    className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                  >
                    {['없음', '서류면제', '가산점'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                ),
              },
              {
                label: 'NCS 소분류',
                el: (
                  <input
                    value={f.ncs}
                    onChange={(e) => setForm((p) => ({ ...p, ncs: e.target.value }))}
                    className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                  />
                ),
              },
              {
                label: '고용 형태',
                el: (
                  <select
                    value={f.empType}
                    onChange={(e) => setForm((p) => ({ ...p, empType: e.target.value }))}
                    className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                  >
                    {['정규직', '계약직', '인턴', '파견'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                ),
              },
              {
                label: '근무 지역',
                el: (
                  <input
                    value={f.region}
                    onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                    className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                  />
                ),
              },
              {
                label: '게시 상태',
                el: (
                  <select
                    value={f.postStatus}
                    onChange={(e) => setForm((p) => ({ ...p, postStatus: e.target.value }))}
                    className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                  >
                    {['게시', '마감', '숨김'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                ),
              },
              {
                label: '접수 시작',
                el: (
                  <input
                    type="date"
                    value={f.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                  />
                ),
              },
              {
                label: '접수 마감',
                el: (
                  <input
                    type="date"
                    value={f.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                  />
                ),
              },
            ].map(({ label, el }) => (
              <div key={label}>
                <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
                  {label}
                </label>
                {el}
              </div>
            ))}
            <div className="col-span-2 flex justify-end pt-2">
              <button
                onClick={() => toast('공고가 게시 목록에 추가되었습니다.', 'success')}
                className="h-8 px-5 text-[13px] font-bold text-white rounded-[6px] transition-colors"
                style={{ background: A }}
              >
                공고 전환 적용
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Live preview panel */}
        <div>
          <p className="text-[11px] font-bold text-[#9AA0A6] mb-2 uppercase tracking-wide">
            학생에게 보이는 카드 미리보기
          </p>
          <div
            className="bg-white rounded-[10px] border-2 overflow-hidden shadow-[0_4px_16px_rgba(5,150,105,0.12)]"
            style={{ borderColor: A }}
          >
            <div className="px-4 py-2 flex items-center gap-2" style={{ background: '#ECFDF5' }}>
              <Chip label={f.category} bg="#D1FAE5" text={A} />
              {f.benefit !== '없음' && <Chip label={f.benefit} bg="#FEF3C7" text="#D97706" />}
            </div>
            <div className="p-4">
              <p className="text-[15px] font-black text-[#1F2328] mb-1">백엔드 개발자 채용</p>
              <p className="text-[12px] font-semibold" style={{ color: A }}>
                (주)넥스트커리어
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {[f.empType, f.ncs, f.region].map((v) => (
                  <span
                    key={v}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76] font-semibold"
                  >
                    {v}
                  </span>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
                <span className="text-[10px] text-[#9AA0A6]">
                  {f.startDate} ~ {f.endDate}
                </span>
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{
                    background: POST_STATUS_STYLE[f.postStatus].bg,
                    color: POST_STATUS_STYLE[f.postStatus].text,
                  }}
                >
                  {f.postStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posted list */}
      <SectionCard
        title="게시중 공고 목록"
        right={
          <div className="flex gap-2">
            {selected.length > 0 && (
              <>
                <button
                  onClick={bulkClose}
                  className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E]"
                >
                  마감 처리
                </button>
                <button
                  onClick={bulkHide}
                  className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#656D76]"
                >
                  숨김
                </button>
              </>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="w-8 px-4 py-3 bg-[#F6F8FA]">
                  <input
                    type="checkbox"
                    onChange={(e) => setSelected(e.target.checked ? posts.map((p) => p.id) : [])}
                  />
                </th>
                <TH>공고 ID</TH>
                <TH>공고명</TH>
                <TH>기업</TH>
                <TH center>구분</TH>
                <TH center>고용</TH>
                <TH>접수기간</TH>
                <TH center>조회</TH>
                <TH center>지원</TH>
                <TH center>상태</TH>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const s = POST_STATUS_STYLE[p.status];
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggleSel(p.id)}
                      />
                    </td>
                    <TD cls="font-mono text-[10px]">
                      <span style={{ color: A }}>{p.id}</span>
                    </TD>
                    <TD cls="font-bold text-[#1F2328]">{p.title}</TD>
                    <TD cls="text-[#656D76]">{p.company}</TD>
                    <TD center>
                      <Chip label={p.category} bg="#D1FAE5" text={A} />
                    </TD>
                    <TD center cls="text-[#656D76]">
                      {p.type}
                    </TD>
                    <TD cls="font-mono text-[11px] text-[#9AA0A6] whitespace-nowrap">{p.period}</TD>
                    <TD center cls="text-[#444D56] font-semibold">
                      {p.views}
                    </TD>
                    <TD center cls="font-bold">
                      <span style={{ color: A }}>{p.applicants}</span>
                    </TD>
                    <TD center>
                      <Chip label={p.status} bg={s.bg} text={s.text} />
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Tab 3: 기업 인증 ────────────────────────────────────────────────────────────

const COMPANIES = [
  {
    id: 'CO-2026-0012',
    name: '그린에너지(주)',
    bizNo: '234-56-78901',
    rep: '이준혁',
    size: '중소',
    appliedAt: '08-12',
    status: '심사중',
    docs: ['사업자등록증.pdf', '재무제표.xlsx'],
  },
  {
    id: 'CO-2026-0011',
    name: '스마트팜코리아',
    bizNo: '345-67-12345',
    rep: '박나래',
    size: '소기업',
    appliedAt: '08-11',
    status: '심사중',
    docs: ['사업자등록증.pdf'],
  },
  {
    id: 'CO-2026-0010',
    name: '(주)브릿지HR',
    bizNo: '456-78-90123',
    rep: '최담당',
    size: '중소',
    appliedAt: '08-10',
    status: '심사중',
    docs: ['사업자등록증.pdf', '고용보험납부확인서.pdf'],
  },
  {
    id: 'CO-2026-0009',
    name: '(주)넥스트커리어',
    bizNo: '123-45-67890',
    rep: '김대표',
    size: '중견',
    appliedAt: '08-05',
    status: '인증',
    docs: [],
  },
  {
    id: 'CO-2026-0008',
    name: '데이터랩스',
    bizNo: '345-67-89012',
    rep: '정랩장',
    size: '소기업',
    appliedAt: '08-01',
    status: '인증',
    docs: [],
  },
];

function TabCompanyCert() {
  const [rows, setRows] = useState(COMPANIES);
  const certify = (id) => {
    setRows((p) => p.map((c) => (c.id === id ? { ...c, status: '인증' } : c)));
    toast('인증이 완료되었습니다.', 'success');
  };

  return (
    <SectionCard
      title="기업 인증 현황"
      right={
        <Chip
          label={`심사중 ${rows.filter((c) => c.status === '심사중').length}건`}
          bg="#FEF3C7"
          text="#D97706"
        />
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <TH>기업 ID</TH>
              <TH>기업명</TH>
              <TH>사업자번호</TH>
              <TH>대표자</TH>
              <TH center>규모</TH>
              <TH>신청일</TH>
              <TH>제출 서류</TH>
              <TH center>상태</TH>
              <TH center>처리</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const cs = CERT_STYLE[c.status];
              return (
                <tr
                  key={c.id}
                  className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]"
                >
                  <TD cls="font-mono text-[10px]">
                    <span style={{ color: A }}>{c.id}</span>
                  </TD>
                  <TD cls="font-bold text-[#1F2328]">{c.name}</TD>
                  <TD cls="font-mono text-[11px] text-[#9AA0A6]">{c.bizNo}</TD>
                  <TD cls="text-[#656D76]">{c.rep}</TD>
                  <TD center>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76] font-semibold">
                      {c.size}
                    </span>
                  </TD>
                  <TD cls="text-[#9AA0A6] font-mono text-[11px]">{c.appliedAt}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {c.docs.map((d) => (
                        <span
                          key={d}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#656D76]"
                        >
                          {d}
                        </span>
                      ))}
                      {c.docs.length === 0 && <span className="text-[11px] text-[#D1D5DB]">—</span>}
                    </div>
                  </TD>
                  <TD center>
                    <Chip label={c.status} bg={cs.bg} text={cs.text} />
                  </TD>
                  <TD center>
                    {c.status === '심사중' && (
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => certify(c.id)}
                          className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] text-white"
                          style={{ background: A }}
                        >
                          인증 승인
                        </button>
                        <button className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E]">
                          반려
                        </button>
                      </div>
                    )}
                    {c.status === '인증' && (
                      <span className="text-[11px] text-[#D1D5DB]">완료</span>
                    )}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ─── Tab 4: 잡매칭 ─────────────────────────────────────────────────────────────

const MATCH_STUDENTS = [
  {
    id: '20231234',
    name: '홍길동',
    dept: '컴퓨터공학과',
    wishJob: '소프트웨어개발',
    score: 92,
    source: '자동매칭',
    agreed: true,
  },
  {
    id: '20232050',
    name: '최지수',
    dept: '심리학과',
    wishJob: 'UI/UX디자인',
    score: 87,
    source: '학과추천',
    agreed: true,
  },
  {
    id: '20231111',
    name: '김영희',
    dept: '경영학과',
    wishJob: '마케팅',
    score: 81,
    source: '자동매칭',
    agreed: false,
  },
  {
    id: '20231500',
    name: '정유진',
    dept: '화학공학과',
    wishJob: '환경·에너지',
    score: 78,
    source: '기업요청',
    agreed: true,
  },
  {
    id: '20230777',
    name: '이민수',
    dept: '산업공학과',
    wishJob: '경영·기획',
    score: 71,
    source: '자동매칭',
    agreed: false,
  },
];
const SOURCE_CHIP = {
  자동매칭: { bg: '#D1FAE5', text: '#059669' },
  학과추천: { bg: '#F3F4F6', text: '#374151' },
  기업요청: { bg: '#FEF3C7', text: '#D97706' },
};
const TALENT_REQUESTS = [
  {
    id: 'TR-001',
    company: '(주)넥스트커리어',
    dept: '컴퓨터공학과',
    job: '백엔드개발',
    count: 3,
    status: '처리중',
  },
  {
    id: 'TR-002',
    company: '데이터랩스',
    dept: '전체',
    job: 'AI엔지니어',
    count: 2,
    status: '매칭완료',
  },
];
const UNEMP_POOL = [
  {
    id: '20211001',
    name: '박소연',
    gradYear: '2025-02',
    category: '졸업 2년 이내',
    status: '구직중',
    lastSent: '08-01',
  },
  {
    id: '20201234',
    name: '조민준',
    gradYear: '2024-08',
    category: '졸업 2년 이내',
    status: '구직중',
    lastSent: '07-15',
  },
  {
    id: '20231876',
    name: '정하준',
    gradYear: '재학',
    category: '재학',
    status: '취업준비',
    lastSent: '—',
  },
];

function TabJobMatching() {
  const [ncs, setNcs] = useState('소프트웨어개발·소분류');
  const [region, setRegion] = useState(30);
  const [empW, setEmpW] = useState(20);
  const [sent, setSent] = useState([]);

  const sendRec = (id) => {
    setSent((p) => [...p, id]);
    toast('추천 발송 완료. 학생 앱에 알림이 전송됩니다.', 'success');
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Matching condition + result */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '260px 1fr' }}>
        {/* Conditions */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-4 h-fit">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: A }} />
            <span className="text-[13px] font-bold text-[#1F2328]">매칭 조건</span>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              대상 공고
            </label>
            <select className="w-full h-9 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none">
              <option>JO-2026-0188 백엔드 개발자 채용</option>
              <option>JO-2026-0187 AI 엔지니어 인턴</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              NCS 분류
            </label>
            <input
              value={ncs}
              onChange={(e) => setNcs(e.target.value)}
              className="w-full h-9 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1">
              지역 가중치 <span className="font-mono text-[#1F2328]">{region}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={region}
              onChange={(e) => setRegion(+e.target.value)}
              className="w-full accent-emerald-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1">
              고용형태 가중치 <span className="font-mono text-[#1F2328]">{empW}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={empW}
              onChange={(e) => setEmpW(+e.target.value)}
              className="w-full accent-emerald-600"
            />
          </div>
          <button
            className="w-full h-9 text-[13px] font-bold text-white rounded-[6px] transition-colors"
            style={{ background: A }}
            onClick={() => toast('매칭이 실행되었습니다.', 'success')}
          >
            매칭 실행
          </button>
        </div>

        {/* Match results table */}
        <SectionCard title="매칭 결과">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <TH>학번</TH>
                  <TH>성명</TH>
                  <TH>학과</TH>
                  <TH>희망직무</TH>
                  <TH center>매칭 점수</TH>
                  <TH center>추천 출처</TH>
                  <TH center>동의</TH>
                  <TH center>발송</TH>
                </tr>
              </thead>
              <tbody>
                {MATCH_STUDENTS.map((s) => {
                  const sc = SOURCE_CHIP[s.source];
                  const noConsent = !s.agreed;
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-[#F3F4F6] last:border-0 transition-colors ${noConsent ? 'opacity-50 bg-[#F9FAFB]' : 'hover:bg-[#FAFAFA]'}`}
                    >
                      <TD cls="font-mono text-[11px] text-[#9AA0A6]">{s.id}</TD>
                      <TD cls={`font-bold ${noConsent ? 'text-[#9AA0A6]' : 'text-[#1F2328]'}`}>
                        {s.name}
                      </TD>
                      <TD cls="text-[#656D76]">{s.dept}</TD>
                      <TD cls="text-[#444D56]">{s.wishJob}</TD>
                      <TD center>
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${s.score}%`, background: A }}
                            />
                          </div>
                          <span className="text-[11px] font-black" style={{ color: A }}>
                            {s.score}
                          </span>
                        </div>
                      </TD>
                      <TD center>
                        <Chip label={s.source} bg={sc.bg} text={sc.text} />
                      </TD>
                      <TD center>
                        {s.agreed ? (
                          <Chip label="동의" bg="#D1FAE5" text={A} />
                        ) : (
                          <Chip label="동의 필요" bg="#F3F4F6" text="#9AA0A6" />
                        )}
                      </TD>
                      <TD center>
                        <button
                          disabled={noConsent || sent.includes(s.id)}
                          onClick={() => sendRec(s.id)}
                          className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: A }}
                        >
                          {sent.includes(s.id) ? '발송됨' : '추천 발송'}
                        </button>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Talent requests */}
        <SectionCard title="기업 인재추천 요청">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <TH>기업</TH>
                  <TH>대상 학과</TH>
                  <TH>직무</TH>
                  <TH center>인원</TH>
                  <TH center>상태</TH>
                  <TH center>처리</TH>
                </tr>
              </thead>
              <tbody>
                {TALENT_REQUESTS.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]"
                  >
                    <TD cls="font-bold text-[#1F2328]">{r.company}</TD>
                    <TD cls="text-[#656D76]">{r.dept}</TD>
                    <TD cls="text-[#444D56]">{r.job}</TD>
                    <TD center cls="font-semibold">
                      {r.count}명
                    </TD>
                    <TD center>
                      <Chip
                        label={r.status}
                        bg={r.status === '매칭완료' ? '#D1FAE5' : '#FEF3C7'}
                        text={r.status === '매칭완료' ? A : '#D97706'}
                      />
                    </TD>
                    <TD center>
                      {r.status !== '매칭완료' && (
                        <button
                          className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] text-white"
                          style={{ background: A }}
                        >
                          매칭 실행
                        </button>
                      )}
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Unemployed pool */}
        <SectionCard title="미취업자 풀">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <TH>학번</TH>
                  <TH>성명</TH>
                  <TH>졸업</TH>
                  <TH>구분</TH>
                  <TH center>상태</TH>
                  <TH>최근 발송</TH>
                </tr>
              </thead>
              <tbody>
                {UNEMP_POOL.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]"
                  >
                    <TD cls="font-mono text-[11px] text-[#9AA0A6]">{s.id}</TD>
                    <TD cls="font-bold text-[#1F2328]">{s.name}</TD>
                    <TD cls="font-mono text-[11px] text-[#9AA0A6]">{s.gradYear}</TD>
                    <TD cls="text-[#656D76] text-[11px]">{s.category}</TD>
                    <TD center>
                      <Chip label={s.status} bg="#ECFDF5" text={A} />
                    </TD>
                    <TD cls="font-mono text-[11px] text-[#9AA0A6]">{s.lastSent}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Tab 5: 취업 이력·통계 ─────────────────────────────────────────────────────

const DEPT_STATS = [
  { dept: '컴퓨터공학과', grads: 220, employed: 185, rate: 84.1, retained: 88.2, target: 80 },
  { dept: '경영학과', grads: 310, employed: 202, rate: 65.2, retained: 78.4, target: 72 },
  { dept: '심리학과', grads: 98, employed: 59, rate: 60.2, retained: 74.1, target: 68 },
  { dept: '산업공학과', grads: 145, employed: 110, rate: 75.9, retained: 82.3, target: 74 },
  { dept: '화학공학과', grads: 112, employed: 85, rate: 75.9, retained: 79.5, target: 78 },
  { dept: '국어국문학과', grads: 88, employed: 48, rate: 54.5, retained: 69.8, target: 65 },
  { dept: '영어영문학과', grads: 76, employed: 40, rate: 52.6, retained: 68.0, target: 60 },
  { dept: '간호학과', grads: 120, employed: 116, rate: 96.7, retained: 95.0, target: 90 },
  { dept: '기계공학과', grads: 113, employed: 87, rate: 77.0, retained: 83.1, target: 76 },
];
const COLLEGE_BAR = [
  { label: '공과대', value: 78.8 },
  { label: '경영대', value: 65.2 },
  { label: '사회과학', value: 61.4 },
  { label: '의과대', value: 96.7 },
  { label: '예술대', value: 52.1 },
];
const AVG_LINE = 69.6;

const EMP_RECORDS = [
  {
    id: '20231234',
    name: '홍길동',
    dept: '컴퓨터공학과',
    company: '(주)카카오',
    joinDate: '2026-03-02',
    type: '정규직',
    basis: '건강보험',
    m3: true,
    m6: true,
    m11: false,
    verified: true,
  },
  {
    id: '20232050',
    name: '최지수',
    dept: '심리학과',
    company: '삼성전자',
    joinDate: '2026-03-02',
    type: '정규직',
    basis: '자체조사',
    m3: true,
    m6: true,
    m11: true,
    verified: false,
  },
  {
    id: '20231500',
    name: '정유진',
    dept: '화학공학과',
    company: 'LG화학',
    joinDate: '2026-04-01',
    type: '정규직',
    basis: '건강보험',
    m3: true,
    m6: false,
    m11: false,
    verified: true,
  },
  {
    id: '20230555',
    name: '이준혁',
    dept: '산업공학과',
    company: '현대자동차',
    joinDate: '2026-03-02',
    type: '정규직',
    basis: '건강보험',
    m3: true,
    m6: true,
    m11: true,
    verified: true,
  },
];

function TabEmploymentStats() {
  const [statsType, setStatsType] = useState('SELF');

  // Simple SVG bar chart with national average line
  const maxVal = 100;
  const chartH = 150;
  const barW = 36;
  const gap = 14;
  const chartW = COLLEGE_BAR.length * (barW + gap) + 40;

  return (
    <div className="flex flex-col gap-5">
      {/* Warning banner */}
      <div className="px-5 py-3.5 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] flex gap-3">
        <span className="text-[16px] shrink-0">⚠️</span>
        <p className="text-[12px] text-[#92400E] leading-relaxed">
          취업률은 대학이 자체 산출하는 수치가 아니라 건강보험공단·국세청 등 13개 공공 DB 연계로
          정부가 확정 제공합니다. 본 화면의 수치는 <strong>자체 조사 기준 잠정치</strong>입니다.
        </p>
      </div>

      {/* Stats type toggle + KPIs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1 bg-[#F3F4F6] rounded-[8px]">
          {['SELF', 'OFFICIAL'].map((t) => (
            <button
              key={t}
              onClick={() => setStatsType(t)}
              className="h-7 px-4 text-[11px] font-bold rounded-[6px] transition-colors"
              style={statsType === t ? { background: A, color: '#fff' } : { color: '#656D76' }}
            >
              {t === 'SELF' ? '자체조사 (SELF)' : '국가 확정 (OFFICIAL)'}
            </button>
          ))}
        </div>
        {statsType === 'OFFICIAL' && (
          <span className="text-[11px] text-[#9AA0A6] italic">
            교육부·한국교육개발원 확정 통계 이식 값입니다.
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile label="졸업자" value="1,482" accentColor={A} />
        <StatTile
          label="취업자"
          value="1,031"
          accentColor={A}
          trend={{ value: '전년 대비 +42명', up: true }}
        />
        <StatTile label="자체 조사 취업률" value="69.6%" accentColor={A} />
        <StatTile
          label="유지취업률 (11개월)"
          value="81.2%"
          accentColor={A}
          trend={{ value: '전년 대비 +1.2%p', up: true }}
        />
      </div>

      {/* Dept table + college bar chart */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 340px' }}>
        <SectionCard title="학과별 취업 현황">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <TH>학과</TH>
                  <TH center>졸업자</TH>
                  <TH center>취업자</TH>
                  <TH center>취업률</TH>
                  <TH center>유지취업률</TH>
                  <TH center>목표</TH>
                  <TH center>달성</TH>
                </tr>
              </thead>
              <tbody>
                {DEPT_STATS.map((d) => {
                  const miss = d.rate < d.target;
                  return (
                    <tr
                      key={d.dept}
                      className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] ${miss ? 'bg-[#F9FAFB]' : ''}`}
                    >
                      <TD cls="font-bold text-[#1F2328]">{d.dept}</TD>
                      <TD center cls="text-[#444D56]">
                        {d.grads}
                      </TD>
                      <TD center cls="font-semibold">
                        <span style={{ color: A }}>{d.employed}</span>
                      </TD>
                      <TD center cls={`font-black text-[13px] ${miss ? 'text-[#CF222E]' : ''}`}>
                        {d.rate}%
                      </TD>
                      <TD center cls="text-[#444D56]">
                        {d.retained}%
                      </TD>
                      <TD center cls="text-[#9AA0A6]">
                        {d.target}%
                      </TD>
                      <TD center>
                        {miss ? (
                          <Chip label="목표 미달" bg="#FEE2E2" text="#CF222E" />
                        ) : (
                          <Chip label="달성" bg="#D1FAE5" text={A} />
                        )}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* College bar chart */}
        <SectionCard title="계열별 취업률 (전국 평균 비교)">
          <div className="p-5 flex flex-col items-center">
            <svg width={chartW} height={chartH + 40}>
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((v) => {
                const y = chartH - (v / maxVal) * chartH;
                return (
                  <g key={v}>
                    <line
                      x1={20}
                      y1={y}
                      x2={chartW - 10}
                      y2={y}
                      stroke="#E5E7EB"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text x={16} y={y + 4} textAnchor="end" fontSize="9" fill="#9AA0A6">
                      {v}
                    </text>
                  </g>
                );
              })}
              {/* National avg line */}
              {(() => {
                const avgY = chartH - (AVG_LINE / maxVal) * chartH;
                return (
                  <>
                    <line
                      x1={20}
                      y1={avgY}
                      x2={chartW - 10}
                      y2={avgY}
                      stroke="#D97706"
                      strokeWidth="1.5"
                      strokeDasharray="5 3"
                    />
                    <text x={chartW - 8} y={avgY - 3} fontSize="9" fill="#D97706" fontWeight="700">
                      전국 {AVG_LINE}%
                    </text>
                  </>
                );
              })()}
              {/* Bars */}
              {COLLEGE_BAR.map((d, i) => {
                const x = 24 + i * (barW + gap);
                const barH = (d.value / maxVal) * chartH;
                const y = chartH - barH;
                return (
                  <g key={d.label}>
                    <rect x={x} y={y} width={barW} height={barH} fill={A} opacity="0.85" rx="3" />
                    <text
                      x={x + barW / 2}
                      y={y - 4}
                      textAnchor="middle"
                      fontSize="10"
                      fill={A}
                      fontWeight="700"
                    >
                      {d.value}%
                    </text>
                    <text
                      x={x + barW / 2}
                      y={chartH + 14}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#656D76"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-1.5 rounded-full" style={{ background: A }} />
                <span className="text-[10px] text-[#656D76]">자교</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-px border-t border-dashed border-[#D97706]" />
                <span className="text-[10px] text-[#656D76]">전국 평균</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Individual records */}
      <SectionCard title="개인별 취업 내역">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <TH>학번</TH>
                <TH>성명</TH>
                <TH>학과</TH>
                <TH>기업명</TH>
                <TH>입사일</TH>
                <TH center>고용형태</TH>
                <TH center>확인 근거</TH>
                <TH center>3M</TH>
                <TH center>6M</TH>
                <TH center>11M</TH>
                <TH center>검증</TH>
              </tr>
            </thead>
            <tbody>
              {EMP_RECORDS.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]"
                >
                  <TD cls="font-mono text-[11px] text-[#9AA0A6]">{r.id}</TD>
                  <TD cls="font-bold text-[#1F2328]">{r.name}</TD>
                  <TD cls="text-[#656D76]">{r.dept}</TD>
                  <TD cls="font-semibold text-[#1F2328]">{r.company}</TD>
                  <TD cls="font-mono text-[11px] text-[#9AA0A6]">{r.joinDate}</TD>
                  <TD center>
                    <Chip label={r.type} bg="#D1FAE5" text={A} />
                  </TD>
                  <TD center>
                    <Chip label={r.basis} bg="#F3F4F6" text="#374151" />
                  </TD>
                  {[r.m3, r.m6, r.m11].map((v, i) => (
                    <TD key={i} center>
                      {v ? (
                        <span className="text-[12px]" style={{ color: A }}>
                          ✓
                        </span>
                      ) : (
                        <span className="text-[12px] text-[#D1D5DB]">—</span>
                      )}
                    </TD>
                  ))}
                  <TD center>
                    <Chip
                      label={r.verified ? '공단 확인' : '자체조사'}
                      bg={r.verified ? '#D1FAE5' : '#FEF3C7'}
                      text={r.verified ? A : '#D97706'}
                    />
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

/**
 * 교직원 취업·창업 운영 화면. 5개 탭(구인 검수·공고 관리·기업 인증·잡매칭·취업 통계)으로 구성됩니다.
 * PortalShell 내비게이션의 "취업·창업 운영"(/admin/career)과 "통계"(/admin/career/statistics)가
 * 모두 이 화면으로 연결되며, 경로에 따라 시작 탭이 결정됩니다.
 */
export default function StaffEmploymentPage() {
  const TABS = ['구인 신청 검수', '공고 게시 관리', '기업 인증', '잡매칭', '취업 이력·통계'];
  const location = useLocation();
  const initialTab = location.pathname.endsWith('/statistics') ? 4 : 0;
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    setTab(location.pathname.endsWith('/statistics') ? 4 : 0);
  }, [location.pathname]);

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-black text-[#1F2328]">취업·창업 운영</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            구인 검수 · 공고 관리 · 잡매칭 · 취업 통계
          </p>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-0 border-b border-[#E5E7EB]">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`h-10 px-5 text-[13px] font-bold transition-colors border-b-2 -mb-px ${tab === i ? 'border-b-2' : 'border-transparent text-[#656D76] hover:text-[#1F2328]'}`}
            style={tab === i ? { color: A, borderColor: A } : {}}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ① 구인 신청 검수 */}
      {tab === 0 && <TabJobReview />}

      {/* ② 공고 게시 관리 */}
      {tab === 1 && <TabPostManagement />}

      {/* ③ 기업 인증 */}
      {tab === 2 && <TabCompanyCert />}

      {/* ④ 잡매칭 */}
      {tab === 3 && <TabJobMatching />}

      {/* ⑤ 취업 이력·통계 */}
      {tab === 4 && <TabEmploymentStats />}
    </div>
  );
}
