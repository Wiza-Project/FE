import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Button,
  CommonCodeSelect,
  DonutChart,
  Drawer,
  Modal,
  StatTile,
  StatusBadge,
  Tabs,
  toast,
} from '@/components/common';
import {
  fetchAssessmentAttendance,
  registerAssessmentRound,
  updateAssessmentRound,
} from '@/api/competency';
import { ApiError } from '@/api/client';
import { useCommonCode } from '@/hooks/useCommonCode';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// ─── Static data ──────────────────────────────────────────────────────────────

// 미응시자 개인정보 목록 조회 API가 아직 없어 목업으로 유지한다. 응시율 집계(위 도넛)는
// 실제 API로 교체됐지만 이 표의 인원수와는 별도 데이터라 서로 맞지 않을 수 있다.
const NON_RESPONDENTS = [
  {
    studentId: '20231500',
    name: '강다은',
    dept: '경영학과',
    grade: 3,
    lastLogin: '2026-06-05',
    notified: false,
  },
  {
    studentId: '20240102',
    name: '임채원',
    dept: '컴퓨터공학과',
    grade: 1,
    lastLogin: '2026-06-08',
    notified: true,
  },
  {
    studentId: '20232201',
    name: '송민준',
    dept: '산업공학과',
    grade: 2,
    lastLogin: '2026-05-30',
    notified: false,
  },
  {
    studentId: '20241300',
    name: '한소율',
    dept: '심리학과',
    grade: 1,
    lastLogin: '2026-06-09',
    notified: false,
  },
  {
    studentId: '20230912',
    name: '임수아',
    dept: '사회복지학과',
    grade: 4,
    lastLogin: '2026-05-28',
    notified: false,
  },
  {
    studentId: '20231654',
    name: '윤준호',
    dept: '경영학과',
    grade: 3,
    lastLogin: '2026-06-01',
    notified: true,
  },
  {
    studentId: '20232900',
    name: '배지수',
    dept: '컴퓨터공학과',
    grade: 2,
    lastLogin: '2026-06-07',
    notified: false,
  },
  {
    studentId: '20241122',
    name: '조민재',
    dept: '글로벌통상학과',
    grade: 1,
    lastLogin: '2026-06-09',
    notified: false,
  },
];

const COLLEGE_DATA = [
  {
    college: '공과대학',
    cnt: 312,
    c1: 68.2,
    c2: 65.1,
    c3: 70.4,
    c4: 59.3,
    c5: 72.1,
    c6: 74.8,
    avg: 68.3,
  },
  {
    college: '경영대학',
    cnt: 248,
    c1: 71.4,
    c2: 70.8,
    c3: 72.1,
    c4: 63.7,
    c5: 67.9,
    c6: 76.2,
    avg: 70.4,
  },
  {
    college: '사회과학대학',
    cnt: 198,
    c1: 73.1,
    c2: 72.5,
    c3: 74.8,
    c4: 61.2,
    c5: 64.3,
    c6: 78.1,
    avg: 70.7,
  },
  {
    college: '인문대학',
    cnt: 156,
    c1: 74.2,
    c2: 75.3,
    c3: 76.1,
    c4: 68.9,
    c5: 62.1,
    c6: 79.4,
    avg: 72.7,
  },
  {
    college: '자연과학대학',
    cnt: 112,
    c1: 66.8,
    c2: 63.4,
    c3: 68.2,
    c4: 57.1,
    c5: 74.5,
    c6: 72.3,
    avg: 67.1,
  },
  {
    college: '글로벌대학',
    cnt: 80,
    c1: 70.3,
    c2: 73.2,
    c3: 71.5,
    c4: 78.4,
    c5: 63.8,
    c6: 75.1,
    avg: 72.1,
  },
];

// ─── Tab 1: 회차 관리 ─────────────────────────────────────────────────────────

// 학년은 공통코드가 없어 고정값을 쓴다(GRADE 코드그룹 미도입).
const GRADES = [1, 2, 3, 4];
// 단과대는 학적 도메인에 단과대 계층 자체가 없어(학과 공통코드에 상위 그룹이 없음) 여전히
// 목업이다. 서버 target_condition 해석기도 colleges 키를 지원하지 않고 에러로 거부한다.
const COLLEGES = ['공과대학', '경영대학', '사회과학대학', '인문대학', '자연과학대학', '글로벌대학'];

const ASSESSMENT_TYPES = [
  { value: 'PRE', label: '사전진단' },
  { value: 'POST', label: '사후진단' },
];

// 응시기간 date input(달력)만 받고 서버는 Instant(시각)를 요구하므로 하루의 시작/끝으로 변환한다.
// 서버가 UTC Instant로 내려주므로, UTC 기준(KST 등 UTC+ 지역에서는 slice(0,10)이 전날로 밀린다)이 아니라
// 브라우저 로컬 타임존 기준 날짜로 되돌려야 입력한 날짜와 표시되는 날짜가 일치한다.
const toStartInstant = (dateStr) => new Date(`${dateStr}T00:00:00`).toISOString();
const toEndInstant = (dateStr) => new Date(`${dateStr}T23:59:59`).toISOString();
const toDateInputValue = (isoStr) => {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// majorLabel: majorCodeId → codeName 변환 함수. 모듈 레벨 순수 함수라 useCommonCode를
// 직접 쓸 수 없어, semesterLabel과 같은 패턴으로 호출하는 쪽에서 만들어 넘겨받는다.
const describeTarget = (targetCondition, majorLabel) => {
  if (!targetCondition) return '전체 재학생';
  if (targetCondition.grades?.length) return targetCondition.grades.map((g) => `${g}학년`).join(', ');
  if (targetCondition.colleges?.length) return targetCondition.colleges.join(', ');
  if (targetCondition.majorCodeIds?.length) {
    return targetCondition.majorCodeIds.map((id) => majorLabel(id)).join(', ');
  }
  return '전체 재학생';
};

function RoundManage({ rounds, setRounds }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // Drawer form
  const [fName, setFName] = useState('');
  const [fYear, setFYear] = useState('');
  const [fSem, setFSem] = useState('');
  const [fType, setFType] = useState('PRE');
  const [fStart, setFStart] = useState('');
  const [fEnd, setFEnd] = useState('');
  const [fTargetMode, setFTM] = useState('전체');
  const [fGrades, setFGrades] = useState([]);
  const [fColleges, setFColl] = useState([]);
  const [fDepts, setFDepts] = useState([]);
  const [formError, setFormError] = useState('');

  const { data: semesterCodes = [] } = useCommonCode('SEMESTER');
  const semesterLabel = (code) => semesterCodes.find((s) => s.code === code)?.codeName ?? code;

  const {
    data: majorCodes = [],
    isError: majorError,
    refetch: refetchMajors,
  } = useCommonCode('MAJOR');
  const majorLabel = (codeId) => majorCodes.find((m) => m.codeId === codeId)?.codeName ?? codeId;

  const openDrawer = () => {
    setEditTarget(null);
    setFName('');
    setFYear('');
    setFSem('');
    setFType('PRE');
    setFStart('');
    setFEnd('');
    setFTM('전체');
    setFGrades([]);
    setFColl([]);
    setFDepts([]);
    setFormError('');
    setDrawerOpen(true);
  };

  const openEdit = (r) => {
    setEditTarget(r);
    setFName(r.assessmentName);
    setFYear(String(r.academicYear));
    setFSem(r.semesterCode);
    setFType(r.assessmentType);
    setFStart(toDateInputValue(r.startsAt));
    setFEnd(toDateInputValue(r.endsAt));
    const tc = r.targetCondition;
    if (tc?.grades?.length) {
      setFTM('학년');
      setFGrades(tc.grades);
      setFColl([]);
      setFDepts([]);
    } else if (tc?.colleges?.length) {
      setFTM('단과대');
      setFColl(tc.colleges);
      setFGrades([]);
      setFDepts([]);
    } else if (tc?.majorCodeIds?.length) {
      setFTM('학과');
      setFDepts(tc.majorCodeIds);
      setFGrades([]);
      setFColl([]);
    } else {
      setFTM('전체');
      setFGrades([]);
      setFColl([]);
      setFDepts([]);
    }
    setFormError('');
    setDrawerOpen(true);
  };

  const toggleList = (list, val, set) => {
    set(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  const buildTargetCondition = () => {
    if (fTargetMode === '학년' && fGrades.length) return { grades: fGrades };
    if (fTargetMode === '단과대' && fColleges.length) return { colleges: fColleges };
    if (fTargetMode === '학과' && fDepts.length) return { majorCodeIds: fDepts };
    return null;
  };

  const handleMutationError = (e) => {
    const message = e instanceof ApiError ? e.message : '회차 저장에 실패했습니다.';
    setFormError(message);
    toast(message, 'error');
  };

  const registerMutation = useMutation({
    mutationFn: registerAssessmentRound,
    onSuccess: (created) => {
      setRounds((prev) => [created, ...prev]);
      setDrawerOpen(false);
      toast(`'${created.assessmentName}' 회차가 등록되었습니다.`, 'success');
    },
    onError: handleMutationError,
  });

  const updateMutation = useMutation({
    mutationFn: updateAssessmentRound,
    onSuccess: (updated) => {
      setRounds((prev) =>
        prev.map((r) => (r.assessmentRoundId === updated.assessmentRoundId ? updated : r)),
      );
      setDrawerOpen(false);
      toast(`'${updated.assessmentName}' 회차가 수정되었습니다.`, 'success');
    },
    onError: handleMutationError,
  });

  const isPending = registerMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    if (!fName.trim() || !fYear || !fSem || !fStart || !fEnd) {
      setFormError('필수 항목을 모두 입력해 주세요.');
      return;
    }
    const startsAt = toStartInstant(fStart);
    const endsAt = toEndInstant(fEnd);
    if (!(new Date(startsAt) < new Date(endsAt))) {
      setFormError('응시 시작일은 종료일보다 빨라야 합니다.');
      return;
    }
    setFormError('');

    const payload = {
      assessmentName: fName.trim(),
      academicYear: Number(fYear),
      semesterCode: fSem,
      assessmentType: fType,
      startsAt,
      endsAt,
      targetCondition: buildTargetCondition(),
    };

    if (editTarget) {
      updateMutation.mutate({ roundId: editTarget.assessmentRoundId, ...payload });
    } else {
      registerMutation.mutate(payload);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-black text-[#1F2328]">회차 관리</h2>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            핵심역량 진단 회차 등록 — 기본정보와 응시조건을 한 번에 저장합니다.
          </p>
        </div>
        <Button onClick={openDrawer} style={{ background: ACCENT }}>
          + 회차 등록
        </Button>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {['회차ID', '진단명', '학년도·학기', '구분', '응시기간', '대상', '상태', '관리'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 5 ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rounds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[12px] text-[#9AA0A6]">
                    등록된 회차가 없습니다. 위 버튼으로 새 회차를 등록해 주세요.
                  </td>
                </tr>
              ) : (
                rounds.map((r) => (
                  <tr
                    key={r.assessmentRoundId}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[10px] text-[#9AA0A6]">
                      {r.assessmentRoundId}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1F2328] max-w-[200px]">
                      <p className="truncate">{r.assessmentName}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#656D76]">
                      {r.academicYear}학년도 {semesterLabel(r.semesterCode)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${r.assessmentType === 'PRE' ? 'bg-[#F3F4F6] text-[#374151]' : 'bg-[#FEE2E2] text-[#CF222E]'}`}
                      >
                        {r.assessmentType === 'PRE' ? '사전' : '사후'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] whitespace-nowrap">
                      {toDateInputValue(r.startsAt)} ~ {toDateInputValue(r.endsAt)}
                    </td>
                    <td className="px-4 py-3 text-center text-[11px] text-[#656D76] whitespace-nowrap">
                      {describeTarget(r.targetCondition, majorLabel)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={r.roundStatus} variant="neutral" label="초안" size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEdit(r)}
                        className="h-5 px-2 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] hover:bg-[#F3F4F6] transition-colors"
                        style={{ color: ACCENT }}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register / Edit drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => {
          if (!isPending) setDrawerOpen(false);
        }}
        title={editTarget ? '회차 수정' : '회차 등록'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={isPending}>
              취소
            </Button>
            <Button style={{ background: ACCENT }} onClick={handleSave} loading={isPending}>
              {editTarget ? '수정 저장' : '등록'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              진단명 <span className="text-[#CF222E]">*</span>
            </label>
            <input
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              placeholder="예) 2026-2 핵심역량 사전진단"
              className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#374151] bg-white"
            />
          </div>

          {/* Year / Semester */}
          <div className="grid grid-cols-2 gap-3">
            <CommonCodeSelect
              groupCode="ACADEMIC_YEAR"
              label="학년도"
              value={fYear}
              onChange={(e) => setFYear(e.target.value)}
            />
            <CommonCodeSelect
              groupCode="SEMESTER"
              label="학기"
              value={fSem}
              onChange={(e) => setFSem(e.target.value)}
            />
          </div>

          {/* Type radio */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-2">
              구분 (사전·사후) <span className="text-[#CF222E]">*</span>
            </label>
            <div className="flex gap-3">
              {ASSESSMENT_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-[8px] border-2 cursor-pointer transition-all ${fType === t.value ? 'border-[#374151] bg-[#F3F4F6]' : 'border-[#E5E7EB] bg-white hover:border-[#9CA3AF]'}`}
                  onClick={() => setFType(t.value)}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${fType === t.value ? 'border-[#374151]' : 'border-[#D1D5DB]'}`}
                  >
                    {fType === t.value && (
                      <div className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />
                    )}
                  </div>
                  <span
                    className={`text-[13px] font-bold ${fType === t.value ? '' : 'text-[#656D76]'}`}
                    style={fType === t.value ? { color: ACCENT } : {}}
                  >
                    {t.label}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-[#9AA0A6] leading-relaxed">
              이 값은 사후에 사전·사후 비교 화면(SCR-S03)의 짝을 맞추는 기준이 됩니다.
            </p>
            {formError && (
              <div className="mt-2 p-2.5 rounded-[6px] bg-[#FEE2E2] border border-[#FECACA] text-[11px] text-[#CF222E] font-semibold">
                ⚠ {formError}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '응시 시작일', val: fStart, set: setFStart },
              { label: '응시 종료일', val: fEnd, set: setFEnd },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
                  {f.label} <span className="text-[#CF222E]">*</span>
                </label>
                <input
                  type="date"
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151]"
                />
              </div>
            ))}
          </div>

          {/* Target */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-2">대상 지정</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {['전체', '학년', '단과대', '학과'].map((m) => (
                <button
                  key={m}
                  onClick={() => setFTM(m)}
                  className={`h-7 px-3 text-[11px] font-bold rounded-full border transition-colors ${fTargetMode === m ? 'text-white border-[#374151]' : 'bg-white text-[#656D76] border-[#E5E7EB] hover:border-[#9CA3AF]'}`}
                  style={fTargetMode === m ? { background: ACCENT } : {}}
                >
                  {m}
                </button>
              ))}
            </div>

            {fTargetMode === '전체' && (
              <div className="p-3 rounded-[6px] bg-[#F3F4F6] text-[12px]" style={{ color: ACCENT }}>
                전체 재학생이 대상입니다.
              </div>
            )}
            {fTargetMode === '학년' && (
              <div className="flex gap-2 flex-wrap">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleList(fGrades, g, setFGrades)}
                    className={`h-7 px-3 text-[11px] font-bold rounded-full border transition-colors ${fGrades.includes(g) ? 'text-white border-[#374151]' : 'bg-white text-[#656D76] border-[#E5E7EB]'}`}
                    style={fGrades.includes(g) ? { background: ACCENT } : {}}
                  >
                    {g}학년
                  </button>
                ))}
              </div>
            )}
            {fTargetMode === '단과대' && (
              <div className="flex gap-2 flex-wrap">
                {COLLEGES.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleList(fColleges, c, setFColl)}
                    className={`h-7 px-3 text-[11px] font-bold rounded-full border transition-colors ${fColleges.includes(c) ? 'text-white border-[#374151]' : 'bg-white text-[#656D76] border-[#E5E7EB]'}`}
                    style={fColleges.includes(c) ? { background: ACCENT } : {}}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {fTargetMode === '학과' && (
              <div className="flex gap-2 flex-wrap">
                {majorError ? (
                  <div className="flex items-center gap-2 text-[11px] text-[#CF222E]">
                    학과 목록을 불러오지 못했습니다.
                    <button
                      onClick={() => refetchMajors()}
                      className="underline font-bold hover:opacity-80"
                    >
                      다시 시도
                    </button>
                  </div>
                ) : majorCodes.length === 0 ? (
                  <p className="text-[11px] text-[#9AA0A6]">학과 목록을 불러오는 중입니다.</p>
                ) : (
                  majorCodes.map((m) => (
                    <button
                      key={m.codeId}
                      onClick={() => toggleList(fDepts, m.codeId, setFDepts)}
                      aria-pressed={fDepts.includes(m.codeId)}
                      className={`h-7 px-3 text-[11px] font-bold rounded-full border transition-colors ${fDepts.includes(m.codeId) ? 'text-white border-[#374151]' : 'bg-white text-[#656D76] border-[#E5E7EB]'}`}
                      style={fDepts.includes(m.codeId) ? { background: ACCENT } : {}}
                    >
                      {m.codeName}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}

// ─── Tab 2: 응시 관리 ─────────────────────────────────────────────────────────

function ResponseManage({ rounds }) {
  const [roundId, setRoundId] = useState('');
  const selectedRound = rounds.find((r) => String(r.assessmentRoundId) === roundId) ?? null;

  const { data: majorCodes = [] } = useCommonCode('MAJOR');
  const majorLabel = (codeId) => majorCodes.find((m) => m.codeId === codeId)?.codeName ?? codeId;

  const {
    data: attendance,
    isLoading: attendanceLoading,
    isError: attendanceError,
    error: attendanceErrorObj,
  } = useQuery({
    queryKey: ['assessmentAttendance', roundId],
    queryFn: () => fetchAssessmentAttendance(Number(roundId)),
    enabled: !!roundId,
  });

  const targetCount = attendance?.targetCount ?? 0;
  const completedCount = attendance?.completedCount ?? 0;
  const uncompletedCount = Math.max(targetCount - completedCount, 0);
  const rateLabel = attendance ? `${Number(attendance.attendanceRate).toFixed(1)}%` : '-';

  const [notifOpen, setNotifOpen] = useState(false);
  const [channels, setChannels] = useState(['앱']);
  const [notifRows, setNotifRows] = useState(NON_RESPONDENTS);
  const [selected, setSelected] = useState(new Set());
  const [downloadInfo, setDownloadInfo] = useState(false);

  const CHANNEL_LIST = ['앱', 'SMS', '메일'];

  const toggleChannel = (c) =>
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const notifyTarget =
    selected.size > 0 ? selected.size : notifRows.filter((r) => !r.notified).length;

  const allChecked = notifRows.length > 0 && notifRows.every((r) => selected.has(r.studentId));
  const toggleAll = () =>
    allChecked ? setSelected(new Set()) : setSelected(new Set(notifRows.map((r) => r.studentId)));
  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const sendNotification = () => {
    setNotifRows((prev) =>
      prev.map((r) => (!selected.size || selected.has(r.studentId) ? { ...r, notified: true } : r)),
    );
    setSelected(new Set());
    setNotifOpen(false);
    toast(`${notifyTarget}명에게 알림을 발송했습니다.`, 'success');
  };

  const donutData = [
    { label: '응시', value: completedCount, color: ACCENT },
    { label: '미응시', value: uncompletedCount, color: '#E5E7EB' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-[16px] font-black text-[#1F2328]">응시 관리</h2>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            {selectedRound
              ? `진단 회차: ${selectedRound.assessmentName} (${describeTarget(selectedRound.targetCondition, majorLabel)})`
              : '조회할 진단 회차를 선택해 주세요.'}
          </p>
        </div>
        <select
          value={roundId}
          onChange={(e) => setRoundId(e.target.value)}
          className="h-9 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151] min-w-[220px]"
        >
          <option value="">회차 선택</option>
          {rounds.map((r) => (
            <option key={r.assessmentRoundId} value={r.assessmentRoundId}>
              {r.assessmentName}
            </option>
          ))}
        </select>
      </div>

      {!roundId && rounds.length === 0 && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-10 text-center text-[12px] text-[#9AA0A6] mb-5">
          회차 관리 탭에서 진단 회차를 먼저 등록해 주세요.
        </div>
      )}

      {roundId && attendanceError && (
        <div className="mb-5 p-3 rounded-[8px] bg-[#FEE2E2] border border-[#FECACA] text-[12px] text-[#CF222E] font-semibold">
          {attendanceErrorObj instanceof ApiError
            ? attendanceErrorObj.message
            : '응시율을 조회하지 못했습니다.'}
        </div>
      )}

      {roundId && !attendanceError && (
        <div className="mb-5">
          {/* Donut */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 flex flex-col items-center gap-3 max-w-[320px]">
            <p className="text-[12px] font-bold text-[#1F2328] self-start">전체 응시율</p>
            {attendanceLoading ? (
              <p className="py-10 text-[12px] text-[#9AA0A6]">불러오는 중...</p>
            ) : (
              <>
                {targetCount > 0 ? (
                  <DonutChart segments={donutData} size={140} centerValue={rateLabel} />
                ) : (
                  <div
                    role="status"
                    className="w-[140px] h-[140px] flex items-center justify-center text-center text-[11px] text-[#9AA0A6] rounded-full border border-dashed border-[#E5E7EB] px-3"
                  >
                    대상자가 없어 표시할 데이터가 없습니다.
                  </div>
                )}
                <div className="flex gap-6 text-[12px]">
                  <div className="text-center">
                    <div className="text-[20px] font-black" style={{ color: ACCENT }}>
                      {completedCount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-[#9AA0A6]">응시</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[20px] font-black text-[#9AA0A6]">
                      {targetCount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-[#9AA0A6]">대상</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Non-respondent table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-3 flex-wrap">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <span className="text-[13px] font-bold text-[#1F2328]">미응시자 목록</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E]">
            {notifRows.length}명
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setDownloadInfo(true)}
              className="h-7 px-3 text-[11px] font-bold rounded-[6px] border border-[#E5E7EB] text-[#656D76] hover:border-[#374151] hover:text-[#374151] transition-colors"
            >
              명단 엑셀 다운로드
            </button>
            <button
              onClick={() => setNotifOpen(true)}
              className="h-7 px-3 text-[11px] font-bold rounded-[6px] text-white transition-opacity hover:opacity-90"
              style={{ background: ACCENT }}
            >
              미응시자 알림 발송
            </button>
          </div>
        </div>

        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="accent-[#374151] w-3.5 h-3.5 cursor-pointer"
                />
              </th>
              {['학번', '성명', '학과', '학년', '최근 로그인', '알림 발송'].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 4 ? 'text-center' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notifRows.map((r) => (
              <tr
                key={r.studentId}
                className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors ${selected.has(r.studentId) ? 'bg-[#F3F4F6]' : ''}`}
              >
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(r.studentId)}
                    onChange={() => toggle(r.studentId)}
                    className="accent-[#374151] w-3.5 h-3.5 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">{r.studentId}</td>
                <td className="px-4 py-3 font-bold text-[#1F2328]">{r.name}</td>
                <td className="px-4 py-3 text-[#656D76]">{r.dept}</td>
                <td className="px-4 py-3 text-center text-[#656D76]">{r.grade}학년</td>
                <td className="px-4 py-3 text-center font-mono text-[11px] text-[#9AA0A6]">
                  {r.lastLogin}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.notified ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669]">
                      발송완료
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#9AA0A6]">
                      미발송
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notify modal */}
      <Modal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="미응시자 알림 발송"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNotifOpen(false)}>
              취소
            </Button>
            <Button style={{ background: ACCENT }} onClick={sendNotification}>
              발송
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-2">
              발송 채널 (다중 선택)
            </label>
            <div className="flex gap-2">
              {CHANNEL_LIST.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleChannel(c)}
                  className={`h-8 px-4 text-[12px] font-bold rounded-[6px] border-2 transition-colors ${channels.includes(c) ? 'text-white border-[#374151]' : 'bg-white text-[#656D76] border-[#E5E7EB]'}`}
                  style={channels.includes(c) ? { background: ACCENT } : {}}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-2">
              문구 미리보기
            </label>
            <div className="p-4 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[12px] text-[#444D56] leading-relaxed">
              <p className="font-bold text-[#1F2328] mb-1">[학생지원팀] 핵심역량진단 참여 안내</p>
              <p>
                안녕하세요. 2026-1 핵심역량 사후진단 응시 기간입니다.
                <br />
                아직 응시하지 않으셨습니다. <strong>2026-06-23까지</strong> 접속해 주세요.
                <br />
                포털 로그인 → 핵심역량진단 메뉴에서 바로 응시 가능합니다.
              </p>
            </div>
          </div>

          <div
            className="p-3 rounded-[8px] bg-[#F3F4F6] border border-[#E5E7EB] text-[12px]"
            style={{ color: ACCENT }}
          >
            발송 대상: <span className="font-black">{notifyTarget}명</span>
            {selected.size > 0 && (
              <span className="text-[#9AA0A6] ml-1">(선택 {selected.size}명)</span>
            )}
          </div>
        </div>
      </Modal>

      {/* Download info modal */}
      <Modal
        open={downloadInfo}
        onClose={() => setDownloadInfo(false)}
        title="개인정보 다운로드 안내"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDownloadInfo(false)}>
              확인
            </Button>
          </div>
        }
      >
        <div className="p-4 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed">
          개인 식별 데이터 다운로드는 별도 권한이 필요하며 다운로드 이력이 기록됩니다.
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab 3: 결과 통계 ─────────────────────────────────────────────────────────

function ResultStats() {
  const [roundSel, setRoundSel] = useState('2026-1 사후진단');
  const [collegeSel, setCollegeSel] = useState('전체');
  const [gradeSel, setGradeSel] = useState('전체');
  const [deptSel, setDeptSel] = useState('전체');
  const [queried, setQueried] = useState(true);
  const [dropOpen, setDropOpen] = useState(false);
  const [privacyInfo, setPrivacyInfo] = useState(false);
  const dropRef = useRef(null);

  const COMP_AVGS = [
    { label: '자기관리', value: 71.3 },
    { label: '의사소통', value: 68.9 },
    { label: '대인관계', value: 70.4 },
    { label: '글로벌', value: 61.5 },
    { label: '문제해결', value: 69.8 },
    { label: '직업윤리', value: 75.2 },
  ];

  const COMP_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  const COMP_LABELS = ['자기관리', '의사소통', '대인관계', '글로벌', '문제해결', '직업윤리'];

  // Find minimum value per column for heatmap
  const minPerCol = {};
  COMP_KEYS.forEach((k) => {
    minPerCol[k] = Math.min(...COLLEGE_DATA.map((r) => r[k]));
  });
  minPerCol['avg'] = Math.min(...COLLEGE_DATA.map((r) => r.avg));

  const handleDownload = (type) => {
    setDropOpen(false);
    setPrivacyInfo(true);
    toast(`'${type}' 다운로드 요청이 기록되었습니다.`, 'info');
  };

  return (
    <div>
      {/* Condition bar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-5 flex gap-3 flex-wrap items-end">
        {[
          {
            label: '회차',
            val: roundSel,
            set: setRoundSel,
            opts: ['2026-1 사후진단', '2026-1 사전진단', '2025-2 사후진단', '2025-2 사전진단'],
          },
          {
            label: '단과대',
            val: collegeSel,
            set: setCollegeSel,
            opts: [
              '전체',
              '공과대학',
              '경영대학',
              '사회과학대학',
              '인문대학',
              '자연과학대학',
              '글로벌대학',
            ],
          },
          {
            label: '학년',
            val: gradeSel,
            set: setGradeSel,
            opts: ['전체', '1학년', '2학년', '3학년', '4학년'],
          },
          {
            label: '전공',
            val: deptSel,
            set: setDeptSel,
            opts: ['전체', '컴퓨터공학과', '경영학과', '심리학과', '산업공학과'],
          },
        ].map((f) => (
          <div key={f.label} className="flex flex-col gap-1 w-44">
            <label className="text-[10px] font-semibold text-[#656D76]">{f.label}</label>
            <select
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151]"
            >
              {f.opts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
        <Button style={{ background: ACCENT }} onClick={() => setQueried(true)}>
          조회
        </Button>

        {/* Download dropdown */}
        <div className="relative ml-auto" ref={dropRef}>
          <button
            onClick={() => setDropOpen(!dropOpen)}
            className="h-8 px-4 text-[12px] font-bold rounded-[6px] border border-[#E5E7EB] text-[#656D76] hover:border-[#374151] hover:text-[#374151] transition-colors flex items-center gap-1"
          >
            결과 내려받기 <span className="text-[10px]">▾</span>
          </button>
          {dropOpen && (
            <div className="absolute right-0 top-9 z-30 bg-white rounded-[8px] border border-[#E5E7EB] shadow-lg w-52 overflow-hidden">
              {[
                { label: '원시 응답 데이터(CSV)', icon: '📄' },
                { label: '집계 결과(XLSX)', icon: '📊' },
              ].map((d) => (
                <button
                  key={d.label}
                  onClick={() => handleDownload(d.label)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[12px] text-[#1F2328] hover:bg-[#F3F4F6] transition-colors text-left border-b border-[#F3F4F6] last:border-0"
                >
                  <span>{d.icon}</span>
                  {d.label}
                </button>
              ))}
              <div className="px-4 py-2.5 text-[10px] text-[#9AA0A6] leading-snug border-t border-[#F3F4F6]">
                개인 식별 데이터 다운로드는 별도 권한이 필요하며 다운로드 이력이 기록됩니다.
              </div>
            </div>
          )}
        </div>
      </div>

      {queried && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            <StatTile
              label="응시 대상"
              value="1,537명"
              sub="2026-1 사후진단"
              accentColor={ACCENT}
            />
            <StatTile label="응시 완료" value="1,106명" sub="미응시 431명" accentColor="#059669" />
            <StatTile
              label="응시율"
              value="72.0%"
              sub="전년 동기 대비"
              accentColor="#D97706"
              trend={{ value: '-3.2%p', up: false }}
            />
            <StatTile label="평균 점수" value="66.2점" sub="100점 기준" accentColor="#374151" />
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h3 className="text-[13px] font-bold text-[#1F2328]">역량별 평균 점수 분포</h3>
              <span className="text-[11px] text-[#9AA0A6] ml-1">100점 기준</span>
            </div>
            <div className="flex justify-center overflow-x-auto">
              <BarChart data={COMP_AVGS} color={ACCENT} height={160} />
            </div>
            {/* Threshold line annotation */}
            <div className="flex justify-center mt-2">
              <div className="flex items-center gap-1.5 text-[10px] text-[#D97706]">
                <div className="w-6 border-t-2 border-dashed border-[#D97706]" />
                <span>60점 기준선 (미달 시 역량 강화 권고)</span>
              </div>
            </div>
          </div>

          {/* Heatmap table */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h3 className="text-[13px] font-bold text-[#1F2328]">단과대별 역량 점수 비교</h3>
              <span className="text-[11px] text-[#9AA0A6] ml-1">옅은 빨강 = 해당 열 최솟값</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                    <th className="px-4 py-3 text-[10px] font-semibold text-[#656D76] text-left whitespace-nowrap">
                      단과대
                    </th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-[#656D76] text-center whitespace-nowrap">
                      응시자
                    </th>
                    {COMP_LABELS.map((l) => (
                      <th
                        key={l}
                        className="px-4 py-3 text-[10px] font-semibold text-[#656D76] text-center whitespace-nowrap"
                      >
                        {l}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-[10px] font-semibold text-[#656D76] text-center whitespace-nowrap">
                      종합 평균
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COLLEGE_DATA.map((row, ri) => (
                    <tr
                      key={row.college}
                      className={`border-b border-[#F3F4F6] last:border-0 ${ri % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#F3F4F6] transition-colors`}
                    >
                      <td className="px-4 py-3 font-bold text-[#1F2328] whitespace-nowrap">
                        {row.college}
                      </td>
                      <td className="px-4 py-3 text-center text-[#656D76]">{row.cnt}</td>
                      {COMP_KEYS.map((k) => {
                        const v = row[k];
                        const isMin = v === minPerCol[k];
                        return (
                          <td
                            key={k}
                            className="px-4 py-3 text-center"
                            style={isMin ? { background: '#FEF2F2' } : {}}
                          >
                            <span
                              className={`text-[12px] font-bold ${isMin ? 'text-[#CF222E]' : ''}`}
                            >
                              {v.toFixed(1)}
                            </span>
                          </td>
                        );
                      })}
                      <td
                        className="px-4 py-3 text-center"
                        style={row.avg === minPerCol['avg'] ? { background: '#FEF2F2' } : {}}
                      >
                        <span
                          className={`text-[12px] font-black ${row.avg === minPerCol['avg'] ? 'text-[#CF222E]' : ''}`}
                          style={row.avg !== minPerCol['avg'] ? { color: ACCENT } : {}}
                        >
                          {row.avg.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer: column min */}
                <tfoot>
                  <tr className="bg-[#F6F8FA] border-t border-[#E5E7EB]">
                    <td className="px-4 py-2.5 text-[10px] font-bold text-[#656D76]">최솟값</td>
                    <td className="px-4 py-2.5 text-center text-[10px] text-[#9AA0A6]">
                      {Math.min(...COLLEGE_DATA.map((r) => r.cnt))}
                    </td>
                    {COMP_KEYS.map((k) => (
                      <td
                        key={k}
                        className="px-4 py-2.5 text-center text-[10px] font-bold text-[#CF222E]"
                      >
                        {minPerCol[k].toFixed(1)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center text-[10px] font-bold text-[#CF222E]">
                      {minPerCol['avg'].toFixed(1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Privacy modal */}
      <Modal
        open={privacyInfo}
        onClose={() => setPrivacyInfo(false)}
        title="다운로드 안내"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setPrivacyInfo(false)}>
              확인
            </Button>
          </div>
        }
      >
        <div className="p-4 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[13px] text-[#92400E] leading-relaxed">
          개인 식별 데이터 다운로드는 별도 권한이 필요하며 <strong>다운로드 이력이 기록</strong>
          됩니다.
          <br />
          권한 신청은 시스템 관리자에게 문의하세요.
        </div>
      </Modal>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DiagnosisOps() {
  const [tab, setTab] = useState('round');
  // TODO: GET /api/admin/assessment-rounds 목록 조회 API 나오면 useQuery로 교체.
  // 그 전까지는 이 세션에서 등록·수정한 회차만 보이고 새로고침하면 사라진다. 탭을 넘나들며
  // 같은 회차를 참조해야 해서(응시 관리 탭의 회차 선택) 여기서 관리한다.
  const [rounds, setRounds] = useState([]);

  const TABS = [
    { key: 'round', label: '① 회차 관리' },
    { key: 'response', label: '② 응시 관리' },
    { key: 'stats', label: '③ 결과 통계' },
  ];

  return (
    <div>
      <div className="mb-5">
        <Tabs tabs={TABS} active={tab} onChange={setTab} accentColor={ACCENT} />
      </div>

      {tab === 'round' && <RoundManage rounds={rounds} setRounds={setRounds} />}
      {tab === 'response' && <ResponseManage rounds={rounds} />}
      {tab === 'stats' && <ResultStats />}
    </div>
  );
}
