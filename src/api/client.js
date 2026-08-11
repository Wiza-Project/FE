import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/** 백엔드가 내려준 에러 코드를 그대로 담는 에러 객체 */
export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/* ── 토큰 저장소 ────────────────────────────────────────────────
   메모리 보관이라 새로고침하면 로그인이 풀립니다.
   백엔드와 refresh token 방식(httpOnly 쿠키 권장)을 합의한 뒤
   재발급 로직을 아래 응답 인터셉터에 추가하세요.                  */
let accessToken = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token;
};

/** 요청 인터셉터: 토큰 자동 첨부 */
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/** 응답 인터셉터: { success, data, code, message } 껍데기를 벗겨 data만 반환 */
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.success) {
        throw new ApiError(body.code ?? 'UNKNOWN', body.message ?? '요청에 실패했습니다.');
      }
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    const body = error.response?.data;
    const status = error.response?.status;

    if (status === 401) {
      setAccessToken(null);
      // TODO: refresh token 재발급 시도, 실패하면 로그인 페이지로 이동
    }

    return Promise.reject(
      new ApiError(body?.code ?? 'NETWORK_ERROR', body?.message ?? '서버와 통신할 수 없습니다.'),
    );
  },
);

/**
 * 파일 다운로드 (취업통계 엑셀, 수료증 PDF 등).
 * 응답이 JSON이 아니라 blob이라 위 인터셉터를 타면 깨지므로 별도 함수로 분리했습니다.
 *
 * @param {string} url          apiClient baseURL 기준 경로
 * @param {string} fallbackName 서버가 파일명을 안 줄 때 사용할 이름
 */
export const downloadFile = async (url, fallbackName) => {
  const response = await axios.get(`${apiClient.defaults.baseURL}${url}`, {
    responseType: 'blob',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    withCredentials: true,
  });

  const disposition = response.headers['content-disposition'];
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : fallbackName;

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};
