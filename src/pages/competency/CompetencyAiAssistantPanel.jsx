import { useState } from 'react';
import { requestCompetencyAiChat } from '@/api/competencyAi';
import { COMP_COLOR } from '@/data/competencyData';
import { formatDate, formatDateTime } from '@/utils/date';
import { Button } from '@/components/common';

const formatDeadline = (iso) => {
  if (!iso) return '마감일 미정';
  return formatDate(iso);
};

const formatRemaining = (value) => (value == null ? '잔여 정원 확인 필요' : `잔여 ${value}명`);

/**
 * 제출 완료된 핵심역량 진단 결과를 설명하고, 기존 추천 프로그램으로 연결하는 AI 패널.
 * 점수와 프로그램 후보는 서버가 확정한 값만 렌더링하며, AI는 설명 문장 생성에만 사용한다.
 *
 * @param {Object} props
 * @param {number} props.attemptId
 * @param {() => void} props.onClose
 * @param {() => void} [props.onOpenRecommendations]
 */
export default function CompetencyAiAssistantPanel({ attemptId, onClose, onOpenRecommendations }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '진단 결과를 바탕으로 어떤 역량을 먼저 보완할지, 어떤 활동을 시작하면 좋을지 함께 정리해 드릴게요. 궁금한 점을 입력해 주세요.',
    },
  ]);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    setMessages((previous) => [...previous, { role: 'user', content: trimmedMessage }]);
    setMessage('');
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await requestCompetencyAiChat({ attemptId, message: trimmedMessage });
      setMessages((previous) => [...previous, { role: 'assistant', content: response.reply }]);
      setAnalysis(response);
    } catch (error) {
      setErrorMessage(
        error?.message ?? 'AI 분석을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const focusCompetencies = analysis?.focusCompetencies ?? [];
  const programs = analysis?.programRecommendations ?? [];
  const nextActions = analysis?.nextActions ?? [];

  return (
    <section className="mb-5 rounded-[10px] border border-[#C4B5FD] bg-[#FAF9FF] p-4 shadow-[0_1px_4px_rgba(124,58,237,0.08)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-[#7C3AED]">핵심역량 · AI 도우미</p>
          <h2 className="mt-1 text-[16px] font-bold text-[#1F2328]">진단 결과 AI 분석</h2>
          <p className="mt-1 text-[12px] text-[#656D76]">
            점수 해석과 보완 행동을 확인하고, 실제 모집 중인 프로그램으로 이어갈 수 있습니다.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onClose}>
          닫기
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[8px] border border-[#E5E7EB] bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-[#1F2328]">결과에 대해 질문하기</h3>
            <span className="text-[11px] text-[#9AA0A6]">응시번호 {attemptId}</span>
          </div>

          <div
            className="flex min-h-[210px] flex-col gap-2 rounded-[8px] bg-[#F8FAFC] p-3"
            aria-live="polite"
          >
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`max-w-[90%] rounded-[8px] px-3 py-2 text-[12px] leading-relaxed ${
                  item.role === 'user'
                    ? 'self-end bg-[#EDE9FE] text-[#4C1D95]'
                    : 'self-start border border-[#E5E7EB] bg-white text-[#444D56]'
                }`}
              >
                {item.content}
              </div>
            ))}
            {isLoading && (
              <div className="self-start rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] text-[#656D76]">
                진단 결과와 추천 프로그램을 확인하고 있습니다...
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="mt-2 text-[12px] text-[#CF222E]" role="alert">
              {errorMessage}
            </p>
          )}

          <form className="mt-3 flex gap-2" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="competency-ai-message">
              핵심역량 AI 질문 입력
            </label>
            <textarea
              id="competency-ai-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="예: 글로벌 역량을 높이려면 이번 달에 무엇부터 해볼까요?"
              rows={2}
              maxLength={3000}
              className="min-w-0 flex-1 resize-none rounded-[8px] border border-[#D0D7DE] px-3 py-2 text-[12px] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#EDE9FE]"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!message.trim() || isLoading}
              loading={isLoading}
              style={{ background: COMP_COLOR }}
            >
              분석하기
            </Button>
          </form>
        </div>

        <aside className="flex flex-col gap-3">
          <section className="rounded-[8px] border border-[#C4B5FD] bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-bold text-[#1F2328]">우선 보완 역량</h3>
              {analysis?.resultSummary && (
                <span className="text-[11px] text-[#7C3AED]">
                  평균 {analysis.resultSummary.overallAverageScore}점
                </span>
              )}
            </div>
            {focusCompetencies.length === 0 ? (
              <p className="mt-2 text-[12px] leading-relaxed text-[#656D76]">
                질문을 보내면 서버가 선정한 보완 역량과 근거를 보여드립니다.
              </p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {focusCompetencies.map((competency) => (
                  <div key={competency.competencyId} className="rounded-[6px] bg-[#F5F3FF] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-[#4C1D95]">
                        {competency.competencyName}
                      </span>
                      <span className="text-[12px] font-black text-[#7C3AED]">
                        {competency.convertedScore}점
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-[#6D28D9]">
                      {competency.judgment}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#656D76]">
                      {competency.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-bold text-[#1F2328]">연계 프로그램</h3>
              <span className="text-[11px] text-[#9AA0A6]">{programs.length}건</span>
            </div>
            {programs.length === 0 ? (
              <p className="mt-2 text-[12px] leading-relaxed text-[#656D76]">
                AI 분석을 실행하면 현재 모집 중인 프로그램을 표시합니다.
              </p>
            ) : (
              <div className="mt-2 flex max-h-[250px] flex-col gap-2 overflow-y-auto">
                {programs.map((program) => (
                  <div
                    key={program.programId}
                    className="rounded-[6px] border border-[#E5E7EB] p-2"
                  >
                    <p className="text-[12px] font-bold leading-snug text-[#1F2328]">
                      {program.programName}
                    </p>
                    <p className="mt-1 text-[11px] text-[#656D76]">
                      {program.competencyName} · {program.programTypeName ?? '비교과 프로그램'}
                    </p>
                    <p className="mt-1 text-[11px] text-[#656D76]">
                      마감 {formatDeadline(program.recruitmentEndsAt)} ·{' '}
                      {formatRemaining(program.remainingCapacity)}
                    </p>
                    {program.myApplicationStatusLabel && (
                      <p className="mt-1 text-[11px] font-semibold text-[#7C3AED]">
                        {program.myApplicationStatusLabel}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {onOpenRecommendations && programs.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                onClick={onOpenRecommendations}
              >
                추천 프로그램 전체 보기
              </Button>
            )}
          </section>

          {nextActions.length > 0 && (
            <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-3">
              <h3 className="text-[13px] font-bold text-[#1F2328]">다음 행동</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-[#656D76]">
                {nextActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ol>
              {analysis?.resultSummary?.submittedAt && (
                <p className="mt-2 text-[10px] text-[#9AA0A6]">
                  최근 진단 {formatDateTime(analysis.resultSummary.submittedAt)}
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}
