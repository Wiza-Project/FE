import { useState } from 'react';
import ProgramList from './ProgramList';
import ProgramDetail from './ProgramDetail';
import GroupApply from './GroupApply';
import MyApplications from './MyApplications';
import ActivityManage from './ActivityManage';
import Survey from './Survey';

/**
 * 비교과 프로그램 화면 허브. CompetencyPage와 동일하게, 하위 화면들은 URL이 아니라
 * 단계 전환(목록 → 상세/그룹신청 → 신청내역 → 활동관리/설문)으로 구성된 하나의 화면입니다.
 */
export default function ExtracurrPage() {
  const [view, setView] = useState('list');
  const [selectedProgram, setSelectedProgram] = useState('P016');

  const goList = () => setView('list');

  switch (view) {
    case 'detail':
      return (
        <ProgramDetail
          programId={selectedProgram}
          onBack={goList}
          onApplySuccess={() => setView('my-applications')}
        />
      );
    case 'group-apply':
      return <GroupApply onBack={goList} onComplete={() => setView('my-applications')} />;
    case 'my-applications':
      return (
        <MyApplications
          onActivity={(id) => {
            setSelectedProgram(id);
            setView('activity');
          }}
          onSurvey={(id) => {
            setSelectedProgram(id);
            setView('survey');
          }}
        />
      );
    case 'activity':
      return <ActivityManage onBack={() => setView('my-applications')} />;
    case 'survey':
      return <Survey onBack={() => setView('my-applications')} />;
    default:
      return (
        <ProgramList
          onDetail={(id) => {
            setSelectedProgram(id);
            setView('detail');
          }}
          onGroupApply={(id) => {
            setSelectedProgram(id);
            setView('group-apply');
          }}
          onMyApplications={() => setView('my-applications')}
        />
      );
  }
}
