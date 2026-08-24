import { apiClient } from './client';

/**
 * 학적 도메인 API.
 
 */

/**
 * @typedef {Object} AcademicChangeEntry
 * @property {number} no                 1부터 매겨진 순번(오래된 순)
 * @property {string} changeDate         변동일자 (yyyy-MM-dd)
 * @property {string} changeTypeCode     변동유형 코드 (AC100 입학 / AC200 휴학 / AC300 복학 / AC400 졸업 / AC500 제적 / AC600 자퇴)
 * @property {string} changeTypeName     변동유형명
 * @property {string} [changeReasonCode] 변동사유 코드 (변동유형의 하위 코드)
 * @property {string} [changeReasonName] 변동사유명
 * @property {string} [militaryStatus]   병무구분 (군휴학/군복학 행에만 값 존재)
 * @property {number} [scheduledReturnYear]         복학예정 학년도 (휴학 행에만)
 * @property {string} [scheduledReturnSemesterCode] 복학예정 학기코드 (휴학 행에만)
 * @property {string} [note]             비고
 */

/**
 * 학생 본인 조회(GET /students/academic-record)와 교직원 상세 조회
 * (GET /admin/students/{userId})가 공통으로 쓰는 응답 모양.
 *
 * `student_academic_detail` 행이 없는 학생도 404가 아니라 이 모양 그대로 받고,
 * 신상정보 관련 필드만 전부 null이 된다 — `value ?? '-'` 폴백으로 처리하면 된다.
 *
 * @typedef {Object} AcademicRecordResponse
 * @property {string} studentId              app_user.university_no
 * @property {string} name
 * @property {string} phone
 * @property {string} email
 * @property {string} status                 재학/휴학/졸업/제적/자퇴
 * @property {string} [majorCode]            MAJOR 공통코드. 학과 미입력이면 null
 * @property {string} [majorName]
 * @property {number} [grade]                1~4. 미입력이면 null
 * @property {string} [residentNoMasked]     "030412-1******" 형태. 평문 조회 없음
 * @property {string} [zipcode]
 * @property {string} [addressBasic]
 * @property {string} [addressDetail]
 * @property {string} [guardianPhone]        수정 API는 후속 티켓 — 읽기 전용 취급
 * @property {string} [advisorName]
 * @property {number} [completedSemesters]
 * @property {boolean} semesterExceeded       completedSemesters > 8 (4년제 고정)
 * @property {string} [degreeName]           졸업생만
 * @property {string} [degreeNo]             졸업생만
 * @property {string} [admissionDate]        AC100(입학) 최초 행의 change_date
 * @property {string} [graduationDate]       AC400(졸업) 행의 change_date
 * @property {string} [admissionType]        최초 변동 행의 변동사유
 * @property {number} [curriculumYear]       입학연도
 * @property {string} [latestChangeReason]   최신 변동 행의 변동사유(없으면 변동유형명)
 * @property {number} [scheduledReturnYear]           최신 휴학 행에서만
 * @property {string} [scheduledReturnSemesterCode]   최신 휴학 행에서만
 * @property {AcademicChangeEntry[]} changes          오래된 순 정렬
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
 * @typedef {Object} StudentListItem
 * @property {number} userId      상세 조회(GET /admin/students/{userId})에 쓰는 내부 PK. 학번이 아님
 * @property {string} studentId   화면 표시용 학번
 * @property {string} name
 * @property {string} phone
 * @property {string} email
 * @property {string} status
 * @property {string} [majorCode]
 * @property {string} [majorName]
 * @property {number} [grade]
 * @property {string} [admissionDate]
 */

/**
 * 교직원용 학생 목록 조회(학적 조회 화면). GET /api/admin/students
 * @param {Object} [params]
 * @param {number} [params.majorCodeId] MAJOR 공통코드의 codeId. 생략 시 전체.
 * @param {number} [params.grade]       1~4. 생략 시 전체.
 * @param {string} [params.status]      재학/휴학/졸업/제적/자퇴. 생략 시 전체.
 * @param {string} [params.keyword]     학번 또는 이름 부분 일치 검색어.
 * @param {number} [params.page]        0-base 페이지 번호.
 * @param {number} [params.size]        페이지당 건수.
 * @returns {Promise<{content: StudentListItem[], page: number, size: number,
 *   totalElements: number, totalPages: number, first: boolean, last: boolean}>}
 */
export const fetchStudentList = async (params) => {
  const { data } = await apiClient.get('/admin/students', { params });
  return data;
};

/**
 * 교직원용 학적 상태 요약(상단 통계 타일). GET /api/admin/students/summary
 * `byStatus`는 재학/휴학/졸업/제적/자퇴 5개 라벨을 항상 포함한다(0명이어도 0).
 * @returns {Promise<{total: number, byStatus: Record<'재학'|'휴학'|'졸업'|'제적'|'자퇴', number>}>}
 */
export const fetchStudentStatusSummary = async () => {
  const { data } = await apiClient.get('/admin/students/summary');
  return data;
};

/**
 * 교직원용 학적부관리 모달 상세 조회. GET /api/admin/students/{userId}
 * `AcademicRecordResponse`와 응답 모양이 같다. 대상 user_id가 없거나 학생이 아니면
 * U001(USER_NOT_FOUND, HTTP 404) — 이건 `student_academic_detail` 행이 없는 것과는
 * 다른 케이스(그건 404가 아니라 필드가 null인 200 응답).
 * @param {number|string} userId 목록 응답의 `userId` (학번이 아님)
 * @returns {Promise<AcademicRecordResponse>}
 */
export const fetchStudentDetail = async (userId) => {
  const { data } = await apiClient.get(`/admin/students/${userId}`);
  return data;
};
