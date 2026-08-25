import { useState } from 'react';
import ProgramList from './ProgramList';
import ProgramForm from './ProgramForm';
import ParticipationPage from './ParticipationPage';

/**
 * 교직원 비교과 운영 화면 허브. list/new/edit/participation 4단계를
 * 로컬 상태로 전환하는 하나의 화면입니다.
 */
export default function StaffExtracurrPage() {
  const [view, setView] = useState('list');
  const [editId, setEditId] = useState(undefined);
  const [participationTarget, setParticipationTarget] = useState(null);

  const goList = () => {
    setView('list');
    setEditId(undefined);
    setParticipationTarget(null);
  };

  if (view === 'new') {
    return <ProgramForm onBack={goList} onSubmit={goList} />;
  }

  if (view === 'edit' && editId) {
    return <ProgramForm programId={editId} onBack={goList} onSubmit={goList} />;
  }

  if (view === 'participation' && participationTarget) {
    return (
      <ParticipationPage
        programId={participationTarget.id}
        programName={participationTarget.name}
        onBack={goList}
      />
    );
  }

  return (
    <ProgramList
      onNew={() => setView('new')}
      onEdit={(id) => {
        setEditId(id);
        setView('edit');
      }}
      onParticipation={(id, name) => {
        setParticipationTarget({ id, name });
        setView('participation');
      }}
    />
  );
}
