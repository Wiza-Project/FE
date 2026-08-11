import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      // '@/api/client' 처럼 절대경로로 import 할 수 있게 합니다.
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 5173,
      // 개발 중에는 프록시로 같은 오리진처럼 동작시켜 CORS 이슈를 피합니다.
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
    },
  };
});
