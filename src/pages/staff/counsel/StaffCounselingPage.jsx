import { useState } from 'react';
import ReservationManage from './ReservationManage';
import SessionRecord from './SessionRecord';
import SessionResult from './SessionResult';
import CenterIntake from './CenterIntake';
import MySchedule from './MySchedule';
import { useAuthStore } from '@/stores/authStore';
import { USER_ROLE } from '@/constants/domain';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

const NAV_ITEMS = [
  { key: 'schedule', label: '내 일정', icon: '📅', desc: '가능 시간대 관리' },
  {
    key: 'reservation',
    label: '예약 관리',
    icon: '📋',
    desc: '예약 승인·반려 및 오늘 일정',
    badge: 3,
  },
  { key: 'record', label: '상담 기록', icon: '📝', desc: '비공개 기록 및 공개 요약 작성' },
  { key: 'result', label: '상담 결과', icon: '✅', desc: '결과 확정 및 정정 이력' },
  { key: 'intake', label: '접수·배정', icon: '🏥', desc: '센터 전용 — 접수 및 상담사 배정' },
];


/**
 * 일반 교직원의 상담 운영 화면 허브입니다. 예약 관리·상담 기록·상담 결과·접수·배정을
 * 로컬 상태로 전환합니다. 상담사에게만 본인 일정 탭을 제공합니다.
 */
export default function StaffCounselingPage() {
  const isCounselor = useAuthStore((state) =>
    (state.user?.roleCodes ?? []).includes(USER_ROLE.COUNSELOR),
  );
  const navItems = isCounselor ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.key !== 'schedule');
  const [nav, setNav] = useState(isCounselor ? 'schedule' : 'reservation');
  const current = navItems.find((item) => item.key === nav) ?? navItems[0];

  return (
    <div className="flex gap-0 min-h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 mr-5">
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-black shrink-0"
              style={{ background: ACCENT }}
            >
              ♦
            </div>
            <span className="text-[12px] font-black text-[#1F2328]">상담 운영</span>
          </div>
          <p className="text-[10px] text-[#9AA0A6] leading-relaxed">김담당 · 비교과운영부서</p>
        </div>

        <nav className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
          {navItems.map((item, i) => {
            const active = nav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setNav(item.key)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${i > 0 ? 'border-t border-[#F3F4F6]' : ''} ${active ? 'bg-[#F3F4F6]' : 'hover:bg-[#FAFAFA]'}`}
              >
                <span className={`text-[14px] mt-0.5 shrink-0 ${active ? '' : 'opacity-50'}`}>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p
                      className={`text-[12px] font-bold leading-tight ${active ? '' : 'text-[#444D56]'}`}
                      style={active ? { color: ACCENT } : {}}
                    >
                      {item.label}
                    </p>
                    {item.badge && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white shrink-0"
                        style={{ background: '#CF222E' }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#9AA0A6] leading-snug mt-0.5">{item.desc}</p>
                </div>
                {active && (
                  <div
                    className="ml-auto w-1 self-stretch rounded-full shrink-0"
                    style={{ background: ACCENT }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Privacy notice */}
        <div className="bg-[#FFF7ED] rounded-[8px] border border-[#FED7AA] p-3 mt-3">
          <p className="text-[10px] font-bold text-[#92400E] mb-1">정보 보호 원칙</p>
          <p className="text-[10px] text-[#92400E] leading-relaxed">
            상담 원문은 담당 상담사만 열람 가능합니다. 목록에는 최소 정보만 표시됩니다.
          </p>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] text-[#9AA0A6]">상담 운영</span>
          <span className="text-[11px] text-[#D1D5DB]">/</span>
          <span className="text-[11px] font-bold" style={{ color: ACCENT }}>
            {current.label}
          </span>
        </div>

        {isCounselor && nav === 'schedule' && <MySchedule />}
        {nav === 'reservation' && <ReservationManage />}
        {nav === 'record' && <SessionRecord />}
        {nav === 'result' && <SessionResult />}
        {nav === 'intake' && <CenterIntake />}
      </main>
    </div>
  );
}
