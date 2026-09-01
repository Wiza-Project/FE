import { ApiError } from '@/api/client';
import { COUNSELING_SESSION_ATTENDANCE_STATUS, COUNSELING_SESSION_ERROR_CODE, COUNSELING_SESSION_STATUS } from '@/constants/domain';

// 회기 상태 배지는 텍스트 라벨과 함께 표시하므로 색상만으로 상태를 구분하지 않는다.
export const SESSION_STATUS_BADGE_VARIANT = {
  [COUNSELING_SESSION_STATUS.PLANNED]: 'info',
  [COUNSELING_SESSION_STATUS.COMPLETED]: 'success',
  [COUNSELING_SESSION_STATUS.CANCELED]: 'danger',
};

export const ATTENDANCE_BADGE_VARIANT = {
  [COUNSELING_SESSION_ATTENDANCE_STATUS.SCHEDULED]: 'neutral',
  [COUNSELING_SESSION_ATTENDANCE_STATUS.PRESENT]: 'success',
  [COUNSELING_SESSION_ATTENDANCE_STATUS.ABSENT]: 'warning',
  [COUNSELING_SESSION_ATTENDANCE_STATUS.NO_SHOW]: 'danger',
};

export function getSessionErrorMessage(error) {
  if (!(error instanceof ApiError))
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  const { code } = error;
  if (code === COUNSELING_SESSION_ERROR_CODE.UNAUTHENTICATED)
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  if (code === COUNSELING_SESSION_ERROR_CODE.FORBIDDEN)
    return '이 회기에 대한 권한이 없습니다. 활성 상담사 계정인지 확인해 주세요.';
  if (code === COUNSELING_SESSION_ERROR_CODE.ASSIGNMENT_NOT_FOUND)
    return '담당 배정을 찾을 수 없습니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.SESSION_NOT_FOUND)
    return '해당 회기를 찾을 수 없습니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.TIME_CONFLICT)
    return '기존 상담 일정·회기와 시간이 겹칩니다. 다른 시간을 선택해 주세요.';
  if (code === COUNSELING_SESSION_ERROR_CODE.INVALID_STATE)
    return error.message || '현재 상태에서는 처리할 수 없습니다. 목록을 새로고침했습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.INVALID_INPUT)
    return error.message || '입력값을 다시 확인해 주세요.';
  return error.message || '처리 중 오류가 발생했습니다.';
}
