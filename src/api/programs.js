import { apiClient, downloadFile } from './client';

/**
 * 운영계획서 업로드. POST /api/admin/programs/files
 * 프로그램 등록/수정과 별개로 파일을 먼저 올려 fileGroupId를 발급받는다.
 * @param {File} file
 * @returns {Promise<{fileGroupId: number}>} ProgramFileUploadResponseDTO
 */
export const uploadProgramOperationPlan = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/admin/programs/files', formData, {
    headers: { 'Content-Type': undefined },
  });
  return data;
};

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
 * @param {number} [params.competencyId]
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
 * 학생용 비교과 프로그램 상세 조회. GET /api/students/programs/{programId}
 * @param {number} programId
 * @returns {Promise<Object>} ProgramDetailResponseDTO
 */
export const fetchProgramDetail = async (programId) => {
  const { data } = await apiClient.get(`/students/programs/${programId}`);
  return data;
};

/**
 * 학생용 비교과 프로그램 운영계획서 다운로드. GET /api/students/programs/{programId}/file
 * 첨부파일이 없으면 404(RESOURCE_NOT_FOUND) — 상세 응답의 fileName이 null이 아닐 때만 호출한다.
 * @param {number} programId
 * @param {string} fallbackName 서버가 파일명을 안 줄 때 사용할 이름
 */
export const downloadProgramOperationPlan = (programId, fallbackName) =>
  downloadFile(`/students/programs/${programId}/file`, fallbackName);

/**
 * 로그인한 학생 본인의 회차별 출결 현황 조회. GET /api/students/programs/{programId}/attendances
 * 아직 기록되지 않은 회차는 attendanceStatus 등 출결 관련 필드가 null로 내려온다.
 * @param {number} programId
 * @returns {Promise<Array<{programSessionId: number, sessionNo: number, sessionName: string|null, startsAt: string, endsAt: string, location: string|null, attendanceStatus: string|null, attendedMinutes: number|null, note: string|null}>>}
 */
export const fetchMyAttendance = async (programId) => {
  const { data } = await apiClient.get(`/students/programs/${programId}/attendances`);
  return data;
};

/**
 * 프로그램 등록/수정 폼의 "연계 핵심역량" select용 목록 조회. GET /api/competencies
 * (핵심역량 도메인 공용 조회 API, WP-230) 최상위(상위역량 없음) + 사용 중인 역량만
 * displayOrder 순으로 내려온다.
 * @param {Object} [opts]
 * @param {number} [opts.includeCompetencyId] 활성 목록에 없어도(비활성) 강제로 포함할 역량 id.
 *   수정 폼에서 기존 프로그램이 참조 중인 값을 셀렉트에 표시하기 위해 사용. 생략 시 기존과 동일하게 호출.
 * @returns {Promise<{competencyId: number, competencyCode: string, competencyName: string, displayOrder: number, active: boolean}[]>}
 */
export const fetchCompetencyOptions = async ({ includeCompetencyId } = {}) => {
  const { data } = await apiClient.get('/competencies', {
    params: includeCompetencyId != null ? { includeCompetencyId } : undefined,
  });
  return data;
};

/**
 * 학생용 "핵심역량" 필터 옵션 조회. GET /api/competencies
 * @returns {Promise<{competencyId: number, competencyCode: string, competencyName: string, displayOrder: number}[]>}
 */
export const fetchCompetencyOptionsStudent = async () => {
  const { data } = await apiClient.get('/competencies');
  return data;
};

/**
 * 교직원(본인 소유) 비교과 프로그램 목록 조회. GET /api/admin/programs
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
 * 교직원(본인 소유) 비교과 프로그램 단건 상세 조회. GET /api/admin/programs/{programId}
 * 수정 폼 프리필용. 본인이 등록한 프로그램이 아니면 403(A004)이 내려온다.
 * @param {number} programId
 * @returns {Promise<Object>} ProgramAdminDetailResponseDTO
 */
export const fetchProgramDetailAdmin = async (programId) => {
  const { data } = await apiClient.get(`/admin/programs/${programId}`);
  return data;
};

/**
 * 비교과 프로그램 수정. PUT /api/admin/programs/{programId}
 * 모집중이며 본인 소유인 프로그램만 가능. 실패 시 403(A004) 또는 400(PROGRAM_NOT_EDITABLE/P009).
 * @param {number} programId
 * @param {Object} payload ProgramUpdateRequestDTO와 동일한 형태.
 *   fileGroupId를 생략하면 기존 첨부(file_group_id)를 그대로 유지한다. 새 파일을
 *   첨부하려면 fileGroupId(uploadProgramOperationPlan으로 먼저 발급)를 보낸다.
 *   기존 첨부만 제거하려면 fileGroupId 없이 clearFileGroup: true를 보낸다 —
 *   FileGroup/StoredFile은 program 외 다른 도메인도 함께 쓰는 공용 테이블이라
 *   이 요청은 프로그램의 file_group_id 연결만 해제(unlink)할 뿐 FileGroup/StoredFile
 *   row 자체는 삭제하지 않는다. fileGroupId와 clearFileGroup을 동시에 보내면
 *   400(PROGRAM_FILE_GROUP_CONFLICT/P023)으로 거부된다.
 * @param {number} [payload.fileGroupId]
 * @param {boolean} [payload.clearFileGroup]
 */
export const updateProgram = async (programId, payload) => {
  const { data } = await apiClient.put(`/admin/programs/${programId}`, payload);
  return data;
};

/**
 * 비교과 프로그램 삭제. DELETE /api/admin/programs/{programId}
 * 모집중이며 본인 소유인 프로그램만 가능. 실패 시 403(A004) 또는 400(PROGRAM_NOT_DELETABLE/P010).
 * @param {number} programId
 */
export const deleteProgram = async (programId) => {
  await apiClient.delete(`/admin/programs/${programId}`);
};

/**
 * 프로그램 신청자 목록 조회. GET /api/admin/programs/{programId}/applications
 * @param {number} programId
 * @param {Object} [params]
 * @param {string} [params.status] APPLIED/WAITLISTED/APPROVED/REJECTED/CANCELLED
 * @param {string} [params.keyword] 학생 이름/학번 부분 일치 검색어.
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
