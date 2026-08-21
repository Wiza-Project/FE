import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UNIVERSITY_NAME } from '@/data/dummy';
import { useAuthStore } from '@/stores/authStore';
import { login as loginApi } from '@/api/auth';
import { USER_TYPE } from '@/constants/domain';

const PORTAL_CONFIG = {
  student: { label: '학생', color: '#2563EB', idLabel: '학번', idPlaceholder: '학번 8자리 입력' },
  staff: { label: '교직원', color: '#7C3AED', idLabel: '교번', idPlaceholder: '교번 입력' },
};

// 로그인 화면 진입 사유(자동 로그아웃)별 안내 문구.
// ProtectedRoute(유휴 타임아웃 / 세션 만료)가 location.state.reason 으로 넘겨줍니다.
const LOGOUT_REASON_MESSAGE = {
  idle: '30분 동안 활동이 없어 자동 로그아웃되었습니다.',
  session_expired: '세션이 만료되었습니다. 다시 로그인해주세요.',
};

const MAX_ATTEMPTS = 5;

const SAVE_ID_KEY = 'sicms_saved_id';
const FIRST_LOGIN_KEY = 'sicms_first_login_done';

/**
 * 로그인 화면.
 *
 * 포털 탭은 학생/교직원 2개만 노출
 *   TODO: 관리자 로그인이 실제로 필요해지면 별도 경로(/admin/login 등)로 분리예정
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authLogin = useAuthStore((s) => s.login);

  const [portal, setPortal] = useState('student');
  const [id, setId] = useState(() => localStorage.getItem(SAVE_ID_KEY) ?? '');
  const [pw, setPw] = useState('');
  const [saveId, setSaveId] = useState(() => !!localStorage.getItem(SAVE_ID_KEY));
  const [error, setError] = useState(() => {
    const reason = location.state?.reason;
    return reason ? LOGOUT_REASON_MESSAGE[reason] : '';
  });
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const cfg = PORTAL_CONFIG[portal];

  const selectPortal = (p) => {
    setPortal(p);
    setError('');
    setAttempts(0);
  };

  const completeLogin = (user) => {
    if (user.userType === USER_TYPE.STUDENT) {
      const isFirst = !localStorage.getItem(FIRST_LOGIN_KEY);
      navigate(isFirst ? '/consent' : '/my');
      return;
    }
    if (user.userType === USER_TYPE.STAFF) {
      navigate('/staff');
      return;
    }
    // STUDENT/STAFF 외 유형은 아직 연결된 포털이 없습니다.
    navigate('/');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!id.trim()) {
      setError('아이디를 입력해주세요.');
      return;
    }
    if (!pw) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginApi({ loginId: id.trim(), password: pw });
      if (saveId) localStorage.setItem(SAVE_ID_KEY, id.trim());
      else localStorage.removeItem(SAVE_ID_KEY);
      setAttempts(0);
      authLogin(data.user, data.accessToken);
      completeLogin(data.user);
    } catch (err) {
      if (err.code === 'U003') {
        // 아이디/비밀번호 불일치. 클라이언트에서 계정을 잠그는 건 아니므로
        // "잠겼다"고 단정하지 않고, 반복 실패 시 비밀번호 찾기를 안내합니다.
        const next = attempts + 1;
        setAttempts(next);
        setError(
          next >= MAX_ATTEMPTS
            ? `${err.message}\n계속 실패하신다면 아이디를 다시 확인하시거나 '비밀번호 찾기'를 이용해주세요.`
            : `${err.message} (${next}/${MAX_ATTEMPTS}회)`,
        );
      } else if (err.code === 'U004' || err.code === 'U005' || err.code === 'U006') {
        // 휴면/잠금/탈퇴 — 백엔드가 내려준 안내 문구를 그대로 보여줍니다. 실패 횟수로 세지 않습니다.
        setError(err.message);
      } else {
        setError(err.message || '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FA]">
      {/* Rainbow top strip */}
      <div
        className="h-1 w-full flex-shrink-0"
        style={{
          background: 'linear-gradient(90deg,#2563EB 0%,#7C3AED 33%,#0891B2 55%,#059669 100%)',
        }}
      />

      {/* Top bar */}
      <header className="bg-white border-b border-[#E5E7EB] px-8 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-[#2563EB] flex items-center justify-center text-white font-black text-[15px]">
            한
          </div>
          <div>
            <div className="text-[14px] font-bold text-[#1F2328]">{UNIVERSITY_NAME}</div>
            <div className="text-[11px] text-[#656D76]">통합 학생역량관리 시스템 (SICMS)</div>
          </div>
        </div>
      </header>

      {/* Main — 로그인 카드를 화면 중앙에 배치 */}
      <div className="flex-1 flex items-stretch min-h-0">
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[420px]">
            {/* Login card */}
            <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_4px_28px_rgba(0,0,0,0.08)] overflow-hidden">
              {/* Color bar */}
              <div className="h-1" style={{ background: cfg.color }} />

              {/* Title */}
              <div className="px-8 pt-7 pb-1">
                <h1 className="text-[22px] font-bold text-[#1F2328]">로그인</h1>
                <p className="text-[13px] text-[#656D76] mt-1">
                  학사행정시스템 계정으로 로그인합니다.
                </p>
              </div>

              <form onSubmit={handleLogin} className="px-8 py-5 flex flex-col gap-4">
                {/* ID */}
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-semibold text-[#1F2328]">{cfg.idLabel}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={id}
                    onChange={(e) => {
                      // 학번/교번은 숫자로만 구성됩니다 — 숫자 이외 입력은 즉시 제거.
                      setId(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    placeholder={cfg.idPlaceholder}
                    autoFocus
                    className="h-10 rounded-[6px] border border-[#E5E7EB] bg-white px-3.5 text-[14px] text-[#1F2328] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors disabled:bg-[#F9FAFB] disabled:text-[#9AA0A6]"
                  />
                </div>

                {/* PW */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-[#1F2328]">비밀번호</label>
                    <button type="button" className="text-[12px] text-[#2563EB] hover:underline">
                      비밀번호 찾기
                    </button>
                  </div>
                  <input
                    type="password"
                    value={pw}
                    onChange={(e) => {
                      setPw(e.target.value);
                      setError('');
                    }}
                    placeholder="비밀번호 입력"
                    className="h-10 rounded-[6px] border border-[#E5E7EB] bg-white px-3.5 text-[14px] text-[#1F2328] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors disabled:bg-[#F9FAFB] disabled:text-[#9AA0A6]"
                  />
                </div>

                {/* Save ID */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveId}
                    onChange={(e) => setSaveId(e.target.checked)}
                    className="w-4 h-4 rounded-[3px] border-[#D1D5DB] accent-[#2563EB]"
                  />
                  <span className="text-[13px] text-[#656D76]">학번 저장</span>
                </label>

                {/* Error */}
                {error && (
                  <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-3.5 py-3 flex gap-2.5">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 16 16"
                      fill="#CF222E"
                      className="flex-shrink-0 mt-0.5"
                    >
                      <circle cx="8" cy="8" r="7" />
                      <path
                        d="M8 4v4M8 11h.01"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <p className="text-[12px] text-[#CF222E] whitespace-pre-line leading-relaxed">
                      {error}
                    </p>
                  </div>
                )}

                {/* Login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-[6px] text-white font-bold text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
                  style={{ background: cfg.color }}
                >
                  {loading && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  로그인
                </button>

                {/* Fail count bar */}
                {attempts > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#CF222E] rounded-full transition-all"
                        style={{ width: `${Math.min((attempts / MAX_ATTEMPTS) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#CF222E] font-semibold">
                      {attempts}/{MAX_ATTEMPTS}
                    </span>
                  </div>
                )}
              </form>

              {/* Portal tabs */}
              <div className="border-t border-[#F3F4F6] px-8 py-4 bg-[#FAFAFA]">
                <p className="text-[11px] font-semibold text-[#9AA0A6] uppercase tracking-wide mb-2.5">
                  포털 선택
                </p>
                <div className="flex gap-2">
                  {['student', 'staff'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => selectPortal(p)}
                      className={`px-3 py-1.5 rounded-[999px] text-[12px] font-bold transition-all border ${portal === p ? 'text-white border-transparent' : 'bg-white border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB]'}`}
                      style={portal === p ? { background: PORTAL_CONFIG[p].color } : {}}
                    >
                      {PORTAL_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom links */}
            <div className="mt-5 flex items-center justify-center gap-4">
              {[
                { label: '🏛 학사 포털' },
                { label: '📚 LMS (e-Class)' },
                { label: '📖 도서관' },
              ].map((item, i) => (
                <button
                  key={i}
                  className="text-[12px] text-[#9AA0A6] hover:text-[#656D76] transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-center text-[11px] text-[#C4C9CF] mt-4">
              © 2026 {UNIVERSITY_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
