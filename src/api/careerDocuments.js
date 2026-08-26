import { apiClient, downloadFile } from './client';

/**
 * 취창업 자기소개서·포트폴리오 API.
 */

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
 * 내 자기소개서 목록(버전 이력) 조회. GET /api/v1/students/me/cover-letters
 * 서버가 버전 최신순으로 정렬해 내려준다.
 * @param {Object} [params]
 * @param {number} [params.page] 0-base 페이지 번호 (기본 0)
 * @param {number} [params.size] 페이지당 건수 (기본 50 — 버전 이력이 많지 않아 넉넉히 잡음)
 * @returns {Promise<PageResponse & {content: CoverLetterSummary[]}>}
 */
export const fetchCoverLetters = async (params) => {
  const { data } = await apiClient.get('/v1/students/me/cover-letters', {
    params: { page: 0, size: 50, ...params },
  });
  return data;
};

/**
 * 내 최신 버전 자기소개서 조회. GET /api/v1/students/me/cover-letters/latest
 * @returns {Promise<CoverLetterDetail>}
 */
export const fetchLatestCoverLetter = async () => {
  const { data } = await apiClient.get('/v1/students/me/cover-letters/latest');
  return data;
};

/**
 * 자기소개서 특정 버전 상세 조회. GET /api/v1/students/me/cover-letters/{documentId}
 * @param {number} documentId
 * @returns {Promise<CoverLetterDetail>}
 */
export const fetchCoverLetter = async (documentId) => {
  const { data } = await apiClient.get(`/v1/students/me/cover-letters/${documentId}`);
  return data;
};

/**
 * 자기소개서 최초 작성(버전 1). POST /api/v1/students/me/cover-letters
 * 이미 작성된 이력이 있으면 실패한다 — 이후 새 버전은 createCoverLetterVersion을 쓴다.
 * @param {Object} payload
 * @param {string} payload.documentTitle
 * @param {CoverLetterQuestion[]} payload.questions 1개 이상
 * @param {boolean} [payload.aiAssistanceUsed]
 * @returns {Promise<CoverLetterDetail>}
 */
export const createCoverLetter = async (payload) => {
  const { data } = await apiClient.post('/v1/students/me/cover-letters', payload);
  return data;
};

/**
 * 자기소개서 내용 수정(새 버전을 만들지 않고 지정한 버전을 그대로 덮어씀).
 * PUT /api/v1/students/me/cover-letters/{documentId}
 * @param {number} documentId
 * @param {Object} payload
 * @param {string} payload.documentTitle
 * @param {CoverLetterQuestion[]} payload.questions 1개 이상
 * @param {boolean} [payload.aiAssistanceUsed]
 * @returns {Promise<CoverLetterDetail>}
 */
export const updateCoverLetter = async (documentId, payload) => {
  const { data } = await apiClient.put(`/v1/students/me/cover-letters/${documentId}`, payload);
  return data;
};

/**
 * 새 버전 생성. POST /api/v1/students/me/cover-letters/{documentId}/versions
 * 지정한 버전의 현재 내용을 스냅샷하여 새 버전을 만든다(과거 버전 지정 시 그 내용으로 복원하는 효과).
 * 응답에 새로 생성된 버전 전체가 담겨오므로 별도 재조회 없이 바로 선택에 쓸 수 있다.
 * @param {number} documentId 기준이 되는 버전의 문서 ID
 * @returns {Promise<CoverLetterDetail>}
 */
export const createCoverLetterVersion = async (documentId) => {
  const { data } = await apiClient.post(`/v1/students/me/cover-letters/${documentId}/versions`);
  return data;
};

/**
 * 자기소개서 삭제. DELETE /api/v1/students/me/cover-letters/{documentId}
 * @param {number} documentId
 * @returns {Promise<null>}
 */
export const deleteCoverLetter = async (documentId) => {
  const { data } = await apiClient.delete(`/v1/students/me/cover-letters/${documentId}`);
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
 * 내 포트폴리오 목록 조회. GET /api/v1/students/me/portfolios
 * 서버가 최종 수정순(updatedAt desc)으로 정렬해 내려준다.
 * 목록 응답에는 contentData(설명·기술태그 등)가 포함되지 않는다 — 상세는 fetchPortfolio로 조회.
 * @param {Object} [params]
 * @param {number} [params.page]
 * @param {number} [params.size]
 * @returns {Promise<PageResponse & {content: PortfolioSummary[]}>}
 */
export const fetchPortfolios = async (params) => {
  const { data } = await apiClient.get('/v1/students/me/portfolios', {
    params: { page: 0, size: 50, ...params },
  });
  return data;
};

/**
 * 포트폴리오 항목 단건 상세(첨부파일 포함) 조회. GET /api/v1/students/me/portfolios/{documentId}
 * @param {number} documentId
 * @returns {Promise<PortfolioDetail>}
 */
export const fetchPortfolio = async (documentId) => {
  const { data } = await apiClient.get(`/v1/students/me/portfolios/${documentId}`);
  return data;
};

/**
 * 포트폴리오 항목 생성. POST /api/v1/students/me/portfolios
 * 생성 요청에는 공개 여부·첨부파일이 포함되지 않는다 — 생성 후 필요 시
 * uploadPortfolioAttachments / updatePortfolioVisibility를 이어서 호출한다.
 * @param {Object} payload
 * @param {string} payload.documentTitle
 * @param {PortfolioContentData} [payload.contentData]
 * @param {boolean} [payload.aiAssistanceUsed]
 * @returns {Promise<PortfolioDetail>}
 */
export const createPortfolio = async (payload) => {
  const { data } = await apiClient.post('/v1/students/me/portfolios', payload);
  return data;
};

/**
 * 포트폴리오 항목 수정. PUT /api/v1/students/me/portfolios/{documentId}
 * 공개 여부는 이 요청에 포함되지 않는다 — updatePortfolioVisibility를 따로 호출한다.
 * @param {number} documentId
 * @param {Object} payload
 * @param {string} payload.documentTitle
 * @param {PortfolioContentData} [payload.contentData]
 * @param {boolean} [payload.aiAssistanceUsed]
 * @returns {Promise<PortfolioDetail>}
 */
export const updatePortfolio = async (documentId, payload) => {
  const { data } = await apiClient.put(`/v1/students/me/portfolios/${documentId}`, payload);
  return data;
};

/**
 * 포트폴리오 공개 여부 변경. PATCH /api/v1/students/me/portfolios/{documentId}/visibility
 * @param {number} documentId
 * @param {boolean} isPublic
 * @returns {Promise<PortfolioDetail>}
 */
export const updatePortfolioVisibility = async (documentId, isPublic) => {
  const { data } = await apiClient.patch(
    `/v1/students/me/portfolios/${documentId}/visibility`,
    { isPublic },
  );
  return data;
};

/**
 * 포트폴리오 삭제(첨부파일 포함). DELETE /api/v1/students/me/portfolios/{documentId}
 * @param {number} documentId
 * @returns {Promise<null>}
 */
export const deletePortfolio = async (documentId) => {
  const { data } = await apiClient.delete(`/v1/students/me/portfolios/${documentId}`);
  return data;
};

/**
 * 포트폴리오 첨부파일 업로드(이미지/PDF). POST /api/v1/students/me/portfolios/{documentId}/attachments
 * 항목이 먼저 생성되어 있어야 호출할 수 있다(=fileGroupId 선발급 방식이 아님).
 * @param {number} documentId
 * @param {File[]} files
 * @returns {Promise<PortfolioDetail>} 첨부파일이 반영된 최신 상세
 */
export const uploadPortfolioAttachments = async (documentId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const { data } = await apiClient.post(
    `/v1/students/me/portfolios/${documentId}/attachments`,
    formData,
    { headers: { 'Content-Type': undefined } },
  );
  return data;
};

/**
 * 포트폴리오 첨부파일 다운로드.
 * GET /api/v1/students/me/portfolios/{documentId}/attachments/{storedFileId}
 * @param {number} documentId
 * @param {number} storedFileId
 * @param {string} fallbackName 서버가 파일명을 안 줄 때 사용할 이름
 */
export const downloadPortfolioAttachment = (documentId, storedFileId, fallbackName) =>
  downloadFile(
    `/v1/students/me/portfolios/${documentId}/attachments/${storedFileId}`,
    fallbackName,
  );
