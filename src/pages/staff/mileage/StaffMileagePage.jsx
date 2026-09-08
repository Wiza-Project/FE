import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { toast } from '@/components/common';
import { useCommonCode } from '@/hooks/useCommonCode';

const A = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// ─── shared helpers ────────────────────────────────────────────────────────────

const getSemesterLabel = (semesterCodes, code, { allLabel, emptyLabel } = {}) => {
  if (!code) return emptyLabel !== undefined ? emptyLabel : code;
  if (code === 'ALL' && allLabel !== undefined) return allLabel;
  return semesterCodes.find((s) => s.code === code)?.codeName ?? code;
};
const formatPeriod = (semesterCodes, code) =>
  getSemesterLabel(semesterCodes, code, { allLabel: '연간', emptyLabel: '연간' });

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

// ─── 기준 설정 ────────────────────────────────────────────────────────────────

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
    { code: 'ALL', codeName: '연간' },
    ...semesterCodesRaw
      .filter((s) => s.code === 'SPRING' || s.code === 'FALL')
      .sort((a, b) => a.sortOrder - b.sortOrder),
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
  const policyRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  const updateCreateField = (field, value) => {
    setPForm((current) => ({ ...current, [field]: value }));
  };

  const loadPolicies = useCallback(async (currentFilter) => {
    const requestId = ++policyRequestIdRef.current;
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
      if (requestId !== policyRequestIdRef.current) return;
      setPolicies((data?.content ?? []).map(normalizePolicy));
    } catch (error) {
      if (requestId !== policyRequestIdRef.current) return;
      setPolicyError(error.message);
    } finally {
      if (requestId === policyRequestIdRef.current) {
        setLoading(false);
      }
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

    const requestId = ++detailRequestIdRef.current;
    setEditId(policyId);
    setEditForm(null);
    setDetailLoading(true);
    try {
      const { data } = await apiClient.get(`/staff/mileage/policies/${policyId}`);
      if (requestId !== detailRequestIdRef.current) return;
      setEditForm(toPolicyForm(data));
    } catch (error) {
      if (requestId !== detailRequestIdRef.current) return;
      toast(error.message, 'error');
      setEditId(null);
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setDetailLoading(false);
      }
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
              className="h-8 w-28 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#2563EB]"
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
                <div><p className="text-[10px] text-[#9AA0A6]">학기</p><p className="font-bold text-[#1F2328]">{semesterCodesLoading ? '불러오는 중...' : formatPeriod(semesterCodesRaw, editForm.semesterCode)}</p></div>
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

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * 교직원 마일리지 관리 화면. 마일리지 적립 기준(정책) 설정을 담당합니다.
 */
export default function StaffMileagePage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-black text-[#1F2328]">마일리지 관리</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            마일리지 적립 기준 설정
          </p>
        </div>
      </div>

      <TabPolicySettings />
    </div>
  );
}
