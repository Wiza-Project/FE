import { useState } from 'react';
import NoticeAdminList from './NoticeAdminList';
import NoticeAdminForm from './NoticeAdminForm';
import FaqAdminList from './FaqAdminList';
import FaqAdminForm from './FaqAdminForm';
import { PageHeader, Tabs } from '@/components/common';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

const TABS = [
  { key: 'notice', label: '공지사항 관리' },
  { key: 'faq', label: 'FAQ 관리' },
];

function NoticeAdmin() {
  const [view, setView] = useState('list');
  const [editId, setEditId] = useState(undefined);

  const goList = () => {
    setView('list');
    setEditId(undefined);
  };

  if (view === 'new') return <NoticeAdminForm onBack={goList} onSubmit={goList} />;
  if (view === 'edit' && editId) {
    return <NoticeAdminForm postId={editId} onBack={goList} onSubmit={goList} />;
  }
  return (
    <NoticeAdminList
      onNew={() => setView('new')}
      onEdit={(id) => {
        setEditId(id);
        setView('edit');
      }}
    />
  );
}

function FaqAdmin() {
  const [view, setView] = useState('list');
  const [editId, setEditId] = useState(undefined);

  const goList = () => {
    setView('list');
    setEditId(undefined);
  };

  if (view === 'new') return <FaqAdminForm onBack={goList} onSubmit={goList} />;
  if (view === 'edit' && editId) {
    return <FaqAdminForm postId={editId} onBack={goList} onSubmit={goList} />;
  }
  return (
    <FaqAdminList
      onNew={() => setView('new')}
      onEdit={(id) => {
        setEditId(id);
        setView('edit');
      }}
    />
  );
}

/**
 * 교직원 게시판 관리 화면 허브. 공지사항 관리/FAQ 관리를 상단 탭으로 전환합니다.
 * 각 탭은 다시 list/new/edit 3단계를 로컬 상태로 전환하는 미니 허브입니다
 * (StaffExtracurrPage/ProgramList/ProgramForm과 동일한 구조).
 */
export default function StaffBoardsPage() {
  const [tab, setTab] = useState('notice');

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '교직원 포털' }, { label: '게시판 관리' }]}
        title="게시판 관리"
        subtitle="학생 포털에 노출되는 공지사항과 FAQ를 관리합니다."
        accentColor={ACCENT}
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} accentColor={ACCENT} />

      {tab === 'notice' && <NoticeAdmin />}
      {tab === 'faq' && <FaqAdmin />}
    </div>
  );
}
