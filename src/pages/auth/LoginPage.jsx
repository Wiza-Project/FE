import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UNIVERSITY_NAME } from '@/data/dummy';
import { useAuthStore } from '@/stores/authStore';
import { login as loginApi } from '@/api/auth';
import { USER_TYPE } from '@/constants/domain';

// 포털(학생/교직원)을 화면에서 따로 선택받지 않고 학생 브랜드 컬러를 기본값으로 씁니다.
// 로그인 후 completeLogin()이 응답에 담긴 user.userType으로 화면을 분기합니다.
const BRAND_COLOR = '#2563EB';

// 학번/교번 모두 숫자 8자리(university_no) 형식.
const ID_MAX_LENGTH = 8;

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
 * 학생/교직원 포털을 화면에서 따로 선택받지 않고 하나의 폼으로 로그인합니다.
 * 로그인 성공 응답의 user.userType으로 completeLogin()이 이후 화면만 분기합니다.
 *   TODO: 관리자 로그인이 실제로 필요해지면 별도 경로(/admin/login 등)로 분리예정
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authLogin = useAuthStore((s) => s.login);

  const [id, setId] = useState(() => localStorage.getItem(SAVE_ID_KEY) ?? '');
  const [pw, setPw] = useState('');
  const [saveId, setSaveId] = useState(() => !!localStorage.getItem(SAVE_ID_KEY));
  const [error, setError] = useState(() => {
    const reason = location.state?.reason;
    return reason ? LOGOUT_REASON_MESSAGE[reason] : '';
  });
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // 학생/교직원 모두 이 화면에서 로그인하고, 로그인 성공 후 응답의 user.userType으로만 분기합니다.
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
    // onChange 필터링은 "입력 중" 8자리 초과만 잘라내므로 1~7자리 값이나,
    // onChange를 거치지 않고 복원된 localStorage 저장값은 여기서 막아야 합니다.
    // 백엔드 LoginRequest의 @Pattern("\d{8}") 검증 메시지와 문구를 맞췄습니다.
    if (!/^\d{8}$/.test(id)) {
      setError('아이디는 숫자 8자리로 입력해주세요.');
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
        // 아이디/비밀번호 불일치.
        // 1~2회는 단순 오타일 가능성이 높아 카운트 없이 안내만 하고,
        // 3회차부터 남은 횟수를 보여줘 잠금이 다가온다는 걸 알립니다.
        // 백엔드는 MAX_ATTEMPTS번째 실패(=지금 이 응답)에서 이미 계정을 LOCKED로
        // 전환한 뒤에도 그 시도 자체는 U003으로 응답합니다 — 상태 판정보다 실패 카운트
        // 반영이 먼저 실행되기 때문입니다. 즉 이 메시지가 뜨는 시점엔 이미 잠긴 상태이므로
        // "계속 실패하면"처럼 미래형으로 경고하지 않고 잠겼다고 바로 안내합니다.
        // (다음 시도부터는 백엔드가 U005로 응답 — 아래 U004/U005/U006 분기 참고)

        // ApiResponse에는 잔여 횟수/잠금여부가 없음
        //TODO: 백엔드 U003 응답바디에 실제 잔여 횟수/잠금 여부를 내려주고 여기서 그 값을 쓰도록 수정할 예정
        const next = attempts + 1;
        setAttempts(next);
        setError(
          next >= MAX_ATTEMPTS
            ? '계정이 잠겼습니다. 비밀번호 찾기를 이용하거나 관리자에게 문의하세요.'
            : next >= 3
              ? `${err.message} (${next}/${MAX_ATTEMPTS}회)`
              : err.message,
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
              <div className="h-1" style={{ background: BRAND_COLOR }} />

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
                  <label htmlFor="login-id" className="text-[13px] font-semibold text-[#1F2328]">
                    아이디
                  </label>
                  <input
                    id="login-id"
                    type="text"
                    inputMode="numeric"
                    value={id}
                    onChange={(e) => {
                      // 학번/교번은 숫자 8자리 — 숫자 이외 입력은 제거하고 8자리를 넘는 입력은 자릅니다.
                      // (붙여넣기로 "2024-1234" 같은 형식이 들어와도 숫자만 추출해 앞 8자리까지 반영)
                      setId(e.target.value.replace(/\D/g, '').slice(0, ID_MAX_LENGTH));
                      setError('');
                    }}
                    placeholder="아이디 8자리 입력"
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
                  <span className="text-[13px] text-[#656D76]">아이디 저장</span>
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
                  style={{ background: BRAND_COLOR }}
                >
                  {loading && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  로그인
                </button>
              </form>
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
