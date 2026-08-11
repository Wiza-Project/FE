import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,

  // ── 앱 소스 (브라우저 환경) ──────────────────────────────────
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // prop-types 는 사실상 유지보수가 중단된 방식이라 끕니다.
      // props 설명이 필요하면 컴포넌트 위에 JSDoc 주석으로 남기세요.
      // (이 프로젝트의 ProtectedRoute.jsx 가 그 예시입니다)
      'react/prop-types': 'off',
    },
  },

  // ── 설정 파일 (Node 환경) ────────────────────────────────────
  {
    files: ['*.config.js', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },

  prettier,
];
