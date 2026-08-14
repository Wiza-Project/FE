import { useState } from 'react';
import { PageHeader, Stepper, Button, ConfirmDialog, toast } from '@/components/common';

const ACCENT = '#0891B2';

// ─── Data ────────────────────────────────────────────────────────────────────

const COUNSELING_TYPES = [
  {
    key: 'A',
    title: '지도교수 진로·역량 상담',
    desc: '신청 즉시 일정 확정 · 1회 상담 진행. 상담 후 상담일지와 실행계획서를 제공합니다.',
    tags: ['1회 상담', '일정 즉시 확정', '실행계획 제공'],
    color: '#0891B2',
  },
  {
    key: 'B',
    title: '상담센터 개인상담',
    desc: '접수면접 후 상담자 배정 · 다회기 심층 상담 진행. 심리적 어려움 및 대인관계 등을 다룹니다.',
    tags: ['다회기', '접수면접 후 배정', '심층 상담'],
    color: '#7C3AED',
  },
  {
    key: 'C',
    title: '심리검사 · 해석상담',
    desc: '검사 실시 후 결과 처리 · 별도 해석상담 예약. MBTI, MMPI 등 다양한 검사를 제공합니다.',
    tags: ['심리검사', '해석상담 포함', 'MBTI·MMPI'],
    color: '#D97706',
  },
];

const COUNSELORS = [
  {
    id: 'C01',
    name: '김상담',
    role: '지도교수',
    dept: '컴퓨터공학과',
    specialties: ['진로설계', '역량개발', '취업'],
    availableSlots: 4,
  },
  {
    id: 'C02',
    name: '이전문',
    role: '전문상담사',
    dept: '학생상담센터',
    specialties: ['대인관계', '심리지원', '진로'],
    availableSlots: 2,
  },
  {
    id: 'C03',
    name: '박심리',
    role: '전문상담사',
    dept: '학생상담센터',
    specialties: ['심리검사', '스트레스', 'MBTI·MMPI'],
    availableSlots: 3,
  },
  {
    id: 'C04',
    name: '최진로',
    role: '지도교수',
    dept: '경영학과',
    specialties: ['취업', '창업', '진로설계'],
    availableSlots: 0,
  },
];

const BASE_SLOTS = [
  {
    id: 'S01',
    date: '2026-08-17',
    dayLabel: '월',
    time: '10:00',
    location: '산학협력관 305호',
    status: 'available',
  },
  {
    id: 'S02',
    date: '2026-08-17',
    dayLabel: '월',
    time: '11:00',
    location: '산학협력관 305호',
    status: 'full',
  },
  {
    id: 'S03',
    date: '2026-08-18',
    dayLabel: '화',
    time: '14:00',
    location: '산학협력관 305호',
    status: 'available',
  },
  {
    id: 'S04',
    date: '2026-08-18',
    dayLabel: '화',
    time: '15:00',
    location: '산학협력관 305호',
    status: 'closed',
  },
  {
    id: 'S05',
    date: '2026-08-19',
    dayLabel: '수',
    time: '09:00',
    location: '산학협력관 305호',
    status: 'holiday',
  },
  {
    id: 'S06',
    date: '2026-08-19',
    dayLabel: '수',
    time: '10:00',
    location: '산학협력관 305호',
    status: 'holiday',
  },
  {
    id: 'S07',
    date: '2026-08-20',
    dayLabel: '목',
    time: '13:00',
    location: '산학협력관 305호',
    status: 'available',
  },
  {
    id: 'S08',
    date: '2026-08-20',
    dayLabel: '목',
    time: '14:00',
    location: '산학협력관 305호',
    status: 'available',
  },
  {
    id: 'S09',
    date: '2026-08-21',
    dayLabel: '금',
    time: '10:00',
    location: '산학협력관 305호',
    status: 'full',
  },
  {
    id: 'S10',
    date: '2026-08-21',
    dayLabel: '금',
    time: '11:00',
    location: '산학협력관 305호',
    status: 'available',
  },
];

// ─── Slot Card ────────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {typeof BASE_SLOTS[0]} props.slot
 * @param {boolean} props.isSelected
 * @param {() => void} props.onClick
 */
function SlotCard({ slot, isSelected, onClick }) {
  const disabled = slot.status === 'full' || slot.status === 'closed' || slot.status === 'holiday';
  const label =
    slot.status === 'full'
      ? '1/1 마감'
      : slot.status === 'closed'
        ? '마감'
        : slot.status === 'holiday'
          ? '휴무'
          : '0/1 가능';
  const labelColor = slot.status === 'available' ? '#0891B2' : '#9AA0A6';

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-[8px] border-2 p-3 text-left transition-all ${
        disabled
          ? 'bg-[#F9FAFB] border-[#E5E7EB] cursor-not-allowed opacity-60'
          : isSelected
            ? 'bg-[#ECFEFF] border-[#0891B2] shadow-[0_0_0_3px_rgba(8,145,178,0.12)]'
            : 'bg-white border-[#E5E7EB] hover:border-[#67E8F9] hover:shadow-[0_1px_4px_rgba(8,145,178,0.08)]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-[11px] font-black ${isSelected ? 'text-[#0891B2]' : disabled ? 'text-[#9AA0A6]' : 'text-[#1F2328]'}`}
        >
          {slot.dayLabel} {slot.time}
        </span>
        {isSelected && (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: ACCENT }}
          >
            <svg
              width="8"
              height="6"
              viewBox="0 0 8 6"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M1 3l2 2 4-4" />
            </svg>
          </div>
        )}
      </div>
      <div className="text-[10px] font-bold" style={{ color: labelColor }}>
        {label}
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * 상담 신청 4단계 흐름 (동의 → 유형·상담자 선택 → 일정 선택 → 완료).
 *
 * @param {Object} props
 * @param {() => void} props.onComplete
 * @param {() => void} [props.onBack]
 */
export default function CounselingApply({ onComplete, onBack }) {
  const [step, setStep] = useState(0);

  // Step 0 — consent
  const [agreed, setAgreed] = useState(false);

  // Step 1 — type & counselor
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const HAS_CONFLICT = false; // set true to demo duplicate error

  // Step 2 — schedule
  const [slots, setSlots] = useState(BASE_SLOTS);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [memo, setMemo] = useState('');
  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Helpers
  const STEPS = ['동의', '유형·상담자 선택', '일정 선택', '신청 완료'];

  const chosenSlot = slots.find((s) => s.id === selectedSlot);
  const chosenCounselor = COUNSELORS.find((c) => c.id === selectedCounselor);
  const chosenType = COUNSELING_TYPES.find((t) => t.key === selectedType);

  const handleSlotClick = (slot) => {
    if (selectedSlot === slot.id) {
      setSelectedSlot(null);
      return;
    }
    // Simulate race: slot S10 gets snatched
    if (slot.id === 'S10' && selectedSlot !== 'S10') {
      setSlots((prev) => prev.map((s) => (s.id === 'S10' ? { ...s, status: 'full' } : s)));
      toast('선택한 시간의 정원이 마감되었습니다. 다른 시간을 선택해 주세요.', 'warning');
      return;
    }
    setSelectedSlot(slot.id);
  };

  const handleFinalSubmit = async () => {
    setSubmitConfirm(false);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    setSubmitting(false);
    setStep(3);
  };

  // Group slots by date column for the grid
  const dateGroups = Array.from(new Set(slots.map((s) => s.date))).map((date) => ({
    date,
    dayLabel: slots.find((s) => s.date === date).dayLabel,
    slots: slots.filter((s) => s.date === date),
  }));

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '학생상담' }, { label: '상담 신청' }]}
        title="상담 신청"
        subtitle="상담 유형을 선택하고 가능한 일정을 예약하세요."
        accentColor={ACCENT}
        actions={
          onBack && (
            <Button size="sm" variant="outline" onClick={onBack}>
              ← 뒤로
            </Button>
          )
        }
      />

      {/* Stepper */}
      <div className="mb-6">
        <Stepper steps={STEPS} current={step} accentColor={ACCENT} />
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STEP 0 — Consent */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {step === 0 && (
        <div className="max-w-[640px] flex flex-col gap-4">
          {/* Consent card */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">상담 정보 처리 동의</h2>
              <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E]">
                필수
              </span>
            </div>
            <div className="px-5 py-5 text-[13px] leading-relaxed text-[#444D56]">
              <p className="font-bold text-[#1F2328] mb-3">한국대학교 학생상담 정보 처리 방침</p>
              <p className="mb-3">
                한국대학교(이하 &quot;학교&quot;)는 학생의 심리적 건강 증진과 성장 지원을 목적으로 상담
                서비스를 운영하며, 이 과정에서 수집되는 개인정보를 다음과 같이 처리합니다.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-[12px] text-[#656D76] mb-4">
                <li>
                  <strong className="text-[#1F2328]">수집 항목:</strong> 이름, 학번, 학과, 연락처,
                  상담 내용 및 기록
                </li>
                <li>
                  <strong className="text-[#1F2328]">이용 목적:</strong> 상담 서비스 제공, 사례
                  관리, 위기 개입, 교육통계 분석(비식별화)
                </li>
                <li>
                  <strong className="text-[#1F2328]">보유 기간:</strong> 졸업 후 5년간 보관 후 파기
                </li>
                <li>
                  <strong className="text-[#1F2328]">비밀보장 예외:</strong> 자해·타해 위험, 아동
                  학대 신고 의무, 법원 명령이 있는 경우
                </li>
                <li>
                  <strong className="text-[#1F2328]">제3자 제공:</strong> 원칙적으로 외부 제공 불가.
                  위기 상황 시 보호자·응급기관 연락 가능
                </li>
              </ol>
              <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[6px] px-4 py-3 text-[12px] text-[#164E63]">
                위 내용을 충분히 읽고 이해하였으며, 상담 정보 수집 및 처리에 동의합니다. 동의를
                거부할 권리가 있으나, 거부 시 상담 서비스 이용이 제한됩니다.
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 rounded-[4px] flex-shrink-0"
                  style={{ accentColor: ACCENT }}
                />
                <span className="text-[13px] font-semibold text-[#1F2328]">
                  위 상담 정보 처리 방침을 읽었으며 이에 동의합니다.
                </span>
              </label>
            </div>
          </div>

          {/* Consent history */}
          <div className="px-4 py-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
            <p className="text-[11px] font-semibold text-[#9AA0A6] mb-1.5 uppercase tracking-wide">
              동의 이력
            </p>
            <div className="flex flex-col gap-1">
              {[
                { ver: 'v2.1', date: '2026-03-01 09:22', note: '현재 버전' },
                { ver: 'v2.0', date: '2025-09-01 10:05', note: '이전 동의' },
              ].map((h) => (
                <div key={h.ver} className="flex items-center gap-3 text-[11px] text-[#9AA0A6]">
                  <span className="font-mono font-bold">{h.ver}</span>
                  <span>{h.date}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#E5E7EB] text-[#656D76]">
                    {h.note}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              size="md"
              disabled={!agreed}
              style={agreed ? { background: ACCENT } : {}}
              onClick={() => setStep(1)}
            >
              동의하고 다음 →
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STEP 1 — Type & Counselor */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {/* Conflict error */}
          {HAS_CONFLICT && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-5 py-4 flex items-start gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="#CF222E"
                className="flex-shrink-0 mt-0.5"
              >
                <circle cx="8" cy="8" r="7" />
                <path
                  d="M5 5l6 6M11 5l-6 6"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <p className="text-[13px] font-bold text-[#7F1D1D]">중복 신청 불가</p>
                <p className="text-[12px] text-[#CF222E] mt-0.5">
                  이미 진행 중인 같은 유형의 상담이 있어 신청할 수 없습니다.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.3fr' }}>
            {/* Left: Type selection */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[13px] font-bold text-[#1F2328] flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                  style={{ background: ACCENT }}
                >
                  1
                </div>
                상담 유형 선택
              </h3>
              {COUNSELING_TYPES.map((t) => {
                const isSelected = selectedType === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setSelectedType(t.key);
                      setSelectedCounselor(null);
                    }}
                    className={`w-full text-left rounded-[10px] border-2 p-4 transition-all ${isSelected ? 'bg-[#ECFEFF] shadow-[0_0_0_1px_rgba(8,145,178,0.2)]' : 'bg-white border-[#E5E7EB] hover:border-[#A5F3FC]'}`}
                    style={isSelected ? { borderColor: ACCENT } : {}}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p
                        className={`text-[13px] font-bold leading-snug ${isSelected ? 'text-[#0E7490]' : 'text-[#1F2328]'}`}
                      >
                        {t.title}
                      </p>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ml-2 transition-colors ${isSelected ? '' : 'border-[#D1D5DB]'}`}
                        style={isSelected ? { background: ACCENT, borderColor: ACCENT } : {}}
                      >
                        {isSelected && (
                          <svg
                            width="8"
                            height="6"
                            viewBox="0 0 8 6"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M1 3l2 2 4-4" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#656D76] leading-snug mb-2.5">{t.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {t.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: isSelected ? `${ACCENT}18` : '#F3F4F6',
                            color: isSelected ? ACCENT : '#656D76',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Counselor table */}
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden self-start">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                  style={{ background: ACCENT }}
                >
                  2
                </div>
                <h3 className="text-[13px] font-bold text-[#1F2328]">상담자 선택</h3>
                {!selectedType && (
                  <span className="text-[11px] text-[#9AA0A6] ml-1">
                    상담 유형을 먼저 선택하세요
                  </span>
                )}
              </div>
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                    {['선택', '상담사', '구분', '전문분야', '가능 슬롯'].map((h) => (
                      <th
                        key={h}
                        className={`px-3 py-2.5 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '전문분야' ? 'text-left' : 'text-center'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COUNSELORS.map((c, i) => {
                    const isSelected = selectedCounselor === c.id;
                    const disabled = !selectedType || c.availableSlots === 0;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => !disabled && setSelectedCounselor(c.id)}
                        className={`border-b border-[#F3F4F6] last:border-0 transition-colors ${
                          disabled
                            ? 'opacity-40 cursor-not-allowed'
                            : isSelected
                              ? 'bg-[#ECFEFF] cursor-pointer'
                              : 'hover:bg-[#F0FDFE] cursor-pointer'
                        } ${i % 2 === 1 && !isSelected ? 'bg-[#FAFAFA]' : ''}`}
                      >
                        <td className="px-3 py-3 text-center">
                          <div
                            className={`w-4 h-4 rounded-full border-2 mx-auto flex items-center justify-center ${isSelected ? '' : 'border-[#D1D5DB]'}`}
                            style={isSelected ? { background: ACCENT, borderColor: ACCENT } : {}}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="font-bold text-[#1F2328] text-[12px]">{c.name}</div>
                          <div className="text-[10px] text-[#9AA0A6]">{c.dept}</div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.role === '지도교수' ? 'bg-[#DBEAFE] text-[#0969DA]' : 'bg-[#DCFCE7] text-[#1A7F37]'}`}
                          >
                            {c.role}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {c.specialties.map((s) => (
                              <span
                                key={s}
                                className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#F3F4F6] text-[#656D76]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {c.availableSlots > 0 ? (
                            <span className="font-bold text-[#0891B2]">{c.availableSlots}개</span>
                          ) : (
                            <span className="text-[#9AA0A6] text-[11px]">마감</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2 justify-between">
            <Button size="sm" variant="secondary" onClick={() => setStep(0)}>
              ← 이전
            </Button>
            <Button
              size="md"
              disabled={!selectedType || !selectedCounselor || HAS_CONFLICT}
              style={
                selectedType && selectedCounselor && !HAS_CONFLICT ? { background: ACCENT } : {}
              }
              onClick={() => setStep(2)}
            >
              다음 — 일정 선택 →
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STEP 2 — Schedule */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          {/* Counselor summary */}
          <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[8px] px-5 py-3 flex items-center gap-4 text-[12px]">
            <div className="w-8 h-8 rounded-full bg-[#CFFAFE] flex items-center justify-center font-black text-[#0891B2]">
              {chosenCounselor?.name[0]}
            </div>
            <div>
              <span className="font-bold text-[#0E7490]">
                {chosenCounselor?.name} {chosenCounselor?.role}
              </span>
              <span className="mx-2 text-[#A5F3FC]">·</span>
              <span className="text-[#0E7490]">{chosenType?.title}</span>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">가능 슬롯 — 2026년 8월 3주차</h2>
              <div className="ml-auto flex items-center gap-3 text-[11px] text-[#9AA0A6]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-[2px] border border-[#0891B2] inline-block" />
                  가능
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-[2px] bg-[#ECFEFF] border border-[#0891B2] inline-block" />
                  선택됨
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-[2px] bg-[#F3F4F6] inline-block" />
                  불가
                </span>
              </div>
            </div>
            <div className="p-5">
              {/* Date headers */}
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${dateGroups.length}, 1fr)` }}
              >
                {dateGroups.map((dg) => (
                  <div key={dg.date} className="text-center mb-2">
                    <div className="text-[11px] font-bold text-[#656D76]">{dg.dayLabel}요일</div>
                    <div className="text-[12px] font-black text-[#1F2328]">{dg.date.slice(5)}</div>
                  </div>
                ))}
              </div>
              {/* Slot rows — up to max slots per day */}
              {(() => {
                const maxSlots = Math.max(...dateGroups.map((dg) => dg.slots.length));
                return Array.from({ length: maxSlots }).map((_, rowIdx) => (
                  <div
                    key={rowIdx}
                    className="grid gap-3 mb-2"
                    style={{ gridTemplateColumns: `repeat(${dateGroups.length}, 1fr)` }}
                  >
                    {dateGroups.map((dg) => {
                      const slot = dg.slots[rowIdx];
                      if (!slot) return <div key={dg.date + rowIdx} />;
                      return (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          isSelected={selectedSlot === slot.id}
                          onClick={() => handleSlotClick(slot)}
                        />
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Selected slot banner */}
          {chosenSlot && (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] px-5 py-3 flex items-center gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#1A7F37"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="8" cy="8" r="7" fill="#DCFCE7" />
                <path d="M5 8l2 2 4-4" />
              </svg>
              <span className="text-[13px] font-bold text-[#14532D]">
                선택: {chosenSlot.date} ({chosenSlot.dayLabel}) {chosenSlot.time} ·{' '}
                {chosenSlot.location}
              </span>
            </div>
          )}

          {/* Memo */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
            <label className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
              상담 희망 내용 <span className="text-[#9AA0A6] font-normal text-[12px]">(선택)</span>
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="상담에서 다루고 싶은 내용이나 어려운 점을 간략히 작성해 주세요."
              rows={4}
              className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#0891B2] placeholder:text-[#9AA0A6]"
            />
            <p className="text-[11px] text-[#9AA0A6] mt-1.5">
              입력한 내용은 담당 상담사만 열람합니다.
            </p>
          </div>

          <div className="flex gap-2 justify-between">
            <Button size="sm" variant="secondary" onClick={() => setStep(1)}>
              ← 이전
            </Button>
            <Button
              size="md"
              disabled={!selectedSlot}
              loading={submitting}
              style={selectedSlot ? { background: ACCENT } : {}}
              onClick={() => setSubmitConfirm(true)}
            >
              신청 완료 →
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STEP 3 — Complete */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="max-w-[560px]">
          {/* Completion card */}
          <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden">
            {/* Top accent strip */}
            <div className="h-1.5 w-full" style={{ background: ACCENT }} />
            <div className="p-8 flex flex-col items-center text-center gap-5">
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: '#CFFAFE' }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2C7.373 2 2 7.373 2 14s5.373 12 12 12 12-5.373 12-12S20.627 2 14 2z" />
                  <path d="M9 14l3 3 7-7" />
                </svg>
              </div>

              <div>
                <h2 className="text-[20px] font-black text-[#1F2328] mb-1">상담 신청 완료</h2>
                <p className="text-[13px] text-[#656D76]">
                  담당 상담사의 승인 후 예약이 확정됩니다.
                </p>
              </div>

              {/* Reservation info */}
              <div className="w-full bg-[#F9FAFB] rounded-[10px] border border-[#E5E7EB] divide-y divide-[#F3F4F6]">
                {[
                  {
                    label: '예약번호',
                    value: (
                      <span className="font-mono font-black text-[#0891B2]">CS-2026-0331</span>
                    ),
                  },
                  {
                    label: '상태',
                    value: (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#0969DA]">
                        신청
                      </span>
                    ),
                  },
                  { label: '상담유형', value: chosenType?.title },
                  { label: '상담사', value: `${chosenCounselor?.name} ${chosenCounselor?.role}` },
                  {
                    label: '일시',
                    value: chosenSlot
                      ? `${chosenSlot.date} (${chosenSlot.dayLabel}) ${chosenSlot.time}`
                      : '-',
                  },
                  { label: '장소', value: chosenSlot?.location },
                ].map((row) => (
                  <div key={row.label} className="flex items-center px-5 py-3">
                    <span className="w-24 text-[12px] text-[#656D76] flex-shrink-0">
                      {row.label}
                    </span>
                    <span className="text-[13px] font-semibold text-[#1F2328]">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[8px] px-4 py-3 w-full text-left">
                <p className="text-[12px] text-[#164E63]">
                  📱 알림톡으로 예약 확정 안내가 발송됩니다. 상담 당일 취소는 최소{' '}
                  <strong>1일 전</strong>까지 가능합니다.
                </p>
              </div>

              <Button
                size="md"
                className="w-full justify-center"
                style={{ background: ACCENT }}
                onClick={onComplete}
              >
                내 상담 예약 보기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={submitConfirm}
        title="상담 신청 확인"
        message={`${chosenSlot ? `${chosenSlot.date} (${chosenSlot.dayLabel}) ${chosenSlot.time}` : ''} · ${chosenCounselor?.name} ${chosenCounselor?.role}\n\n위 일정으로 상담을 신청하시겠습니까?`}
        confirmLabel="신청하기"
        onConfirm={handleFinalSubmit}
        onCancel={() => setSubmitConfirm(false)}
      />
    </div>
  );
}
