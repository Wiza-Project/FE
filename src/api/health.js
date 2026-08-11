import { apiClient } from './client';

/** 백엔드 연동 확인용. GET /api/auth/ping */
export const fetchPing = async () => {
  const { data } = await apiClient.get('/auth/ping');
  return data;
};
