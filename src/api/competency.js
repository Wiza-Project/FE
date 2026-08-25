import { apiClient } from '@/api/client';

/**
 * 핵심역량 등록 (SCR-A01). 역량코드(C1~C6)와 축순서는 서버가 자동 결정한다.
 *
 * @param {Object} params
 * @param {string} params.competencyName
 * @param {string} [params.englishName]
 * @param {string} [params.description]
 * @returns {Promise<{competencyId: number, competencyCode: string, competencyName: string, englishName: string|null, description: string|null, displayOrder: number, active: boolean}>}
 */
export const registerCompetency = async ({ competencyName, englishName, description }) => {
  const { data } = await apiClient.post('/admin/competencies', {
    competencyName,
    englishName,
    description,
  });
  return data;
};

/**
 * 축순서 지정 (SCR-A01). 결과 화면 방사형 차트에 표시될 위치를 1~6 중에서 지정한다.
 * 지정하려는 번호가 비어 있으면 해당 역량만 변경된다. 다른 역량이 이미 그 번호를
 * 쓰고 있으면 서버가 두 역량의 축순서를 서로 맞바꾼다(스왑) — 이 경우 응답 배열에
 * 두 역량이 모두 담겨 온다.
 *
 * @param {Object} params
 * @param {number} params.competencyId
 * @param {number} params.displayOrder 1~6
 * @returns {Promise<Array<{competencyId: number, competencyCode: string, competencyName: string, englishName: string|null, description: string|null, displayOrder: number, active: boolean}>>}
 *   빈 슬롯으로 이동한 경우 1개, 스왑이 일어난 경우 2개([이동한 역량, 자리를 내준 역량] 순서)
 */
export const changeCompetencyDisplayOrder = async ({ competencyId, displayOrder }) => {
  const { data } = await apiClient.patch(`/admin/competencies/${competencyId}/display-order`, {
    displayOrder,
  });
  return data;
};

/**
 * 사용여부 관리 (SCR-A01). 응답 이력이 있는 역량도 삭제 대신 비활성 처리로 과거 기록을 보존한다.
 *
 * @param {Object} params
 * @param {number} params.competencyId
 * @param {boolean} params.active
 * @returns {Promise<{competencyId: number, competencyCode: string, competencyName: string, englishName: string|null, description: string|null, displayOrder: number, active: boolean}>}
 */
export const changeCompetencyActiveStatus = async ({ competencyId, active }) => {
  const { data } = await apiClient.patch(`/admin/competencies/${competencyId}/active-status`, {
    active,
  });
  return data;
};

/**
 * 진단문항 엑셀 일괄 업로드 (SCR-A03). 엑셀(상위역량|하위역량|문항번호|평가문항)의
 * 상위역량 컬럼으로 핵심역량에 매핑되며, 하위역량·문항번호 컬럼은 서버에서 무시된다.
 * 응답옵션(5점 리커트)과 역문항 여부(false 고정)는 서버가 채운다.
 *
 * @param {File} file
 * @returns {Promise<{
 *   totalRows: number,
 *   successCount: number,
 *   failureCount: number,
 *   failures: Array<{excelRowNo: number, reason: string}>,
 *   warnings: string[],
 * }>}
 */
export const uploadAssessmentQuestions = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  // apiClient 기본 Content-Type(application/json)을 지워야 axios가 FormData를 JSON으로
  // 직렬화하지 않고, 브라우저가 boundary를 붙인 multipart/form-data로 보낸다.
  const { data } = await apiClient.post('/admin/assessment-questions/upload', formData, {
    headers: { 'Content-Type': undefined },
  });
  return data;
};

/**
 * @typedef {Object} AssessmentQuestion
 * @property {number} questionId
 * @property {number} competencyId
 * @property {string} competencyName
 * @property {number|null} previousQuestionId
 * @property {number} versionNo
 * @property {string} questionText
 * @property {boolean} reverse
 * @property {Array<{value: number, label: string}>} responseOptions
 * @property {boolean} active
 */

/**
 * 핵심역량별 진단문항 목록 조회 (SCR-A03 #5). 활성 문항만 문항ID 오름차순으로 내려온다
 * (하위역량 단위 조회는 지원하지 않음 — 하위역량 자체가 미개발 상태).
 *
 * @param {number} competencyId
 * @returns {Promise<AssessmentQuestion[]>}
 */
export const fetchAssessmentQuestions = async (competencyId) => {
  const { data } = await apiClient.get('/admin/assessment-questions', {
    params: { competencyId },
  });
  return data;
};

/**
 * 진단문항 단건 조회. 비활성(구버전) 문항도 조회 가능 — 버전 이력 추적에 사용한다.
 *
 * @param {number} questionId
 * @returns {Promise<AssessmentQuestion>}
 */
export const fetchAssessmentQuestion = async (questionId) => {
  const { data } = await apiClient.get(`/admin/assessment-questions/${questionId}`);
  return data;
};

/**
 * previousQuestionId를 따라가며 이전 버전들을 최신 → 과거 순으로 조회한다.
 * BE에 버전 이력 목록 API가 없어 단건 조회를 반복 호출해 체인을 직접 구성한다.
 *
 * @param {number|null} previousQuestionId 조회를 시작할 직전 버전의 questionId
 * @returns {Promise<AssessmentQuestion[]>} 최신 → 과거 순
 */
export const fetchAssessmentQuestionVersionHistory = async (previousQuestionId) => {
  const history = [];
  let currentId = previousQuestionId;
  while (currentId) {
    const question = await fetchAssessmentQuestion(currentId);
    history.push(question);
    currentId = question.previousQuestionId;
  }
  return history;
};

/**
 * 진단문항 수정 (SCR-A03 #5). 이미 응답 이력이 있는 문항을 수정하면 서버가 자동으로
 * 새 버전(문항ID 신규 채번, versionNo+1)을 만들고 기존 문항은 비활성 처리한다 —
 * "새 버전으로 저장"을 위한 별도 API는 없고, 이 호출 하나로 두 경우가 모두 처리된다.
 * 응답의 questionId가 요청한 id와 다르면 새 버전이 만들어졌다는 뜻이다.
 *
 * @param {Object} params
 * @param {number} params.questionId
 * @param {string} params.questionText
 * @param {boolean} params.reverse
 * @param {Array<{value: number, label: string}>} params.responseOptions
 * @returns {Promise<AssessmentQuestion>}
 */
export const editAssessmentQuestion = async ({
  questionId,
  questionText,
  reverse,
  responseOptions,
}) => {
  const { data } = await apiClient.patch(`/admin/assessment-questions/${questionId}`, {
    questionText,
    reverse,
    responseOptions,
  });
  return data;
};

/**
 * @typedef {Object} AssessmentRound
 * @property {number} assessmentRoundId
 * @property {string} assessmentName
 * @property {number} academicYear
 * @property {string} semesterCode 공통코드 SEMESTER의 code (예: 'SPRING')
 * @property {string} assessmentType 'PRE'|'POST'
 * @property {string} startsAt ISO-8601
 * @property {string} endsAt ISO-8601
 * @property {Object|null} targetCondition null이면 전체 학생 대상
 * @property {string} roundStatus
 */

/**
 * 진단 회차 등록 (SCR-A04). 학년도·학기·진단구분(사전/사후)+응시기간+응시대상을 한 번에
 * 등록한다 — `assessment_round`의 응시기간 컬럼이 NOT NULL이라 기본정보만 먼저 저장하는
 * 단계가 없다(부분 저장 불가). 같은 학년도·학기·진단구분 조합은 서버가 중복 개설을 막는다.
 *
 * @param {Object} params
 * @param {string} params.assessmentName
 * @param {number} params.academicYear
 * @param {string} params.semesterCode
 * @param {'PRE'|'POST'} params.assessmentType
 * @param {string} params.startsAt ISO-8601
 * @param {string} params.endsAt ISO-8601
 * @param {Object|null} [params.targetCondition] 생략/null이면 전체 학생 대상
 * @returns {Promise<AssessmentRound>}
 */
export const registerAssessmentRound = async ({
  assessmentName,
  academicYear,
  semesterCode,
  assessmentType,
  startsAt,
  endsAt,
  targetCondition,
}) => {
  const { data } = await apiClient.post('/admin/assessment-rounds', {
    assessmentName,
    academicYear,
    semesterCode,
    assessmentType,
    startsAt,
    endsAt,
    targetCondition: targetCondition ?? null,
  });
  return data;
};

/**
 * 진단 회차 수정 (SCR-A04). 등록과 같은 필드를 모두 다시 보내야 하는 전체 수정이다
 * (부분 수정 아님). 이미 응시(문항 응답)가 시작된 회차는 서버가 수정 자체를 막는다.
 *
 * @param {Object} params
 * @param {number} params.roundId
 * @param {string} params.assessmentName
 * @param {number} params.academicYear
 * @param {string} params.semesterCode
 * @param {'PRE'|'POST'} params.assessmentType
 * @param {string} params.startsAt ISO-8601
 * @param {string} params.endsAt ISO-8601
 * @param {Object|null} [params.targetCondition]
 * @returns {Promise<AssessmentRound>}
 */
export const updateAssessmentRound = async ({
  roundId,
  assessmentName,
  academicYear,
  semesterCode,
  assessmentType,
  startsAt,
  endsAt,
  targetCondition,
}) => {
  const { data } = await apiClient.patch(`/admin/assessment-rounds/${roundId}`, {
    assessmentName,
    academicYear,
    semesterCode,
    assessmentType,
    startsAt,
    endsAt,
    targetCondition: targetCondition ?? null,
  });
  return data;
};

/**
 * @typedef {Object} AssessmentResumeItem
 * @property {number} questionId
 * @property {number} competencyId
 * @property {string} competencyName
 * @property {number} displayOrder
 * @property {string} questionText
 * @property {Array<{value: number, label: string}>} responseOptions
 * @property {number|null} selectedValue 미응답이면 null
 */

/**
 * 진단 응시 이어하기 조회 (SCR-S01 #8). 회차 문항 전체와 기존 저장된 응답값(없으면 null),
 * 진행률을 함께 조회한다. 이미 제출된 attempt를 조회하면 ApiError(코드 Q004)가 throw된다.
 *
 * @param {number} attemptId
 * @returns {Promise<{
 *   attemptId: number,
 *   attemptStatus: string,
 *   progress: {answeredCount: number, totalCount: number},
 *   items: AssessmentResumeItem[],
 * }>}
 */
export const fetchAssessmentResume = async (attemptId) => {
  const { data } = await apiClient.get(`/students/assessment-attempts/${attemptId}/responses`);
  return data;
};

/**
 * 문항 응답 저장 (SCR-S01 #8). 이미 저장된 응답이 있으면 값을 갱신한다(upsert).
 * BE에서 응답 저장 자체가 중도저장이라 별도의 임시저장 API는 없다 — 문항을 선택할 때마다
 * 이 함수를 호출하는 것이 곧 중도저장이다.
 *
 * @param {Object} params
 * @param {number} params.attemptId
 * @param {number} params.questionId
 * @param {number} params.selectedValue
 * @returns {Promise<{
 *   questionId: number,
 *   selectedValue: number,
 *   savedAt: string,
 *   progress: {answeredCount: number, totalCount: number},
 * }>}
 */
export const saveAssessmentResponse = async ({ attemptId, questionId, selectedValue }) => {
  const { data } = await apiClient.put(
    `/students/assessment-attempts/${attemptId}/responses/${questionId}`,
    { selectedValue },
  );
  return data;
};

/**
 * 진단 제출. 미응답 문항이 없으면 제출을 확정하고, 같은 트랜잭션에서
 * 역량별 환산점수를 산출한다. 미응답 문항이 있으면 ApiError(코드 Q005)가 throw되며,
 * `error.data`에 미응답 questionId 배열이 함께 담겨 온다.
 *
 * @param {number} attemptId
 * @returns {Promise<{
 *   attemptId: number,
 *   attemptStatus: string,
 *   submittedAt: string,
 *   scores: Array<{
 *     competencyId: number,
 *     competencyName: string,
 *     displayOrder: number,
 *     rawScore: number,
 *     convertedScore: number,
 *   }>,
 * }>}
 */
export const submitAssessment = async (attemptId) => {
  const { data } = await apiClient.post(`/students/assessment-attempts/${attemptId}/submit`);
  return data;
};

/**
 * 진단 결과 조회. 역량별 환산점수(방사형 차트)와 전체 평균을 조회한다.
 * overallAverageScore는 백분위와 무관하게 내 환산점수만으로 항상 계산되는 값이라
 * percentileAvailable이 false여도 채워져 있다. 아직 채점 전(미제출) attempt를 조회하면
 * ApiError(코드 Q018)가 throw된다.
 *
 * @param {number} attemptId
 * @returns {Promise<{
 *   attemptId: number,
 *   roundId: number,
 *   submittedAt: string,
 *   overallAverageScore: number,
 *   percentileAvailable: boolean,
 *   scores: Array<{
 *     competencyId: number,
 *     competencyName: string,
 *     displayOrder: number,
 *     convertedScore: number,
 *     percentile: number|null,
 *   }>,
 * }>}
 */
export const fetchAssessmentResult = async (attemptId) => {
  const { data } = await apiClient.get(`/students/assessment-attempts/${attemptId}/result`);
  return data;
};
