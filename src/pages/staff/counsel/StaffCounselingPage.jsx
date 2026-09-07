import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReservationManage from './ReservationManage';
import SessionRecord from './SessionRecord';
import SessionResult from './SessionResult';
import MySchedule from './MySchedule';
import { fetchPendingCounselorReservations, pendingReservationsQueryKey } from '@/api/counsel';
import { useAuthStore } from '@/stores/authStore';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

const NAV_ITEMS = [
  { key: 'schedule', label: '내 일정', icon: '📅', desc: '가능 시간대 관리' },
  {
    key: 'reservation',
    label: '예약 관리',
    icon: '📋',
    desc: '예약 승인·반려 및 오늘 일정',
  },
  { key: 'record', label: '회기 관리', icon: '📝', desc: '회기 목록·후속 생성·출결 완료·취소' },
  // 상담 결과 정정·버전 이력(상담 도메인 체크리스트 10번)을 구현하면 desc에 '· 정정 이력'을 추가한다.
  { key: 'result', label: '상담 결과', icon: '✅', desc: '결과 저장·공개·완료' },
];

/**
 * 상담 운영 화면 허브입니다. 일정·예약 관리·상담 기록·상담 결과를
 * 로컬 상태로 전환합니다. 이 화면에는 라우트에서 이미 ST200 단독 또는 ST300 단독인
 * 사용자만 도달하므로(routes/CounselOperationRoute.jsx의 canAccessCounselOperation 참고)
 * 여기서 별도의 역할 여부 분기를 두지 않는다. 서버 응답에 담긴 일정·예약·회기 범위를
 * 그대로 쓰고, 화면에서 ST200/ST300에 따라 데이터를 다시 거르지 않는다.
 */
export default function StaffCounselingPage() {
  // 소속 표기는 하드코딩 대신 로그인 사용자 정보를 쓴다. departmentName은 nullable이라
  // 없으면 이름만 노출한다(StaffDashboard.jsx의 subtitle 표현식과 동일한 규칙).
  const user = useAuthStore((state) => state.user);
  const [nav, setNav] = useState(NAV_ITEMS[0].key);
  const current = NAV_ITEMS.find((item) => item.key === nav) ?? NAV_ITEMS[0];
  const selectedNav = current.key;

  // ReservationManage의 첫 페이지 조회와 같은 queryKey를 써서 캐시를 공유하므로
  // 예약 관리 탭을 열어도 중복 요청이 발생하지 않는다.
  const { data: pendingPage } = useQuery({
    queryKey: pendingReservationsQueryKey(0),
    queryFn: () => fetchPendingCounselorReservations({ page: 0, size: 20 }),
  });
  const pendingCount = pendingPage?.totalElements ?? 0;

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
          <p className="text-[10px] text-[#9AA0A6] leading-relaxed">
            {`${user?.name ?? ''}${user?.departmentName ? ` · ${user.departmentName}` : ''}`}
          </p>
        </div>

        <nav className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
          {NAV_ITEMS.map((item, i) => {
            const active = nav === item.key;
            const badge = item.key === 'reservation' && pendingCount > 0 ? pendingCount : null;
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
                    {badge && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white shrink-0"
                        style={{ background: '#CF222E' }}
                      >
                        {badge}
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

        {selectedNav === 'schedule' && <MySchedule />}
        {selectedNav === 'reservation' && <ReservationManage />}
        {selectedNav === 'record' && <SessionRecord />}
        {selectedNav === 'result' && <SessionResult />}
      </main>
    </div>
  );
}
