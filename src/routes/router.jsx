import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '@/components/layout/RootLayout';
import PortalShell from '@/components/layout/PortalShell';
import ProtectedRoute from '@/routes/ProtectedRoute';
import CounselOperationRoute from '@/routes/CounselOperationRoute';
import { USER_TYPE } from '@/constants/domain';
import HomePage from '@/pages/HomePage';
import MyPage from '@/pages/MyPage';
import AcademicRecordPage from '@/pages/records/AcademicRecordPage';
import CompetencyPage from '@/pages/competency/CompetencyPage';
import ExtracurrPage from '@/pages/program/ExtracurrPage';
import CounselingPage from '@/pages/counsel/CounselingPage';
import MileagePage from '@/pages/mileage/MileagePage';
import CareerPage from '@/pages/career/CareerPage';
import NoticePage from '@/pages/notice/NoticePage';
import StaffDashboard from '@/pages/staff/StaffDashboard';
import StaffExtracurrPage from '@/pages/staff/extracurr/StaffExtracurrPage';
import StaffCompetencyPage from '@/pages/staff/competency/StaffCompetencyPage';
import StaffMileagePage from '@/pages/staff/mileage/StaffMileagePage';
import StaffEmploymentPage from '@/pages/staff/career/StaffEmploymentPage';
import StaffCounselingPage from '@/pages/staff/counsel/StaffCounselingPage';
import StaffBoardsPage from '@/pages/staff/boards/StaffBoardsPage';
import StudentRecords from '@/pages/staff/students/StudentRecords';
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
 *   /notice        공지·FAQ         (Q&A·질문 등록·담당자 답변·비밀글·문의 템플릿은 다음 스코프)
 *   /staff/*       교직원 포털
 *
 * ADMIN 포털은 별도로 만들지 않기로 결정했습니다(2026-08-18). USER_TYPE.ADMIN 값
 * 자체는 백엔드 계정 분류상 유지되지만, 이 값을 가진 계정을 위한 전용 화면은 없습니다.
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
  // /consent 는 "아직 공통 동의를 안 한 사람"이 보는 화면이라 공통 동의 게이트를 꺼야 합니다.
  {
    element: <ProtectedRoute requireCommonConsent={false} />,
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
          { path: '/my/records', element: <AcademicRecordPage /> },
          { path: '/competency', element: <CompetencyPage /> },
          { path: '/programs', element: <ExtracurrPage /> },
          { path: '/counsel', element: <CounselingPage /> },
          { path: '/mileage', element: <MileagePage /> },
          { path: '/career', element: <CareerPage /> },
          { path: '/notice', element: <NoticePage /> },
        ],
      },
    ],
  },

  // ── 교직원 포털 ────────────────────────────────────────
  // 교수도 별도 포털 없이 이 교직원 포털을 그대로 사용(2026-08-21 확인).
  // role_code 기반 화면/권한 분기가 필요해지면
  // ProtectedRoute의 role_code 쪽에서 처리
  {
    element: <ProtectedRoute allow={[USER_TYPE.STAFF]} />,
    children: [
      {
        element: <PortalShell />,
        children: [
          { path: '/staff', element: <StaffDashboard /> },
          { path: '/staff/programs', element: <StaffExtracurrPage /> },
          { path: '/staff/competency', element: <StaffCompetencyPage /> },
          {
            element: <CounselOperationRoute />,
            children: [{ path: '/staff/counsel', element: <StaffCounselingPage /> }],
          },
          { path: '/staff/students', element: <StudentRecords /> },
          { path: '/staff/boards', element: <StaffBoardsPage /> },
          { path: '/staff/mileage', element: <StaffMileagePage /> },
          { path: '/staff/career', element: <StaffEmploymentPage /> },
          { path: '/staff/career/statistics', element: <StaffEmploymentPage /> },
        ],
      },
    ],
  },
]);
