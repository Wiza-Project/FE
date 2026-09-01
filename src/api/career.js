import { apiClient } from '@/api/client';

/**
 * 취창업 학생 포털 API (채용공고 탐색, AI 맞춤 매칭, 온라인 지원 및 스크랩, 취업 희망조건)
 * 
 * 1. 채용공고 탐색 & AI 추천 (Job Postings & Recommendations)
 * 2. 온라인 입사지원 & 스크랩 (Applications & Scraps)
 * 3. 취업 희망조건 (Career Preference - 단건 Upsert)
 */

/**
 * @typedef {Object} JobPostingSearchCondition
 * @property {number} [ncsCodeId] NCS 직무분류 코드 ID
 * @property {number} [regionCodeId] 근무 지역 코드 ID
 * @property {string} [companyName] 기업명 검색 키워드
 * @property {('GENERAL'|'RECOMMENDED')} [postingType] 공고 유형 (일반/추천채용)
 * @property {string} [employmentType] 고용 형태 (정규직/계약직/인턴 등)
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
 * [학생] 채용공고 목록 조회 (검색/페이징)
 * GET /api/students/career/job-postings
 * @param {JobPostingSearchCondition} [params] Spring Pageable 및 검색 조건 파라미터
 * @returns {Promise<PageResponse>}
 */
export const getJobPostings = (params) =>
  apiClient.get('/students/career/job-postings', { params }).then((res) => res.data);

/**
 * @typedef {Object} JobPostingDetail
 * @property {number} jobPostingId 공고 식별자
 * @property {string} postingTitle 공고 제목
 * @property {string} companyName 기업명
 * @property {string} [companyLogoUrl] 기업 로고 URL
 * @property {string} jobDescription 직무 상세 기술서 (자격요건/우대사항 통합 본문)
 * @property {string} [benefits] 추천채용 혜택/복리후생
 * @property {string} employmentType 고용 형태
 * @property {string} salaryInfo 급여 조건
 * @property {string} workLocation 상세 근무지 주소
 * @property {string} applicationStartsAt 접수 시작일시 (ISO 8601)
 * @property {string} applicationEndsAt 접수 마감일시 (ISO 8601)
 * @property {boolean} [isApplied] 지원 여부
 * @property {boolean} [isScrapped] 스크랩 여부
 */

/**
 * [학생] 채용공고 단건 상세 조회
 * GET /api/students/career/job-postings/{jobPostingId}
 * @param {number} id jobPostingId
 * @returns {Promise<JobPostingDetail>}
 */
export const getJobPostingDetail = (id) =>
  apiClient.get(`/students/career/job-postings/${id}`).then((res) => res.data);

/**
 * @typedef {Object} JobPostingSummary
 * @property {number} jobPostingId 공고 식별자
 * @property {string} postingTitle 공고 제목
 * @property {string} companyName 기업명
 * @property {string} [companyLogoUrl] 기업 로고 이미지 URL
 * @property {string} ncsCodeName 직무 분류명
 * @property {string} regionCodeName 근무 지역명
 * @property {('GENERAL'|'RECOMMENDED')} postingType 공고 구분
 * @property {('DRAFT'|'PUBLISHED'|'CLOSED')} postingStatus 공고 진행 상태
 * @property {string} applicationStartsAt 접수 시작일시 (ISO 8601)
 * @property {string} applicationEndsAt 접수 마감일시 (ISO 8601)
 * @property {boolean} [isScrapped] 관심 공고 스크랩 여부
 */

/**
 * [학생] AI 맞춤 추천 채용공고 조회
 * GET /api/students/career/matching/recommendations
 * @returns {Promise<Array<JobPostingSummary>>}
 */
export const getRecommendedPostings = () =>
  apiClient.get('/students/career/matching/recommendations').then((res) => res.data);

/**
 * @typedef {Object} JobRelationRequest
 * @property {number} jobPostingId 지원할 채용공고 식별자
 * @property {number} [careerDocumentId] 첨부할 서류/자기소개서 ID
 * @property {string} [coverLetter] 자기소개서 내용
 * @property {string} [portfolioUrl] 포트폴리오 URL
 *
 * @typedef {Object} JobRelationResponse
 * @property {number} applicationId 입사지원 식별자
 * @property {number} jobPostingId 채용공고 식별자
 * @property {string} postingTitle 채용공고 제목
 * @property {string} companyName 지원 기업명
 * @property {('APPLIED'|'UNDER_REVIEW'|'PASSED'|'REJECTED'|'CANCELED')} applicationStatus 전형 진행 상태
 * @property {string} appliedAt 지원 일시 (ISO 8601)
 */

/**
 * [학생] 채용공고 온라인 지원 신청
 * POST /api/students/career/applications
 * @param {JobRelationRequest} payload
 * @returns {Promise<JobRelationResponse>}
 */
export const applyJobPosting = (payload) =>
  apiClient.post('/students/career/applications', payload).then((res) => res.data);

/**
 * [학생] 채용공고 지원 취소 (접수 마감 전)
 * DELETE /api/students/career/applications/{jobPostingId}
 * @param {number} jobPostingId
 * @returns {Promise<void>}
 */
export const cancelJobApplication = (jobPostingId) =>
  apiClient.delete(`/students/career/applications/${jobPostingId}`).then((res) => res.data);

/**
 * @typedef {Object} JobScrapToggleResponse
 * @property {number} jobPostingId 채용공고 식별자
 * @property {boolean} isScrapped 변경된 스크랩 상태 (true: 보관, false: 해제)
 */

/**
 * [학생] 관심공고 스크랩 등록/해제 토글
 * POST /api/students/career/scraps/{jobPostingId}
 * @param {number} jobPostingId
 * @returns {Promise<JobScrapToggleResponse>}
 */
export const toggleJobScrap = (jobPostingId) =>
  apiClient.post(`/students/career/scraps/${jobPostingId}`).then((res) => res.data);

/**
 * @typedef {Object} JobScrapSummary
 * @property {number} jobPostingId 채용공고 식별자
 * @property {string} postingTitle 채용공고 제목
 * @property {string} companyName 기업명
 * @property {string} applicationEndsAt 접수 마감일시 (ISO 8601)
 * @property {string} scrappedAt 스크랩 일시 (ISO 8601)
 */

/**
 * [학생] 내 관심공고 스크랩 목록 조회 (마감임박순)
 * GET /api/students/career/scraps
 * @param {Object} [params] Spring Pageable 파라미터 (page, size)
 * @returns {Promise<PageResponse>}
 */
export const getMyJobScraps = (params) =>
  apiClient.get('/students/career/scraps', { params }).then((res) => res.data);

/**
 * [학생] 내 온라인 지원 내역 목록 조회 (최신지원순)
 * GET /api/students/career/applications
 * @param {Object} [params] Spring Pageable 파라미터 (page, size, sort)
 * @returns {Promise<PageResponse>}
 */
export const getMyJobApplications = (params) =>
  apiClient.get('/students/career/applications', { params }).then((res) => res.data);

/**
 * @typedef {Object} JobPreference
 * @property {number} [studentUserId] 학생 식별자
 * @property {string} desiredIndustry 희망 업종
 * @property {string} desiredRole 희망 직무
 * @property {string} desiredRegion 희망 근무 지역
 * @property {number} [desiredSalary] 희망 연봉 (단위: 만원)
 * @property {string} [employmentType] 희망 고용형태
 * @property {string} [updatedAt] 최종 수정일시
 */

/**
 * [학생] 취업 희망조건 조회
 * GET /api/students/career/preference
 * @returns {Promise<JobPreference>}
 */
export const getJobPreference = () =>
  apiClient.get('/students/career/preference').then((res) => res.data);

/**
 * [학생] 취업 희망조건 등록 및 수정
 * PUT /api/students/career/preference
 * @param {JobPreference} payload
 * @returns {Promise<JobPreference>}
 */
export const saveJobPreference = (payload) =>
  apiClient.put('/students/career/preference', payload).then((res) => res.data);

/**
 * [학생] CAREER 모듈의 PROFILING 동의 상태 및 일시 조회
 * GET /api/students/consents/status?moduleCode=CAREER&consentType=PROFILING
 */
export const getProfilingConsentStatus = () =>
  apiClient.get('/students/consents/status', {
    params: { moduleCode: 'CAREER', consentType: 'PROFILING' }
  }).then((res) => res.data);

// 화면 호환용 별칭 - 불필요 시 삭제
export const getJobBookmarks = getMyJobScraps;
export const fetchJobPostings = getJobPostings;
export const fetchJobPosting = getJobPostingDetail;
export const fetchRecommendedPostings = getRecommendedPostings;
export const fetchJobPreference = getJobPreference;