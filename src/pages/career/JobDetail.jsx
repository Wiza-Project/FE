import { useState } from 'react';
import { PageHeader, Button, ConfirmDialog, toast } from '@/components/common';

const ACCENT = '#059669';

// ─── Static detail data ───────────────────────────────────────────────────────

const JOB = {
  id: 'J001',
  category: '추천채용',
  title: '소프트웨어 개발자 (신입/경력)',
  company: '(주)테크노바',
  companyCert: ['강소기업', '청년친화기업'],
  industry: 'IT·소프트웨어',
  size: '중견기업 (임직원 1,200명)',
  ncs: '응용SW개발',
  headcount: 3,
  location: '서울특별시 강남구 테헤란로 152',
  empType: '정규직',
  salary: '연봉 3,800만 원 ~ 5,200만 원 (경력 협의)',
  period: '2026-08-01 ~ 2026-08-16 (23:59 마감)',
  dDay: 3,
  hasRecommendBenefit: true,
  qualifications: [
    '컴퓨터공학 또는 소프트웨어 관련 학과 졸업(예정)자',
    'Java / Kotlin / Python 중 1개 이상 실무 경험',
    '기초적인 데이터베이스(SQL) 이해 및 활용 능력',
    '원활한 팀 커뮤니케이션 가능자',
  ],
  preferences: [
    '공개 SW 프로젝트 기여 경험자',
    '관련 자격증 보유자 (정보처리기사, AWS 등)',
    '영어 의사소통 가능자 (OPIc IM 이상)',
    '한국대학교 졸업(예정)자 — 학과장 추천서 제출 시 서류면제',
  ],
  procedure: [
    { step: '서류전형', date: '~2026-08-25', note: '추천 대상자 면제' },
    { step: '1차 면접', date: '2026-09-01~05', note: '실무진 기술면접' },
    { step: '2차 면접', date: '2026-09-10~12', note: '임원진 인성면접' },
    { step: '최종 합격', date: '2026-09-15', note: '개별 통보' },
  ],
};

// My current application stage (null = not applied)
const STAGE_ORDER = ['지원', '서류전형', '면접', '최종'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children, color = ACCENT }) {
  return (
    <h3 className="flex items-center gap-2 text-[14px] font-bold text-[#1F2328] mb-3">
      <div className="w-1 h-4 rounded-full" style={{ background: color }} />
      {children}
    </h3>
  );
}

function DefRow({ label, value }) {
  return (
    <div className="flex px-0 py-2.5 border-b border-[#F3F4F6] last:border-0">
      <span className="w-28 flex-shrink-0 text-[12px] font-semibold text-[#656D76]">{label}</span>
      <span className="text-[13px] text-[#1F2328]">{value}</span>
    </div>
  );
}

function ProcedureTimeline({ steps }) {
  return (
    <div className="flex items-start gap-0">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1 text-center">
            <div
              className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black"
              style={{ borderColor: ACCENT, background: ACCENT, color: 'white' }}
            >
              {i + 1}
            </div>
            <div className="text-[12px] font-bold text-[#1F2328] whitespace-nowrap">{s.step}</div>
            <div className="text-[10px] text-[#9AA0A6] whitespace-nowrap">{s.date}</div>
            <div className="text-[10px] text-[#059669] whitespace-nowrap">{s.note}</div>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-0.5 mx-2 mb-8" style={{ background: ACCENT }} />
          )}
        </div>
      ))}
    </div>
  );
}

function ApplicationTimeline({ currentStage }) {
  if (!currentStage) return null;
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  return (
    <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
      <div className="text-[12px] font-bold text-[#1F2328] mb-3">전형 진행 현황</div>
      <div className="flex items-center gap-0">
        {STAGE_ORDER.map((stage, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={stage} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-colors ${
                    done
                      ? 'text-white border-transparent'
                      : active
                        ? 'text-white border-transparent'
                        : 'text-[#C8D0D9] border-[#E5E7EB] bg-white'
                  }`}
                  style={done || active ? { background: ACCENT, borderColor: ACCENT } : {}}
                >
                  {done ? '✓' : i + 1}
                </div>
                <div
                  className={`text-[10px] font-bold whitespace-nowrap ${active ? 'text-[#059669]' : done ? 'text-[#656D76]' : 'text-[#C8D0D9]'}`}
                >
                  {stage}
                </div>
                {active && (
                  <div className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#059669] whitespace-nowrap">
                    진행중
                  </div>
                )}
              </div>
              {i < STAGE_ORDER.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-1 mb-5"
                  style={{ background: done ? ACCENT : '#E5E7EB' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {string} [props.jobId] 목록에서 선택한 공고 ID. ProgramDetail과 마찬가지로 공고별 상세 데이터가
 *   아직 분리되어 있지 않아 현재는 미사용이며, 항상 JOB(J001)을 보여줍니다. 공고별 상세 API가 준비되면
 *   이 값으로 데이터를 조회하도록 교체하세요.
 * @param {() => void} props.onBack
 */
export default function JobDetail({ onBack }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [resume, setResume] = useState('2026 상반기 이력서 v3');
  const [portfolio, setPortfolio] = useState('포트폴리오 미첨부');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [appliedAt, setAppliedAt] = useState(null);
  const [appStage, setAppStage] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const alreadyApplied = appliedAt !== null;

  const handleApply = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setAppliedAt('2026-08-13');
    setAppStage('지원');
    toast('지원이 완료되었습니다!', 'success');
  };

  const handleCancelApply = () => {
    setCancelConfirm(false);
    setAppliedAt(null);
    setAppStage(null);
    setAgreed(false);
    toast('지원이 취소되었습니다.', 'info');
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: '취업·창업' },
          { label: '채용공고', onClick: onBack },
          { label: JOB.title },
        ]}
        title={JOB.title}
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 목록으로
          </Button>
        }
      />

      {/* Category + D-Day row */}
      <div className="flex items-center gap-2 -mt-2 mb-5">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
          {JOB.category}
        </span>
        <span className="text-[12px] font-black text-[#CF222E]">D-{JOB.dDay}</span>
        <span className="text-[11px] text-[#9AA0A6]">마감 {JOB.period.split(' ')[0]}</span>
      </div>

      {/* Recommend benefit banner */}
      {JOB.hasRecommendBenefit && (
        <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-[8px] px-5 py-3 mb-5 flex items-center gap-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke={ACCENT}
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="8" cy="8" r="7" fill="#BBF7D0" />
            <path d="M5 8l2 2 4-4" />
          </svg>
          <p className="text-[13px] text-[#14532D]">
            이 공고는 학과 추천 대상자에게 <strong>서류전형 면제</strong> 혜택이 적용됩니다.
            지도교수 확인서 제출 시 자동 적용됩니다.
          </p>
        </div>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* ── LEFT: Job detail ── */}
        <div className="flex flex-col gap-5">
          {/* Company info */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <SectionTitle>기업 정보</SectionTitle>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-[8px] bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[20px] font-black text-[#059669] flex-shrink-0">
                T
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[16px] font-black text-[#1F2328]">{JOB.company}</span>
                  {JOB.companyCert.map((c) => (
                    <span
                      key={c}
                      className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#059669]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3 text-[12px] text-[#656D76] flex-wrap">
                  <span>📂 {JOB.industry}</span>
                  <span>🏢 {JOB.size}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recruitment info */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <SectionTitle>모집 정보</SectionTitle>
            <DefRow label="모집 직무" value={<span className="font-bold">{JOB.ncs}</span>} />
            <DefRow label="모집 인원" value={`${JOB.headcount}명`} />
            <DefRow label="근무 지역" value={JOB.location} />
            <DefRow label="고용 형태" value={JOB.empType} />
            <DefRow
              label="급여"
              value={<span className="font-bold text-[#059669]">{JOB.salary}</span>}
            />
            <DefRow label="접수 기간" value={JOB.period} />
          </div>

          {/* Qualifications */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <SectionTitle>자격 요건</SectionTitle>
            <ul className="flex flex-col gap-2">
              {JOB.qualifications.map((q, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#1F2328]">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: ACCENT }}
                  />
                  {q}
                </li>
              ))}
            </ul>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <SectionTitle color="#D97706">우대 사항</SectionTitle>
            <ul className="flex flex-col gap-2">
              {JOB.preferences.map((p, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2.5 text-[13px] ${p.includes('한국대학교') ? 'text-[#059669] font-semibold' : 'text-[#1F2328]'}`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${p.includes('한국대학교') ? 'bg-[#059669]' : 'bg-[#D97706]'}`}
                  />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Procedure */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <SectionTitle>전형 절차</SectionTitle>
            <div className="py-2">
              <ProcedureTimeline steps={JOB.procedure} />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Apply card ── */}
        <div className="self-start sticky top-4 flex flex-col gap-3">
          <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1.5" style={{ background: ACCENT }} />
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
                <h2 className="text-[14px] font-bold text-[#1F2328]">지원하기</h2>
              </div>

              {alreadyApplied ? (
                <>
                  {/* Already applied state */}
                  <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] px-4 py-3 text-center">
                    <p className="text-[12px] font-bold text-[#059669]">✓ 지원 완료</p>
                    <p className="text-[11px] text-[#9AA0A6] mt-0.5">지원일: {appliedAt}</p>
                  </div>
                  <button
                    disabled
                    className="w-full h-10 rounded-[6px] text-[13px] font-bold bg-[#F3F4F6] text-[#9AA0A6] cursor-not-allowed"
                  >
                    지원 완료 · {appliedAt}
                  </button>
                  <button
                    onClick={() => setCancelConfirm(true)}
                    className="text-center text-[12px] text-[#CF222E] underline hover:no-underline"
                  >
                    지원 취소
                  </button>
                  <ApplicationTimeline currentStage={appStage} />
                </>
              ) : (
                <>
                  {/* Resume select */}
                  <div>
                    <label className="text-[12px] font-semibold text-[#1F2328] mb-1.5 block">
                      제출 이력서 <span className="text-[#CF222E]">*</span>
                    </label>
                    <select
                      value={resume}
                      onChange={(e) => setResume(e.target.value)}
                      className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] appearance-none"
                    >
                      <option>2026 상반기 이력서 v3</option>
                      <option>2026 상반기 이력서 v2</option>
                      <option>IT 개발자 이력서 v1</option>
                    </select>
                  </div>

                  {/* Portfolio select */}
                  <div>
                    <label className="text-[12px] font-semibold text-[#1F2328] mb-1.5 block">
                      포트폴리오 <span className="text-[#9AA0A6] font-normal">(선택)</span>
                    </label>
                    <select
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                      className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] appearance-none"
                    >
                      <option>포트폴리오 미첨부</option>
                      <option>2026 개발 포트폴리오.pdf</option>
                      <option>졸업작품 포트폴리오.pdf</option>
                    </select>
                  </div>

                  {/* Third-party consent */}
                  <div>
                    <div className="bg-[#FFF7ED] border border-[#FDE68A] rounded-[6px] px-3 py-2.5 mb-2">
                      <p className="text-[11px] text-[#92400E] leading-snug">
                        <strong>제공 항목:</strong> 성명·학번·연락처·이력서·포트폴리오가{' '}
                        <strong>(주)테크노바</strong>에 제공됩니다. 제공된 정보는 채용 목적으로만
                        사용됩니다.
                      </p>
                    </div>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 w-4 h-4 flex-shrink-0"
                        style={{ accentColor: ACCENT }}
                      />
                      <span className="text-[12px] text-[#1F2328] leading-snug">
                        제3자 제공에 동의합니다.{' '}
                        <span className="text-[#CF222E] font-bold">(필수)</span>
                      </span>
                    </label>
                  </div>

                  {/* Apply button */}
                  <Button
                    size="md"
                    className="w-full justify-center"
                    loading={submitting}
                    disabled={!agreed}
                    style={agreed ? { background: ACCENT } : {}}
                    onClick={() => setConfirmOpen(true)}
                  >
                    지원하기
                  </Button>
                </>
              )}

              {/* Bookmark */}
              <button
                onClick={() => {
                  setBookmarked(!bookmarked);
                  toast(
                    bookmarked ? '관심 공고에서 제거되었습니다.' : '관심 공고에 저장되었습니다.',
                    'success',
                  );
                }}
                className={`w-full h-9 text-[12px] font-semibold rounded-[6px] border transition-colors flex items-center justify-center gap-1.5 ${bookmarked ? 'border-[#D97706] bg-[#FFFBEB] text-[#D97706]' : 'border-[#E5E7EB] text-[#656D76] hover:border-[#059669] hover:text-[#059669]'}`}
              >
                {bookmarked ? '★ 관심 공고 저장됨' : '☆ 관심 공고 저장'}
              </button>
            </div>
          </div>

          {/* Deadline warning */}
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-4 py-3 flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="#CF222E">
              <path d="M8 1L1 14h14L8 1z" />
              <path d="M8 6v4M8 12h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] text-[#CF222E] font-semibold">
              마감 D-{JOB.dDay} — 2026-08-16 23:59
            </p>
          </div>
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmOpen}
        title="지원 확인"
        message={`[${JOB.title}] — ${JOB.company}\n\n이 공고에 지원하시겠습니까? 이력서와 포트폴리오가 기업에 제공됩니다.`}
        confirmLabel="지원하기"
        onConfirm={handleApply}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmDialog
        open={cancelConfirm}
        title="지원 취소"
        message="지원을 취소하시겠습니까? 취소 후에는 재지원이 불가할 수 있습니다."
        confirmLabel="지원 취소"
        onConfirm={handleCancelApply}
        onCancel={() => setCancelConfirm(false)}
      />
    </div>
  );
}
