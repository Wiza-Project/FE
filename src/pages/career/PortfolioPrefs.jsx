import { useState } from 'react';
import { EmptyState } from '@/components/common';
import PortfolioSection from './PortfolioSection';

const ACCENT = '#059669';

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * 희망 조건(희망직무·지역·고용형태·연봉)과 정보 공개 동의는 아직 이 화면에 맞는 백엔드 연동이
 * 준비되지 않아 "준비 중" 상태로 표시한다.
 *
 * - 희망 조건: 학생 취업 희망조건 API(GET/PUT /api/v1/students/me/preferences)는 있지만
 *   단일 NCS 직무(ncsStandardId) + 단일 지역코드만 저장하고, 이 화면처럼 NCS 소분류를
 *   검색·선택할 수 있는 조회 API가 아직 없다(NCS 표준 동기화는 내부 배치용으로만 존재).
 * - 정보 공개 동의: 공통 동의 API에 CAREER 모듈이 있지만 "이력서 등 정보 제3자 제공"류의
 *   1회성 정책 동의 모델이라, 이 화면처럼 기업별로 항목을 선택·철회하는 흐름과는 맞지 않는다.
 *
 * 두 영역 모두 API 계약이 확정되면 실제 연동으로 교체한다.
 */
export default function PortfolioPrefs() {
  const [section, setSection] = useState('portfolio');

  return (
    <div>
      {/* Sub-nav */}
      <div className="flex gap-1 bg-[#F3F4F6] rounded-[8px] p-1 mb-5 w-fit">
        {[
          ['portfolio', '포트폴리오'],
          ['prefs', '희망 조건'],
          ['consent', '정보 공개 동의'],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSection(k)}
            className={`h-8 px-4 text-[12px] font-semibold rounded-[6px] transition-colors whitespace-nowrap ${section === k ? 'bg-white text-[#1F2328] shadow-sm' : 'text-[#656D76] hover:text-[#1F2328]'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ── Portfolio ── */}
      {section === 'portfolio' && <PortfolioSection />}

      {/* ── Preferences ── */}
      {section === 'prefs' && (
        <div className="max-w-[700px]">
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">희망 조건</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76] ml-1">
                연동 준비 중
              </span>
            </div>
            <EmptyState
              message="희망 조건 설정 기능을 준비 중입니다."
              sub="희망 직무(NCS)를 검색·선택할 수 있는 연동이 마련되는 대로 제공됩니다."
            />
          </div>
        </div>
      )}

      {/* ── Consent ── */}
      {section === 'consent' && (
        <div className="max-w-[700px]">
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">정보 공개 동의</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76] ml-1">
                연동 준비 중
              </span>
            </div>
            <EmptyState
              message="기업별 정보 공개 동의·철회 기능을 준비 중입니다."
              sub="기업 단위로 공개 항목을 선택·철회할 수 있는 연동이 마련되는 대로 제공됩니다."
            />
          </div>
        </div>
      )}
    </div>
  );
}
