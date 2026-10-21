import { useState } from 'react';
import { chatJobPostings } from '@/api/jobChat';
import JobChatComposer from '@/components/career/JobChatComposer';
import JobChatMessage from '@/components/career/JobChatMessage';
import JobRecommendationCard from '@/components/career/JobRecommendationCard';

const INITIAL_MESSAGE =
  '원하는 지역, 직무, 고용형태를 자유롭게 말하면 현재 게시 중인 채용공고 3건을 추천해 드립니다.';

export default function JobChatTestPage() {
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', content: INITIAL_MESSAGE }]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (message) => {
    const userMessage = { id: `user-${Date.now()}`, role: 'user', content: message };
    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const result = await chatJobPostings(message);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result?.answer || '추천 결과를 받았습니다.',
          recommendations: result?.recommendations || [],
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: error?.message || '채용공고 추천 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[calc(100vh-160px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] shadow-sm">
      <header className="border-b border-[#E5E7EB] bg-white px-6 py-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#059669]">Test Lab</p>
        <h1 className="text-xl font-bold text-[#1F2328]">AI 채용공고 추천 채팅</h1>
        <p className="mt-1 text-sm text-[#656D76]">
          자연어 조건을 분석해 데이터베이스의 게시 중인 공고를 최대 3건 추천합니다.
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            <JobChatMessage role={message.role}>
              <p className={message.error ? 'text-[#CF222E]' : undefined}>{message.content}</p>
            </JobChatMessage>
            {message.recommendations?.length > 0 && (
              <div className="ml-auto grid max-w-[760px] gap-3">
                {message.recommendations.map((job, index) => (
                  <JobRecommendationCard key={job.jobPostingId ?? `${message.id}-${index}`} job={job} index={index} />
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <JobChatMessage role="assistant">
            <span className="text-[#656D76]">조건을 분석하고 공고를 찾고 있습니다…</span>
          </JobChatMessage>
        )}
      </div>

      <JobChatComposer onSubmit={handleSubmit} disabled={loading} />
    </section>
  );
}
