import { useRef, useState } from 'react';
import { Button, PageHeader, Tabs } from '@/components/common';
import ReservationPanel from './ReservationPanel';
import CounselingHistoryPanel from './CounselingHistoryPanel';
import CounselingProposalPanel from './CounselingProposalPanel';

const ACCENT = '#0E7490';

const TABS = [
  { key: 'reservation', label: '예약 현황' },
  { key: 'history', label: '상담 이력' },
  { key: 'proposal', label: '상담 제안' },
];

/**
 * @param {Object} props
 * @param {() => void} props.onApply
 * @param {() => void} props.onBack
 */
export default function MyCounseling({ onApply, onBack }) {
  const [tab, setTab] = useState('reservation');
  const reservationPanelRef = useRef(null);

  const showReservations = () => {
    setTab('reservation');
    window.requestAnimationFrame(() => reservationPanelRef.current?.focus());
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '학생상담' }, { label: '내 상담' }]}
        title="내 상담"
        subtitle="예약 현황과 상담 이력을 확인하세요."
        accentColor={ACCENT}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="min-h-[40px]"
              onClick={onBack}
            >
              ← 뒤로
            </Button>
            <Button
              size="sm"
              className="min-h-[40px]"
              style={{ background: ACCENT }}
              onClick={onApply}
            >
              + 상담 신청
            </Button>
          </div>
        }
      />

      <div className="mb-5 [&_button]:min-h-[40px]">
        {/* withPanels를 켜면 Tabs가 role="tab"·aria-selected·roving tabindex(←/→/Home/End)를 처리한다.
            대응하는 role="tabpanel" 요소(아래)의 id·aria-labelledby를 Tabs가 기대하는 규칙에 맞춘다. */}
        <Tabs tabs={TABS} active={tab} onChange={setTab} accentColor={ACCENT} withPanels />
      </div>

      {/* 각 탭이 가리키는 패널 wrapper는 항상 유지하고, 실제 화면만 활성 탭에서 렌더링한다.
          그래야 aria-controls가 존재하지 않는 요소를 가리키지 않으면서 비활성 화면의 조회도 막을 수 있다. */}
      <div
        ref={reservationPanelRef}
        role="tabpanel"
        id="panel-reservation"
        aria-labelledby="tab-reservation"
        tabIndex={0}
        hidden={tab !== 'reservation'}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0891B2]"
      >
        {tab === 'reservation' && <ReservationPanel />}
      </div>
      <div
        role="tabpanel"
        id="panel-history"
        aria-labelledby="tab-history"
        tabIndex={0}
        hidden={tab !== 'history'}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0891B2]"
      >
        {tab === 'history' && <CounselingHistoryPanel />}
      </div>
      <div
        role="tabpanel"
        id="panel-proposal"
        aria-labelledby="tab-proposal"
        tabIndex={0}
        hidden={tab !== 'proposal'}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0891B2]"
      >
        {tab === 'proposal' && <CounselingProposalPanel onShowReservations={showReservations} />}
      </div>
    </div>
  );
}
