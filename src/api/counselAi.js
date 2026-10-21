import { apiClient } from '@/api/client';

/**
 * @typedef {Object} CounselingAiDraft 신청 초안. 값이 없는 필드는 null이다(응답에서는 생략될 수 있다).
 * @property {number|null} counselingTypeId
 * @property {number|null} scheduleId
 * @property {string|null} requestContent 서버가 대화를 누적해 준 신청 내용 요약(trim 후 최대 3,000자). 화면에서 직접 입력하지 않는다.
 */

/**
 * @typedef {Object} CounselingAiFilters 일정 검색 조건. 각 필드는 null 가능(응답에서는 생략될 수 있다).
 * @property {string|null} dateFrom ISO LocalDate
 * @property {string|null} dateTo ISO LocalDate
 * @property {string|null} startTimeFrom "HH:mm" (Asia/Seoul)
 * @property {string|null} startTimeTo "HH:mm" (Asia/Seoul)
 */

/**
 * @typedef {Object} CounselingAiContext 화면 메모리 문맥. 대화 원문은 넣지 않는다.
 * @property {number} version 0 이상. 확인 대상이 바뀔 때 FE가 증가(권한·멱등성 토큰 아님)
 * @property {CounselingAiDraft|null} draft
 * @property {{counselingTypeId: number, scheduleId: number}[]} candidates 직전 표시 순서, 최대 5개
 * @property {boolean} awaitingConfirmation 현재 카드에 대해 신청 확인 질문이 표시된 상태
 * @property {CounselingAiFilters|null} filters
 */

/**
 * 상담 전 AI 도우미에 자연어 메시지를 보낸다.
 * 상담 유형·실제 예약 가능 일정은 서버가 로그인한 학생 기준으로 조합하고,
 * 이 함수는 조회·해석만 한다(예약 쓰기는 기존 createCounselingReservation).
 * apiClient 인터셉터가 응답 포장을 이미 벗기므로 여기서 다시 벗기지 않는다.
 * 타임아웃(15초)·연결 오류는 ApiError('NETWORK_ERROR')로 던져지며, 채팅은 쓰기가 없어 "결과 불명"이 아니다.
 *
 * @param {string} message trim 후 1~3,000자
 * @param {CounselingAiContext|null} [context=null] 최초 호출은 null
 * @returns {Promise<CounselingAiChatResponse>}
 */
export const requestCounselingAiChat = async (message, context = null) => {
  const { data } = await apiClient.post('/students/counseling-ai/chat', { message, context });
  return data;
};

/**
 * @typedef {Object} CounselingAiChatResponse
 * @property {string} reply 안내 문장. 성공 여부·동작의 근거로 쓰지 않는다.
 * @property {number} basedOnVersion 요청 context.version(context가 null이면 0). 현재 version과 다르면 폐기한다.
 * @property {'INFORM'|'UPDATE_DRAFT'|'ASK_CONFIRMATION'|'CONFIRM_RESERVATION'|'OPEN_GENERAL_APPLICATION'} action
 *   값 비교는 constants/domain.js의 COUNSELING_AI_ACTION 사용.
 * @property {CounselingAiDraft} [draft] null이면 필드가 응답에서 생략된다(없음과 null은 같다).
 * @property {CounselingAiFilters} [filters] null이면 생략된다.
 * @property {CounselingAiTypeRecommendation} [counselingTypeRecommendation] null이면 생략된다.
 * @property {CounselingAiScheduleRecommendation[]} scheduleRecommendations 최대 5개, 항상 존재(빈 배열 가능)
 */

/**
 * @typedef {Object} CounselingAiTypeRecommendation
 * @property {number} counselingTypeId
 * @property {string} typeCode
 * @property {string} typeName
 * @property {string} reason
 */

/**
 * @typedef {Object} CounselingAiScheduleRecommendation
 * @property {number} scheduleId
 * @property {number} counselingTypeId
 * @property {string} counselingTypeCode
 * @property {string} counselingTypeName
 * @property {string} counselorName
 * @property {string|null} counselorDepartmentName
 * @property {string} startsAt UTC ISO-8601 Instant
 * @property {string} endsAt UTC ISO-8601 Instant
 * @property {string|null} bookingDeadline
 * @property {string|null} location
 * @property {number} remainingCapacity
 * @property {string} recommendationReason
 */
