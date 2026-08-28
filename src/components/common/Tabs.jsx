import { useRef } from 'react';

/**
 * @param {Object} props
 * @param {{key: string, label: string, count?: number}[]} props.tabs
 * @param {string} props.active
 * @param {(key: string) => void} props.onChange
 * @param {string} [props.accentColor]
 * @param {boolean} [props.withPanels] - set when matching `id="panel-${tab.key}"` / `role="tabpanel"` elements are rendered; also gates `role`/`id`/`aria-selected`/`aria-controls` on the tabs themselves, since ARIA tabs are invalid without panels to control. Also enables roving-tabindex keyboard navigation (ArrowLeft/ArrowRight/Home/End) per the WAI-ARIA Tabs pattern.
 */
export function Tabs({ tabs, active, onChange, accentColor = '#2563EB', withPanels = false }) {
  const tabRefs = useRef([]);

  const activateTab = (index) => {
    const tab = tabs[index];
    if (!tab) return;
    onChange(tab.key);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event, index) => {
    if (!withPanels) return;
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        activateTab((index + 1) % tabs.length);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        activateTab((index - 1 + tabs.length) % tabs.length);
        break;
      case 'Home':
        event.preventDefault();
        activateTab(0);
        break;
      case 'End':
        event.preventDefault();
        activateTab(tabs.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="flex border-b border-[#E5E7EB] mb-4"
      role={withPanels ? 'tablist' : undefined}
      aria-orientation={withPanels ? 'horizontal' : undefined}
    >
      {tabs.map((tab, index) => (
        <button
          type="button"
          key={tab.key}
          ref={(el) => {
            tabRefs.current[index] = el;
          }}
          id={withPanels ? `tab-${tab.key}` : undefined}
          role={withPanels ? 'tab' : undefined}
          aria-selected={withPanels ? active === tab.key : undefined}
          // 대응하는 role="tabpanel" 요소가 있는 사용처(ProgramForm)에서만 true로 전달 — 없으면 aria-controls가 존재하지 않는 요소를 가리키게 됨
          aria-controls={withPanels ? `panel-${tab.key}` : undefined}
          tabIndex={withPanels ? (active === tab.key ? 0 : -1) : undefined}
          onClick={(event) => {
            onChange(tab.key);
            // Safari/Firefox(macOS)는 버튼 클릭 시 기본으로 포커스를 주지 않아, roving tabindex가 실제 포커스와 어긋날 수 있음
            if (withPanels) event.currentTarget.focus();
          }}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className={`px-4 py-2.5 text-[13px] font-semibold transition-colors relative whitespace-nowrap ${active === tab.key ? 'text-[#1F2328]' : 'text-[#656D76] hover:text-[#1F2328]'}`}
        >
          {tab.label}
          {tab.count != null && (
            <span
              className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full font-bold ${active === tab.key ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F3F4F6] text-[#9AA0A6]'}`}
            >
              {tab.count}
            </span>
          )}
          {active === tab.key && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
              style={{ background: accentColor }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
