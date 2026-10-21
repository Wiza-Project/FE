import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/**
 * 백엔드가 내려준 에러 코드를 그대로 담는 에러 객체.
 * data 는 실패 응답에 함께 실려오는 부가 정보(예: 로그인 실패 시 잔여 시도 횟수·잠금 여부 —
 * api/auth.js의 login() 참고)이며, 없으면 undefined 입니다.
 */
export class ApiError extends Error {
  constructor(code, message, data) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.data = data;
  }
}

/* ── 토큰 저장소 ────────────────────────────────────────────────
   accessToken 은 메모리에만 보관합니다(새로고침하면 사라짐).
   refresh token 은 httpOnly 쿠키(경로: /api/auth)로 내려오며 JS에서는
   절대 읽거나 저장하지 않습니다 — apiClient 가 withCredentials:true 라
   /api/auth/* 요청 시 브라우저가 알아서 실어 보냅니다.                */
let accessToken = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token;
};

/**
 * 세션이 완전히 끊겼을 때(재발급도 실패) 호출할 콜백.
 * client.js 가 stores/authStore.js 를 직접 import 하면 순환 참조가 생기므로,
 * authStore 쪽에서 이 함수로 핸들러를 주입합니다.
 */
let sessionExpiredHandler = null;
export const setSessionExpiredHandler = (fn) => {
  sessionExpiredHandler = fn;
};

const AUTH_ENDPOINT_PATTERNS = ['/auth/login', '/auth/reissue', '/auth/logout'];
const isAuthEndpoint = (url) => !!url && AUTH_ENDPOINT_PATTERNS.some((p) => url.includes(p));

/** 동시에 여러 요청이 401을 받아도 /auth/reissue 는 한 번만 나가도록 공유합니다. */
let reissuePromise = null;
const reissueOnce = () => {
  if (!reissuePromise) {
    reissuePromise = apiClient.post('/auth/reissue').finally(() => {
      reissuePromise = null;
    });
  }
  return reissuePromise;
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
        throw new ApiError(
          body.code ?? 'UNKNOWN',
          body.message ?? '요청에 실패했습니다.',
          body.data,
        );
      }
      response.data = body.data;
    }
    return response;
  },
  async (error) => {
    const body = error.response?.data;
    const status = error.response?.status;
    const config = error.config;

    // accessToken 만료로 인한 401 → reissue 로 조용히 재발급 후 원 요청 1회 재시도.
    // /auth/login, /auth/reissue, /auth/logout 자체의 401은 재발급 대상이 아닙니다.
    if (status === 401 && config && !isAuthEndpoint(config.url) && !config._retriedAfterReissue) {
      try {
        const { data } = await reissueOnce();
        setAccessToken(data.accessToken);
        config._retriedAfterReissue = true;
        // 요청 인터셉터가 최신 accessToken 으로 Authorization 헤더를 다시 붙여줍니다.
        return apiClient(config);
      } catch (reissueError) {
        setAccessToken(null);
        sessionExpiredHandler?.('session_expired');
        return Promise.reject(reissueError);
      }
    }

    if (status === 401) {
      setAccessToken(null);
    }

    return Promise.reject(
      new ApiError(
        body?.code ?? 'NETWORK_ERROR',
        body?.message ?? '서버와 통신할 수 없습니다.',
        body?.data,
      ),
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
