import { apiClient, downloadFile } from './client';

/**
 * 취창업 이력서·자기소개서·포트폴리오 API.
 */

// ─── 이력서 (Resume) ─────────────────────────────────────────────────────────

/**
 * 이력서 contentData는 서버가 검증하는 고정 템플릿이다.
 * 템플릿에 없는 값은 extra에만 담을 수 있다 
 *
 * @typedef {Object} ResumeContact
 * @property {string} name 성명(필수, 최대 50자) — 학사행정 연동 값이 아니라 이력서에 직접 입력한다.
 * @property {string} [phoneNumber] 예) "010-1234-5678" (하이픈 생략 허용)
 * @property {string} [email]
 * @property {string} [address] 최대 200자
 *
 * @typedef {Object} ResumeEducation
 * @property {string} schoolName 필수, 최대 100자
 * @property {string} [major] 최대 100자
 * @property {string} [admissionDate] 'YYYY-MM-DD'
 * @property {string} [graduationDate] 'YYYY-MM-DD'
 * @property {string} [enrollmentStatus] 최대 20자. 예) "재학중", "졸업"
 *
 * @typedef {Object} ResumeCareer
 * @property {string} companyName 필수, 최대 100자
 * @property {string} [position] 최대 100자
 * @property {string} [startDate] 'YYYY-MM-DD'
 * @property {string} [endDate] 'YYYY-MM-DD'
 * @property {string} [description] 최대 500자
 *
 * @typedef {Object} ResumeCertification
 * @property {string} certificationName 필수, 최대 100자
 * @property {string} [issuer] 최대 100자
 * @property {string} [acquiredDate] 'YYYY-MM-DD'
 *
 * @typedef {Object} ResumeLanguageTest
 * @property {string} testName 필수, 최대 100자. 예) "TOEIC"
 * @property {string} [score] 최대 20자. 시험별 표기 그대로("905", "AL" 등)
 * @property {string} [acquiredDate] 'YYYY-MM-DD'
 *
 * @typedef {Object} ResumeContentData 고정 이력서 템플릿 본문
 * @property {ResumeContact} [contact]
 * @property {ResumeEducation[]} [educations]
 * @property {ResumeCareer[]} [careers]
 * @property {ResumeCertification[]} [certifications]
 * @property {ResumeLanguageTest[]} [languageTests]
 * @property {Object} [extra] 템플릿에 없는 값 전용 자유 JSON. 예) { portfolioUrl: "https://..." }
 *
 * @typedef {Object} ResumeSummary
 * @property {number} careerDocumentId
 * @property {string} documentTitle
 * @property {number} versionNo
 * @property {string} updatedAt ISO 8601 (KST)
 *
 * @typedef {Object} ResumeDetail
 * @property {number} careerDocumentId
 * @property {string} documentTitle
 * @property {number} versionNo
 * @property {ResumeContentData} contentData
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * 내 이력서 목록(버전 이력) 조회. GET /api/students/me/resumes
 * 서버가 버전 최신순으로 정렬해 내려준다.
 * @param {Object} [params]
 * @param {number} [params.page] 0-base 페이지 번호 (기본 0)
 * @param {number} [params.size] 페이지당 건수 (기본 50 — 버전 이력이 많지 않아 넉넉히 잡음)
 * @returns {Promise<PageResponse & {content: ResumeSummary[]}>}
 */
export const fetchResumes = async (params) => {
  const { data } = await apiClient.get('/students/me/resumes', {
    params: { page: 0, size: 50, ...params },
  });
  return data;
};

/**
 * 내 최신 버전 이력서 조회. GET /api/students/me/resumes/latest
 * @returns {Promise<ResumeDetail>}
 */
export const fetchLatestResume = async () => {
  const { data } = await apiClient.get('/students/me/resumes/latest');
  return data;
};

/**
 * 이력서 특정 버전 상세 조회. GET /api/students/me/resumes/{documentId}
 * @param {number} documentId
 * @returns {Promise<ResumeDetail>}
 */
export const fetchResume = async (documentId) => {
  const { data } = await apiClient.get(`/students/me/resumes/${documentId}`);
  return data;
};

/**
 * 이력서 최초 작성(버전 1). POST /api/students/me/resumes
 * 이미 작성된 이력이 있으면 실패한다(J018) — 이후 새 버전은 createResumeVersion을 쓴다.
 * @param {Object} payload
 * @param {string} payload.documentTitle
 * @param {ResumeContentData} [payload.contentData]
 * @returns {Promise<ResumeDetail>}
 */
export const createResume = async (payload) => {
  const { data } = await apiClient.post('/students/me/resumes', payload);
  return data;
};

/**
 * 이력서 임시 저장(새 버전을 만들지 않고 지정한 버전을 그대로 덮어씀).
 * PUT /api/students/me/resumes/{documentId}
 * @param {number} documentId
 * @param {Object} payload
 * @param {string} payload.documentTitle
 * @param {ResumeContentData} [payload.contentData]
 * @returns {Promise<ResumeDetail>}
 */
export const updateResume = async (documentId, payload) => {
  const { data } = await apiClient.put(`/students/me/resumes/${documentId}`, payload);
  return data;
};

/**
 * 새 버전 생성. POST /api/students/me/resumes/{documentId}/versions
 * 지정한 버전의 현재(저장된) 내용을 그대로 스냅샷하여 새 버전을 만든다 — 아직 저장하지 않은
 * 화면상의 수정값은 반영되지 않으므로, 반영하려면 먼저 updateResume으로 임시 저장해야 한다.
 * 응답에 새로 생성된 버전 전체가 담겨오므로 별도 재조회 없이 바로 선택에 쓸 수 있다.
 * @param {number} documentId 기준이 되는 버전의 문서 ID
 * @returns {Promise<ResumeDetail>}
 */
export const createResumeVersion = async (documentId) => {
  const { data } = await apiClient.post(`/students/me/resumes/${documentId}/versions`);
  return data;
};

/**
 * 이력서 특정 버전 삭제. DELETE /api/students/me/resumes/{documentId}
 * 지정한 그 버전 한 건만 삭제한다 — 다른 버전에는 영향이 없다.
 * @param {number} documentId
 * @returns {Promise<null>}
 */
export const deleteResume = async (documentId) => {
  const { data } = await apiClient.delete(`/students/me/resumes/${documentId}`);
  return data;
};

// ─── 자기소개서 (Cover Letter) ──────────────────────────────────────────────

/**
 * @typedef {Object} CoverLetterQuestion
 * @property {string} [questionId] 문항 식별자(프론트 정의값, 예: "Q1")
 * @property {string} question 문항 내용
 * @property {string} [answer] 답변 본문
 * @property {number} [characterCount] 답변 글자수(서버가 answer 길이로 계산 — 요청 시 값은 무시됨)
 *
 * @typedef {Object} CoverLetterSummary
 * @property {number} careerDocumentId
 * @property {string} documentTitle
 * @property {number} versionNo
 * @property {boolean} aiAssistanceUsed
 * @property {string} updatedAt ISO 8601 (KST)
 *
 * @typedef {Object} CoverLetterDetail
 * @property {number} careerDocumentId
 * @property {number} studentUserId
 * @property {string} documentTitle
 * @property {number} versionNo
 * @property {CoverLetterQuestion[]} questions
 * @property {boolean} aiAssistanceUsed
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * @typedef {Object} PageResponse
 * @property {Array} content
 * @property {number} page
 * @property {number} size
 * @property {number} totalElements
 * @property {number} totalPages
 * @property {boolean} first
 * @property {boolean} last
 */

/**
 * 내 자기소개서 목록(버전 이력) 조회. GET /api/students/me/cover-letters
 * 서버가 버전 최신순으로 정렬해 내려준다.
 * @param {Object} [params]
 * @param {number} [params.page] 0-base 페이지 번호 (기본 0)
 * @param {number} [params.size] 페이지당 건수 (기본 50 — 버전 이력이 많지 않아 넉넉히 잡음)
 * @returns {Promise<PageResponse & {content: CoverLetterSummary[]}>}
 */
export const fetchCoverLetters = async (params) => {
  const { data } = await apiClient.get('/students/me/cover-letters', {
    params: { page: 0, size: 50, ...params },
  });
  return data;
};

/**
 * 내 최신 버전 자기소개서 조회. GET /api/students/me/cover-letters/latest
 * @returns {Promise<CoverLetterDetail>}
 */
export const fetchLatestCoverLetter = async () => {
  const { data } = await apiClient.get('/students/me/cover-letters/latest');
  return data;
};

/**
 * 자기소개서 특정 버전 상세 조회. GET /api/students/me/cover-letters/{documentId}
 * @param {number} documentId
 * @returns {Promise<CoverLetterDetail>}
 */
export const fetchCoverLetter = async (documentId) => {
  const { data } = await apiClient.get(`/students/me/cover-letters/${documentId}`);
  return data;
};

/**
 * 자기소개서 최초 작성(버전 1). POST /api/students/me/cover-letters
 * 이미 작성된 이력이 있으면 실패한다 — 이후 새 버전은 createCoverLetterVersion을 쓴다.
 * @param {Object} payload
 * @param {string} payload.documentTitle
 * @param {CoverLetterQuestion[]} payload.questions 1개 이상
 * @param {boolean} [payload.aiAssistanceUsed]
 * @returns {Promise<CoverLetterDetail>}
 */
export const createCoverLetter = async (payload) => {
  const { data } = await apiClient.post('/students/me/cover-letters', payload);
  return data;
};

/**
 * 자기소개서 내용 수정(새 버전을 만들지 않고 지정한 버전을 그대로 덮어씀).
 * PUT /api/students/me/cover-letters/{documentId}
 * @param {number} documentId
 * @param {Object} payload
 * @param {string} payload.documentTitle
 * @param {CoverLetterQuestion[]} payload.questions 1개 이상
 * @param {boolean} [payload.aiAssistanceUsed]
 * @returns {Promise<CoverLetterDetail>}
 */
export const updateCoverLetter = async (documentId, payload) => {
  const { data } = await apiClient.put(`/students/me/cover-letters/${documentId}`, payload);
  return data;
};

/**
 * 새 버전 생성. POST /api/students/me/cover-letters/{documentId}/versions
 * 지정한 버전의 현재 내용을 스냅샷하여 새 버전을 만든다(과거 버전 지정 시 그 내용으로 복원하는 효과).
 * 응답에 새로 생성된 버전 전체가 담겨오므로 별도 재조회 없이 바로 선택에 쓸 수 있다.
 * @param {number} documentId 기준이 되는 버전의 문서 ID
 * @returns {Promise<CoverLetterDetail>}
 */
export const createCoverLetterVersion = async (documentId) => {
  const { data } = await apiClient.post(`/students/me/cover-letters/${documentId}/versions`);
  return data;
};

/**
 * 자기소개서 삭제. DELETE /api/students/me/cover-letters/{documentId}
 * @param {number} documentId
 * @returns {Promise<null>}
 */
export const deleteCoverLetter = async (documentId) => {
  const { data } = await apiClient.delete(`/students/me/cover-letters/${documentId}`);
  return data;
};

// ─── 포트폴리오 (Portfolio) ──────────────────────────────────────────────────

/**
 * @typedef {Object} PortfolioContentData 자유 JSON 구조 — 이 화면에서 쓰는 필드만 정리
 * @property {string} [description]
 * @property {string} [periodStart] 'YYYY-MM-DD'
 * @property {string} [periodEnd] 'YYYY-MM-DD'
 * @property {string[]} [skills]
 * @property {string} [externalUrl]
 *
 * @typedef {Object} PortfolioAttachment
 * @property {number} storedFileId
 * @property {string} originalFileName
 * @property {string} contentType
 * @property {number} fileSize byte
 *
 * @typedef {Object} PortfolioSummary
 * @property {number} careerDocumentId
 * @property {string} documentTitle
 * @property {number} versionNo 항목 순번(버전 번호 필드를 재사용 — 포트폴리오엔 버전 개념 없음)
 * @property {number} attachmentCount
 * @property {string} updatedAt
 * @property {boolean} isPublic
 *
 * @typedef {Object} PortfolioDetail
 * @property {number} careerDocumentId
 * @property {number} studentUserId
 * @property {string} documentTitle
 * @property {number} versionNo
 * @property {PortfolioContentData} contentData
 * @property {boolean} aiAssistanceUsed
 * @property {PortfolioAttachment[]} attachments
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {boolean} isPublic
 */

/**
 * 내 포트폴리오 목록 조회. GET /api/students/me/portfolios
 * 서버가 최종 수정순(updatedAt desc)으로 정렬해 내려준다.
 * 목록 응답에는 contentData(설명·기술태그 등)가 포함되지 않는다 — 상세는 fetchPortfolio로 조회.
 * @param {Object} [params]
 * @param {number} [params.page]
 * @param {number} [params.size]
 * @returns {Promise<PageResponse & {content: PortfolioSummary[]}>}
 */
export const fetchPortfolios = async (params) => {
  const { data } = await apiClient.get('/students/me/portfolios', {
    params: { page: 0, size: 50, ...params },
  });
  return data;
};

/**
 * 포트폴리오 항목 단건 상세(첨부파일 포함) 조회. GET /api/students/me/portfolios/{documentId}
 * @param {number} documentId
 * @returns {Promise<PortfolioDetail>}
 */
export const fetchPortfolio = async (documentId) => {
  const { data } = await apiClient.get(`/students/me/portfolios/${documentId}`);
  return data;
};

/**
 * 포트폴리오 항목 생성. POST /api/students/me/portfolios
 * 생성 요청에는 공개 여부·첨부파일이 포함되지 않는다 — 생성 후 필요 시
 * uploadPortfolioAttachments / updatePortfolioVisibility를 이어서 호출한다.
 * @param {Object} payload
 * @param {string} payload.documentTitle
 * @param {PortfolioContentData} [payload.contentData]
 * @param {boolean} [payload.aiAssistanceUsed]
 * @returns {Promise<PortfolioDetail>}
 */
export const createPortfolio = async (payload) => {
  const { data } = await apiClient.post('/students/me/portfolios', payload);
  return data;
};

/**
 * 포트폴리오 항목 수정. PUT /api/students/me/portfolios/{documentId}
 * 공개 여부는 이 요청에 포함되지 않는다 — updatePortfolioVisibility를 따로 호출한다.
 * @param {number} documentId
 * @param {Object} payload
 * @param {string} payload.documentTitle
 * @param {PortfolioContentData} [payload.contentData]
 * @param {boolean} [payload.aiAssistanceUsed]
 * @returns {Promise<PortfolioDetail>}
 */
export const updatePortfolio = async (documentId, payload) => {
  const { data } = await apiClient.put(`/students/me/portfolios/${documentId}`, payload);
  return data;
};

/**
 * 포트폴리오 공개 여부 변경. PATCH /api/students/me/portfolios/{documentId}/visibility
 * @param {number} documentId
 * @param {boolean} isPublic
 * @returns {Promise<PortfolioDetail>}
 */
export const updatePortfolioVisibility = async (documentId, isPublic) => {
  const { data } = await apiClient.patch(
    `/students/me/portfolios/${documentId}/visibility`,
    { isPublic },
  );
  return data;
};

/**
 * 포트폴리오 삭제(첨부파일 포함). DELETE /api/students/me/portfolios/{documentId}
 * @param {number} documentId
 * @returns {Promise<null>}
 */
export const deletePortfolio = async (documentId) => {
  const { data } = await apiClient.delete(`/students/me/portfolios/${documentId}`);
  return data;
};

/**
 * 포트폴리오 첨부파일 업로드(이미지/PDF). POST /api/students/me/portfolios/{documentId}/attachments
 * 항목이 먼저 생성되어 있어야 호출할 수 있다(=fileGroupId 선발급 방식이 아님).
 * @param {number} documentId
 * @param {File[]} files
 * @returns {Promise<PortfolioDetail>} 첨부파일이 반영된 최신 상세
 */
export const uploadPortfolioAttachments = async (documentId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const { data } = await apiClient.post(
    `/students/me/portfolios/${documentId}/attachments`,
    formData,
    { headers: { 'Content-Type': undefined } },
  );
  return data;
};

/**
 * 포트폴리오 첨부파일 다운로드.
 * GET /api/students/me/portfolios/{documentId}/attachments/{storedFileId}
 * @param {number} documentId
 * @param {number} storedFileId
 * @param {string} fallbackName 서버가 파일명을 안 줄 때 사용할 이름
 */
export const downloadPortfolioAttachment = (documentId, storedFileId, fallbackName) =>
  downloadFile(
    `/students/me/portfolios/${documentId}/attachments/${storedFileId}`,
    fallbackName,
  );

// ─── 핵심역량 진단 결과 연동 (Resume Competency Sync) ────────────────────────
// 이력서 화면 전용 읽기 모델이다 — CareerDocument(이력서 본문·버전)와는 별개 테이블이라
// 여기서 받은 값은 이력서 contentData나 버전 생성 흐름에 포함하지 않는다.

/**
 * @typedef {Object} ResumeCompetencyScore
 * @property {number} competencyId
 * @property {string} competencyName
 * @property {number} displayOrder 역량 표시 순서 — 응답 배열 순서에 기대지 말고 이 값으로 정렬한다.
 * @property {number} convertedScore 0~100 환산 점수
 *
 * @typedef {Object} ResumeCompetency
 * @property {'READY'|'UNAVAILABLE'|'NOT_SYNCED'} status
 *   READY: 연동된 최신 완료 진단 결과 있음 / UNAVAILABLE: 연동은 했으나 완료 진단이 없음 /
 *   NOT_SYNCED: 아직 한 번도 연동되지 않음(재연동 이전의 최초 상태)
 * @property {number} [attemptId] status가 READY일 때만
 * @property {string} [assessmentName] status가 READY일 때만
 * @property {number} [academicYear] status가 READY일 때만
 * @property {string} [semesterLabel] status가 READY일 때만
 * @property {string} [assessmentPhase] status가 READY일 때만
 * @property {string} [submittedAt] ISO 8601. 진단 제출일시 — status가 READY일 때만
 * @property {number} [overallAverageScore] status가 READY일 때만
 * @property {ResumeCompetencyScore[]} [scores] status가 READY일 때만
 * @property {string} [reason] status가 UNAVAILABLE일 때만. 현재 유일값 "NO_COMPLETED_ASSESSMENT"
 * @property {string} [syncedAt] ISO 8601. 이 결과가 마지막으로 갱신된 시각(NOT_SYNCED면 없음)
 */

/**
 * 저장된 최신 핵심역량 연동 결과를 그대로 조회한다 — 호출로 인한 재연동은 일어나지 않는다.
 * GET /api/students/me/resume/competency
 * @returns {Promise<ResumeCompetency>}
 */
export const fetchResumeCompetency = async () => {
  const { data } = await apiClient.get('/students/me/resume/competency');
  return data;
};

/**
 * 핵심역량 도메인에 최신 완료 진단을 다시 요청한다("재연동" 버튼).
 * 이벤트 처리가 동기로 이뤄져 응답에 반영된 최신 결과가 바로 담겨 온다.
 * POST /api/students/me/resume/competency
 * @returns {Promise<ResumeCompetency>}
 */
export const resyncResumeCompetency = async () => {
  const { data } = await apiClient.post('/students/me/resume/competency');
  return data;
};

// ─── 비교과 활동 이력 연동 (Resume Extracurricular Activities) ─────────────────

/**
 * @typedef {Object} ResumeExtracurricularActivity
 * @property {number} applicationId
 * @property {number} programId
 * @property {string} programName 프로그램명
 * @property {string} programTypeCode
 * @property {string} programTypeName 프로그램 유형
 * @property {number} competencyId
 * @property {string} competencyName 연계 핵심역량
 * @property {string} operationStartedAt ISO 8601 — 운영 기간 시작
 * @property {string} operationEndedAt ISO 8601 — 운영 기간 종료(=화면의 "이수일")
 * @property {string} operatingDepartmentName 운영부서
 */

/**
 * 이력서 화면의 "비교과 활동 이력" 카드가 쓰는 자동 연동 조회.
 * GET /api/students/me/resume/extracurricular-activities
 * 서버가 표시할 순서로 이미 정렬해 내려준다는 전제 — 프론트에서 별도로 재정렬하지 않고
 * 응답 배열 순서 그대로 렌더링한다.
 * @returns {Promise<ResumeExtracurricularActivity[]>}
 */
export const fetchResumeExtracurricularActivities = async () => {
  const { data } = await apiClient.get('/students/me/resume/extracurricular-activities');
  return data;
};
