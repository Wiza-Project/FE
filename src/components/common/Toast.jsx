import { useState, useEffect } from 'react';

const TOAST_ICONS = { success: '✓', error: '✕', warning: '!', info: 'i' };
const TOAST_COLORS = {
  success: 'bg-[#1A7F37]',
  error: 'bg-[#CF222E]',
  warning: 'bg-[#D97706]',
  info: 'bg-[#0969DA]',
};

let toastCounter = 0;
let toastCallback = null;

/**
 * 어디서든 호출 가능한 전역 토스트. `<ToastProvider />`가 트리에 한 번 마운트돼 있어야 동작합니다
 * (현재 src/main.jsx 에 마운트되어 있습니다).
 *
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type]
 */
export function toast(message, type = 'info') {
  toastCallback?.({ id: ++toastCounter, type, message });
}

export function ToastProvider() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastCallback = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
    };
    return () => {
      toastCallback = null;
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 bg-[#111827] text-white rounded-[8px] px-4 py-3 shadow-lg min-w-[280px] animate-[fadeIn_0.15s_ease-out]"
        >
          <span
            className={`w-5 h-5 rounded-full ${TOAST_COLORS[t.type]} flex items-center justify-center text-[11px] font-bold flex-shrink-0`}
          >
            {TOAST_ICONS[t.type]}
          </span>
          <span className="text-[13px]">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
