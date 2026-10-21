import { apiClient } from './client';

/**
 * 비교과 프로그램 참여 신청. POST /api/students/programs/{programId}/applications
 * @param {number} programId
 * @returns {Promise<{applicationId: number, programId: number, applicationStatus: string, applicationStatusLabel: string, waitlistOrder: number|null, appliedAt: string}>}
 */
export const applyToProgram = async (programId) => {
  const { data } = await apiClient.post(`/students/programs/${programId}/applications`);
  return data;
};

/**
 * 만족도 설문 완료 처리. POST /api/students/programs/{programId}/applications/{applicationId}/survey-complete
 * 문항별 응답을 저장하는 API는 없고, 완료 여부(surveyCompleted) 플래그만 서버에 반영된다.
 * @param {number} programId
 * @param {number} applicationId
 * @returns {Promise<{applicationId: number, surveyCompleted: boolean}>}
 */
export const completeSurvey = async (programId, applicationId) => {
  const { data } = await apiClient.post(
    `/students/programs/${programId}/applications/${applicationId}/survey-complete`,
  );
  return data;
};

/**
 * 로그인한 학생 본인의 비교과 프로그램 참여 신청 현황 조회. GET /api/students/programs/applications
 * @param {Object} [params]
 * @param {number} [params.page] 0-base 페이지 번호.
 * @param {number} [params.size] 페이지당 건수.
 * @param {string} [params.sort] 예: "createdAt,desc"
 * @returns {Promise<{content: object[], page: number, size: number, totalElements: number, totalPages: number, first: boolean, last: boolean}>}
 */
export const fetchMyApplications = async (params) => {
  const { data } = await apiClient.get('/students/programs/applications', { params });
  return data;
};

/**
 * 대기(WAITLISTED) 신청 확정. POST /api/students/programs/{programId}/applications/{applicationId}/confirm
 * 정원에 자리가 난 경우, 학생 본인이 대기 신청을 승인(APPROVED) 상태로 직접 확정한다.
 * @param {number} programId
 * @param {number} applicationId
 * @returns {Promise<{applicationId: number, programId: number, applicationStatus: string, applicationStatusLabel: string, decisionReason: string|null, processedBy: number, processedAt: string}>}
 */
export const confirmMyApplication = async (programId, applicationId) => {
  const { data } = await apiClient.post(
    `/students/programs/${programId}/applications/${applicationId}/confirm`,
  );
  return data;
};

/**
 * 프로그램 참여 신청 취소. POST /api/students/programs/{programId}/applications/{applicationId}/cancel
 * 모집 기간이 끝나지 않은 경우에만 취소할 수 있다(취소 가능 여부 자체는 서버가 최종 판단).
 * @param {number} programId
 * @param {number} applicationId
 * @param {string} [reason] 취소 사유. 선택 입력.
 * @returns {Promise<{applicationId: number, programId: number, applicationStatus: string, applicationStatusLabel: string, cancellationReason: string|null, canceledAt: string}>}
 */
export const cancelMyApplication = async (programId, applicationId, reason) => {
  const { data } = await apiClient.post(
    `/students/programs/${programId}/applications/${applicationId}/cancel`,
    reason ? { reason } : undefined,
  );
  return data;
};
