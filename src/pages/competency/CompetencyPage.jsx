import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { EmptyState, SkeletonLoader, Tabs } from '@/components/common';
import { COMP_COLOR } from '@/data/competencyData';
import { fetchAssessmentHistory, fetchStudentAssessmentRounds } from '@/api/competency';
import DiagnosisGuide from './DiagnosisGuide';
import DiagnosisQuestions from './DiagnosisQuestions';
import DiagnosisResult from './DiagnosisResult';
import DiagnosisHistory from './DiagnosisHistory';
import ComparisonPage from './ComparisonPage';
import RecommendedPrograms from './RecommendedPrograms';
import RoundPicker from './RoundPicker';

const TAB_CONFIG = [
  { key: 'guide', label: '진단 안내' },
  { key: 'history', label: '진단 이력' },
  { key: 'result', label: '진단 결과' },
  { key: 'compare', label: '사전·사후 비교' },
  { key: 'recommend', label: '추천 프로그램' },
];

const SUB_VIEWS = ['guide', 'questions', 'result', 'history', 'compare', 'recommend'];

/**
 * 진단 결과·추천 프로그램 화면에 탭으로 바로 들어와 볼 회차(attemptId)가 아직 없을 때,
 * 가장 최근 제출 회차를 자동으로 불러오는 동안 / 실패했을 때 / 응시 이력이 아예 없을 때
 * 보여줄 대체 화면.
 */
function LatestAttemptFallback({ query, onGoGuide }) {
  if (query.isPending) {
    return (
      <div className="px-6 py-6">
        <SkeletonLoader rows={3} cols={2} />
      </div>
    );
  }

  const isError = query.isError;
  return (
    <EmptyState
      message={
        isError
          ? query.error instanceof ApiError
            ? query.error.message
            : '진단 결과를 불러오지 못했습니다.'
          : '아직 응시를 완료한 진단이 없습니다.'
      }
      sub={
        isError ? '잠시 후 다시 시도해 주세요.' : '진단을 응시하고 제출하면 결과를 확인할 수 있습니다.'
      }
      action={
        <button
          type="button"
          onClick={isError ? () => query.refetch() : onGoGuide}
          className="h-9 px-5 text-[13px] font-bold text-white rounded-[6px] transition-opacity hover:opacity-90"
          style={{ background: COMP_COLOR }}
        >
          {isError ? '다시 시도' : '진단 안내로 이동'}
        </button>
      }
    />
  );
}

/**
 * 핵심역량 진단 화면 허브. 하위 화면들은 별도 라우트가 아니라 탭/버튼으로 전환되는
 * 하나의 화면입니다 (Figma 원본 설계를 그대로 따름 — 진단 흐름이 URL보다 단계 중심이라
 * 로컬 상태 전환이 더 자연스럽습니다).
 */
export default function CompetencyPage() {
  const [view, setView] = useState('guide');
  const [attemptId, setAttemptId] = useState(null);
  // 진단 이력에서 체크박스로 고른 두 회차. 사전·사후 비교 화면이 이 두 attemptId로 조회한다.
  const [comparePair, setComparePair] = useState(null);

  // 응시할 회차 결정: 알림/대시보드 딥링크(?roundId=) > 사용자가 목록에서 고른 것 >
  // 열린 회차가 하나뿐이면 자동 선택. 셋 다 없으면 RoundPicker를 먼저 보여준다.
  const [searchParams] = useSearchParams();
  const deepLinkRoundId = Number(searchParams.get('roundId')) || null;
  const [pickedRoundId, setPickedRoundId] = useState(null);

  const roundsQuery = useQuery({
    queryKey: ['studentAssessmentRounds'],
    queryFn: fetchStudentAssessmentRounds,
  });
  const openRounds = roundsQuery.data ?? [];
  // 딥링크 roundId는 실제 응시 가능한 회차일 때만 쓴다 — 만료·대상 조건 불일치 회차면 무시하고
  // RoundPicker의 빈 상태 안내가 뜨도록 한다.
  const deepLinkIsAvailable =
    deepLinkRoundId != null &&
    openRounds.some((r) => r.assessmentRoundId === deepLinkRoundId);
  const activeRoundId =
    (deepLinkIsAvailable ? deepLinkRoundId : null) ??
    pickedRoundId ??
    (openRounds.length === 1 ? openRounds[0].assessmentRoundId : null);

  // 진단 결과·추천 탭에 바로 들어와 attemptId가 없으면, 가장 최근 제출 회차를 자동으로 불러온다.
  // 이력 화면을 거쳐 회차를 고른 경우(attemptId 존재)에는 조회하지 않는다.
  const needsLatestAttempt = (view === 'result' || view === 'recommend') && attemptId == null;
  const latestAttemptQuery = useQuery({
    queryKey: ['assessmentHistory', { page: 0, size: 1 }],
    queryFn: () => fetchAssessmentHistory({ page: 0, size: 1 }),
    enabled: needsLatestAttempt,
  });
  const latestAttemptId = latestAttemptQuery.data?.content?.[0]?.attemptId ?? null;
  // 결과/추천 화면에 넘길 회차: 사용자가 고른 것 > 자동으로 찾은 최근 회차.
  const resultAttemptId = attemptId ?? latestAttemptId;

  // 자동으로 찾은 회차를 state로 승격해, 이후 탭 이동·재조회·추천 화면에서도 그대로 이어지게 한다.
  useEffect(() => {
    if (attemptId == null && latestAttemptId != null) {
      setAttemptId(latestAttemptId);
    }
  }, [attemptId, latestAttemptId]);

  // Tab keys that map to sub-views
  const tabKey = SUB_VIEWS.includes(view) && view !== 'questions' ? view : 'guide';

  return (
    <div>
      {/* Module header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-6 rounded-full" style={{ background: COMP_COLOR }} />
        <div>
          <h1 className="text-[20px] font-bold text-[#1F2328]">핵심역량 진단</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            자기관리 · 의사소통 · 글로벌 · 대인관계 · 종합적 사고력 · 자원·정보·기술 활용
          </p>
        </div>
      </div>

      {/* Top tabs (hide when in questions view — full focus mode) */}
      {view !== 'questions' && (
        <Tabs
          tabs={TAB_CONFIG}
          active={tabKey}
          onChange={(next) => {
            // 탭으로 비교 화면에 직접 들어오면 이전 비교 선택을 버리고 회차 선택부터 다시 하게 한다
            // (선택 후 진입은 DiagnosisHistory의 onCompare가 comparePair를 채워준다).
            if (next === 'compare') setComparePair(null);
            setView(next);
          }}
          accentColor={COMP_COLOR}
        />
      )}

      {/* Sub-views */}
      {view === 'guide' &&
        (activeRoundId != null ? (
          <DiagnosisGuide
            roundId={activeRoundId}
            onStart={(id) => {
              setAttemptId(id);
              setView('questions');
            }}
            onViewResult={(id) => {
              setAttemptId(id);
              setView('result');
            }}
          />
        ) : (
          <RoundPicker
            rounds={openRounds}
            isLoading={roundsQuery.isPending}
            isError={roundsQuery.isError}
            onRetry={roundsQuery.refetch}
            onPick={setPickedRoundId}
          />
        ))}

      {view === 'questions' && (
        <DiagnosisQuestions
          attemptId={attemptId}
          onComplete={() => setView('result')}
          onBack={() => setView('guide')}
        />
      )}

      {view === 'result' &&
        (resultAttemptId != null ? (
          <DiagnosisResult
            attemptId={resultAttemptId}
            onBack={() => setView('history')}
            // 비교는 두 회차를 골라야 하므로 결과 화면에서는 이력으로 보내 선택하게 한다.
            onCompare={() => setView('history')}
            onRecommend={() => setView('recommend')}
          />
        ) : (
          <LatestAttemptFallback
            query={latestAttemptQuery}
            onGoGuide={() => setView('guide')}
          />
        ))}

      {view === 'history' && (
        <DiagnosisHistory
          onViewResult={(id) => {
            setAttemptId(id);
            setView('result');
          }}
          onCompare={(pair) => {
            setComparePair(pair);
            setView('compare');
          }}
        />
      )}

      {view === 'compare' && (
        <ComparisonPage pair={comparePair} onBack={() => setView('history')} />
      )}

      {view === 'recommend' &&
        (resultAttemptId != null ? (
          <RecommendedPrograms attemptId={resultAttemptId} onBack={() => setView('history')} />
        ) : (
          <LatestAttemptFallback
            query={latestAttemptQuery}
            onGoGuide={() => setView('guide')}
          />
        ))}
    </div>
  );
}
