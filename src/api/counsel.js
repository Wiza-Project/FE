import { apiClient } from '@/api/client';

/**
 * @typedef {Object} CounselingType
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
