import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { Button, Modal, Drawer, Pagination, StatTile, toast } from '@/components/common';
import { useCommonCode } from '@/hooks/useCommonCode';
import { formatSemester } from '@/utils/academicPeriod';
import StaffScholarshipTab from './StaffScholarshipTab';

const A = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// ─── shared helpers ────────────────────────────────────────────────────────────

const formatPeriod = (semesterCode) =>
  formatSemester(semesterCode, { allLabel: '연간', emptyLabel: '연간' });

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {import('react').ReactNode} props.children
 * @param {import('react').ReactNode} [props.right]
 */
function SCard({ title, children, right }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: A }} />
          <span className="text-[13px] font-bold text-[#1F2328]">{title}</span>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Chip({ label, bg, text }) {
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: bg, color: text }}
    >
      {label}
    </span>
  );
}

function TH({ children, center }) {
  return (
    <th
      className={`px-4 py-2.5 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap bg-[#F6F8FA] ${center ? 'text-center' : 'text-left'}`}
    >
      {children}
    </th>
  );
}

function TD({ children, center, cls }) {
  return (
    <td className={`px-4 py-3 text-[12px] ${center ? 'text-center' : ''} ${cls ?? ''}`}>
      {children}
    </td>
  );
}

const CLAIM_PAGE_SIZE = 20;
const CLAIM_STATUS_LABELS = {
  REQUESTED: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELLED: '취소',
};
const CLAIM_STATUS_OPTIONS = [
  { value: 'REQUESTED', label: '대기' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: 'CANCELLED', label: '취소' },
  { value: 'ALL', label: '전체' },
];
const CLAIM_STATUS_STYLE = {
  REQUESTED: { bg: '#F3F4F6', text: '#374151' },
  APPROVED: { bg: '#D1FAE5', text: '#059669' },
  REJECTED: { bg: '#FEE2E2', text: '#CF222E' },
  CANCELLED: { bg: '#E5E7EB', text: '#6B7280' },
};
const EMPTY_CLAIM_PAGE = {
  content: [],
  page: 0,
  size: CLAIM_PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

const formatPoints = (points) => {
  if (points == null || points === '') return '-';
  const numericPoints = Number(points);
  return Number.isFinite(numericPoints)
    ? `${numericPoints.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}점`
    : `${points}점`;
};

const formatDateOnly = (value) => {
  if (!value) return '-';
  return String(value).slice(0, 10);
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** 백엔드 목록 응답을 심사 목록 화면에서 사용하는 형태로 변환합니다. */
const normalizeClaim = (claim = {}) => ({
  id: claim.externalClaimId,
  date: claim.applicationDate,
  studentUserId: claim.studentId,
  studentNo: claim.studentNo ?? '-',
  studentId: claim.studentNo ?? claim.studentId ?? '-',
  name: claim.studentName ?? '-',
  type: claim.activityTypeName ?? '-',
  content: claim.activityName ?? '-',
  activityDate: claim.activityDate,
  requestedPoints: claim.requestedPoints,
  policyPoints: claim.policyPoints,
  score: claim.policyPoints ?? claim.requestedPoints,
  claimStatus: claim.claimStatus,
  status: CLAIM_STATUS_LABELS[claim.claimStatus] ?? claim.claimStatus ?? '-',
  hasEvidence: Boolean(claim.hasEvidence),
  reviewReason: claim.reviewReason ?? null,
});

/** 백엔드 상세 응답을 목록 행과 동일한 표시 형태로 변환합니다. */
const normalizeClaimDetail = (detail = {}) => normalizeClaim({
  externalClaimId: detail.externalClaimId,
  studentId: detail.student?.studentId,
  studentNo: detail.student?.studentNo,
  studentName: detail.student?.studentName,
  activityTypeName: detail.activity?.activityTypeName,
  activityName: detail.activityName,
  activityDate: detail.activityDate,
  requestedPoints: detail.requestedPoints,
  policyPoints: detail.policy?.points,
  claimStatus: detail.claimStatus,
  applicationDate: detail.applicationDate,
  reviewReason: detail.reviewReason,
  hasEvidence: detail.fileGroupId != null,
});

// ─── data ──────────────────────────────────────────────────────────────────────

const POLICY_PAGE_SIZE = 100;
const POLICY_STATUS_LABELS = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  EXPIRED: '만료',
};
const DUPLICATE_RULE_LABELS = {
  NONE: '무제한',
  ONCE: '1회',
  PER_TERM: '학기당',
  PER_YEAR: '연도당',
};
const DEFAULT_POLICY_FORM = {
  activityTypeId: '',
  semesterCode: 'ALL',
  points: '',
  maximumPoints: '',
  validFrom: '',
  validTo: '',
  duplicateRuleType: 'NONE',
};

const buildDuplicateRulePayload = (duplicateRuleType) => (
  duplicateRuleType && duplicateRuleType !== 'NONE'
    ? { type: duplicateRuleType }
    : null
);

const toPolicyForm = (policy) => ({
  activityTypeId: policy?.activityTypeId != null ? String(policy.activityTypeId) : '',
  semesterCode: policy?.semesterCode ?? 'ALL',
  points: policy?.points != null ? String(policy.points) : '',
  maximumPoints: policy?.maximumPoints != null ? String(policy.maximumPoints) : '',
  validFrom: policy?.validFrom ?? '',
  validTo: policy?.validTo ?? '',
  duplicateRuleType: policy?.duplicateRule?.type ?? 'NONE',
  policyStatus: policy?.policyStatus ?? 'ACTIVE',
});

const normalizePolicy = (policy) => ({
  ...policy,
  activityName: policy.activityName ?? '-',
  categoryCode: policy.categoryCode ?? '-',
  earningRoute: policy.earningRoute ?? '-',
  points: policy.points ?? 0,
  maximumPoints: policy.maximumPoints,
  duplicateRuleType: policy.duplicateRule?.type ?? 'NONE',
});

const buildPolicyRegisterPayload = (form) => ({
  activityTypeId: Number(form.activityTypeId),
  semesterCode: form.semesterCode || 'ALL',
  points: Number(form.points),
  maximumPoints: form.maximumPoints === '' ? null : Number(form.maximumPoints),
  validFrom: form.validFrom,
  validTo: form.validTo || null,
  duplicateRule: buildDuplicateRulePayload(form.duplicateRuleType),
});

const buildPolicyUpdatePayload = (form) => ({
  points: Number(form.points),
  maximumPoints: form.maximumPoints === '' ? null : Number(form.maximumPoints),
  validFrom: form.validFrom,
  ...(form.validTo ? { validTo: form.validTo, clearValidTo: false } : { clearValidTo: true }),
  duplicateRule: buildDuplicateRulePayload(form.duplicateRuleType),
  policyStatus: form.policyStatus || 'ACTIVE',
});

const validatePolicyForm = (form, activityType, { requireActivityType = false } = {}) => {
  if (requireActivityType && !form.activityTypeId) {
    return '활동유형을 선택해 주세요.';
  }

  if (form.points === '') {
    return '점수를 입력해 주세요.';
  }
  const points = Number(form.points);
  const maximumPoints = form.maximumPoints === '' ? null : Number(form.maximumPoints);

  if (!Number.isFinite(points) || points < 0) {
    return '점수를 0 이상으로 입력해 주세요.';
  }
  if (maximumPoints !== null && (!Number.isFinite(maximumPoints) || maximumPoints < 0)) {
    return '최대 점수를 0 이상으로 입력해 주세요.';
  }
  if (!form.validFrom) {
    return '적용 시작일을 입력해 주세요.';
  }
  if (form.validTo && form.validFrom >= form.validTo) {
    return '적용 시작일은 종료일보다 빨라야 합니다.';
  }

  const isExtracurricular = activityType?.categoryCode?.toUpperCase() === 'EXTRACURRICULAR'
    && activityType?.earningRoute?.toUpperCase() === 'PROGRAM_COMPLETION';
  if (isExtracurricular && points !== 5) {
    return '비교과 프로그램 정책은 프로그램 이수 1건당 5점으로만 등록할 수 있습니다.';
  }

  return '';
};
const REJECT_CODES = ['선택하세요', '허위 증빙', '유효기간 초과', '중복 적립 해당', '기타'];

// ─── Tab ① 기준 설정 ─────────────────────────────────────────────────────────────

const DEFAULT_POLICY_QUERY = { semesterCode: '', policyStatus: '' };

function TabPolicySettings() {
  const [policies, setPolicies] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [pForm, setPForm] = useState(DEFAULT_POLICY_FORM);
  const {
    data: semesterCodesRaw = [],
    isLoading: semesterCodesLoading,
    isError: semesterCodesError,
    refetch: refetchSemesterCodes,
  } = useCommonCode('SEMESTER');
  const registrationSemesterOptions = [
    { code: 'ALL', codeName: formatPeriod('ALL') },
    ...semesterCodesRaw
      .filter((s) => s.code === 'SPRING' || s.code === 'FALL')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ ...s, codeName: formatPeriod(s.code) })),
  ];
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityTypesLoading, setActivityTypesLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [activityTypesError, setActivityTypesError] = useState('');
  const [actionId, setActionId] = useState(null);

  const updateCreateField = (field, value) => {
    setPForm((current) => ({ ...current, [field]: value }));
  };

  const loadPolicies = useCallback(async (currentFilter) => {
    setLoading(true);
    setPolicyError('');
    try {
      const params = {
        page: 0,
        size: POLICY_PAGE_SIZE,
        sort: 'createdAt,desc',
        ...(currentFilter.semesterCode ? { semesterCode: currentFilter.semesterCode } : {}),
        ...(currentFilter.policyStatus ? { policyStatus: currentFilter.policyStatus } : {}),
      };
      const { data } = await apiClient.get('/staff/mileage/policies', { params });
      setPolicies((data?.content ?? []).map(normalizePolicy));
    } catch (error) {
      setPolicyError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivityTypes = useCallback(async () => {
    setActivityTypesLoading(true);
    setActivityTypesError('');
    try {
      const { data } = await apiClient.get('/staff/mileage/activity-types');
      const content = Array.isArray(data) ? data : data?.content ?? [];
      setActivityTypes(content);
    } catch (error) {
      setActivityTypesError(error.message);
    } finally {
      setActivityTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies(DEFAULT_POLICY_QUERY);
    loadActivityTypes();
  }, [loadActivityTypes, loadPolicies]);

  const resetCreateForm = () => setPForm(DEFAULT_POLICY_FORM);

  const addPolicy = async () => {
    if (semesterCodesLoading || semesterCodesError) {
      toast('학기 목록을 불러온 후 다시 시도해 주세요.', 'error');
      return;
    }
    const selectedActivityType = activityTypes.find(
      (activity) => String(activity.activityTypeId) === String(pForm.activityTypeId),
    );
    const validationMessage = validatePolicyForm(pForm, selectedActivityType, { requireActivityType: true });
    if (validationMessage) {
      toast(validationMessage, 'error');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/staff/mileage/policies', buildPolicyRegisterPayload(pForm));
      toast('정책이 등록되었습니다.', 'success');
      resetCreateForm();
      await loadPolicies(DEFAULT_POLICY_QUERY);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openPolicyDetail = async (policyId) => {
    if (editId === policyId) {
      setEditId(null);
      setEditForm(null);
      return;
    }

    setEditId(policyId);
    setEditForm(null);
    setDetailLoading(true);
    try {
      const { data } = await apiClient.get(`/staff/mileage/policies/${policyId}`);
      setEditForm(toPolicyForm(data));
    } catch (error) {
      toast(error.message, 'error');
      setEditId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const updatePolicyField = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const savePolicy = async () => {
    if (!editId || !editForm) {
      toast('수정할 정책을 먼저 선택해 주세요.', 'error');
      return;
    }

    const selectedActivityType = activityTypes.find(
      (activity) => String(activity.activityTypeId) === String(editForm.activityTypeId),
    );
    const validationMessage = validatePolicyForm(editForm, selectedActivityType);
    if (validationMessage) {
      toast(validationMessage, 'error');
      return;
    }

    setEditSaving(true);
    try {
      await apiClient.patch(`/staff/mileage/policies/${editId}`, buildPolicyUpdatePayload(editForm));
      toast('정책이 수정되었습니다.', 'success');
      setEditId(null);
      setEditForm(null);
      await loadPolicies(DEFAULT_POLICY_QUERY);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const deactivatePolicy = async (policy) => {
    if (!window.confirm(`'${policy.activityName}' 정책을 비활성화할까요?`)) return;

    setActionId(policy.mileagePolicyId);
    try {
      await apiClient.patch(`/staff/mileage/policies/${policy.mileagePolicyId}`, {
        policyStatus: 'INACTIVE',
      });
      toast('정책이 비활성화되었습니다.', 'success');
      await loadPolicies(DEFAULT_POLICY_QUERY);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Register a policy for an existing activity type */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: A }} />
          <span className="text-[12px] font-bold text-[#1F2328]">정책 등록</span>
          <span className="text-[11px] text-[#9AA0A6]">기존 활동유형에 점수 정책을 등록합니다.</span>
        </div>
        {activityTypesError && (
          <p className="mb-3 text-[12px] text-[#CF222E]">활동유형을 불러오지 못했습니다: {activityTypesError}</p>
        )}
        {semesterCodesError && (
          <p role="alert" className="mb-3 text-[12px] text-[#CF222E]">
            학기 목록을 불러오지 못했습니다.{' '}
            <button type="button" onClick={() => refetchSemesterCodes()} className="font-bold underline">
              다시 시도
            </button>
          </p>
        )}
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">활동유형</label>
            <select
              value={pForm.activityTypeId}
              onChange={(e) => updateCreateField('activityTypeId', e.target.value)}
              disabled={activityTypesLoading || saving}
              className="h-8 w-48 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            >
              <option value="">선택하세요</option>
              {activityTypes.map((activity) => (
                <option key={activity.activityTypeId} value={activity.activityTypeId}>
                  {activity.activityName} ({activity.activityCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">학기</label>
            <select
              value={pForm.semesterCode}
              onChange={(e) => updateCreateField('semesterCode', e.target.value)}
              disabled={saving || semesterCodesLoading}
              className="h-8 w-28 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            >
              {registrationSemesterOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.codeName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">점수</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={pForm.points}
              onChange={(e) => updateCreateField('points', e.target.value)}
              disabled={saving}
              className="h-8 w-24 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">최대 점수</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={pForm.maximumPoints}
              onChange={(e) => updateCreateField('maximumPoints', e.target.value)}
              disabled={saving}
              placeholder="없음"
              className="h-8 w-24 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">적용 시작일</label>
            <input
              type="date"
              value={pForm.validFrom}
              onChange={(e) => updateCreateField('validFrom', e.target.value)}
              disabled={saving}
              className="h-8 w-36 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">적용 종료일</label>
            <input
              type="date"
              value={pForm.validTo}
              onChange={(e) => updateCreateField('validTo', e.target.value)}
              disabled={saving}
              className="h-8 w-36 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">중복 규칙</label>
            <select
              value={pForm.duplicateRuleType}
              onChange={(e) => updateCreateField('duplicateRuleType', e.target.value)}
              disabled={saving}
              className="h-8 w-28 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            >
              {Object.keys(DUPLICATE_RULE_LABELS).map((rule) => (
                <option key={rule} value={rule}>{DUPLICATE_RULE_LABELS[rule]}</option>
              ))}
            </select>
          </div>
          <button
            onClick={addPolicy}
            disabled={saving || activityTypesLoading || semesterCodesLoading || semesterCodesError}
            className="h-8 px-4 text-[12px] font-bold text-white rounded-[6px] disabled:opacity-50"
            style={{ background: A }}
          >
            {saving ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>

      {/* Policy table */}
      <SCard
        title="등록된 정책"
        right={<Chip label={`${policies.length}종`} bg="#FEF3C7" text={A} />}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <TH>정책 ID</TH>
                <TH>활동유형</TH>
                <TH center>점수</TH>
                <TH center>상한</TH>
                <TH center>중복규칙</TH>
                <TH>기간</TH>
                <TH center>상태</TH>
                <TH center>관리</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] text-[#656D76]">정책을 불러오는 중입니다.</td></tr>
              ) : policyError ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] text-[#CF222E]">정책을 불러오지 못했습니다: {policyError}</td></tr>
              ) : policies.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] text-[#9AA0A6]">조회된 정책이 없습니다.</td></tr>
              ) : (
                policies.map((policy) => {
                  const status = POLICY_STATUS_LABELS[policy.policyStatus] ?? policy.policyStatus ?? '-';
                  return (
                    <tr
                      key={policy.mileagePolicyId}
                      className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] ${editId === policy.mileagePolicyId ? 'bg-[#FFFBEB]' : ''}`}
                    >
                      <TD cls="font-mono text-[10px]"><span style={{ color: A }}>#{policy.mileagePolicyId}</span></TD>
                      <TD cls="font-semibold text-[#1F2328]">{policy.activityName}</TD>
                      <TD center cls="font-black"><span style={{ color: A }}>{policy.points}점</span></TD>
                      <TD center cls="text-[#444D56]">{policy.maximumPoints ?? '—'}점</TD>
                      <TD center><span className="text-[10px] font-semibold text-[#656D76]">{DUPLICATE_RULE_LABELS[policy.duplicateRuleType] ?? policy.duplicateRuleType}</span></TD>
                      <TD cls="font-mono text-[10px] text-[#9AA0A6]">
                        {policy.validFrom ?? '-'} ~ {policy.validTo ?? '무기한'}
                      </TD>
                      <TD center><Chip label={status} bg={policy.policyStatus === 'ACTIVE' ? '#D1FAE5' : '#F3F4F6'} text={policy.policyStatus === 'ACTIVE' ? '#059669' : '#656D76'} /></TD>
                      <TD center>
                        <div className="flex gap-1.5 justify-center">
                          <button
                            onClick={() => openPolicyDetail(policy.mileagePolicyId)}
                            className="h-6 px-2 text-[9px] font-bold rounded-[4px] bg-[#FEF3C7] hover:bg-[#FDE68A] transition-colors disabled:opacity-50"
                            style={{ color: A }}
                            disabled={detailLoading && editId === policy.mileagePolicyId}
                          >
                            {detailLoading && editId === policy.mileagePolicyId ? '조회 중' : '상세·수정'}
                          </button>
                          {policy.policyStatus === 'ACTIVE' && (
                            <button
                              onClick={() => deactivatePolicy(policy)}
                              disabled={actionId === policy.mileagePolicyId}
                              className="h-6 px-2 text-[9px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors disabled:opacity-50"
                            >
                              {actionId === policy.mileagePolicyId ? '처리 중' : '비활성화'}
                            </button>
                          )}
                        </div>
                      </TD>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SCard>

      {editId && (
        <SCard title="정책 상세·수정">
          {detailLoading || !editForm ? (
            <div className="px-5 py-8 text-center text-[12px] text-[#656D76]">상세 정보를 불러오는 중입니다.</div>
          ) : (
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-[8px] bg-[#F9FAFB] p-4 text-[12px]">
                <div><p className="text-[10px] text-[#9AA0A6]">정책 ID</p><p className="font-bold text-[#1F2328]">#{editId}</p></div>
                <div><p className="text-[10px] text-[#9AA0A6]">활동유형</p><p className="font-bold text-[#1F2328]">{policies.find((item) => item.mileagePolicyId === editId)?.activityName ?? '-'}</p></div>
                <div><p className="text-[10px] text-[#9AA0A6]">학기</p><p className="font-bold text-[#1F2328]">{formatPeriod(editForm.semesterCode)}</p></div>
              </div>
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">점수</label>
                  <input type="number" step="0.01" min="0" value={editForm.points} onChange={(e) => updatePolicyField('points', e.target.value)} disabled={editSaving} className="h-8 w-24 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">최대 점수</label>
                  <input type="number" step="0.01" min="0" value={editForm.maximumPoints} onChange={(e) => updatePolicyField('maximumPoints', e.target.value)} disabled={editSaving} className="h-8 w-24 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">적용 시작일</label>
                  <input type="date" value={editForm.validFrom} onChange={(e) => updatePolicyField('validFrom', e.target.value)} disabled={editSaving} className="h-8 w-36 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">적용 종료일</label>
                  <input type="date" value={editForm.validTo} onChange={(e) => updatePolicyField('validTo', e.target.value)} disabled={editSaving} className="h-8 w-36 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">중복 규칙</label>
                  <select value={editForm.duplicateRuleType} onChange={(e) => updatePolicyField('duplicateRuleType', e.target.value)} disabled={editSaving} className="h-8 w-28 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none">
                    {Object.keys(DUPLICATE_RULE_LABELS).map((rule) => <option key={rule} value={rule}>{DUPLICATE_RULE_LABELS[rule]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">상태</label>
                  <select value={editForm.policyStatus} onChange={(e) => updatePolicyField('policyStatus', e.target.value)} disabled={editSaving} className="h-8 w-28 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none">
                    {Object.entries(POLICY_STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={savePolicy} disabled={editSaving} className="h-8 px-4 text-[12px] font-bold text-white rounded-[6px] disabled:opacity-50" style={{ background: A }}>{editSaving ? '저장 중...' : '저장'}</button>
                  <button onClick={() => { setEditId(null); setEditForm(null); }} disabled={editSaving} className="h-8 px-4 text-[12px] font-bold rounded-[6px] border border-[#E5E7EB] text-[#656D76] bg-white">닫기</button>
                </div>
              </div>
            </div>
          )}
        </SCard>
      )}

    </div>
  );
}

// ─── Tab ② 심사 접수함 ─────────────────────────────────────────────────────────

function TabReviewInbox() {
  const [reviews, setReviews] = useState([]);
  const [claimPage, setClaimPage] = useState(EMPTY_CLAIM_PAGE);
  const [draftFilters, setDraftFilters] = useState({ status: 'REQUESTED', keyword: '' });
  const [appliedFilters, setAppliedFilters] = useState({ status: 'REQUESTED', keyword: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState(null);
  const [drawerDetail, setDrawerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [decision, setDecision] = useState('APPROVE');
  const [rCode, setRCode] = useState('선택하세요');
  const [opinion, setOpinion] = useState('');
  const [cancelOpen, setCancelOpen] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const loadClaims = useCallback(async (currentFilters, currentPage) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/staff/mileage/claims', {
        params: {
          status: currentFilters.status,
          keyword: currentFilters.keyword || undefined,
          page: currentPage - 1,
          size: CLAIM_PAGE_SIZE,
          sort: 'createdAt,desc',
        },
      });
      const nextPage = { ...EMPTY_CLAIM_PAGE, ...(data ?? {}) };

      if (nextPage.totalPages > 0 && currentPage > nextPage.totalPages) {
        setPage(nextPage.totalPages);
        return;
      }

      setClaimPage(nextPage);
      setReviews((nextPage.content ?? []).map(normalizeClaim));
    } catch (requestError) {
      setError(requestError.message ?? '마일리지 신청 목록을 불러오지 못했습니다.');
      setClaimPage(EMPTY_CLAIM_PAGE);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaims(appliedFilters, page);
  }, [appliedFilters, loadClaims, page]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({
      status: draftFilters.status,
      keyword: draftFilters.keyword.trim(),
    });
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || (claimPage.totalPages > 0 && nextPage > claimPage.totalPages)) return;
    setPage(nextPage);
  };

  const openDrawer = async (item) => {
    setDrawerItem(item);
    setDrawerDetail(null);
    setDetailError('');
    setDecision('APPROVE');
    setRCode('선택하세요');
    setOpinion('');
    setDrawerOpen(true);
    setDetailLoading(true);

    try {
      const { data } = await apiClient.get(`/staff/mileage/claims/${item.id}`);
      setDrawerDetail(data);
      setDrawerItem((current) => (
        current?.id === item.id
          ? { ...current, ...normalizeClaimDetail(data) }
          : current
      ));
    } catch (requestError) {
      setDetailError(requestError.message ?? '신청 상세 정보를 불러오지 못했습니다.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    if (reviewSubmitting) return;
    setDrawerOpen(false);
    setDrawerItem(null);
    setDrawerDetail(null);
    setDetailError('');
  };

  const submitReview = async () => {
    if (!drawerItem || reviewSubmitting) return;

    const currentClaimStatus = drawerDetail?.claimStatus ?? drawerItem.claimStatus;
    if (currentClaimStatus !== 'REQUESTED') {
      toast('아직 심사 대기 중인 신청만 처리할 수 있습니다.', 'error');
      return;
    }

    let reason;
    if (decision === 'REJECT') {
      const selectedReasonCode = !['선택하세요', '선택 안 함'].includes(rCode) ? rCode : '';
      reason = [selectedReasonCode, opinion.trim()].filter(Boolean).join(' - ');
      if (!reason) {
        toast('반려 사유를 입력해 주세요.', 'error');
        return;
      }
    }

    setReviewSubmitting(true);
    try {
      if (decision === 'APPROVE') {
        await apiClient.post(`/staff/mileage/claims/${drawerItem.id}/approve`);
        toast('승인 완료. 마일리지 EARN 거래가 생성되었습니다.', 'success');
      } else {
        await apiClient.post(`/staff/mileage/claims/${drawerItem.id}/reject`, { reason });
        toast('반려 처리되었습니다.', 'info');
      }

      setDrawerOpen(false);
      setDrawerItem(null);
      setDrawerDetail(null);
      await loadClaims(appliedFilters, page);
    } catch (requestError) {
      toast(requestError.message ?? '심사 처리에 실패했습니다.', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const submitCancel = async () => {
    if (!cancelOpen || cancelSubmitting) return;
    const reason = cancelReason.trim();
    if (!reason) {
      toast('취소 사유를 입력해 주세요.', 'error');
      return;
    }

    setCancelSubmitting(true);
    try {
      await apiClient.post(`/staff/mileage/claims/${cancelOpen.id}/cancel`, { reason });
      toast('승인 취소 완료. 마일리지 역분개 거래가 생성되었습니다.', 'info');
      setCancelOpen(null);
      setCancelReason('');
      await loadClaims(appliedFilters, page);
    } catch (requestError) {
      toast(requestError.message ?? '승인 취소에 실패했습니다.', 'error');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const currentClaimStatus = drawerDetail?.claimStatus ?? drawerItem?.claimStatus;
  const currentStatusLabel = CLAIM_STATUS_LABELS[currentClaimStatus] ?? currentClaimStatus ?? '-';
  const detailStudent = drawerDetail?.student;
  const detailActivity = drawerDetail?.activity;
  const detailPolicy = drawerDetail?.policy;
  const isReviewable = currentClaimStatus === 'REQUESTED';
  const currentPagePending = reviews.filter((review) => review.claimStatus === 'REQUESTED').length;
  const currentPageEvidence = reviews.filter((review) => review.hasEvidence).length;
  const resultLabel = appliedFilters.status === 'REQUESTED' ? '심사 대기' : '조회 결과';

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4">
        <StatTile
          label={resultLabel}
          value={`${Number(claimPage.totalElements ?? 0).toLocaleString()}건`}
          accentColor={A}
        />
        <StatTile label="현재 페이지" value={`${reviews.length}건`} accentColor={A} />
        <StatTile label="현재 페이지 대기" value={`${currentPagePending}건`} accentColor={A} />
        <StatTile label="현재 페이지 증빙" value={`${currentPageEvidence}건`} accentColor="#059669" />
      </div>

      {/* Filter bar */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 flex flex-wrap gap-3 items-end shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
      >
        <div>
          <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">상태</label>
          <select
            value={draftFilters.status}
            onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}
            className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white w-28"
          >
            {CLAIM_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#9AA0A6] mb-1">학번·성명·활동명</label>
          <input
            value={draftFilters.keyword}
            onChange={(event) => setDraftFilters((current) => ({ ...current, keyword: event.target.value }))}
            placeholder="검색"
            className="h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white w-48"
          />
        </div>
        <div>
          <div className="h-5" />
          <button
            type="submit"
            disabled={loading}
            className="h-8 px-4 text-[12px] font-bold text-white rounded-[6px] disabled:opacity-50"
            style={{ background: A }}
          >
            {loading ? '조회 중' : '조회'}
          </button>
        </div>
        <p className="w-full text-[10px] text-[#9AA0A6]">
          백엔드 검색 조건: 상태, 학번·성명·활동명. 기본값은 심사 대기 신청입니다.
        </p>
      </form>

      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] text-[12px] text-[#991B1B]">
          <span>{error}</span>
          <button type="button" onClick={() => loadClaims(appliedFilters, page)} className="font-bold underline">
            다시 시도
          </button>
        </div>
      )}

      <SCard
        title={`심사 목록 · ${Number(claimPage.totalElements ?? 0).toLocaleString()}건`}
        right={
          <span className="text-[11px] text-[#9AA0A6]">
            페이지 {claimPage.page + 1} / {Math.max(claimPage.totalPages, 1)}
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <TH>신청 ID</TH>
                <TH>신청일</TH>
                <TH>학번</TH>
                <TH>성명</TH>
                <TH>활동유형</TH>
                <TH>활동 내용</TH>
                <TH center>점수</TH>
                <TH center>증빙</TH>
                <TH center>상태</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[12px] text-[#9AA0A6]">
                    신청 목록을 불러오는 중입니다.
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[12px] text-[#9AA0A6]">
                    조건에 맞는 마일리지 신청이 없습니다.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => {
                  const statusStyle = CLAIM_STATUS_STYLE[review.claimStatus] ?? CLAIM_STATUS_STYLE.REQUESTED;
                  return (
                    <tr
                      key={review.id}
                      onClick={() => openDrawer(review)}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FFFBEB] cursor-pointer transition-colors"
                    >
                      <TD cls="font-mono text-[10px]">
                        <span style={{ color: A }}>#{review.id ?? '-'}</span>
                      </TD>
                      <TD cls="font-mono text-[11px] text-[#9AA0A6]">{formatDateOnly(review.date)}</TD>
                      <TD cls="font-mono text-[11px] text-[#9AA0A6]">{review.studentNo}</TD>
                      <TD cls="font-bold text-[#1F2328]">{review.name}</TD>
                      <TD cls="text-[#656D76]">{review.type}</TD>
                      <TD cls="text-[#444D56] max-w-[180px] truncate">{review.content}</TD>
                      <TD center cls="font-black">
                        <span style={{ color: A }}>{formatPoints(review.policyPoints ?? review.requestedPoints)}</span>
                      </TD>
                      <TD center>
                        {review.hasEvidence ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDrawer(review);
                            }}
                            className="h-5 px-2 text-[9px] font-bold rounded-[4px] bg-[#D1FAE5] text-[#059669] hover:bg-[#A7F3D0]"
                          >
                            있음
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#9AA0A6]">없음</span>
                        )}
                      </TD>
                      <TD center>
                        <div className="flex items-center gap-1.5 justify-center">
                          <Chip label={CLAIM_STATUS_LABELS[review.claimStatus] ?? '-'} bg={statusStyle.bg} text={statusStyle.text} />
                          {review.claimStatus === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setCancelOpen(review);
                              }}
                              className="h-5 px-2 text-[9px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors"
                            >
                              승인 취소
                            </button>
                          )}
                        </div>
                      </TD>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SCard>

      {!loading && claimPage.totalPages > 0 && (
        <Pagination
          page={page}
          totalPages={claimPage.totalPages}
          totalItems={claimPage.totalElements}
          pageSize={CLAIM_PAGE_SIZE}
          onChange={handlePageChange}
        />
      )}

      {/* Review drawer */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="심사 처리"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDrawer} disabled={reviewSubmitting}>
              닫기
            </Button>
            {currentClaimStatus === 'APPROVED' && (
              <Button
                variant="danger"
                onClick={() => {
                  setCancelOpen(drawerItem);
                  closeDrawer();
                }}
              >
                승인 취소
              </Button>
            )}
            {isReviewable && (
              <Button
                variant={decision === 'REJECT' ? 'danger' : 'primary'}
                onClick={submitReview}
                loading={reviewSubmitting}
                disabled={detailLoading}
              >
                {decision === 'REJECT' ? '반려 처리' : '승인 처리'}
              </Button>
            )}
          </div>
        )}
      > 
        {drawerItem && (
          <div className="flex flex-col gap-5 text-[12px]">
            {detailLoading && (
              <div className="px-3 py-2 rounded-[6px] bg-[#F3F4F6] text-[11px] text-[#656D76]">
                신청 상세 정보를 불러오는 중입니다.
              </div>
            )}
            {detailError && (
              <div className="px-3 py-2 rounded-[6px] bg-[#FEF2F2] border border-[#FECACA] text-[11px] text-[#991B1B]">
                {detailError}
              </div>
            )}

            {/* Student + activity header */}
            <div className="p-4 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="font-bold text-[#1F2328]">
                  신청 #{drawerItem.id ?? '-'}
                </p>
                <Chip
                  label={currentStatusLabel}
                  bg={(CLAIM_STATUS_STYLE[currentClaimStatus] ?? CLAIM_STATUS_STYLE.REQUESTED).bg}
                  text={(CLAIM_STATUS_STYLE[currentClaimStatus] ?? CLAIM_STATUS_STYLE.REQUESTED).text}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: '학번', v: detailStudent?.studentNo ?? drawerItem.studentNo },
                  { l: '성명', v: detailStudent?.studentName ?? drawerItem.name },
                  { l: '활동유형', v: detailActivity?.activityTypeName ?? drawerItem.type },
                  { l: '활동일', v: formatDateOnly(drawerDetail?.activityDate ?? drawerItem.activityDate) },
                ].map((f) => (
                  <div key={f.l}>
                    <p className="text-[10px] text-[#9AA0A6] mb-0.5">{f.l}</p>
                    <p className="font-bold text-[#1F2328]">{f.v ?? '-'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Submitted content and policy table */}
            <div>
              <p className="text-[11px] font-bold text-[#656D76] mb-2">제출 내용</p>
              <table className="w-full border border-[#E5E7EB] rounded-[6px] overflow-hidden text-[11px]">
                <tbody>
                  {[
                    ['활동 내용', drawerDetail?.activityName ?? drawerItem.content],
                    ['활동일', formatDateOnly(drawerDetail?.activityDate ?? drawerItem.activityDate)],
                    ['신청일', formatDateTime(drawerDetail?.applicationDate ?? drawerItem.date)],
                    ['학생 요청 점수', formatPoints(drawerDetail?.requestedPoints ?? drawerItem.requestedPoints)],
                    ['정책 적용 점수', formatPoints(detailPolicy?.points ?? drawerItem.policyPoints)],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="px-3 py-2 font-semibold text-[#656D76] bg-[#F9FAFB] w-24 whitespace-nowrap">
                        {k}
                      </td>
                      <td className="px-3 py-2 text-[#1F2328]">{v ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Evidence information */}
            <div>
              <p className="text-[11px] font-bold text-[#656D76] mb-2">증빙 파일</p>
              <div className="min-h-24 rounded-[8px] bg-[#F3F4F6] border border-dashed border-[#D1D5DB] flex items-center justify-center text-[11px] text-[#9AA0A6] px-3">
                <div className="text-center">
                  <div className="text-[28px] mb-1">📄</div>
                  {drawerDetail?.fileGroupId != null ? (
                    <>
                      <div className="font-semibold text-[#656D76]">증빙 파일이 등록되어 있습니다.</div>
                      <div className="text-[10px] mt-0.5">파일 그룹 ID: {drawerDetail.fileGroupId}</div>
                      <div className="text-[10px] mt-1 text-[#D1D5DB]">
                        파일 미리보기·다운로드는 파일 조회 API 연결 후 제공됩니다.
                      </div>
                    </>
                  ) : (
                    <div>등록된 증빙 파일이 없습니다.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Server-side validation information */}
            <div>
              <p className="text-[11px] font-bold text-[#656D76] mb-2">심사 검증 안내</p>
              <div className="flex flex-wrap items-center gap-2">
                <Chip
                  label={drawerDetail?.fileGroupId != null ? '증빙 있음' : '증빙 없음'}
                  bg={drawerDetail?.fileGroupId != null ? '#D1FAE5' : '#FEE2E2'}
                  text={drawerDetail?.fileGroupId != null ? '#059669' : '#CF222E'}
                />
                <span className="text-[10px] text-[#656D76]">
                  승인 시 서버에서 증빙·활성 정책·기간·중복 적립 여부를 다시 확인합니다.
                </span>
              </div>
            </div>

            {isReviewable ? (
              <div>
                <p className="text-[11px] font-bold text-[#656D76] mb-2">처리 결정</p>
                <div className="flex gap-2 mb-3">
                  {[
                    { value: 'APPROVE', label: '승인', color: A },
                    { value: 'REJECT', label: '반려', color: '#CF222E' },
                  ].map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => {
                        setDecision(option.value);
                        if (option.value === 'APPROVE') setRCode('선택하세요');
                      }}
                      className="h-8 px-4 text-[12px] font-bold rounded-[6px] border-2 transition-all"
                      style={
                        decision === option.value
                          ? { background: option.color, color: '#fff', borderColor: 'transparent' }
                          : { background: '#fff', color: '#656D76', borderColor: '#E5E7EB' }
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {decision === 'REJECT' && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#656D76] mb-1">
                        반려 사유 유형
                      </label>
                      <select
                        value={rCode}
                        onChange={(event) => setRCode(event.target.value)}
                        className="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                      >
                        {REJECT_CODES.map((code) => (
                          <option key={code}>{code}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#656D76] mb-1">
                        반려 사유
                      </label>
                      <textarea
                        value={opinion}
                        onChange={(event) => setOpinion(event.target.value)}
                        rows={2}
                        placeholder="반려 사유를 입력해 주세요."
                        className="w-full px-3 py-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white resize-none focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-2 rounded-[6px] bg-[#F9FAFB] border border-[#E5E7EB] text-[11px] text-[#656D76]">
                이 신청은 이미 처리되어 추가 심사를 할 수 없습니다.
                {drawerDetail?.reviewReason && (
                  <div className="mt-1 text-[#1F2328]">처리 사유: {drawerDetail.reviewReason}</div>
                )}
              </div>
            )}

            {/* Earn preview — only when 승인 selected */}
            {isReviewable && decision === 'APPROVE' && (
              <div className="rounded-[8px] border-2 overflow-hidden" style={{ borderColor: A }}>
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: '#FFFBEB' }}
                >
                  <div className="w-1 h-4 rounded-full" style={{ background: A }} />
                  <span className="text-[11px] font-bold" style={{ color: A }}>
                    적립 결과 미리보기
                  </span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {[
                    { l: '처리유형', v: 'EARN' },
                    {
                      l: '적립 점수',
                      v: detailPolicy?.points != null
                        ? '+' + formatPoints(detailPolicy.points)
                        : '승인 시 서버 정책으로 계산',
                    },
                    {
                      l: '적용 정책',
                      v: detailPolicy
                        ? formatPeriod(detailPolicy.semesterCode) + ' / v' +
                          String(detailPolicy.versionNo ?? '-')
                        : '-',
                    },
                    {
                      l: '연계 활동',
                      v: detailActivity?.activityTypeName ?? drawerItem.type,
                    },
                    { l: '처리자', v: '현재 로그인한 교직원' },
                    { l: '처리 일시', v: '승인 시 서버 기록' },
                  ].map((f) => (
                    <div key={f.l}>
                      <p className="text-[10px] text-[#9AA0A6]">{f.l}</p>
                      <p className="text-[12px] font-black text-[#1F2328]">{f.v}</p>
                    </div>
                  ))}
                </div>
                <div
                  className="px-4 pb-3 text-[10px] leading-relaxed bg-[#FFFBEB]"
                  style={{ color: A }}
                >
                  ✓ 승인 즉시 원장에 EARN 거래가 생성됩니다. 동일 원천의 중복 적립은 시스템이
                  차단합니다.
                </div>
              </div>
            )}

            {(drawerDetail?.originalTransaction || drawerDetail?.reversalTransaction || drawerDetail?.reviewedAt) && (
              <div>
                <p className="text-[11px] font-bold text-[#656D76] mb-2">처리 이력</p>
                <div className="flex flex-col gap-1.5 text-[11px] text-[#656D76]">
                  {drawerDetail.originalTransaction && (
                    <div>
                      EARN 거래 #{drawerDetail.originalTransaction.transactionId} ·{' '}
                      {formatPoints(drawerDetail.originalTransaction.points)} ·{' '}
                      {formatDateTime(drawerDetail.originalTransaction.postedAt)}
                    </div>
                  )}
                  {drawerDetail.reversalTransaction && (
                    <div className="text-[#CF222E]">
                      CANCEL 거래 #{drawerDetail.reversalTransaction.transactionId} ·{' '}
                      {formatPoints(drawerDetail.reversalTransaction.points)} ·{' '}
                      {formatDateTime(drawerDetail.reversalTransaction.postedAt)}
                    </div>
                  )}
                  {drawerDetail.reviewedAt && (
                    <div>심사 처리일: {formatDateTime(drawerDetail.reviewedAt)}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Cancel modal */}
      <Modal
        open={!!cancelOpen}
        onClose={() => !cancelSubmitting && setCancelOpen(null)}
        title="승인 취소 (역분개)"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(null)} disabled={cancelSubmitting}>
              닫기
            </Button>
            <Button variant="danger" onClick={submitCancel} loading={cancelSubmitting}>
              취소 확정
            </Button>
          </div>
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[12px]">
            <p className="font-bold text-[#1F2328] mb-0.5">
              {cancelOpen?.name} · {cancelOpen?.type}
            </p>
            <p className="text-[#656D76]">
              기적립 점수:{' '}
              <span className="font-bold text-[#059669]">
                +{formatPoints(cancelOpen?.policyPoints ?? cancelOpen?.requestedPoints)}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              취소 사유 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="예) 증빙 허위 확인, 중복 적립 발견 등"
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none bg-white focus:outline-none"
            />
          </div>
          <div className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] text-[11px] text-[#991B1B] leading-relaxed">
            원본 신청은 수정되지 않습니다.{' '}
            <strong>
              −{formatPoints(cancelOpen?.policyPoints ?? cancelOpen?.requestedPoints)} 취소 거래(CANCEL)가 새로 생성
            </strong>
            되며 이력은 모두 보존됩니다.
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * 교직원 마일리지 관리 화면. 기준 설정·심사 접수함·장학금 기준 3개 탭으로 구성됩니다.
 */
export default function StaffMileagePage() {
  const [tab, setTab] = useState(0);
  const TABS = ['기준 설정', '심사 접수함', '장학금 기준'];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-black text-[#1F2328]">마일리지 관리</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            기준 설정 · 증빙 심사 · 장학금 기준 · 적립 취소
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB]">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`h-10 px-6 text-[13px] font-bold transition-colors border-b-2 -mb-px ${tab === i ? '' : 'border-transparent text-[#656D76] hover:text-[#1F2328]'}`}
            style={tab === i ? { color: A, borderColor: A } : {}}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <TabPolicySettings />}
      {tab === 1 && <TabReviewInbox />}
      {tab === 2 && <StaffScholarshipTab />}
    </div>
  );
}
