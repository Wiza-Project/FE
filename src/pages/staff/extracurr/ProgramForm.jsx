import { useRef, useState } from 'react';
import { Button, FileUpload, toast } from '@/components/common';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEMESTERS = ['2026-1', '2026-2', '2025-2', '2025-1'];

const CATEGORY_L = ['선택', '비교과 일반', '창업·혁신', '글로벌', '사회봉사'];
const CATEGORY_M = {
  '비교과 일반': ['학습역량', '진로개발', '리더십', '문화예술', '취업지원'],
  '창업·혁신': ['창업교육', '아이디어', '투자유치'],
  글로벌: ['해외연수', '문화교류', '어학'],
  사회봉사: ['국내봉사', '해외봉사', '환경'],
};
const CATEGORY_S = {
  학습역량: ['독서', '글쓰기', '수학', '과학', '토론'],
  진로개발: ['진로탐색', '직업체험', '멘토링'],
  리더십: ['캠프', '워크숍', '팀빌딩'],
  문화예술: ['공연', '전시', '체험'],
  취업지원: ['NCS', '이력서', '모의면접'],
  창업교육: ['강의', '실습'],
  아이디어: ['경진대회', '해커톤'],
  투자유치: ['피칭', 'IR'],
  해외연수: ['단기연수', '장기연수'],
  문화교류: ['워크숍', '체험'],
  어학: ['회화', '자격증'],
  국내봉사: ['환경정화', '교육봉사'],
  해외봉사: ['아시아', '아프리카'],
  환경: ['캠페인', '플로깅'],
};

const TYPE_TAGS = [
  '학습',
  '진로',
  '상담',
  '봉사',
  '리더십',
  '창업',
  '취업',
  '글로벌',
  '문화',
  '체험',
];
const CORE_COMPETENCIES = ['자기관리', '의사소통', '대인관계', '글로벌', '문제해결', '직업윤리'];
const SUB_COMPETENCIES = {
  자기관리: ['자아정체성', '자기조절', '진로설계'],
  의사소통: ['언어능력', '발표능력', '문서작성'],
  대인관계: ['협업', '리더십', '갈등관리'],
  글로벌: ['외국어', '다문화이해', '국제감각'],
  문제해결: ['비판적사고', '창의성', '정보분석'],
  직업윤리: ['책임감', '공동체의식', '성실성'],
};
const GRADES = ['1학년', '2학년', '3학년', '4학년'];

const ACCENT = '#2563EB';

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

function TextInput({ value, onChange, placeholder = '', error }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-9 px-3 text-[13px] rounded-[6px] border focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors ${error ? 'border-[#CF222E] bg-[#FFF5F5]' : 'border-[#E5E7EB] bg-white'}`}
    />
  );
}

function NumberInput({ value, onChange, min = 0, max, placeholder = '' }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      placeholder={placeholder}
      className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
    />
  );
}

function SelectInput({ value, onChange, options, error }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full h-9 px-2 text-[13px] rounded-[6px] border focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors ${error ? 'border-[#CF222E] bg-[#FFF5F5]' : 'border-[#E5E7EB] bg-white'}`}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'}`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </div>
      {label && <span className="text-[12px] text-[#444D56]">{label}</span>}
    </label>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

/**
 * 비교과 프로그램 등록/수정 폼 (5개 섹션: 기본정보/모집·정원/역량연계/수료기준·마일리지/운영계획·예산).
 *
 * @param {Object} props
 * @param {string} [props.programId] 편집 대상 ID. 있으면 수정 모드.
 * @param {() => void} props.onBack
 * @param {() => void} props.onSubmit 심사요청 후 콜백
 */
export default function ProgramForm({ programId, onBack, onSubmit }) {
  const isEdit = !!programId;

  // Section 1
  const [name, setName] = useState(isEdit ? '해외문화체험 워크숍' : '');
  const [semester, setSem] = useState('2026-1');
  const [catL, setCatL] = useState('선택');
  const [catM, setCatM] = useState('선택');
  const [catS, setCatS] = useState('선택');
  const [typeTags, setTypeTags] = useState(isEdit ? ['글로벌', '체험'] : []);
  const [online, setOnline] = useState('오프라인');
  const [place, setPlace] = useState(isEdit ? '산학협력관 대강의실' : '');

  // Section 2
  const [recruitStart, setRcS] = useState(isEdit ? '2026-08-01' : '');
  const [recruitEnd, setRcE] = useState(isEdit ? '2026-08-16' : '');
  const [operStart, setOpS] = useState(isEdit ? '2026-09-01' : '');
  const [operEnd, setOpE] = useState(isEdit ? '2026-09-07' : '');
  const [rounds, setRounds] = useState(isEdit ? 5 : '');
  const [capacity, setCapacity] = useState(isEdit ? 30 : '');
  const [applyType, setApplyType] = useState('개인');
  const [groupMin, setGroupMin] = useState(2);
  const [groupMax, setGroupMax] = useState(5);
  const [grades, setGrades] = useState([]);
  const [deptLimit, setDeptLimit] = useState('');
  const [prereq, setPrereq] = useState('');

  // Section 3
  const [compSel, setCompSel] = useState('자기관리');
  const [subSel, setSubSel] = useState((SUB_COMPETENCIES['자기관리'] ?? [])[0] ?? '');
  const [weightIn, setWeightIn] = useState(30);
  const [compRows, setCompRows] = useState(
    isEdit
      ? [
          { competency: '글로벌', sub: '국제감각', weight: 40 },
          { competency: '대인관계', sub: '협업', weight: 30 },
        ]
      : [],
  );

  // Section 4
  const [attendance, setAttendance] = useState(80);
  const [reportRequired, setReportReq] = useState(true);
  const [surveyRequired, setSurveyReq] = useState(true);
  const [mileage, setMileage] = useState(isEdit ? 50 : '');

  // Section 5
  const [budget, setBudget] = useState(isEdit ? 5000000 : '');

  // Validation state
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const sec1Ref = useRef(null);
  const sec3Ref = useRef(null);

  const toggleTag = (tag) =>
    setTypeTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  const toggleGrade = (g) =>
    setGrades((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const addCompRow = () => {
    if (!compSel || compSel === '선택' || !subSel) return;
    if (typeof weightIn !== 'number' || weightIn <= 0) return;
    const totalSoFar = compRows.reduce((s, r) => s + r.weight, 0);
    if (totalSoFar + weightIn > 100) {
      toast('가중치 합계가 100%를 초과합니다.', 'error');
      return;
    }
    setCompRows((prev) => [...prev, { competency: compSel, sub: subSel, weight: weightIn }]);
  };

  const removeCompRow = (i) => setCompRows((prev) => prev.filter((_, idx) => idx !== i));

  const totalWeight = compRows.reduce((s, r) => s + r.weight, 0);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = true;
    if (compRows.length === 0) newErrors.competency = true;
    setErrors(newErrors);

    if (newErrors.name) {
      sec1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('필수 입력 항목을 확인해 주세요.', 'error');
      return false;
    }
    if (newErrors.competency) {
      sec3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('역량 연계를 1개 이상 추가해 주세요.', 'error');
      return false;
    }
    return true;
  };

  const handleTempSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast('임시 저장되었습니다.', 'success');
    }, 600);
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast('심사 요청이 완료되었습니다. 검토 후 결과를 안내드립니다.', 'success');
      onSubmit();
    }, 800);
  };

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
          <span className="text-[11px] font-mono text-[#9AA0A6] bg-[#F3F4F6] px-2 py-0.5 rounded-[4px]">
            P001
          </span>
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
                  />
                </Field>
              </div>

              <Field label="운영학기" required>
                <SelectInput value={semester} onChange={setSem} options={SEMESTERS} />
              </Field>

              <Field label="프로그램 분류 (대·중·소)" required>
                <div className="flex gap-2">
                  <SelectInput
                    value={catL}
                    onChange={(v) => {
                      setCatL(v);
                      setCatM('선택');
                      setCatS('선택');
                    }}
                    options={CATEGORY_L}
                  />
                  <SelectInput
                    value={catM}
                    onChange={(v) => {
                      setCatM(v);
                      setCatS('선택');
                    }}
                    options={catL !== '선택' ? ['선택', ...(CATEGORY_M[catL] ?? [])] : ['선택']}
                  />
                  <SelectInput
                    value={catS}
                    onChange={setCatS}
                    options={catM !== '선택' ? ['선택', ...(CATEGORY_S[catM] ?? [])] : ['선택']}
                  />
                </div>
              </Field>

              <div className="col-span-2">
                <Field label="유형 태그 (다중 선택)">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {TYPE_TAGS.map((tag) => {
                      const active = typeTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`h-7 px-3 text-[11px] font-bold rounded-full border transition-colors ${active ? 'text-white border-[#2563EB]' : 'bg-white text-[#656D76] border-[#E5E7EB] hover:border-[#93C5FD]'}`}
                          style={active ? { background: ACCENT } : {}}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>

              <Field label="진행 방식" required>
                <div className="flex gap-2">
                  {['오프라인', '온라인', '혼합'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setOnline(m)}
                      className={`h-9 px-4 text-[12px] font-semibold rounded-[6px] border transition-colors ${online === m ? 'border-[#2563EB] text-white' : 'bg-white text-[#656D76] border-[#E5E7EB] hover:border-[#93C5FD]'}`}
                      style={online === m ? { background: ACCENT } : {}}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="장소 / URL">
                <TextInput
                  value={place}
                  onChange={setPlace}
                  placeholder={
                    online === '온라인' ? 'https://zoom.us/j/...' : '예) 산학협력관 301호'
                  }
                />
              </Field>
            </div>
          </Section>
        </div>

        {/* ── Section 2: 모집·정원 ── */}
        <Section num={2} title="모집·정원" id="sec2">
          <div className="grid grid-cols-2 gap-5">
            <Field label="모집 기간" required>
              <div className="flex items-center gap-2">
                <DateInput value={recruitStart} onChange={setRcS} />
                <span className="text-[12px] text-[#9AA0A6]">~</span>
                <DateInput value={recruitEnd} onChange={setRcE} />
              </div>
            </Field>

            <Field label="운영 기간" required>
              <div className="flex items-center gap-2">
                <DateInput value={operStart} onChange={setOpS} />
                <span className="text-[12px] text-[#9AA0A6]">~</span>
                <DateInput value={operEnd} onChange={setOpE} />
              </div>
            </Field>

            <Field label="총 회차">
              <NumberInput value={rounds} onChange={setRounds} min={1} placeholder="예) 5" />
            </Field>

            <Field label="정원" required>
              <NumberInput value={capacity} onChange={setCapacity} min={1} placeholder="예) 30" />
            </Field>

            <div className="col-span-2">
              <Field label="신청 구분" required>
                <div className="flex gap-3 items-center flex-wrap">
                  {['개인', '그룹'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setApplyType(t)}
                      className={`h-9 px-5 text-[12px] font-semibold rounded-[6px] border transition-colors ${applyType === t ? 'border-[#2563EB] text-white' : 'bg-white text-[#656D76] border-[#E5E7EB] hover:border-[#93C5FD]'}`}
                      style={applyType === t ? { background: ACCENT } : {}}
                    >
                      {t}
                    </button>
                  ))}
                  {applyType === '그룹' && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-[12px] text-[#656D76]">최소</span>
                      <div className="w-20">
                        <NumberInput value={groupMin} onChange={setGroupMin} min={2} />
                      </div>
                      <span className="text-[12px] text-[#656D76]">최대</span>
                      <div className="w-20">
                        <NumberInput value={groupMax} onChange={setGroupMax} min={2} />
                      </div>
                      <span className="text-[12px] text-[#656D76]">명</span>
                    </div>
                  )}
                </div>
              </Field>
            </div>

            <Field label="대상 학년 (다중 선택)">
              <div className="flex gap-2 mt-1">
                {GRADES.map((g) => {
                  const active = grades.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => toggleGrade(g)}
                      className={`h-7 px-3 text-[11px] font-bold rounded-full border transition-colors ${active ? 'text-white border-[#2563EB]' : 'bg-white text-[#656D76] border-[#E5E7EB] hover:border-[#93C5FD]'}`}
                      style={active ? { background: ACCENT } : {}}
                    >
                      {g}
                    </button>
                  );
                })}
                {grades.length === 0 && (
                  <span className="text-[11px] text-[#9AA0A6] self-center">선택 없음 = 전체</span>
                )}
              </div>
            </Field>

            <Field label="대상 학과 (쉼표 구분)">
              <TextInput
                value={deptLimit}
                onChange={setDeptLimit}
                placeholder="예) 컴퓨터공학과, 경영학과 (비워두면 전체)"
              />
            </Field>

            <div className="col-span-2">
              <Field label="선수 요건">
                <TextInput
                  value={prereq}
                  onChange={setPrereq}
                  placeholder="예) 비교과 마일리지 100점 이상"
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* ── Section 3: 역량 연계 ── */}
        <div ref={sec3Ref}>
          <Section num={3} title="역량 연계" id="sec3">
            <div
              className={`p-4 rounded-[8px] mb-5 border ${errors.competency ? 'bg-[#FFF5F5] border-[#FECACA]' : 'bg-[#EFF6FF] border-[#BFDBFE]'}`}
            >
              <p
                className={`text-[12px] font-semibold ${errors.competency ? 'text-[#CF222E]' : 'text-[#1D4ED8]'}`}
              >
                핵심역량 연계를 <strong>최소 1개 이상</strong> 추가해야 저장할 수 있습니다. 가중치
                합계는 100% 이하여야 합니다.
              </p>
            </div>

            {/* Add row */}
            <div className="flex gap-3 items-end mb-5 flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-semibold text-[#656D76] mb-1.5">
                  핵심역량
                </label>
                <SelectInput
                  value={compSel}
                  onChange={(v) => {
                    setCompSel(v);
                    setSubSel((SUB_COMPETENCIES[v] ?? [])[0] ?? '');
                  }}
                  options={CORE_COMPETENCIES}
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-semibold text-[#656D76] mb-1.5">
                  하위역량
                </label>
                <SelectInput
                  value={subSel}
                  onChange={setSubSel}
                  options={SUB_COMPETENCIES[compSel] ?? []}
                />
              </div>
              <div className="w-28">
                <label className="block text-[10px] font-semibold text-[#656D76] mb-1.5">
                  가중치(%)
                </label>
                <NumberInput
                  value={weightIn}
                  onChange={setWeightIn}
                  min={1}
                  max={100}
                  placeholder="30"
                />
              </div>
              <Button onClick={addCompRow} style={{ background: ACCENT }} size="sm">
                + 추가
              </Button>
            </div>

            {/* Rows table */}
            {compRows.length > 0 ? (
              <div className="rounded-[8px] border border-[#E5E7EB] overflow-hidden">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                      {['핵심역량', '하위역량', '가중치(%)', ''].map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-2.5 text-[10px] font-semibold text-[#656D76] ${h === '' ? 'w-10' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compRows.map((r, i) => (
                      <tr key={i} className="border-b border-[#F3F4F6] last:border-0">
                        <td className="px-4 py-3">
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ background: ACCENT }}
                          >
                            {r.competency}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#444D56]">{r.sub}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full bg-[#E5E7EB] w-24 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${r.weight}%`, background: ACCENT }}
                              />
                            </div>
                            <span className="font-bold text-[#1F2328]">{r.weight}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeCompRow(i)}
                            className="text-[#9AA0A6] hover:text-[#CF222E] text-[14px] transition-colors"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#F6F8FA]">
                      <td
                        colSpan={2}
                        className="px-4 py-2 text-[11px] font-semibold text-[#656D76]"
                      >
                        합계
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-[12px] font-black ${totalWeight > 100 ? 'text-[#CF222E]' : totalWeight === 100 ? 'text-[#059669]' : 'text-[#1F2328]'}`}
                        >
                          {totalWeight}%
                          {totalWeight > 100 ? ' (초과!)' : totalWeight === 100 ? ' ✓' : ''}
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-[8px] border border-dashed border-[#D1D5DB] py-8 text-center text-[12px] text-[#9AA0A6]">
                역량을 추가하세요.
              </div>
            )}
          </Section>
        </div>

        {/* ── Section 4: 수료 기준·마일리지 ── */}
        <Section num={4} title="수료 기준·마일리지" id="sec4">
          <div className="grid grid-cols-2 gap-5">
            <Field label="이수 출석률 기준 (%)">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={attendance || 80}
                  onChange={(e) => setAttendance(Number(e.target.value))}
                  className="flex-1 accent-[#2563EB]"
                />
                <div className="w-20">
                  <NumberInput value={attendance} onChange={setAttendance} min={0} max={100} />
                </div>
                <span className="text-[12px] text-[#656D76]">%</span>
              </div>
            </Field>

            <Field label="적립 마일리지 (점)">
              <NumberInput value={mileage} onChange={setMileage} min={0} placeholder="예) 50" />
            </Field>

            <Field label="결과보고서 필수">
              <Toggle
                checked={reportRequired}
                onChange={setReportReq}
                label={reportRequired ? '필수' : '선택'}
              />
            </Field>

            <Field label="만족도 설문 필수">
              <Toggle
                checked={surveyRequired}
                onChange={setSurveyReq}
                label={surveyRequired ? '필수' : '선택'}
              />
            </Field>
          </div>
        </Section>

        {/* ── Section 5: 운영계획·예산 ── */}
        <Section num={5} title="운영계획·예산" id="sec5">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <Field label="운영계획서 첨부">
                <FileUpload
                  accept=".pdf,.hwp,.doc,.docx"
                  onFiles={(files) => {
                    if (files.length > 0) toast(`'${files[0].name}' 첨부됨`, 'success');
                  }}
                />
              </Field>
            </div>
            <Field label="총 예산 (원)">
              <NumberInput value={budget} onChange={setBudget} min={0} placeholder="예) 5000000" />
            </Field>
            <div className="flex items-end pb-0.5">
              {typeof budget === 'number' && budget > 0 && (
                <p className="text-[12px] text-[#9AA0A6]">
                  ≈{' '}
                  <span className="font-bold text-[#1F2328]">
                    {budget.toLocaleString('ko-KR')}원
                  </span>
                </p>
              )}
            </div>
          </div>
        </Section>
      </div>

      {/* ── Fixed bottom action bar ── */}
      {/* PortalShell 사이드바(240px)를 가리지 않도록 left-[240px]로 오프셋 (DiagnosisHistory의 고정 바와 동일한 처리) */}
      <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-[#E5E7EB] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] z-40">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between">
          <p className="text-[11px] text-[#9AA0A6]">
            역량 연계: <span className="font-bold text-[#1F2328]">{compRows.length}개</span>
            {compRows.length > 0 && (
              <span className="ml-2">
                가중치 합계{' '}
                <span className={`font-bold ${totalWeight > 100 ? 'text-[#CF222E]' : ''}`}>
                  {totalWeight}%
                </span>
              </span>
            )}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onBack}>
              취소
            </Button>
            <Button variant="outline" loading={saving} onClick={handleTempSave}>
              임시 저장
            </Button>
            <Button loading={saving} onClick={handleSubmit} style={{ background: ACCENT }}>
              심사 요청
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
