import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Button,
  CommonCodeSelect,
  DonutChart,
  Drawer,
  EmptyState,
  Modal,
  Pagination,
  SkeletonLoader,
  StatTile,
  StatusBadge,
  Tabs,
  toast,
} from '@/components/common';
import {
  fetchAssessmentAttendance,
  fetchAssessmentDistribution,
  fetchAssessmentNonParticipants,
  notifyAssessmentNonParticipants,
  registerAssessmentRound,
  updateAssessmentRound,
} from '@/api/competency';
import { ApiError } from '@/api/client';
import { useCommonCode } from '@/hooks/useCommonCode';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// ─── Static data ──────────────────────────────────────────────────────────────

const NON_PARTICIPANT_PAGE_SIZE = 10;

// ─── Tab 1: 회차 관리 ─────────────────────────────────────────────────────────

// 학년은 공통코드가 없어 고정값을 쓴다(GRADE 코드그룹 미도입).
const GRADES = [1, 2, 3, 4];

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
  const [fDepts, setFDepts] = useState([]);
  const [formError, setFormError] = useState('');

  const { data: semesterCodes = [] } = useCommonCode('SEMESTER');
  const semesterLabel = (code) => semesterCodes.find((s) => s.code === code)?.codeName ?? code;

  const {
    data: majorCodes = [],
    isLoading: majorLoading,
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
      setFDepts([]);
    } else if (tc?.majorCodeIds?.length) {
      setFTM('학과');
      setFDepts(tc.majorCodeIds);
      setFGrades([]);
    } else {
      setFTM('전체');
      setFGrades([]);
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
              {['전체', '학년', '학과'].map((m) => (
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
            {fTargetMode === '학과' && (
              <div className="flex gap-2 flex-wrap">
                {majorLoading ? (
                  <p className="text-[11px] text-[#9AA0A6]">학과 목록을 불러오는 중입니다.</p>
                ) : majorError ? (
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
                  <p className="text-[11px] text-[#9AA0A6]">등록된 학과가 없습니다.</p>
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
  // 발송 완료 여부는 서버가 확정해 준 sentUserIds만 신뢰한다 — 클라이언트가 페이지별로
  // 추정하면 페이지를 넘나들 때나 "전체 발송"(userIds: null) 이후 실제와 어긋날 수 있다.
  const [notified, setNotified] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [downloadInfo, setDownloadInfo] = useState(false);

  const [page, setPage] = useState(1);
  // 회차를 바꾸면 이전 회차에서 선택·발송 처리한 userId가 새 회차 명단과 무관해지므로 같이 비운다.
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
    setNotified(new Set());
  }, [roundId]);
  // 페이지를 넘기면 화면에 없는 userId가 선택 상태로 남을 수 있어(체크박스는 안 보이지만
  // "선택 N명" 카운트엔 남음) 비운다. notifyTarget 자체는 selected가 비면 전체 발송으로
  // 처리되므로 이 초기화와 무관하게 항상 정확하다.
  useEffect(() => {
    setSelected(new Set());
  }, [page]);

  const {
    data: nonParticipants,
    isLoading: nonParticipantsLoading,
    isError: nonParticipantsError,
    error: nonParticipantsErrorObj,
  } = useQuery({
    queryKey: ['assessmentNonParticipants', roundId, page],
    queryFn: () =>
      fetchAssessmentNonParticipants(Number(roundId), {
        page: page - 1,
        size: NON_PARTICIPANT_PAGE_SIZE,
      }),
    enabled: !!roundId,
  });

  const nonParticipantRows = nonParticipants?.content ?? [];
  const nonParticipantTotal = nonParticipants?.totalElements ?? 0;

  // 선택 없이 발송하면 이 회차의 전체 미응시자(nonParticipantTotal)가 대상이다 — 현재
  // 페이지(최대 10명)만 대상으로 착각하지 않도록, 선택이 없을 때는 페이지 카운트가 아니라
  // 전체 미응시자 수를 보여준다.
  const notifyTarget = selected.size > 0 ? selected.size : nonParticipantTotal;

  const allChecked =
    nonParticipantRows.length > 0 && nonParticipantRows.every((r) => selected.has(r.userId));
  const toggleAll = () =>
    allChecked
      ? setSelected(new Set())
      : setSelected(new Set(nonParticipantRows.map((r) => r.userId)));
  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const notifyMutation = useMutation({
    mutationFn: () =>
      notifyAssessmentNonParticipants(Number(roundId), selected.size ? Array.from(selected) : null),
    onSuccess: (result) => {
      setNotified((prev) => new Set([...prev, ...result.sentUserIds]));
      setSelected(new Set());
      setNotifOpen(false);
      const failMessage = result.failedCount > 0 ? ` (실패 ${result.failedCount}건)` : '';
      toast(`${result.sentUserIds.length}명에게 알림을 발송했습니다.${failMessage}`, 'success');
    },
    onError: (e) => {
      toast(e instanceof ApiError ? e.message : '알림 발송에 실패했습니다.', 'error');
    },
  });

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
          aria-label="진단 회차 선택"
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
          {roundId && !nonParticipantsLoading && !nonParticipantsError && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E]">
              {nonParticipantTotal.toLocaleString()}명
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setDownloadInfo(true)}
              className="h-7 px-3 text-[11px] font-bold rounded-[6px] border border-[#E5E7EB] text-[#656D76] hover:border-[#374151] hover:text-[#374151] transition-colors"
            >
              명단 엑셀 다운로드
            </button>
            <button
              onClick={() => setNotifOpen(true)}
              disabled={nonParticipantTotal === 0}
              className="h-7 px-3 text-[11px] font-bold rounded-[6px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: ACCENT }}
            >
              미응시자 알림 발송
            </button>
          </div>
        </div>

        {!roundId ? (
          <EmptyState message="조회할 진단 회차를 선택해 주세요." />
        ) : nonParticipantsLoading ? (
          <SkeletonLoader rows={NON_PARTICIPANT_PAGE_SIZE} cols={6} />
        ) : nonParticipantsError ? (
          <div className="p-5 text-[12px] text-[#CF222E] font-semibold">
            {nonParticipantsErrorObj instanceof ApiError
              ? nonParticipantsErrorObj.message
              : '미응시자 목록을 조회하지 못했습니다.'}
          </div>
        ) : nonParticipantRows.length === 0 ? (
          <EmptyState message="미응시자가 없습니다." sub="모든 대상자가 응시를 완료했습니다." />
        ) : (
          <>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      aria-label="현재 페이지 미응시자 전체 선택"
                      className="accent-[#374151] w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  {['학번', '성명', '학과', '학년', '연락처', '알림 발송'].map((h, i) => (
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
                {nonParticipantRows.map((r) => (
                  <tr
                    key={r.userId}
                    className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors ${selected.has(r.userId) ? 'bg-[#F3F4F6]' : ''}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(r.userId)}
                        onChange={() => toggle(r.userId)}
                        aria-label={`${r.name} (${r.studentId}) 선택`}
                        className="accent-[#374151] w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                      {r.studentId}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1F2328]">{r.name}</td>
                    <td className="px-4 py-3 text-[#656D76]">{r.majorName ?? '-'}</td>
                    <td className="px-4 py-3 text-center text-[#656D76]">
                      {r.grade != null ? `${r.grade}학년` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-[11px] text-[#9AA0A6]">
                      {r.phone ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {notified.has(r.userId) ? (
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
            <div className="px-5 py-3 border-t border-[#E5E7EB]">
              <Pagination
                page={page}
                totalPages={nonParticipants.totalPages}
                onChange={setPage}
                totalItems={nonParticipantTotal}
                pageSize={NON_PARTICIPANT_PAGE_SIZE}
              />
            </div>
          </>
        )}
      </div>

      {/* Notify modal */}
      <Modal
        open={notifOpen}
        onClose={() => {
          if (!notifyMutation.isPending) setNotifOpen(false);
        }}
        title="미응시자 알림 발송"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setNotifOpen(false)}
              disabled={notifyMutation.isPending}
            >
              취소
            </Button>
            <Button
              style={{ background: ACCENT }}
              onClick={() => notifyMutation.mutate()}
              loading={notifyMutation.isPending}
            >
              발송
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-2.5 rounded-[6px] bg-[#F3F4F6] text-[11px] text-[#656D76]">
            현재는 인앱(앱) 알림만 발송됩니다. SMS·메일 연동은 아직 준비되지 않았습니다.
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-2">
              문구 미리보기 <span className="text-[#9AA0A6] font-normal">(실제 발송 문구와 다를 수 있음)</span>
            </label>
            <div className="p-4 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[12px] text-[#444D56] leading-relaxed">
              <p className="font-bold text-[#1F2328] mb-1">[학생지원팀] 핵심역량진단 참여 안내</p>
              <p>
                안녕하세요. {selectedRound?.assessmentName ?? '핵심역량 진단'} 응시 기간입니다.
                <br />
                아직 응시하지 않으셨습니다.{' '}
                {selectedRound?.endsAt && (
                  <strong>{toDateInputValue(selectedRound.endsAt)}까지</strong>
                )}{' '}
                접속해 주세요.
                <br />
                포털 로그인 → 핵심역량진단 메뉴에서 바로 응시 가능합니다.
              </p>
            </div>
          </div>

          <div
            className="p-3 rounded-[8px] bg-[#F3F4F6] border border-[#E5E7EB] text-[12px]"
            style={{ color: ACCENT }}
          >
            발송 대상: <span className="font-black">{notifyTarget.toLocaleString()}명</span>
            {selected.size === 0 && (
              <span className="text-[#9AA0A6] ml-1">(선택 없음 — 전체 미응시자)</span>
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

const GROUP_AXES = [
  { value: 'GRADE', label: '학년별' },
  { value: 'MAJOR', label: '전공별' },
];

// 집단이 많은 경우(전공) 색이 순환하므로 범례를 함께 표시한다. 교직원 포털이 무채색
// 기조라 색상 대신 명도 차이로 집단을 구분한다.
const GROUP_COLORS = ['#1F2937', '#6B7280', '#A7AEB8', '#4B5563', '#8A929C', '#374151'];

// 집단(학년/전공)별로 쪼개져 내려온 평균을 역량별 분포 그래프용으로 역량 축에 다시 모은다.
// 역량 전체 평균은 집단 평균을 응답자 수로 가중해 합산한다(집단 크기가 제각각이라 단순 평균은 왜곡됨).
// 축 순서는 결과 방사형 차트와 맞추기 위해 displayOrder로 정렬한다.
function aggregateByCompetency(groups) {
  const acc = new Map();
  groups.forEach((g) => {
    (g.competencyAverages ?? []).forEach((c) => {
      const prev = acc.get(c.competencyId) ?? {
        competencyName: c.competencyName,
        displayOrder: c.displayOrder,
        weightedSum: 0,
        weight: 0,
      };
      prev.weightedSum += Number(c.averageScore) * g.respondentCount;
      prev.weight += g.respondentCount;
      acc.set(c.competencyId, prev);
    });
  });
  return [...acc.values()]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((c) => ({
      label: c.competencyName,
      value: c.weight > 0 ? Math.round((c.weightedSum / c.weight) * 10) / 10 : 0,
    }));
}

// 집단별 비교 그래프용. groups를 그대로 쓰되, x축이 될 역량 축을 모든 집단에 걸친 합집합에서
// displayOrder 순으로 뽑고(결과 방사형 차트와 동일 순서), 각 집단을 그 역량 축에 맞춘 series로 만든다.
function buildGroupCompare(groups) {
  const compMap = new Map();
  groups.forEach((g) =>
    (g.competencyAverages ?? []).forEach((c) => {
      if (!compMap.has(c.competencyId)) {
        compMap.set(c.competencyId, {
          id: c.competencyId,
          name: c.competencyName,
          displayOrder: c.displayOrder,
        });
      }
    }),
  );
  const competencies = [...compMap.values()].sort((a, b) => a.displayOrder - b.displayOrder);
  const series = groups.map((g) => {
    const byId = new Map(
      (g.competencyAverages ?? []).map((c) => [c.competencyId, Number(c.averageScore)]),
    );
    return {
      key: g.groupKey,
      label: g.groupLabel,
      respondentCount: g.respondentCount,
      values: competencies.map((c) => byId.get(c.id) ?? null),
    };
  });
  return { competencies, series };
}

// 역량(6) × 집단(N) 그룹 막대차트. 공용 BarChart는 단일 시리즈만 지원해 여기서만 인라인으로 그린다.
function GroupCompareChart({ competencies, series, height = 200 }) {
  const allVals = series.flatMap((s) => s.values.filter((v) => v != null));
  const max = allVals.length ? Math.max(...allVals) : 100;
  const clusterW = Math.max(52, series.length * 14 + 20);
  const chartW = competencies.length * clusterW + 20;
  const barW = Math.max(5, Math.min(16, (clusterW - 20) / Math.max(series.length, 1) - 2));

  return (
    <svg width={chartW} height={height + 34} viewBox={`0 0 ${chartW} ${height + 34}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((r) => (
        <line
          key={r}
          x1={10}
          y1={height * (1 - r)}
          x2={chartW - 10}
          y2={height * (1 - r)}
          stroke="#E5E7EB"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}
      {competencies.map((c, ci) => {
        const x0 = 10 + ci * clusterW + 10;
        return (
          <g key={c.id}>
            {series.map((s, si) => {
              const v = s.values[ci];
              if (v == null) return null;
              const barH = (v / max) * height * 0.9;
              return (
                <rect
                  key={s.key}
                  x={x0 + si * (barW + 2)}
                  y={height - barH}
                  width={barW}
                  height={barH}
                  fill={GROUP_COLORS[si % GROUP_COLORS.length]}
                  rx="2"
                  opacity="0.9"
                >
                  <title>{`${s.label} · ${c.name}: ${v.toFixed(1)}점`}</title>
                </rect>
              );
            })}
            <text
              x={x0 + (series.length * (barW + 2)) / 2 - 1}
              y={height + 14}
              textAnchor="middle"
              fontSize="10"
              fill="#656D76"
              fontFamily="Pretendard, sans-serif"
            >
              {c.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ResultStats({ rounds }) {
  const [roundId, setRoundId] = useState('');
  const [groupBy, setGroupBy] = useState('GRADE');
  const selectedRound = rounds.find((r) => String(r.assessmentRoundId) === roundId) ?? null;

  // 역량별 분포·집단별 비교 두 그래프가 이 한 응답을 공유한다. 분포 그래프는 집단 축과
  // 무관하게 역량 축으로 다시 모으므로, 집단 축(groupBy)은 비교 그래프의 기준으로만 쓰인다.
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['assessmentDistribution', roundId, groupBy],
    queryFn: () => fetchAssessmentDistribution(Number(roundId), groupBy),
    enabled: !!roundId,
  });

  const groups = data?.groups ?? [];
  const competencyBars = aggregateByCompetency(groups);
  const groupCompare = buildGroupCompare(groups);
  const respondentTotal = groups.reduce((sum, g) => sum + g.respondentCount, 0);
  const overallAvg =
    competencyBars.length > 0
      ? competencyBars.reduce((s, c) => s + c.value, 0) / competencyBars.length
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-[16px] font-black text-[#1F2328]">결과 통계</h2>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            {selectedRound
              ? `진단 회차: ${selectedRound.assessmentName}`
              : '조회할 진단 회차를 선택해 주세요.'}
          </p>
        </div>
        <select
          value={roundId}
          onChange={(e) => setRoundId(e.target.value)}
          aria-label="진단 회차 선택"
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
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-10 text-center text-[12px] text-[#9AA0A6]">
          회차 관리 탭에서 진단 회차를 먼저 등록해 주세요.
        </div>
      )}

      {!roundId && rounds.length > 0 && (
        <EmptyState message="조회할 진단 회차를 선택해 주세요." />
      )}

      {roundId && isError && (
        <div className="p-3 rounded-[8px] bg-[#FEE2E2] border border-[#FECACA] text-[12px] text-[#CF222E] font-semibold">
          {error instanceof ApiError ? error.message : '결과 통계를 조회하지 못했습니다.'}
        </div>
      )}

      {roundId && !isError && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-5 max-w-[520px]">
            <StatTile
              label="응답 학생"
              value={isLoading ? '-' : `${respondentTotal.toLocaleString()}명`}
              sub="학적 정보가 등록된 응답자 기준"
              accentColor={ACCENT}
            />
            <StatTile
              label="전체 평균"
              value={isLoading ? '-' : `${overallAvg.toFixed(1)}점`}
              sub="6개 역량 평균 · 100점 기준"
              accentColor="#374151"
            />
          </div>

          {/* Competency distribution bar chart */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h3 className="text-[13px] font-bold text-[#1F2328]">역량별 평균 점수 분포</h3>
              <span className="text-[11px] text-[#9AA0A6] ml-1">
                100점 기준 · 축 순서는 결과 방사형 차트와 동일
              </span>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-[12px] text-[#9AA0A6]">불러오는 중...</div>
            ) : competencyBars.length === 0 ? (
              <EmptyState
                message="집계할 응답이 없습니다."
                sub="아직 제출된 진단 결과가 없거나 학적 정보가 등록된 응답자가 없습니다."
              />
            ) : (
              <div className="flex justify-center overflow-x-auto">
                <BarChart data={competencyBars} color={ACCENT} height={180} unit="점" />
              </div>
            )}
          </div>

          {/* Group comparison chart */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 mt-5">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h3 className="text-[13px] font-bold text-[#1F2328]">집단별 비교</h3>
              <span className="text-[11px] text-[#9AA0A6] ml-1">역량별 평균 점수를 집단 간 비교</span>
              <div className="ml-auto flex gap-1.5">
                {GROUP_AXES.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setGroupBy(a.value)}
                    aria-pressed={groupBy === a.value}
                    className={`h-7 px-3 text-[11px] font-bold rounded-full border transition-colors ${groupBy === a.value ? 'text-white border-[#374151]' : 'bg-white text-[#656D76] border-[#E5E7EB] hover:border-[#9CA3AF]'}`}
                    style={groupBy === a.value ? { background: ACCENT } : {}}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-[12px] text-[#9AA0A6]">불러오는 중...</div>
            ) : groupCompare.series.length === 0 ? (
              <EmptyState
                message="비교할 집단이 없습니다."
                sub={`${groupBy === 'GRADE' ? '학년' : '전공'} 정보가 등록된 응답자가 없습니다.`}
              />
            ) : (
              <>
                <div className="flex justify-center overflow-x-auto">
                  <GroupCompareChart
                    competencies={groupCompare.competencies}
                    series={groupCompare.series}
                  />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
                  {groupCompare.series.map((s, si) => (
                    <div
                      key={s.key}
                      className="flex items-center gap-1.5 text-[10px] text-[#656D76]"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                        style={{ background: GROUP_COLORS[si % GROUP_COLORS.length] }}
                      />
                      {s.label}
                      <span className="text-[#9AA0A6]">
                        ({s.respondentCount.toLocaleString()}명)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
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
      {tab === 'stats' && <ResultStats rounds={rounds} />}
    </div>
  );
}
