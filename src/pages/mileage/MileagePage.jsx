import { useState } from 'react';
import MileageDashboard from './MileageDashboard';
import ExternalActivity from './ExternalActivity';

/**
 * 마일리지 화면 허브. 다른 모듈과 동일하게 dashboard/external 두 단계를
 * 로컬 상태로 전환하는 하나의 화면입니다.
 */
export default function MileagePage() {
  const [view, setView] = useState('dashboard');

  switch (view) {
    case 'external':
      return <ExternalActivity onBack={() => setView('dashboard')} />;
    default:
      return <MileageDashboard onExternal={() => setView('external')} />;
  }
}
