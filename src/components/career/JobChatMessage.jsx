export default function JobChatMessage({ role, children }) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[min(760px,90%)] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? 'rounded-br-md bg-[#059669] text-white'
            : 'rounded-bl-md border border-[#E5E7EB] bg-white text-[#1F2328]'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
