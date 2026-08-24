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
