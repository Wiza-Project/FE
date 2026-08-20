import { apiClient } from '@/api/client';

/**
 * @typedef {Object} CounselingType
 * @property {string} typeCode
 * @property {string} typeName
 * @property {string} applicationRoute
 * @property {string} counselingMethod
 * @property {string|null} precedingProcedure
 */

/**
 * 학생이 신청할 수 있는 활성 상담 유형을 조회한다.
 *
 * @returns {Promise<CounselingType[]>}
 */
export const fetchCounselingTypes = async () => {
  const { data } = await apiClient.get('/students/counseling-types');
  return data;
};
