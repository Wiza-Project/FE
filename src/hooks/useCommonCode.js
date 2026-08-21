import { useQuery } from '@tanstack/react-query';
import { fetchCommonCodes } from '@/api/commonCode';

/**
 * 공통코드 그룹 조회 훅. sortOrder 순으로 정렬된 코드 목록을 반환합니다.
 * 시드 데이터라 자주 바뀌지 않으므로 staleTime을 5분으로 넉넉히 잡았습니다.
 *
 * @param {string} groupCode 예: 'DEPARTMENT', 'PROGRAM_TYPE', 'ACADEMIC_YEAR' 등.
 *   falsy면 요청을 보내지 않습니다(다른 값에 의존해 조건부로 열리는 셀렉트박스 대응).
 * @returns {import('@tanstack/react-query').UseQueryResult<
 *   {codeId: number, parentCodeId: number|null, codeGroup: string, code: string,
 *    codeName: string, description: string|null, sortOrder: number}[]
 * >}
 */
export function useCommonCode(groupCode) {
  return useQuery({
    queryKey: ['commonCodes', groupCode],
    queryFn: () => fetchCommonCodes(groupCode),
    enabled: !!groupCode,
    staleTime: 5 * 60 * 1000,
  });
}
