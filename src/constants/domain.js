/**
 * 도메인 공통 상수.
 * 백엔드 global/common/enums 의 값과 정확히 일치해야 합니다.
 *
 * 화면에서 'APPROVED' 같은 문자열을 직접 쓰지 말고 여기서 import 하세요.
 * 오타가 나도 JS는 알려주지 않으므로, 상수로 모아두는 것이 유일한 방어책입니다.
 */

/** 사용자 유형 — 프로세스 흐름도의 액터 4종 */
export const USER_TYPE = {
  STUDENT: 'STUDENT',
  STAFF: 'STAFF',
  COUNSELOR: 'COUNSELOR',
  COMPANY: 'COMPANY',
};

export const USER_TYPE_LABEL = {
  STUDENT: '학생',
  STAFF: '교직원',
  COUNSELOR: '상담사',
  COMPANY: '기업체',
};

/** 소속 부서 (교직원만 해당) — 프로세스 흐름도의 스윔레인 */
export const DEPARTMENT = {
  STUDENT_COMPETENCY_CENTER: 'STUDENT_COMPETENCY_CENTER',
  CAREER_COUNSELING_CENTER: 'CAREER_COUNSELING_CENTER',
  EMPLOYMENT_SUPPORT_CENTER: 'EMPLOYMENT_SUPPORT_CENTER',
  ENGINEERING_INNOVATION_CENTER: 'ENGINEERING_INNOVATION_CENTER',
  STUDENT_SUPPORT_CENTER: 'STUDENT_SUPPORT_CENTER',
  ACADEMIC_DEPARTMENT: 'ACADEMIC_DEPARTMENT',
  CAREER_SUPPORT_OFFICE: 'CAREER_SUPPORT_OFFICE',
  NON_SUBJECT_OPERATION: 'NON_SUBJECT_OPERATION',
};

export const DEPARTMENT_LABEL = {
  STUDENT_COMPETENCY_CENTER: '학생역량센터',
  CAREER_COUNSELING_CENTER: '진로심리상담센터',
  EMPLOYMENT_SUPPORT_CENTER: '취업지원센터',
  ENGINEERING_INNOVATION_CENTER: '공학교육혁신센터',
  STUDENT_SUPPORT_CENTER: '학생지원센터',
  ACADEMIC_DEPARTMENT: '학과/학부',
  CAREER_SUPPORT_OFFICE: '취창업지원과',
  NON_SUBJECT_OPERATION: '비교과운영부서',
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
 * @property {string|null} department
 * @property {string|null} studentNo
 */
