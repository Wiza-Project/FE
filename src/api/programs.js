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
 * 프로그램 등록 폼의 "연계 핵심역량" select용 목록 조회. GET /api/admin/programs/competencies
 * 최상위(상위역량 없음) + 사용 중인 역량만 displayOrder 순으로 내려온다.
 * @returns {Promise<{competencyId: number, competencyCode: string, competencyName: string, displayOrder: number}[]>}
 */
export const fetchCompetencyOptions = async () => {
  const { data } = await apiClient.get('/admin/programs/competencies');
  return data;
};
