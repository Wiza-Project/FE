import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchAssessmentResume, saveAssessmentResponse, submitAssessment } from '@/api/competency';
import { ApiError } from '@/api/client';
import { ConfirmDialog, EmptyState, SkeletonLoader, toast } from '@/components/common';

const LIKERT = [
  { value: 1, label: '전혀\n그렇지 않다' },
  { value: 2, label: '그렇지\n않다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우\n그렇다' },
];

const QUESTIONS_PER_PAGE = 3;

// 역량마다 처음 등장하는 순서대로 순환 배정하는 팔레트
const COMP_PALETTE = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#6B7280'];

/**
 * @param {Object} props
 * @param {number} props.attemptId
 * @param {() => void} props.onComplete
 * @param {() => void} props.onBack
 */
export default function DiagnosisQuestions({ attemptId, onComplete, onBack }) {
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> selectedValue
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // answers state의 동기 미러. useState functional updater는 setter 호출 시 즉시 실행되지
  // 않고 다음 render에서 실행되므로, rollback에 쓸 이전 값은 이 ref에서 동기적으로 읽는다.
  const answersRef = useRef({});
  const applyAnswers = (updater) => {
    const next = typeof updater === 'function' ? updater(answersRef.current) : updater;
    answersRef.current = next;
    setAnswers(next);
  };

  const {
    data: resumeData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['assessmentResume', attemptId],
    queryFn: () => fetchAssessmentResume(attemptId),
    enabled: !!attemptId,
  });

  const items = useMemo(() => resumeData?.items ?? [], [resumeData]);

  // 이어하기: 응답이 도착하면 한 번만 로컬 상태를 서버 값으로 초기화하고
  // 첫 미응답 문항이 포함된 페이지로 이동한다.
  useEffect(() => {
    if (!resumeData || initialized) return;
    const initialAnswers = {};
    resumeData.items.forEach((item) => {
      if (item.selectedValue != null) initialAnswers[item.questionId] = Number(item.selectedValue);
    });
    applyAnswers(initialAnswers);
    const firstUnansweredIdx = resumeData.items.findIndex((item) => item.selectedValue == null);
    const targetIdx = firstUnansweredIdx === -1 ? resumeData.items.length - 1 : firstUnansweredIdx;
    setPage(Math.max(0, Math.floor(targetIdx / QUESTIONS_PER_PAGE)));
    setInitialized(true);
  }, [resumeData, initialized]);

  const competencyColor = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      if (!(item.competencyId in map)) {
        map[item.competencyId] = COMP_PALETTE[Object.keys(map).length % COMP_PALETTE.length];
      }
    });
    return map;
  }, [items]);

  // pendingRef: 클릭 시점에 즉시 판정하는 동기 가드(같은 문항 중복 저장 요청 자체를 차단).
  // pendingIds: 위 상태를 버튼 disabled 표시에 반영하기 위한 렌더링용 state.
  const pendingRef = useRef(new Set());
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const saveMutation = useMutation({
    mutationFn: saveAssessmentResponse,
    // 낙관적 갱신 직전 값을 answersRef에서 동기적으로 캡처해 실패 시 정확히 그 값으로 되돌릴 수 있게 한다.
    onMutate: (variables) => {
      const previousValue = answersRef.current[variables.questionId];
      applyAnswers((prev) => ({ ...prev, [variables.questionId]: variables.selectedValue }));
      setPendingIds((prev) => new Set(prev).add(variables.questionId));
      return { previousValue };
    },
    onError: (e, variables, context) => {
      // 실패 시 원래 값으로 복구(미응답 아님). 응답이 없던 문항이었다면 previousValue가 undefined이므로 삭제한다.
      applyAnswers((prev) => {
        const next = { ...prev };
        if (context?.previousValue === undefined) {
          delete next[variables.questionId];
        } else {
          next[variables.questionId] = context.previousValue;
        }
        return next;
      });
      toast(e instanceof ApiError ? e.message : '응답 저장에 실패했습니다.', 'error');
    },
    onSettled: (data, error, variables) => {
      pendingRef.current.delete(variables.questionId);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.questionId);
        return next;
      });
    },
  });

  const totalPages = Math.ceil(items.length / QUESTIONS_PER_PAGE);
  const currentQs = items.slice(page * QUESTIONS_PER_PAGE, (page + 1) * QUESTIONS_PER_PAGE);
  const answeredCount = Object.keys(answers).length;
  const unanswered = items.length - answeredCount;
  // pendingIds가 비어있어야 함: 마지막 문항 저장이 아직 서버에 도착 전이면(특히 이미 응답된
  // 문항을 수정하는 경우 answeredCount는 계속 총 문항 수와 같아 이 조건 없이는 걸러지지 않는다)
  // submitAssessment가 먼저 처리돼 서버가 그 문항을 미응답으로 판단할 수 있다.
  const canSubmit = items.length > 0 && unanswered === 0 && pendingIds.size === 0;
  const progress = items.length ? Math.round((answeredCount / items.length) * 100) : 0;

  // Competency completion status
  const compStatus = useMemo(() => {
    const order = [];
    const byId = new Map();
    items.forEach((item) => {
      if (!byId.has(item.competencyId)) {
        byId.set(item.competencyId, {
          key: item.competencyId,
          label: item.competencyName,
          total: 0,
          done: 0,
        });
        order.push(item.competencyId);
      }
      const entry = byId.get(item.competencyId);
      entry.total += 1;
      if (answers[item.questionId] !== undefined) entry.done += 1;
    });
    return order.map((id) => {
      const entry = byId.get(id);
      return { ...entry, started: entry.done > 0 };
    });
  }, [items, answers]);

  // Current question position label
  const firstQ = currentQs[0];
  const posLabel = firstQ ? firstQ.competencyName : '';

  const setAnswer = (questionId, val) => {
    if (pendingRef.current.has(questionId)) return; // 저장 중이면 클릭 자체를 무시(state 반영을 기다리지 않음)
    pendingRef.current.add(questionId);
    saveMutation.mutate({ attemptId, questionId, selectedValue: val });
  };

  const submitMutation = useMutation({
    mutationFn: submitAssessment,
    onSuccess: () => {
      toast('진단이 제출되었습니다.', 'success');
      onComplete();
    },
    onError: (e) => {
      // Q005(미응답 문항 있음): 서버가 응답과 함께 내려준 미응답 questionId로 자동 이동한다.
      if (e instanceof ApiError && e.code === 'Q005' && Array.isArray(e.data)) {
        const missingIds = e.data;
        const firstMissingIdx = items.findIndex((item) => missingIds.includes(item.questionId));
        if (firstMissingIdx !== -1) {
          setPage(Math.floor(firstMissingIdx / QUESTIONS_PER_PAGE));
        }
      }
      toast(e instanceof ApiError ? e.message : '제출에 실패했습니다.', 'error');
    },
  });

  const handleSubmit = () => {
    setConfirmOpen(false);
    // 버튼의 disabled 속성만으로는 다음 렌더 전에 들어오는 중복 클릭(예: 확인 다이얼로그를 빠르게
    // 두 번 확정)을 못 막는다 — setAnswer의 pendingRef와 같은 이유로 여기서도 동기 가드를 둔다.
    // canSubmit도 함께 확인: 다이얼로그가 열려 있는 사이 마지막 문항 저장이 아직 안 끝났을 수 있다.
    if (!canSubmit || submitMutation.isPending) return;
    submitMutation.mutate(attemptId);
  };

  const handleSave = () =>
    toast('모든 응답이 자동 저장되었습니다. 나중에 이어서 응시할 수 있습니다.', 'success');

  if (!attemptId) {
    return (
      <EmptyState
        message="진단 응시 정보를 찾을 수 없습니다."
        action={
          <button
            type="button"
            onClick={onBack}
            className="h-9 px-5 text-[13px] font-semibold text-[#656D76] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
          >
            ← 진단 안내로 돌아가기
          </button>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className="px-6 py-6">
        <SkeletonLoader rows={3} cols={3} />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        message={error instanceof ApiError ? error.message : '문항을 불러오지 못했습니다.'}
        sub="잠시 후 다시 시도해 주세요."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="h-9 px-5 text-[13px] font-bold text-white rounded-[6px]"
              style={{ background: '#7C3AED' }}
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={onBack}
              className="h-9 px-5 text-[13px] font-semibold text-[#656D76] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
            >
              ← 돌아가기
            </button>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Fixed top bar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="px-6 py-3">
          {/* Title row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                진단
              </span>
              <span className="text-[12px] text-[#656D76]">{posLabel}</span>
            </div>
            <span className="text-[13px] font-bold text-[#7C3AED]">
              {answeredCount} / {items.length} 문항 ({progress}%)
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
                    ? competencyColor[c.key] + '15'
                    : c.started
                      ? '#FFF7ED'
                      : '#F9FAFB',
                borderColor:
                  c.done === c.total ? competencyColor[c.key] : c.started ? '#FDE68A' : '#E5E7EB',
                color: c.done === c.total ? competencyColor[c.key] : c.started ? '#D97706' : '#9AA0A6',
              }}
            >
              <span>{c.label}</span>
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
        {currentQs.map((q, i) => {
          const selected = answers[q.questionId];
          const questionNo = page * QUESTIONS_PER_PAGE + i + 1;
          return (
            <div
              key={q.questionId}
              className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden"
            >
              {/* Question header */}
              <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black text-white flex-shrink-0"
                  style={{ background: competencyColor[q.competencyId] }}
                >
                  {questionNo}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: competencyColor[q.competencyId] }}
                    >
                      {q.competencyName}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold text-[#1F2328] leading-snug">
                    {q.questionText}
                  </p>
                </div>
              </div>

              {/* Likert options — 5개 중 하나만 고르는 상호배타적 선택지라 radiogroup/radio 시맨틱을 쓴다 */}
              <div className="px-6 py-5">
                <div
                  className="flex gap-3"
                  role="radiogroup"
                  aria-label={`${q.questionText} 응답`}
                >
                  {LIKERT.map((opt) => {
                    const isSelected = selected === opt.value;
                    const isPending = pendingIds.has(q.questionId);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={isPending}
                        onClick={() => setAnswer(q.questionId, opt.value)}
                        className={`flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-[8px] border-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
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
                disabled={!canSubmit || submitMutation.isPending}
                className="h-9 px-6 text-[13px] font-bold text-white rounded-[6px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#7C3AED' }}
              >
                {submitMutation.isPending ? '제출 중...' : '최종 제출'}
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
