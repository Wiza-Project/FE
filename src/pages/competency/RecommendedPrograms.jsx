import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRecommendedPrograms } from '@/api/competency';
import { applyToProgram } from '@/api/programApplications';
import { ApiError } from '@/api/client';
import { ASSESSMENT_ERROR_CODE } from '@/constants/domain';
import { COMP_COLOR } from '@/data/competencyData';
import { formatDate } from '@/utils/date';
import { PageHeader, Button, EmptyState, SkeletonLoader, toast } from '@/components/common';

const num = (v) => (v == null ? null : Number(v));

// 남은 자리 대비 점유율. 90% 이상이면 마감 임박으로 색을 바꾼다.
const fillColor = (applicant, capacity) =>
  capacity > 0 && applicant / capacity >= 0.9 ? '#CF222E' : COMP_COLOR;

// recruitmentEndsAt 기준 마감까지 남은 일수(당일도 D-0으로 노출). 지난 회차는 null.
const daysUntil = (iso) => {
  if (!iso) return null;
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d >= 0 ? d : null;
};

/** 본인 신청 상태가 있으면(=null 아님) 재신청 불가 — 라벨만 보여준다. */
function MyStatusPill({ label }) {
  return (
    <span className="h-8 px-4 inline-flex items-center text-[12px] font-bold rounded-[6px] bg-[#F3F4F6] text-[#6E7781]">
      {label}
    </span>
  );
}

function ProgramCard({ program, applyingId, onApply }) {
  const applied = num(program.applicantCount) ?? 0;
  const capacity = num(program.capacity) ?? 0;
  const remaining = num(program.remainingCapacity) ?? Math.max(capacity - applied, 0);
  const fillPct = capacity > 0 ? Math.min(Math.round((applied / capacity) * 100), 100) : 0;
  const dday = daysUntil(program.recruitmentEndsAt);
  const isFull = remaining <= 0;
  const busy = applyingId === program.programId;
  // 서버가 취소분까지 반영해 null로 내려주므로, null이면 신청 버튼을 노출한다.
  const canApply = program.myApplicationStatus == null;

  return (
    <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
      <div className="h-1" style={{ background: COMP_COLOR }} />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
            {program.programTypeName}
          </span>
          <span className="text-[11px] text-[#9AA0A6]">{program.operatingUnitName}</span>
        </div>

        <h4 className="text-[14px] font-bold leading-snug text-[#1F2328]">{program.programName}</h4>

        <div className="flex flex-col gap-1.5 text-[12px] text-[#656D76]">
          <div className="flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="#9AA0A6">
              <rect x="2" y="3" width="12" height="11" rx="1.5" />
              <path d="M5 1v4M11 1v4M2 7h12" stroke="white" strokeWidth="1.2" />
            </svg>
            모집 {formatDate(program.recruitmentStartsAt)} ~ {formatDate(program.recruitmentEndsAt)}
          </div>
          {dday != null && (
            <div
              className={`flex items-center gap-1.5 font-semibold ${dday <= 3 ? 'text-[#CF222E]' : dday <= 7 ? 'text-[#D97706]' : 'text-[#656D76]'}`}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="7" />
                <path d="M8 4v4l3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              모집 마감 D-{dday}
            </div>
          )}
          {program.mileagePoints != null && (
            <div className="flex items-center gap-1.5 text-[#D97706] font-semibold">
              <span className="text-[12px]">🏅</span>
              이수 시 {num(program.mileagePoints)}점
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between text-[11px] text-[#9AA0A6] mb-1">
            <span>신청 현황</span>
            <span className="font-semibold text-[#1F2328]">
              {applied}/{capacity}명{isFull ? ' · 정원 마감' : ` · ${remaining}자리`}
            </span>
          </div>
          <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${fillPct}%`, background: fillColor(applied, capacity) }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-[#F3F4F6] mt-auto">
          {canApply ? (
            <Button
              size="md"
              loading={busy}
              disabled={busy}
              onClick={() => onApply(program)}
              style={{ background: COMP_COLOR }}
              className="!text-white"
            >
              {isFull ? '대기 신청' : '신청하기'}
            </Button>
          ) : (
            <MyStatusPill label={program.myApplicationStatusLabel ?? '신청함'} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 추천 비교과 프로그램 (SCR-S04). 진단 결과에서 서버가 고른 취약 역량 2개와, 각 역량에
 * 연계된 모집중 프로그램을 그대로 렌더한다 — 취약 역량 선정·표본 추출은 서버 몫이고
 * 이 화면은 재계산하지 않는다. 프로그램 신청은 비교과 도메인의 기존 신청 API를 그대로 쓴다.
 *
 * @param {Object} props
 * @param {number|null} props.attemptId 결과를 확인한 응시. 없으면 진단 결과부터 보도록 안내한다.
 * @param {() => void} [props.onBack] 진단 이력/결과로 돌아가기
 */
export default function RecommendedPrograms({ attemptId, onBack }) {
  const queryClient = useQueryClient();
  const [applyingId, setApplyingId] = useState(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['recommendedPrograms', attemptId],
    queryFn: () => fetchRecommendedPrograms(attemptId),
    enabled: !!attemptId,
    // 서버가 매 호출 무작위로 표본을 다시 뽑으므로 굳이 신선도를 유지할 이유가 없다.
    staleTime: 0,
    // Q014(소유권)·Q018(미채점)은 재시도해도 동일 — 스켈레톤만 길어진다.
    retry: (failureCount, err) =>
      !(
        err instanceof ApiError &&
        [ASSESSMENT_ERROR_CODE.ATTEMPT_NOT_FOUND, ASSESSMENT_ERROR_CODE.RESULT_NOT_AVAILABLE].includes(err.code)
      ) && failureCount < 1,
  });

  const header = (
    <PageHeader
      breadcrumbs={[{ label: '핵심역량 진단' }, { label: '추천 프로그램' }]}
      title="취약역량 기반 추천 프로그램"
      subtitle="진단 결과에서 점수가 낮은 역량에 연계된 비교과 프로그램을 추천합니다."
      accentColor={COMP_COLOR}
      actions={
        onBack && (
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 이력으로 돌아가기
          </Button>
        )
      }
    />
  );

  if (!attemptId) {
    return (
      <div>
        {header}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-12">
          <EmptyState
            message="추천을 받으려면 먼저 진단 결과를 확인해 주세요."
            sub="진단 이력에서 회차를 골라 결과를 연 뒤 추천 프로그램을 볼 수 있습니다."
            action={
              onBack && (
                <Button size="sm" style={{ background: COMP_COLOR }} onClick={onBack}>
                  진단 이력으로 이동
                </Button>
              )
            }
          />
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div>
        {header}
        <SkeletonLoader rows={3} cols={3} />
      </div>
    );
  }

  if (isError) {
    const notScored = error instanceof ApiError && error.code === ASSESSMENT_ERROR_CODE.RESULT_NOT_AVAILABLE;
    const notOwner = error instanceof ApiError && error.code === ASSESSMENT_ERROR_CODE.ATTEMPT_NOT_FOUND;
    const guided = notScored || notOwner;
    return (
      <div>
        {header}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-12">
          <EmptyState
            message={
              notScored
                ? '아직 채점되지 않은 진단입니다.'
                : notOwner
                  ? '이 진단의 추천 결과를 볼 수 없습니다.'
                  : error instanceof ApiError
                    ? error.message
                    : '추천 프로그램을 불러오지 못했습니다.'
            }
            sub={
              notScored
                ? '진단을 제출하면 취약역량 기반 추천을 확인할 수 있습니다.'
                : notOwner
                  ? '본인이 응시한 진단만 추천을 받을 수 있습니다.'
                  : '잠시 후 다시 시도해 주세요.'
            }
            action={
              guided ? (
                onBack && (
                  <Button size="sm" style={{ background: COMP_COLOR }} onClick={onBack}>
                    진단 이력으로 이동
                  </Button>
                )
              ) : (
                <Button size="sm" style={{ background: COMP_COLOR }} onClick={() => refetch()}>
                  다시 시도
                </Button>
              )
            }
          />
        </div>
      </div>
    );
  }

  const groups = data.weakCompetencies ?? [];
  const totalPrograms = groups.reduce((n, g) => n + (g.programs?.length ?? 0), 0);

  const handleApply = async (program) => {
    setApplyingId(program.programId);
    try {
      const res = await applyToProgram(program.programId);
      if (res.applicationStatus === 'WAITLISTED') {
        toast(`정원이 마감되어 대기 ${res.waitlistOrder ?? ''}순번으로 등록되었습니다.`, 'info');
      } else {
        toast('신청이 완료되었습니다.', 'success');
      }
      // 신청 상태(myApplicationStatus)를 최신값으로 반영하려면 추천 목록을 다시 받아야 한다.
      queryClient.invalidateQueries({ queryKey: ['recommendedPrograms', attemptId] });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : '신청에 실패했습니다.', 'danger');
    } finally {
      setApplyingId(null);
    }
  };

  // 취약 역량은 하나도 안 뽑힐 수 있고(모든 역량이 고르게 높음), 뽑혀도 연계 프로그램이
  // 없을 수 있다. 두 경우를 구분해 안내한다 — 전자는 축하, 후자는 대기 안내.
  if (groups.length === 0) {
    return (
      <div>
        {header}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-12">
          <EmptyState
            message="특별히 보완이 필요한 역량이 없습니다."
            sub="모든 핵심역량 점수가 고르게 나와 별도 추천 대상이 선정되지 않았습니다."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}

      {/* 추천 근거 배너 — 취약 역량과 그 점수를 그대로 노출 */}
      <div className="bg-gradient-to-r from-[#EDE9FE] to-[#F5F3FF] border border-[#C4B5FD] rounded-[10px] px-6 py-4 mb-5 flex items-start gap-4">
        <div className="w-9 h-9 rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <path d="M8 1l1.854 3.756L14 5.522l-3 2.923.708 4.127L8 10.5l-3.708 2.072L5 8.445 2 5.522l4.146-.766z" />
          </svg>
        </div>
        <div className="pt-0.5">
          <p className="text-[13px] text-[#4C1D95] leading-relaxed">
            보완이 필요한 역량은{' '}
            {groups.map((g, i) => (
              <span key={g.competencyId}>
                {i > 0 && ', '}
                <strong className="text-[#7C3AED]">
                  {g.competencyName}({num(g.convertedScore)}점)
                </strong>
              </span>
            ))}
            입니다. 아래 연계 프로그램을 확인해 보세요.
          </p>
          {totalPrograms === 0 && (
            <p className="text-[12px] text-[#6D28D9] mt-1.5">
              현재 모집 중인 연계 프로그램이 없습니다. 새 프로그램이 열리면 이곳에 표시됩니다.
            </p>
          )}
        </div>
      </div>

      {/* 취약 역량별 섹션 */}
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.competencyId}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-[#7C3AED]" />
              <h3 className="text-[14px] font-bold text-[#1F2328]">{group.competencyName}</h3>
              <span className="text-[12px] font-semibold text-[#CF222E]">
                {num(group.convertedScore)}점
              </span>
              <span className="text-[11px] text-[#9AA0A6] ml-auto">
                연계 프로그램 {group.programs?.length ?? 0}건
              </span>
            </div>

            {group.programs && group.programs.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {group.programs.map((program) => (
                  <ProgramCard
                    key={program.programId}
                    program={program}
                    applyingId={applyingId}
                    onApply={handleApply}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[8px] border border-dashed border-[#E5E7EB] py-8 text-center">
                <p className="text-[13px] text-[#9AA0A6]">
                  이 역량에 연계된 모집 중 프로그램이 아직 없습니다.
                </p>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
