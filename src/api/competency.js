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
 * 응시율 조회. 회차의 응시 대상자 수 대비 완료 건수를 실시간 집계한다.
 * target_condition이 없는 회차는 전체 학생을 대상자로 집계한다.
 *
 * @param {number} roundId
 * @returns {Promise<{
 *   assessmentRoundId: number,
 *   targetCount: number,
 *   completedCount: number,
 *   attendanceRate: number,
 * }>}
 */
export const fetchAssessmentAttendance = async (roundId) => {
  const { data } = await apiClient.get(`/admin/assessment-rounds/${roundId}/attendance`);
  return data;
};

/**
 * @typedef {Object} AssessmentNonParticipant
 * @property {number} userId
 * @property {string} studentId
 * @property {string} name
 * @property {string|null} email
 * @property {string|null} phone
 * @property {string|null} majorName
 * @property {number|null} grade
 */

/**
 * 미응시자 목록 조회. 회차의 응시 대상자 중 아직 제출을 완료하지 않은 학생 명단을
 * 페이지 단위로 조회한다. target_condition이 없는 회차는 전체 학생을 대상자로 본다.
 * 개인정보(학번·이름·연락처)가 포함돼 있지만, 담당 교직원이 미응시자를 확인해야 하는
 * 기능이라 응시율 조회와 동일하게 hasRole STAFF 전반에게 열려 있다.
 *
 * @param {number} roundId
 * @param {Object} [params]
 * @param {number} [params.page] 0-base 페이지 번호.
 * @param {number} [params.size] 페이지당 건수.
 * @returns {Promise<{content: AssessmentNonParticipant[], page: number, size: number,
 *   totalElements: number, totalPages: number, first: boolean, last: boolean}>}
 */
export const fetchAssessmentNonParticipants = async (roundId, params) => {
  const { data } = await apiClient.get(`/admin/assessment-rounds/${roundId}/non-participants`, {
    params,
  });
  return data;
};

/**
 * 미응시자 알림 발송. 제목·내용은 서버가 회차 정보로 만들어 보내므로 클라이언트가
 * 전송할 필요가 없다. MVP1 기준 인앱(APP) 채널만 실제로 발송되고 SMS·메일은 연동돼 있지 않다.
 *
 * @param {number} roundId
 * @param {number[]|null} userIds null이면 회차의 전체 미응시자에게, 배열이면 해당 userId에게만 발송.
 * @returns {Promise<{sentUserIds: number[], failedCount: number}>}
 */
export const notifyAssessmentNonParticipants = async (roundId, userIds) => {
  const { data } = await apiClient.post(`/admin/assessment-rounds/${roundId}/non-participants/notify`, {
    userIds,
  });
  return data;
};

/**
 * @typedef {Object} DistributionCompetencyAverage
 * @property {number} competencyId
 * @property {string} competencyName
 * @property {number} displayOrder 방사형 차트(SCR-S02)와 축 순서를 맞추기 위한 값
 * @property {number} averageScore 100점 환산 평균
 */

/**
 * @typedef {Object} DistributionGroup
 * @property {string} groupKey 학년이면 "1"~"4", 전공이면 학과 공통코드 codeId 문자열
 * @property {string} groupLabel 화면 표시용 라벨 ("3학년", 학과명 등)
 * @property {number} respondentCount 이 집단에서 제출을 완료한 학생 수
 * @property {DistributionCompetencyAverage[]} competencyAverages
 */

/**
 * 진단 결과 통계 - 역량별 분포·집단별 비교 조회 (SCR-A06). 회차의 역량별 평균 환산점수를
 * 집단 축(GRADE: 학년 / MAJOR: 전공)으로 나눠 집계한다. 역량별 분포 그래프와 집단별 비교
 * 그래프가 같은 응답 구조를 재사용하며, 역량별 분포는 groups를 역량 축으로 다시 묶어 그린다.
 * 단과대 축은 지원하지 않는다(학적 데이터에 단과대 계층 없음). GRADE/MAJOR가 아니면 ApiError(Q021).
 *
 * @param {number} roundId
 * @param {'GRADE'|'MAJOR'} groupBy
 * @returns {Promise<{
 *   assessmentRoundId: number,
 *   groupAxis: 'GRADE'|'MAJOR',
 *   groups: DistributionGroup[],
 * }>}
 */
export const fetchAssessmentDistribution = async (roundId, groupBy) => {
  const { data } = await apiClient.get(`/admin/assessment-rounds/${roundId}/stats/distribution`, {
    params: { groupBy },
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

/**
 * @typedef {Object} AssessmentHistoryItem
 * @property {number} attemptId 결과 조회(fetchAssessmentResult)·사전·사후 비교에 그대로 재사용하는 키
 * @property {number} roundId
 * @property {string} assessmentName
 * @property {number} academicYear
 * @property {string} semesterCode 공통코드 SEMESTER의 code
 * @property {'PRE'|'POST'} assessmentType
 * @property {string} submittedAt ISO-8601
 */

/**
 * 과거 진단 결과 목록 조회. 본인이 응시완료(제출)한 회차를 제출일 최신순으로 페이지 단위
 * 조회한다. 응답에 역량 점수는 없으므로, 회차를 고르면 결과 조회 API(fetchAssessmentResult)를
 * attemptId로 재호출해 상세를 채운다.
 *
 * @param {Object} [params]
 * @param {string} [params.keyword] 진단명 부분일치 검색
 * @param {number} [params.page] 0-base 페이지 번호
 * @param {number} [params.size] 페이지당 건수 (서버 기본 10)
 * @returns {Promise<{
 *   content: AssessmentHistoryItem[],
 *   page: number,
 *   size: number,
 *   totalElements: number,
 *   totalPages: number,
 *   first: boolean,
 *   last: boolean,
 * }>}
 */
export const fetchAssessmentHistory = async (params) => {
  const { data } = await apiClient.get('/students/assessment-history', { params });
  return data;
};

/**
 * @typedef {Object} AssessmentComparisonSide
 * @property {number} attemptId
 * @property {number} roundId
 * @property {string} assessmentName
 * @property {'PRE'|'POST'} assessmentType
 * @property {number} academicYear
 * @property {string} semesterCode 공통코드 SEMESTER의 code
 * @property {string} submittedAt ISO-8601
 * @property {number} overallAverageScore 방사형 차트 전체 평균 오버레이용
 * @property {boolean} percentileAvailable
 * @property {Array<{competencyId: number, competencyName: string, displayOrder: number,
 *   convertedScore: number, percentile: number|null}>} scores 결과 조회와 동일 구조
 */

/**
 * 사전·사후 비교 조회. 선택한 두 응시(attemptId)를 사전 → 사후 순으로 정렬해 겹친 방사형
 * 차트용 점수(before/after)와 역량별 변화량(delta = afterScore - beforeScore, 하락도 그대로
 * 음수로)을 반환한다. 두 attemptId의 전달 순서는 무관하며 서버가 회차 구분(PRE/POST)으로
 * 방향을 정한다. 같은 응시를 두 번 지정하면 ApiError(코드 Q022), 같은 학년도의 사전·사후
 * 한 쌍이 아니면 ApiError(코드 Q023)가 throw된다. 각 응시의 점수 계산·미채점 차단(Q018)·
 * 소유권 검증은 결과 조회 API와 동일하다.
 *
 * @param {number} firstAttemptId
 * @param {number} secondAttemptId
 * @returns {Promise<{
 *   before: AssessmentComparisonSide,
 *   after: AssessmentComparisonSide,
 *   deltas: Array<{
 *     competencyId: number,
 *     competencyName: string,
 *     displayOrder: number,
 *     beforeScore: number|null,
 *     afterScore: number|null,
 *     delta: number|null,
 *   }>,
 * }>}
 */
export const fetchAssessmentComparison = async (firstAttemptId, secondAttemptId) => {
  const { data } = await apiClient.get('/students/assessment-comparison', {
    params: { firstAttemptId, secondAttemptId },
  });
  return data;
};

/**
 * @typedef {Object} RecommendedProgram
 * @property {number} programId
 * @property {string} programName
 * @property {string} operatingUnitName 운영 부서명(공통코드 codeName)
 * @property {string} programTypeName 프로그램 유형명(공통코드 codeName)
 * @property {number} capacity 모집 정원
 * @property {number} applicantCount 정원을 점유한(신청완료·승인) 인원
 * @property {number} remainingCapacity 남은 자리. 정원을 이미 넘겼어도 음수 대신 0
 * @property {string} recruitmentStartsAt ISO-8601
 * @property {string} recruitmentEndsAt ISO-8601
 * @property {string} operationStartsAt ISO-8601
 * @property {string} operationEndsAt ISO-8601
 * @property {number|null} mileagePoints 이수 시 부여 마일리지. 마일리지 정책이 없으면 null
 * @property {'APPLIED'|'WAITLISTED'|'APPROVED'|'REJECTED'|null} myApplicationStatus
 *   로그인 학생 본인의 이 프로그램 신청 상태. 신청 이력이 없거나 취소(CANCELLED)해
 *   재신청 가능하면 null — 즉 null이면 "신청하기" 버튼을 노출해도 되는 상태다
 * @property {string|null} myApplicationStatusLabel 위 상태의 한글 라벨(null이면 함께 null)
 */

/**
 * @typedef {Object} WeakCompetencyGroup
 * @property {number} competencyId
 * @property {string} competencyName
 * @property {number} displayOrder 방사형 차트 축 순서. 취약도 순서와는 무관한 표시용 값
 * @property {number} convertedScore 이 역량이 취약으로 뽑힌 근거인 100점 환산점수
 * @property {RecommendedProgram[]} programs 이 역량에 연계된 모집중 프로그램(최대 3건).
 *   연계 프로그램이 없으면 빈 배열이지만 그룹 자체는 유지된다
 */

/**
 * 진단 결과 기반 추천 비교과 프로그램 조회. 해당 응시의 역량별 환산점수에서 하위 2개를
 * 취약 역량으로 골라(환산점수 오름차순, 동점이면 displayOrder 앞선 역량 우선), 각 역량에
 * 연계된 모집중 프로그램을 최대 3건씩 묶어 내려준다. weakCompetencies는 방사형 축 순서가
 * 아니라 "더 취약한 역량"이 앞에 오도록 정렬돼 있다.
 *
 * 프로그램 후보가 3건을 넘으면 서버가 매 호출마다 무작위로 3건을 다시 뽑으므로 같은
 * 응시라도 목록이 바뀔 수 있다 — 목록을 캐시에 오래 붙들지 말 것. 취약 역량이 없거나
 * (정상 경로에선 드묾) 연계 프로그램이 하나도 없으면 빈 목록/빈 배열이 정상 응답이다.
 * 상세 점수·차트는 이 응답에 없으므로 결과 조회 API(fetchAssessmentResult)를 재사용한다.
 * 응시 소유자가 아니면 ApiError(Q014), 아직 채점 전이면 ApiError(Q018) — 결과 조회와 동일.
 *
 * @param {number} attemptId
 * @returns {Promise<{attemptId: number, weakCompetencies: WeakCompetencyGroup[]}>}
 */
export const fetchRecommendedPrograms = async (attemptId) => {
  const { data } = await apiClient.get(
    `/students/assessment-attempts/${attemptId}/recommended-programs`,
  );
  return data;
};

/**
 * 진단 안내 조회. 진단명·응시기간·문항수·예상 소요시간과 함께, 이미 응시를
 * 시작한 적이 있으면 기존 attemptId/attemptStatus를 내려준다(없으면 둘 다 null).
 *
 * @param {number} roundId
 * @returns {Promise<{
 *   assessmentRoundId: number,
 *   assessmentName: string,
 *   startsAt: string,
 *   endsAt: string,
 *   questionCount: number,
 *   estimatedMinutes: number,
 *   attemptId: number|null,
 *   attemptStatus: string|null,
 * }>}
 */
export const fetchAssessmentIntro = async (roundId) => {
  const { data } = await apiClient.get(`/students/assessment-rounds/${roundId}/intro`);
  return data;
};

/**
 * 응시 시작. 필수 동의(`api/consent.js`)를 모두 마친 뒤 호출해야 하며,
 * 응시기간이 아니면 실패한다(ApiError 코드 Q003). 이미 시작한 학생이 다시 호출하면
 * 새로 만들지 않고 기존 attempt를 그대로 반환한다(멱등).
 *
 * @param {number} roundId
 * @returns {Promise<{attemptId: number, attemptStatus: string}>}
 */
export const startAssessmentAttempt = async (roundId) => {
  const { data } = await apiClient.post(`/students/assessment-rounds/${roundId}/attempts`);
  return data;
};
