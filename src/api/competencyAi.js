import { apiClient } from '@/api/client';

/**
 * 제출 완료된 핵심역량 진단 결과를 바탕으로 AI 해석과 보완 방향을 요청한다.
 * @param {{attemptId: number, message: string}} payload
 * @returns {Promise<{
 *   reply: string,
 *   resultSummary: {attemptId: number, overallAverageScore: number, submittedAt: string, percentileAvailable: boolean},
 *   focusCompetencies: Array<{competencyId: number, competencyName: string, convertedScore: number, judgment: string, recommendation: string}>,
 *   programRecommendations: Array<{programId: number, programName: string, competencyName: string, programTypeName: string, recruitmentEndsAt: string, remainingCapacity: number, myApplicationStatusLabel: string|null}>,
 *   nextActions: string[],
 * }>}
 */
export const requestCompetencyAiChat = async ({ attemptId, message }) => {
  const { data } = await apiClient.post('/students/competency-ai/chat', {
    attemptId,
    message,
  });
  return data;
};
