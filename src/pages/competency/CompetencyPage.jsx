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

// TODO(WP-118 S00): 진단 안내+동의 화면에서 발급받은 실제 attemptId로 교체.
// S00 API(동의 시 attempt 생성)가 아직 연동되지 않아 응답·결과 화면을 우선 검증하기 위한 임시값.
const DEV_ATTEMPT_ID = 1;

/**
 * 핵심역량 진단 화면 허브. 하위 화면들은 별도 라우트가 아니라 탭/버튼으로 전환되는
 * 하나의 화면입니다 (Figma 원본 설계를 그대로 따름 — 진단 흐름이 URL보다 단계 중심이라
 * 로컬 상태 전환이 더 자연스럽습니다).
 */
export default function CompetencyPage() {
  const [view, setView] = useState('guide');
  const [alreadyDone] = useState(true); // false로 바꾸면 안내+동의 폼을 확인할 수 있습니다.

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
        <Tabs tabs={TAB_CONFIG} active={tabKey} onChange={setView} accentColor={COMP_COLOR} />
      )}

      {/* Sub-views */}
      {view === 'guide' && (
        <DiagnosisGuide
          alreadyDone={alreadyDone}
          onStart={() => setView('questions')}
          onViewResult={() => setView('result')}
        />
      )}

      {view === 'questions' && (
        <DiagnosisQuestions
          attemptId={DEV_ATTEMPT_ID}
          onComplete={() => setView('result')}
          onBack={() => setView('guide')}
        />
      )}

      {view === 'result' && (
        <DiagnosisResult
          attemptId={DEV_ATTEMPT_ID}
          onBack={() => setView('history')}
          onCompare={() => setView('compare')}
          onRecommend={() => setView('recommend')}
        />
      )}

      {view === 'history' && (
        <DiagnosisHistory
          onViewResult={() => setView('result')}
          onCompare={() => setView('compare')}
        />
      )}

      {view === 'compare' && <ComparisonPage hasBoth onBack={() => setView('history')} />}

      {view === 'recommend' && <RecommendedPrograms />}
    </div>
  );
}
