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

