import { QueryClient } from '@tanstack/react-query';

/**
 * 앱 전역에서 공유하는 QueryClient 싱글턴.
 *
 * main.jsx 의 QueryClientProvider 와 authStore.js 의 로그아웃 처리(캐시 초기화)가
 * 같은 인스턴스를 참조해야 해서 모듈로 분리했습니다.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60000,
      refetchOnWindowFocus: false,
    },
  },
});
