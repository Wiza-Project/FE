/**
 * 도메인 공통 상수.
 * 백엔드 global/common/enums 의 값과 정확히 일치해야 합니다.
 *
 * 화면에서 'APPROVED' 같은 문자열을 직접 쓰지 말고 여기서 import 하세요.
 * 오타가 나도 JS는 알려주지 않으므로, 상수로 모아두는 것이 유일한 방어책입니다.
 */

/**
 * 사용자 유형 — 백엔드 USER_TYPE 공통코드 시드 기준(STUDENT/STAFF/ADMIN 3종).
 * 이전에 있던 PROFESSOR는 백엔드 시드에 없어 제거했습니다(2026-08-21).
 */
export const USER_TYPE = {
  STUDENT: 'STUDENT',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
};

export const USER_TYPE_LABEL = {
  STUDENT: '학생',
  STAFF: '교직원',
  ADMIN: '관리자',
};

/**
 * 소속 부서 — 백엔드 DEPARTMENT 공통코드 시드 기준(D100~D400 4개, 2026-08-21).
 * 동적으로 늘어날 수 있는 목록이므로 셀렉트박스 등 UI에는 이 상수 대신
 * CommonCodeSelect(groupCode="DEPARTMENT") / useCommonCode('DEPARTMENT')를 쓰세요.
 * 여기 상수는 코드 안에서 특정 부서를 분기 처리할 때만 사용합니다.
 */
export const DEPARTMENT = {
  STUDENT_COMPETENCY_CENTER: 'D100',
  NON_SUBJECT_OPERATION: 'D200',
  CAREER_COUNSELING_CENTER: 'D300',
  CAREER_SUPPORT_OFFICE: 'D400',
};

export const DEPARTMENT_LABEL = {
  D100: '학생역량센터',
  D200: '비교과운영부서',
  D300: '진로심리상담센터',
  D400: '취창업지원과',
};

/** 승인 상태 — 프로그램 신청, 참여신청, 마일리지 실적신청 공통 */
export const APPROVAL_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELED: 'CANCELED',
};

export const APPROVAL_STATUS_LABEL = {
  REQUESTED: '신청',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소',
};

/**
 * 백엔드 응답 형태 참고 (JSDoc — 에디터 자동완성용)
 *
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {*} data
 * @property {string} [code]
 * @property {string} [message]
 *
 * @typedef {Object} AuthenticatedUser
 * @property {number} id
 * @property {string} loginId
 * @property {string} name
 * @property {string} userType
 * @property {string|null} email
 * @property {string|null} phone
 * @property {string|null} department
 * @property {string|null} departmentName
 */
