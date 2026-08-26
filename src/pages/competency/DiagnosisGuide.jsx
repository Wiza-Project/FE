import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchAssessmentIntro, startAssessmentAttempt } from '@/api/competency';
import { fetchConsentPolicies, agreeToConsentPolicy } from '@/api/consent';
import { ApiError } from '@/api/client';
import { CONSENT_MODULE_CODE, ASSESSMENT_ATTEMPT_STATUS } from '@/constants/domain';
import { formatDate } from '@/utils/date';
import { Button, EmptyState, SkeletonLoader, toast } from '@/components/common';

/**
 * @param {Object} props
 * @param {number} props.roundId
 * @param {(attemptId: number) => void} props.onStart
 * @param {(attemptId: number) => void} props.onViewResult
 */
export default function DiagnosisGuide({ roundId, onStart, onViewResult }) {
  const [expandedId, setExpandedId] = useState(null);
  const [agreedIds, setAgreedIds] = useState(() => new Set());

  const introQuery = useQuery({
    queryKey: ['assessmentIntro', roundId],
    queryFn: () => fetchAssessmentIntro(roundId),
    enabled: !!roundId,
  });

  const intro = introQuery.data;
  const alreadyStarted = intro?.attemptId != null;
  const isDone =
    intro?.attemptStatus === ASSESSMENT_ATTEMPT_STATUS.SUBMITTED ||
    intro?.attemptStatus === ASSESSMENT_ATTEMPT_STATUS.SCORED;

  // 이미 응시를 시작한 학생은 동의를 다시 확인할 필요가 없다(응시 시작 시점에 이미 게이트를 통과했다).
  const policiesQuery = useQuery({
    queryKey: ['consentPolicies', CONSENT_MODULE_CODE.ASSESSMENT],
    queryFn: () => fetchConsentPolicies(CONSENT_MODULE_CODE.ASSESSMENT),
    enabled: !!intro && !alreadyStarted,
  });

  const policies = useMemo(() => policiesQuery.data ?? [], [policiesQuery.data]);
  const requiredPolicies = useMemo(() => policies.filter((p) => p.required), [policies]);
  const allRequiredAgreed = requiredPolicies.every((p) => agreedIds.has(p.consentPolicyId));
  const allAgreed = policies.length > 0 && policies.every((p) => agreedIds.has(p.consentPolicyId));

  const toggleAll = (checked) => {
    setAgreedIds(checked ? new Set(policies.map((p) => p.consentPolicyId)) : new Set());
  };

  const toggleOne = (consentPolicyId, checked) => {
    setAgreedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(consentPolicyId);
      else next.delete(consentPolicyId);
      return next;
    });
  };

  const startMutation = useMutation({
    mutationFn: async () => {
      // 체크한 항목(선택 포함)을 모두 서버에 기록한다 — 이미 유효 동의가 있으면 멱등이라 재호출해도 안전하다.
      const checkedPolicies = policies.filter((p) => agreedIds.has(p.consentPolicyId));
      for (const policy of checkedPolicies) {
        await agreeToConsentPolicy(policy.consentPolicyId);
      }
      return startAssessmentAttempt(roundId);
    },
    onSuccess: (res) => onStart(res.attemptId),
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'Q003') {
        toast('진단 응시기간이 아닙니다.', 'error');
      } else {
        toast(e instanceof ApiError ? e.message : '진단 시작에 실패했습니다.', 'error');
      }
    },
  });

  const continueMutation = useMutation({
    mutationFn: () => startAssessmentAttempt(roundId),
    onSuccess: (res) => onStart(res.attemptId),
    onError: (e) => {
      toast(e instanceof ApiError ? e.message : '진단 이어하기에 실패했습니다.', 'error');
    },
  });

  if (!roundId) {
    return <EmptyState message="진단 회차 정보를 찾을 수 없습니다." />;
  }

  if (introQuery.isPending) {
    return (
      <div className="px-6 py-6">
        <SkeletonLoader rows={3} cols={2} />
      </div>
    );
  }

  if (introQuery.isError) {
    return (
      <EmptyState
        message={
          introQuery.error instanceof ApiError
            ? introQuery.error.message
            : '진단 안내 정보를 불러오지 못했습니다.'
        }
        sub="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="outline" size="md" onClick={() => introQuery.refetch()}>
            다시 시도
          </Button>
        }
      />
    );
  }

  if (isDone) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-full max-w-[640px] bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-1 bg-[#7C3AED]" />
          <div className="px-8 py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1A7F37"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-[20px] font-bold text-[#1F2328] mb-2">이미 응시를 완료했습니다.</h2>
            <p className="text-[13px] text-[#656D76] mb-6">{intro.assessmentName}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="md" onClick={() => onViewResult(intro.attemptId)}>
                결과 보기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const GUIDE_INFO = [
    { label: '응시기간', value: `${formatDate(intro.startsAt)} ~ ${formatDate(intro.endsAt)}` },
    { label: '문항 수', value: `${intro.questionCount}문항` },
    { label: '소요시간', value: `약 ${intro.estimatedMinutes}분` },
    { label: '응답 척도', value: '5점 리커트 척도' },
  ];

  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-[680px]">
        <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-1 bg-[#7C3AED]" />

          <div className="px-8 pt-7 pb-2">
            <h1 className="text-[22px] font-bold text-[#1F2328]">{intro.assessmentName}</h1>
            <p className="text-[13px] text-[#656D76] mt-1">총 {intro.questionCount}문항을 응답합니다.</p>
          </div>

          {/* Info grid */}
          <div className="px-8 py-5">
            <div className="grid grid-cols-2 gap-0 border border-[#E5E7EB] rounded-[8px] overflow-hidden text-[13px]">
              {GUIDE_INFO.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex gap-0 ${i < GUIDE_INFO.length - 1 ? 'border-b border-[#E5E7EB]' : ''} ${i % 2 === 0 && i < GUIDE_INFO.length - 1 ? 'border-r border-[#E5E7EB]' : ''}`}
                >
                  <div className="w-28 flex-shrink-0 px-4 py-3 bg-[#F6F8FA] font-semibold text-[#656D76]">
                    {item.label}
                  </div>
                  <div className="flex-1 px-4 py-3 text-[#1F2328]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notice box */}
          <div className="px-8 pb-5">
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="#656D76">
                  <circle cx="8" cy="8" r="7" />
                  <path d="M8 4v5M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-[12px] font-bold text-[#656D76] uppercase tracking-wide">유의사항</span>
              </div>
              <ul className="text-[13px] text-[#656D76] space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-[#9AA0A6] flex-shrink-0 mt-0.5">·</span>중간에 저장하고
                  나중에 이어서 응시할 수 있습니다.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#9AA0A6] flex-shrink-0 mt-0.5">·</span>제출 후에는 응답을
                  수정할 수 없습니다.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#9AA0A6] flex-shrink-0 mt-0.5">·</span>솔직하고 신중하게
                  응답해 주세요. 정답은 없습니다.
                </li>
              </ul>
            </div>
          </div>

          {alreadyStarted ? (
            <div className="px-8 pb-8">
              <div className="bg-[#FFF7ED] border border-[#FDE68A] rounded-[8px] px-5 py-4 mb-4 text-[13px] text-[#92400E]">
                이미 응시를 시작한 진단입니다. 이어서 응시할 수 있습니다.
              </div>
              <Button
                size="lg"
                className="w-full justify-center"
                style={{ background: '#7C3AED' }}
                loading={continueMutation.isPending}
                onClick={() => continueMutation.mutate()}
              >
                이어서 응시하기
              </Button>
            </div>
          ) : (
            <>
              {/* Consent section */}
              <div className="px-8 pb-6">
                <div className="text-[12px] font-semibold text-[#656D76] uppercase tracking-wide mb-3">
                  응시 전 동의
                </div>

                {policiesQuery.isPending && <SkeletonLoader rows={2} cols={1} />}

                {policiesQuery.isError && (
                  <EmptyState
                    message={
                      policiesQuery.error instanceof ApiError
                        ? policiesQuery.error.message
                        : '동의 항목을 불러오지 못했습니다.'
                    }
                    action={
                      <Button variant="outline" size="sm" onClick={() => policiesQuery.refetch()}>
                        다시 시도
                      </Button>
                    }
                  />
                )}

                {!policiesQuery.isPending && !policiesQuery.isError && policies.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    {policies.length > 1 && (
                      <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-[8px] px-4 py-3 flex items-center gap-3">
                        <input
                          id="agreeAll"
                          type="checkbox"
                          checked={allAgreed}
                          onChange={(e) => toggleAll(e.target.checked)}
                          className="w-4 h-4 rounded-[3px] accent-[#7C3AED] cursor-pointer"
                        />
                        <label
                          htmlFor="agreeAll"
                          className="text-[13px] font-bold text-[#5B21B6] cursor-pointer select-none"
                        >
                          전체 동의
                        </label>
                      </div>
                    )}

                    {policies.map((policy) => {
                      const isOpen = expandedId === policy.consentPolicyId;
                      const isAgreed = agreedIds.has(policy.consentPolicyId);
                      return (
                        <div
                          key={policy.consentPolicyId}
                          className={`rounded-[8px] border transition-colors overflow-hidden ${isAgreed ? 'border-[#7C3AED]' : 'border-[#E5E7EB]'}`}
                        >
                          <div className="px-5 py-4 flex items-start gap-3">
                            <input
                              id={`agree-${policy.consentPolicyId}`}
                              type="checkbox"
                              checked={isAgreed}
                              onChange={(e) => toggleOne(policy.consentPolicyId, e.target.checked)}
                              className="w-4 h-4 mt-0.5 rounded-[3px] accent-[#7C3AED] cursor-pointer flex-shrink-0"
                            />
                            <label
                              htmlFor={`agree-${policy.consentPolicyId}`}
                              className="flex-1 cursor-pointer select-none"
                            >
                              <span className="text-[13px] font-bold text-[#1F2328]">{policy.title}</span>
                              <span
                                className={`ml-2 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${policy.required ? 'bg-[#FEE2E2] text-[#CF222E]' : 'bg-[#F3F4F6] text-[#6E7781]'}`}
                              >
                                {policy.required ? '필수' : '선택'}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId((p) => (p === policy.consentPolicyId ? null : policy.consentPolicyId))
                              }
                              className="text-[12px] text-[#7C3AED] font-semibold hover:underline flex-shrink-0"
                            >
                              {isOpen ? '접기' : '상세보기'}
                            </button>
                          </div>
                          {isOpen && (
                            <div className="border-t border-[#E5E7EB] px-5 py-4 bg-[#FAFAFA]">
                              <pre className="text-[12px] text-[#656D76] leading-relaxed whitespace-pre-wrap font-[inherit] max-h-52 overflow-y-auto">
                                {policy.content}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="px-8 pb-8">
                <Button
                  size="lg"
                  className="w-full justify-center"
                  disabled={!allRequiredAgreed || policiesQuery.isPending || policiesQuery.isError}
                  loading={startMutation.isPending}
                  style={{ background: allRequiredAgreed ? '#7C3AED' : undefined }}
                  onClick={() => startMutation.mutate()}
                >
                  진단 시작하기
                </Button>
                {!allRequiredAgreed && (
                  <p className="text-center text-[12px] text-[#9AA0A6] mt-2">
                    필수 항목에 모두 동의해야 시작할 수 있습니다.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
