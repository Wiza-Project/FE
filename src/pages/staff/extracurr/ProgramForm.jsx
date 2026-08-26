import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, FileUpload, StatusBadge, Tabs, toast } from '@/components/common';
import {
  createProgram,
  fetchCompetencyOptions,
  fetchProgramDetailAdmin,
  updateProgram,
  uploadProgramOperationPlan,
} from '@/api/programs';
import { ApiError } from '@/api/client';
import { useCommonCode } from '@/hooks/useCommonCode';
import { MILEAGE_POLICY_OPTIONS } from '@/data/programOptions';
import { formatDate } from '@/utils/date';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ num, title, children }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
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

function Field({ label, required, error, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
        {label} {required && <span className="text-[#CF222E]">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-[#CF222E] mt-1">필수 입력 항목입니다.</p>}
    </div>
  );
}

function TextInput({ id, value, onChange, placeholder = '', error, maxLength }) {
  return (
    <input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className={`w-full h-9 px-3 text-[13px] rounded-[6px] border focus:outline-none focus:ring-2 focus:ring-[#374151]/30 focus:border-[#374151] transition-colors ${error ? 'border-[#CF222E] bg-[#FFF5F5]' : 'border-[#E5E7EB] bg-white'}`}
    />
  );
}

function TextArea({ id, value, onChange, placeholder = '', rows = 3 }) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#374151]/30 focus:border-[#374151]"
    />
  );
}

function NumberInput({ id, value, onChange, min = 0, max, placeholder = '', error }) {
  return (
    <input
      id={id}
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
function IdSelect({ id, value, onChange, options, placeholder = '선택하세요', error, disabled }) {
  return (
    <select
      id={id}
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

function DateInput({ id, value, onChange, error, ariaLabel }) {
  return (
    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={`h-9 px-3 text-[13px] rounded-[6px] border focus:outline-none focus:ring-2 focus:ring-[#374151]/30 focus:border-[#374151] transition-colors ${error ? 'border-[#CF222E] bg-[#FFF5F5]' : 'border-[#E5E7EB] bg-white'}`}
    />
  );
}

// ─── 회차(세션) 카드 ──────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {number} props.index 0-based 배열 위치. 표시 라벨("n회차")과 sessionNo는 여기서 파생된다.
 * @param {{localId: string|number, sessionName: string, startsAt: string, endsAt: string, location: string}} props.session
 * @param {(patch: Object) => void} props.onChange
 * @param {() => void} props.onRemove
 * @param {boolean} props.removable
 * @param {boolean} [props.startsAtError]
 * @param {boolean} [props.endsAtError]
 */
function SessionCard({ index, session, onChange, onRemove, removable, startsAtError, endsAtError }) {
  return (
    <div className="border border-[#E5E7EB] rounded-[8px] p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-[#1F2328]">{index + 1}회차</h3>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] font-semibold text-[#CF222E] hover:underline"
          >
            삭제
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="회차명" htmlFor={`session-${session.localId}-name`}>
            <TextInput
              id={`session-${session.localId}-name`}
              value={session.sessionName}
              onChange={(v) => onChange({ sessionName: v })}
              placeholder="예) 1주차 오리엔테이션"
              maxLength={200}
            />
          </Field>
        </div>
        <Field label="시작 ~ 종료" required>
          <div className="flex items-center gap-2">
            <DateInput
              value={session.startsAt}
              onChange={(v) => onChange({ startsAt: v })}
              ariaLabel={`${index + 1}회차 시작일`}
              error={startsAtError}
            />
            <span className="text-[12px] text-[#9AA0A6]">~</span>
            <DateInput
              value={session.endsAt}
              onChange={(v) => onChange({ endsAt: v })}
              ariaLabel={`${index + 1}회차 종료일`}
              error={endsAtError}
            />
          </div>
        </Field>
        <Field label="장소" htmlFor={`session-${session.localId}-location`}>
          <TextInput
            id={`session-${session.localId}-location`}
            value={session.location}
            onChange={(v) => onChange({ location: v })}
            placeholder="예) 학생회관 3층 세미나실"
            maxLength={300}
          />
        </Field>
      </div>
    </div>
  );
}

function emptySession(localId) {
  return { localId, sessionName: '', startsAt: '', endsAt: '', location: '' };
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

// Bean Validation이 필드경로 그대로("sessions[0].startsAt: 널이어서는 안됩니다") 내려주는
// 케이스를 위한 안전망. 클라이언트 검증(validate())으로 대부분 걸러지지만, 미처 모르는
// 회차 필드 요구사항이 더 있을 경우를 대비한다.
function isSessionFieldValidationError(message) {
  return typeof message === 'string' && message.includes('sessions[');
}

function getRegisterErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  if (error.code === 'A004') return '프로그램을 등록할 권한이 없습니다.';
  if (isSessionFieldValidationError(error.message)) {
    return '회차 정보를 다시 확인해 주세요. 시작일과 종료일이 비어있지 않은지 확인해 주세요.';
  }
  return error.message || '등록 중 오류가 발생했습니다.';
}

function getEditErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  if (error.code === 'A004') return '이 프로그램을 수정할 권한이 없습니다.';
  if (error.code === 'P009') return error.message || '모집이 종료된 프로그램은 수정할 수 없습니다.';
  if (isSessionFieldValidationError(error.message)) {
    return '회차 정보를 다시 확인해 주세요. 시작일과 종료일이 비어있지 않은지 확인해 주세요.';
  }
  return error.message || '수정 중 오류가 발생했습니다.';
}

const TABS = [
  { key: 'basic', label: '① 기본정보' },
  { key: 'schedule', label: '② 모집·운영·정원' },
  { key: 'sessions', label: '③ 회차 관리' },
  { key: 'policy', label: '④ 역량·정책' },
  { key: 'attachment', label: '⑤ 첨부' },
];

// ─── Main form ────────────────────────────────────────────────────────────────

/**
 * 비교과 프로그램 등록/수정 폼. ProgramRegisterRequestDTO/ProgramUpdateRequestDTO(백엔드)에
 * 맞춘 5개 탭으로 구성: 기본정보 / 모집·운영·정원 / 회차 관리 / 역량·정책 / 첨부.
 * 수정 모드는 GET /admin/programs/{id}로 상세를 받아와 프리필한 뒤 PUT으로 저장한다.
 * 회차(장소 포함)는 등록/수정 요청 바디의 `sessions` 배열로 함께 전송되며, 최소 1개가
 * 없거나 카드의 시작/종료일이 비어있으면 저장을 막고 토스트로 안내한다(백엔드는 회차가
 * 아예 없을 때 P022(PROGRAM_SESSION_REQUIRED)로 거부하며, 이 경우도 동일하게 토스트 처리).
 *
 * @param {Object} props
 * @param {number} [props.programId] 편집 대상 ID. 있으면 수정 모드.
 * @param {() => void} props.onBack
 * @param {() => void} props.onSubmit 등록/수정 완료 후 콜백
 */
export default function ProgramForm({ programId, onBack, onSubmit }) {
  const isEdit = !!programId;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('basic');

  // 기본정보
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [programTypeCodeId, setProgramTypeCodeId] = useState('');
  const [operatingUnitCodeId, setOperatingUnitCodeId] = useState('');

  // 모집·운영·정원
  const [recruitStart, setRcS] = useState('');
  const [recruitEnd, setRcE] = useState('');
  const [operStart, setOpS] = useState('');
  const [operEnd, setOpE] = useState('');
  const [capacity, setCapacity] = useState('');

  // 회차 관리 — 등록 모드는 항상 1회차 카드로 시작(최소 1개 규칙과 일치)
  const [sessions, setSessions] = useState(() => (isEdit ? [] : [emptySession('new-1')]));
  // 시작/종료일이 비어있는 카드의 localId — SessionCard에 빨간 테두리로 표시하기 위함
  const [sessionFieldErrors, setSessionFieldErrors] = useState(new Set());

  // 역량·정책
  const [competencyId, setCompetencyId] = useState('');
  const [mileagePolicyId, setMileagePolicyId] = useState('');
  const [completionRate, setCompletionRate] = useState(80);

  // Validation / submit state
  const [errors, setErrors] = useState({});
  const [prefilled, setPrefilled] = useState(false);
  const [fileGroupId, setFileGroupId] = useState(null);

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

  const {
    data: programTypeCodes = [],
    isLoading: programTypeLoading,
    isError: programTypeErrored,
  } = useCommonCode('PROGRAM_TYPE');
  const programTypeOptions = programTypeCodes.map((c) => ({ id: c.codeId, label: c.codeName }));

  const {
    data: departmentCodes = [],
    isLoading: departmentLoading,
    isError: departmentErrored,
  } = useCommonCode('DEPARTMENT');
  const departmentOptions = departmentCodes.map((c) => ({ id: c.codeId, label: c.codeName }));

  // 수정 모드 프리필에 필요한 옵션 조회가 실패했거나(에러) 로딩이 끝났는데도 비어 있으면,
  // prefilled가 영원히 false로 남아 로딩 화면에 갇히므로 별도 상태로 구분해 재시도 UI를 보여준다.
  const optionsUnavailable =
    competencyErrored ||
    programTypeErrored ||
    departmentErrored ||
    (!competencyLoading &&
      !programTypeLoading &&
      !departmentLoading &&
      (competencyOptions.length === 0 ||
        programTypeOptions.length === 0 ||
        departmentOptions.length === 0));

  // 수정 모드 프리필: 상세조회 + 역량/분류/부서 옵션 목록이 모두 준비되면 한 번만 채운다
  // (역량·분류·부서는 상세 응답이 라벨만 주므로 옵션 목록에서 이름이 일치하는 id로 역매핑한다).
  useEffect(() => {
    if (!isEdit || prefilled || !detailData) return;
    if (
      competencyOptions.length === 0 ||
      programTypeOptions.length === 0 ||
      departmentOptions.length === 0
    )
      return;

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
    if (competencyMatch) {
      setCompetencyId(String(competencyMatch.id));
    } else if (detailData.competencyName) {
      toast(
        `기존 핵심역량('${detailData.competencyName}')을 목록에서 찾지 못했습니다. 다시 선택해 주세요.`,
        'error',
      );
    }

    const programTypeMatch = programTypeOptions.find(
      (o) => o.label === detailData.programTypeCodeName,
    );
    if (programTypeMatch) {
      setProgramTypeCodeId(String(programTypeMatch.id));
    } else if (detailData.programTypeCodeName) {
      toast(
        `기존 프로그램분류('${detailData.programTypeCodeName}')를 목록에서 찾지 못했습니다. 다시 선택해 주세요.`,
        'error',
      );
    }

    const departmentMatch = departmentOptions.find(
      (o) => o.label === detailData.operatingUnitCodeName,
    );
    if (departmentMatch) {
      setOperatingUnitCodeId(String(departmentMatch.id));
    } else if (detailData.operatingUnitCodeName) {
      toast(
        `기존 운영부서('${detailData.operatingUnitCodeName}')를 목록에서 찾지 못했습니다. 다시 선택해 주세요.`,
        'error',
      );
    }

    // 기존 회차가 없는 프로그램(과거 이력)도 화면은 항상 최소 1장으로 시작한다.
    const existingSessions = Array.isArray(detailData.sessions) ? detailData.sessions : [];
    setSessions(
      existingSessions.length > 0
        ? existingSessions.map((s, i) => ({
            localId: s.programSessionId ?? `existing-${i}`,
            sessionName: s.sessionName ?? '',
            startsAt: formatDate(s.startsAt),
            endsAt: formatDate(s.endsAt),
            location: s.location ?? '',
          }))
        : [emptySession('new-1')],
    );

    setPrefilled(true);
  }, [isEdit, prefilled, detailData, competencyOptions, programTypeOptions, departmentOptions]);

  const handleSubmitError = (err) => {
    if (err instanceof ApiError && err.code === 'P022') {
      setActiveTab('sessions');
      toast('최소 1회차는 입력해야합니다.', 'error');
      return;
    }
    toast(isEdit ? getEditErrorMessage(err) : getRegisterErrorMessage(err), 'error');
  };

  const registerMutation = useMutation({
    mutationFn: createProgram,
    onSuccess: (data) => {
      toast(`'${data.programName}' 프로그램이 등록되었습니다.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['adminPrograms'] });
      onSubmit();
    },
    onError: handleSubmitError,
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateProgram(programId, payload),
    onSuccess: () => {
      toast('수정 내용이 저장되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminPrograms'] });
      onSubmit();
    },
    onError: handleSubmitError,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadProgramOperationPlan,
    onSuccess: (data) => {
      setFileGroupId(data.fileGroupId);
      toast('운영계획서가 업로드되었습니다.', 'success');
    },
    onError: (err) => {
      toast(err.message ?? '운영계획서 업로드에 실패했습니다.', 'error');
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
    if (!programTypeCodeId) newErrors.programTypeCodeId = true;
    if (!operatingUnitCodeId) newErrors.operatingUnitCodeId = true;
    if (!recruitStart) newErrors.recruitStart = true;
    if (!recruitEnd) newErrors.recruitEnd = true;
    if (!operStart) newErrors.operStart = true;
    if (!operEnd) newErrors.operEnd = true;
    if (!capacity || Number(capacity) <= 0) newErrors.capacity = true;
    if (!competencyId) newErrors.competencyId = true;
    setErrors(newErrors);

    if (newErrors.name) {
      setActiveTab('basic');
      toast('필수 입력 항목을 확인해 주세요.', 'error');
      return false;
    }
    if (newErrors.programTypeCodeId || newErrors.operatingUnitCodeId) {
      setActiveTab('basic');
      toast('프로그램 분류와 운영부서를 선택해 주세요.', 'error');
      return false;
    }
    if (
      newErrors.recruitStart ||
      newErrors.recruitEnd ||
      newErrors.operStart ||
      newErrors.operEnd ||
      newErrors.capacity
    ) {
      setActiveTab('schedule');
      toast('모집·운영 기간과 정원을 확인해 주세요.', 'error');
      return false;
    }
    if (sessions.length === 0) {
      setActiveTab('sessions');
      toast('최소 1회차는 입력해야합니다.', 'error');
      return false;
    }
    const invalidSessions = sessions.filter((s) => !s.startsAt || !s.endsAt);
    if (invalidSessions.length > 0) {
      setSessionFieldErrors(new Set(invalidSessions.map((s) => s.localId)));
      setActiveTab('sessions');
      toast('최소 1회차는 등록해야합니다', 'error');
      return false;
    }
    setSessionFieldErrors(new Set());
    if (newErrors.competencyId) {
      setActiveTab('policy');
      toast('연계 핵심역량을 선택해 주세요.', 'error');
      return false;
    }

    const periodError = validatePeriodRule();
    if (periodError) {
      setActiveTab('schedule');
      toast(periodError, 'error');
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    // 새로 업로드한 파일이 있으면 그 fileGroupId를 보낸다.
    // 수정 모드에서 파일을 바꾸지 않았다면 키 자체를 생략해 백엔드가 기존 첨부(file_group_id)를 그대로 유지하도록 한다.
    ...(isEdit ? (fileGroupId != null ? { fileGroupId } : {}) : { fileGroupId }),
    operatingUnitCodeId: Number(operatingUnitCodeId),
    programTypeCodeId: Number(programTypeCodeId),
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
    sessions: sessions.map((s, i) => ({
      sessionNo: i + 1,
      sessionName: s.sessionName.trim() || null,
      startsAt: toInstant(s.startsAt),
      endsAt: toInstant(s.endsAt),
      location: s.location.trim() || null,
    })),
  });

  const handleRegister = () => {
    if (!validate()) return;
    registerMutation.mutate(buildPayload());
  };

  const handleEditSave = () => {
    if (!validate()) return;
    updateMutation.mutate(buildPayload());
  };

  const updateSession = (localId, patch) => {
    setSessions((prev) => prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s)));
  };

  const addSession = () => {
    setSessions((prev) => [...prev, emptySession(`new-${Date.now()}`)]);
  };

  const removeSession = (localId) => {
    setSessions((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.localId !== localId)));
  };

  // 수정 모드: 상세조회가 끝나고 옵션 목록까지 프리필됐을 때만 폼을 보여준다.
  if (isEdit && (detailLoading || (!prefilled && !optionsUnavailable)) && !detailErrored) {
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

  if (isEdit && (detailErrored || (!prefilled && optionsUnavailable))) {
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
            {detailErrored
              ? getDetailErrorMessage(detailError)
              : '옵션 목록을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'}
          </p>
          <Button variant="outline" onClick={onBack}>
            목록으로
          </Button>
        </div>
      </div>
    );
  }

  const saving =
    (isEdit ? updateMutation.isPending : registerMutation.isPending) || uploadMutation.isPending;

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

      <div className="mb-5">
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} accentColor={ACCENT} />
      </div>

      <div className="pb-24">
        {activeTab === 'basic' && (
          <Section num={1} title="기본정보">
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <Field label="프로그램명" required error={errors.name} htmlFor="programName">
                  <TextInput
                    id="programName"
                    value={name}
                    onChange={setName}
                    placeholder="예) 2026-1 해외문화체험 워크숍"
                    error={errors.name}
                    maxLength={200}
                  />
                </Field>
              </div>

              <div className="col-span-2">
                <Field label="설명" htmlFor="description">
                  <TextArea
                    id="description"
                    value={description}
                    onChange={setDescription}
                    placeholder="프로그램에 대한 설명을 입력하세요."
                  />
                </Field>
              </div>

              <Field
                label="프로그램분류"
                required
                error={errors.programTypeCodeId}
                htmlFor="programTypeCodeId"
              >
                <IdSelect
                  id="programTypeCodeId"
                  value={programTypeCodeId}
                  onChange={setProgramTypeCodeId}
                  options={programTypeOptions}
                  placeholder="선택하세요"
                  disabled={programTypeLoading || programTypeErrored}
                  error={errors.programTypeCodeId}
                />
              </Field>

              <Field
                label="운영부서"
                required
                error={errors.operatingUnitCodeId}
                htmlFor="operatingUnitCodeId"
              >
                <IdSelect
                  id="operatingUnitCodeId"
                  value={operatingUnitCodeId}
                  onChange={setOperatingUnitCodeId}
                  options={departmentOptions}
                  placeholder="선택하세요"
                  disabled={departmentLoading || departmentErrored}
                  error={errors.operatingUnitCodeId}
                />
              </Field>
            </div>
          </Section>
        )}

        {activeTab === 'schedule' && (
          <Section num={2} title="모집·운영·정원">
            <div className="grid grid-cols-2 gap-5">
              <Field label="모집 기간" required>
                <div className="flex items-center gap-2">
                  <DateInput
                    value={recruitStart}
                    onChange={setRcS}
                    error={errors.recruitStart}
                    ariaLabel="모집 시작일"
                  />
                  <span className="text-[12px] text-[#9AA0A6]">~</span>
                  <DateInput
                    value={recruitEnd}
                    onChange={setRcE}
                    error={errors.recruitEnd}
                    ariaLabel="모집 종료일"
                  />
                </div>
              </Field>

              <Field label="운영 기간" required>
                <div className="flex items-center gap-2">
                  <DateInput
                    value={operStart}
                    onChange={setOpS}
                    error={errors.operStart}
                    ariaLabel="운영 시작일"
                  />
                  <span className="text-[12px] text-[#9AA0A6]">~</span>
                  <DateInput
                    value={operEnd}
                    onChange={setOpE}
                    error={errors.operEnd}
                    ariaLabel="운영 종료일"
                  />
                </div>
              </Field>

              <Field label="정원" required error={errors.capacity} htmlFor="capacity">
                <NumberInput
                  id="capacity"
                  value={capacity}
                  onChange={setCapacity}
                  min={1}
                  placeholder="예) 30"
                  error={errors.capacity}
                />
              </Field>
            </div>
          </Section>
        )}

        {activeTab === 'sessions' && (
          <Section num={3} title="회차 관리">
            <div className="flex flex-col gap-4">
              {sessions.map((s, i) => (
                <SessionCard
                  key={s.localId}
                  index={i}
                  session={s}
                  onChange={(patch) => updateSession(s.localId, patch)}
                  onRemove={() => removeSession(s.localId)}
                  removable={sessions.length > 1}
                  startsAtError={sessionFieldErrors.has(s.localId) && !s.startsAt}
                  endsAtError={sessionFieldErrors.has(s.localId) && !s.endsAt}
                />
              ))}
              <button
                type="button"
                onClick={addSession}
                className="h-9 px-4 self-start text-[12px] font-bold rounded-[6px] border border-dashed border-[#9AA0A6] text-[#656D76] hover:border-[#374151] hover:text-[#1F2328] transition-colors"
              >
                + 회차 추가
              </button>
            </div>
          </Section>
        )}

        {activeTab === 'policy' && (
          <Section num={4} title="역량·정책">
            <div className="grid grid-cols-2 gap-5">
              <Field label="연계 핵심역량" required error={errors.competencyId} htmlFor="competencyId">
                <IdSelect
                  id="competencyId"
                  value={competencyId}
                  onChange={setCompetencyId}
                  options={competencyOptions}
                  placeholder={competencyPlaceholder}
                  disabled={competencyLoading || competencyErrored}
                  error={errors.competencyId}
                />
              </Field>

              <Field label="마일리지 정책" htmlFor="mileagePolicyId">
                <IdSelect
                  id="mileagePolicyId"
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
        )}

        {activeTab === 'attachment' && (
          <Section num={5} title="첨부">
            <Field label="운영계획서 첨부 (선택)">
              <FileUpload
                accept=".pdf"
                onFiles={(files) => {
                  if (files.length > 0) uploadMutation.mutate(files[0]);
                }}
              />
              {uploadMutation.isPending ? (
                <p className="text-[11px] text-[#2563EB] mt-1.5">업로드 중…</p>
              ) : (
                isEdit && (
                  <p className="text-[10px] text-[#9AA0A6] mt-1.5">
                    새 파일을 첨부하지 않으면 기존에 첨부된 파일이 그대로 유지됩니다.
                  </p>
                )
              )}
            </Field>
          </Section>
        )}
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
