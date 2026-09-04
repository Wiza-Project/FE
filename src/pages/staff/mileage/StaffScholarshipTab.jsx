import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import {
  Button,
  EmptyState,
  Modal,
  Pagination,
  StatTile,
  toast,
} from '@/components/common';
import { useCommonCode } from '@/hooks/useCommonCode';
import { formatSemester } from '@/utils/academicPeriod';

const ACCENT = '#1F2937';
const BENEFIT_TYPE = 'SCHOLARSHIP';
const POLICY_PAGE_SIZE = 20;

const EMPTY_POLICY_PAGE = {
  content: [],
  page: 0,
  size: POLICY_PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

const INITIAL_FILTERS = {
  semesterCode: '',
  active: '',
};

const EMPTY_FORM = {
  semesterCode: 'ALL',
  benefitName: '',
  minimumPoints: '',
  benefitAmount: '',
  criteriaData: '',
  applicationStartsAt: '',
  applicationEndsAt: '',
  benefitGroupCode: '',
  cumulativeYears: '1',
  requiresExactPoints: false,
  active: true,
};

const FIELD_CLASS = 'h-9 w-full rounded-[6px] border border-[#E5E7EB] bg-white px-3 text-[12px] text-[#1F2328] focus:border-[#9CA3AF] focus:outline-none disabled:bg-[#F9FAFB]';

const POLICY_STATUS_LABELS = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
};

const formatPoints = (value) => {
  if (value == null || value === '') return '-';
  const points = Number(value);
  return Number.isFinite(points)
    ? `${points.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}점`
    : `${value}점`;
};

const formatAmount = (value) => {
  if (value == null || value === '') return '미설정';
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${amount.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`
    : String(value);
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

const formatPeriod = (semesterCode) =>
  formatSemester(semesterCode, { allLabel: '연간', emptyLabel: '연간' });

const formatApplicationPeriod = (policy) => (
  `${policy.applicationStartsAt ? formatDateTime(policy.applicationStartsAt) : '상시'} ~ ${policy.applicationEndsAt ? formatDateTime(policy.applicationEndsAt) : '마감 없음'}`
);

const formatPolicyConditions = (policy) => {
  const cumulativeYears = Number(policy.cumulativeYears ?? 1);
  const accumulationLabel = cumulativeYears >= 2 ? `${cumulativeYears}년 누적` : '단일 기준';
  const exactLabel = policy.requiresExactPoints ? '정확히 일치' : '이상 충족';
  const groupLabel = policy.benefitGroupCode ? `그룹 ${policy.benefitGroupCode}` : '배타 그룹 없음';
  return `${groupLabel} · ${accumulationLabel} · ${exactLabel}`;
};

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toInstant = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const stringifyCriteria = (criteriaData) => {
  if (criteriaData == null || criteriaData === '') return '';
  if (typeof criteriaData === 'string') return criteriaData;
  return JSON.stringify(criteriaData, null, 2);
};

const criteriaPreview = (criteriaData) => {
  if (criteriaData == null) return '미등록';
  if (typeof criteriaData !== 'object') return String(criteriaData);
  return Object.entries(criteriaData)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(', ');
};

const toPolicyForm = (policy = {}) => ({
  semesterCode: policy.semesterCode ?? 'ALL',
  benefitName: policy.benefitName ?? '',
  minimumPoints: policy.minimumPoints == null ? '' : String(policy.minimumPoints),
  benefitAmount: policy.benefitAmount == null ? '' : String(policy.benefitAmount),
  criteriaData: stringifyCriteria(policy.criteriaData),
  applicationStartsAt: toDateTimeLocal(policy.applicationStartsAt),
  applicationEndsAt: toDateTimeLocal(policy.applicationEndsAt),
  benefitGroupCode: policy.benefitGroupCode ?? '',
  cumulativeYears: policy.cumulativeYears == null ? '1' : String(policy.cumulativeYears),
  requiresExactPoints: Boolean(policy.requiresExactPoints),
  active: policy.active !== false,
});

const parseCriteria = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
};

const validateForm = (form) => {
  if (!form.benefitName.trim()) return '장학금명을 입력해 주세요.';

  if (!String(form.minimumPoints).trim()) return '최소 기준 점수를 입력해 주세요.';
  const minimumPoints = Number(form.minimumPoints);
  if (!Number.isFinite(minimumPoints) || minimumPoints < 0) {
    return '최소 기준 점수를 0 이상으로 입력해 주세요.';
  }

  if (String(form.cumulativeYears).trim()) {
    const cumulativeYears = Number(form.cumulativeYears);
    if (!Number.isInteger(cumulativeYears) || cumulativeYears < 1) {
      return '누적 기준 연수는 1 이상의 정수로 입력해 주세요.';
    }
  }

  if (form.benefitAmount !== '' && (!Number.isFinite(Number(form.benefitAmount)) || Number(form.benefitAmount) < 0)) {
    return '지급액을 0 이상으로 입력해 주세요.';
  }

  if (form.applicationStartsAt && form.applicationEndsAt) {
    const startsAt = new Date(form.applicationStartsAt);
    const endsAt = new Date(form.applicationEndsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
      return '신청 시작일은 종료일보다 빨라야 합니다.';
    }
  }

  return '';
};

const buildRegisterPayload = (form) => ({
  benefitType: BENEFIT_TYPE,
  semesterCode: form.semesterCode || 'ALL',
  benefitName: form.benefitName.trim(),
  minimumPoints: Number(form.minimumPoints),
  benefitAmount: form.benefitAmount === '' ? null : Number(form.benefitAmount),
  criteriaData: parseCriteria(form.criteriaData),
  applicationStartsAt: toInstant(form.applicationStartsAt),
  applicationEndsAt: toInstant(form.applicationEndsAt),
  benefitGroupCode: form.benefitGroupCode.trim() || null,
  cumulativeYears: form.cumulativeYears === '' ? null : Number(form.cumulativeYears),
  requiresExactPoints: Boolean(form.requiresExactPoints),
});

const buildUpdatePayload = (form) => {
  const payload = {
    benefitName: form.benefitName.trim(),
    minimumPoints: Number(form.minimumPoints),
    active: form.active,
  };

  // 백엔드 부분 수정 계약상 null은 값을 지우는 명령이 아니라 기존 값 유지입니다.
  if (form.benefitAmount !== '') payload.benefitAmount = Number(form.benefitAmount);
  if (form.criteriaData.trim()) payload.criteriaData = parseCriteria(form.criteriaData);
  if (form.applicationStartsAt) payload.applicationStartsAt = toInstant(form.applicationStartsAt);
  if (form.applicationEndsAt) payload.applicationEndsAt = toInstant(form.applicationEndsAt);

  return payload;
};

function Field({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[10px] font-semibold text-[#656D76]">{label}</span>
      {children}
    </label>
  );
}

function PolicyFormFields({ form, onChange, disabled, identityReadOnly = false }) {
  const {
    data: semesterCodes = [],
    isLoading: semesterCodesLoading,
    isError: semesterCodesError,
    refetch: refetchSemesterCodes,
  } = useCommonCode('SEMESTER');
  const semesterFormOptions = [{ code: 'ALL', codeName: '연간' }, ...semesterCodes];
  const update = (field) => (event) => onChange(field, event.target.value);
  const updateCheckbox = (field) => (event) => onChange(field, event.target.checked);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {identityReadOnly ? (
        <>
          <Field label="혜택 유형">
            <div className={`${FIELD_CLASS} flex items-center text-[#656D76]`}>{BENEFIT_TYPE}</div>
          </Field>
          <Field label="적용 학기">
            <div className={`${FIELD_CLASS} flex items-center text-[#656D76]`}>{formatPeriod(form.semesterCode)}</div>
          </Field>
        </>
      ) : (
        <>
          <Field label="적용 학기">
            <select
              value={form.semesterCode}
              onChange={update('semesterCode')}
              disabled={disabled || semesterCodesLoading}
              className={FIELD_CLASS}
            >
              {semesterFormOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.codeName}</option>
              ))}
            </select>
            {semesterCodesError && (
              <p role="alert" className="mt-1 text-[10px] text-[#CF222E]">
                학기 목록을 불러오지 못했습니다.{' '}
                <button type="button" onClick={() => refetchSemesterCodes()} className="font-bold underline">
                  다시 시도
                </button>
              </p>
            )}
          </Field>
        </>
      )}

      <Field label="혜택 그룹 코드">
        {identityReadOnly ? (
          <div className={`${FIELD_CLASS} flex items-center text-[#656D76]`}>
            {form.benefitGroupCode || '배타 그룹 없음'}
          </div>
        ) : (
          <input
            value={form.benefitGroupCode}
            onChange={update('benefitGroupCode')}
            disabled={disabled}
            placeholder="선택 입력"
            maxLength={50}
            className={FIELD_CLASS}
          />
        )}
      </Field>
      <Field label="누적 기준 연수">
        {identityReadOnly ? (
          <div className={`${FIELD_CLASS} flex items-center text-[#656D76]`}>
            {form.cumulativeYears || '1'}년
          </div>
        ) : (
          <input
            type="number"
            min="1"
            step="1"
            value={form.cumulativeYears}
            onChange={update('cumulativeYears')}
            disabled={disabled}
            className={FIELD_CLASS}
          />
        )}
      </Field>
      <Field label="정확 점수 일치">
        {identityReadOnly ? (
          <div className={`${FIELD_CLASS} flex items-center text-[#656D76]`}>
            {form.requiresExactPoints ? '정확히 일치' : '기준 이상 충족'}
          </div>
        ) : (
          <div className={`${FIELD_CLASS} flex items-center gap-2`}>
            <input
              type="checkbox"
              checked={Boolean(form.requiresExactPoints)}
              onChange={updateCheckbox('requiresExactPoints')}
              disabled={disabled}
              className="h-4 w-4 accent-[#1F2937]"
            />
            <span>최소 기준과 정확히 일치해야 함</span>
          </div>
        )}
      </Field>

      <Field label="장학금명" className={identityReadOnly ? 'md:col-span-2' : 'md:col-span-2'}>
        <input
          value={form.benefitName}
          onChange={update('benefitName')}
          disabled={disabled}
          placeholder="예) 취업지원장학"
          className={FIELD_CLASS}
        />
      </Field>
      <Field label="최소 기준 점수">
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.minimumPoints}
          onChange={update('minimumPoints')}
          disabled={disabled}
          placeholder="예) 300"
          className={FIELD_CLASS}
        />
      </Field>
      <Field label="지급액(원)">
        <input
          type="number"
          min="0"
          step="1"
          value={form.benefitAmount}
          onChange={update('benefitAmount')}
          disabled={disabled}
          placeholder="선택 입력"
          className={FIELD_CLASS}
        />
      </Field>
      <Field label="신청 시작일시">
        <input
          type="datetime-local"
          value={form.applicationStartsAt}
          onChange={update('applicationStartsAt')}
          disabled={disabled}
          className={FIELD_CLASS}
        />
      </Field>
      <Field label="신청 종료일시">
        <input
          type="datetime-local"
          value={form.applicationEndsAt}
          onChange={update('applicationEndsAt')}
          disabled={disabled}
          className={FIELD_CLASS}
        />
      </Field>
      <Field label="세부 기준" className="md:col-span-2 xl:col-span-4">
        <textarea
          value={form.criteriaData}
          onChange={update('criteriaData')}
          disabled={disabled}
          rows={4}
          spellCheck="false"
          placeholder={'예) 평점 3.5 이상, 제출서류: 성적증명서'}
          className="w-full resize-y rounded-[6px] border border-[#E5E7EB] bg-white px-3 py-2.5 font-mono text-[11px] text-[#1F2328] focus:border-[#9CA3AF] focus:outline-none disabled:bg-[#F9FAFB]"
        />
        <span className="text-[10px] text-[#9AA0A6]">선택 입력 항목입니다.</span>
      </Field>
    </div>
  );
}

/**
 * 교직원 장학금 기준 관리 탭.
 *
 * 백엔드 계약:
 * - GET /staff/mileage/benefit-policies?benefitType=SCHOLARSHIP
 * - POST /staff/mileage/benefit-policies
 * - GET /staff/mileage/benefit-policies/{benefitPolicyId}
 * - PATCH /staff/mileage/benefit-policies/{benefitPolicyId}
 */
export default function StaffScholarshipTab() {
  const { isLoading: semesterCodesLoading, isError: semesterCodesError } = useCommonCode('SEMESTER');
  const [page, setPage] = useState(1);
  const [policyPage, setPolicyPage] = useState(EMPTY_POLICY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editPolicyId, setEditPolicyId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const policies = policyPage.content ?? [];

  const loadRequestIdRef = useRef(0);
  const editRequestIdRef = useRef(0);

  const loadPolicies = useCallback(async (currentFilters, currentPage) => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const params = {
        benefitType: BENEFIT_TYPE,
        page: currentPage - 1,
        size: POLICY_PAGE_SIZE,
        sort: 'createdAt,desc',
        ...(currentFilters.semesterCode ? { semesterCode: currentFilters.semesterCode } : {}),
        ...(currentFilters.active ? { active: currentFilters.active === 'true' } : {}),
      };
      const { data } = await apiClient.get('/staff/mileage/benefit-policies', { params });
      const nextPage = Array.isArray(data)
        ? { ...EMPTY_POLICY_PAGE, content: data, totalElements: data.length, totalPages: 1 }
        : { ...EMPTY_POLICY_PAGE, ...(data ?? {}) };

      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      if (nextPage.totalPages > 0 && currentPage > nextPage.totalPages) {
        setPage(nextPage.totalPages);
        return;
      }
      setPolicyPage(nextPage);
    } catch (requestError) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setError(requestError.message ?? '장학금 정책을 불러오지 못했습니다.');
      setPolicyPage(EMPTY_POLICY_PAGE);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadPolicies(INITIAL_FILTERS, page);
  }, [loadPolicies, page]);

  const updateCreateField = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (semesterCodesLoading || semesterCodesError) {
      toast('학기 목록을 불러온 후 다시 시도해 주세요.', 'error');
      return;
    }
    const validationMessage = validateForm(createForm);
    if (validationMessage) {
      toast(validationMessage, 'error');
      return;
    }

    setCreateSaving(true);
    try {
      await apiClient.post('/staff/mileage/benefit-policies', buildRegisterPayload(createForm));
      toast('장학금 정책이 등록되었습니다.', 'success');
      setCreateForm(EMPTY_FORM);
      setPage(1);
      await loadPolicies(INITIAL_FILTERS, 1);
    } catch (requestError) {
      toast(requestError.message ?? '장학금 정책 등록에 실패했습니다.', 'error');
    } finally {
      setCreateSaving(false);
    }
  };

  const openEdit = async (policyId) => {
    const requestId = ++editRequestIdRef.current;
    setEditOpen(true);
    setEditPolicyId(policyId);
    setEditForm(null);
    setEditLoading(true);
    try {
      const { data } = await apiClient.get(`/staff/mileage/benefit-policies/${policyId}`);
      if (requestId !== editRequestIdRef.current) {
        return;
      }
      setEditForm(toPolicyForm(data));
    } catch (requestError) {
      if (requestId !== editRequestIdRef.current) {
        return;
      }
      toast(requestError.message ?? '장학금 정책 상세를 불러오지 못했습니다.', 'error');
      setEditOpen(false);
      setEditPolicyId(null);
    } finally {
      if (requestId === editRequestIdRef.current) {
        setEditLoading(false);
      }
    }
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditPolicyId(null);
    setEditForm(null);
  };

  const updateEditField = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const handleUpdate = async () => {
    if (editPolicyId == null || !editForm) return;
    const validationMessage = validateForm(editForm);
    if (validationMessage) {
      toast(validationMessage, 'error');
      return;
    }

    setEditSaving(true);
    try {
      await apiClient.patch(`/staff/mileage/benefit-policies/${editPolicyId}`, buildUpdatePayload(editForm));
      toast('장학금 정책이 수정되었습니다.', 'success');
      setEditOpen(false);
      setEditPolicyId(null);
      setEditForm(null);
      await loadPolicies(INITIAL_FILTERS, page);
    } catch (requestError) {
      toast(requestError.message ?? '장학금 정책 수정에 실패했습니다.', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const toggleActive = async (policy) => {
    const nextActive = !policy.active;
    const actionLabel = nextActive ? '활성화' : '비활성화';
    if (!window.confirm(`'${policy.benefitName}' 정책을 ${actionLabel}할까요?`)) return;

    setActionId(policy.benefitPolicyId);
    try {
      await apiClient.patch(`/staff/mileage/benefit-policies/${policy.benefitPolicyId}`, {
        active: nextActive,
      });
      toast(`장학금 정책이 ${actionLabel}되었습니다.`, 'success');
      await loadPolicies(INITIAL_FILTERS, page);
    } catch (requestError) {
      toast(requestError.message ?? `장학금 정책 ${actionLabel}에 실패했습니다.`, 'error');
    } finally {
      setActionId(null);
    }
  };

  const activeCount = policies.filter((policy) => policy.active).length;
  const policyTotalPages = Math.max(1, policyPage.totalPages ?? 1);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatTile
          label="조회 정책"
          value={`${Number(policyPage.totalElements ?? 0).toLocaleString('ko-KR')}건`}
          sub="현재 검색 조건"
          accentColor={ACCENT}
        />
        <StatTile
          label="현재 페이지 활성"
          value={`${activeCount}건`}
          sub="활성 상태 정책"
          accentColor="#059669"
        />
        <StatTile
          label="혜택 유형"
          value="장학금"
          sub="SCHOLARSHIP"
          accentColor="#2563EB"
        />
      </div>

      <form
        onSubmit={handleCreate}
        className="rounded-[8px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="h-4 w-1 rounded-full" style={{ background: ACCENT }} />
          <h3 className="text-[14px] font-bold text-[#1F2328]">장학금 기준 등록</h3>
          <span className="text-[11px] text-[#9AA0A6]">등록 즉시 학생 장학금 탭에 노출됩니다.</span>
        </div>
        <PolicyFormFields
          form={createForm}
          onChange={updateCreateField}
          disabled={createSaving}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F3F4F6] pt-4">
          <p className="text-[10px] leading-relaxed text-[#9AA0A6]">
            혜택 유형은 학생 장학금 API와 연결되는 SCHOLARSHIP으로 고정됩니다. 신청 기간을 비워 두면 상시 신청입니다.
          </p>
          <Button
            type="submit"
            loading={createSaving}
            disabled={semesterCodesLoading || semesterCodesError}
            style={{ background: ACCENT }}
          >
            정책 등록
          </Button>
        </div>
      </form>

      <section className="overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full" style={{ background: ACCENT }} />
            <h3 className="text-[14px] font-bold text-[#1F2328]">등록된 장학금 기준</h3>
          </div>
          <span className="text-[11px] text-[#9AA0A6]">총 {Number(policyPage.totalElements ?? 0).toLocaleString('ko-KR')}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F6F8FA]">
                {['정책 ID', '장학금명', '적용 학기', '최소 기준', '지급액', '신청기간', '세부 기준', '정책 조건', '상태', '관리'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-semibold text-[#656D76]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-[12px] text-[#656D76]">장학금 정책을 불러오는 중입니다.</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-[12px] text-[#CF222E]">
                    <div className="flex flex-col items-center gap-2">
                      <span>{error}</span>
                      <Button size="sm" variant="outline" onClick={() => loadPolicies(INITIAL_FILTERS, page)}>
                        다시 시도
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={10}><EmptyState message="조회된 장학금 정책이 없습니다." sub="검색 조건을 바꾸거나 새 정책을 등록해 주세요." /></td>
                </tr>
              ) : (
                policies.map((policy, index) => (
                  <tr key={policy.benefitPolicyId} className={`border-b border-[#F3F4F6] last:border-0 ${index % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}>
                    <td className="whitespace-nowrap px-3 py-3 text-center font-mono text-[10px] text-[#656D76]">#{policy.benefitPolicyId}</td>
                    <td className="px-3 py-3 text-left font-semibold text-[#1F2328]">{policy.benefitName ?? '-'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[#656D76]">{formatPeriod(policy.semesterCode)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-center font-black text-[#1F2328]">{formatPoints(policy.minimumPoints)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-center font-semibold text-[#D97706]">{formatAmount(policy.benefitAmount)}</td>
                    <td className="max-w-[260px] px-3 py-3 text-center text-[11px] text-[#656D76]">{formatApplicationPeriod(policy)}</td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-left text-[11px] text-[#656D76]" title={criteriaPreview(policy.criteriaData)}>{criteriaPreview(policy.criteriaData)}</td>
                    <td className="max-w-[240px] px-3 py-3 text-center text-[11px] text-[#656D76]">{formatPolicyConditions(policy)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${policy.active ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                        {policy.active ? POLICY_STATUS_LABELS.ACTIVE : POLICY_STATUS_LABELS.INACTIVE}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEdit(policy.benefitPolicyId)}>
                          상세·수정
                        </Button>
                        <Button
                          size="sm"
                          variant={policy.active ? 'danger' : 'secondary'}
                          onClick={() => toggleActive(policy)}
                          loading={actionId === policy.benefitPolicyId}
                        >
                          {policy.active ? '비활성화' : '활성화'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {policyPage.totalElements > 0 && (
          <div className="border-t border-[#E5E7EB] px-4 py-2">
            <Pagination
              page={page}
              totalPages={policyTotalPages}
              onChange={setPage}
              totalItems={policyPage.totalElements}
              pageSize={POLICY_PAGE_SIZE}
            />
          </div>
        )}
      </section>

      <div className="rounded-[8px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[11px] leading-relaxed text-[#656D76]">
        학생 장학금 신청 및 신청 이력은 학생 전용 API에서 처리되고, 이 탭은 백엔드가 제공하는 교직원용 장학금 정책 관리 API와 연결됩니다.
      </div>

      <Modal
        open={editOpen}
        onClose={closeEdit}
        title="장학금 정책 상세·수정"
        size="xl"
        footer={(
          <>
            <Button variant="outline" onClick={closeEdit} disabled={editSaving}>닫기</Button>
            <Button style={{ background: ACCENT }} onClick={handleUpdate} loading={editSaving} disabled={editLoading || !editForm}>
              저장
            </Button>
          </>
        )}
      >
        {editLoading || !editForm ? (
          <div className="py-10 text-center text-[12px] text-[#656D76]">장학금 정책 상세를 불러오는 중입니다.</div>
        ) : (
          <>
            <p className="mb-4 rounded-[6px] bg-[#F9FAFB] px-3 py-2 text-[11px] leading-relaxed text-[#656D76]">
              선택 입력값을 비우면 부분 수정 API의 규칙에 따라 기존 값이 유지됩니다.
            </p>
            <PolicyFormFields
              form={editForm}
              onChange={updateEditField}
              disabled={editSaving}
              identityReadOnly
            />
          </>
        )}
      </Modal>
    </div>
  );
}
