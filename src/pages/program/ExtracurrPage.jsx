import { useState } from 'react';
import ProgramList from './ProgramList';
import ProgramDetail from './ProgramDetail';
import MyApplications from './MyApplications';
import ActivityManage from './ActivityManage';
import Survey from './Survey';

/**
 * 비교과 프로그램 화면 허브. CompetencyPage와 동일하게, 하위 화면들은 URL이 아니라
 * 단계 전환(목록 → 상세 → 신청내역 → 활동관리/설문)으로 구성된 하나의 화면입니다.
 */
export default function ExtracurrPage() {
  const [view, setView] = useState('list');
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const goList = () => setView('list');

  switch (view) {
    case 'detail':
      return (
        <ProgramDetail
          programId={selectedProgramId}
          onBack={goList}
          onApplySuccess={() => setView('my-applications')}
        />
      );
    case 'my-applications':
      return (
        <MyApplications
          onBack={goList}
          onActivity={({ programId }) => {
            setSelectedApplication({ programId });
            setView('activity');
          }}
          onSurvey={({ programId, applicationId, programName }) => {
            setSelectedApplication({ programId, applicationId, programName });
            setView('survey');
          }}
        />
      );
    case 'activity':
      return (
        <ActivityManage
          programId={selectedApplication?.programId}
          onBack={() => setView('my-applications')}
        />
      );
    case 'survey':
      return (
        <Survey
          programId={selectedApplication?.programId}
          applicationId={selectedApplication?.applicationId}
          programName={selectedApplication?.programName}
          onBack={() => setView('my-applications')}
        />
      );
    default:
      return (
        <ProgramList
          onDetail={(id) => {
            setSelectedProgramId(id);
            setView('detail');
          }}
          onMyApplications={() => setView('my-applications')}
        />
      );
  }
}
