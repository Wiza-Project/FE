import { useNavigate } from 'react-router-dom';
import { cleanJobTitle } from '@/utils/format';

function formatDeadline(value) {
  if (!value) return '마감일 미정';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `마감 ${date.toLocaleDateString('ko-KR')}`;
}

export default function JobRecommendationCard({ job, index }) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (job?.jobPostingId) {
      navigate(`/career?jobId=${job.jobPostingId}`);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white p-4 transition-all hover:border-[#059669] hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold text-[#059669]">추천 {index + 1}</p>
          <h3 className="text-base font-bold text-[#1F2328] hover:text-[#059669] transition-colors">
            {cleanJobTitle(job.postingTitle)}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-[#ECFDF5] px-2 py-1 text-xs text-[#047857]">
          {job.employmentType || '고용형태 미정'}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-[#656D76]">
        <div>
          <dt className="sr-only">회사</dt>
          <dd>{job.companyName || '회사명 미정'}</dd>
        </div>
        <div>
          <dt className="sr-only">지역</dt>
          <dd>{job.regionCodeName || '지역 미정'}</dd>
        </div>
        <div>
          <dt className="sr-only">직무</dt>
          <dd>{job.ncsCodeName || '직무 분류 미정'}</dd>
        </div>
        <div>
          <dt className="sr-only">마감일</dt>
          <dd>{formatDeadline(job.applicationEndsAt)}</dd>
        </div>
      </dl>

      {job.salaryText && <p className="mt-3 text-xs text-[#656D76]">급여 · {job.salaryText}</p>}
    </article>
  );
}