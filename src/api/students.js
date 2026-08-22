import { apiClient } from './client';

/**
 * 학적 도메인 API.
 *
 * BE 회신(scms-be/docs/2026-08-22_academic-record-api-request.md "회신" 섹션) 기준으로
 * 이번 라운드엔 신규 테이블/컬럼 없이 기존 AppUser/StudentProfile/common_code(DEPARTMENT)
 * 로만 응답을 채웁니다. 화면은 원래 기획한 필드를 전부 그대로 두고, 아래 타입에서 실제
 * 보장되는 것만 "필수", 나머지는 "이번 라운드엔 항상 undefined — 화면은 InfoField의
 * `value ?? '-'` 폴백으로 처리"로 표시했습니다. 나중에 BE가 필드를 채우기 시작하면
 * 이 파일의 값만 실제로 채워지고 화면 쪽은 손댈 필요가 없습니다.
 *
 * 주의(회신 1장): `department`는 학과·단과대가 아니라 교내 행정 조직(학생역량센터/
 * 비교과운영부서/진로심리상담센터/취창업지원과) 4개 중 하나입니다. 화면에 "학과"로
 * 표기하지 마세요("소속"으로 표기).
 */

/**
 * @typedef {Object} AcademicHistoryEntry
 * @property {string} date        변동일자 (yyyy-MM-dd)
 * @property {string} code        변동코드 (입학/휴학/복학/졸업/제적/자퇴 등)
 * @property {string} reason      변동사유
 * @property {string} military    병무구분
 */

/**
 * @typedef {Object} MajorApplicationEntry
 * @property {string} type        구분 (복수전공/부전공/전과 등)
 * @property {string} department  신청 학과명
 * @property {string} appliedAt   신청일자 (yyyy-MM-dd)
 * @property {string} applied     신청여부/이수여부 라벨
 */

/**
 * @typedef {Object} AcademicRecordResponse
 * @property {string} studentId   보장됨 — AppUser.universityNo
 * @property {string} name        보장됨 — AppUser.userName
 * @property {string} phone       보장됨 — AppUser.phone
 * @property {string} email       보장됨 — AppUser.email
 * @property {string} department  보장됨 — 교내 행정 조직명(학과 아님)
 * @property {string} grade       보장됨 — StudentProfile.studentGrade 원문(String, 포맷 미확정)
 * @property {string} status      보장됨 — 재학/휴학/졸업/제적/자퇴
 * @property {string} [englishName]          미제공 — 항상 undefined
 * @property {string} [birthDate]            미제공
 * @property {string} [ssnMasked]            미제공
 * @property {number} [semestersCompleted]   미제공
 * @property {string} [admissionDate]        미제공
 * @property {string} [advisor]              미제공
 * @property {string} [doubleMajor]          미제공
 * @property {string} [address]              미제공
 * @property {string} [guardianPhone]        미제공 — 저장 엔드포인트도 없음(읽기 전용 취급)
 * @property {AcademicHistoryEntry[]} [history]            미제공
 * @property {MajorApplicationEntry[]} [majorApplications] 미제공
 */

/**
 * 로그인한 학생 본인의 학적 정보 조회. GET /api/students/academic-record
 * @returns {Promise<AcademicRecordResponse>}
 */
export const fetchMyAcademicRecord = async () => {
  const { data } = await apiClient.get('/students/academic-record');
  return data;
};

/**
 * @typedef {Object} StudentSummaryResponse
 * @property {string} studentId   보장됨
 * @property {string} name        보장됨
 * @property {string} department  보장됨 — 교내 행정 조직명(학과 아님)
 * @property {string} grade       보장됨
 * @property {string} status      보장됨
 * @property {number} [admissionYear] 미제공
 * @property {string} [advisor]       미제공
 */

/**
 * 교직원용 학생 목록 조회(학적 조회 화면). GET /api/admin/students
 * @param {Object} [params]
 * @param {string} [params.department] common_code(DEPARTMENT)의 code. 생략 시 전체.
 * @param {string} [params.grade]      원문 문자열 일치/부분 검색(포맷 미확정). 생략 시 전체.
 * @param {string} [params.status]     재학/휴학/졸업/제적/자퇴. 생략 시 전체.
 * @param {string} [params.keyword]    학번 또는 이름 부분 일치 검색어.
 * @param {number} [params.page]       0-base 페이지 번호.
 * @param {number} [params.size]       페이지당 건수.
 * @returns {Promise<{content: StudentSummaryResponse[], totalElements: number, totalPages: number}>}
 */
export const fetchStudentList = async (params) => {
  const { data } = await apiClient.get('/admin/students', { params });
  return data;
};

/**
 * 교직원용 학적 상태 요약(상단 통계 타일). GET /api/admin/students/summary
 * @returns {Promise<{total: number, byStatus: Record<string, number>}>}
 */
export const fetchStudentStatusSummary = async () => {
  const { data } = await apiClient.get('/admin/students/summary');
  return data;
};

/**
 * @typedef {Object} StudentDetailResponse
 * @property {string} studentId    보장됨
 * @property {string} name         보장됨
 * @property {string} phone        보장됨
 * @property {string} email        보장됨
 * @property {string} department   보장됨 — 교내 행정 조직명(학과 아님)
 * @property {string} grade        보장됨
 * @property {string} status       보장됨
 * @property {string} [englishName]          미제공
 * @property {string} [gender]               미제공
 * @property {string} [classGroup]           미제공
 * @property {string} [dayNight]             미제공
 * @property {string} [ssnMasked]            미제공 — 평문 조회 엔드포인트도 없음
 * @property {string} [admissionDate]        미제공
 * @property {string} [advisor]              미제공
 * @property {string} [doubleMajor]          미제공
 * @property {string} [homePhone]            미제공
 * @property {string} [nationality]          미제공
 * @property {string} [zipcode]              미제공
 * @property {string} [address]              미제공
 * @property {string} [highSchool]           미제공
 * @property {string} [highSchoolGradDate]   미제공
 * @property {number} [admissionScore]       미제공
 * @property {string} [admissionTypeDetail]  미제공
 * @property {string} [reenrollDate]         미제공
 * @property {string} [graduationDate]       미제공
 * @property {AcademicHistoryEntry[]} [history] 미제공
 */

/**
 * 교직원용 학적부관리 모달 상세 조회. GET /api/admin/students/{studentId}
 * @param {string} studentId
 * @returns {Promise<StudentDetailResponse>}
 */
export const fetchStudentDetail = async (studentId) => {
  const { data } = await apiClient.get(`/admin/students/${studentId}`);
  return data;
};
