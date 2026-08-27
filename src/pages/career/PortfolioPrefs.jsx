import { useState } from 'react';
import { Button, toast } from '@/components/common';
import PortfolioSection from './PortfolioSection';

const ACCENT = '#059669';

// ─── Preferred NCS chips ──────────────────────────────────────────────────────

const NCS_OPTIONS = [
  '응용SW개발',
  '데이터분석',
  'AI개발',
  '임베디드개발',
  'UI/UX',
  '클라우드컴퓨팅',
  '정보보안',
  '빅데이터',
];

// ─── Consent history ──────────────────────────────────────────────────────────

const CONSENT_HISTORY = [
  { item: '이력서·포트폴리오', company: '(주)테크노바', agreedAt: '2026-08-12', revokedAt: null },
  { item: '이력서', company: '삼성전자', agreedAt: '2026-07-20', revokedAt: null },
  { item: '이력서·포트폴리오', company: '카카오', agreedAt: '2026-06-10', revokedAt: '2026-07-01' },
];

// ─── Drag-sort priority ───────────────────────────────────────────────────────

const PRIORITIES_INIT = ['연봉·보상', '직무 성장성', '기업 문화', '워라밸', '안정성'];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PortfolioPrefs() {
  const [section, setSection] = useState('portfolio');
  const [selectedNCS, setSelectedNCS] = useState(['응용SW개발', 'AI개발']);
  const [region, setRegion] = useState('서울·경기');
  const [empType, setEmpType] = useState('정규직');
  const [salary, setSalary] = useState('3800');
  const [priorities, setPriorities] = useState(PRIORITIES_INIT);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Consent toggles
  const [consentResume, setConsentResume] = useState(true);
  const [consentPortfolio, setConsentPortfolio] = useState(true);
  const [consentCompetency, setConsentCompetency] = useState(false);

  const toggleNCS = (n) => {
    setSelectedNCS((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const next = [...priorities];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setPriorities(next);
    setDragIdx(null);
    setDragOverIdx(null);
  };

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
        <div className="flex flex-col gap-4 max-w-[700px]">
          {/* NCS multi-chip */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">희망 직무 (NCS 소분류)</h2>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {NCS_OPTIONS.map((n) => {
                const sel = selectedNCS.includes(n);
                return (
                  <button
                    key={n}
                    onClick={() => toggleNCS(n)}
                    className={`h-7 px-3 text-[12px] font-semibold rounded-full border-2 transition-colors ${sel ? 'text-white border-transparent' : 'border-[#E5E7EB] text-[#656D76] hover:border-[#059669] hover:text-[#059669]'}`}
                    style={sel ? { background: ACCENT } : {}}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {selectedNCS.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[#F3F4F6]">
                <span className="text-[11px] text-[#9AA0A6] self-center">선택됨:</span>
                {selectedNCS.map((n) => (
                  <span
                    key={n}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#059669]"
                  >
                    {n}
                    <button
                      onClick={() => toggleNCS(n)}
                      className="ml-0.5 text-[#059669] hover:text-[#CF222E]"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Other prefs */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">기타 희망 조건</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[12px] font-semibold text-[#656D76] mb-1.5 block">
                  희망 지역
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] appearance-none"
                >
                  {[
                    '서울·경기',
                    '인천',
                    '부산·경남',
                    '대구·경북',
                    '광주·전남',
                    '충청권',
                    '전국',
                    '해외',
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#656D76] mb-1.5 block">
                  고용 형태
                </label>
                <select
                  value={empType}
                  onChange={(e) => setEmpType(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] appearance-none"
                >
                  {['정규직', '계약직', '인턴', '무관'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#656D76] mb-1.5 block">
                  희망 연봉 (만 원)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="flex-1 h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#059669]"
                  />
                  <span className="text-[12px] text-[#9AA0A6] whitespace-nowrap">만 원</span>
                </div>
              </div>
            </div>
          </div>

          {/* Priority drag sort */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">우선순위</h2>
              <span className="text-[11px] text-[#9AA0A6] ml-1">드래그하여 순서를 변경하세요</span>
            </div>
            <div className="flex flex-col gap-2">
              {priorities.map((p, i) => (
                <div
                  key={p}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={() => {
                    setDragIdx(null);
                    setDragOverIdx(null);
                  }}
                  className={`flex items-center gap-3 bg-[#F9FAFB] border rounded-[6px] px-4 py-2.5 cursor-grab active:cursor-grabbing transition-all select-none ${
                    dragOverIdx === i && dragIdx !== i
                      ? 'border-[#059669] bg-[#F0FDF4]'
                      : 'border-[#E5E7EB]'
                  } ${dragIdx === i ? 'opacity-40' : ''}`}
                >
                  <span className="text-[#C8D0D9]">⠿</span>
                  <span
                    className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center flex-shrink-0"
                    style={{ background: ACCENT }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[13px] font-semibold text-[#1F2328]">{p}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast('임시 저장되었습니다.', 'success')}
            >
              임시 저장
            </Button>
            <Button
              size="sm"
              style={{ background: ACCENT }}
              onClick={() => toast('희망 조건이 저장되었습니다.', 'success')}
            >
              저장
            </Button>
          </div>
        </div>
      )}

      {/* ── Consent ── */}
      {section === 'consent' && (
        <div className="flex flex-col gap-4 max-w-[700px]">
          {/* Toggle card */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">기업 제공 항목 동의</h2>
            </div>
            <div className="flex flex-col gap-3">
              {[
                {
                  label: '이력서 (인적사항·학력·자격·어학)',
                  state: consentResume,
                  set: setConsentResume,
                  required: true,
                },
                {
                  label: '포트폴리오 첨부 파일',
                  state: consentPortfolio,
                  set: setConsentPortfolio,
                  required: false,
                },
                {
                  label: '핵심역량 진단 결과',
                  state: consentCompetency,
                  set: setConsentCompetency,
                  required: false,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0"
                >
                  <div>
                    <span className="text-[13px] font-semibold text-[#1F2328]">{item.label}</span>
                    {item.required && (
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E]">
                        필수
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => !item.required && item.set(!item.state)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${item.state ? 'bg-[#059669]' : 'bg-[#E5E7EB]'} ${item.required ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${item.state ? 'left-5' : 'left-0.5'}`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* History table */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">동의·철회 이력</h2>
            </div>
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {['동의 항목', '대상 기업', '동의일', '철회일'].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '동의 항목' || h === '대상 기업' ? 'text-left' : 'text-center'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CONSENT_HISTORY.map((h, i) => (
                  <tr
                    key={i}
                    className={`border-b border-[#F3F4F6] last:border-0 ${h.revokedAt ? 'opacity-50' : ''} ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-[#1F2328]">{h.item}</td>
                    <td className="px-4 py-2.5 text-[#656D76]">{h.company}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-[#9AA0A6]">
                      {h.agreedAt}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {h.revokedAt ? (
                        <span className="font-mono text-[#CF222E]">{h.revokedAt}</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#059669]">
                          유효
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
