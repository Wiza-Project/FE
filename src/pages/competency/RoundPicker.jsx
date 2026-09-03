import { EmptyState, SkeletonLoader, Button } from '@/components/common';
import { formatDate } from '@/utils/date';
import { ASSESSMENT_ATTEMPT_STATUS } from '@/constants/domain';

/**
 * 응시 가능한 진단 회차가 2개 이상일 때 하나를 고르게 하는 목록.
 * 회차가 1개면 상위(CompetencyPage)에서 자동 선택하므로 이 화면은 안 뜬다.
 *
 * @param {Object} props
 * @param {Array} props.rounds fetchStudentAssessmentRounds 응답
 * @param {boolean} props.isLoading
 * @param {boolean} props.isError
 * @param {() => void} props.onRetry
 * @param {(roundId: number) => void} props.onPick
 */
export default function RoundPicker({ rounds, isLoading, isError, onRetry, onPick }) {
  if (isLoading) {
    return (
      <div className="px-6 py-6">
        <SkeletonLoader rows={3} cols={1} />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        message="응시 가능한 진단을 불러오지 못했습니다."
        sub="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="outline" size="md" onClick={onRetry}>
            다시 시도
          </Button>
        }
      />
    );
  }

  if (!rounds || rounds.length === 0) {
    return (
      <EmptyState
        message="현재 응시 가능한 진단이 없습니다."
        sub="응시 기간이 아니거나 응시 대상이 아닐 수 있습니다. 핵심역량 진단은 재학생만 응시할 수 있습니다."
      />
    );
  }

  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-[680px] flex flex-col gap-3">
        <p className="text-[13px] text-[#656D76] px-1">
          응시할 진단을 선택해 주세요.
        </p>
        {rounds.map((r) => {
          const done =
            r.attemptStatus === ASSESSMENT_ATTEMPT_STATUS.SUBMITTED ||
            r.attemptStatus === ASSESSMENT_ATTEMPT_STATUS.SCORED;
          const inProgress = r.attemptId != null && !done;
          return (
            <button
              key={r.assessmentRoundId}
              onClick={() => onPick(r.assessmentRoundId)}
              className="text-left bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-5 py-4 hover:border-[#7C3AED] transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${r.assessmentType === 'PRE' ? 'bg-[#F3F4F6] text-[#374151]' : 'bg-[#FEE2E2] text-[#CF222E]'}`}
                >
                  {r.assessmentType === 'PRE' ? '사전' : '사후'}
                </span>
                <span className="text-[15px] font-bold text-[#1F2328]">{r.assessmentName}</span>
                {done && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#1A7F37]">
                    응시 완료
                  </span>
                )}
                {inProgress && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#92400E]">
                    이어하기
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#9AA0A6]">
                {formatDate(r.startsAt)} ~ {formatDate(r.endsAt)} · {r.questionCount}문항
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
