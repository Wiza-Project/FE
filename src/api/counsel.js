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
