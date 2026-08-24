import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import CounselingApply from './CounselingApply';
import MyCounseling from './MyCounseling';
import { PageHeader, Button } from '@/components/common';

const ACCENT = '#0891B2';

/**
 * @param {Object} props
 * @param {() => void} props.onApply
 * @param {() => void} props.onMy
 */
function CounselingHome({ onApply, onMy }) {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '학생상담' }]}
        title="학생상담"
        subtitle="상담 신청, 예약 현황, 이력을 모두 이곳에서 관리하세요."
        accentColor={ACCENT}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onMy}>
              내 상담 보기
            </Button>
            <Button size="sm" style={{ background: ACCENT }} onClick={onApply}>
              + 상담 신청
            </Button>
          </div>
        }
      />

      {/* Quick cards */}
      <div className="grid grid-cols-2 gap-4 max-w-[640px]">
        <button
          onClick={onApply}
          className="bg-white rounded-[10px] border-2 border-[#E5E7EB] p-6 text-left hover:border-[#0891B2] hover:shadow-[0_4px_16px_rgba(8,145,178,0.1)] transition-all group"
        >
          <div
            className="w-10 h-10 rounded-[8px] flex items-center justify-center mb-4"
            style={{ background: '#CFFAFE' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke={ACCENT}
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M10 4v12M4 10h12" />
            </svg>
          </div>
          <p className="text-[15px] font-bold text-[#1F2328] mb-1">상담 신청</p>
          <p className="text-[12px] text-[#9AA0A6]">
            진로, 심리, 교수상담 등 유형을 선택해 새 상담을 신청합니다.
          </p>
        </button>

        <button
          onClick={onMy}
          className="bg-white rounded-[10px] border-2 border-[#E5E7EB] p-6 text-left hover:border-[#0891B2] hover:shadow-[0_4px_16px_rgba(8,145,178,0.1)] transition-all group"
        >
          <div
            className="w-10 h-10 rounded-[8px] flex items-center justify-center mb-4"
            style={{ background: '#CFFAFE' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke={ACCENT}
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M4 6h12M4 10h8M4 14h10" />
            </svg>
          </div>
          <p className="text-[15px] font-bold text-[#1F2328] mb-1">내 상담</p>
          <p className="text-[12px] text-[#9AA0A6]">
            예약 현황, 상담 이력, 심리검사 결과를 확인하고 관리합니다.
          </p>
        </button>
      </div>
    </div>
  );
}

/**
 * 학생상담 화면 허브. ExtracurrPage/CompetencyPage와 동일하게 home/apply/my
 * 세 단계를 로컬 상태로 전환하는 하나의 화면입니다.
 */
export default function CounselingPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('home');
  const [applySource, setApplySource] = useState('home');

  useEffect(
    () => () => {
      // 상담 허브를 벗어나면 다른 계정이 이전 학생의 예약·가용 일정 캐시를 재사용하지 않게 한다.
      queryClient.removeQueries({ queryKey: ['counselingReservations'] });
      queryClient.removeQueries({ queryKey: ['availableSchedules'] });
    },
    [queryClient],
  );

  const openApply = (source) => {
    setApplySource(source);
    setView('apply');
  };

  if (view === 'apply') {
    return (
      <CounselingApply
        onComplete={() => setView('my')}
        onBack={() => setView(applySource === 'my' ? 'my' : 'home')}
      />
    );
  }
  if (view === 'my') {
    return <MyCounseling onApply={() => openApply('my')} />;
  }
  return <CounselingHome onApply={() => openApply('home')} onMy={() => setView('my')} />;
}
