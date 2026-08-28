import { apiClient, downloadFile } from './client';

/**
 * 게시판(공지사항·FAQ) API.
 *
 * 백엔드가 board_post 테이블 하나로 공지사항·FAQ를 함께 관리하는 공통 게시판 엔진이다
 * (boardType 값: 'NOTICE', 'FAQ'). 조회(GET)는 학생·교직원이 함께 쓰는 공용 엔드포인트이고,
 * 등록/수정/삭제만 /admin 하위 전용 엔드포인트로 분리되어 있다 — 그래서 이 파일에서도 조회 함수를
 * 학생 화면(NoticePage 등)과 교직원 관리 화면(StaffBoardsPage 등) 양쪽에서 그대로 재사용한다.
 *
 * 최종 스펙 출처: 백엔드팀 API 문서(WP-220, 공통 게시판 엔진, scms-be
 * feat/WP-220-notice-board). 이전에 "가정"으로 채워 넣었던 boardCode/categoryId 기반
 * 스펙(구 버전)은 전부 boardType/categoryCode 기반으로 교체됐다 — FAQ 카테고리는
 * 게시판 API가 아니라 공통코드(FAQ_CATEGORY 그룹)로 관리되며, 게시판 쪽에는 카테고리
 * 등록/수정/삭제 API가 없다(§ fetchFaqCategories 참고).
 */

// ─── 게시글 조회 (학생·교직원 공용) ───────────────────────────────────────────

/**
 * @typedef {Object} BoardPostSummary 목록 항목(BoardPostListItemResponse). 상세보다 필드가 적다 —
 *   boardType/moduleCode/createdAt은 상세 응답에만 있다.
 * @property {number} postId
 * @property {string|null} [categoryCode] FAQ 전용
 * @property {string|null} [categoryName] FAQ 전용
 * @property {string} title 공지: 제목 / FAQ: 질문
 * @property {string} authorName 항상 존재(null 없음)
 * @property {boolean} [pinned] 공지 전용. 상단 고정 여부(FAQ는 항상 false)
 * @property {string} postStatus 'DRAFT'|'PUBLISHED'|'HIDDEN'. 로그인한 사용자가 STAFF면
 *   DRAFT·HIDDEN 게시글도 함께 내려오고, 그 외 사용자에게는 PUBLISHED만 보인다.
 * @property {string} postStatusLabel postStatus의 한글 라벨('게시중' 등)
 * @property {boolean} [hasAttachment] 공지 전용. 첨부파일 존재 여부
 * @property {string|null} publishedAt ISO-8601. DB 컬럼이 아니라 postStatus==='PUBLISHED'일 때만
 *   채워지는 파생값(그 값은 createdAt과 같다) — DRAFT/HIDDEN이면 항상 null이다. 목록에서
 *   "작성일"로 이 필드를 쓰고, null이면 날짜 대신 postStatusLabel 배지로 상태를 보여준다.
 * @property {string} updatedAt ISO-8601
 *
 * @typedef {Object} BoardPostPage
 * @property {BoardPostSummary[]} content
 * @property {number} page 0부터 시작
 * @property {number} size
 * @property {number} totalElements
 * @property {number} totalPages
 * @property {boolean} first
 * @property {boolean} last
 */

/**
 * 게시글 목록 조회. GET /api/boards/{boardType}/posts?page&size&keyword&categoryCode&moduleCode
 * categoryCode는 FAQ, moduleCode는 NOTICE에서만 의미가 있다(생략 시 'GLOBAL'). 이 화면
 * 스코프는 전역 공지만 다루므로 moduleCode는 항상 생략한다.
 *
 * 정렬은 서버가 고정한다 — NOTICE: 상단고정 우선 → 등록일 내림차순, FAQ: 카테고리
 * 정렬순 → 상단고정 → 수정일 내림차순. 교직원 관리 화면의 목록도 이 함수를 그대로
 * 재사용한다 — 관리자 전용 목록 조회 엔드포인트는 따로 없다. 로그인한 사용자가 STAFF면
 * 서버가 DRAFT·HIDDEN 게시글까지 함께 내려주고, 그 외 사용자에게는 PUBLISHED만 보인다.
 *
 * @param {string} boardType 'NOTICE' | 'FAQ'
 * @param {Object} [params]
 * @param {number} [params.page=0]
 * @param {number} [params.size=10] 이 함수의 기본값. 서버 기본값은 20이지만 화면에서 항상
 *   명시적으로 넘긴다.
 * @param {string} [params.keyword] 제목+본문 부분 일치
 * @param {string} [params.categoryCode] FAQ 전용
 * @param {string} [params.moduleCode] NOTICE 전용. 이 화면에서는 사용하지 않는다.
 * @returns {Promise<BoardPostPage>}
 */
export const fetchBoardPosts = async (boardType, { page = 0, size = 10, keyword, categoryCode, moduleCode } = {}) => {
  const { data } = await apiClient.get(`/boards/${boardType}/posts`, {
    params: {
      page,
      size,
      keyword: keyword || undefined,
      categoryCode: categoryCode || undefined,
      moduleCode: moduleCode || undefined,
    },
  });
  return data;
};

/**
 * @typedef {Object} BoardAttachment
 * @property {number} storedFileId
 * @property {string} originalFileName
 * @property {string} contentType
 * @property {number} fileSize byte
 *
 * @typedef {Object} BoardPostDetail BoardPostDetailResponse. 목록보다 boardType/moduleCode/
 *   createdAt/attachments가 더 있다.
 * @property {number} postId
 * @property {string} boardType 'NOTICE' | 'FAQ'
 * @property {string} [moduleCode] NOTICE 전용. 기본 'GLOBAL'.
 * @property {string|null} [categoryCode] FAQ 전용
 * @property {string|null} [categoryName] FAQ 전용
 * @property {string} title
 * @property {string} content 본문(공지) 또는 답변(FAQ). HTML 에디터 없이 plain text로
 *   저장·응답한다 — 화면에서는 줄바꿈만 살리는 white-space:pre-wrap으로 렌더링한다.
 *   HTML 에디터가 도입되면 다시 협의해야 한다.
 * @property {string} authorName 항상 존재(null 없음)
 * @property {boolean} [pinned] 공지 전용
 * @property {string} postStatus 'DRAFT'|'PUBLISHED'|'HIDDEN'
 * @property {string} postStatusLabel
 * @property {BoardAttachment[]} [attachments] 공지 전용
 * @property {string|null} publishedAt ISO-8601. postStatus==='PUBLISHED'일 때만 createdAt과
 *   같은 값, 아니면 null(BoardPostSummary 참고)
 * @property {string} createdAt ISO-8601
 * @property {string} updatedAt ISO-8601
 */

/**
 * 게시글 상세 조회. GET /api/boards/{boardType}/posts/{postId}
 * 다른 게시판(boardType)의 글이거나 없는 postId면 404(B003/B004). 학생이 DRAFT/HIDDEN
 * 글을 조회해도 존재를 노출하지 않기 위해 동일하게 404가 내려온다.
 * @param {string} boardType
 * @param {number} postId
 * @returns {Promise<BoardPostDetail>}
 */
export const fetchBoardPost = async (boardType, postId) => {
  const { data } = await apiClient.get(`/boards/${boardType}/posts/${postId}`);
  return data;
};

/**
 * @typedef {Object} FaqCategory BoardCategoryResponse
 * @property {string} categoryCode
 * @property {string} categoryName
 * @property {number} displayOrder
 * @property {boolean} active 비활성 카테고리는 학생 화면 칩 목록에서 제외한다.
 */

/**
 * FAQ 카테고리 목록 조회. GET /api/boards/{boardType}/categories
 * FAQ에서만 의미가 있다 — NOTICE로 부르면 항상 빈 배열이라 이 함수는 boardType을
 * 받지 않고 항상 'FAQ'로 고정 호출한다.
 *
 * 이 목록은 common_code(code_group=FAQ_CATEGORY)를 그대로 노출하는 읽기 전용
 * 뷰이며, 게시판 API에는 카테고리 등록/수정/삭제 엔드포인트가 없다 — 카테고리
 * 추가·수정·비활성화는 공통코드 관리 화면/API로 해야 하는데, 이 프로젝트에는 아직
 * 그 화면/API가 없다(src/api/commonCode.js는 조회(GET)만 제공). 백엔드팀 확인이
 * 필요한 상태다(FaqCategoryManager.jsx 참고).
 *
 * @returns {Promise<FaqCategory[]>}
 */
export const fetchFaqCategories = async () => {
  const { data } = await apiClient.get('/boards/FAQ/categories');
  return data;
};

/**
 * 게시글 첨부파일 다운로드. GET /api/files/{storedFileId}/download
 * @param {number} storedFileId
 * @param {string} fallbackName 서버가 파일명을 안 줄 때 사용할 이름
 */
export const downloadBoardFile = (storedFileId, fallbackName) =>
  downloadFile(`/files/${storedFileId}/download`, fallbackName);

// ─── 게시글 관리 (교직원 전용) ────────────────────────────────────────────────

/**
 * 게시글 등록. POST /api/admin/boards/{boardType}/posts
 *
 * 같은 경로에 Content-Type만 다른 두 핸들러가 있어 서버가 자동 분기한다 — 첨부파일이
 * 있을 때만 multipart/form-data로 보낸다(JSON 필드는 "request" part(Blob,
 * application/json), 파일은 "files" part, 최대 5개/이미지·PDF만). 첨부가 없으면(FAQ
 * 등록, 첨부 없는 공지 등) 기존 API들과 동일하게 순수 JSON으로 보낸다.
 *
 * categoryCode는 FAQ에서만(NOTICE에 보내면 400 C001), pinned:true는 NOTICE에서만
 * 허용된다(FAQ에 보내면 400 B005). postStatus를 생략하면 서버가 PUBLISHED로 처리한다.
 *
 * @param {string} boardType 'NOTICE' | 'FAQ'
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} payload.content
 * @param {boolean} [payload.pinned] 공지 전용
 * @param {string} [payload.categoryCode] FAQ 전용
 * @param {'DRAFT'|'PUBLISHED'|'HIDDEN'} [payload.postStatus] 생략 시 PUBLISHED
 * @param {File[]} [payload.files] 공지 전용 신규 첨부파일(최대 5개)
 * @returns {Promise<BoardPostDetail>}
 */
export const createBoardPost = async (boardType, { files, ...fields }) => {
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append('request', new Blob([JSON.stringify(fields)], { type: 'application/json' }));
    files.forEach((file) => formData.append('files', file));
    const { data } = await apiClient.post(`/admin/boards/${boardType}/posts`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  }
  const { data } = await apiClient.post(`/admin/boards/${boardType}/posts`, fields);
  return data;
};

/**
 * 게시글 수정. PATCH /api/admin/boards/{boardType}/posts/{postId}
 * 등록과 마찬가지로 JSON/multipart 둘 다 받는다. null 필드는 "변경하지 않음"이라는
 * 뜻이라 이 함수는 실제로 바뀐 필드만 담아 보내는 걸 전제로 한다(화면에서는 편의상
 * 전체 필드를 매번 다시 보낸다 — 값이 그대로면 서버에서도 결과가 같다).
 *
 * removeFileIds는 이번에 삭제할 기존 첨부파일의 storedFileId 목록이고, 같은 요청의
 * files part로 새 파일을 동시에 추가할 수 있다(삭제 후 추가 순으로 처리). 이 글의
 * 첨부가 아닌 storedFileId를 넣으면 404(B007)로 거절된다.
 *
 * categoryCode 자체를 비우는 것만으로는 카테고리 연결이 풀리지 않는다 — 이 화면은
 * FAQ 카테고리를 필수값으로 다뤄 연결 해제(clearCategoryCode) 기능은 쓰지 않는다.
 *
 * @param {string} boardType
 * @param {number} postId
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} payload.content
 * @param {boolean} [payload.pinned] 공지 전용
 * @param {string} [payload.categoryCode] FAQ 전용
 * @param {'DRAFT'|'PUBLISHED'|'HIDDEN'} [payload.postStatus]
 * @param {File[]} [payload.files] 공지 전용 신규 첨부파일(등록된 첨부 + 이번 추가분 합쳐 최대 5개)
 * @param {number[]} [payload.removeFileIds] 공지 전용 삭제할 기존 첨부파일 ID
 * @returns {Promise<BoardPostDetail>}
 */
export const updateBoardPost = async (boardType, postId, { files, ...fields }) => {
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append('request', new Blob([JSON.stringify(fields)], { type: 'application/json' }));
    files.forEach((file) => formData.append('files', file));
    const { data } = await apiClient.patch(`/admin/boards/${boardType}/posts/${postId}`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  }
  const { data } = await apiClient.patch(`/admin/boards/${boardType}/posts/${postId}`, fields);
  return data;
};

/**
 * 게시글 삭제. DELETE /api/admin/boards/{boardType}/posts/{postId}
 * Soft delete(deleted_at만 채움, 204 No Content)라 삭제 후에는 학생·STAFF 모두 조회 시
 * 404가 된다. 복구 API는 없다.
 * @param {string} boardType
 * @param {number} postId
 */
export const deleteBoardPost = async (boardType, postId) => {
  await apiClient.delete(`/admin/boards/${boardType}/posts/${postId}`);
};
