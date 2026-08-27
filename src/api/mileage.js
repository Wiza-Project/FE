import { apiClient } from './client';

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
