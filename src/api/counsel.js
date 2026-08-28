import { apiClient } from '@/api/client';

/**
 * @typedef {Object} CounselingType
 * @property {number} counselingTypeId 일정 조회 경로의 PathVariable로 사용
 * @property {string} typeCode
 * @property {string} typeName
 * @property {string} applicationRoute
 * @property {string} counselingMethod
 * @property {string|null} precedingProcedure
 */

/**
 * 학생이 신청할 수 있는 활성 상담 유형을 조회한다.
 *
 * @returns {Promise<CounselingType[]>}
 */
export const fetchCounselingTypes = async () => {
  const { data } = await apiClient.get('/students/counseling-types');
  return data;
};

/**
 * 상담사가 일정을 등록할 때 선택할 수 있는 상담 유형만 조회한다.
 * 서버가 활성·DIRECT 유형만 type_code ASC 순으로 내려주므로 FE에서 다시 거르지 않는다.
 * 권한은 ROLE_ST200이며 전용 업무 에러 코드는 없다(미인증 401, 권한 없음 403).
 *
 * @returns {Promise<CounselingType[]>}
 */
export const fetchCounselorCounselingTypes = async () => {
  const { data } = await apiClient.get('/counselors/counseling-types');
  return data;
};

/**
 * @typedef {Object} AvailableSchedule
 * @property {number} scheduleId
 * @property {string} counselorName
 * @property {string|null} counselorDepartmentName
 * @property {string} startsAt UTC ISO-8601 Instant
 * @property {string} endsAt UTC ISO-8601 Instant
 * @property {string|null} bookingDeadline UTC ISO-8601 Instant
 * @property {string|null} location
 * @property {number} remainingCapacity 항상 1 이상. 서버가 이미 예약 가능한 일정만 필터링해서 내려준다.
 */

/**
 * 특정 상담 유형에서 학생이 실제로 예약 가능한 일정만 조회한다.
 * 서버가 OPEN·미래시작·마감전·활성상담사·잔여인원 조건을 이미 필터링해서 내려주므로
 * 프론트에서 이 조건들을 다시 걸러내지 않는다.
 *
 * @param {number} counselingTypeId
 * @returns {Promise<AvailableSchedule[]>}
 */
export const fetchAvailableSchedules = async (counselingTypeId) => {
  const { data } = await apiClient.get(
    `/students/counseling-types/${counselingTypeId}/schedules`,
  );
  return data;
};

/**
 * @typedef {Object} CounselingReservation
 * @property {number} reservationId
 * @property {number} counselingTypeId
 * @property {number|null} counselingScheduleId DIRECT 예약의 일정 ID. CENTER 예약은 null일 수 있다.
 * @property {'REQUESTED'|'APPROVED'|'IN_PROGRESS'|'COMPLETED'|'REJECTED'|'CANCELED'} reservationStatus
 * @property {string} createdAt UTC ISO-8601 Instant
 */

/**
 * @typedef {Object} CounselingReservationPage
 * @property {CounselingReservation[]} content
 * @property {number} page 0부터 시작
 * @property {number} size
 * @property {number} totalElements
 * @property {number} totalPages
 * @property {boolean} first
 * @property {boolean} last
 */

/**
 * 로그인한 학생의 상담 예약 목록을 최신 신청일 순으로 조회한다.
 * 목록에는 상담 신청 원문이 포함되지 않는다.
 *
 * @param {Object} [params]
 * @param {number} [params.page=0]
 * @param {number} [params.size=20]
 * @returns {Promise<CounselingReservationPage>}
 */
export const fetchCounselingReservations = async ({ page = 0, size = 20 } = {}) => {
  const { data } = await apiClient.get('/students/counseling-reservations', {
    params: { page, size },
  });
  return data;
};

/**
 * @typedef {Object} CreateCounselingReservationRequest
 * @property {number} counselingTypeId 0보다 큰 상담 유형 ID
 * @property {number} scheduleId 0보다 큰 상담 일정 ID
 * @property {string} requestContent 공백만으로 구성될 수 없다.
 * @property {number} consentId 0보다 큰 본인 소유 COUNSELING+PERSONAL_INFO 동의 ID
 */

/**
 * 학생이 새 상담 예약을 신청한다. 신청 직후 상태는 'REQUESTED'다.
 *
 * @param {CreateCounselingReservationRequest} request
 * @returns {Promise<CounselingReservation>}
 */
export const createCounselingReservation = async (request) => {
  const { data } = await apiClient.post('/students/counseling-reservations', request);
  return data;
};

/**
 * @typedef {Object} CancelCounselingReservationRequest
 * @property {string} cancellationReason 공백만으로 구성될 수 없다.
 */

/**
 * 학생 본인의 예약을 취소한다. 서버가 상태와 마감 시각을 최종 검증한다.
 *
 * @param {number} reservationId
 * @param {CancelCounselingReservationRequest} request
 * @returns {Promise<CounselingReservation>}
 */
export const cancelCounselingReservation = async (reservationId, request) => {
  const { data } = await apiClient.patch(
    `/students/counseling-reservations/${reservationId}/cancel`,
    request,
  );
  return data;
};

/**
 * @typedef {Object} ChangeCounselingReservationScheduleRequest
 * @property {number} scheduleId 0보다 큰 새 일정 ID
 * @property {string} changeReason 공백만으로 구성될 수 없다.
 */

/**
 * 학생 본인의 REQUESTED 예약을 같은 상담 유형의 다른 일정으로 변경한다.
 * 새 일정의 마감·정원·시간 중복은 서버가 잠금 안에서 최종 검증한다.
 *
 * @param {number} reservationId
 * @param {ChangeCounselingReservationScheduleRequest} request
 * @returns {Promise<CounselingReservation>}
 */
export const changeCounselingReservationSchedule = async (reservationId, request) => {
  const { data } = await apiClient.patch(
    `/students/counseling-reservations/${reservationId}/schedule`,
    request,
  );
  return data;
};

/**
 * @typedef {Object} CounselorScheduleRequest
 * @property {number} counselingTypeId
 * @property {string} startsAt UTC ISO-8601 Instant
 * @property {string} endsAt UTC ISO-8601 Instant
 * @property {number} capacity
 * @property {string|null} bookingDeadline UTC ISO-8601 Instant
 * @property {string|null} location
 */

/**
 * @typedef {Object} CounselorSchedule
 * @property {number} scheduleId
 * @property {number} counselingTypeId
 * @property {number} counselorId
 * @property {string} startsAt UTC ISO-8601 Instant
 * @property {string} endsAt UTC ISO-8601 Instant
 * @property {number} capacity
 * @property {string|null} bookingDeadline UTC ISO-8601 Instant
 * @property {string|null} location
 * @property {'OPEN'|'CLOSED'} status
 * @property {boolean} hasReservation
 */

/**
 * 로그인한 상담사의 일정만 최신 시작 시각 순으로 조회한다.
 *
 * @returns {Promise<CounselorSchedule[]>}
 */
export const fetchCounselorSchedules = async () => {
  const { data } = await apiClient.get('/counselors/schedules');
  return data;
};

/**
 * @param {CounselorScheduleRequest} request
 * @returns {Promise<CounselorSchedule>}
 */
export const createCounselorSchedule = async (request) => {
  const { data } = await apiClient.post('/counselors/schedules', request);
  return data;
};

/**
 * @param {number} scheduleId
 * @param {CounselorScheduleRequest} request
 * @returns {Promise<CounselorSchedule>}
 */
export const updateCounselorSchedule = async (scheduleId, request) => {
  const { data } = await apiClient.put(`/counselors/schedules/${scheduleId}`, request);
  return data;
};

/**
 * @param {number} scheduleId
 * @returns {Promise<CounselorSchedule>}
 */
export const closeCounselorSchedule = async (scheduleId) => {
  const { data } = await apiClient.patch(`/counselors/schedules/${scheduleId}/close`);
  return data;
};

/**
 * @typedef {Object} CounselorPendingReservationResponse
 * @property {number} reservationId
 * @property {number} counselingTypeId
 * @property {string} counselingTypeName
 * @property {number} studentId
 * @property {number} counselingScheduleId
 * @property {string} startsAt UTC ISO-8601 Instant
 * @property {string} endsAt UTC ISO-8601 Instant
 * @property {'REQUESTED'|'REJECTED'} reservationStatus 대기 목록 조회는 항상 REQUESTED, 반려 응답은 REJECTED
 * @property {string} createdAt UTC ISO-8601 Instant
 */

/**
 * @typedef {Object} CounselorPendingReservationPage
 * @property {CounselorPendingReservationResponse[]} content
 * @property {number} page 0부터 시작
 * @property {number} size
 * @property {number} totalElements
 * @property {number} totalPages
 * @property {boolean} first
 * @property {boolean} last
 */

/**
 * 로그인한 상담사 본인 일정에 걸린 REQUESTED 예약만 startsAt ASC로 조회한다.
 * 목록 항목에는 신청 원문(requestContent)이 포함되지 않는다.
 *
 * @param {Object} [params]
 * @param {number} [params.page=0]
 * @param {number} [params.size=20]
 * @returns {Promise<CounselorPendingReservationPage>}
 */
export const fetchPendingCounselorReservations = async ({ page = 0, size = 20 } = {}) => {
  const { data } = await apiClient.get('/counselors/counseling-reservations/pending', {
    params: { page, size },
  });
  return data;
};

/**
 * @typedef {Object} CounselorReservationDetailResponse
 * @property {number} reservationId
 * @property {number} counselingTypeId
 * @property {string} counselingTypeName
 * @property {number} studentId
 * @property {number|null} counselingScheduleId
 * @property {string|null} startsAt UTC ISO-8601 Instant
 * @property {string|null} endsAt UTC ISO-8601 Instant
 * @property {string} reservationStatus
 * @property {string} createdAt UTC ISO-8601 Instant
 * @property {string} requestContent 일정 담당 상담사만 조회 가능
 * @property {number|null} processedBy 미처리 시 null
 * @property {string|null} processedAt UTC ISO-8601 Instant, 미처리 시 null
 * @property {string|null} decisionReason 미처리 시 null
 */

/**
 * 예약 상세(신청 원문 포함)를 조회한다. 일정 담당 상담사 본인만 조회할 수 있다.
 *
 * @param {number} reservationId
 * @returns {Promise<CounselorReservationDetailResponse>}
 */
export const fetchCounselorReservationDetail = async (reservationId) => {
  const { data } = await apiClient.get(`/counselors/counseling-reservations/${reservationId}`);
  return data;
};

/**
 * @typedef {Object} CounselorReservationDecisionResponse
 * @property {number} reservationId
 * @property {'APPROVED'} reservationStatus
 * @property {string} processedAt UTC ISO-8601 Instant
 * @property {number} counselingAssignmentId
 * @property {number} counselorId
 * @property {string} assignedAt UTC ISO-8601 Instant
 */

/**
 * REQUESTED 예약을 승인한다. 같은 트랜잭션에서 일정 담당 상담사를 최초 활성 배정한다.
 * 요청 본문은 없다.
 *
 * @param {number} reservationId
 * @returns {Promise<CounselorReservationDecisionResponse>}
 */
export const approveCounselingReservation = async (reservationId) => {
  const { data } = await apiClient.patch(
    `/counselors/counseling-reservations/${reservationId}/approve`,
  );
  return data;
};

/**
 * @typedef {Object} RejectCounselingReservationRequest
 * @property {string} decisionReason 공백만으로 구성될 수 없다. 학생에게 공개된다.
 */

/**
 * REQUESTED 예약을 반려한다. 배정은 생성하지 않는다.
 *
 * @param {number} reservationId
 * @param {RejectCounselingReservationRequest} request
 * @returns {Promise<CounselorPendingReservationResponse>} reservationStatus는 'REJECTED'로 내려온다
 */
export const rejectCounselingReservation = async (reservationId, request) => {
  const { data } = await apiClient.patch(
    `/counselors/counseling-reservations/${reservationId}/reject`,
    request,
  );
  return data;
};

// 대기 목록 조회 query key. ReservationManage(첫 페이지)와 StaffCounselingPage(뱃지)가
// 같은 페이지를 조회할 때 캐시를 공유하도록 두 화면에서 이 함수만 사용한다. 키 배열 형태를 바꾸지 않는다.
export const pendingReservationsQueryKey = (page) => ['counselorPendingReservations', page];

/**
 * @typedef {Object} CounselingSessionResponse
 * @property {number} sessionId
 * @property {number} assignmentId 회기가 고정된 배정 ID. 후속 회기 생성 경로에 사용한다.
 * @property {number} reservationId
 * @property {number} sessionNo 배정 안에서 자동 채번된 회기 번호
 * @property {number} studentId
 * @property {string} studentNumber app_user.university_no
 * @property {string} studentName
 * @property {string|null} departmentName
 * @property {string} counselingTypeName
 * @property {string} startsAt UTC ISO-8601 Instant
 * @property {string} endsAt UTC ISO-8601 Instant
 * @property {'SCHEDULED'|'PRESENT'|'ABSENT'|'NO_SHOW'} attendanceStatus
 * @property {'PLANNED'|'COMPLETED'|'CANCELED'} sessionStatus
 * @property {string|null} nextSessionAt UTC ISO-8601 Instant. 시간 점유를 보장하지 않는 다음 회기 예정 시각
 * @property {string|null} cancellationReason CANCELED일 때만 값이 있다
 * @property {boolean} assignmentActive 현재 배정의 endedAt == null 여부
 * @property {boolean} canCreateFollowUp
 * @property {boolean} canComplete
 * @property {boolean} canCancel
 */

/**
 * @typedef {Object} CounselingSessionPage
 * @property {CounselingSessionResponse[]} content
 * @property {number} page 0부터 시작
 * @property {number} size
 * @property {number} totalElements
 * @property {number} totalPages
 * @property {boolean} first
 * @property {boolean} last
 */

/**
 * 로그인한 상담사 본인의 현재·과거 배정에 연결된 회기 목록을 startsAt DESC로 조회한다.
 * 신청 원문, 비공개 기록, 공개 결과, 학생 연락처는 포함하지 않는다.
 *
 * @param {Object} [params]
 * @param {number} [params.page=0]
 * @param {number} [params.size=20]
 * @param {'PLANNED'|'COMPLETED'|'CANCELED'} [params.sessionStatus]
 * @param {string} [params.from] UTC ISO-8601 Instant. to와 함께 있으면 from < to 여야 한다.
 * @param {string} [params.to] UTC ISO-8601 Instant
 * @returns {Promise<CounselingSessionPage>}
 */
export const fetchCounselingSessions = async ({
  page = 0,
  size = 20,
  sessionStatus,
  from,
  to,
} = {}) => {
  const { data } = await apiClient.get('/counselors/counseling-sessions', {
    params: { page, size, sessionStatus, from, to },
  });
  return data;
};

/**
 * 회기 상세를 조회한다. 현재 또는 과거 배정의 담당 상담사 본인만 조회할 수 있다.
 *
 * @param {number} sessionId
 * @returns {Promise<CounselingSessionResponse>}
 */
export const fetchCounselingSessionDetail = async (sessionId) => {
  const { data } = await apiClient.get(`/counselors/counseling-sessions/${sessionId}`);
  return data;
};

/**
 * @typedef {Object} CreateFollowUpSessionRequest
 * @property {string} startsAt UTC ISO-8601 Instant. assignment.assignedAt <= startsAt < endsAt, startsAt <= now
 * @property {string} endsAt UTC ISO-8601 Instant
 */

/**
 * 현재 활성 배정에 후속 회기를 생성한다. 생성 상태는 SCHEDULED + PLANNED다.
 *
 * @param {number} assignmentId
 * @param {CreateFollowUpSessionRequest} request
 * @returns {Promise<CounselingSessionResponse>}
 */
export const createFollowUpSession = async (assignmentId, request) => {
  const { data } = await apiClient.post(
    `/counselors/counseling-assignments/${assignmentId}/sessions`,
    request,
  );
  return data;
};

/**
 * @typedef {Object} CompleteCounselingSessionRequest
 * @property {'PRESENT'|'ABSENT'|'NO_SHOW'} attendanceStatus
 * @property {string} [nextSessionAt] UTC ISO-8601 Instant. 입력 시 now와 회기 endsAt보다 모두 이후여야 한다.
 */

/**
 * 종료 시각이 지난 PLANNED 회기를 출결 완료 처리한다. PRESENT이고 예약이 APPROVED면
 * 같은 트랜잭션에서 예약을 IN_PROGRESS로 바꾼다.
 *
 * @param {number} sessionId
 * @param {CompleteCounselingSessionRequest} request
 * @returns {Promise<CounselingSessionResponse>}
 */
export const completeCounselingSession = async (sessionId, request) => {
  const { data } = await apiClient.patch(
    `/counselors/counseling-sessions/${sessionId}/complete`,
    request,
  );
  return data;
};

/**
 * @typedef {Object} CancelCounselingSessionRequest
 * @property {string} cancellationReason 공백 제외 1~500자 필수
 */

/**
 * 시작 시각 전의 PLANNED 회기를 취소한다. 예약·배정 상태는 바꾸지 않는다.
 *
 * @param {number} sessionId
 * @param {CancelCounselingSessionRequest} request
 * @returns {Promise<CounselingSessionResponse>}
 */
export const cancelCounselingSession = async (sessionId, request) => {
  const { data } = await apiClient.patch(
    `/counselors/counseling-sessions/${sessionId}/cancel`,
    request,
  );
  return data;
};

// 회기 목록 query key. 필터(status)와 페이지가 바뀔 때마다 별도 캐시 엔트리를 쓴다.
export const counselingSessionsQueryKey = (page, sessionStatus) => [
  'counselingSessions',
  page,
  sessionStatus ?? 'ALL',
];

// 회기 상세 query key. 액션(완료·취소·후속생성) 성공 후 이 키만 무효화한다.
export const counselingSessionDetailQueryKey = (sessionId) => [
  'counselingSessionDetail',
  sessionId,
];

/**
 * @typedef {Object} CounselingPrivateRecordResponse
 * @property {number} sessionId
 * @property {number|null} privateRecordId 기록 없으면 null
 * @property {number|null} versionNo 첫 초안 1, 기록 없으면 null
 * @property {string|null} privateContent 비공개 원문. 기록 없으면 null
 * @property {'EMPTY'|'DRAFT'|'CONFIRMED'} recordStatus
 * @property {string|null} confirmedAt UTC ISO-8601 Instant. 확정 전 null
 * @property {boolean} canSaveDraft
 * @property {boolean} canConfirm
 */

/**
 * 회기의 비공개 상담 기록을 조회한다. 담당(또는 과거 담당) 상담사 본인만 조회할 수 있고,
 * 학생·일반 회기 상세·목록에는 이 원문이 포함되지 않는다. 사용자가 명시적으로 열람을 선택했을
 * 때만 호출해야 한다(자동 조회 금지 — 상세 모달을 열었다는 이유만으로 부르지 않는다).
 *
 * @param {number} sessionId
 * @returns {Promise<CounselingPrivateRecordResponse>}
 */
export const fetchCounselingPrivateRecord = async (sessionId) => {
  const { data } = await apiClient.get(`/counselors/counseling-sessions/${sessionId}/private-record`);
  return data;
};

/**
 * @typedef {Object} SaveCounselingPrivateRecordRequest
 * @property {string} privateContent 공백 제거 후 1~10,000자
 */

/**
 * 비공개 기록 초안을 생성하거나 수정한다(회기당 미확정 초안 한 행). 확정된 기록은 이 API로
 * 수정할 수 없다(서버가 409로 거절).
 *
 * @param {number} sessionId
 * @param {SaveCounselingPrivateRecordRequest} request
 * @returns {Promise<CounselingPrivateRecordResponse>}
 */
export const saveCounselingPrivateRecord = async (sessionId, request) => {
  const { data } = await apiClient.put(
    `/counselors/counseling-sessions/${sessionId}/private-record`,
    request,
  );
  return data;
};

/**
 * 저장된 최신 초안을 확정한다. 원문을 요청 본문으로 다시 보내지 않는다(서버가 이미 저장된
 * 초안만 확정하며, 확정 후에는 수정·재확정을 허용하지 않는다).
 *
 * @param {number} sessionId
 * @returns {Promise<CounselingPrivateRecordResponse>}
 */
export const confirmCounselingPrivateRecord = async (sessionId) => {
  const { data } = await apiClient.patch(
    `/counselors/counseling-sessions/${sessionId}/private-record/confirm`,
  );
  return data;
};

// 비공개 기록 전용 query key. 회기 목록·상세 캐시와 완전히 분리해 privateContent가 섞이지 않게 한다.
export const counselingPrivateRecordQueryKey = (sessionId) => [
  'counselingPrivateRecord',
  sessionId,
];

/**
 * @typedef {Object} CounselorCounselingPublicResultResponse
 * @property {number} sessionId
 * @property {number} reservationId
 * @property {number} assignmentId 회기에 고정된 배정 ID
 * @property {number|null} publicResultId resultStatus가 EMPTY이면 null
 * @property {number|null} versionNo 체크리스트 9번 최초 버전은 1, EMPTY이면 null
 * @property {string|null} resultSummary 공개 요약, EMPTY이면 null
 * @property {string|null} actionPlan 선택 실행 계획, 값이 없으면 null(배열 아님)
 * @property {'EMPTY'|'DRAFT'|'PUBLISHED'} resultStatus 서버 계산값. DB 상태 컬럼이 아니다
 * @property {string|null} createdByName 초안 작성 상담사 표시명, EMPTY이면 null
 * @property {string|null} publishedAt UTC ISO-8601 Instant, 공개 전에는 null
 * @property {string} reservationStatus 예약의 현재 상태
 * @property {boolean} assignmentActive 이 회기가 속한 배정의 활성 여부
 * @property {boolean} privateRecordConfirmed 같은 회기의 비공개 기록 확정 여부(원문 미포함)
 * @property {boolean} finalResult 예약 완료 + 마지막 출석 완료 회기 여부로 계산한 최종 결과 여부
 * @property {boolean} canSaveDraft 현재 사용자·배정·회기·결과 상태에서 저장 가능 여부
 * @property {boolean} canPublish 일반 공개 가능 여부
 * @property {boolean} canCompleteReservation 이 결과로 최종 완료 가능 여부
 */

/**
 * 회기별 공개 결과를 조회한다. 결과가 없어도 200과 resultStatus=EMPTY로 응답한다(정상 상태).
 * 현재 또는 과거 담당 상담사 본인만 조회할 수 있다.
 *
 * @param {number} sessionId
 * @returns {Promise<CounselorCounselingPublicResultResponse>}
 */
export const getCounselorPublicResult = async (sessionId) => {
  const { data } = await apiClient.get(
    `/counselors/counseling-sessions/${sessionId}/public-result`,
  );
  return data;
};

/**
 * @typedef {Object} SaveCounselorPublicResultRequest
 * @property {string} resultSummary 호출부 검증 후 1~3,000자 필수. 함수 경계에서 다시 trim한다.
 * @property {string|null} [actionPlan] 함수 경계에서 trim한 값이 비어 있으면 null로 보낸다.
 */

/**
 * 공개 결과 초안을 생성하거나 수정한다(회기당 미공개 행 한 개). 이미 공개된 행은 이 API로
 * 수정할 수 없다(서버가 409 S010으로 거절).
 *
 * @param {number} sessionId
 * @param {SaveCounselorPublicResultRequest} request
 * @returns {Promise<CounselorCounselingPublicResultResponse>}
 */
export const saveCounselorPublicResult = async (sessionId, request) => {
  // 호출부 검증과 별개로 함수 경계에서 trim한다. nullish 값은 TypeError 대신 서버 검증이
  // 처리할 수 있는 빈 문자열 또는 null로 바꿔, 의미 없는 공백을 저장하지 않는다.
  const normalized = {
    resultSummary: request?.resultSummary?.trim?.() ?? '',
    actionPlan: request?.actionPlan?.trim?.() || null,
  };
  const { data } = await apiClient.put(
    `/counselors/counseling-sessions/${sessionId}/public-result`,
    normalized,
  );
  return data;
};

/**
 * 저장된 초안을 학생에게 일반 공개한다. 요청 본문은 없다. 예약 상태와 활성 배정은 바꾸지
 * 않는다(최종 완료와 분리된 별도 행위). 이미 공개된 결과의 재공개는 409 S010이다.
 *
 * @param {number} sessionId
 * @returns {Promise<CounselorCounselingPublicResultResponse>}
 */
export const publishCounselorPublicResult = async (sessionId) => {
  const { data } = await apiClient.patch(
    `/counselors/counseling-sessions/${sessionId}/public-result/publish`,
  );
  return data;
};

/**
 * 현재 활성 배정의 마지막 출석 완료 회기 결과로 최종 완료 처리한다. 요청 본문은 없다. 초안이면
 * 공개 후, 이미 공개된 결과면 내용을 바꾸지 않고 예약을 COMPLETED로 만들고 활성 배정을
 * 종료한다. nextSessionAt은 조건에 쓰지 않고 응답에도 포함하지 않는다.
 *
 * @param {number} sessionId
 * @returns {Promise<CounselorCounselingPublicResultResponse>}
 */
export const completeCounselingWithPublicResult = async (sessionId) => {
  const { data } = await apiClient.patch(
    `/counselors/counseling-sessions/${sessionId}/public-result/complete`,
  );
  return data;
};

// 상담사 공개 결과 전용 query key. 회기 목록·상세, 비공개 기록 캐시와 분리한다.
export const counselorPublicResultQueryKey = (sessionId) => ['counselorPublicResult', sessionId];

/**
 * @typedef {Object} StudentCounselingPublicResultResponse
 * @property {number} publicResultId
 * @property {number} sessionId
 * @property {number} reservationId 본인 예약 ID
 * @property {number} sessionNo 배정 내 회기 번호
 * @property {string} counselingTypeName
 * @property {string} counselorName 해당 회기의 담당 상담사 표시명
 * @property {string} startsAt UTC ISO-8601 Instant. 회기 시작 시각
 * @property {string} publishedAt UTC ISO-8601 Instant. 공개 시각
 * @property {string} resultSummary 공개 요약
 * @property {string|null} actionPlan 실행 계획. 값이 없으면 null(배열 아님)
 * @property {boolean} finalResult 예약의 최종 완료 결과 여부
 */

/**
 * @typedef {Object} StudentCounselingPublicResultPage
 * @property {StudentCounselingPublicResultResponse[]} content
 * @property {number} page 0부터 시작
 * @property {number} size
 * @property {number} totalElements
 * @property {number} totalPages
 * @property {boolean} first
 * @property {boolean} last
 */

/**
 * 로그인한 학생 본인 예약에 속한 공개 결과를 회기별 최신 공개 버전만, publishedAt DESC로
 * 조회한다. 공개 결과가 없으면 content=[]인 정상 응답이다.
 *
 * @param {Object} [params]
 * @param {number} [params.page=0]
 * @param {number} [params.size=20]
 * @returns {Promise<StudentCounselingPublicResultPage>}
 */
export const getStudentCounselingResults = async ({ page = 0, size = 20 } = {}) => {
  const { data } = await apiClient.get('/students/counseling-results', {
    params: { page, size },
  });
  return data;
};

/**
 * 학생 본인 예약에 속한 회기의 최신 공개 버전 상세를 조회한다. 다른 학생의 결과, 미공개
 * 초안, 존재하지 않는 결과는 모두 404 S011로 동일하게 처리된다(소유권 세부 노출 금지).
 *
 * @param {number} sessionId
 * @returns {Promise<StudentCounselingPublicResultResponse>}
 */
export const getStudentCounselingPublicResult = async (sessionId) => {
  const { data } = await apiClient.get(
    `/students/counseling-sessions/${sessionId}/public-result`,
  );
  return data;
};

// 학생 공개 결과 목록·상세 전용 query key. 상담사 결과 캐시, 학생 예약 캐시와 분리한다.
export const studentCounselingResultsQueryKey = (page, size = 20) => [
  'studentCounselingResults',
  page,
  size,
];
export const studentCounselingResultDetailQueryKey = (sessionId) => [
  'studentCounselingResultDetail',
  sessionId,
];
