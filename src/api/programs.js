import { apiClient } from './client';

/**
 * 비교과 프로그램 등록. POST /api/admin/programs
 * @param {Object} payload ProgramRegisterRequestDTO와 동일한 형태
 */
export const createProgram = async (payload) => {
  const { data } = await apiClient.post('/admin/programs', payload);
  return data;
};

/**
 * 학생용 비교과 프로그램 목록 조회. GET /api/students/programs
 * @param {Object} [params]
 * @param {string} [params.status] DRAFT(모집중)/OPERATING(운영중)/CLOSED(종료). 생략 시 전체.
 * @param {string} [params.keyword] 프로그램명 부분 일치 검색어.
 * @param {number} [params.page] 0-base 페이지 번호.
 * @param {number} [params.size] 페이지당 건수.
 * @param {string} [params.sort] 예: "createdAt,desc"
 * @returns {Promise<{content: object[], page: number, size: number, totalElements: number, totalPages: number, first: boolean, last: boolean}>}
 */
export const fetchPrograms = async (params) => {
  const { data } = await apiClient.get('/students/programs', { params });
  return data;
};

/**
 * 프로그램 등록 폼의 "연계 핵심역량" select용 목록 조회. GET /api/admin/programs/competencies
 * 최상위(상위역량 없음) + 사용 중인 역량만 displayOrder 순으로 내려온다.
 * @returns {Promise<{competencyId: number, competencyCode: string, competencyName: string, displayOrder: number}[]>}
 */
export const fetchCompetencyOptions = async () => {
  const { data } = await apiClient.get('/admin/programs/competencies');
  return data;
};

/**
 * 교직원(본인 소유) 비교과 프로그램 목록 조회. GET /api/admin/programs
 * 단건조회 API가 없어 이 목록 응답이 목록 화면·수정 진입 시 참조할 수 있는 유일한 데이터다.
 *
 * @param {Object} [params]
 * @param {string} [params.status] DRAFT/OPERATING/CLOSED. 생략 시 전체.
 * @param {string} [params.keyword] 프로그램명 부분 일치 검색어.
 * @param {number} [params.competencyId]
 * @param {number} [params.page] 0-base 페이지 번호.
 * @param {number} [params.size] 페이지당 건수.
 * @returns {Promise<{content: object[], page: number, size: number, totalElements: number, totalPages: number, first: boolean, last: boolean}>}
 */
export const fetchProgramsAdmin = async (params) => {
  const { data } = await apiClient.get('/admin/programs', { params });
  return data;
};

/**
 * 비교과 프로그램 수정. PUT /api/admin/programs/{programId}
 * 모집중(작성중/반려) 상태·소유자 본인만 가능. ProgramRegisterRequestDTO와 동일한 형태를 기대한다.
 * @param {number} programId
 * @param {Object} payload
 */
export const updateProgram = async (programId, payload) => {
  const { data } = await apiClient.put(`/admin/programs/${programId}`, payload);
  return data;
};

/**
 * 프로그램 신청자 목록 조회. GET /api/admin/programs/{programId}/applications
 * @param {number} programId
 * @param {Object} [params]
 * @param {string} [params.status] APPLIED/WAITLISTED/APPROVED/REJECTED/CANCELLED
 * @returns {Promise<{content: object[], page: number, size: number, totalElements: number, totalPages: number}>}
 */
export const fetchProgramApplications = async (programId, params) => {
  const { data } = await apiClient.get(`/admin/programs/${programId}/applications`, { params });
  return data;
};

/**
 * 신청 단건 승인. POST /api/admin/programs/{programId}/applications/{applicationId}/approve
 */
export const approveApplication = async (programId, applicationId) => {
  const { data } = await apiClient.post(
    `/admin/programs/${programId}/applications/${applicationId}/approve`,
  );
  return data;
};

/**
 * 신청 단건 반려. POST /api/admin/programs/{programId}/applications/{applicationId}/reject
 * @param {number} programId
 * @param {number} applicationId
 * @param {string} reason
 */
export const rejectApplication = async (programId, applicationId, reason) => {
  const { data } = await apiClient.post(
    `/admin/programs/${programId}/applications/${applicationId}/reject`,
    { reason },
  );
  return data;
};

/**
 * 신청 일괄 승인. POST /api/admin/programs/{programId}/applications/bulk-approve
 * @param {number} programId
 * @param {number[]} applicationIds
 */
export const bulkApproveApplications = async (programId, applicationIds) => {
  const { data } = await apiClient.post(`/admin/programs/${programId}/applications/bulk-approve`, {
    applicationIds,
  });
  return data;
};

/**
 * 신청 일괄 반려. POST /api/admin/programs/{programId}/applications/bulk-reject
 * @param {number} programId
 * @param {number[]} applicationIds
 * @param {string} reason
 */
export const bulkRejectApplications = async (programId, applicationIds, reason) => {
  const { data } = await apiClient.post(`/admin/programs/${programId}/applications/bulk-reject`, {
    applicationIds,
    reason,
  });
  return data;
};
