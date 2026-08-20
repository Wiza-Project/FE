import { apiClient } from '@/api/client';

/**
 * 핵심역량 등록 (SCR-A01). 역량코드(C1~C6)와 축순서는 서버가 자동 결정한다.
 *
 * @param {Object} params
 * @param {string} params.competencyName
 * @param {string} [params.englishName]
 * @param {string} [params.description]
 * @returns {Promise<{competencyId: number, competencyCode: string, competencyName: string, englishName: string|null, description: string|null, displayOrder: number, active: boolean}>}
 */
export const registerCompetency = async ({ competencyName, englishName, description }) => {
  const { data } = await apiClient.post('/admin/competencies', {
    competencyName,
    englishName,
    description,
  });
  return data;
};
