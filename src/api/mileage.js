import { apiClient } from './client';

/**
 * 학생 본인의 마일리지 현황 대시보드를 조회
 * @param {Object} params
 * @param {number} params.academicYear
 * @param {string} params.semesterCode
 * @returns {Promise<{
 *   period: {academicYear: number, semesterCode: string},
 *   summary: {cumulativePoints: number, currentSemesterPoints: number},
 *   competencyBreakdown: Array<{competencyName: string, points: number}>,
 *   semesterTrend: Array<{academicYear: number, semesterCode: string, points: number}>,
 *   benefitProgress: Array<{benefitPolicyId: number, benefitName: string, targetPoints: number,
 *     benefitAmount: number|null, shortagePoints: number, canApply: boolean, progressStatus: string}>,
 * }>}
 */
export const fetchMileageDashboard = async (params) => {
  const { data } = await apiClient.get('/students/mileage/dashboard', { params });
  return data;
};

/**
 * 학생 본인의 마일리지 등급(달성 현황)을 조회
 *
 * @param {Object} params
 * @param {number} params.academicYear
 * @param {string} params.semesterCode
 * @returns {Promise<{
 *   currentGrade: {gradeName: string}|null,
 *   nextGrade: {gradeName: string}|null,
 *   pointsToNextGrade: number,
 * }>}
 */
export const fetchMileageGrade = async (params) => {
  const { data } = await apiClient.get('/students/mileage/grade', { params });
  return data;
};

/**
 * 학생 마일리지 시뮬레이션에 사용할 기준과 활동 선택지를 조회합니다.
 * GET /api/students/mileage/simulations/options
 */
export const fetchMileageSimulationOptions = async ({ academicYear, semesterCode }) => {
  const { data } = await apiClient.get('/students/mileage/simulations/options', {
    params: { academicYear, semesterCode },
  });
  return data;
};

/**
 * 학생 마일리지 적립 시뮬레이션을 실행합니다.
 * POST /api/students/mileage/simulations
 */
export const simulateMileage = async (request) => {
  const { data } = await apiClient.post('/students/mileage/simulations', request);
  return data;
};
