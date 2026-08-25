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

/**
 * 사용자 역할(role_code) — 백엔드 USER_ROLE 공통코드 시드 기준.
 * userType(대분류)과 별개로, 한 계정이 겸임 등의 이유로 여러 role_code를 가질 수 있습니다
 * (로그인 응답의 user.roleCodes: string[] — 빈 배열이면 겸임 없음, null 아님).
 * ProtectedRoute의 allowRole, authStore.hasRole()과 함께 쓰세요.
 */
export const USER_ROLE = {
  STUDENT: 'SD100',
  STAFF: 'ST100',
  COUNSELOR: 'ST200',
  PROFESSOR: 'ST300',
  ADMIN: 'AD100',
};

export const USER_ROLE_LABEL = {
  SD100: '학생',
  ST100: '일반교직원',
  ST200: '카운셀러',
  ST300: '교수',
  AD100: '관리자',
};

/** 상담사 본인 일정의 서버 상태. */
export const COUNSELOR_SCHEDULE_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
};

export const COUNSELOR_SCHEDULE_STATUS_LABEL = {
  [COUNSELOR_SCHEDULE_STATUS.OPEN]: '예약 가능',
  [COUNSELOR_SCHEDULE_STATUS.CLOSED]: '마감',
};

/**
 * 상담 유형의 신청 경로 — 백엔드 application_route enum 기준.
 * DIRECT는 상담사가 연 일정을 골라 예약하는 흐름, CENTER는 일정 없이 센터에 접수를 요청하는 흐름입니다.
 * 학생 온라인 신청은 현재 DIRECT만 제공하며 CENTER(센터 접수)는 후순위라, 화면 분기에 이 상수를 씁니다.
 */
export const APPLICATION_ROUTE = {
  DIRECT: 'DIRECT',
  CENTER: 'CENTER',
};

export const APPLICATION_ROUTE_LABEL = {
  [APPLICATION_ROUTE.DIRECT]: '온라인 신청',
  [APPLICATION_ROUTE.CENTER]: '센터 신청',
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

/** 학생 상담 예약의 서버 상태와 화면 표시명. */
export const COUNSELING_RESERVATION_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELED: 'CANCELED',
};

export const COUNSELING_RESERVATION_STATUS_LABEL = {
  [COUNSELING_RESERVATION_STATUS.REQUESTED]: '신청',
  [COUNSELING_RESERVATION_STATUS.APPROVED]: '승인',
  [COUNSELING_RESERVATION_STATUS.IN_PROGRESS]: '진행 중',
  [COUNSELING_RESERVATION_STATUS.COMPLETED]: '완료',
  [COUNSELING_RESERVATION_STATUS.REJECTED]: '반려',
  [COUNSELING_RESERVATION_STATUS.CANCELED]: '취소',
};

/** 학생 예약 취소 화면에서 쓰는 사유 선택값. 서버에는 표시명과 상세 사유를 합친 문자열만 전송한다. */
export const COUNSELING_CANCELLATION_REASON = {
  PERSONAL: 'PERSONAL',
  RESCHEDULE: 'RESCHEDULE',
  OTHER: 'OTHER',
};

export const COUNSELING_CANCELLATION_REASON_LABEL = {
  [COUNSELING_CANCELLATION_REASON.PERSONAL]: '개인 사정',
  [COUNSELING_CANCELLATION_REASON.RESCHEDULE]: '일정 변경',
  [COUNSELING_CANCELLATION_REASON.OTHER]: '기타',
};

/** 학생 예약 조회·취소·일정 변경 API가 반환하는 업무 오류 코드. */
export const COUNSELING_RESERVATION_ERROR_CODE = {
  INVALID_INPUT: 'C001',
  SCHEDULE_NOT_AVAILABLE: 'S002',
  RESERVATION_NOT_FOUND: 'S003',
  CANCELLATION_NOT_ALLOWED: 'S004',
  FORBIDDEN: 'A004',
  /** 이미 처리(승인/반려)된 예약을 다시 승인·반려하려 할 때. 상담사 승인·반려 API 전용. */
  ALREADY_PROCESSED: 'S005',
};

/** 상담 회기의 출석 상태 — CounselingSessionResponse.attendanceStatus. */
export const COUNSELING_SESSION_ATTENDANCE_STATUS = {
  SCHEDULED: 'SCHEDULED',
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  NO_SHOW: 'NO_SHOW',
};

export const COUNSELING_SESSION_ATTENDANCE_STATUS_LABEL = {
  [COUNSELING_SESSION_ATTENDANCE_STATUS.SCHEDULED]: '예정',
  [COUNSELING_SESSION_ATTENDANCE_STATUS.PRESENT]: '출석',
  // ABSENT/NO_SHOW는 둘 다 '결석'으로 뭉뚱그리지 않는다. 사전 연락 여부가 다른 사유이므로 구분해서 보여준다.
  [COUNSELING_SESSION_ATTENDANCE_STATUS.ABSENT]: '사전 연락 결석',
  [COUNSELING_SESSION_ATTENDANCE_STATUS.NO_SHOW]: '사전 연락 없는 불참',
};

/** 상담 회기 자체의 상태 — CounselingSessionResponse.sessionStatus. */
export const COUNSELING_SESSION_STATUS = {
  PLANNED: 'PLANNED',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
};

export const COUNSELING_SESSION_STATUS_LABEL = {
  [COUNSELING_SESSION_STATUS.PLANNED]: '예정',
  [COUNSELING_SESSION_STATUS.COMPLETED]: '완료',
  [COUNSELING_SESSION_STATUS.CANCELED]: '취소',
};

/** 상담 회기 목록·상세·후속생성·완료·취소 API가 반환하는 업무 오류 코드. */
export const COUNSELING_SESSION_ERROR_CODE = {
  INVALID_INPUT: 'C001',
  UNAUTHENTICATED: 'A001',
  FORBIDDEN: 'A004',
  /** 배정 없음 또는 다른 상담사의 배정 */
  ASSIGNMENT_NOT_FOUND: 'S006',
  /** 회기 없음 또는 다른 상담사의 회기 */
  SESSION_NOT_FOUND: 'S007',
  /** 같은 상담사의 기존 일정·회기와 시간 중복 */
  TIME_CONFLICT: 'S002',
  /** 종료된 배정, PLANNED가 아닌 회기의 완료·취소, 미래 후속 회기 생성 등 상태 위반 */
  INVALID_STATE: 'S008',
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
 * @property {string[]} roleCodes 겸임 role_code 목록 (WP-82). 없으면 빈 배열([]), null 아님
 * @property {string|null} email
 * @property {string|null} phone
 * @property {string|null} department
 * @property {string|null} departmentName
 */
