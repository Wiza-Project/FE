import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import CounselingApply from './CounselingApply';
import MyCounseling from './MyCounseling';
import StressTestPanel from './StressTestPanel';
import { PageHeader, Button } from '@/components/common';

const ACCENT = '#0891B2';

/**
 * @param {Object} props
 * @param {() => void} props.onApply
 * @param {() => void} props.onMy
 * @param {() => void} props.onStress
 */
function CounselingHome({ onApply, onMy, onStress }) {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '학생상담' }]}
        title="학생상담"
        subtitle="상담 신청, 예약 현황, 스트레스 검사를 모두 이곳에서 관리하세요."
        accentColor={ACCENT}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onStress}>
              스트레스 검사
            </Button>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[960px]">
        <button
          onClick={onApply}
          className="flex flex-col items-start bg-white rounded-[10px] border-2 border-[#E5E7EB] p-6 text-left hover:border-[#0891B2] hover:shadow-[0_4px_16px_rgba(8,145,178,0.1)] transition-all group"
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
          className="flex flex-col items-start bg-white rounded-[10px] border-2 border-[#E5E7EB] p-6 text-left hover:border-[#0891B2] hover:shadow-[0_4px_16px_rgba(8,145,178,0.1)] transition-all group"
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
            예약 현황과 상담 이력을 확인하고 관리합니다.
          </p>
        </button>

        <button
          onClick={onStress}
          className="flex flex-col items-start bg-white rounded-[10px] border-2 border-[#E5E7EB] p-6 text-left hover:border-[#0891B2] hover:shadow-[0_4px_16px_rgba(8,145,178,0.1)] transition-all group"
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
              strokeLinejoin="round"
            >
              <path d="M2 10h3l2-5 3 10 2-5h4" />
            </svg>
          </div>
          <p className="text-[15px] font-bold text-[#1F2328] mb-1">스트레스 검사</p>
          <p className="text-[12px] text-[#9AA0A6]">
            스트레스 자가진단으로 현재 상태를 확인하고 결과 이력을 관리합니다.
          </p>
        </button>
      </div>
    </div>
  );
}

/**
 * 스트레스 검사 top-level 뷰. 이전에는 '내 상담' 안의 탭 하나였으나 상담 신청·내 상담과
 * 같은 레벨의 진입점으로 분리했다. StressTestPanel은 자체 헤더가 없으므로, 다른 뷰와
 * 통일된 PageHeader(뒤로가기 포함)를 여기서 감싼다.
 * @param {Object} props
 * @param {() => void} props.onBack
 */
function StressTestView({ onBack }) {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '학생상담' }, { label: '스트레스 검사' }]}
        title="스트레스 검사"
        subtitle="스트레스 자가진단으로 현재 상태를 확인하고 결과 이력을 관리하세요."
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 뒤로
          </Button>
        }
      />
      <StressTestPanel />
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
  if (view === 'stress') {
    return <StressTestView onBack={() => setView('home')} />;
  }
  return (
    <CounselingHome
      onApply={() => openApply('home')}
      onMy={() => setView('my')}
      onStress={() => setView('stress')}
    />
  );
}
