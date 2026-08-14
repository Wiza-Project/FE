import { useState } from 'react';
import { Button, FileUpload, toast } from '@/components/common';

const ACCENT = '#059669';

const STAGES = ['지원', '서류전형', '면접', '최종결과'];

const STAGE_COLORS = {
  지원: '#9AA0A6',
  서류전형: '#0969DA',
  면접: '#7C3AED',
  최종결과: '#059669',
};

const SOURCE_STYLES = {
  학과추천: 'bg-[#DBEAFE] text-[#0969DA]',
  자동매칭: 'bg-[#F3F4F6] text-[#6E7781]',
};

const RESULT_STYLES = {
  합격: 'bg-[#DCFCE7] text-[#059669]',
  불합격: 'bg-[#FEE2E2] text-[#CF222E]',
  대기: 'bg-[#FEF3C7] text-[#D97706]',
};

// ─── Initial data ─────────────────────────────────────────────────────────────

const INIT_CARDS = [
  {
    id: 'A1',
    company: '(주)테크노바',
    title: '소프트웨어 개발자',
    appliedAt: '2026-08-12',
    source: '학과추천',
    stage: '지원',
  },
  {
    id: 'A2',
    company: '현대모비스',
    title: '임베디드 시스템 개발자',
    appliedAt: '2026-08-10',
    source: '학과추천',
    stage: '지원',
  },
  {
    id: 'A3',
    company: '카카오',
    title: 'UI/UX 디자이너 인턴',
    appliedAt: '2026-08-08',
    source: '자동매칭',
    stage: '서류전형',
  },
  {
    id: 'A4',
    company: 'LG화학',
    title: '경영지원 사원',
    appliedAt: '2026-07-25',
    source: '자동매칭',
    stage: '서류전형',
  },
  {
    id: 'A5',
    company: 'NAVER',
    title: 'AI·머신러닝 엔지니어',
    appliedAt: '2026-07-20',
    source: '학과추천',
    stage: '면접',
  },
  {
    id: 'A6',
    company: 'SK하이닉스',
    title: '회계·재무 담당자',
    appliedAt: '2026-06-10',
    source: '자동매칭',
    stage: '최종결과',
    result: '합격',
  },
  {
    id: 'A7',
    company: '두산에너빌리티',
    title: '기계 설계 엔지니어',
    appliedAt: '2026-06-05',
    source: '자동매칭',
    stage: '최종결과',
    result: '불합격',
  },
  {
    id: 'A8',
    company: 'POSCO홀딩스',
    title: '산학협력 연구원',
    appliedAt: '2026-05-28',
    source: '학과추천',
    stage: '최종결과',
    result: '대기',
  },
];

// ─── Card component ───────────────────────────────────────────────────────────

function KanbanCard({ card, onMove }) {
  const stageIdx = STAGES.indexOf(card.stage);
  const canAdvance = stageIdx < STAGES.length - 1 && !card.result;
  const canRetreat = stageIdx > 0 && !card.result;

  return (
    <div
      className={`bg-white rounded-[8px] border shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] ${card.result === '합격' ? 'border-[#BBF7D0]' : card.result === '불합격' ? 'border-[#FECACA]' : 'border-[#E5E7EB]'}`}
    >
      {/* Company + source */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-[13px] font-black text-[#1F2328] leading-tight">{card.company}</p>
          <p className="text-[11px] text-[#656D76] leading-snug mt-0.5">{card.title}</p>
        </div>
        <span
          className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${SOURCE_STYLES[card.source]}`}
        >
          {card.source}
        </span>
      </div>

      {/* Result badge if final */}
      {card.result && (
        <div className="mb-2">
          <span
            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${RESULT_STYLES[card.result]}`}
          >
            {card.result}
          </span>
        </div>
      )}

      {/* Applied date */}
      <p className="text-[10px] text-[#C8D0D9] font-mono mb-3">지원일: {card.appliedAt}</p>

      {/* Move controls */}
      {!card.result && (
        <div className="flex gap-1">
          <button
            onClick={() => canRetreat && onMove(card.id, STAGES[stageIdx - 1])}
            disabled={!canRetreat}
            className={`flex-1 h-6 text-[10px] font-bold rounded-[4px] border transition-colors ${canRetreat ? 'border-[#E5E7EB] text-[#9AA0A6] hover:border-[#656D76] hover:text-[#656D76]' : 'border-[#F3F4F6] text-[#E5E7EB] cursor-not-allowed'}`}
          >
            ← 이전
          </button>
          <button
            onClick={() => canAdvance && onMove(card.id, STAGES[stageIdx + 1])}
            disabled={!canAdvance}
            className={`flex-1 h-6 text-[10px] font-bold rounded-[4px] border transition-colors ${canAdvance ? 'border-[#059669] text-[#059669] hover:bg-[#F0FDF4]' : 'border-[#F3F4F6] text-[#E5E7EB] cursor-not-allowed'}`}
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Employment report ────────────────────────────────────────────────────────

function EmploymentReport() {
  const [company, setCompany] = useState('');
  const [startDate, setStartDate] = useState('');
  const [empType, setEmpType] = useState('정규직');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!company || !startDate) {
      toast('입사 기업과 입사일을 입력해주세요.', 'warning');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    toast('취업 신고가 완료되었습니다. 담당자 검토 후 처리됩니다.', 'success');
  };

  return (
    <div className="bg-white rounded-[10px] border-2 border-[#BBF7D0] shadow-[0_2px_12px_rgba(5,150,105,0.08)] overflow-hidden flex-shrink-0 w-[280px]">
      <div className="h-1" style={{ background: ACCENT }} />
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <h2 className="text-[14px] font-bold text-[#1F2328]">취업 신고</h2>
        </div>

        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px] px-3 py-2">
          <p className="text-[11px] text-[#14532D] leading-snug">
            취업 확정 시 신고해주세요. 학교 취업 통계 및 마일리지 적립에 반영됩니다.
          </p>
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#1F2328] mb-1.5 block">
            입사 기업 <span className="text-[#CF222E]">*</span>
          </label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="기업명 입력"
            className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#1F2328] mb-1.5 block">
            입사일 <span className="text-[#CF222E]">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#1F2328] mb-1.5 block">고용 형태</label>
          <select
            value={empType}
            onChange={(e) => setEmpType(e.target.value)}
            className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] appearance-none"
          >
            {['정규직', '계약직', '인턴', '기타'].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#1F2328] mb-1.5 block">
            확인 근거 <span className="text-[#9AA0A6] font-normal">(근로계약서·재직증명서)</span>
          </label>
          <FileUpload accept=".pdf,.jpg,.png" maxSize="10MB" />
        </div>

        <Button
          size="md"
          className="w-full justify-center"
          loading={submitting}
          style={{ background: ACCENT }}
          onClick={handleSubmit}
        >
          신고하기
        </Button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ApplicationBoard() {
  const [cards, setCards] = useState(INIT_CARDS);

  const moveCard = (id, stage) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
    toast(`전형 단계가 "${stage}"로 업데이트되었습니다.`, 'success');
  };

  const stageCards = (stage) => cards.filter((c) => c.stage === stage);

  return (
    <div className="flex gap-5">
      {/* Kanban board */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {STAGES.map((s) => {
            const cnt = stageCards(s).length;
            return (
              <div
                key={s}
                className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-4 py-3 flex items-center gap-3"
              >
                <div
                  className="w-2 h-8 rounded-full flex-shrink-0"
                  style={{ background: STAGE_COLORS[s] }}
                />
                <div>
                  <p className="text-[11px] text-[#9AA0A6]">{s}</p>
                  <p className="text-[18px] font-black" style={{ color: STAGE_COLORS[s] }}>
                    {cnt}건
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Board columns */}
        <div className="grid grid-cols-4 gap-3">
          {STAGES.map((stage) => (
            <div key={stage} className="flex flex-col gap-3">
              {/* Column header */}
              <div
                className="flex items-center gap-2 pb-2 border-b-2"
                style={{ borderColor: STAGE_COLORS[stage] }}
              >
                <span className="text-[12px] font-black" style={{ color: STAGE_COLORS[stage] }}>
                  {stage}
                </span>
                <span
                  className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
                  style={{ background: STAGE_COLORS[stage] }}
                >
                  {stageCards(stage).length}
                </span>
              </div>
              {/* Cards */}
              {stageCards(stage).length === 0 ? (
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-[8px] p-4 text-center text-[11px] text-[#C8D0D9]">
                  공고 없음
                </div>
              ) : (
                stageCards(stage).map((card) => (
                  <KanbanCard key={card.id} card={card} onMove={moveCard} />
                ))
              )}
            </div>
          ))}
        </div>

        {/* Source legend */}
        <div className="flex items-center gap-4 text-[11px] text-[#9AA0A6] pt-2">
          <span>추천 출처:</span>
          <span className="flex items-center gap-1">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#0969DA]">
              학과추천
            </span>{' '}
            학과장·지도교수 추천 공고
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6E7781]">
              자동매칭
            </span>{' '}
            역량·조건 기반 자동 추천
          </span>
        </div>
      </div>

      {/* Employment report */}
      <EmploymentReport />
    </div>
  );
}
