import { useState } from 'react';
import { Tabs } from '@/components/common';
import { COMP_COLOR } from '@/data/competencyData';
import DiagnosisGuide from './DiagnosisGuide';
import DiagnosisQuestions from './DiagnosisQuestions';
import DiagnosisResult from './DiagnosisResult';
import DiagnosisHistory from './DiagnosisHistory';
import ComparisonPage from './ComparisonPage';
import RecommendedPrograms from './RecommendedPrograms';

const TAB_CONFIG = [
  { key: 'guide', label: '진단 안내' },
  { key: 'history', label: '진단 이력' },
  { key: 'result', label: '진단 결과' },
  { key: 'compare', label: '사전·사후 비교' },
  { key: 'recommend', label: '추천 프로그램' },
];

const SUB_VIEWS = ['guide', 'questions', 'result', 'history', 'compare', 'recommend'];

// TODO: 학생이 여러 진행중 회차 중 하나를 고르는 화면은 개발 순서에 없다(개발순서_브랜치.md
// 참조 — 진단 안내·동의는 화면 하나로 끝나는 범위). 실제로는 알림/대시보드 딥링크로 roundId가
// 정해져 이 화면에 들어온다고 가정하고, 그 진입점이 아직 없어 임시로 고정값을 쓴다.
const CURRENT_ASSESSMENT_ROUND_ID = 1;

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
      {view === 'guide' && (
        <DiagnosisGuide
          roundId={CURRENT_ASSESSMENT_ROUND_ID}
          onStart={(id) => {
            setAttemptId(id);
            setView('questions');
          }}
          onViewResult={(id) => {
            setAttemptId(id);
            setView('result');
          }}
        />
      )}

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

      {view === 'recommend' && <RecommendedPrograms />}
    </div>
  );
}
