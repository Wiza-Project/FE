# scms-fe

**학생통합역량시스템** 프론트엔드. React SPA (JavaScript).

백엔드 레포: `scms-be`

---

## 기술 스택

| 항목 | 선택 | 이유 |
| --- | --- | --- |
| 빌드 도구 | Vite 6 | dev 서버 즉시 기동, 프록시 설정 간단 |
| 언어 | **JavaScript (JSX)** | 기초를 먼저 다지기 위해 TypeScript 없이 시작 |
| 라우팅 | react-router-dom 6 | 사용자 유형별 라우트 분기 |
| 서버 상태 | TanStack Query 5 | 로딩/에러/캐시 처리 자동화 |
| 클라이언트 상태 | Zustand | 로그인 사용자 전역 상태 |
| HTTP | axios | 인터셉터로 토큰 첨부·에러 통일 |
| 린트/포맷 | ESLint 9 + Prettier | 팀 코드 스타일 통일 |

**아직 설치하지 않은 것** (필요해지면 추가):

| 패키지 | 언제 필요해지나 |
| --- | --- |
| `react-hook-form` + `zod` | 진단검사 문항 응답, 구인공고 등록처럼 입력 필드가 많은 폼을 만들 때 |
| `openapi-typescript` 등 | TypeScript 도입 시 |

---

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

http://localhost:5173 접속. 백엔드(8080)가 떠 있으면 홈에 `pong`이 표시됩니다.

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (5173) |
| `npm run build` | 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 결과 로컬 확인 |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier 일괄 포맷 |

---

## 폴더 구조

```
src/
├─ api/
│  ├─ client.js        axios 인스턴스 + 인터셉터 + downloadFile()
│  └─ health.js        연동 확인용
├─ components/
│  ├─ layout/          RootLayout.jsx
│  └─ common/          공용 컴포넌트
├─ constants/
│  └─ domain.js        USER_TYPE, DEPARTMENT, APPROVAL_STATUS + 한글 라벨
├─ pages/
│  ├─ auth/            로그인
│  ├─ program/         비교과프로그램   P1100, P1200
│  ├─ competency/      핵심역량·진단    P2100, P2200
│  ├─ counsel/         상담관리         P3100
│  ├─ mileage/         마일리지         P4100
│  └─ career/          취창업관리       P5100
├─ routes/
│  ├─ router.jsx       라우트 정의 (사용자 유형별로 구획됨)
│  └─ ProtectedRoute.jsx
├─ stores/authStore.js 로그인 사용자 전역 상태
├─ hooks/, utils/, styles/
```

`@/` 는 `src/` 를 가리킵니다. `import { apiClient } from '@/api/client'` 형태로 쓰세요.

> `jsconfig.json` 이 있어야 VS Code가 `@/` 경로를 인식하고 자동완성·정의로 이동이 됩니다.
> 삭제하지 마세요. (빌드에는 영향 없고 에디터 전용입니다)

---

## 사용자 유형별 라우팅

이 시스템은 사용자 유형이 **4종**(학생/교직원/상담사/기업체)이라
같은 URL이라도 접근 가능 여부가 다릅니다.
`routes/router.jsx` 가 유형별로 구획되어 있으니 새 페이지는 해당 블록에 추가하세요.

```jsx
{
  element: <ProtectedRoute allow={[USER_TYPE.STUDENT]} />,
  children: [
    { path: 'competency/diagnosis', element: <DiagnosisPage /> },
  ],
}
```

> **프론트의 라우트 차단은 UX용이지 보안 수단이 아닙니다.**
> 브라우저에서 우회할 수 있으므로 실제 권한 검증은 백엔드가 최종 책임집니다.
> 프론트에서 막았다고 백엔드 검증을 생략하면 안 됩니다.

---

## 도메인 상수는 `constants/domain.js` 한 곳에서

`USER_TYPE`, `DEPARTMENT`, `APPROVAL_STATUS` 는 **백엔드 enum과 값이 정확히 일치**해야 합니다.

```jsx
// BAD
if (application.status === 'APPROVE') { ... }   // 오타. JS는 알려주지 않습니다

// GOOD
import { APPROVAL_STATUS, APPROVAL_STATUS_LABEL } from '@/constants/domain';
if (application.status === APPROVAL_STATUS.APPROVED) { ... }
<span>{APPROVAL_STATUS_LABEL[application.status]}</span>
```

**TypeScript를 안 쓰기로 했기 때문에 이 규칙이 특히 중요합니다.**
문자열 오타는 컴파일 에러가 아니라 "조용히 동작 안 함"으로 나타나고,
그때는 이미 원인을 찾기 어려워진 뒤입니다.

백엔드 `global/common/enums/` 가 바뀌면 이 파일도 같이 수정하고 PR에 서로를 링크하세요.

---

## API 연동 규칙

### 1. CORS는 개발 중엔 신경 쓰지 않습니다

`vite.config.js` 프록시가 `/api/*` 를 `localhost:8080` 으로 넘겨줍니다.
배포 시에는 `.env.production` 의 `VITE_API_BASE_URL` 에 실제 도메인을 넣고,
백엔드 `app.cors.allowed-origins` 에 프론트 도메인을 추가해야 합니다.

### 2. 응답 껍데기는 인터셉터가 벗깁니다

백엔드는 `{ success, data, code, message }` 로 응답하지만
`apiClient` 인터셉터가 `data` 만 꺼내 반환합니다.
실패하면 `ApiError`(code, message)가 throw 됩니다.

```js
import { ApiError } from '@/api/client';

try {
  await applyProgram(programId);
} catch (e) {
  if (e instanceof ApiError && e.code === 'P004') {
    alert('모집 정원이 초과되었습니다.');
  }
}
```

에러 코드 목록은 백엔드 `global/error/ErrorCode.java` 참조.

### 3. 파일 다운로드는 `downloadFile()` 사용

취업통계 엑셀, 수료증 PDF 등은 응답이 JSON이 아니라 blob이라
일반 `apiClient` 로는 처리되지 않습니다.

```js
import { downloadFile } from '@/api/client';

await downloadFile('/staff/career/statistics/excel', '취업통계.xlsx');
```

### 4. 백엔드 스펙은 Swagger에서 확인

http://localhost:8080/swagger-ui.html

---

## 개발 규칙

### 브랜치

```
main                              배포 가능 상태
develop                           통합 브랜치
feat(WP-11)/diagnosis-page      작업 브랜치 (프로세스 ID 사용, BE와 동일)
```

### 커밋 메시지

```
feat(WP-12): 역량진단 응시 화면 구현
fix(WP-22): 프로그램 목록 페이지네이션 오류 수정
style(WP-22): 상담 예약 캘린더 반응형 대응
refactor(WP-22): apiClient 에러 처리 정리
chore(WP-22): 패키지 업데이트
```

### JavaScript로 진행할 때 지켜야 할 것

Java와 달리 타입 검증을 하지 않아 사람이 대신 지켜야 합니다.

1. **문자열 상수는 반드시 `constants/domain.js` 에서 import** (위 섹션 참고)
2. **API 함수는 `api/` 폴더에만** 두고, 컴포넌트 안에서 `axios`를 직접 부르지 마세요.
   응답 형태가 바뀌었을 때 고쳐야 할 곳이 한 군데로 모입니다.
3. **응답 데이터 구조를 JSDoc으로 남기세요.** 에디터 자동완성이 동작합니다.

   ```js
   /**
    * @param {number} programId
    * @returns {Promise<{id: number, name: string, capacity: number}>}
    */
   export const fetchProgram = async (programId) => { ... };
   ```

4. **옵셔널 체이닝을 습관화하세요.** `data.user.name` 대신 `data?.user?.name`.
   API 응답이 예상과 다를 때 흰 화면 대신 부분 렌더링이라도 됩니다.
5. 커밋 전 `npm run lint` 를 돌리세요. CI에서도 검사합니다.

### 주의

- `.env.local` 은 커밋하지 않습니다. 변수 추가 시 `.env.example` 에 키만 반영.
- `VITE_` 접두사 환경변수는 **번들에 포함되어 브라우저에 그대로 노출됩니다.**
  API 시크릿 키를 절대 넣지 마세요. 그런 값은 백엔드가 들고 있어야 합니다.
- 상담결과·이력서 등 민감정보는 브라우저 캐시·로컬스토리지에 남기지 마세요.
