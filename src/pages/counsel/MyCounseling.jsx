import { useState } from 'react';
import { Button, PageHeader, Tabs } from '@/components/common';
import ReservationPanel from './ReservationPanel';
import CounselingHistoryPanel from './CounselingHistoryPanel';
import StressTestPanel from './StressTestPanel';

const ACCENT = '#0891B2';

/**
 * @param {Object} props
 * @param {() => void} props.onApply
 */
export default function MyCounseling({ onApply }) {
  const [tab, setTab] = useState('reservation');

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '학생상담' }, { label: '내 상담' }]}
        title="내 상담"
        subtitle="예약 현황, 상담 이력, 심리검사 결과를 확인하세요."
        accentColor={ACCENT}
        actions={
          <Button size="sm" style={{ background: ACCENT }} onClick={onApply}>
            + 상담 신청
          </Button>
        }
      />

      <div className="mb-5">
        <Tabs
          tabs={[
            { key: 'reservation', label: '예약 현황' },
            { key: 'history', label: '상담 이력' },
            { key: 'psych', label: '심리검사' },
          ]}
          active={tab}
          onChange={setTab}
          accentColor={ACCENT}
        />
      </div>

      {tab === 'reservation' && <ReservationPanel />}
      {tab === 'history' && <CounselingHistoryPanel />}
      {tab === 'psych' && <StressTestPanel />}
    </div>
  );
}
