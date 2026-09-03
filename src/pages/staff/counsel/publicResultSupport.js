import { ApiError } from '@/api/client';
import { COUNSELING_PUBLIC_RESULT_ERROR_CODE } from '@/constants/domain';

// 결과 조회·저장·공개·완료·정정·이력 module이 함께 쓰는 오류 메시지 매핑이다.
export function getPublicResultErrorMessage(error) {
  if (!(error instanceof ApiError))
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  const { code } = error;
  if (code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.FORBIDDEN)
    return '이 회기의 공개 결과에 접근할 권한이 없습니다.';
  if (code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.SESSION_NOT_FOUND)
    return '해당 회기를 찾을 수 없습니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.STATE_CONFLICT)
    return '현재 상태에서는 처리할 수 없습니다. 최신 상태를 다시 불러왔습니다.';
  if (code === COUNSELING_PUBLIC_RESULT_ERROR_CODE.INVALID_INPUT)
    return '입력값을 다시 확인해 주세요.';
  return '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

// setQueryData는 대상 Query가 없으면 새 캐시를 만들 수 있다. 이 화면(또는 이 회기)이 이미
// 닫혔다면 새로 만들지 않고, 지금 보고 있는 Query만 최신 응답으로 갱신한다.
export function updateQueryIfPresent(queryClient, queryKey, data) {
  const query = queryClient.getQueryCache().find({ queryKey, exact: true });
  if (!query) return false;
  queryClient.setQueryData(queryKey, data);
  return true;
}

// 서버 쓰기 성공 응답을 반영하기 전에 같은 query의 진행 중인 조회를 취소한다.
// 먼저 시작된 오래된 GET 응답이 성공 응답을 덮어쓰지 않게 하는 순서다.
export async function cancelQueryBeforeUpdate(queryClient, queryKey) {
  await queryClient.cancelQueries({ queryKey, exact: true });
}
