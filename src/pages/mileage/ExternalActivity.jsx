import { useState } from 'react';
import {
  PageHeader,
  Stepper,
  Button,
  Input,
  FileUpload,
  StatusBadge,
  toast,
} from '@/components/common';

const ACCENT = '#D97706';

// ── Activity types ──
const ACTIVITY_TYPES = [
  { category: '어학', name: 'TOEIC 800점 이상', score: 80, limit: '연 1회', rule: 'PER_YEAR' },
  { category: '어학', name: 'OPIc IM2 이상', score: 70, limit: '연 1회', rule: 'PER_YEAR' },
  { category: '자격증', name: '국가기술자격(기사)', score: 150, limit: '제한 없음', rule: 'NONE' },
  {
    category: '봉사',
    name: '봉사활동 20시간 단위',
    score: 60,
    limit: '학기 180점',
    rule: 'PER_TERM',
  },
  {
    category: '공모전',
    name: '교외 공모전 수상(최우수)',
    score: 200,
    limit: '제한 없음',
    rule: 'NONE',
  },
];

// ── My application records ──
const MY_APPS = [
  {
    id: 'E005',
    date: '2026-08-10',
    category: '어학',
    name: 'TOEIC 860점',
    score: 80,
    status: '검토중',
    processedAt: '-',
  },
  {
    id: 'E004',
    date: '2026-07-20',
    category: '자격증',
    name: '정보처리기사',
    score: 150,
    status: '적립완료',
    processedAt: '2026-07-22',
  },
  {
    id: 'E003',
    date: '2026-06-15',
    category: '봉사',
    name: '봉사활동 40시간',
    score: 120,
    status: '적립완료',
    processedAt: '2026-06-18',
  },
  {
    id: 'E002',
    date: '2026-05-10',
    category: '자격증',
    name: '정보처리기사 (중복)',
    score: 150,
    status: '반려',
    processedAt: '2026-05-12',
    opinion: '동일 자격증(E004)이 이미 적립되어 중복 적립할 수 없습니다.',
  },
  {
    id: 'E001',
    date: '2026-04-05',
    category: '어학',
    name: 'TOEIC 820점',
    score: 80,
    status: '보완요청',
    processedAt: '2026-04-07',
    opinion: '자격증 사본이 흐릿합니다. 재제출 바랍니다.',
  },
];

// ── Dynamic form fields by category ──
function LanguageFields() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Input label="시험명" placeholder="예) TOEIC, OPIc, IELTS" />
        <Input label="점수·등급" placeholder="예) 860점, IM2" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="취득일" type="date" />
        <Input
          label="유효기간 만료일"
          type="date"
          hint="만료일이 없는 경우 취득일로부터 2년 후 입력"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="발급기관" placeholder="예) 한국TOEIC위원회" />
        <Input label="성적 번호" placeholder="성적표의 고유 번호" />
      </div>
    </>
  );
}

function CertFields() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Input label="자격명" placeholder="예) 정보처리기사" />
        <Input label="자격번호" placeholder="예) 제2026-12345호" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="취득일" type="date" />
        <Input label="발급기관" placeholder="예) 한국산업인력공단" />
      </div>
    </>
  );
}

function VolunteerFields() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Input label="봉사기관" placeholder="예) 사회복지법인 ○○원" />
        <Input
          label="봉사시간"
          placeholder="예) 40"
          hint="단위: 시간 (20시간 단위 적립)"
          type="number"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="활동기간 시작일" type="date" />
        <Input label="활동기간 종료일" type="date" />
      </div>
      <Input label="확인서 번호" placeholder="봉사활동 확인서의 고유 번호" />
    </>
  );
}

function ContestFields() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Input label="주최기관" placeholder="예) 과학기술정보통신부" />
        <Input label="대회명" placeholder="예) 전국 소프트웨어 공모전" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="수상등급" placeholder="예) 최우수상 (1등)" />
        <Input label="수상일" type="date" />
      </div>
    </>
  );
}

function DynamicFields({ category }) {
  if (category === '어학') return <LanguageFields />;
  if (category === '자격증') return <CertFields />;
  if (category === '봉사') return <VolunteerFields />;
  if (category === '공모전') return <ContestFields />;
  return null;
}

/**
 * 외부활동·자격증 증빙 등록 3단계 흐름 (유형선택 → 증빙입력 → 완료).
 *
 * @param {Object} props
 * @param {() => void} props.onBack
 */
export default function ExternalActivity({ onBack }) {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState(null);
  const [validationState, setValidationState] = useState('none');
  const [submitting, setSubmitting] = useState(false);

  const handleSelectType = (t) => {
    setSelectedType(t);
    setValidationState('none');
  };

  const handleValidate = () => {
    // Simulate: if category is '자격증', show duplicate failure for demo
    if (selectedType?.category === '자격증') {
      setValidationState('fail');
    } else {
      setValidationState('pass');
    }
  };

  const handleSubmit = async () => {
    if (validationState !== 'pass') {
      toast('자동 검증을 먼저 통과해야 제출할 수 있습니다.', 'warning');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setStep(2);
    toast('외부활동 증빙이 제출되었습니다. 담당자 검토 후 적립됩니다.', 'success');
  };

  const STEPS = ['활동유형 선택', '증빙 입력', '제출 완료'];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '마일리지', onClick: onBack }, { label: '외부활동 등록' }]}
        title="외부활동·자격증 증빙 등록"
        subtitle="외부에서 취득한 어학 성적, 자격증, 봉사, 공모전 수상 실적을 등록하세요."
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 마일리지로
          </Button>
        }
      />

      {/* Stepper */}
      <div className="mb-6">
        <Stepper steps={STEPS} current={step} accentColor={ACCENT} />
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 0: Activity type selection */}
      {/* ══════════════════════════════════════════════════════ */}
      {step === 0 && (
        <div className="flex flex-col gap-4">
          {/* Selection banner */}
          {selectedType && (
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
              <span className="text-[13px] text-[#14532D]">
                선택한 활동:{' '}
                <strong>
                  {selectedType.category} &gt; {selectedType.name} ({selectedType.score}점)
                </strong>
              </span>
            </div>
          )}

          {/* Type table */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-[#D97706]" />
              <h2 className="text-[14px] font-bold text-[#1F2328]">등록 가능 활동유형</h2>
            </div>
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {['대분류', '활동유형', '적립점수', '상한', '중복규칙', '선택'].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '활동유형' ? 'text-left' : 'text-center'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ACTIVITY_TYPES.map((t, i) => {
                  const isSelected = selectedType?.name === t.name;
                  return (
                    <tr
                      key={i}
                      onClick={() => handleSelectType(t)}
                      className={`border-b border-[#F3F4F6] last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-[#FFFBEB] ring-1 ring-inset ring-[#FDE68A]' : 'hover:bg-[#FAFAFA]'}`}
                    >
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76]">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1F2328]">{t.name}</td>
                      <td className="px-4 py-3 text-center font-black text-[#D97706]">
                        {t.score}점
                      </td>
                      <td className="px-4 py-3 text-center text-[#656D76]">{t.limit}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[#F3F4F6] text-[#9AA0A6]">
                          {t.rule}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-colors ${isSelected ? 'border-[#D97706] bg-[#D97706]' : 'border-[#D1D5DB]'}`}
                        >
                          {isSelected && (
                            <svg
                              width="10"
                              height="8"
                              viewBox="0 0 10 8"
                              fill="none"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <path d="M1 4l3 3 5-6" />
                            </svg>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-4 py-3">
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="#9AA0A6"
              className="flex-shrink-0 mt-0.5"
            >
              <circle cx="8" cy="8" r="7" />
              <path d="M8 4v5M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-[12px] text-[#9AA0A6]">
              관리자가 등록하지 않은 활동은 신청할 수 없습니다. 목록에 없는 활동은 담당 부서에
              문의하세요.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              size="md"
              disabled={!selectedType}
              style={selectedType ? { background: ACCENT } : {}}
              onClick={() => setStep(1)}
            >
              다음 단계 — 증빙 입력 →
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 1: Evidence input */}
      {/* ══════════════════════════════════════════════════════ */}
      {step === 1 && selectedType && (
        <div className="flex flex-col gap-4">
          {/* Selected type chip */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
              {selectedType.category}
            </span>
            <span className="text-[14px] font-bold text-[#1F2328]">{selectedType.name}</span>
            <span className="text-[12px] text-[#9AA0A6]">
              적립 예정: <strong className="text-[#D97706]">{selectedType.score}점</strong>
            </span>
            <button
              className="ml-2 text-[11px] text-[#2563EB] underline"
              onClick={() => {
                setStep(0);
                setValidationState('none');
              }}
            >
              유형 변경
            </button>
          </div>

          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-4 rounded-full bg-[#D97706]" />
              <h2 className="text-[14px] font-bold text-[#1F2328]">증빙 정보 입력</h2>
            </div>

            <div className="flex flex-col gap-4">
              <DynamicFields category={selectedType.category} />

              {/* File upload */}
              <div>
                <label className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
                  증빙 파일 <span className="text-[#CF222E]">*</span>
                  <span className="text-[#9AA0A6] font-normal ml-1 text-[12px]">
                    (PDF·JPG 10MB 이하)
                  </span>
                </label>
                <FileUpload accept=".pdf,.jpg,.jpeg,.png" maxSize="10MB" multiple />
              </div>

              {/* Validation button */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleValidate}
                  style={{ borderColor: ACCENT, color: ACCENT }}
                >
                  자동 검증 실행
                </Button>
              </div>

              {/* Validation result */}
              {validationState === 'pass' && (
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] px-4 py-3 flex items-center gap-2.5">
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
                    자동 검증 통과 — 필수값 · 유효기간 · 중복 신청 · 파일 형식 이상 없음
                  </span>
                </div>
              )}
              {validationState === 'fail' && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-4 py-3 flex items-start gap-2.5">
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
                    <p className="text-[13px] font-bold text-[#7F1D1D]">검증 실패 — 제출 불가</p>
                    <p className="text-[12px] text-[#CF222E] mt-0.5">
                      동일 자격증이 이미 2026-05-11에 신청되어 중복 적립할 수 없습니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-between">
            <Button size="sm" variant="secondary" onClick={() => setStep(0)}>
              ← 이전
            </Button>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast('임시 저장되었습니다.', 'success')}
              >
                임시 저장
              </Button>
              <Button
                size="sm"
                loading={submitting}
                disabled={validationState !== 'pass'}
                style={validationState === 'pass' ? { background: ACCENT } : {}}
                onClick={handleSubmit}
              >
                제출
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 2: Complete */}
      {/* ══════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-10 flex flex-col items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-[#FEF3C7] flex items-center justify-center text-[28px]">
            ✅
          </div>
          <h2 className="text-[18px] font-bold text-[#1F2328]">제출이 완료되었습니다!</h2>
          <p className="text-[13px] text-[#656D76] text-center leading-relaxed max-w-[400px]">
            담당자 검토 후 1~3 영업일 내에 처리됩니다.
            <br />
            심사 결과는 알림톡으로 안내드립니다.
          </p>
          <div className="flex gap-3 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStep(0);
                setSelectedType(null);
                setValidationState('none');
              }}
            >
              추가 등록
            </Button>
            <Button size="sm" style={{ background: ACCENT }} onClick={onBack}>
              마일리지 현황 보기
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* My application history (always visible) */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden mt-2">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#D97706]" />
          <h2 className="text-[14px] font-bold text-[#1F2328]">나의 신청 현황</h2>
          <span className="ml-auto text-[12px] text-[#9AA0A6]">총 {MY_APPS.length}건</span>
        </div>
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['신청일', '활동유형', '활동 내용', '점수', '상태', '처리일', '심사 의견'].map(
                (h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '활동 내용' || h === '심사 의견' ? 'text-left' : 'text-center'}`}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {MY_APPS.map((a, i) => (
              <tr
                key={a.id}
                className={`border-b border-[#F3F4F6] last:border-0 ${a.status === '보완요청' ? 'bg-[#FFFBEB]' : a.status === '반려' ? 'bg-[#FFF5F5]' : i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
              >
                <td className="px-4 py-3 text-center text-[#9AA0A6] font-mono">{a.date}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76]">
                    {a.category}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-[#1F2328]">{a.name}</td>
                <td className="px-4 py-3 text-center font-black text-[#D97706]">{a.score}점</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={a.status} size="sm" />
                </td>
                <td className="px-4 py-3 text-center text-[#656D76]">{a.processedAt}</td>
                <td className="px-4 py-3">
                  {a.opinion ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#656D76]">{a.opinion}</span>
                      {a.status === '보완요청' && (
                        <button
                          onClick={() => toast('재제출 화면으로 이동합니다.', 'info')}
                          className="ml-1 flex-shrink-0 h-6 px-2.5 text-[10px] font-bold rounded-[5px] text-white whitespace-nowrap"
                          style={{ background: ACCENT }}
                        >
                          재제출
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#9AA0A6]">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
