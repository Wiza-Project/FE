import { apiClient } from '@/api/client';

/**
 * 자연어 조건으로 게시 중인 채용공고 최대 3건을 추천받기
 * 백엔드 경로: POST /api/students/career/job-chat
 */
export const chatJobPostings = (message) =>
  apiClient.post('/students/career/job-chat', { message }).then((res) => res.data);