import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { USER_TYPE_LABEL } from '@/constants/domain';

export default function RootLayout() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <div className="layout">
      <header className="layout__header">
        <Link to="/" className="layout__brand">
          학생통합역량시스템
        </Link>
        <nav className="layout__nav">
          {isAuthenticated && user ? (
            <>
              <span className="layout__user">
                {user.name} ({USER_TYPE_LABEL[user.userType]})
              </span>
              <button type="button" onClick={logout}>
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login">로그인</Link>
          )}
        </nav>
      </header>

      <main className="layout__main">
        <Outlet />
      </main>

      <footer className="layout__footer">학생역량센터</footer>
    </div>
  );
}
