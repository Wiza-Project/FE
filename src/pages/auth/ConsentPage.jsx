import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UNIVERSITY_NAME } from '@/data/dummy';
import { Button } from '@/components/common';

const TERMS = [
  {
    id: 'terms',
    required: true,
    title: '이용약관',
    version: 'v2.1 · 2026-03-01 개정',
    content: `제1조 (목적)
이 약관은 한국대학교(이하 "대학")가 운영하는 통합 학생역량관리 시스템(이하 "시스템")의 이용 조건 및 절차, 이용자와 대학의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
① "이용자"란 본 약관에 따라 시스템이 제공하는 서비스를 받는 재학생, 교직원, 기업 회원을 말합니다.
② "비교과 프로그램"이란 교과과정 외에 시스템을 통해 신청·수강할 수 있는 각종 교육·활동 프로그램을 말합니다.
③ "핵심역량"이란 대학이 졸업생에게 요구하는 자기관리·의사소통·글로벌·대인관계·종합적 사고력·자원정보기술활용 6개 역량을 말합니다.

제3조 (서비스 이용)
① 시스템 이용 신청은 회원가입 절차에 따라 학사행정시스템 계정으로 로그인하여 이루어집니다.
② 이용자는 대학의 정보보안 정책을 준수해야 하며, 계정 정보를 타인에게 양도·대여할 수 없습니다.

제4조 (서비스 중단)
대학은 시스템 점검, 보수, 고장 등 부득이한 사유 발생 시 사전 고지 후 서비스를 일시 중단할 수 있습니다.

제5조 (책임 제한)
대학은 천재지변, 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.`,
  },
  {
    id: 'privacy',
    required: true,
    title: '개인정보 수집·이용 동의',
    version: 'v2.1 · 2026-03-01 개정',
    content: `■ 수집 항목
- 필수: 학번/교번, 성명, 학과, 학년, 학적상태, 이메일, 연락처
- 선택: 사진, 취업 희망 분야, 자기소개

■ 수집 목적
1. 비교과 프로그램 신청·수료 관리
2. 핵심역량 진단 결과 분석 및 이력 관리
3. 학생 상담 예약 및 기록 관리
4. 마일리지 적립·사용 내역 관리
5. 취업·창업 지원 서비스 제공
6. 통계 분석 및 학생 지원 정책 수립

■ 보유 기간
- 재학 기간 + 졸업 후 5년 (관계 법령에 따름)
- 단, 상담 기록은 졸업 후 3년 보유

■ 거부권 및 불이익
- 개인정보 수집·이용을 거부하실 수 있습니다.
- 거부 시 시스템의 주요 기능 이용이 제한될 수 있습니다.`,
  },
  {
    id: 'thirdparty',
    required: false,
    title: '개인정보 제3자 제공 동의',
    version: 'v2.1 · 2026-03-01 개정',
    content: `■ 제공 대상 및 목적
- 제공 대상: 채용 공고를 등록한 기업 회원
- 제공 항목: 성명, 학과, 학년, 취업 희망 분야, 자기소개(이용자 동의 항목에 한함)
- 제공 목적: 취업·인턴십 매칭 및 기업 채용 지원
- 보유 기간: 채용 프로세스 완료 후 1년

■ 거부권 및 불이익
- 제3자 제공을 거부하실 수 있습니다.
- 거부 시 기업 채용 매칭 서비스 이용이 제한되나, 그 외 서비스는 정상 이용 가능합니다.`,
  },
];

/**
 * 최초 로그인 시(학생) 노출되는 서비스 이용 동의 화면.
 * 동의 완료 시 localStorage 플래그를 남겨 다음 로그인부터는 건너뜁니다.
 */
export default function ConsentPage() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});
  const [agreed, setAgreed] = useState({});

  const allRequired = TERMS.filter((t) => t.required);
  const allRequiredAgreed = allRequired.every((t) => agreed[t.id]);
  const allAgreed = TERMS.every((t) => agreed[t.id]);

  const toggleAll = (checked) => {
    const next = {};
    TERMS.forEach((t) => {
      next[t.id] = checked;
    });
    setAgreed(next);
  };

  const toggleOne = (id, checked) => {
    setAgreed((prev) => ({ ...prev, [id]: checked }));
  };

  const handleSubmit = () => {
    if (!allRequiredAgreed) return;
    localStorage.setItem('sicms_first_login_done', '1');
    navigate('/my');
  };

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
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
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

          {/* All agree */}
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] px-5 py-4 mb-4 flex items-center gap-3">
            <input
              id="agreeAll"
              type="checkbox"
              checked={allAgreed}
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
              이용약관, 개인정보 수집·이용(필수), 제3자 제공(선택) 모두 포함
            </span>
          </div>

          {/* Term cards */}
          <div className="flex flex-col gap-3 mb-4">
            {TERMS.map((term) => {
              const isOpen = expanded[term.id];
              const isAgreed = agreed[term.id];
              return (
                <div
                  key={term.id}
                  className={`bg-white rounded-[10px] border transition-colors ${isAgreed ? 'border-[#BFDBFE]' : 'border-[#E5E7EB]'} shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden`}
                >
                  {/* Card header */}
                  <div className="px-5 py-4 flex items-center gap-3">
                    {/* Checkbox */}
                    <input
                      id={`agree-${term.id}`}
                      type="checkbox"
                      checked={isAgreed ?? false}
                      onChange={(e) => toggleOne(term.id, e.target.checked)}
                      className="w-4.5 h-4.5 rounded-[3px] accent-[#2563EB] cursor-pointer flex-shrink-0"
                    />
                    <label
                      htmlFor={`agree-${term.id}`}
                      className="flex-1 flex items-center gap-2.5 cursor-pointer select-none"
                    >
                      <span className="text-[14px] font-bold text-[#1F2328]">{term.title}</span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${term.required ? 'bg-[#FEE2E2] text-[#CF222E]' : 'bg-[#F3F4F6] text-[#6E7781]'}`}
                      >
                        {term.required ? '필수' : '선택'}
                      </span>
                    </label>
                    {/* Expand toggle */}
                    <button
                      type="button"
                      onClick={() => setExpanded((p) => ({ ...p, [term.id]: !p[term.id] }))}
                      className="flex items-center gap-1 text-[12px] text-[#2563EB] font-semibold hover:underline ml-2 flex-shrink-0"
                    >
                      {isOpen ? '접기' : '전문보기'}
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="currentColor"
                        className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M2 4l4 4 4-4" />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded content */}
                  {isOpen && (
                    <div className="border-t border-[#F3F4F6]">
                      <div className="mx-5 my-4 max-h-52 overflow-y-auto bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] p-4">
                        <pre className="text-[12px] text-[#656D76] leading-relaxed whitespace-pre-wrap font-[inherit]">
                          {term.content}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Version */}
                  <div className="px-5 pb-3.5 flex items-center justify-between">
                    <span className="text-[11px] text-[#9AA0A6]">동의 버전 {term.version}</span>
                    {isAgreed && (
                      <span className="flex items-center gap-1 text-[11px] text-[#1A7F37] font-semibold">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="#1A7F37"
                          strokeWidth="1.8"
                          strokeLinecap="round"
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
          {!allRequiredAgreed && (
            <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-[6px]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="#D97706"
                className="flex-shrink-0"
              >
                <path d="M8 1L1 14h14L8 1z" />
                <path d="M8 6v4M8 12h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[12px] text-[#92400E] font-semibold">
                필수 항목에 모두 동의해야 진행할 수 있습니다.
              </span>
            </div>
          )}

          {/* CTA */}
          <Button
            size="lg"
            className="w-full justify-center"
            disabled={!allRequiredAgreed}
            onClick={handleSubmit}
          >
            동의하고 시작하기
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
