import { useState } from 'react';
import { PageHeader, Button, ProgressBar, toast } from '@/components/common';
import { completeSurvey } from '@/api/programApplications';

const ACCENT = '#2563EB';

const SURVEY_QUESTIONS = [
  { id: 1, text: '프로그램 전반적인 만족도는 어떠셨나요?' },
  { id: 2, text: '강사(또는 담당자)의 전문성과 진행 방식이 적절하였나요?' },
  { id: 3, text: '프로그램 일정 및 장소 운영이 만족스러우셨나요?' },
  { id: 4, text: '이 프로그램이 역량 향상에 도움이 되었나요?' },
  { id: 5, text: '이 프로그램을 동료 학생들에게 추천하시겠나요?' },
];

const LIKERT = [
  { value: 1, label: '매우\n불만족' },
  { value: 2, label: '불만족' },
  { value: 3, label: '보통' },
  { value: 4, label: '만족' },
  { value: 5, label: '매우\n만족' },
];

/**
 * 문항별 응답을 저장하는 백엔드 API는 없고, 설문 완료 여부(surveyCompleted) 플래그만 서버에
 * 반영된다. 아래 문항/리커트 UI는 그대로 유지하되, 제출 시 실제로 서버에 전송되는 것은
 * "완료" 신호뿐이며 개별 답변 내용은 저장되지 않는다.
 *
 * @param {Object} props
 * @param {number} props.programId
 * @param {number} props.applicationId
 * @param {() => void} props.onBack
 */
export default function Survey({ programId, applicationId, onBack }) {
  const [view, setView] = useState('survey');
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / SURVEY_QUESTIONS.length) * 100);
  const allAnswered = answered === SURVEY_QUESTIONS.length;

  const handleSubmit = async () => {
    if (!allAnswered) {
      toast('모든 문항에 응답해주세요.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await completeSurvey(programId, applicationId);
      setSubmitted(true);
      toast('설문이 제출되었습니다. 수료증을 발급받으실 수 있습니다.', 'success');
      setTimeout(() => setView('cert'), 600);
    } catch (err) {
      toast(err.message ?? '설문 제출에 실패했습니다.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: '비교과 프로그램' },
          { label: '내 신청 내역', onClick: onBack },
          { label: '만족도 설문 · 수료증' },
        ]}
        title="만족도 설문 · 수료증 발급"
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 내역으로
          </Button>
        }
      />

      {/* Tab toggle */}
      <div className="flex bg-[#F3F4F6] rounded-[8px] p-1 mb-5 w-fit">
        {['survey', 'cert'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`h-8 px-5 text-[13px] font-semibold rounded-[6px] transition-colors ${view === v ? 'bg-white text-[#1F2328] shadow-sm' : 'text-[#656D76] hover:text-[#1F2328]'}`}
          >
            {v === 'survey' ? '만족도 설문' : '수료증 발급'}
          </button>
        ))}
      </div>

      {/* ── SURVEY VIEW ── */}
      {view === 'survey' && (
        <div className="max-w-[760px]">
          {submitted ? (
            <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-10 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  stroke="#1A7F37"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M5 14l6 6L23 8" />
                </svg>
              </div>
              <h2 className="text-[18px] font-bold text-[#1F2328]">설문이 제출되었습니다!</h2>
              <p className="text-[13px] text-[#656D76] text-center leading-relaxed">
                참여해 주셔서 감사합니다. 수료증 발급 탭으로 이동하시면 수료증을 다운로드하실 수
                있습니다.
              </p>
              <Button size="md" style={{ background: ACCENT }} onClick={() => setView('cert')}>
                수료증 발급 →
              </Button>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between text-[12px] mb-2">
                  <span className="font-semibold text-[#1F2328]">
                    해외문화체험 워크숍 만족도 조사
                  </span>
                  <span className="text-[#9AA0A6]">
                    {answered}/{SURVEY_QUESTIONS.length} 문항 완료
                  </span>
                </div>
                <ProgressBar value={progress} color={ACCENT} showValue />
              </div>

              {/* Questions */}
              <div className="flex flex-col gap-4">
                {SURVEY_QUESTIONS.map((q) => {
                  const selected = answers[q.id];
                  return (
                    <div
                      key={q.id}
                      className={`bg-white rounded-[8px] border shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden ${selected ? 'border-[#BFDBFE]' : 'border-[#E5E7EB]'}`}
                    >
                      <div
                        className={`px-5 py-3 border-b ${selected ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-[#F3F4F6] bg-[#F9FAFB]'}`}
                      >
                        <span
                          className={`text-[11px] font-black mr-2 ${selected ? 'text-[#2563EB]' : 'text-[#9AA0A6]'}`}
                        >
                          Q{q.id}
                        </span>
                        <span className="text-[13px] font-semibold text-[#1F2328]">{q.text}</span>
                      </div>
                      <div className="px-5 py-5">
                        <div className="flex items-stretch gap-2">
                          {LIKERT.map((l) => {
                            const isSelected = selected === l.value;
                            return (
                              <button
                                key={l.value}
                                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: l.value }))}
                                className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-[8px] border-2 transition-all ${isSelected ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E5E7EB] bg-white hover:border-[#93C5FD] hover:bg-[#F0F9FF]'}`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[13px] font-black transition-colors ${isSelected ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-[#D1D5DB] text-[#9AA0A6]'}`}
                                >
                                  {l.value}
                                </div>
                                <span
                                  className={`text-[10px] font-semibold text-center whitespace-pre-line leading-tight ${isSelected ? 'text-[#2563EB]' : 'text-[#9AA0A6]'}`}
                                >
                                  {l.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Feedback */}
                <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                    <span className="text-[13px] font-semibold text-[#1F2328]">
                      자유 의견{' '}
                      <span className="text-[#9AA0A6] font-normal text-[12px]">(선택)</span>
                    </span>
                  </div>
                  <div className="px-5 py-4">
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="프로그램에 대한 개선 의견이나 건의사항을 자유롭게 작성해 주세요."
                      rows={4}
                      className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#2563EB] placeholder:text-[#9AA0A6]"
                    />
                    <div className="text-right text-[11px] text-[#9AA0A6] mt-1">
                      {feedback.length}자
                    </div>
                  </div>
                </div>

                {/* Submit */}
                {!allAnswered && (
                  <div className="bg-[#FFF7ED] border border-[#FDE68A] rounded-[6px] px-4 py-3 text-[12px] text-[#92400E]">
                    {SURVEY_QUESTIONS.length - answered}개 문항에 아직 응답하지 않았습니다. 모두
                    완료해야 제출됩니다.
                  </div>
                )}
                <Button
                  size="lg"
                  className="w-full justify-center"
                  loading={submitting}
                  style={{ background: allAnswered ? ACCENT : undefined }}
                  disabled={!allAnswered}
                  onClick={handleSubmit}
                >
                  설문 제출
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CERT VIEW ── */}
      {view === 'cert' && (
        <div className="max-w-[760px]">
          {!submitted && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] p-5 mb-5 flex items-start gap-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#CF222E">
                <circle cx="8" cy="8" r="7" />
                <path d="M8 4v5M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div>
                <p className="text-[13px] font-semibold text-[#7F1D1D] mb-1">
                  설문 미완료 — 수료증 발급 불가
                </p>
                <p className="text-[12px] text-[#CF222E]">
                  만족도 설문을 먼저 제출하면 수료증이 자동으로 발급됩니다.
                </p>
                <button
                  className="text-[12px] font-bold text-[#2563EB] underline mt-2"
                  onClick={() => setView('survey')}
                >
                  설문 작성하러 가기 →
                </button>
              </div>
            </div>
          )}

          {/* A4 Certificate Preview */}
          <div
            className={`relative ${!submitted ? 'opacity-40 pointer-events-none select-none' : ''}`}
          >
            <div
              className="bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden"
              style={{ aspectRatio: '1 / 1.414', maxWidth: 540, margin: '0 auto' }}
            >
              {/* Certificate content */}
              <div className="h-full flex flex-col items-center justify-center p-10 text-center relative">
                {/* Border decoration */}
                <div className="absolute inset-4 border-2 border-[#BFDBFE] rounded-[8px] pointer-events-none" />
                <div className="absolute inset-5 border border-[#93C5FD] rounded-[6px] pointer-events-none opacity-40" />

                {/* Top badge */}
                <div className="mb-6">
                  <div className="w-16 h-16 rounded-full bg-[#EFF6FF] border-2 border-[#2563EB] flex items-center justify-center mx-auto mb-3">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <path
                        d="M14 3L3 9v10l11 6 11-6V9L14 3z"
                        stroke="#2563EB"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 3v22M3 9l11 6 11-6"
                        stroke="#2563EB"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="text-[11px] font-black text-[#2563EB] tracking-[0.2em] uppercase">
                    Certificate of Completion
                  </div>
                </div>

                <h1 className="text-[22px] font-black text-[#1E3A8A] mb-1">수 료 증</h1>
                <div className="w-24 h-[2px] bg-[#2563EB] mb-6" />

                <p className="text-[13px] text-[#656D76] mb-1">학번</p>
                <p className="text-[20px] font-black text-[#1F2328] mb-4">20231234 홍길동</p>

                <p className="text-[12px] text-[#9AA0A6] mb-1">위 학생은 아래 프로그램을</p>
                <p className="text-[12px] text-[#9AA0A6] mb-6">성실히 수료하였음을 증명합니다.</p>

                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-8 py-4 mb-6 w-full max-w-[320px]">
                  <p className="text-[15px] font-bold text-[#1F2328] mb-1">해외문화체험 워크숍</p>
                  <p className="text-[12px] text-[#656D76]">2026-08-12 ~ 2026-08-26 · 5회차</p>
                  <p className="text-[12px] text-[#656D76]">국제교류처 주관</p>
                  <div className="flex gap-2 justify-center mt-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#0969DA]">
                      글로벌
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#7C3AED]">
                      의사소통
                    </span>
                  </div>
                </div>

                <p className="text-[12px] text-[#656D76] mb-1">발급일: 2026-08-13</p>
                <p className="text-[14px] font-black text-[#1F2328]">한국대학교 총장</p>

                {/* Serial number */}
                <div className="absolute bottom-8 text-[9px] text-[#C8D0D9] tracking-widest">
                  CERT-2026-EXTRACURR-P016-20231234
                </div>
              </div>
            </div>
          </div>

          {/* Download / print buttons */}
          <div
            className={`flex gap-3 justify-center mt-5 ${!submitted ? 'opacity-40 pointer-events-none' : ''}`}
          >
            <Button
              size="md"
              variant="outline"
              icon={
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 12h12v2H2v-2zm5-4.59L4.41 5 3 6.41 8 11.41l5-5L11.59 5 9 7.59V0H7v7.41z" />
                </svg>
              }
              onClick={() => toast('수료증 PDF를 다운로드합니다.', 'info')}
            >
              PDF 다운로드
            </Button>
            <Button
              size="md"
              style={{ background: ACCENT }}
              icon={
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1 3h14v10H1V3zm1 1v8h12V4H2zm2 2h8v1H4V6zm0 2h5v1H4V8z" />
                </svg>
              }
              onClick={() => toast('인쇄 창을 엽니다.', 'info')}
            >
              인쇄
            </Button>
          </div>

          {submitted && (
            <p className="text-center text-[11px] text-[#9AA0A6] mt-3">
              수료증은 마이페이지 → 증명서 발급에서도 재발급 가능합니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
