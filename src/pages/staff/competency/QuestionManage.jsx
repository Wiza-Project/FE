import { useState } from 'react';
import { Button, Drawer, Modal, toast } from '@/components/common';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// ─── Data ─────────────────────────────────────────────────────────────────────

const CORE_OPTIONS = [
  '전체',
  'C1 자기관리',
  'C2 의사소통',
  'C3 대인관계',
  'C4 글로벌',
  'C5 문제해결',
  'C6 직업윤리',
];
const SUB_MAP = {
  'C1 자기관리': ['전체', 'C1S1 자아정체성', 'C1S2 자기조절', 'C1S3 진로설계'],
  'C2 의사소통': ['전체', 'C2S1 언어능력', 'C2S2 발표능력', 'C2S3 문서작성'],
  'C3 대인관계': [
    '전체',
    'C3S1 협업',
    'C3S2 리더십',
    'C3S3 갈등관리',
    'C3S4 배려',
    'C3S5 네트워킹',
  ],
  'C4 글로벌': ['전체', 'C4S1 외국어능력', 'C4S2 다문화이해', 'C4S3 국제감각'],
  'C5 문제해결': ['전체', 'C5S1 비판적사고', 'C5S2 창의성', 'C5S3 정보분석'],
  'C6 직업윤리': ['전체', 'C6S1 책임감', 'C6S2 공동체의식'],
};
const TEMPLATE_OPTIONS = ['T01 리커트 5점', 'T02 리커트 4점', 'T03 리커트 7점'];

const SCALE_PREVIEWS = {
  'T01 리커트 5점': [
    { value: 1, anchor: '전혀 그렇지 않다' },
    { value: 2, anchor: '그렇지 않다' },
    { value: 3, anchor: '보통이다' },
    { value: 4, anchor: '그렇다' },
    { value: 5, anchor: '매우 그렇다' },
  ],
  'T02 리커트 4점': [
    { value: 1, anchor: '전혀 그렇지 않다' },
    { value: 2, anchor: '그렇지 않다' },
    { value: 3, anchor: '그렇다' },
    { value: 4, anchor: '매우 그렇다' },
  ],
  'T03 리커트 7점': [
    { value: 1, anchor: '전혀 그렇지 않다' },
    { value: 2, anchor: '매우 그렇지 않다' },
    { value: 3, anchor: '그렇지 않다' },
    { value: 4, anchor: '보통이다' },
    { value: 5, anchor: '그렇다' },
    { value: 6, anchor: '매우 그렇다' },
    { value: 7, anchor: '완전히 그렇다' },
  ],
};

const QUESTIONS = [
  {
    id: 'C1S1Q1',
    content: '나는 나의 강점과 약점을 명확히 파악하고 있다.',
    coreCode: 'C1',
    coreName: '자기관리',
    subCode: 'C1S1',
    subName: '자아정체성',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 1,
    active: true,
    inProgress: false,
  },
  {
    id: 'C1S1Q2',
    content: '나는 나의 가치관에 따라 삶의 목표를 설정한다.',
    coreCode: 'C1',
    coreName: '자기관리',
    subCode: 'C1S1',
    subName: '자아정체성',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 2,
    active: true,
    inProgress: true,
  },
  {
    id: 'C1S2Q1',
    content: '나는 화가 나더라도 감정을 조절하여 행동할 수 있다.',
    coreCode: 'C1',
    coreName: '자기관리',
    subCode: 'C1S2',
    subName: '자기조절',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 1,
    active: true,
    inProgress: false,
  },
  {
    id: 'C1S2Q2',
    content: '나는 해야 할 일을 미루는 경향이 있다.',
    coreCode: 'C1',
    coreName: '자기관리',
    subCode: 'C1S2',
    subName: '자기조절',
    isReverse: true,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 2,
    active: true,
    inProgress: false,
  },
  {
    id: 'C1S3Q1',
    content: '나는 5년 후 내가 원하는 직업을 위한 계획을 갖고 있다.',
    coreCode: 'C1',
    coreName: '자기관리',
    subCode: 'C1S3',
    subName: '진로설계',
    isReverse: false,
    version: 'v1.1',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 1,
    active: true,
    inProgress: false,
  },
  {
    id: 'C2S1Q1',
    content: '나는 상대방이 이해하기 쉽게 설명할 수 있다.',
    coreCode: 'C2',
    coreName: '의사소통',
    subCode: 'C2S1',
    subName: '언어능력',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 1,
    active: true,
    inProgress: false,
  },
  {
    id: 'C2S2Q1',
    content: '나는 많은 청중 앞에서도 자신감 있게 발표할 수 있다.',
    coreCode: 'C2',
    coreName: '의사소통',
    subCode: 'C2S2',
    subName: '발표능력',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 1,
    active: true,
    inProgress: true,
  },
  {
    id: 'C3S1Q1',
    content: '나는 팀 과제에서 나의 역할을 충실히 수행한다.',
    coreCode: 'C3',
    coreName: '대인관계',
    subCode: 'C3S1',
    subName: '협업',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 1,
    active: true,
    inProgress: false,
  },
  {
    id: 'C3S3Q1',
    content: '나는 갈등 상황에서 상대방의 입장을 먼저 이해하려 한다.',
    coreCode: 'C3',
    coreName: '대인관계',
    subCode: 'C3S3',
    subName: '갈등관리',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 1,
    active: true,
    inProgress: false,
  },
  {
    id: 'C4S1Q1',
    content: '나는 외국인과 기본적인 대화를 영어로 나눌 수 있다.',
    coreCode: 'C4',
    coreName: '글로벌',
    subCode: 'C4S1',
    subName: '외국어능력',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T02',
    templateName: '리커트 4점',
    displayOrder: 1,
    active: true,
    inProgress: false,
  },
  {
    id: 'C5S1Q1',
    content: '나는 정보를 접할 때 그 출처와 신뢰성을 확인한다.',
    coreCode: 'C5',
    coreName: '문제해결',
    subCode: 'C5S1',
    subName: '비판적사고',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 1,
    active: true,
    inProgress: false,
  },
  {
    id: 'C5S2Q1',
    content: '나는 기존과 다른 방식으로 문제를 해결하려 노력한다.',
    coreCode: 'C5',
    coreName: '문제해결',
    subCode: 'C5S2',
    subName: '창의성',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 1,
    active: true,
    inProgress: false,
  },
  {
    id: 'C6S1Q1',
    content: '나는 맡은 업무를 기한 내에 완수하려 노력한다.',
    coreCode: 'C6',
    coreName: '직업윤리',
    subCode: 'C6S1',
    subName: '책임감',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 1,
    active: true,
    inProgress: false,
  },
  {
    id: 'C6S2Q1',
    content: '나는 공동의 규칙이나 약속을 잘 지킨다.',
    coreCode: 'C6',
    coreName: '직업윤리',
    subCode: 'C6S2',
    subName: '공동체의식',
    isReverse: false,
    version: 'v1.0',
    templateId: 'T01',
    templateName: '리커트 5점',
    displayOrder: 1,
    active: true,
    inProgress: false,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function QuestionManage() {
  const [core, setCore] = useState('전체');
  const [sub, setSub] = useState('전체');
  const [activeF, setActiveF] = useState('전체');
  const [keyword, setKw] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [versionWarn, setVersionWarn] = useState(null);

  // Drawer form
  const [fSub, setFSub] = useState('C1S1 자아정체성');
  const [fContent, setFContent] = useState('');
  const [fReverse, setFReverse] = useState(false);
  const [fTemplate, setFTemplate] = useState('T01 리커트 5점');
  const [fItems, setFItems] = useState(SCALE_PREVIEWS['T01 리커트 5점']);

  const subOptions = core !== '전체' ? (SUB_MAP[core] ?? ['전체']) : ['전체'];

  const filtered = QUESTIONS.filter((q) => {
    const matchCore = core === '전체' || `${q.coreCode} ${q.coreName}` === core;
    const matchSub = sub === '전체' || `${q.subCode} ${q.subName}` === sub;
    const matchAct = activeF === '전체' || (activeF === '사용' ? q.active : !q.active);
    const matchKw = !keyword || q.content.includes(keyword) || q.id.includes(keyword);
    return matchCore && matchSub && matchAct && matchKw;
  });

  const openNew = () => {
    setEditTarget(null);
    setFContent('');
    setFReverse(false);
    setFTemplate('T01 리커트 5점');
    setFItems(SCALE_PREVIEWS['T01 리커트 5점']);
    setDrawerOpen(true);
  };

  const openEdit = (q) => {
    if (q.inProgress) {
      setVersionWarn(q);
      return;
    }
    setEditTarget(q);
    setFContent(q.content);
    setFReverse(q.isReverse);
    const tk = `T0${q.templateId.slice(-1)} ${q.templateName}`;
    setFTemplate(tk);
    setFItems(SCALE_PREVIEWS[tk] ?? SCALE_PREVIEWS['T01 리커트 5점']);
    setDrawerOpen(true);
  };

  const selectTemplate = (t) => {
    setFTemplate(t);
    setFItems((SCALE_PREVIEWS[t] ?? []).map((i) => ({ ...i })));
  };

  const updateAnchor = (vi, val) => {
    setFItems((prev) => prev.map((item, i) => (i === vi ? { ...item, anchor: val } : item)));
  };

  const saveQuestion = () => {
    if (!fContent.trim()) {
      toast('문항 내용을 입력해 주세요.', 'error');
      return;
    }
    setDrawerOpen(false);
    const verb = editTarget ? '수정' : '등록';
    toast(`문항이 ${verb}되었습니다.`, 'success');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">문항 관리</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            역량 진단 문항 등록·수정·버전 관리 —
            <span className="font-bold text-[#1F2328] ml-1">총 90문항</span>
          </p>
        </div>
        <Button onClick={openNew} style={{ background: ACCENT }}>
          + 문항 등록
        </Button>
      </div>

      {/* FilterBar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-4 flex gap-3 flex-wrap items-end">
        <div className="flex flex-col gap-1 w-40">
          <label className="text-[10px] font-semibold text-[#656D76]">핵심역량</label>
          <select
            value={core}
            onChange={(e) => {
              setCore(e.target.value);
              setSub('전체');
            }}
            className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151]"
          >
            {CORE_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-44">
          <label className="text-[10px] font-semibold text-[#656D76]">하위역량</label>
          <select
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151]"
          >
            {subOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-28">
          <label className="text-[10px] font-semibold text-[#656D76]">사용여부</label>
          <select
            value={activeF}
            onChange={(e) => setActiveF(e.target.value)}
            className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151]"
          >
            {['전체', '사용', '미사용'].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-[10px] font-semibold text-[#656D76]">문항 검색</label>
          <input
            value={keyword}
            onChange={(e) => setKw(e.target.value)}
            placeholder="문항 ID 또는 내용..."
            className="h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151]"
          />
        </div>
        <div className="flex items-end">
          <span
            className="text-[12px] font-bold px-3 py-1.5 rounded-[6px] bg-[#F3F4F6]"
            style={{ color: ACCENT }}
          >
            {filtered.length}문항
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {[
                  '문항 ID',
                  '문항 내용',
                  '하위역량',
                  '역문항',
                  '버전',
                  '척도',
                  '순서',
                  '사용',
                  '관리',
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 3 ? 'text-center' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr
                  key={q.id}
                  className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors ${!q.active ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3 font-mono text-[10px]" style={{ color: ACCENT }}>
                    {q.id}
                  </td>
                  <td className="px-4 py-3 max-w-[280px]">
                    <p className="text-[12px] text-[#1F2328] leading-snug line-clamp-2">
                      {q.content}
                    </p>
                    {q.inProgress && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] mt-1 inline-block">
                        진단 진행 중
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] bg-[#F3F4F6]"
                      style={{ color: ACCENT }}
                    >
                      {q.coreName}
                    </span>
                    <span className="text-[11px] text-[#9AA0A6] ml-1">{q.subName}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {q.isReverse ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                        Y
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#D1D5DB]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-[11px] text-[#9AA0A6]">
                    {q.version}
                  </td>
                  <td className="px-4 py-3 text-center text-[11px] text-[#656D76] whitespace-nowrap">
                    {q.templateName}
                  </td>
                  <td className="px-4 py-3 text-center text-[#9AA0A6]">{q.displayOrder}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${q.active ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#F3F4F6] text-[#9AA0A6]'}`}
                    >
                      {q.active ? '사용' : '미사용'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openEdit(q)}
                      className="h-5 px-2 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] hover:bg-[#F3F4F6] transition-colors"
                      style={{ color: ACCENT }}
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Question drawer ── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editTarget ? '문항 수정' : '문항 등록'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              취소
            </Button>
            <Button style={{ background: ACCENT }} onClick={saveQuestion}>
              {editTarget ? '수정 저장' : '문항 등록'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Sub-competency */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              소속 하위역량 <span className="text-[#CF222E]">*</span>
            </label>
            <select
              value={fSub}
              onChange={(e) => setFSub(e.target.value)}
              className="w-full h-9 px-2 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#374151] bg-white"
            >
              {Object.values(SUB_MAP)
                .flat()
                .filter((s) => s !== '전체')
                .map((s) => (
                  <option key={s}>{s}</option>
                ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              문항 내용 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              value={fContent}
              onChange={(e) => setFContent(e.target.value)}
              rows={4}
              placeholder="나는 ..."
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151] bg-white"
            />
            <p className="text-[10px] text-[#9AA0A6] mt-1">{fContent.length}자</p>
          </div>

          {/* Reverse item toggle */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-2">
              역문항 여부
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFReverse(!fReverse)}
                className={`relative w-9 h-5 rounded-full transition-colors ${fReverse ? '' : 'bg-[#D1D5DB]'}`}
                style={fReverse ? { background: '#D97706' } : {}}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${fReverse ? 'translate-x-4' : ''}`}
                />
              </button>
              <span
                className={`text-[12px] font-semibold ${fReverse ? 'text-[#D97706]' : 'text-[#9AA0A6]'}`}
              >
                {fReverse ? '역문항' : '일반문항'}
              </span>
            </div>
            <p className="text-[10px] text-[#9AA0A6] mt-1.5">
              역문항은 채점 시 (6 - 응답값)으로 역산됩니다.
            </p>
          </div>

          {/* Scale template */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              척도 템플릿 <span className="text-[#CF222E]">*</span>
            </label>
            <select
              value={fTemplate}
              onChange={(e) => selectTemplate(e.target.value)}
              className="w-full h-9 px-2 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#374151] bg-white"
            >
              {TEMPLATE_OPTIONS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Scale preview — auto-generated when template selected */}
          {fItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold text-[#656D76]">응답 항목 미리보기</span>
                <span className="text-[10px] text-[#9AA0A6]">
                  (템플릿에서 자동 복사 · 수정 가능)
                </span>
              </div>
              <div className="rounded-[8px] border border-[#E5E7EB] overflow-hidden">
                {fItems.map((item, vi) => (
                  <div
                    key={item.value}
                    className={`flex items-center gap-3 px-4 py-2.5 ${vi < fItems.length - 1 ? 'border-b border-[#F3F4F6]' : ''} hover:bg-[#FAFAFA]`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                      style={{
                        background: ACCENT,
                        opacity: 0.4 + (item.value / fItems.length) * 0.6,
                      }}
                    >
                      {item.value}
                    </div>
                    <input
                      value={item.anchor}
                      onChange={(e) => updateAnchor(vi, e.target.value)}
                      className="flex-1 text-[12px] bg-transparent focus:outline-none focus:bg-white focus:border-b focus:border-[#374151] pb-0.5 transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* Version warning modal */}
      <Modal
        open={!!versionWarn}
        onClose={() => setVersionWarn(null)}
        title="진행 중인 진단에 포함된 문항"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setVersionWarn(null)}>
              취소
            </Button>
            <Button
              style={{ background: '#D97706' }}
              onClick={() => {
                if (versionWarn) {
                  setVersionWarn(null);
                  setEditTarget(versionWarn);
                  setFContent(versionWarn.content);
                  setFReverse(versionWarn.isReverse);
                  const tk = `T0${versionWarn.templateId.slice(-1)} ${versionWarn.templateName}`;
                  setFTemplate(tk);
                  setFItems((SCALE_PREVIEWS[tk] ?? []).map((i) => ({ ...i })));
                  setDrawerOpen(true);
                }
              }}
            >
              새 버전으로 저장
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-[8px] bg-[#FFFBEB] border border-[#FDE68A] text-[12px] text-[#92400E] leading-relaxed">
            현재 진행 중인 진단에 사용 중인 문항입니다. 수정하면{' '}
            <strong>새 버전(v1.1)으로 등록</strong>되며 기존 응답은 이전 버전으로 보존됩니다.
          </div>
          {versionWarn && (
            <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB]">
              <p className="text-[10px] font-mono text-[#9AA0A6] mb-1">
                {versionWarn.id} · {versionWarn.version}
              </p>
              <p className="text-[12px] text-[#1F2328] leading-snug">{versionWarn.content}</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5 text-[11px] text-[#656D76]">
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[9px] font-black shrink-0"
                style={{ color: ACCENT }}
              >
                1
              </span>
              기존 버전({versionWarn?.version})은 현재 진행 중인 진단에 유지됩니다.
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[9px] font-black shrink-0"
                style={{ color: ACCENT }}
              >
                2
              </span>
              새 버전은 다음 진단 회차부터 적용됩니다.
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
