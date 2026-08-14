import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UNIVERSITY_NAME, CURRENT_USER, STAFF_USERS } from '@/data/dummy';
import { useAuthStore } from '@/stores/authStore';
import { USER_TYPE } from '@/constants/domain';
import { toast } from '@/components/common';

const PORTAL_CONFIG = {
  student: { label: '학생', color: '#2563EB', idLabel: '학번', idPlaceholder: '학번 8자리 입력' },
  staff: { label: '교직원', color: '#7C3AED', idLabel: '교번', idPlaceholder: '교번 입력' },
  admin: {
    label: '관리자',
    color: '#6B7280',
    idLabel: '관리자 ID',
    idPlaceholder: '관리자 ID 입력',
  },
  enterprise: {
    label: '기업',
    color: '#059669',
    idLabel: '기업 ID',
    idPlaceholder: '기업 회원 ID 입력',
  },
};

const DEMO_CREDS = {
  student: { id: '20231234', pw: '1234' },
  staff: { id: 'staff001', pw: '1234' },
  admin: { id: 'admin', pw: '1234' },
  enterprise: { id: 'corp001', pw: '1234' },
};

const MAX_ATTEMPTS = 5;

const SAVE_ID_KEY = 'sicms_saved_id';
const FIRST_LOGIN_KEY = 'sicms_first_login_done';

/**
 * 데모 로그인 화면.
 *
 * 학사행정시스템 연동 전까지는 아이디/비밀번호를 하드코딩된 데모 계정과 비교하는
 * 목업 로그인입니다. 실제 인증 API가 준비되면 handleLogin의 검증 로직을 교체하세요.
 *
 * 학생/교직원 포털만 라우터에 연결되어 있어 이 두 유형만 실제 로그인을 완료합니다.
 * 관리자/기업 데모 탭은 화면 자체는 유지하되, 아직 연결된 포털이 없어 안내 토스트만 띄웁니다.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [portal, setPortal] = useState('student');
  const [id, setId] = useState(() => localStorage.getItem(SAVE_ID_KEY) ?? '');
  const [pw, setPw] = useState('');
  const [saveId, setSaveId] = useState(() => !!localStorage.getItem(SAVE_ID_KEY));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const locked = attempts >= MAX_ATTEMPTS;

  const cfg = PORTAL_CONFIG[portal];

  const completeLogin = (p) => {
    if (p === 'student') {
      login(
        {
          id: 1,
          loginId: id.trim(),
          name: CURRENT_USER.name,
          userType: USER_TYPE.STUDENT,
          department: CURRENT_USER.department,
          studentNo: id.trim(),
        },
        'demo-token',
      );
      const isFirst = !localStorage.getItem(FIRST_LOGIN_KEY);
      navigate(isFirst ? '/consent' : '/my');
      return;
    }
    if (p === 'staff') {
      const staffUser = STAFF_USERS[0];
      login(
        {
          id: 2,
          loginId: id.trim(),
          name: staffUser.name,
          userType: USER_TYPE.STAFF,
          department: staffUser.department,
          studentNo: null,
        },
        'demo-token',
      );
      navigate('/staff');
      return;
    }
    // 관리자/기업 포털은 아직 라우터에 연결되지 않았습니다.
    toast(`${PORTAL_CONFIG[p].label} 포털은 다음 단계에서 연결됩니다.`, 'info');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (locked) return;
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
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    const cred = DEMO_CREDS[portal];
    if (id.trim() === cred.id && pw === cred.pw) {
      if (saveId) localStorage.setItem(SAVE_ID_KEY, id.trim());
      else localStorage.removeItem(SAVE_ID_KEY);
      completeLogin(portal);
    } else {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setError(
          '인증 실패 5회로 계정이 잠겼습니다. 학사지원팀에 문의하세요.\n(내선 1234 / support@korea.ac.kr)',
        );
      } else {
        setError(
          `아이디 또는 비밀번호가 올바르지 않습니다. (${next}/${MAX_ATTEMPTS}회)\n데모: ${cred.id} / ${cred.pw}`,
        );
      }
    }
  };

  const fillDemo = (p) => {
    setPortal(p);
    setId(DEMO_CREDS[p].id);
    setPw(DEMO_CREDS[p].pw);
    setError('');
    setAttempts(0);
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
                    value={id}
                    onChange={(e) => {
                      setId(e.target.value);
                      setError('');
                    }}
                    placeholder={cfg.idPlaceholder}
                    disabled={locked}
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
                    disabled={locked}
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
                  disabled={locked || loading}
                  className="h-11 w-full rounded-[6px] text-white font-bold text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
                  style={{ background: locked ? '#9AA0A6' : cfg.color }}
                >
                  {loading && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {locked ? '계정 잠김' : '로그인'}
                </button>

                {/* Fail count bar */}
                {attempts > 0 && !locked && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#CF222E] rounded-full transition-all"
                        style={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#CF222E] font-semibold">
                      {attempts}/{MAX_ATTEMPTS}
                    </span>
                  </div>
                )}
              </form>

              {/* Demo chips */}
              <div className="border-t border-[#F3F4F6] px-8 py-4 bg-[#FAFAFA]">
                <p className="text-[11px] font-semibold text-[#9AA0A6] uppercase tracking-wide mb-2.5">
                  프로토타입 데모 계정
                </p>
                <div className="flex gap-2">
                  {['student', 'staff', 'admin', 'enterprise'].map((p) => (
                    <button
                      key={p}
                      onClick={() => fillDemo(p)}
                      className={`px-3 py-1.5 rounded-[999px] text-[12px] font-bold transition-all border ${portal === p && id === DEMO_CREDS[p].id ? 'text-white border-transparent' : 'bg-white border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB]'}`}
                      style={
                        portal === p && id === DEMO_CREDS[p].id
                          ? { background: PORTAL_CONFIG[p].color }
                          : {}
                      }
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
