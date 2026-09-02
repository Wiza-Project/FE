import { apiClient } from '@/api/client';

/**
 * 취창업 교직원/관리자 포털 API
 * 
 * 1. 채용공고 운영 관리 & 검수 (Staff Job Posting Operations)
 * 2. 공고별 지원자 목록 & 전형 관리 (Applicant Management)
 * 3. 협약기업 메타데이터 신규 등록 & 제휴 심사 (Company Management)
 */

/**
 * @typedef {Object} StaffJobPostingSearchCondition
 * @property {string} [reviewStatus] 검수 상태 (REQUESTED, APPROVED, REJECTED)
 * @property {string} [postingStatus] 게시 상태 (DRAFT, PUBLISHED, CLOSED)
 * @property {number} [ncsCodeId] NCS 직무 코드 ID
 * @property {number} [regionCodeId] 근무 지역 코드 ID
 * @property {string} [companyName] 기업명 검색 키워드
 * @property {number} [page=0] 페이지 번호 (0-indexed)
 * @property {number} [size=10] 페이지 당 건수
 *
 * @typedef {Object} PageResponse
 * @property {Array} content 데이터 목록
 * @property {number} page 현재 페이지 번호
 * @property {number} size 페이지 크기
 * @property {number} totalElements 전체 데이터 건수
 * @property {number} totalPages 전체 페이지 수
 * @property {boolean} first 첫 페이지 여부
 * @property {boolean} last 마지막 페이지 여부
 */

/**
 * [교직원] 채용공고 전체 및 검수 목록 조회
 * GET /api/staff/career/job-postings
 * @param {StaffJobPostingSearchCondition} [params]
 * @returns {Promise<PageResponse>}
 */
export const getStaffJobPostings = (params) =>
  apiClient.get('/staff/career/job-postings', { params }).then((res) => res.data);

/**
 * @typedef {Object} JobPostingCreateRequest
 * @property {number} companyAccountId 기업 ID
 * @property {string} postingTitle 채용공고 제목
 * @property {number} ncsCodeId NCS 직무 분류 코드 ID
 * @property {number} regionCodeId 근무 지역 코드 ID
 * @property {string} jobDescription 직무 상세 기술서 (자격요건/우대사항/상세 본문 포함)
 * @property {string} employmentType 고용 형태 (정규직/계약직/인턴 등)
 * @property {string} salaryInfo 급여 조건
 * @property {string} workLocation 근무지 상세 주소
 * @property {string} applicationStartsAt 접수 시작일시 (ISO 8601)
 * @property {string} applicationEndsAt 접수 마감일시 (ISO 8601)
 * @property {('GENERAL'|'RECOMMENDED')} postingType 공고 구분 (일반/추천)
 */

/**
 * [교직원] 채용공고 신규 등록 (구인 신청 접수)
 * POST /api/staff/career/job-postings
 * @param {JobPostingCreateRequest} payload
 * @returns {Promise<number>} 생성된 jobPostingId
 */
export const createJobPosting = (payload) =>
  apiClient.post('/staff/career/job-postings', payload).then((res) => res.data);

/**
 * [교직원] 채용공고 내용 수정
 * PUT /api/staff/career/job-postings/{jobPostingId}
 * @param {number} jobPostingId
 * @param {JobPostingCreateRequest} payload
 * @returns {Promise<void>}
 */
export const updateJobPosting = (jobPostingId, payload) =>
  apiClient.put(`/staff/career/job-postings/${jobPostingId}`, payload).then((res) => res.data);

/**
 * @typedef {Object} JobPostingReviewRequest
 * @property {('APPROVED'|'REJECTED')} reviewStatus 검수 심사 상태
 * @property {string} [rejectionReason] 반려 사유 (REJECTED 시 필수)
 */

/**
 * [교직원] 채용공고 검수 (승인/반려) 처리
 * PATCH /api/staff/career/job-postings/{jobPostingId}/review
 * @param {number} jobPostingId
 * @param {JobPostingReviewRequest} payload
 * @returns {Promise<void>}
 */
export const reviewJobPosting = (jobPostingId, payload) =>
  apiClient.patch(`/staff/career/job-postings/${jobPostingId}/review`, payload).then((res) => res.data);

/**
 * [교직원] 채용공고 삭제
 * DELETE /api/staff/career/job-postings/{jobPostingId}
 * @param {number} jobPostingId
 * @returns {Promise<void>}
 */
export const deleteJobPosting = (jobPostingId) =>
  apiClient.delete(`/staff/career/job-postings/${jobPostingId}`).then((res) => res.data);

/**
 * @typedef {Object} ApplicantSearchCondition
 * @property {string} [applicationStatus] 전형 상태 (APPLIED, UNDER_REVIEW, PASSED, REJECTED, CANCELED)
 * @property {number} [page=0] 페이지 번호
 * @property {number} [size=10] 페이지 크기
 */

/**
 * [교직원] 공고별 지원자 목록 및 전형 단계 조회
 * GET /api/staff/career/postings/{jobPostingId}/applicants
 * @param {number} jobPostingId
 * @param {ApplicantSearchCondition} [params]
 * @returns {Promise<PageResponse>}
 */
export const getApplicantsByJobPosting = (jobPostingId, params) =>
  apiClient.get(`/staff/career/postings/${jobPostingId}/applicants`, { params }).then((res) => res.data);

/**
 * @typedef {Object} CompanySearchCondition
 * @property {string} [companyName] 기업명 검색 키워드
 * @property {('PENDING'|'VERIFIED'|'REJECTED')} [verificationStatus] 제휴 심사 상태
 * @property {number} [page=0] 페이지 번호
 * @property {number} [size=10] 페이지 크기
 */

/**
 * [교직원] 기업 목록 검색 및 페이징 조회
 * GET /api/staff/career/companies
 * @param {CompanySearchCondition} [params]
 * @returns {Promise<PageResponse>}
 */
export const getCompanies = (params) =>
  apiClient.get('/staff/career/companies', { params }).then((res) => res.data);

/**
 * @typedef {Object} CompanyDetailResponse
 * @property {number} companyAccountId 기업 식별자
 * @property {string} companyName 기업명
 * @property {string} businessNumber 사업자등록번호
 * @property {string} ceoName 대표자명
 * @property {string} industry 업종
 * @property {string} [companyScale] 기업 규모
 * @property {string} [address] 기업 본사 주소
 * @property {string} [contactEmail] 담당자 이메일
 * @property {string} [contactPhone] 담당자 연락처
 * @property {('PENDING'|'VERIFIED'|'REJECTED')} verificationStatus 심사 상태
 * @property {string} [rejectionReason] 반려 사유
 * @property {string} [verifiedAt] 심사 일시
 */

/**
 * [교직원] 협약기업 단건 상세 조회
 * GET /api/staff/career/companies/{companyAccountId}
 * @param {number} companyAccountId
 * @returns {Promise<CompanyDetailResponse>}
 */
export const getCompanyDetail = (companyAccountId) =>
  apiClient.get(`/staff/career/companies/${companyAccountId}`).then((res) => res.data);

/**
 * @typedef {Object} CompanyRegisterRequest
 * @property {string} companyName 기업명
 * @property {string} businessNumber 사업자등록번호 (10자리 숫자)
 * @property {string} ceoName 대표자명
 * @property {string} industry 업종
 * @property {string} [companyScale] 기업 규모 (대기업/중견기업/중소기업/스타트업)
 * @property {string} [address] 기업 주소
 * @property {string} [contactEmail] 담당자 이메일
 * @property {string} [contactPhone] 담당자 연락처
 */

/**
 * [교직원] 협약기업 신규 등록
 * POST /api/staff/career/companies
 * @param {CompanyRegisterRequest} payload
 * @returns {Promise<number>} 생성된 companyAccountId
 */
export const registerCompany = (payload) =>
  apiClient.post('/staff/career/companies', payload).then((res) => res.data);

/**
 * @typedef {Object} CompanyVerifyRequest
 * @property {('VERIFIED'|'REJECTED')} verificationStatus 심사 결과
 * @property {string} [rejectionReason] 반려 사유 (REJECTED 시 필수)
 */

/**
 * [교직원] 협약기업 제휴 심사 (승인/반려)
 * PATCH /api/staff/career/companies/{companyAccountId}/verify
 * @param {number} companyAccountId
 * @param {CompanyVerifyRequest} payload
 * @returns {Promise<void>}
 */
export const verifyCompany = (companyAccountId, payload) =>
  apiClient.patch(`/staff/career/companies/${companyAccountId}/verify`, payload).then((res) => res.data);

// 화면 호환용 별칭 - 불필요 시 삭제
export const fetchStaffJobPostings = getStaffJobPostings;
export const fetchApplicantsByJobPosting = getApplicantsByJobPosting;
export const fetchCompanies = getCompanies;
export const fetchCompanyDetail = getCompanyDetail;