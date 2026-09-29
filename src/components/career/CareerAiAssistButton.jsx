import { useRef, useState } from 'react';
import { generateCareerAiContent } from '@/api/careerAi';
import { toast } from '@/components/common';

/**
 * 이력서·포트폴리오 문장을 AI로 초안 생성하는 공용 버튼.
 *
 * 생성 결과는 바로 입력값에 덮어쓰지 않는다 — 미리보기를 보여주고 학생이 "적용"을 눌러야
 * 반영된다("적용 전 미리보기" 요구사항). 결과가 maxLength를 넘으면 자르지 않고 재생성을
 * 안내한다. AI 호출은 task가 서버 enum(EXPERIENCE_STAR/RESUME_SUMMARY/PROJECT_DESCRIPTION/
 * PORTFOLIO_SUMMARY)과 정확히 일치해야 한다 — task 하나로 문서 종류가 정해지므로
 * documentType은 보내지 않는다(WP-326).
 *
 * @param {Object} props
 * @param {string} props.task CAREER_AI_TASK 값 (예: 'EXPERIENCE_STAR')
 * @param {string} [props.context] AI가 참고할 사실(JSON 문자열 등). 개인정보 제외, 최소 필드만.
 * @param {string} props.fieldLabel 버튼이 채워줄 필드 이름(예: "경력 설명") — 접근성 레이블·안내 문구에 사용.
 * @param {string|null} [props.disabledReason] 생성에 필요한 최소 사실이 없을 때 이유를 담아 버튼을 비활성화.
 * @param {number} [props.maxLength] 대상 필드의 최대 글자 수. 넘으면 적용하지 않고 재생성을 안내.
 * @param {(content: string) => void} props.onApply 학생이 "적용"을 눌렀을 때 호출.
 * @param {string} [props.applyFocusTargetId] 적용 후 포커스를 돌릴 엘리먼트 id(보통 채워질 textarea).
 */
export default function CareerAiAssistButton({
  task,
  context,
  fieldLabel,
  disabledReason = null,
  maxLength,
  onApply,
  applyFocusTargetId,
}) {
  // 'idle' | 'loading' | 'preview' | 'tooLong'
  const [status, setStatus] = useState('idle');
  const [draft, setDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const abortControllerRef = useRef(null);
  const cancelledRef = useRef(false);

  const focusApplyTarget = () => {
    if (!applyFocusTargetId) return;
    document.getElementById(applyFocusTargetId)?.focus();
  };

  const runGenerate = async () => {
    setStatus('loading');
    setErrorMessage(null);
    cancelledRef.current = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const result = await generateCareerAiContent(
        { task, context },
        { signal: controller.signal },
      );
      const content = result?.content?.trim();
      if (!content) {
        setStatus('idle');
        toast('AI가 생성한 문장이 없습니다. 참고 정보를 조금 더 구체적으로 입력해 보세요.', 'error');
        return;
      }
      setDraft(content);
      setStatus(maxLength && content.length > maxLength ? 'tooLong' : 'preview');
    } catch (error) {
      if (cancelledRef.current) {
        setStatus('idle');
        return;
      }
      setStatus('idle');
      setErrorMessage(error?.message || 'AI 초안 생성에 실패했습니다.');
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleGenerateClick = () => {
    if (disabledReason) return;
    runGenerate();
  };

  const handleCancelGenerating = () => {
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
  };

  const handleApply = () => {
    onApply(draft);
    setStatus('idle');
    setDraft('');
    toast('AI 초안을 반영했습니다. 사실 여부를 확인하고 필요하면 수정해 주세요.', 'success');
    focusApplyTarget();
  };

  const handleDiscard = () => {
    setStatus('idle');
    setDraft('');
  };

  const isOpen = status === 'preview' || status === 'tooLong';

  return (
    <div className="inline-flex flex-col gap-1.5 items-start">
      {status !== 'loading' && !isOpen && (
        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={!!disabledReason}
          aria-label={`${fieldLabel} AI 초안 생성`}
          title={disabledReason ?? undefined}
          className="rounded-[5px] border border-[#A7F3D0] bg-[#F0FDF4] px-2 py-1 text-[10px] font-bold text-[#047857] hover:bg-[#DCFCE7] disabled:cursor-not-allowed disabled:opacity-50 disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9AA0A6]"
        >
          AI 초안
        </button>
      )}

      {status === 'loading' && (
        <div className="flex items-center gap-2">
          <span className="rounded-[5px] border border-[#A7F3D0] bg-[#F0FDF4] px-2 py-1 text-[10px] font-bold text-[#047857] inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
            생성 중…
          </span>
          <button
            type="button"
            onClick={handleCancelGenerating}
            className="text-[10px] font-semibold text-[#656D76] hover:text-[#CF222E] underline"
          >
            취소
          </button>
          <span role="status" aria-live="polite" className="sr-only">
            {fieldLabel} AI 초안을 생성하는 중입니다.
          </span>
        </div>
      )}

      {disabledReason && status === 'idle' && (
        <p className="text-[10px] text-[#9AA0A6]">{disabledReason}</p>
      )}

      {errorMessage && status === 'idle' && (
        <p role="alert" className="text-[10px] text-[#CF222E]">
          {errorMessage}
        </p>
      )}

      {isOpen && (
        <div
          role="region"
          aria-label={`${fieldLabel} AI 초안 미리보기`}
          className="w-full min-w-[260px] max-w-[520px] rounded-[6px] border border-[#A7F3D0] bg-[#F0FDF4] p-2.5 flex flex-col gap-2"
        >
          <p className="text-[10px] font-bold text-[#047857]">
            AI 초안 — 사실 여부를 확인 후 수정하세요
          </p>
          <p className="text-[12px] text-[#1F2328] whitespace-pre-wrap leading-relaxed">{draft}</p>

          {status === 'tooLong' && (
            <p role="alert" className="text-[10px] text-[#CF222E]">
              생성된 초안이 {fieldLabel} 최대 글자 수({maxLength.toLocaleString()}자)를 초과했습니다
              ({draft.length.toLocaleString()}자). 그대로 적용할 수 없어요 — 다시 생성하거나
              참고 정보를 줄여서 요청해 보세요.
            </p>
          )}

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handleDiscard}
              className="text-[11px] font-semibold text-[#656D76] hover:text-[#1F2328] px-2 py-1"
            >
              취소
            </button>
            <button
              type="button"
              onClick={runGenerate}
              className="text-[11px] font-bold text-[#047857] hover:underline px-2 py-1"
            >
              다시 생성
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={status === 'tooLong'}
              className="text-[11px] font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-[5px] px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
