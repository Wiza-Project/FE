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

/** 동의 정책 모듈 코드 — 백엔드 ConsentModuleCode enum 기준. 코드 분기용 상수. */
export const CONSENT_MODULE_CODE = {
  COMMON: 'COMMON',
  ASSESSMENT: 'ASSESSMENT',
  COUNSELING: 'COUNSELING',
  CAREER: 'CAREER',
  PROGRAM: 'PROGRAM',
};

/** 동의 정책 유형 — 백엔드 ConsentType enum 기준. 코드 분기용 상수. */
export const CONSENT_TYPE = {
  PERSONAL_INFO: 'PERSONAL_INFO',
  TERMS_OF_SERVICE: 'TERMS_OF_SERVICE',
};

/**
 * 프로그램 신청 API가 반환하는 업무 오류 코드.
 * REQUIRED_CONSENT_NOT_AGREED: PROGRAM 모듈 필수 동의(TERMS_OF_SERVICE, PERSONAL_INFO)를
 * 모두 마치지 않은 상태로 신청했을 때. 정상 플로우에서는 FE가 신청 전에 동의를 먼저 처리하므로
 * 발생하지 않아야 하지만, 서버가 같은 트랜잭션에서 다시 검증하므로 방어적으로 처리한다.
 */
export const PROGRAM_APPLICATION_ERROR_CODE = {
  REQUIRED_CONSENT_NOT_AGREED: 'U009',
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

/** 상담 예약·일정 API가 반환하는 업무 오류 코드. */
export const COUNSELING_RESERVATION_ERROR_CODE = {
  INVALID_INPUT: 'C001',
  SCHEDULE_NOT_AVAILABLE: 'S002',
  RESERVATION_NOT_FOUND: 'S003',
  CANCELLATION_NOT_ALLOWED: 'S004',
  FORBIDDEN: 'A004',
  /** 이미 처리(승인/반려)된 예약을 다시 승인·반려하려 할 때. 상담사 승인·반려 API 전용. */
  ALREADY_PROCESSED: 'S005',
  /** 동일 정책에 동시에 동의 요청이 들어와 충돌한 경우. 동의(POST /consents) API 전용. */
  CONSENT_CONFLICT: 'U012',
  /** (일정 수정 전용) 예약 행 잠금 후 확인한 현재 일정이 요청의 expectedScheduleId와 달라 stale. 자동 재시도 금지, 사용자가 최신 기준으로 다시 선택해야 한다. */
  RESERVATION_SCHEDULE_CONFLICT: 'S013',
  /** 활성 상담 유형 또는 상담사 일정 관리 API의 대상 일정을 찾을 수 없을 때. */
  RESOURCE_NOT_FOUND: 'C002',
  /** 학번 불일치·비활성 계정·학생이 아닌 계정. 이유를 구분하지 않는다. 상담사 학번 조회·대행 예약 API 전용. */
  USER_NOT_FOUND: 'U001',
  /** 학생에게 현재 유효한 COUNSELING+PERSONAL_INFO 동의가 없음. 상담사 대행 예약 생성 API 전용. */
  REQUIRED_CONSENT_NOT_AGREED: 'U009',
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

/**
 * 비공개 상담 기록의 상태 — CounselingPrivateRecordResponse.recordStatus.
 * 서버가 DB 상태 컬럼이 아니라 응답에서 계산해 내려준다(행 없음=EMPTY, 미확정=DRAFT, 확정=CONFIRMED).
 * 화면 분기(읽기전용 확정본 vs 편집 초안)에 문자열 리터럴 대신 이 상수를 쓴다.
 */
export const COUNSELING_PRIVATE_RECORD_STATUS = {
  EMPTY: 'EMPTY',
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
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
  /** 비공개 기록 전용. 회기·출결·배정·기록 상태가 요청과 맞지 않음(최신 서버 상태 재조회 필요) */
  CONFLICT: 'S009',
};

/** 학생 진단 응시(attempt)의 서버 상태 — AssessmentAttempt.attemptStatus. */
export const ASSESSMENT_ATTEMPT_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  SCORED: 'SCORED',
};

/**
 * 회기별 공개 상담 결과의 상태 — CounselorCounselingPublicResultResponse.resultStatus.
 * DB 상태 컬럼이 아니라 서버가 계산해 내려준다(행 없음=EMPTY, 미공개=DRAFT, 공개=PUBLISHED).
 * 학생 응답에는 이 필드가 없다(학생은 PUBLISHED만 조회하므로 항상 공개 상태).
 */
export const COUNSELING_PUBLIC_RESULT_STATUS = {
  EMPTY: 'EMPTY',
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
};

export const COUNSELING_PUBLIC_RESULT_STATUS_LABEL = {
  [COUNSELING_PUBLIC_RESULT_STATUS.EMPTY]: '결과 없음',
  [COUNSELING_PUBLIC_RESULT_STATUS.DRAFT]: '초안(비공개)',
  [COUNSELING_PUBLIC_RESULT_STATUS.PUBLISHED]: '공개됨',
};

/** 공개 상담 결과·예약 완료 6개 API가 공통으로 반환하는 업무 오류 코드. */
export const COUNSELING_PUBLIC_RESULT_ERROR_CODE = {
  INVALID_INPUT: 'C001',
  /** 비활성 계정 또는 역할 없음 */
  FORBIDDEN: 'A004',
  /** 상담사 기준 없는 회기 또는 다른 상담사의 회기 */
  SESSION_NOT_FOUND: 'S007',
  /** 허용되지 않은 회기·결과·예약·배정 상태, 비공개 기록 미확정, 최종 대상 불일치, 남은 PLANNED 회기 */
  STATE_CONFLICT: 'S010',
  /** 학생 기준 없는·다른 학생의·미공개 결과 */
  RESULT_NOT_FOUND: 'S011',
  /** 정정 전용. 정규화한 요약·실행계획이 최신 버전과 완전히 같아 거절됨(기본 메시지: 수정한 내역이 없습니다.) */
  NO_CHANGES: 'S012',
};

/** ------------------------------ CAREER 취창업 도메인 상수 + 에러코드  ------------------------------ */

/**
 * 구인공고 구분 (JobPosting.postingType)
 */
export const POSTING_TYPE = {
  GENERAL: 'GENERAL',
  RECOMMENDED: 'RECOMMENDED',
};

export const POSTING_TYPE_LABEL = {
  [POSTING_TYPE.GENERAL]: '일반채용',
  [POSTING_TYPE.RECOMMENDED]: '추천채용',
};

/**
 * 채용공고 게시/진행 상태 (JobPosting.postingStatus)
 */
export const JOB_POSTING_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
};

export const JOB_POSTING_STATUS_LABEL = {
  [JOB_POSTING_STATUS.DRAFT]: '임시저장',
  [JOB_POSTING_STATUS.PUBLISHED]: '모집중',
  [JOB_POSTING_STATUS.CLOSED]: '마감',
};

/**
 * 교직원 채용공고 검수 상태 (JobPosting.reviewStatus)
 */
export const JOB_POSTING_REVIEW_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

export const JOB_POSTING_REVIEW_STATUS_LABEL = {
  [JOB_POSTING_REVIEW_STATUS.REQUESTED]: '검수대기',
  [JOB_POSTING_REVIEW_STATUS.APPROVED]: '승인완료',
  [JOB_POSTING_REVIEW_STATUS.REJECTED]: '반려',
};

/**
 * 학생 온라인 지원 상태 (StudentJobRelation.applicationStatus)
 */
export const JOB_APPLICATION_STATUS = {
  APPLIED: 'APPLIED',
  CANCELED: 'CANCELED',
};

export const JOB_APPLICATION_STATUS_LABEL = {
  [JOB_APPLICATION_STATUS.APPLIED]: '지원완료',
  [JOB_APPLICATION_STATUS.CANCELED]: '지원취소',
};

/**
 * 협약기업 심사 상태 (CompanyAccount.verificationStatus)
 */
export const COMPANY_VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
};

export const COMPANY_VERIFICATION_STATUS_LABEL = {
  [COMPANY_VERIFICATION_STATUS.PENDING]: '심사대기',
  [COMPANY_VERIFICATION_STATUS.VERIFIED]: '협약승인',
  [COMPANY_VERIFICATION_STATUS.REJECTED]: '반려',
};

/**
 * 기업 계정 활성 상태 (CompanyAccount.accountStatus)
 */
export const COMPANY_ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
};

export const COMPANY_ACCOUNT_STATUS_LABEL = {
  [COMPANY_ACCOUNT_STATUS.ACTIVE]: '정상',
  [COMPANY_ACCOUNT_STATUS.INACTIVE]: '정지',
};

/**
 * 취창업 도메인 업무 오류 코드 (ErrorCode.java J### 체계 기준)
 */
export const CAREER_ERROR_CODE = {
  /** 구인공고를 찾을 수 없습니다. */
  JOB_POSTING_NOT_FOUND: 'J001',
  /** 포트폴리오를 찾을 수 없습니다. */
  PORTFOLIO_NOT_FOUND: 'J002',
  /** 이미 제출한 만족도 조사입니다. */
  SURVEY_ALREADY_SUBMITTED: 'J003',
  /** 이미 승인/게시된 공고는 수정할 수 없습니다. */
  CANNOT_MODIFY_APPROVED_POSTING: 'J004',
  /** 이미 마감된 채용공고입니다. */
  JOB_POSTING_ALREADY_CLOSED: 'J005',
  /** 유효하지 않은 검수 상태값입니다. */
  INVALID_REVIEW_STATUS: 'J006',
  /** 신청 종료 일시는 시작 일시보다 빠를 수 없습니다. */
  INVALID_APPLICATION_PERIOD: 'J007',
  /** 존재하지 않는 기업 계정입니다. */
  COMPANY_ACCOUNT_NOT_FOUND: 'J008',
  /** 게시(승인)되지 않은 공고에는 지원할 수 없습니다. */
  JOB_POSTING_NOT_PUBLISHED: 'J009',
  /** 접수 마감 기간이 경과하여 지원 또는 취소할 수 없습니다. */
  APPLICATION_PERIOD_EXPIRED: 'J010',
  /** 이미 해당 채용공고에 지원 완료된 상태입니다. */
  JOB_POSTING_ALREADY_APPLIED: 'J011',
  /** 채용 지원 이력을 찾을 수 없거나 이미 취소된 상태입니다. */
  JOB_POSTING_APPLICATION_NOT_FOUND: 'J012',
  /** 이미 등록된 사업자등록번호입니다. */
  DUPLICATE_COMPANY_ACCOUNT_NO: 'J013',
  /** 자기소개서를 찾을 수 없습니다. */
  COVER_LETTER_NOT_FOUND: 'J014',
  /** 이미 작성된 자기소개서가 있습니다. 버전 관리 기능을 이용해주세요. */
  COVER_LETTER_ALREADY_EXISTS: 'J015',
  /** 저장이 동시에 처리되어 실패했습니다. 다시 시도해주세요. */
  DOCUMENT_VERSION_CONFLICT: 'J016',
  /** 이력서를 찾을 수 없습니다. */
  RESUME_NOT_FOUND: 'J017',
  /** 이미 작성된 이력서가 있습니다. 버전 관리 기능을 이용해주세요. */
  RESUME_ALREADY_EXISTS: 'J018',
  /** 최신 이력서 버전만 수정할 수 있습니다. */
  RESUME_NOT_LATEST_VERSION: 'J019',
};


/**
 * 스트레스 자가진단 문항·제출·이력 API가 반환하는 업무 오류 코드.
 * 결과 수준(resultLevel)은 서버가 계산한 한국어 문자열을 그대로 표시하므로 별도 enum·라벨을 두지 않는다.
 */
export const STRESS_TEST_ERROR_CODE = {
  INVALID_INPUT: 'C001',
  REQUIRED_CONSENT_NOT_AGREED: 'U009',
  NOT_AVAILABLE: 'S014',
  /** 동일 정책에 동시에 동의 요청이 들어와 충돌한 경우. 제출 직전 동의 재검증 흐름에서 발생할 수 있다. */
  CONSENT_CONFLICT: 'U012',
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
 * @property {boolean} commonConsentCompleted 현재 유효한 COMMON 필수 약관 전부에 동의했는지
 */
