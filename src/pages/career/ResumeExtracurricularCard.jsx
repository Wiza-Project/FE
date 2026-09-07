import { useState } from 'react';
import { Button, EmptyState, SkeletonLoader } from '@/components/common';
import { useQuery } from '@tanstack/react-query';
import { fetchResumeExtracurricularActivities } from '@/api/careerDocuments';
import { ApiError } from '@/api/client';

const ACCENT = '#059669';
const QUERY_KEY = ['career', 'resumeExtracurricularActivities'];
// 서버가 개수 제한 없이 전체 이력을 내려주므로(GET에 페이지네이션 파라미터가 없음),
// 카드가 한없이 길어지지 않도록 프론트에서 상위 N건만 먼저 보여주고 "더 보기"로 펼친다.
const VISIBLE_COUNT = 5;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** ApiError면 서버 메시지를, 아니면 네트워크 오류 문구를 돌려준다. */
function errorMessage(error, fallback) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  return error.message || fallback;
}

/**
 * operationStartedAt/operationEndedAt은 서버가 Instant(UTC, 'Z' suffix)로 내려준다.
 * utils/date.js의 formatDate는 LocalDate 문자열(예: 이력서 학력·경력의 'YYYY-MM-DD')을
 * 그대로 slice하는 용도라 여기 그대로 쓰면 자정 근처 KST 값이 하루 밀려 보일 수 있다
 * (예: KST 2026-07-11 00:30 종료 → UTC "2026-07-10T15:30:00Z" → naive slice면 "07-10"으로
 * 표시됨). KST로 변환한 뒤 날짜만 뽑는다 — MySchedule.jsx의 instantToKstDate와 같은 방식.
 */
function formatKstDate(instant) {
  if (!instant) return '';
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 운영 기간을 "YYYY-MM-DD ~ YYYY-MM-DD" 형태로 만든다. 한쪽만 있으면 그 값만 표시한다. */
function formatPeriod(start, end) {
  const from = formatKstDate(start);
  const to = formatKstDate(end);
  if (from && to) return `${from} ~ ${to}`;
  return from || to || '-';
}

function ActivityItem({ activity }) {
  return (
    <li className="px-5 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-bold text-[#1F2328] break-words">
          {activity.programName}
        </span>
        {activity.programTypeName && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#0969DA] flex-shrink-0">
            {activity.programTypeName}
          </span>
        )}
      </div>
      <dl className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-[#656D76]">
        {activity.competencyName && (
          <div className="flex gap-1">
            <dt className="text-[#9AA0A6] flex-shrink-0">연계 핵심역량</dt>
            <dd>{activity.competencyName}</dd>
          </div>
        )}
        <div className="flex gap-1">
          <dt className="text-[#9AA0A6] flex-shrink-0">운영 기간</dt>
          <dd>{formatPeriod(activity.operationStartedAt, activity.operationEndedAt)}</dd>
        </div>
        {activity.operatingDepartmentName && (
          <div className="flex gap-1">
            <dt className="text-[#9AA0A6] flex-shrink-0">운영부서</dt>
            <dd>{activity.operatingDepartmentName}</dd>
          </div>
        )}
        <div className="flex gap-1">
          <dt className="text-[#9AA0A6] flex-shrink-0">이수일</dt>
          <dd>{formatKstDate(activity.operationEndedAt) || '-'}</dd>
        </div>
      </dl>
    </li>
  );
}

/**
 * 이력서 화면의 "비교과 활동 이력" 카드.
 *
 * 비교과 프로그램 이수 확정 이력을 자동 조회해 보여준다
 * (GET /api/students/me/resume/extracurricular-activities). 이력서 본문(contentData)이나
 * 버전 생성 흐름과는 완전히 분리된 별도 조회이며, 여기서 받은 값은 저장 payload에
 * 절대 섞이지 않는다. 응답(ResumeExtracurricularActivityResponse)에 수료증 번호 필드가
 * 없으므로 이 카드는 수료증 번호를 표시하지 않는다.
 *
 * 상태 구분:
 * - 최초 로딩: query.isLoading (스켈레톤)
 * - 데이터 없음: 응답 배열이 비어있음(EmptyState)
 * - 조회 실패: query.isError (오류 문구 + 다시 시도)
 *
 * 서버 응답은 개수 제한 없이 학생의 전체 이력을 내려준다(이수일 최신순 정렬). 카드 안에서
 * 무한정 길어지지 않도록 처음엔 VISIBLE_COUNT건만 보여주고, 나머지는 "더 보기"를 눌러야
 * 펼쳐지게 한다 — 잘라내되 순서는 그대로 유지하므로 응답 순서 보장 요건과 충돌하지 않는다.
 */
export default function ResumeExtracurricularCard() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchResumeExtracurricularActivities,
  });
  const [expanded, setExpanded] = useState(false);

  const activities = query.data ?? [];
  const hiddenCount = Math.max(0, activities.length - VISIBLE_COUNT);
  const visibleActivities = expanded ? activities : activities.slice(0, VISIBLE_COUNT);

  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2 flex-wrap">
        <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
        <h2 className="text-[14px] font-bold text-[#1F2328]">비교과 활동 이력</h2>
      </div>

      <div className={query.isLoading || query.isError ? 'p-5' : ''}>
        {query.isLoading ? (
          <SkeletonLoader rows={3} cols={2} />
        ) : query.isError ? (
          <div className="text-center py-6">
            <p className="text-[12px] font-semibold text-[#656D76] mb-2">
              {errorMessage(query.error, '비교과 활동 이력을 불러오지 못했습니다.')}
            </p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            message="완료된 비교과 활동 이력이 없습니다."
            sub="비교과 프로그램 이수가 확정되면 이력이 자동으로 표시됩니다."
          />
        ) : (
          <>
            <ul className="divide-y divide-[#F3F4F6]" role="list" aria-label="비교과 활동 이력">
              {visibleActivities.map((activity, idx) => (
                <ActivityItem key={activity.applicationId ?? idx} activity={activity} />
              ))}
            </ul>
            {hiddenCount > 0 && (
              <div className="border-t border-[#F3F4F6] px-5 py-2.5 text-center">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className="text-[11px] font-bold text-[#059669] hover:underline"
                >
                  {expanded ? '접기' : `이력 ${hiddenCount}건 더 보기`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
