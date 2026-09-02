import { useState } from 'react';
import JobList from './JobList';
import JobDetail from './JobDetail';
import JobBookmarks from './JobBookmarks';
import CareerPrepPage from './CareerPrepPage';

/**
 * 취업·창업 화면 허브. 상단 섹션 스위처(채용공고/취업 준비) + 채용공고 하위
 * 뷰(목록/상세/관심공고)를 로컬 상태로 전환하는 하나의 화면입니다.
 */

// TODO: 0902 현재 데이터 연결 테스트 선행, 이후 하드코딩 수정 필요
export default function CareerPage() {
  const [section, setSection] = useState('jobs');
  const [jobView, setJobView] = useState('list');
  const [selectedJobId, setSelectedJobId] = useState(null);

  const goJobList = () => {
    setSection('jobs');
    setJobView('list');
    setSelectedJobId(null);
  };

  // 공고 상세 선택 핸들러
  const handleSelectJob = (id) => {
    setSelectedJobId(id);
    setJobView('detail');
  };

  // Render job sub-screens
  const renderJobs = () => {
    switch (jobView) {
      case 'detail':
        return selectedJobId ? (
          <JobDetail
            jobId={selectedJobId}
            onBack={() => {
              setSelectedJobId(null);
              setJobView('list');
            }}
          />
        ) : (
          <JobList
            onDetail={handleSelectJob}
            onBookmarks={() => setJobView('bookmarks')}
          />
        );
      case 'bookmarks':
        return (
          <JobBookmarks
            onBack={() => setJobView('list')}
            onDetail={handleSelectJob}
          />
        );
      default:
        return (
          <JobList
            onDetail={handleSelectJob}
            onBookmarks={() => setJobView('bookmarks')}
          />
        );
    }
  };

  return (
    <div>
      {/* Top section switcher */}
      <div className="flex gap-1 bg-[#F3F4F6] rounded-[8px] p-1 mb-5 w-fit">
        {[
          ['jobs', '채용공고'],
          ['prep', '취업 준비'],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSection(k)}
            className={`h-8 px-5 text-[13px] font-semibold rounded-[6px] transition-colors whitespace-nowrap ${section === k ? 'bg-white text-[#1F2328] shadow-sm' : 'text-[#656D76] hover:text-[#1F2328]'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {section === 'jobs' && renderJobs()}
      {section === 'prep' && <CareerPrepPage onJobList={goJobList} />}
    </div>
  );
}
