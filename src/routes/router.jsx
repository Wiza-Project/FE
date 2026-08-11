import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '@/components/layout/RootLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';
import { USER_TYPE } from '@/constants/domain';

import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/auth/LoginPage';
import ForbiddenPage from '@/pages/ForbiddenPage';
import NotFoundPage from '@/pages/NotFoundPage';

/**
 * 라우트 구조는 프로세스 흐름도의 5개 파트를 따릅니다.
 *
 *   /programs      비교과프로그램   P1100, P1200
 *   /competency    핵심역량·진단    P2100, P2200
 *   /counsel       상담관리         P3100
 *   /mileage       마일리지         P4100
 *   /career        취창업관리       P5100
 *   /admin/*       교직원 관리 화면
 *
 * 주석 처리된 라우트는 페이지를 만들면서 하나씩 열어가세요.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'forbidden', element: <ForbiddenPage /> },

      // ── 로그인 필요 (유형 무관) ────────────────────────────
      {
        element: <ProtectedRoute />,
        children: [
          // { path: 'programs', element: <ProgramListPage /> },
          // { path: 'programs/:id', element: <ProgramDetailPage /> },
        ],
      },

      // ── 학생 전용 ──────────────────────────────────────────
      {
        element: <ProtectedRoute allow={[USER_TYPE.STUDENT]} />,
        children: [
          // { path: 'my/programs', element: <MyProgramPage /> },
          // { path: 'competency/diagnosis', element: <DiagnosisPage /> },
          // { path: 'counsel/reserve', element: <CounselReservePage /> },
          // { path: 'mileage/my', element: <MyMileagePage /> },
          // { path: 'career/portfolio', element: <PortfolioPage /> },
        ],
      },

      // ── 상담사 전용 ────────────────────────────────────────
      {
        element: <ProtectedRoute allow={[USER_TYPE.COUNSELOR]} />,
        children: [
          // { path: 'counselor/schedules', element: <CounselorSchedulePage /> },
          // { path: 'counselor/results', element: <CounselResultPage /> },
        ],
      },

      // ── 기업체 전용 ────────────────────────────────────────
      {
        element: <ProtectedRoute allow={[USER_TYPE.COMPANY]} />,
        children: [
          // { path: 'company/job-postings', element: <JobPostingPage /> },
        ],
      },

      // ── 교직원 전용 ────────────────────────────────────────
      {
        element: <ProtectedRoute allow={[USER_TYPE.STAFF]} />,
        children: [
          // { path: 'admin/programs', element: <AdminProgramPage /> },
          // { path: 'admin/competency', element: <AdminCompetencyPage /> },
          // { path: 'admin/mileage', element: <AdminMileagePage /> },
          // { path: 'admin/career/statistics', element: <EmploymentStatisticsPage /> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
