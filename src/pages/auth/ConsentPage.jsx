import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UNIVERSITY_NAME } from '@/data/dummy';
import { Button } from '@/components/common';
import { ApiError } from '@/api/client';
import { agreeToConsentPolicy, fetchConsentPolicies, fetchMyConsents } from '@/api/consent';
import { CONSENT_MODULE_CODE } from '@/constants/domain';
import { useAuthStore } from '@/stores/authStore';
import { hasCompletedCommonConsent, resolvePostAuthPath } from '@/routes/redirects';

const POLICIES_QUERY_KEY = ['consentPolicies', CONSENT_MODULE_CODE.COMMON];
const MY_CONSENTS_QUERY_KEY = ['myConsents'];

/**
 * 최초 로그인 시 노출되는 공통(COMMON) 서비스 이용 동의 화면.
 */
export default function ConsentPage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const markCommonConsentCompleted = useAuthStore((s) => s.markCommonConsentCompleted);

  const [expandedId, setExpandedId] = useState(null);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [saveError, setSaveError] = useState('');

  const policiesQuery = useQuery({
    queryKey: POLICIES_QUERY_KEY,
    queryFn: () => fetchConsentPolicies(CONSENT_MODULE_CODE.COMMON),
  });
  const myConsentsQuery = useQuery({
    queryKey: MY_CONSENTS_QUERY_KEY,
    queryFn: fetchMyConsents,
  });

  const policies = useMemo(() => policiesQuery.data ?? [], [policiesQuery.data]);

  // 철회되지 않은 동의만 유효한 이력으로 본다(api/consent.js 가 withdrawnAt 을 null 로 정규화).
  const agreedPolicyIds = useMemo(
    () =>
      new Set(
        (myConsentsQuery.data ?? [])
          .filter((consent) => consent.withdrawnAt == null)
          .map((consent) => consent.consentPolicyId),
      ),
    [myConsentsQuery.data],
  );

  const isAlreadyAgreed = (consentPolicyId) => agreedPolicyIds.has(consentPolicyId);
  // 이미 동의한 항목은 항상 체크 상태로 보여주고 해제할 수 없습니다(철회는 마이페이지 담당).
  const isChecked = (consentPolicyId) =>
    isAlreadyAgreed(consentPolicyId) || checkedIds.has(consentPolicyId);

  const requiredPolicies = useMemo(() => policies.filter((p) => p.required), [policies]);
  const allRequiredChecked = requiredPolicies.every((p) => isChecked(p.consentPolicyId));
  const allChecked = policies.length > 0 && policies.every((p) => isChecked(p.consentPolicyId));

  const isLoading = policiesQuery.isPending || myConsentsQuery.isPending;
  const isError = policiesQuery.isError || myConsentsQuery.isError;
  // 목록을 못 불러온 상태에서는 requiredPolicies 가 빈 배열이라 allRequiredChecked 가
  // 무조건 true 가 됩니다 — CTA 활성화 판정에 로딩/에러를 함께 반영해야 합니다.
  const canSubmit = allRequiredChecked && !isLoading && !isError;

  const toggleAll = (checked) => {
    setSaveError('');
    setCheckedIds(checked ? new Set(policies.map((p) => p.consentPolicyId)) : new Set());
  };

  const toggleOne = (consentPolicyId, checked) => {
    setSaveError('');
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(consentPolicyId);
      else next.delete(consentPolicyId);
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 체크한 항목(선택 포함) 중 아직 유효한 동의 이력이 없는 것만 저장합니다.
      // 동의 API 는 멱등이지만 불필요한 호출은 줄입니다.
      const pending = policies.filter(
        (p) => isChecked(p.consentPolicyId) && !isAlreadyAgreed(p.consentPolicyId),
      );
      for (const policy of pending) {
        await agreeToConsentPolicy(policy.consentPolicyId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_CONSENTS_QUERY_KEY });
      // 저장이 전부 성공한 뒤에만 완료로 표시합니다. 스토어가 바뀌면 아래 가드가
      // 원래 목적지(또는 역할별 기본 화면)로 replace 이동시킵니다.
      markCommonConsentCompleted();
    },
    onError: (e) => {
      setSaveError(
        e instanceof ApiError
          ? e.message
          : '동의 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
      );
    },
  });

  const handleSubmit = () => {
    if (!canSubmit || saveMutation.isPending) return;
    setSaveError('');
    saveMutation.mutate();
  };

  const retryLoad = () => {
    setSaveError('');
    if (policiesQuery.isError) policiesQuery.refetch();
    if (myConsentsQuery.isError) myConsentsQuery.refetch();
  };

  // 이미 공통 필수 약관 동의를 마친 사용자에게는 이 화면을 보여주지 않습니다.
  // 동의 저장 성공 직후에도 이 가드가 다음 화면으로의 replace 이동을 담당합니다.
  if (hasCompletedCommonConsent(user)) {
    return <Navigate to={resolvePostAuthPath(location.state?.from, user)} replace />;
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col">
      {/* Top strip */}
      <div
        className="h-1 w-full"
        style={{
          background: 'linear-gradient(90deg,#2563EB 0%,#7C3AED 33%,#0891B2 55%,#059669 100%)',
        }}
      />

      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] px-8 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-[#2563EB] flex items-center justify-center text-white font-black text-[15px]">
            한
          </div>
          <div>
            <div className="text-[14px] font-bold text-[#1F2328]">{UNIVERSITY_NAME}</div>
            <div className="text-[11px] text-[#656D76]">통합 학생역량관리 시스템</div>
          </div>
        </div>
        <div className="text-[12px] text-[#9AA0A6]">최초 로그인 · 서비스 이용 동의</div>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-[680px]">
          {/* Page title */}
          <div className="mb-7 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#EFF6FF] mb-3">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M11 2a9 9 0 100 18A9 9 0 0011 2z" fill="#DBEAFE" />
                <path d="M11 7v4l3 3" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="11" cy="11" r="9" stroke="#2563EB" strokeWidth="1.5" />
              </svg>
            </div>
            <h1 className="text-[24px] font-bold text-[#1F2328]">서비스 이용 동의</h1>
            <p className="text-[13px] text-[#656D76] mt-1.5">
              {UNIVERSITY_NAME} 통합 학생역량관리 시스템 이용을 위한 동의가 필요합니다.
            </p>
          </div>

          {isLoading && (
            <div
              className="bg-white rounded-[10px] border border-[#E5E7EB] px-5 py-12 flex flex-col items-center gap-3"
              role="status"
            >
              <span className="w-7 h-7 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              <span className="text-[13px] text-[#656D76]">약관을 불러오는 중입니다…</span>
            </div>
          )}

          {!isLoading && isError && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] px-5 py-10 flex flex-col items-center gap-3">
              <p className="text-[13px] text-[#656D76] text-center">
                약관 정보를 불러오지 못했습니다.
                <br />
                잠시 후 다시 시도해주세요.
              </p>
              <Button variant="outline" size="md" onClick={retryLoad}>
                다시 시도
              </Button>
            </div>
          )}

          {!isLoading && !isError && policies.length === 0 && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] px-5 py-10 text-center">
              <p className="text-[13px] text-[#656D76]">
                현재 동의가 필요한 약관이 없습니다. 아래 버튼을 눌러 계속 진행해주세요.
              </p>
            </div>
          )}

          {!isLoading && !isError && policies.length > 0 && (
            <>
              {/* All agree */}
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] px-5 py-4 mb-4 flex items-center gap-3">
                <input
                  id="agreeAll"
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="w-5 h-5 rounded-[4px] accent-[#2563EB] cursor-pointer"
                />
                <label
                  htmlFor="agreeAll"
                  className="text-[15px] font-bold text-[#1E3A8A] cursor-pointer select-none"
                >
                  전체 동의
                </label>
                <span className="text-[12px] text-[#3B82F6] ml-1">
                  필수 항목과 선택 항목을 모두 포함합니다.
                </span>
              </div>

              {/* Policy cards */}
              <div className="flex flex-col gap-3 mb-4">
                {policies.map((policy) => {
                  const isOpen = expandedId === policy.consentPolicyId;
                  const checked = isChecked(policy.consentPolicyId);
                  const locked = isAlreadyAgreed(policy.consentPolicyId);
                  return (
                    <div
                      key={policy.consentPolicyId}
                      className={`bg-white rounded-[10px] border transition-colors ${checked ? 'border-[#BFDBFE]' : 'border-[#E5E7EB]'} shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden`}
                    >
                      {/* Card header */}
                      <div className="px-5 py-4 flex items-center gap-3">
                        <input
                          id={`agree-${policy.consentPolicyId}`}
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={(e) => toggleOne(policy.consentPolicyId, e.target.checked)}
                          className="w-4.5 h-4.5 rounded-[3px] accent-[#2563EB] cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
                        />
                        <label
                          htmlFor={`agree-${policy.consentPolicyId}`}
                          className="flex-1 flex items-center gap-2.5 cursor-pointer select-none"
                        >
                          <span className="text-[14px] font-bold text-[#1F2328]">
                            {policy.title}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${policy.required ? 'bg-[#FEE2E2] text-[#CF222E]' : 'bg-[#F3F4F6] text-[#6E7781]'}`}
                          >
                            {policy.required ? '필수' : '선택'}
                          </span>
                        </label>
                        {/* Expand toggle */}
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={`terms-${policy.consentPolicyId}`}
                          onClick={() =>
                            setExpandedId((prev) =>
                              prev === policy.consentPolicyId ? null : policy.consentPolicyId,
                            )
                          }
                          className="flex items-center gap-1 text-[12px] text-[#2563EB] font-semibold hover:underline ml-2 flex-shrink-0"
                        >
                          {isOpen ? '접기' : '전문보기'}
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="currentColor"
                            aria-hidden="true"
                            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          >
                            <path d="M2 4l4 4 4-4" />
                          </svg>
                        </button>
                      </div>

                      {/* Expanded content — 서버 본문은 신뢰하지 않고 plain text 로만 렌더링합니다. */}
                      {isOpen && (
                        <div id={`terms-${policy.consentPolicyId}`} className="border-t border-[#F3F4F6]">
                          <div className="mx-5 my-4 max-h-52 overflow-y-auto bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] p-4">
                            <pre className="text-[12px] text-[#656D76] leading-relaxed whitespace-pre-wrap font-[inherit]">
                              {policy.content}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Version */}
                      <div className="px-5 pb-3.5 flex items-center justify-between">
                        <span className="text-[11px] text-[#9AA0A6]">
                          동의 버전 {policy.version}
                        </span>
                        {locked && (
                          <span className="flex items-center gap-1 text-[11px] text-[#1A7F37] font-semibold">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="#1A7F37"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              aria-hidden="true"
                            >
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                            동의 완료
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Required warning */}
              {!allRequiredChecked && (
                <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-[6px]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="#D97706"
                    aria-hidden="true"
                    className="flex-shrink-0"
                  >
                    <path d="M8 1L1 14h14L8 1z" />
                    <path
                      d="M8 6v4M8 12h.01"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-[12px] text-[#92400E] font-semibold">
                    필수 항목에 모두 동의해야 진행할 수 있습니다.
                  </span>
                </div>
              )}
            </>
          )}

          {/* Save error — 저장에 실패하면 다음 화면으로 넘어가지 않고 재시도할 수 있게 남겨둡니다. */}
          {saveError && (
            <div
              role="alert"
              className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-3.5 py-3 mb-4 flex gap-2.5"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="#CF222E"
                aria-hidden="true"
                className="flex-shrink-0 mt-0.5"
              >
                <circle cx="8" cy="8" r="7" />
                <path d="M8 4v4M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-[12px] text-[#CF222E] whitespace-pre-line leading-relaxed">
                {saveError}
              </p>
            </div>
          )}

          {/* CTA */}
          <Button
            size="lg"
            className="w-full justify-center"
            disabled={!canSubmit || saveMutation.isPending}
            onClick={handleSubmit}
          >
            {saveMutation.isPending ? '저장 중…' : '동의하고 시작하기'}
          </Button>

          {/* Footer note */}
          <p className="text-center text-[12px] text-[#9AA0A6] mt-5 leading-relaxed">
            동의 철회는{' '}
            <span className="text-[#656D76] font-semibold">마이페이지 &gt; 내 정보</span>에서
            가능합니다.
            <br />
            문의: 학생처 개인정보보호 담당 (privacy@korea.ac.kr)
          </p>
        </div>
      </div>
    </div>
  );
}
