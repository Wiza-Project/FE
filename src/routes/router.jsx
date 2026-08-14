import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '@/components/layout/RootLayout';
import PortalShell from '@/components/layout/PortalShell';
import ProtectedRoute from '@/routes/ProtectedRoute';
import { USER_TYPE } from '@/constants/domain';
import { ComingSoon } from '@/components/common';

import HomePage from '@/pages/HomePage';
import MyPage from '@/pages/MyPage';
import CompetencyPage from '@/pages/competency/CompetencyPage';
import ExtracurrPage from '@/pages/program/ExtracurrPage';
import CounselingPage from '@/pages/counsel/CounselingPage';
import MileagePage from '@/pages/mileage/MileagePage';
import CareerPage from '@/pages/career/CareerPage';
import StaffDashboard from '@/pages/staff/StaffDashboard';
import StaffExtracurrPage from '@/pages/staff/extracurr/StaffExtracurrPage';
import StaffCompetencyPage from '@/pages/staff/competency/StaffCompetencyPage';
import StaffMileagePage from '@/pages/staff/mileage/StaffMileagePage';
import StaffEmploymentPage from '@/pages/staff/career/StaffEmploymentPage';
import StaffCounselingPage from '@/pages/staff/counsel/StaffCounselingPage';
import LoginPage from '@/pages/auth/LoginPage';
import ConsentPage from '@/pages/auth/ConsentPage';
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
 *   /staff/*       교직원 포털
 *   /admin/*       관리자 포털 (향후 추가)
 *
 * 로그인/동의 화면과 로그인 이후 포털(학생·교직원)은 각각 전체 화면 디자인을 갖고 있어
 * RootLayout(공개 페이지용 헤더·푸터)을 쓰지 않고 최상위 라우트로 분리했습니다.
 * PortalShell이 포털 공통 사이드바·상단바 역할을 합니다.
 *
 * 아직 화면이 없는 항목은 ComingSoon 플레이스홀더로 채워뒀습니다. 페이지를 만들면서
 * 하나씩 실제 컴포넌트로 교체하세요.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'forbidden', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // ── 로그인 / 최초 동의 (전체 화면, 헤더 없음) ─────────────
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{ path: '/consent', element: <ConsentPage /> }],
  },

  // ── 학생 포털 ──────────────────────────────────────────
  {
    element: <ProtectedRoute allow={[USER_TYPE.STUDENT]} />,
    children: [
      {
        element: <PortalShell />,
        children: [
          { path: '/my', element: <MyPage /> },
          { path: '/competency', element: <CompetencyPage /> },
          { path: '/programs', element: <ExtracurrPage /> },
          { path: '/counsel', element: <CounselingPage /> },
          { path: '/mileage', element: <MileagePage /> },
          { path: '/career', element: <CareerPage /> },
          { path: '/notice', element: <ComingSoon label="공지·문의" /> },
        ],
      },
    ],
  },

  // ── 교사(교수) 포털 ────────────────────────────────────
  // TODO: PROFESSOR 포털 페이지 구현 예정
  // {
  //   element: <ProtectedRoute allow={[USER_TYPE.PROFESSOR]} />,
  //   children: [
  //     {
  //       element: <PortalShell />,
  //       children: [
  //         // professor pages
  //       ],
  //     },
  //   ],
  // },

  // ── 교직원 포털 ────────────────────────────────────────
  {
    element: <ProtectedRoute allow={[USER_TYPE.STAFF]} />,
    children: [
      {
        element: <PortalShell />,
        children: [
          { path: '/staff', element: <StaffDashboard /> },
          { path: '/staff/programs', element: <StaffExtracurrPage /> },
          { path: '/staff/competency', element: <StaffCompetencyPage /> },
          { path: '/staff/counsel', element: <StaffCounselingPage /> },
          { path: '/staff/mileage', element: <StaffMileagePage /> },
          { path: '/staff/career', element: <StaffEmploymentPage /> },
          { path: '/staff/career/statistics', element: <StaffEmploymentPage /> },
        ],
      },
    ],
  },

  // ── 관리자 포털 ────────────────────────────────────────
  // TODO: ADMIN 포털 페이지 구현 예정
  // {
  //   element: <ProtectedRoute allow={[USER_TYPE.ADMIN]} />,
  //   children: [
  //     {
  //       element: <PortalShell />,
  //       children: [
  //         // admin pages
  //       ],
  //     },
  //   ],
  // },
]);
