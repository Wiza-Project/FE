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
 * 학생용 비교과 프로그램 상세 조회. GET /api/students/programs/{programId}
 * @param {number} programId
 * @returns {Promise<Object>} ProgramDetailResponseDTO
 */
export const fetchProgramDetail = async (programId) => {
  const { data } = await apiClient.get(`/students/programs/${programId}`);
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
