import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, SkeletonLoader, RadarChart, toast } from '@/components/common';
import { fetchResumeCompetency, resyncResumeCompetency } from '@/api/careerDocuments';
import { ApiError } from '@/api/client';
import { formatDate, formatDateTime } from '@/utils/date';

const ACCENT = '#059669';
const COMP_COLOR = '#7C3AED';
const QUERY_KEY = ['career', 'resumeCompetency'];

const STATUS_BADGE = {
  READY: { label: '연동됨', className: 'bg-[#DCFCE7] text-[#1A7F37]' },
  UNAVAILABLE: { label: '완료 진단 없음', className: 'bg-[#F3F4F6] text-[#6E7781]' },
  NOT_SYNCED: { label: '연동 전', className: 'bg-[#F3F4F6] text-[#6E7781]' },
};

/** ApiError면 서버 메시지를, 아니면 네트워크 오류 문구를 돌려준다. */
function errorMessage(error, fallback) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  return error.message || fallback;
}

/**
 * 핵심역량 진단 결과가 표시할 만한지(READY이면서 점수가 실제로 있는지) 확인한다.
 * scores가 비어있으면 200을 내려주지 않는 게 BE 계약이지만, 계약이 어긋나도 아래
 * 렌더에서 죽지 않도록 방어한다(핵심역량 진단 화면의 동일 패턴).
 */
function ReadyView({ data }) {
  const scores = [...(data.scores ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);

  if (scores.length === 0) {
    return <EmptyState message="집계된 역량 점수가 없습니다." sub="잠시 후 다시 시도해 주세요." />;
  }

  const labels = scores.map((s) => s.competencyName);
  const values = scores.map((s) => Number(s.convertedScore));

  return (
    <div>
      <div className="mb-3">
        <div className="text-[13px] font-bold text-[#1F2328]">{data.assessmentName}</div>
        <div className="text-[11px] text-[#9AA0A6] mt-0.5">진단일 {formatDate(data.submittedAt)}</div>
      </div>

      <div className="flex justify-center mb-1">
        <div className="text-center px-4 py-2 bg-[#F5F3FF] rounded-[6px]">
          <div className="text-[18px] font-black text-[#7C3AED]">{data.overallAverageScore}</div>
          <div className="text-[10px] text-[#656D76] font-semibold mt-0.5">전체 평균</div>
        </div>
      </div>

      <div className="flex justify-center my-2">
        <RadarChart labels={labels} values={values} color={COMP_COLOR} size={200} />
      </div>

      {/* 차트의 텍스트 대체 — 스크린리더와 정확한 수치 확인용 (표시 순서는 displayOrder 그대로) */}
      <div className="flex flex-col gap-1.5 mt-2">
        {scores.map((s) => (
          <div key={s.competencyId} className="flex items-center gap-2">
            <span className="text-[11px] text-[#656D76] w-20 truncate flex-shrink-0" title={s.competencyName}>
              {s.competencyName}
            </span>
            <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${s.convertedScore}%`, background: COMP_COLOR }}
              />
            </div>
            <span className="text-[11px] font-bold text-[#1F2328] w-8 text-right flex-shrink-0">
              {s.convertedScore}
            </span>
          </div>
        ))}
      </div>

      {data.syncedAt && (
        <div className="text-[10px] text-[#9AA0A6] mt-3 text-right">
          마지막 연동 {formatDateTime(data.syncedAt)}
        </div>
      )}
    </div>
  );
}

/**
 * 이력서 화면의 "핵심역량 진단 결과" 카드.
 *
 * 핵심역량 도메인의 최신 완료 진단 결과를 자동 조회해 보여준다(BE WP-295,
 * GET/POST /api/students/me/resume/competency). 이력서 본문(contentData)이나
 * 버전 생성 흐름과는 완전히 분리된 별도 조회이며, 여기서 받은 값은 저장 payload에
 * 절대 섞이지 않는다.
 *
 * 상태 구분:
 * - 최초 로딩: query.isLoading (스켈레톤)
 * - 데이터 없음: status NOT_SYNCED(연동 이력 없음) / UNAVAILABLE(완료 진단 없음)
 * - 재연동 진행 중: resyncMutation.isPending (진행 표시줄)
 * - 재연동 실패: resyncMutation.isError (오류 표시줄 + 다시 시도)
 */
export default function ResumeCompetencyCard() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchResumeCompetency,
  });

  // 재연동 버튼 — POST로 재연동을 요청한 뒤, 응답을 그대로 쓰지 않고 GET을 다시 조회해
  // 화면에 반영한다(재연동 호출과 조회 경로를 분리해 둔다).
  const resyncMutation = useMutation({
    mutationFn: resyncResumeCompetency,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      if (data.status === 'READY') {
        toast('핵심역량 진단 결과를 다시 불러왔습니다.', 'success');
      } else {
        toast('완료된 핵심역량 진단이 없습니다.', 'info');
      }
    },
    onError: (err) => toast(errorMessage(err, '재연동에 실패했습니다.'), 'error'),
  });

  const data = query.data;
  const badge = data ? STATUS_BADGE[data.status] : null;

  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2 flex-wrap">
        <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
        <h2 className="text-[14px] font-bold text-[#1F2328]">핵심역량 진단 결과</h2>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          loading={resyncMutation.isPending}
          onClick={() => resyncMutation.mutate()}
        >
          재연동
        </Button>
      </div>

      <div aria-live="polite">
        {resyncMutation.isPending && (
          <div
            role="status"
            className="px-5 py-2 text-[11px] font-semibold text-[#0969DA] bg-[#DBEAFE] flex items-center gap-1.5"
          >
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            재연동을 진행 중입니다…
          </div>
        )}

        {!resyncMutation.isPending && resyncMutation.isError && (
          <div
            role="alert"
            className="px-5 py-2 text-[11px] font-semibold text-[#CF222E] bg-[#FEE2E2] flex items-center justify-between gap-2"
          >
            <span>{errorMessage(resyncMutation.error, '재연동에 실패했습니다.')}</span>
            <button
              type="button"
              onClick={() => resyncMutation.mutate()}
              className="underline flex-shrink-0"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>

      <div className="p-5">
        {query.isLoading ? (
          <SkeletonLoader rows={3} cols={2} />
        ) : query.isError ? (
          <div className="text-center py-6">
            <p className="text-[12px] font-semibold text-[#656D76] mb-2">
              {errorMessage(query.error, '핵심역량 진단 결과를 불러오지 못했습니다.')}
            </p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : data.status === 'NOT_SYNCED' ? (
          <EmptyState
            message="핵심역량 진단 결과가 아직 연동되지 않았습니다."
            sub="재연동 버튼을 눌러 최신 진단 결과를 가져와 보세요."
          />
        ) : data.status === 'UNAVAILABLE' ? (
          <EmptyState
            message="완료된 핵심역량 진단이 없습니다."
            sub="핵심역량 진단을 완료하면 결과가 자동으로 표시됩니다."
          />
        ) : (
          <ReadyView data={data} />
        )}
      </div>
    </div>
  );
}
