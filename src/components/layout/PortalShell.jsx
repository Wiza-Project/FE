import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { USER_TYPE } from '@/constants/domain';
import { UNIVERSITY_NAME, SEMESTERS } from '@/data/dummy';
import { toast } from '@/components/common';
import {
  useHasUnreadNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/utils/date';

// ─── Icon primitives ─────────────────────────────────────────────────────────

const Icon = {
  User: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" opacity=".7" />
    </svg>
  ),
  Star: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1l1.854 3.756L14 5.522l-3 2.923.708 4.127L8 10.5l-3.708 2.072L5 8.445 2 5.522l4.146-.766z" />
    </svg>
  ),
  Grid: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="4" height="4" rx="1" />
      <rect x="6" y="1" width="4" height="4" rx="1" />
      <rect x="11" y="1" width="4" height="4" rx="1" />
      <rect x="1" y="6" width="4" height="4" rx="1" />
      <rect x="6" y="6" width="4" height="4" rx="1" />
      <rect x="11" y="6" width="4" height="4" rx="1" />
      <rect x="1" y="11" width="4" height="4" rx="1" />
      <rect x="6" y="11" width="4" height="4" rx="1" />
      <rect x="11" y="11" width="4" height="4" rx="1" />
    </svg>
  ),
  Chat: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h2v3l3-3h7a1 1 0 001-1V3a1 1 0 00-1-1z" />
    </svg>
  ),
  Coin: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="8" r="7" opacity=".2" />
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="8" y="12" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">
        ₩
      </text>
    </svg>
  ),
  Briefcase: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="5" width="14" height="9" rx="1.5" opacity=".7" />
      <path d="M5 5V3.5A1.5 1.5 0 016.5 2h3A1.5 1.5 0 0111 3.5V5" />
      <line x1="1" y1="10" x2="15" y2="10" stroke="white" strokeWidth="1" />
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a5 5 0 00-5 5v3l-1.5 2h13L13 9V6a5 5 0 00-5-5z" />
      <path d="M6.5 13a1.5 1.5 0 003 0" opacity=".7" />
    </svg>
  ),
  Chart: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="10" width="3" height="5" rx="1" />
      <rect x="6" y="6" width="3" height="9" rx="1" />
      <rect x="11" y="2" width="3" height="13" rx="1" />
    </svg>
  ),
  Notice: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3h12v8H9l-3 3V11H2z" opacity=".7" />
    </svg>
  ),
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M2 4l4 4 4-4" />
    </svg>
  ),
  Logout: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3M11 5l3 3-3 3M15 8H7" />
    </svg>
  ),
};

// ─── Nav config ──────────────────────────────────────────────────────────────
// NOTE: Figma 프로토타입에는 admin/enterprise 포털 내비게이션도 있었지만,
// 이번 1차 마이그레이션은 STUDENT/STAFF 두 유형만 라우터에 연결합니다.
// COUNSELOR/COMPANY 포털이 설계되면 이 파일에 nav 설정을 추가하세요.

const NAV_STUDENT = [
  { key: 'mypage', label: '마이페이지', icon: Icon.User, accent: '#6B7280', path: '/my' },
  {
    key: 'competency',
    label: '핵심역량진단',
    icon: Icon.Star,
    accent: '#7C3AED',
    path: '/competency',
  },
  {
    key: 'extracurr',
    label: '비교과 프로그램',
    icon: Icon.Grid,
    accent: '#2563EB',
    path: '/programs',
  },
  { key: 'counseling', label: '학생상담', icon: Icon.Chat, accent: '#0891B2', path: '/counsel' },
  { key: 'mileage', label: '마일리지', icon: Icon.Coin, accent: '#D97706', path: '/mileage' },
  { key: 'career', label: '취업·창업', icon: Icon.Briefcase, accent: '#059669', path: '/career' },
  { key: 'notice', label: '공지·문의', icon: Icon.Notice, accent: '#6B7280', path: '/notice' },
];

// 교직원 포털은 업무시스템 톤(무채색 + 단일 포인트컬러)을 따릅니다.
// 항목별로 다른 색을 쓰지 않고 STAFF_ACCENT 하나로 통일합니다.
const NAV_STAFF = [
  { key: 'dashboard', label: '대시보드', icon: Icon.Dashboard, path: '/staff' },
  { key: 'extracurr', label: '비교과 운영', icon: Icon.Grid, path: '/staff/programs' },
  { key: 'competency', label: '핵심역량 관리', icon: Icon.Star, path: '/staff/competency' },
  { key: 'counseling', label: '상담 운영', icon: Icon.Chat, path: '/staff/counsel' },
  { key: 'records', label: '학적 조회', icon: Icon.User, path: '/staff/students' },
  { key: 'mileage', label: '마일리지 심사', icon: Icon.Coin, path: '/staff/mileage' },
  { key: 'career', label: '취업·창업 운영', icon: Icon.Briefcase, path: '/staff/career' },
  {
    key: 'statistics',
    label: '통계',
    icon: Icon.Chart,
    path: '/staff/career/statistics',
  },
];

const PORTAL_NAVS = { student: NAV_STUDENT, staff: NAV_STAFF };
const PORTAL_LABELS = { student: '학생 포털', staff: '교직원 포털' };
// 학생 포털은 브랜드 블루 유지, 교직원 포털은 행정시스템 톤(거의 무채색)의 단일 포인트컬러 사용
const PORTAL_COLORS = { student: '#2563EB', staff: '#1F2937' };

// 알림의 moduleCode(백엔드 ModuleCode enum: PROGRAM/COUNSEL/MILEAGE/CAREER/COMPETENCY)를
// 포털별 라우트 경로로 매핑합니다. 알림 응답에 레코드 ID가 없어 특정 항목이 아닌
// 해당 도메인의 메인 페이지로 이동합니다. 새 ModuleCode가 추가되면 여기도 함께 갱신하세요.
const MODULE_ROUTES = {
  student: {
    PROGRAM: '/programs',
    COUNSEL: '/counsel',
    MILEAGE: '/mileage',
    CAREER: '/career',
    COMPETENCY: '/competency',
  },
  staff: {
    PROGRAM: '/staff/programs',
    COUNSEL: '/staff/counsel',
    MILEAGE: '/staff/mileage',
    CAREER: '/staff/career',
    COMPETENCY: '/staff/competency',
  },
};

// 알림 드롭다운에 보여줄 개수. 상세 목록/유형별 필터는 이번 스코프 밖입니다.
const NOTIFICATION_DROPDOWN_SIZE = 5;

const PROFILE_MENU = [
  { label: '내 정보 수정', icon: '✎' },
  { label: '비밀번호 변경', icon: '🔒' },
  { label: '알림 설정', icon: '🔔' },
];

/**
 * 로그인 이후 화면(학생/교직원 포털)의 공통 셸: 좌측 사이드바 + 상단바 + 컨텐츠(Outlet).
 * 라우터의 ProtectedRoute 하위 레이아웃 라우트로 사용합니다.
 */
export default function PortalShell() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const portal = user?.userType === USER_TYPE.STAFF ? 'staff' : 'student';
  const nav = PORTAL_NAVS[portal];
  const portalColor = PORTAL_COLORS[portal];

  const [semester, setSemester] = useState(SEMESTERS[1] ?? SEMESTERS[0]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  
  useEffect(() => {
    if (!notifOpen && !profileOpen) return;

    const handlePointerDown = (event) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (profileOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [notifOpen, profileOpen]);

  // 뱃지(안읽음 존재 여부)는 상시 폴링, 목록은 드롭다운이 열렸을 때만 요청합니다.
  const { data: hasUnread = false } = useHasUnreadNotifications();
  const { data: notificationPage, isLoading: notificationsLoading } = useNotifications(
    { size: NOTIFICATION_DROPDOWN_SIZE },
    notifOpen,
  );
  const notifications = notificationPage?.content ?? [];
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const handleNotificationClick = (n) => {
    if (!n.read) {
      markReadMutation.mutate(n.notificationId);
    }
    setNotifOpen(false);
    const path = MODULE_ROUTES[portal]?.[n.moduleCode];
    if (path) {
      navigate(path);
    }
  };

  const handleMarkAllRead = () => {
    if (markAllReadMutation.isPending || !hasUnread) return;
    markAllReadMutation.mutate();
  };

  const activeItem =
    nav
      .filter(
        (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
      )
      .sort((a, b) => b.path.length - a.path.length)[0] ?? nav[0];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitial = user?.name?.[0] ?? '?';

  return (
    <div className="flex h-screen overflow-hidden bg-[#F6F8FA]">
      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 bg-[#111827] flex flex-col h-full z-30">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#1F2937]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[6px] flex items-center justify-center text-white font-black text-[14px]"
              style={{ background: portalColor }}
            >
              한
            </div>
            <div>
              <div className="text-white font-bold text-[13px] leading-tight">
                {UNIVERSITY_NAME}
              </div>
              <div className="text-[11px] font-semibold" style={{ color: portalColor }}>
                {PORTAL_LABELS[portal]}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {nav.map((item) => {
            const isActive = item.key === activeItem?.key;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] mb-0.5 text-left transition-colors group relative ${isActive ? 'bg-[#1F2937] text-white' : 'text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white'}`}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: item.accent ?? portalColor }}
                  />
                )}
                <span
                  style={{ color: isActive ? (item.accent ?? portalColor) : undefined }}
                  className="transition-colors"
                >
                  <item.icon />
                </span>
                <span className="text-[13px] font-semibold flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#CF222E] text-white min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-[#1F2937] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#374151] flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white truncate">
                {user?.name ?? '알 수 없음'}
              </div>
              <div className="text-[11px] text-[#6B7280] truncate">
                {portal === 'student'
                  ? `${user?.studentNo ?? ''} · ${user?.department ?? ''}`
                  : (user?.department ?? '')}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="로그아웃"
              className="text-[#6B7280] hover:text-[#9CA3AF] transition-colors p-1"
            >
              <Icon.Logout />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center px-6 gap-4 z-20 flex-shrink-0">
          <div className="flex-1 text-[13px] text-[#9AA0A6]">
            {UNIVERSITY_NAME} &rsaquo; {PORTAL_LABELS[portal]}
          </div>

          {/* Semester selector */}
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="h-8 px-3 pr-7 text-[12px] font-semibold text-[#1F2328] bg-[#F6F8FA] border border-[#E5E7EB] rounded-[6px] appearance-none cursor-pointer focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen((o) => !o);
                setProfileOpen(false);
              }}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] text-[#656D76] transition-colors relative"
            >
              <Icon.Bell />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#CF222E] rounded-full border-2 border-white" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 bg-white rounded-[8px] border border-[#E5E7EB] shadow-xl z-50">
                <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#1F2328]">알림</span>
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markAllReadMutation.isPending || !hasUnread}
                    className="text-[11px] text-[#2563EB] font-semibold hover:underline disabled:text-[#9AA0A6] disabled:no-underline disabled:cursor-not-allowed"
                  >
                    모두 읽음
                  </button>
                </div>
                <div className="divide-y divide-[#F3F4F6] max-h-96 overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="px-4 py-6 text-center text-[12px] text-[#9AA0A6]">
                      불러오는 중...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[12px] text-[#9AA0A6]">
                      새 알림이 없습니다.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const unread = !n.read;
                      return (
                        <div
                          key={n.notificationId}
                          onClick={() => handleNotificationClick(n)}
                          className="px-4 py-3 hover:bg-[#F9FAFB] cursor-pointer flex gap-3"
                        >
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ background: unread ? '#2563EB' : '#D0D7DE' }}
                          />
                          <div>
                            <div className="text-[13px] font-semibold text-[#1F2328]">
                              {n.title}
                            </div>
                            <div className="text-[12px] text-[#656D76] mt-0.5">{n.content}</div>
                            <div className="text-[11px] text-[#9AA0A6] mt-1">
                              {formatRelativeTime(n.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setProfileOpen((o) => !o);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 px-3 h-9 rounded-[6px] hover:bg-[#F3F4F6] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[12px] font-bold text-[#2563EB]">
                {userInitial}
              </div>
              <span className="text-[13px] font-semibold text-[#1F2328]">
                {user?.name ?? '알 수 없음'}
              </span>
              <Icon.ChevronDown />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-11 w-52 bg-white rounded-[8px] border border-[#E5E7EB] shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <div className="text-[13px] font-bold text-[#1F2328]">
                    {user?.name ?? '알 수 없음'}
                  </div>
                  <div className="text-[12px] text-[#656D76]">
                    {user?.studentNo ?? user?.loginId} · {user?.department ?? ''}
                  </div>
                </div>
                {PROFILE_MENU.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setProfileOpen(false);
                      toast(`${item.label} 준비 중입니다.`, 'info');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#1F2328] hover:bg-[#F3F4F6] transition-colors text-left"
                  >
                    <span className="text-[14px]">{item.icon}</span> {item.label}
                  </button>
                ))}
                <div className="border-t border-[#E5E7EB]">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#CF222E] hover:bg-[#FEF2F2] transition-colors text-left"
                  >
                    <Icon.Logout /> 로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter min-h-full p-6">
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
}
