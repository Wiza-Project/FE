import { useState } from 'react';

const EXAMPLES = [
  '서울에서 Java와 Spring을 사용하는 백엔드 신입 정규직을 추천해줘',
  '경기 지역 데이터 분석 또는 AI 관련 인턴 공고를 찾아줘',
  '지역은 상관없고 마케팅 기획 직무를 추천해줘',
];

export default function JobChatComposer({ onSubmit, disabled }) {
  const [message, setMessage] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setMessage('');
  };

  return (
    <div className="border-t border-[#E5E7EB] bg-white p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            disabled={disabled}
            onClick={() => setMessage(example)}
            className="rounded-full border border-[#D1D5DB] px-3 py-1.5 text-xs text-[#4B5563] transition-colors hover:border-[#059669] hover:text-[#047857] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="job-chat-message" className="sr-only">
          채용공고 추천 요청
        </label>
        <input
          id="job-chat-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={disabled}
          placeholder="원하는 직무, 지역, 고용형태를 자연어로 입력해 주세요"
          className="min-w-0 flex-1 rounded-lg border border-[#D1D5DB] px-4 py-3 text-sm outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-[#A7F3D0] disabled:bg-[#F3F4F6]"
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="rounded-lg bg-[#059669] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
        >
          {disabled ? '검색 중' : '추천받기'}
        </button>
      </form>
    </div>
  );
}
