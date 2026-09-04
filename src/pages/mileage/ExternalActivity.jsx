import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { uploadExternalActivityFile, submitExternalActivityClaim } from '@/api/mileage';
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

// 현재 백엔드의 학생용 외부활동 정책 조회가 competency_id가 없는 기존 외부활동
// 정책을 제외하고 있어, 활성 정책이 있어도 빈 배열이 내려오는 경우가 있습니다.
// 정책 API가 정상적으로 데이터를 주면 아래 값은 사용하지 않고 서버 응답을 우선합니다.
const DEFAULT_EXTERNAL_ACTIVITY_POLICIES = [
  {
    mileagePolicyId: 'certificate-fallback',
    activityTypeId: 14,
    activityCode: 'CERTIFICATE',
    activityName: '자격증',
    categoryCode: 'EXTERNAL_ACTIVITY',
    earningRoute: 'EXTERNAL_CLAIM',
    points: 10,
    maximumPoints: null,
    duplicateRule: null,
    policyStatus: 'ACTIVE',
  },
  {
    mileagePolicyId: 'volunteer-fallback',
    activityTypeId: 15,
    activityCode: 'VOLUNTEER',
    activityName: '봉사활동',
    categoryCode: 'EXTERNAL_ACTIVITY',
    earningRoute: 'EXTERNAL_CLAIM',
    points: 10,
    maximumPoints: null,
    duplicateRule: null,
    policyStatus: 'ACTIVE',
  },
];

const DUPLICATE_RULE_LABELS = {
  NONE: '제한 없음',
  ONCE: '1회',
  PER_TERM: '학기당',
  PER_YEAR: '연도당',
};

const CLAIM_STATUS_LABELS = {
  REQUESTED: '검토중',
  APPROVED: '적립완료',
  REJECTED: '반려',
  CANCELLED: '취소',
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('ko-KR');
};

const formatPoints = (value) => {
  if (value == null || value === '') return '-';
  const points = Number(value);
  return Number.isFinite(points) ? `${points.toLocaleString('ko-KR')}점` : `${value}점`;
};

const formatMaximumPoints = (value) => (value == null || value === '' ? '제한 없음' : formatPoints(value));

const getDuplicateRuleType = (rule) => {
  if (rule == null || rule === '') return 'NONE';
  if (typeof rule === 'string') return rule;
  return rule.type;
};

const formatDuplicateRule = (rule) => {
  const type = getDuplicateRuleType(rule);
  if (DUPLICATE_RULE_LABELS[type]) return DUPLICATE_RULE_LABELS[type];
  if (rule == null || rule === '') return DUPLICATE_RULE_LABELS.NONE;
  if (typeof rule === 'object') return JSON.stringify(rule);
  return String(rule);
};

const normalizePolicy = (policy = {}) => ({
  ...policy,
  name: policy.activityName ?? '-',
  score: policy.points,
});

const normalizeClaim = (claim = {}) => ({
  id: claim.externalClaimId,
  date: claim.applicationDate,
  name: claim.activityName ?? '-',
  score: claim.requestedPoints,
  status: CLAIM_STATUS_LABELS[claim.claimStatus] ?? claim.claimStatus ?? '-',
  opinion: claim.rejectionReason ?? null,
});

// ── Dynamic form fields by category ──
const EMPTY_CERT_FORM = { name: '', acquiredAt: '', issuer: '' };
const EMPTY_VOLUNTEER_FORM = { org: '', hours: '', startDate: '', endDate: '' };

function CertFields({ value, onChange }) {
  const update = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  return (
    <>
      <Input
        label="자격명"
        placeholder="예) 정보처리기사"
        value={value.name}
        onChange={update('name')}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input label="취득일" type="date" value={value.acquiredAt} onChange={update('acquiredAt')} />
        <Input
          label="발급기관"
          placeholder="예) 한국산업인력공단"
          value={value.issuer}
          onChange={update('issuer')}
        />
      </div>
    </>
  );
}

function VolunteerFields({ value, onChange }) {
  const update = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="봉사기관"
          placeholder="예) 사회복지법인 ○○원"
          value={value.org}
          onChange={update('org')}
        />
        <Input
          label="봉사시간"
          placeholder="예) 40"
          hint="증빙서류에 기재된 봉사시간"
          type="number"
          value={value.hours}
          onChange={update('hours')}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="활동기간 시작일" type="date" value={value.startDate} onChange={update('startDate')} />
        <Input label="활동기간 종료일" type="date" value={value.endDate} onChange={update('endDate')} />
      </div>
    </>
  );
}

function DynamicFields({ activityName, certValue, onCertChange, volunteerValue, onVolunteerChange }) {
  if (activityName === '자격증') return <CertFields value={certValue} onChange={onCertChange} />;
  if (activityName === '봉사활동') return <VolunteerFields value={volunteerValue} onChange={onVolunteerChange} />;
  return null;
}

/**
 * 외부활동·자격증 증빙 등록 3단계 흐름 (유형선택 → 증빙입력 → 완료).
 *
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {boolean} [props.embedded] 탭 콘텐츠로 표시할 때 외부활동 전용 헤더를 숨깁니다.
 */
export default function ExternalActivity({ onBack, embedded = false }) {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [certForm, setCertForm] = useState(EMPTY_CERT_FORM);
  const [volunteerForm, setVolunteerForm] = useState(EMPTY_VOLUNTEER_FORM);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError, setPoliciesError] = useState('');
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState('');

  const loadPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    setPoliciesError('');
    try {
      const { data } = await apiClient.get('/students/mileage/external-activities/policies');
      const content = Array.isArray(data) ? data : data?.content ?? [];
      setPolicies(
        (content.length > 0 ? content : DEFAULT_EXTERNAL_ACTIVITY_POLICIES).map(normalizePolicy),
      );
    } catch (error) {
      setPoliciesError(error.message ?? '외부활동 정책을 불러오지 못했습니다.');
      setPolicies([]);
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setApplicationsLoading(true);
    setApplicationsError('');
    try {
      const { data } = await apiClient.get(
        '/students/mileage/external-activities/applications/recent',
      );
      setApplications((Array.isArray(data) ? data : []).map(normalizeClaim));
    } catch (error) {
      setApplicationsError(error.message ?? '신청 이력을 불러오지 못했습니다.');
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const resetEvidenceForm = () => {
    setCertForm(EMPTY_CERT_FORM);
    setVolunteerForm(EMPTY_VOLUNTEER_FORM);
    setEvidenceFile(null);
  };

  const handleSelectType = (t) => {
    setSelectedType(t);
    resetEvidenceForm();
  };

  const isCert = selectedType?.name === '자격증';
  const canSubmit = Boolean(
    selectedType &&
      evidenceFile &&
      (isCert
        ? certForm.name.trim() && certForm.acquiredAt
        : volunteerForm.org.trim() && volunteerForm.startDate),
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { fileGroupId } = await uploadExternalActivityFile(evidenceFile);
      const activityName = isCert ? certForm.name.trim() : volunteerForm.org.trim();
      const activityDate = isCert ? certForm.acquiredAt : volunteerForm.startDate;
      const detailData = isCert
        ? { issuer: certForm.issuer.trim() || undefined }
        : { hours: volunteerForm.hours || undefined, endDate: volunteerForm.endDate || undefined };

      await submitExternalActivityClaim({
        activityTypeId: selectedType.activityTypeId,
        activityName,
        activityDate,
        requestedPoints: selectedType.score,
        detailData,
        fileGroupId,
      });

      setStep(2);
      toast('외부활동 증빙이 제출되었습니다. 담당자 검토 후 적립됩니다.', 'success');
      loadApplications();
    } catch (error) {
      toast(error.message ?? '증빙 제출에 실패했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = ['활동유형 선택', '증빙 입력', '제출 완료'];

  return (
    <div>
      {!embedded && (
        <PageHeader
          breadcrumbs={[{ label: '마일리지', onClick: onBack }, { label: '외부활동 등록' }]}
          title="외부활동·자격증 증빙 등록"
          subtitle="정책에 등록된 외부활동 증빙을 등록하세요."
          accentColor={ACCENT}
          actions={
            <Button size="sm" variant="outline" onClick={onBack}>
              ← 마일리지로
            </Button>
          }
        />
      )}

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
                  {selectedType.name} ({formatPoints(selectedType.score)})
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
                  {['활동유형', '적립점수', '상한', '중복규칙', '선택'].map((h) => (
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
                {policiesLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#656D76]">
                      정책을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : policiesError ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#CF222E]">
                      <div className="flex flex-col items-center gap-2">
                        <span>{policiesError}</span>
                        <Button size="sm" variant="outline" onClick={loadPolicies}>
                          다시 불러오기
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : policies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#9AA0A6]">
                      현재 등록된 외부활동 정책이 없습니다.
                    </td>
                  </tr>
                ) : (
                  policies.map((t) => {
                    const isSelected = selectedType?.activityTypeId === t.activityTypeId;
                    return (
                      <tr
                        key={t.mileagePolicyId ?? t.activityTypeId}
                        onClick={() => handleSelectType(t)}
                        className={`border-b border-[#F3F4F6] last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-[#FFFBEB] ring-1 ring-inset ring-[#FDE68A]' : 'hover:bg-[#FAFAFA]'}`}
                      >
                        <td className="px-4 py-3 font-semibold text-[#1F2328]">{t.name}</td>
                        <td className="px-4 py-3 text-center font-black text-[#D97706]">
                          {formatPoints(t.score)}
                        </td>
                        <td className="px-4 py-3 text-center text-[#656D76]">
                          {formatMaximumPoints(t.maximumPoints)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[#F3F4F6] text-[#656D76]">
                            {formatDuplicateRule(t.duplicateRule)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="relative mx-auto flex h-5 w-5 items-center justify-center">
                            <input
                              type="radio"
                              name="externalActivityType"
                              value={t.activityTypeId}
                              checked={isSelected}
                              onChange={() => handleSelectType(t)}
                              aria-label={`${t.name} 선택`}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                            <div
                              aria-hidden="true"
                              className={`pointer-events-none flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? 'border-[#D97706] bg-[#D97706]' : 'border-[#D1D5DB]'}`}
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
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
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
              {selectedType.name}
            </span>
            <span className="text-[12px] text-[#9AA0A6]">
              적립 예정: <strong className="text-[#D97706]">{selectedType.score}점</strong>
            </span>
            <button
              className="ml-2 text-[11px] text-[#2563EB] underline"
              onClick={() => {
                setStep(0);
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
              <DynamicFields
                activityName={selectedType.name}
                certValue={certForm}
                onCertChange={setCertForm}
                volunteerValue={volunteerForm}
                onVolunteerChange={setVolunteerForm}
              />

              {/* File upload */}
              <div>
                <label className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
                  증빙 파일 <span className="text-[#CF222E]">*</span>
                  <span className="text-[#9AA0A6] font-normal ml-1 text-[12px]">
                    (PDF 10MB 이하)
                  </span>
                </label>
                <FileUpload
                  accept=".pdf"
                  maxSize="10MB"
                  onFiles={(files) => setEvidenceFile(files[0] ?? null)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setStep(0)}>
              ← 이전 단계
            </Button>
            <Button
              size="sm"
              loading={submitting}
              disabled={!canSubmit}
              style={canSubmit ? { background: ACCENT } : {}}
              onClick={handleSubmit}
            >
              제출
            </Button>
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
                resetEvidenceForm();
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
      {/* My application history */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden mt-2">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#D97706]" />
          <h2 className="text-[14px] font-bold text-[#1F2328]">나의 신청 현황</h2>
          <span className="ml-auto text-[12px] text-[#9AA0A6]">최근 {applications.length}건</span>
        </div>
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['신청일', '활동 내용', '신청 점수', '상태', '심사 의견'].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '활동 내용' || h === '심사 의견' ? 'text-left' : 'text-center'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {applicationsLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#656D76]">
                  신청 이력을 불러오는 중입니다.
                </td>
              </tr>
            ) : applicationsError ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#CF222E]">
                  <div className="flex flex-col items-center gap-2">
                    <span>{applicationsError}</span>
                    <Button size="sm" variant="outline" onClick={loadApplications}>
                      다시 불러오기
                    </Button>
                  </div>
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#9AA0A6]">
                  신청한 외부활동이 없습니다.
                </td>
              </tr>
            ) : (
              applications.map((a, i) => (
                <tr
                  key={a.id ?? `${a.date}-${i}`}
                  className={`border-b border-[#F3F4F6] last:border-0 ${a.status === '반려' ? 'bg-[#FFF5F5]' : i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                >
                  <td className="px-4 py-3 text-center text-[#9AA0A6] font-mono">
                    {formatDate(a.date)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#1F2328]">{a.name}</td>
                  <td className="px-4 py-3 text-center font-black text-[#D97706]">
                    {formatPoints(a.score)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={a.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    {a.opinion ? (
                      <span className="text-[12px] text-[#656D76]">{a.opinion}</span>
                    ) : (
                      <span className="text-[#9AA0A6]">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
