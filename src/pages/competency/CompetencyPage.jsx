import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Tabs } from '@/components/common';
import { COMP_COLOR } from '@/data/competencyData';
import { fetchStudentAssessmentRounds } from '@/api/competency';
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

      {view === 'result' && (
        <DiagnosisResult
          attemptId={attemptId}
          onBack={() => setView('history')}
          // 비교는 두 회차를 골라야 하므로 결과 화면에서는 이력으로 보내 선택하게 한다.
          onCompare={() => setView('history')}
          onRecommend={() => setView('recommend')}
        />
      )}

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

      {view === 'recommend' && (
        <RecommendedPrograms attemptId={attemptId} onBack={() => setView('history')} />
      )}
    </div>
  );
}
