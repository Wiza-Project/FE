import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TabJobReview from './TabJobReview';
import TabPostManagement from './TabPostManagement';
import TabCompanyCert from './TabCompanyCert';
import TabJobMatching from './TabJobMatching';
import TabEmploymentStats from './TabEmploymentStats';

const ACCENT = '#1F2937';
const TABS = ['구인 신청 검수', '공고 게시 관리', '기업 인증', '잡매칭', '취업 이력·통계'];

// 메인 탭 전환 컨트롤러

export default function StaffEmploymentPage() {
  const location = useLocation();
  const initialTab = location.pathname.endsWith('/statistics') ? 4 : 0;
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    setTab(location.pathname.endsWith('/statistics') ? 4 : 0);
  }, [location.pathname]);

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-black text-[#1F2328]">취업·창업 운영 (교직원 포털)</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            구인 검수 · 공고 관리 · 기업 인증 · 지원자 전형 관리
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-0 border-b border-[#E5E7EB]">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`h-10 px-5 text-[13px] font-bold transition-colors border-b-2 -mb-px ${
              tab === i ? 'border-b-2' : 'border-transparent text-[#656D76] hover:text-[#1F2328]'
            }`}
            style={tab === i ? { color: ACCENT, borderColor: ACCENT } : {}}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {tab === 0 && <TabJobReview />}
      {tab === 1 && <TabPostManagement />}
      {tab === 2 && <TabCompanyCert />}
      {tab === 3 && <TabJobMatching />}
      {tab === 4 && <TabEmploymentStats />}
    </div>
  );
}