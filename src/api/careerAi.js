import { apiClient } from './client';

/**
 * 취창업 문서 AI 작성 보조 API.
 *
 * 프롬프트 구성과 모델 호출은 전적으로 백엔드가 담당한다 — 프런트는 어떤 AI 제공자
 * 키도 알지 못하며, 로그인 세션으로 우리 서버에만 요청한다.
 *
 * 서버는 이력서(RESUME_SUMMARY/EXPERIENCE_STAR)·포트폴리오(PROJECT_DESCRIPTION/
 * PORTFOLIO_SUMMARY) task만 지원한다 — 자기소개서용 task는 없다. task 하나로 문서
 * 종류가 정해지므로 documentType 필드는 보내지 않는다(WP-326, CareerAiAssistRequest.java
 * 참고. 보내도 서버가 무시하지만 클라이언트에서도 완전히 제거한다).
 */

/**
 * career-ai가 지원하는 task. CareerAiTask.java와 정확히 일치해야 한다(대소문자 포함).
 * @type {{EXPERIENCE_STAR: string, RESUME_SUMMARY: string, PROJECT_DESCRIPTION: string, PORTFOLIO_SUMMARY: string}}
 */
export const CAREER_AI_TASK = {
  EXPERIENCE_STAR: 'EXPERIENCE_STAR',
  RESUME_SUMMARY: 'RESUME_SUMMARY',
  PROJECT_DESCRIPTION: 'PROJECT_DESCRIPTION',
  PORTFOLIO_SUMMARY: 'PORTFOLIO_SUMMARY',
};

/** 분당·일일 호출 한도 — CareerAiRateLimiter.java와 일치. 에러 메시지 문구용. */
export const CAREER_AI_RATE_LIMIT = {
  PER_MINUTE: 5,
  PER_DAY: 30,
};

/** 참고 정보(context) 최대 길이 — CareerAiAssistRequest.java @Size(max=4000)와 일치. */
export const CAREER_AI_CONTEXT_MAX_LENGTH = 4000;

/**
 * 이력서·포트폴리오 문장 초안 생성. POST /api/students/me/career-ai/assist
 *
 * 생성 결과는 호출한 쪽에서 화면에 채워 넣기만 하고 저장하지 않는다 —
 * 학생이 내용을 검토·수정한 뒤 기존 저장 버튼으로 직접 저장한다(이때 저장 요청의
 * aiAssistanceUsed를 true로 함께 보내야 한다).
 *
 * 분당 5회·일 30회·동시 1건 제한이 있다 — 초과 시 429(J023/J024)가 발생한다.
 *
 * @param {Object} params
 * @param {string} params.task CAREER_AI_TASK 값 (예: 'EXPERIENCE_STAR')
 * @param {string} [params.context] AI가 근거로 삼을 사실. 최대 4000자, 개인정보(연락처·주소·이메일 등) 제외.
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal] 취소용 AbortController.signal
 * @returns {Promise<{content: string}>} 생성된 문장
 */
export const generateCareerAiContent = async ({ task, context }, options = {}) => {
  const { data } = await apiClient.post(
    '/students/me/career-ai/assist',
    { task, context },
    { signal: options.signal },
  );
  return data;
};
