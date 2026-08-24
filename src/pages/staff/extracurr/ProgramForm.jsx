import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, FileUpload, StatusBadge, toast } from '@/components/common';
import {
  createProgram,
  fetchCompetencyOptions,
  fetchProgramDetailAdmin,
  updateProgram,
} from '@/api/programs';
import { ApiError } from '@/api/client';
import { useCommonCode } from '@/hooks/useCommonCode';
import { MILEAGE_POLICY_OPTIONS } from '@/data/programOptions';
import { formatDate } from '@/utils/date';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ num, title, id, children }) {
  return (
    <div
      id={id}
      className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center gap-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
          style={{ background: ACCENT }}
        >
          {num}
        </div>
        <h2 className="text-[14px] font-bold text-[#1F2328]">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
        {label} {required && <span className="text-[#CF222E]">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-[#CF222E] mt-1">필수 입력 항목입니다.</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder = '', error, maxLength }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className={`w-full h-9 px-3 text-[13px] rounded-[6px] border focus:outline-none focus:ring-2 focus:ring-[#374151]/30 focus:border-[#374151] transition-colors ${error ? 'border-[#CF222E] bg-[#FFF5F5]' : 'border-[#E5E7EB] bg-white'}`}
    />
  );
}

function TextArea({ value, onChange, placeholder = '', rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#374151]/30 focus:border-[#374151]"
    />
  );
}

function NumberInput({ value, onChange, min = 0, max, placeholder = '', error }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      placeholder={placeholder}
      className={`w-full h-9 px-3 text-[13px] rounded-[6px] border focus:outline-none focus:ring-2 focus:ring-[#374151]/30 focus:border-[#374151] transition-colors ${error ? 'border-[#CF222E] bg-[#FFF5F5]' : 'border-[#E5E7EB] bg-white'}`}
    />
  );
}

/** 백엔드 FK(operatingUnitCodeId 등)를 받는 select. options는 {id, label}[] 형태. */
function IdSelect({ value, onChange, options, placeholder = '선택하세요', error, disabled }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full h-9 px-2 text-[13px] rounded-[6px] border focus:outline-none focus:ring-2 focus:ring-[#374151]/30 focus:border-[#374151] transition-colors disabled:bg-[#F3F4F6] disabled:text-[#9AA0A6] disabled:cursor-not-allowed ${error ? 'border-[#CF222E] bg-[#FFF5F5]' : 'border-[#E5E7EB] bg-white'}`}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function DateInput({ value, onChange, error }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 px-3 text-[13px] rounded-[6px] border focus:outline-none focus:ring-2 focus:ring-[#374151]/30 focus:border-[#374151] transition-colors ${error ? 'border-[#CF222E] bg-[#FFF5F5]' : 'border-[#E5E7EB] bg-white'}`}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** 'YYYY-MM-DD' → 자정 기준 UTC ISO 문자열(Instant). 4개 날짜를 모두 같은 기준으로 변환해야
 * 백엔드의 "모집종료 ≤ 운영시작" 규칙이 같은 날짜 입력에서도 자연스럽게 성립한다. */
function toInstant(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00Z`).toISOString();
}

function getDetailErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  if (error.code === 'A004') return '이 프로그램에 접근할 권한이 없습니다.';
  if (error.code === 'P001') return '요청한 프로그램을 찾을 수 없습니다.';
  return error.message || '프로그램 정보를 불러오지 못했습니다.';
}

function getEditErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  if (error.code === 'A004') return '이 프로그램을 수정할 권한이 없습니다.';
  if (error.code === 'P009') return error.message || '모집이 종료된 프로그램은 수정할 수 없습니다.';
  return error.message || '수정 중 오류가 발생했습니다.';
}

// ─── Main form ────────────────────────────────────────────────────────────────

/**
 * 비교과 프로그램 등록/수정 폼. ProgramRegisterRequestDTO/ProgramUpdateRequestDTO(백엔드)에
 * 맞춘 4개 섹션으로 구성: 기본정보 / 모집·운영·정원 / 역량·정책 / 첨부.
 * 수정 모드는 GET /admin/programs/{id}로 상세를 받아와 프리필한 뒤 PUT으로 저장한다.
 * 운영단위(operatingUnitCodeId)는 로그인한 담당자의 소속 부서로 고정되는 값이라
 * 수정 폼에는 입력란을 두지 않는다 — 요청에 생략하면 백엔드가 기존 값을 그대로 유지한다.
 *
 * @param {Object} props
 * @param {number} [props.programId] 편집 대상 ID. 있으면 수정 모드.
 * @param {() => void} props.onBack
 * @param {() => void} props.onSubmit 등록/수정 완료 후 콜백
 */
export default function ProgramForm({ programId, onBack, onSubmit }) {
  const isEdit = !!programId;

  // Section 1 — 기본정보
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [operatingUnitCodeId, setOperatingUnitCodeId] = useState('');
  const [programTypeCodeId, setProgramTypeCodeId] = useState('');

  // Section 2 — 모집·운영·정원
  const [recruitStart, setRcS] = useState('');
  const [recruitEnd, setRcE] = useState('');
  const [operStart, setOpS] = useState('');
  const [operEnd, setOpE] = useState('');
  const [capacity, setCapacity] = useState('');

  // Section 3 — 역량·정책
  const [competencyId, setCompetencyId] = useState('');
  const [mileagePolicyId, setMileagePolicyId] = useState('');
  const [completionRate, setCompletionRate] = useState(80);

  // Validation / submit state
  const [errors, setErrors] = useState({});
  const [prefilled, setPrefilled] = useState(false);

  const sec1Ref = useRef(null);
  const sec2Ref = useRef(null);
  const sec3Ref = useRef(null);

  const {
    data: detailData,
    isLoading: detailLoading,
    isError: detailErrored,
    error: detailError,
  } = useQuery({
    queryKey: ['adminProgramDetail', programId],
    queryFn: () => fetchProgramDetailAdmin(programId),
    enabled: isEdit,
  });

  const {
    data: competencyData,
    isLoading: competencyLoading,
    isError: competencyErrored,
  } = useQuery({
    queryKey: ['competencyOptions'],
    queryFn: fetchCompetencyOptions,
  });
  const competencyOptions = (competencyData ?? []).map((c) => ({
    id: c.competencyId,
    label: c.competencyName,
  }));
  const competencyPlaceholder = competencyLoading
    ? '불러오는 중…'
    : competencyErrored
      ? '목록을 불러오지 못했습니다'
      : '선택하세요';

  const { data: operatingUnitCodes = [] } = useCommonCode(isEdit ? undefined : 'DEPARTMENT');
  const operatingUnitOptions = operatingUnitCodes.map((c) => ({
    id: c.codeId,
    label: c.codeName,
  }));
  const { data: programTypeCodes = [] } = useCommonCode('PROGRAM_TYPE');
  const programTypeOptions = programTypeCodes.map((c) => ({ id: c.codeId, label: c.codeName }));

  // 수정 모드 프리필: 상세조회 + 역량/분류 옵션 목록이 모두 준비되면 한 번만 채운다
  // (역량·분류는 상세 응답이 라벨만 주므로 옵션 목록에서 이름이 일치하는 id로 역매핑한다).
  useEffect(() => {
    if (!isEdit || prefilled || !detailData) return;
    if (competencyOptions.length === 0 || programTypeOptions.length === 0) return;

    setName(detailData.programName ?? '');
    setDescription(detailData.description ?? '');
    setRcS(formatDate(detailData.recruitmentStartsAt));
    setRcE(formatDate(detailData.recruitmentEndsAt));
    setOpS(formatDate(detailData.operationStartsAt));
    setOpE(formatDate(detailData.operationEndsAt));
    setCapacity(detailData.capacity ?? '');
    setCompletionRate(
      detailData.completionRate != null ? Number(detailData.completionRate) : 80,
    );
    setMileagePolicyId(
      detailData.mileagePolicyId != null ? String(detailData.mileagePolicyId) : '',
    );

    const competencyMatch = competencyOptions.find((o) => o.label === detailData.competencyName);
    if (competencyMatch) setCompetencyId(String(competencyMatch.id));

    const programTypeMatch = programTypeOptions.find(
      (o) => o.label === detailData.programTypeCodeName,
    );
    if (programTypeMatch) setProgramTypeCodeId(String(programTypeMatch.id));

    setPrefilled(true);
  }, [isEdit, prefilled, detailData, competencyOptions, programTypeOptions]);

  const registerMutation = useMutation({
    mutationFn: createProgram,
    onSuccess: (data) => {
      toast(`'${data.programName}' 프로그램이 등록되었습니다.`, 'success');
      onSubmit();
    },
    onError: (err) => {
      toast(err.message ?? '등록에 실패했습니다.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateProgram(programId, payload),
    onSuccess: () => {
      toast('수정 내용이 저장되었습니다.', 'success');
      onSubmit();
    },
    onError: (err) => {
      toast(getEditErrorMessage(err), 'error');
    },
  });

  const validatePeriodRule = () => {
    if (recruitStart && recruitEnd && recruitStart >= recruitEnd) {
      return '모집 시작일은 모집 종료일보다 빨라야 합니다.';
    }
    if (operStart && operEnd && operStart >= operEnd) {
      return '운영 시작일은 운영 종료일보다 빨라야 합니다.';
    }
    if (recruitEnd && operStart && recruitEnd > operStart) {
      return '모집 종료일은 운영 시작일보다 늦을 수 없습니다.';
    }
    return null;
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = true;
    if (!recruitStart) newErrors.recruitStart = true;
    if (!recruitEnd) newErrors.recruitEnd = true;
    if (!operStart) newErrors.operStart = true;
    if (!operEnd) newErrors.operEnd = true;
    if (!capacity || Number(capacity) <= 0) newErrors.capacity = true;
    if (!competencyId) newErrors.competencyId = true;
    // programTypeCodeId는 등록 시엔 생략하면 백엔드가 기본값을 채워주지만, 수정 API는 필수값이다.
    if (isEdit && !programTypeCodeId) newErrors.programTypeCodeId = true;
    setErrors(newErrors);

    if (newErrors.name) {
      sec1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('필수 입력 항목을 확인해 주세요.', 'error');
      return false;
    }
    if (
      newErrors.recruitStart ||
      newErrors.recruitEnd ||
      newErrors.operStart ||
      newErrors.operEnd ||
      newErrors.capacity
    ) {
      sec2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('모집·운영 기간과 정원을 확인해 주세요.', 'error');
      return false;
    }
    if (newErrors.programTypeCodeId) {
      sec1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('프로그램 분류를 선택해 주세요.', 'error');
      return false;
    }
    if (newErrors.competencyId) {
      sec3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('연계 핵심역량을 선택해 주세요.', 'error');
      return false;
    }

    const periodError = validatePeriodRule();
    if (periodError) {
      sec2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(periodError, 'error');
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    // 실제 첨부 업로드 API가 아직 없어 이번엔 항상 생략 (백엔드에서 optional)
    fileGroupId: null,
    operatingUnitCodeId: operatingUnitCodeId ? Number(operatingUnitCodeId) : null,
    programTypeCodeId: programTypeCodeId ? Number(programTypeCodeId) : null,
    competencyId: Number(competencyId),
    mileagePolicyId: mileagePolicyId ? Number(mileagePolicyId) : null,
    programName: name.trim(),
    description: description.trim() || null,
    recruitmentStartsAt: toInstant(recruitStart),
    recruitmentEndsAt: toInstant(recruitEnd),
    operationStartsAt: toInstant(operStart),
    operationEndsAt: toInstant(operEnd),
    capacity: Number(capacity),
    completionRate,
  });

  const handleRegister = () => {
    if (!validate()) return;
    registerMutation.mutate(buildPayload());
  };

  const handleEditSave = () => {
    if (!validate()) return;
    updateMutation.mutate(buildPayload());
  };

  // 수정 모드: 상세조회가 끝나고 옵션 목록까지 프리필됐을 때만 폼을 보여준다.
  if (isEdit && (detailLoading || !prefilled) && !detailErrored) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[12px] text-[#9AA0A6] hover:text-[#1F2328] transition-colors"
          >
            ← 목록
          </button>
          <div className="h-4 w-px bg-[#E5E7EB]" />
          <h1 className="text-[20px] font-black text-[#1F2328]">프로그램 수정</h1>
        </div>
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-10 text-center text-[13px] text-[#9AA0A6]">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (isEdit && detailErrored) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[12px] text-[#9AA0A6] hover:text-[#1F2328] transition-colors"
          >
            ← 목록
          </button>
          <div className="h-4 w-px bg-[#E5E7EB]" />
          <h1 className="text-[20px] font-black text-[#1F2328]">프로그램 수정</h1>
        </div>
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-10 text-center">
          <p className="text-[14px] font-bold text-[#1F2328] mb-2">
            {getDetailErrorMessage(detailError)}
          </p>
          <Button variant="outline" onClick={onBack}>
            목록으로
          </Button>
        </div>
      </div>
    );
  }

  const saving = isEdit ? updateMutation.isPending : registerMutation.isPending;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-[#9AA0A6] hover:text-[#1F2328] transition-colors"
        >
          ← 목록
        </button>
        <div className="h-4 w-px bg-[#E5E7EB]" />
        <h1 className="text-[20px] font-black text-[#1F2328]">
          {isEdit ? '프로그램 수정' : '프로그램 등록'}
        </h1>
        {isEdit && (
          <>
            <span className="text-[11px] font-mono text-[#9AA0A6] bg-[#F3F4F6] px-2 py-0.5 rounded-[4px]">
              #{programId}
            </span>
            {detailData?.programStatusLabel && (
              <StatusBadge status={detailData.programStatusLabel} size="sm" />
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-5 pb-24">
        {/* ── Section 1: 기본정보 ── */}
        <div ref={sec1Ref}>
          <Section num={1} title="기본정보" id="sec1">
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <Field label="프로그램명" required error={errors.name}>
                  <TextInput
                    value={name}
                    onChange={setName}
                    placeholder="예) 2026-1 해외문화체험 워크숍"
                    error={errors.name}
                    maxLength={200}
                  />
                </Field>
              </div>

              <div className="col-span-2">
                <Field label="설명">
                  <TextArea
                    value={description}
                    onChange={setDescription}
                    placeholder="프로그램에 대한 설명을 입력하세요."
                  />
                </Field>
              </div>

              {!isEdit && (
                <Field label="운영단위">
                  <IdSelect
                    value={operatingUnitCodeId}
                    onChange={setOperatingUnitCodeId}
                    options={operatingUnitOptions}
                    placeholder="선택 안함 (서버 기본값 사용)"
                  />
                </Field>
              )}

              <Field label="프로그램분류" required={isEdit} error={errors.programTypeCodeId}>
                <IdSelect
                  value={programTypeCodeId}
                  onChange={setProgramTypeCodeId}
                  options={programTypeOptions}
                  placeholder={isEdit ? '선택하세요' : '선택 안함 (서버 기본값 사용)'}
                  error={errors.programTypeCodeId}
                />
              </Field>
            </div>
          </Section>
        </div>

        {/* ── Section 2: 모집·운영·정원 ── */}
        <div ref={sec2Ref}>
          <Section num={2} title="모집·운영·정원" id="sec2">
            <div className="grid grid-cols-2 gap-5">
              <Field label="모집 기간" required>
                <div className="flex items-center gap-2">
                  <DateInput value={recruitStart} onChange={setRcS} error={errors.recruitStart} />
                  <span className="text-[12px] text-[#9AA0A6]">~</span>
                  <DateInput value={recruitEnd} onChange={setRcE} error={errors.recruitEnd} />
                </div>
              </Field>

              <Field label="운영 기간" required>
                <div className="flex items-center gap-2">
                  <DateInput value={operStart} onChange={setOpS} error={errors.operStart} />
                  <span className="text-[12px] text-[#9AA0A6]">~</span>
                  <DateInput value={operEnd} onChange={setOpE} error={errors.operEnd} />
                </div>
              </Field>

              <Field label="정원" required error={errors.capacity}>
                <NumberInput
                  value={capacity}
                  onChange={setCapacity}
                  min={1}
                  placeholder="예) 30"
                  error={errors.capacity}
                />
              </Field>
            </div>
          </Section>
        </div>

        {/* ── Section 3: 역량·정책 ── */}
        <div ref={sec3Ref}>
          <Section num={3} title="역량·정책" id="sec3">
            <div className="grid grid-cols-2 gap-5">
              <Field label="연계 핵심역량" required error={errors.competencyId}>
                <IdSelect
                  value={competencyId}
                  onChange={setCompetencyId}
                  options={competencyOptions}
                  placeholder={competencyPlaceholder}
                  disabled={competencyLoading || competencyErrored}
                  error={errors.competencyId}
                />
              </Field>

              <Field label="마일리지 정책">
                <IdSelect
                  value={mileagePolicyId}
                  onChange={setMileagePolicyId}
                  options={MILEAGE_POLICY_OPTIONS}
                  placeholder="선택 안함"
                />
              </Field>

              <div className="col-span-2">
                <Field label="이수 출석률 기준 (%)">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={completionRate}
                      onChange={(e) => setCompletionRate(Number(e.target.value))}
                      className="flex-1 accent-[#374151]"
                    />
                    <div className="w-20">
                      <NumberInput value={completionRate} onChange={setCompletionRate} min={0} max={100} />
                    </div>
                    <span className="text-[12px] text-[#656D76]">%</span>
                  </div>
                </Field>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Section 4: 첨부 ── */}
        <Section num={4} title="첨부" id="sec4">
          <Field label="운영계획서 첨부 (선택)">
            <FileUpload
              accept=".pdf,.hwp,.doc,.docx"
              onFiles={(files) => {
                if (files.length > 0) toast(`'${files[0].name}' 첨부됨`, 'success');
              }}
            />
            <p className="text-[10px] text-[#9AA0A6] mt-1.5">
              {isEdit
                ? '실제 파일 업로드 연동 전이라 여기서 새로 올려도 저장되지 않으며, 기존에 첨부된 파일이 있다면 그대로 유지됩니다.'
                : '실제 파일 업로드 연동 전이라 등록 시 서버에는 전송되지 않습니다.'}
            </p>
          </Field>
        </Section>
      </div>

      {/* ── Fixed bottom action bar ── */}
      {/* PortalShell 사이드바(240px)를 가리지 않도록 left-[240px]로 오프셋 (DiagnosisHistory의 고정 바와 동일한 처리) */}
      <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-[#E5E7EB] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] z-40">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onBack}>
            취소
          </Button>
          <Button
            loading={saving}
            onClick={isEdit ? handleEditSave : handleRegister}
            style={{ background: ACCENT }}
          >
            {isEdit ? '수정 저장' : '등록'}
          </Button>
        </div>
      </div>
    </div>
  );
}
