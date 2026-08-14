import { useState } from 'react';
import { ALL_QUESTIONS, COMP_LABELS, COMP_KEYS } from '@/data/competencyData';
import { ConfirmDialog, toast } from '@/components/common';

const LIKERT = [
  { value: 1, label: '전혀\n그렇지 않다' },
  { value: 2, label: '그렇지\n않다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우\n그렇다' },
];

const QUESTIONS_PER_PAGE = 3;
// Start mid-diagnosis: page 12 shows Q34-36
const INITIAL_PAGE = 11; // 0-indexed: page 11 = questions 34-36

const COMP_COLORS = {
  C1: '#2563EB',
  C2: '#7C3AED',
  C3: '#0891B2',
  C4: '#059669',
  C5: '#D97706',
  C6: '#6B7280',
};

/**
 * @param {Object} props
 * @param {() => void} props.onComplete
 * @param {() => void} props.onBack
 */
export default function DiagnosisQuestions({ onComplete, onBack }) {
  const [page, setPage] = useState(INITIAL_PAGE);
  const [answers, setAnswers] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const totalPages = Math.ceil(ALL_QUESTIONS.length / QUESTIONS_PER_PAGE);
  const currentQs = ALL_QUESTIONS.slice(page * QUESTIONS_PER_PAGE, (page + 1) * QUESTIONS_PER_PAGE);
  const answeredCount = Object.keys(answers).length;
  const unanswered = ALL_QUESTIONS.length - answeredCount;
  const canSubmit = unanswered === 0;
  const progress = Math.round((answeredCount / ALL_QUESTIONS.length) * 100);

  // Competency completion status
  const compStatus = COMP_KEYS.map((key, ci) => {
    const qs = ALL_QUESTIONS.filter((q) => q.compKey === key);
    const done = qs.filter((q) => answers[q.id] !== undefined).length;
    const started = done > 0;
    return { key, label: COMP_LABELS[ci], total: qs.length, done, started };
  });

  // Current question position label
  const firstQ = currentQs[0];
  const posLabel = firstQ ? `${firstQ.compKey}. ${firstQ.compLabel} > ${firstQ.subComp}` : '';

  const setAnswer = (qId, val) => setAnswers((prev) => ({ ...prev, [qId]: val }));

  const handleSubmit = () => {
    setConfirmOpen(false);
    toast('진단이 제출되었습니다.', 'success');
    setTimeout(onComplete, 500);
  };

  const handleSave = () => toast('임시 저장되었습니다.', 'success');

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Fixed top bar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="px-6 py-3">
          {/* Title row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                사전 진단
              </span>
              <span className="text-[14px] font-bold text-[#1F2328]">
                2026학년도 1학기 사전 진단
              </span>
              <span className="text-[12px] text-[#656D76]">·</span>
              <span className="text-[12px] text-[#656D76]">{posLabel}</span>
            </div>
            <span className="text-[13px] font-bold text-[#7C3AED]">
              {answeredCount} / {ALL_QUESTIONS.length} 문항 ({progress}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-[#EDE9FE] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7C3AED] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Competency indicator strip */}
        <div className="px-6 pb-3 flex items-center gap-2">
          {compStatus.map((c) => (
            <div
              key={c.key}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors"
              style={{
                background:
                  c.done === c.total
                    ? COMP_COLORS[c.key] + '15'
                    : c.started
                      ? '#FFF7ED'
                      : '#F9FAFB',
                borderColor:
                  c.done === c.total ? COMP_COLORS[c.key] : c.started ? '#FDE68A' : '#E5E7EB',
                color: c.done === c.total ? COMP_COLORS[c.key] : c.started ? '#D97706' : '#9AA0A6',
              }}
            >
              <span>{c.key}</span>
              <span className="font-normal opacity-70">
                {c.done}/{c.total}
              </span>
              {c.done === c.total && <span className="text-[9px]">✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Question cards ── */}
      <div className="flex-1 px-6 py-6 flex flex-col gap-4 max-w-[880px] w-full mx-auto">
        {currentQs.map((q) => {
          const selected = answers[q.id];
          return (
            <div
              key={q.id}
              className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden"
            >
              {/* Question header */}
              <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black text-white flex-shrink-0"
                  style={{ background: COMP_COLORS[q.compKey] }}
                >
                  {q.id}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: COMP_COLORS[q.compKey] }}
                    >
                      {q.compKey}. {q.compLabel}
                    </span>
                    <span className="text-[11px] text-[#9AA0A6]">{q.subComp}</span>
                  </div>
                  <p className="text-[14px] font-semibold text-[#1F2328] leading-snug">{q.text}</p>
                </div>
              </div>

              {/* Likert options */}
              <div className="px-6 py-5">
                <div className="flex gap-3">
                  {LIKERT.map((opt) => {
                    const isSelected = selected === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setAnswer(q.id, opt.value)}
                        className={`flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-[8px] border-2 transition-all cursor-pointer
                          ${isSelected ? 'border-[#7C3AED] bg-[#F5F3FF]' : 'border-[#E5E7EB] hover:border-[#C4B5FD] hover:bg-[#FAFAFA]'}`}
                      >
                        {/* Number circle */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-black border-2 transition-colors
                          ${isSelected ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'border-[#E5E7EB] text-[#9AA0A6]'}`}
                        >
                          {opt.value}
                        </div>
                        <span
                          className={`text-[11px] font-semibold text-center leading-tight whitespace-pre-line transition-colors ${isSelected ? 'text-[#7C3AED]' : 'text-[#9AA0A6]'}`}
                        >
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Scale hint */}
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-[10px] text-[#C4C9CF]">← 동의하지 않음</span>
                  <span className="text-[10px] text-[#C4C9CF]">동의함 →</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Fixed bottom action bar ── */}
      <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-20">
        {/* Unanswered warning */}
        {!canSubmit && (
          <div className="px-6 pt-3 flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="#D97706">
              <path d="M8 1L1 14h14L8 1z" />
              <path d="M8 6v4M8 12h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[12px] text-[#D97706] font-semibold">
              미응답 문항 {unanswered}개가 남아 있어 최종 제출할 수 없습니다.
            </span>
          </div>
        )}
        <div className="flex items-center justify-between px-6 py-3 gap-3">
          {/* Left */}
          <button
            onClick={() => (page > 0 ? setPage((p) => p - 1) : onBack())}
            className="h-9 px-5 text-[13px] font-semibold text-[#656D76] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
          >
            ← 이전
          </button>
          {/* Center */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#9AA0A6]">
              {page + 1} / {totalPages} 페이지
            </span>
            <button
              onClick={handleSave}
              className="h-9 px-4 text-[13px] font-semibold text-[#7C3AED] border border-[#7C3AED] rounded-[6px] hover:bg-[#F5F3FF] transition-colors"
            >
              임시 저장
            </button>
          </div>
          {/* Right */}
          <div className="flex gap-2">
            {page < totalPages - 1 ? (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="h-9 px-6 text-[13px] font-bold text-white rounded-[6px] transition-colors"
                style={{ background: '#7C3AED' }}
              >
                다음 →
              </button>
            ) : (
              <button
                onClick={() => canSubmit && setConfirmOpen(true)}
                disabled={!canSubmit}
                className="h-9 px-6 text-[13px] font-bold text-white rounded-[6px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#7C3AED' }}
              >
                최종 제출
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="최종 제출 확인"
        message="제출 후에는 응답을 수정할 수 없습니다. 제출하시겠습니까?"
        confirmLabel="제출하기"
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
