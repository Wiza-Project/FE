import { apiClient } from './client';

/**
 * 공통코드 조회. GET /api/common-codes?groupCode={groupCode}
 * groupCode를 생략하면 활성(is_active) 상태인 전체 공통코드를 sortOrder 순으로 반환합니다.
 *
 * @param {string} [groupCode] 예: 'DEPARTMENT', 'PROGRAM_TYPE', 'ACADEMIC_YEAR' 등
 * @returns {Promise<{
 *   codeId: number,
 *   parentCodeId: number|null,
 *   codeGroup: string,
 *   code: string,
 *   codeName: string,
 *   description: string|null,
 *   sortOrder: number,
 * }[]>}
 */
export const fetchCommonCodes = async (groupCode) => {
  const { data } = await apiClient.get('/common-codes', {
    params: groupCode ? { groupCode } : undefined,
  });
  return data;
};
