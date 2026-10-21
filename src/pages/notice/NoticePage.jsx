import { useState } from 'react';
import NoticeList from './NoticeList';
import FaqList from './FaqList';
import { PageHeader, Tabs } from '@/components/common';

const ACCENT = '#6B7280';

const TABS = [
  { key: 'notice', label: '공지사항' },
  { key: 'faq', label: 'FAQ' },
];

/**
 * 학생 포털 "공지·FAQ" 화면 허브. 상단 탭으로 공지사항/FAQ를 전환하는 하나의 화면입니다.
 * 이번 스코프는 FAQ까지이며 Q&A(질문 등록·담당자 답변·비밀글·문의 템플릿)는 포함하지 않습니다.
 */
export default function NoticePage() {
  const [tab, setTab] = useState('notice');

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '공지·FAQ' }]}
        title="공지·FAQ"
        subtitle="학교 공지사항과 자주 묻는 질문을 확인하세요."
        accentColor={ACCENT}
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} accentColor={ACCENT} />

      {tab === 'notice' && <NoticeList />}
      {tab === 'faq' && <FaqList />}
    </div>
  );
}
