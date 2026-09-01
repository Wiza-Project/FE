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
 * @property {string|null} startsAt 연결된 일정 시작 시각(UTC ISO-8601 Instant). counselingScheduleId가 null인 레거시 CENTER 예약에서만 null.
 * @property {string|null} endsAt 연결된 일정 종료 시각(UTC ISO-8601 Instant). startsAt과 동일한 null 규칙.
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
 * @property {number} expectedScheduleId 0보다 큰 값. 모달을 연 예약의 현재 counselingScheduleId(기준 버전).
 *   서버가 이 값과 실제 현재 일정을 비교해 stale 변경을 거른다.
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
 * @property {number} remainingCapacity max(0, capacity - (REJECTED·CANCELED 제외 예약 수)). 조회 시점 참고값이며 POST가 최종 검증한다.
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
 * @typedef {Object} CounselorStudentLookup
 * @property {number} studentId
 * @property {string} universityNo
 * @property {string} studentName
 */

/**
 * 상담사가 대행 예약을 위해 학번으로 활성 학생 한 명을 정확히 조회한다.
 * 학번 없음·비활성 계정·학생이 아닌 계정은 서버가 모두 404 U001로 통일해 응답하므로
 * FE에서 실패 사유를 구분하지 않는다.
 *
 * @param {string} universityNo
 * @returns {Promise<CounselorStudentLookup>}
 */
export const fetchCounselorStudentByUniversityNo = async (universityNo) => {
  const { data } = await apiClient.get('/counselors/students/lookup', {
    params: { universityNo: universityNo.trim() },
  });
  return data;
};

/**
 * @typedef {Object} CreateCounselorProxyReservationRequest
 * @property {number} studentId
 * @property {number} counselingTypeId 선택한 일정 객체의 counselingTypeId(서버가 다시 검증)
 * @property {number} scheduleId
 * @property {string} requestContent 앞뒤 공백 제거 후 1~3,000자
 */

/**
 * 상담사가 자신의 예약 가능한 DIRECT 일정에 학생을 대신해 예약을 생성한다.
 * 생성과 동시에 서버가 즉시 APPROVED로 승인하고 최초 배정·1회기를 같은 트랜잭션에서 만든다.
 * consentId·counselorId·처리자 ID는 서버가 로그인 상담사 기준으로 직접 채우므로 요청에 포함하지 않는다.
 *
 * @param {CreateCounselorProxyReservationRequest} request
 * @returns {Promise<CounselorReservationDecisionResponse>}
 */
export const createCounselorProxyReservation = async (request) => {
  const { data } = await apiClient.post('/counselors/counseling-reservations', {
    ...request,
    requestContent: request?.requestContent?.trim?.() ?? '',
  });
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
 * @property {number|null} versionNo 응답 시점의 최신 버전 번호. 최초 공개는 1, 정정마다 +1, EMPTY이면 null
 * @property {string|null} resultSummary 응답 시점 최신 버전의 공개 요약, EMPTY이면 null
 * @property {string|null} actionPlan 응답 시점 최신 버전의 실행 계획, 값이 없으면 null(배열 아님)
 * @property {'EMPTY'|'DRAFT'|'PUBLISHED'} resultStatus 서버 계산값. DB 상태 컬럼이 아니다
 * @property {string|null} createdByName 응답 시점 최신 버전을 만든 상담사 표시명, EMPTY이면 null
 * @property {string|null} publishedAt UTC ISO-8601 Instant. 응답 시점 최신 버전의 최초 공개 또는 정정 공개 시각, 공개 전에는 null
 * @property {string} reservationStatus 예약의 현재 상태
 * @property {boolean} assignmentActive 이 회기가 속한 배정의 활성 여부
 * @property {boolean} privateRecordConfirmed 같은 회기의 비공개 기록 확정 여부(원문 미포함)
 * @property {boolean} finalResult 예약 완료 + 마지막 출석 완료 회기 여부로 계산한 최종 결과 여부
 * @property {boolean} canSaveDraft 현재 사용자·배정·회기·결과 상태에서 저장 가능 여부
 * @property {boolean} canPublish 일반 공개 가능 여부
 * @property {boolean} canCompleteReservation 이 결과로 최종 완료 가능 여부
 * @property {boolean} canCorrect 활성 ST200인 원래 담당 상담사가 최신 PUBLISHED 결과를 정정할 수 있는지 서버가 계산한 값
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
 * @typedef {Object} CorrectCounselorPublicResultRequest
 * @property {number} expectedVersionNo 1 이상. 서버가 잠금 후 다시 읽은 최신 공개 버전과 같아야 한다(다르면 409 S010).
 * @property {string} resultSummary 호출부 검증 후 1~3,000자 필수. 함수 경계에서 다시 trim한다.
 * @property {string|null} [actionPlan] 함수 경계에서 trim한 값이 비어 있으면 null로 보낸다.
 * @property {string} correctionReason 호출부 검증 후 1~500자 필수. 함수 경계에서 다시 trim한다.
 */

/**
 * 최신 PUBLISHED 공개 결과를 정정한다. 기존 행은 수정하지 않고 versionNo + 1 행을 새로
 * 즉시 공개한다. 요청한 expectedVersionNo가 서버의 최신 버전과 다르면 409 S010(충돌),
 * 정규화한 요약·실행계획이 최신 버전과 완전히 같으면 409 S012(무변경)로 거절된다.
 *
 * @param {number} sessionId
 * @param {CorrectCounselorPublicResultRequest} request
 * @returns {Promise<CounselorCounselingPublicResultResponse>} 정정 성공 후의 최신(=새로 만든) 버전
 */
export const correctCounselorPublicResult = async (sessionId, request) => {
  // 서버 검증과 별개로 함수 경계에서 정규화한다. expectedVersionNo는 충돌 판정의 기준이므로
  // 호출부가 전달한 값을 그대로 보내고 여기서 가공하지 않는다.
  const normalized = {
    expectedVersionNo: request?.expectedVersionNo,
    resultSummary: request?.resultSummary?.trim?.() ?? '',
    actionPlan: request?.actionPlan?.trim?.() || null,
    correctionReason: request?.correctionReason?.trim?.() ?? '',
  };
  const { data } = await apiClient.post(
    `/counselors/counseling-sessions/${sessionId}/public-result/corrections`,
    normalized,
  );
  return data;
};

/**
 * @typedef {Object} CounselorPublicResultHistoryItem
 * @property {number} publicResultId 공개 결과 버전 행 ID
 * @property {number} versionNo 회기 내 버전 번호
 * @property {string} resultSummary 해당 버전의 완전한 공개 요약
 * @property {string|null} actionPlan 해당 버전의 실행 계획
 * @property {string|null} correctionReason v1은 null, 정정 버전은 항상 값이 있음
 * @property {string|null} createdByName 해당 버전 작성자 표시명. 사용자 삭제 등으로 찾지 못하면 null
 * @property {string} publishedAt UTC ISO-8601 Instant. 최초 공개 또는 정정 즉시 공개 시각
 */

/**
 * 회기의 전체 공개 결과 버전 이력을 versionNo DESC로 조회한다. 접근 가능한 회기지만 공개
 * 버전이 없으면 빈 배열을 반환한다(정상 상태). 담당(또는 과거 담당) 상담사 본인만 조회할 수
 * 있고 학생에게는 이 API가 없다. 사용자가 이력 보기를 선택했을 때만 호출해야 한다.
 *
 * @param {number} sessionId
 * @returns {Promise<CounselorPublicResultHistoryItem[]>}
 */
export const getCounselorPublicResultHistory = async (sessionId) => {
  const { data } = await apiClient.get(
    `/counselors/counseling-sessions/${sessionId}/public-result/history`,
  );
  return data;
};

// 상담사 공개 결과 이력 전용 query key. 최신 결과·회기·비공개 기록 캐시와 분리해 이력을
// 닫을 때 이 키만 골라 제거할 수 있게 한다.
export const counselorPublicResultHistoryQueryKey = (sessionId) => [
  'counselorPublicResultHistory',
  sessionId,
];

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

// ─── 스트레스 자가진단 ───────────────────────────────────────────────────────

/**
 * @typedef {Object} StressTestOption
 * @property {number} value 0~3
 * @property {string} label
 */

/**
 * @typedef {Object} StressTestQuestion
 * @property {number} questionId
 * @property {number} questionNo
 * @property {string} questionText
 * @property {StressTestOption[]} optionData
 */

/**
 * @typedef {Object} StressTestQuestionsResponse
 * @property {string} testType 항상 'STRESS'
 * @property {string} testVersion 예: '1'
 * @property {string} instruction
 * @property {StressTestQuestion[]} questions questionNo ASC 순으로 11개
 */

/**
 * 활성 스트레스 검사 문항을 조회한다. 상담 개인정보 동의를 요구하지 않는다(개인정보 저장 액션이 아님).
 * 문항 구성이 11개·연속 번호·확정 선택지와 다르면 503 S014를 반환한다.
 *
 * @returns {Promise<StressTestQuestionsResponse>}
 */
export const fetchStressTestQuestions = async () => {
  const { data } = await apiClient.get('/students/psychological-tests/stress/questions');
  return data;
};

/**
 * @typedef {Object} StressTestAnswer
 * @property {number} questionId
 * @property {number} selectedValue 0~3
 */

/**
 * @typedef {Object} SubmitStressTestResultRequest
 * @property {string} testVersion 현재 활성 버전과 같아야 한다.
 * @property {StressTestAnswer[]} answers 현재 버전의 11개 문항 각각에 정확히 한 번씩 답해야 한다.
 */

/**
 * @typedef {Object} StressTestResult
 * @property {number} resultId
 * @property {string} testVersion
 * @property {number} totalScore 서버가 계산한 0~33 정수
 * @property {string} resultLevel 서버가 판정한 한국어 수준 문자열. FE에서 enum화하지 않는다.
 * @property {string} resultDescription 서버가 저장한 점수 구간 설명 스냅샷
 * @property {string} testedAt UTC ISO-8601 Instant
 */

/**
 * 학생 본인의 스트레스 검사 응답을 제출해 결과를 저장한다. 제출 직전 유효한
 * COUNSELING+PERSONAL_INFO 동의가 필요하다(403 U009). 반복 제출을 허용하며 기존 결과를
 * 덮어쓰지 않고 매번 새 이력을 만든다. 원응답은 이 요청에만 사용되고 서버에도 별도 저장되지 않는다.
 *
 * @param {SubmitStressTestResultRequest} request
 * @returns {Promise<StressTestResult>}
 */
export const submitStressTestResult = async (request) => {
  const { data } = await apiClient.post('/students/psychological-tests/stress/results', request);
  return data;
};

/**
 * @typedef {Object} StressTestResultPage
 * @property {StressTestResult[]} content
 * @property {number} page 0부터 시작
 * @property {number} size
 * @property {number} totalElements
 * @property {number} totalPages
 * @property {boolean} first
 * @property {boolean} last
 */

/**
 * 학생 본인의 스트레스 검사 결과 이력을 testedAt DESC, resultId DESC로 조회한다.
 * 현재 동의 여부와 무관하게 조회 가능하다(철회 후에도 과거 이력 조회 가능).
 *
 * @param {Object} [params]
 * @param {number} [params.page=0]
 * @param {number} [params.size=20]
 * @returns {Promise<StressTestResultPage>}
 */
export const fetchStressTestResults = async ({ page = 0, size = 20 } = {}) => {
  const { data } = await apiClient.get('/students/psychological-tests/stress/results', {
    params: { page, size },
  });
  return data;
};

// 스트레스 검사 문항 query key. 원응답을 담지 않으므로 유일하게 고정된 키 하나만 쓴다.
export const stressTestQuestionsQueryKey = ['studentStressTestQuestions'];

// 스트레스 검사 결과 이력 query key. 페이지·크기만 포함하고 답변·동의 ID는 넣지 않는다.
// 결과 전체를 무효화·제거할 때는 이 함수가 아니라 prefix ['studentStressTestResults']를 쓴다.
export const stressTestResultsQueryKey = (page, size = 20) => [
  'studentStressTestResults',
  page,
  size,
];
