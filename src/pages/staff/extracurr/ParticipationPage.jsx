import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Tabs, toast, DonutChart, Pagination } from '@/components/common';
import {
  fetchProgramApplications,
  approveApplication,
  rejectApplication,
  bulkApproveApplications,
  bulkRejectApplications,
  fetchProgramDetailAdmin,
  fetchSessionAttendance,
  recordAttendance,
} from '@/api/programs';
import { formatDate } from '@/utils/date';
import { fetchAllPages } from '@/utils/pagination';

// ─── Shared program summary bar ───────────────────────────────────────────────

function ProgramBar({ onBack, programId, programName }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['programApplications', programId, '전체'],
    queryFn: () => fetchAllPages((p) => fetchProgramApplications(programId, p)),
    enabled: !!programId,
  });
  const applications = data ?? [];
  const approved = applications.filter((a) => a.applicationStatus === 'APPROVED').length;
  const waitlisted = applications.filter((a) => a.applicationStatus === 'WAITLISTED').length;

  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-3 mb-5 flex items-center gap-5 flex-wrap">
      <button
        onClick={onBack}
        className="text-[12px] text-[#9AA0A6] hover:text-[#1F2328] transition-colors shrink-0"
      >
        ← 목록
      </button>
      <div className="h-4 w-px bg-[#E5E7EB] shrink-0" />
      <div className="min-w-0">
        <p className="text-[13px] font-black text-[#1F2328] truncate">{programName}</p>
      </div>
      <div className="ml-auto flex gap-4 flex-wrap shrink-0">
        {isLoading ? (
          <span className="text-[11px] text-[#9AA0A6]">불러오는 중...</span>
        ) : isError ? (
          <span className="text-[11px] text-[#CF222E]">통계를 불러오지 못했습니다.</span>
        ) : (
          [
            { label: '신청', value: applications.length, color: '#374151' },
            { label: '승인', value: approved, color: '#059669' },
            { label: '대기', value: waitlisted, color: '#D97706' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-[16px] font-black" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="text-[10px] text-[#9AA0A6]">{s.label}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ProgramApplicationAdminListItemResponseDTO의 applicationStatus 코드 -> 뱃지 색상.
const APPR_STYLE = {
  APPLIED: { bg: '#F3F4F6', text: '#6B7280' },
  WAITLISTED: { bg: '#FEF3C7', text: '#D97706' },
  APPROVED: { bg: '#D1FAE5', text: '#059669' },
  REJECTED: { bg: '#FEE2E2', text: '#CF222E' },
  CANCELLED: { bg: '#F3F4F6', text: '#9AA0A6' },
};

// ─── ② 출결 관리용 상수 ────────────────────────────────────────────────────────
// 백엔드 출결 상태는 PRESENT/ABSENT 2단계만 존재한다(LATE 없음). 아직 기록되지
// 않은 (학생, 회차)는 unrecorded(null)로 취급한다.

const ATT_STYLE = {
  PRESENT: { bg: '#D1FAE5', text: '#059669', label: '출' },
  ABSENT: { bg: '#FEE2E2', text: '#CF222E', label: '결' },
};
const UNRECORDED_STYLE = { bg: '#F3F4F6', text: '#9AA0A6', label: '-' };

// 셀 클릭 시 상태 순환: 미기록 → 출 → 결 → 출 → ... (미기록으로 되돌리는 것은 불가)
function nextAttStatus(current) {
  return current === 'PRESENT' ? 'ABSENT' : 'PRESENT';
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function attRate(att) {
  const recorded = att.filter((a) => a === 'PRESENT' || a === 'ABSENT');
  const present = recorded.filter((a) => a === 'PRESENT').length;
  return recorded.length === 0 ? 0 : Math.round((present / recorded.length) * 100);
}

// ─── ① 신청 심사 ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function ApplicationReview({ programId }) {
  const queryClient = useQueryClient();
  const [filterStatus, setFs] = useState('전체');
  const [keyword, setKw] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [rejectOpen, setRjOpen] = useState(false);
  const [rejectDetail, setRjDetail] = useState('');
  const [rejectTargetIds, setRejectTargetIds] = useState([]);
  const [page, setPage] = useState(1);

  const statuses = [
    { value: '전체', label: '전체' },
    { value: 'APPLIED', label: '검토중' },
    { value: 'WAITLISTED', label: '대기' },
    { value: 'APPROVED', label: '승인' },
    { value: 'REJECTED', label: '반려' },
  ];

  const queryKey = ['programApplications', programId, filterStatus, submittedKeyword, page];
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () =>
      fetchProgramApplications(programId, {
        status: filterStatus === '전체' ? undefined : filterStatus,
        keyword: submittedKeyword || undefined,
        page: page - 1,
        size: PAGE_SIZE,
      }),
    enabled: !!programId,
  });

  useEffect(() => {
    if (!data) return;
    const lastPage = Math.max(1, data.totalPages || 1);
    if (page > lastPage) {
      setPage(lastPage);
      setSelected(new Set());
    }
  }, [data, page]);

  const runSearch = () => {
    setPage(1);
    setSelected(new Set());
    setSubmittedKeyword(keyword);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['programApplications', programId] });

  const approveMutation = useMutation({
    mutationFn: (applicationId) => approveApplication(programId, applicationId),
    onSuccess: () => {
      invalidate();
      setSelected(new Set());
      toast('승인 처리했습니다.', 'success');
    },
    onError: (err) => toast(err.message ?? '승인에 실패했습니다.', 'error'),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids) => bulkApproveApplications(programId, ids),
    onSuccess: (_, ids) => {
      invalidate();
      setSelected(new Set());
      toast(`${ids.length}건을 승인했습니다.`, 'success');
    },
    onError: (err) => toast(err.message ?? '일괄 승인에 실패했습니다.', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ ids, reason }) =>
      ids.length === 1
        ? rejectApplication(programId, ids[0], reason)
        : bulkRejectApplications(programId, ids, reason),
    onSuccess: (_, { ids }) => {
      invalidate();
      setSelected(new Set());
      setRjOpen(false);
      setRjDetail('');
      setRejectTargetIds([]);
      toast(`${ids.length}건을 반려했습니다.`, 'info');
    },
    onError: (err) => toast(err.message ?? '반려에 실패했습니다.', 'error'),
  });

  const rows = data?.content ?? [];
  const filtered = rows;

  // 일괄 승인/반려는 개별 행 버튼(canApprove/canReject)과 동일한 상태 조건만 대상으로 한다.
  // 체크박스 자체는 상태와 무관하게 선택 가능하므로, 실제 요청 직전에 조건에 안 맞는 건을 걸러낸다.
  const eligibleIds = (ids, isEligible) =>
    ids.filter((id) => {
      const app = filtered.find((a) => a.applicationId === id);
      return !!app && isEligible(app.applicationStatus);
    });

  const allChecked = filtered.length > 0 && filtered.every((a) => selected.has(a.applicationId));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.applicationId)));
  };
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openReject = (ids) => {
    setRejectTargetIds(ids);
    setRjDetail('');
    setRjOpen(true);
  };

  const handleRejectConfirm = () => {
    if (rejectMutation.isPending) return;
    if (!rejectDetail.trim()) {
      toast('반려 사유를 입력해 주세요.', 'error');
      return;
    }
    rejectMutation.mutate({ ids: rejectTargetIds, reason: rejectDetail.trim() });
  };

  if (isError) {
    return (
      <div className="bg-white rounded-[8px] border border-[#FEE2E2] px-4 py-12 text-center text-[13px] text-[#CF222E]">
        {error?.message ?? '신청 목록을 불러오지 못했습니다.'}
      </div>
    );
  }

  return (
    <div>
      {/* FilterBar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-4 flex gap-3 flex-wrap items-end">
        <div className="flex flex-col gap-1 w-36">
          <label htmlFor="participation-filter-status" className="text-[10px] font-semibold text-[#656D76]">상태</label>
          <select
            id="participation-filter-status"
            value={filterStatus}
            onChange={(e) => {
              setFs(e.target.value);
              setPage(1);
              setSelected(new Set());
            }}
            className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151]"
          >
            {statuses.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label htmlFor="participation-search-keyword" className="text-[10px] font-semibold text-[#656D76]">학번·성명</label>
          <div className="flex gap-1.5">
            <input
              id="participation-search-keyword"
              value={keyword}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="검색..."
              className="flex-1 h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151]"
            />
            <button
              onClick={runSearch}
              className="h-8 px-3 text-[12px] font-bold rounded-[6px] bg-[#374151] text-white hover:bg-[#1F2937] transition-colors"
            >
              조회
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end mb-2">
        <span className="text-[10px] text-[#9AA0A6]">
          ※ 전체 선택은 현재 페이지에 표시된 항목에만 적용됩니다.
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-label="전체 신청자 선택"
                    className="accent-[#374151] w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                {['신청일', '학번', '성명', '상태', '처리'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 3 ? 'text-center' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-[#9AA0A6]">
                    불러오는 중...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-[#9AA0A6]">
                    신청자가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const aStyle = APPR_STYLE[a.applicationStatus] ?? APPR_STYLE.APPLIED;
                  // 백엔드(findApplicationForUpdate)가 승인/반려 둘 다 APPLIED/WAITLISTED 상태에서만
                  // 허용하므로(그 외엔 APPLICATION_ALREADY_PROCESSED), 두 버튼의 활성 조건을 동일하게 맞춘다
                  // — 승인/반려 한쪽을 누르면 상태가 바뀌어 두 버튼이 함께 비활성화되어야 한다.
                  const canDecide = a.applicationStatus === 'APPLIED' || a.applicationStatus === 'WAITLISTED';
                  const canApprove = canDecide;
                  const canReject = canDecide;
                  return (
                    <tr
                      key={a.applicationId}
                      className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors ${selected.has(a.applicationId) ? 'bg-[#F3F4F6]' : ''}`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(a.applicationId)}
                          onChange={() => toggle(a.applicationId)}
                          aria-label={`${a.studentName} 선택`}
                          className="accent-[#374151] w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                        {formatDate(a.appliedAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                        {a.studentNo}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#1F2328]">{a.studentName}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: aStyle.bg, color: aStyle.text }}
                        >
                          {a.applicationStatusLabel ?? a.applicationStatus}
                          {a.applicationStatus === 'WAITLISTED' && a.waitlistOrder != null
                            ? ` (${a.waitlistOrder}번)`
                            : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          <button
                            disabled={!canApprove || approveMutation.isPending}
                            onClick={() => approveMutation.mutate(a.applicationId)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#D1FAE5] text-[#059669] hover:bg-[#A7F3D0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            승인
                          </button>
                          <button
                            disabled={!canReject || rejectMutation.isPending}
                            onClick={() => openReject([a.applicationId])}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            반려
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={data?.totalPages || 1}
        onChange={(p) => {
          setPage(p);
          setSelected(new Set());
        }}
        totalItems={data?.totalElements}
        pageSize={PAGE_SIZE}
      />

      {/* Fixed bottom bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-[#E5E7EB] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] z-40">
          <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-4">
            <span className="text-[13px] font-bold text-[#1F2328]">{selected.size}건 선택됨</span>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                style={{ background: '#059669' }}
                onClick={() => {
                  const ids = eligibleIds(
                    [...selected],
                    (s) => s === 'APPLIED' || s === 'WAITLISTED',
                  );
                  if (ids.length === 0) {
                    toast('일괄 승인 가능한 항목이 없습니다.', 'error');
                    return;
                  }
                  bulkApproveMutation.mutate(ids);
                }}
              >
                선택 일괄 승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                style={{ borderColor: '#CF222E', color: '#CF222E' }}
                onClick={() => {
                  const ids = eligibleIds(
                    [...selected],
                    (s) => s === 'APPLIED' || s === 'WAITLISTED',
                  );
                  if (ids.length === 0) {
                    toast('반려 가능한 항목이 없습니다.', 'error');
                    return;
                  }
                  openReject(ids);
                }}
              >
                선택 반려
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRjOpen(false)}
        title="반려 · 수정요청"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={rejectMutation.isPending}
              onClick={() => setRjOpen(false)}
            >
              취소
            </Button>
            <Button
              style={{ background: '#CF222E' }}
              loading={rejectMutation.isPending}
              onClick={handleRejectConfirm}
            >
              반려 처리
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="participation-reject-detail" className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              반려 사유 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              id="participation-reject-detail"
              value={rejectDetail}
              onChange={(e) => setRjDetail(e.target.value)}
              rows={4}
              placeholder="학생에게 공개되는 사유를 작성해 주세요."
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white resize-none focus:outline-none focus:border-[#374151]"
            />
          </div>
          <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#92400E]">
            ⚠ 입력한 사유는 학생에게 그대로 공개됩니다.
          </div>
        </div>
      </Modal>

      <div className="h-16" />
    </div>
  );
}

// ─── ② 출결 관리 ─────────────────────────────────────────────────────────────

function AttendanceManage({ programId }) {
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState(null);
  const [editReason, setEditReason] = useState('');

  const { data: programDetail, isLoading: isDetailLoading, isError: isDetailError } = useQuery({
    queryKey: ['adminProgramDetail', programId],
    queryFn: () => fetchProgramDetailAdmin(programId),
    enabled: !!programId,
  });
  const sessions = programDetail?.sessions ?? [];
  const sessionIds = sessions.map((sess) => sess.programSessionId);

  const { data: applications, isLoading: isAppLoading, isError: isAppError } = useQuery({
    queryKey: ['programApplications', programId, '전체'],
    queryFn: () => fetchAllPages((p) => fetchProgramApplications(programId, p)),
    enabled: !!programId,
  });
  const approvedApplications = (applications ?? []).filter(
    (a) => a.applicationStatus === 'APPROVED',
  );

  const { data: attendanceBySession, isLoading: isAttLoading, isError: isAttError } = useQuery({
    queryKey: ['sessionAttendances', programId, sessionIds],
    queryFn: () =>
      Promise.all(sessionIds.map((sessionId) => fetchSessionAttendance(programId, sessionId))),
    enabled: !!programId && sessionIds.length > 0,
  });

  // `applicationId-programSessionId` -> attendanceStatus. 응답에 없는 조합은 미기록.
  const attendanceMap = new Map();
  (attendanceBySession ?? []).forEach((records) => {
    records.forEach((r) => {
      attendanceMap.set(`${r.applicationId}-${r.programSessionId}`, r.attendanceStatus);
    });
  });

  const recordMutation = useMutation({
    mutationFn: ({ sessionId, applicationId, attendanceStatus, note }) =>
      recordAttendance(programId, sessionId, applicationId, { attendanceStatus, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionAttendances', programId] });
      toast('출결이 수정되었습니다. 수정 이력이 기록됩니다.', 'success');
      setEditTarget(null);
      setEditReason('');
    },
    onError: (err) => toast(err.message ?? '출결 수정에 실패했습니다.', 'error'),
  });

  const handleAttChange = (applicationId, studentName, sessionId, roundLabel, currentStatus) => {
    setEditTarget({
      applicationId,
      studentName,
      sessionId,
      roundLabel,
      nextStatus: nextAttStatus(currentStatus),
    });
    setEditReason('');
  };

  const confirmAttChange = () => {
    if (recordMutation.isPending) return;
    if (!editReason.trim()) {
      toast('수정 사유를 입력해 주세요.', 'error');
      return;
    }
    if (!editTarget) return;
    recordMutation.mutate({
      sessionId: editTarget.sessionId,
      applicationId: editTarget.applicationId,
      attendanceStatus: editTarget.nextStatus,
      note: editReason.trim(),
    });
  };

  const isLoading = isDetailLoading || isAppLoading || isAttLoading;
  const isError = isDetailError || isAppError || isAttError;
  const colCount = sessions.length + 3;

  if (isError) {
    return (
      <div className="bg-white rounded-[8px] border border-[#FEE2E2] px-4 py-12 text-center text-[13px] text-[#CF222E]">
        출결 정보를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div>
      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {[
                  '학번',
                  '성명',
                  ...sessions.map((sess, i) => sess.sessionName || `${i + 1}회차`),
                  '출석률',
                ].map((h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 2 ? 'text-center' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-12 text-center text-[13px] text-[#9AA0A6]">
                    불러오는 중...
                  </td>
                </tr>
              ) : approvedApplications.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-12 text-center text-[13px] text-[#9AA0A6]">
                    승인된 신청자가 없습니다.
                  </td>
                </tr>
              ) : (
                approvedApplications.map((a) => {
                  const statuses = sessions.map(
                    (sess) => attendanceMap.get(`${a.applicationId}-${sess.programSessionId}`) ?? null,
                  );
                  const rate = attRate(statuses);
                  const hasUnrecorded = statuses.some((s) => s === null);
                  const fail = !hasUnrecorded && rate < 80;
                  return (
                    <tr
                      key={a.applicationId}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                        {a.studentNo}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#1F2328]">{a.studentName}</td>
                      {sessions.map((sess, ri) => {
                        const status = statuses[ri];
                        const style = status ? ATT_STYLE[status] : UNRECORDED_STYLE;
                        return (
                          <td key={sess.programSessionId} className="px-4 py-3 text-center">
                            <button
                              onClick={() =>
                                handleAttChange(
                                  a.applicationId,
                                  a.studentName,
                                  sess.programSessionId,
                                  ri + 1,
                                  status,
                                )
                              }
                              aria-label={`${a.studentName} ${ri + 1}회차 출결 상태: ${
                                status === 'PRESENT' ? '출석' : status === 'ABSENT' ? '결석' : '미기록'
                              }. 클릭하면 ${nextAttStatus(status) === 'PRESENT' ? '출석' : '결석'}으로 변경됩니다.`}
                              className="w-7 h-7 rounded-full text-[10px] font-black transition-all hover:scale-110 hover:shadow-md"
                              style={{ background: style.bg, color: style.text }}
                            >
                              {style.label}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[12px] font-black ${fail ? 'text-[#CF222E]' : 'text-[#059669]'}`}
                        >
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Att edit modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="출결 수정"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={recordMutation.isPending}
              onClick={() => setEditTarget(null)}
            >
              취소
            </Button>
            <Button
              style={{ background: '#374151' }}
              loading={recordMutation.isPending}
              onClick={confirmAttChange}
            >
              수정 확정
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {editTarget && (
            <div className="p-3 rounded-[8px] bg-[#F3F4F6] border border-[#E5E7EB] text-[12px] text-[#374151]">
              <span className="font-bold">{editTarget.studentName}</span>{' '}
              {editTarget.roundLabel}회차 출결을{' '}
              <span className="font-bold">{ATT_STYLE[editTarget.nextStatus].label}</span>(으)로
              변경합니다.
            </div>
          )}
          <div>
            <label htmlFor="participation-edit-reason" className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              수정 사유 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              id="participation-edit-reason"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="수정 사유를 입력하세요. (필수, 최대 500자)"
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white resize-none focus:outline-none focus:border-[#374151]"
            />
          </div>
          <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#92400E]">
            수정 이력이 시스템에 기록됩니다.
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── ③ 결과 등록·이수 판정 ───────────────────────────────────────────────────
// 수료/미수료는 서버 스케줄러(ProgramStatusScheduler)가 운영종료 후 출석률과
// 프로그램별 이수기준(completion_rate)을 비교해 매분 자동 확정한다. 그래서 이 탭은
// 수동 확정 액션 없이 신청자 목록 응답의 completionStatus/certificateNo를 그대로
// 보여주기만 한다. 이수증은 PDF 파일이 아니라 certificateNo 문자열로만 관리되므로
// 별도 발급 버튼 없이 값이 있으면 "이수증 발급됨"으로 표시한다.

// CompletionStatus 코드 -> 뱃지 색상/라벨.
const COMPLETION_STYLE = {
  COMPLETED: { bg: '#D1FAE5', text: '#059669', label: '수료' },
  FAILED: { bg: '#FEE2E2', text: '#CF222E', label: '미수료' },
};
const PENDING_STYLE = { bg: '#F3F4F6', text: '#6B7280', label: '판정전' };

function ResultJudge({ programId }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['programApplications', programId, '전체'],
    queryFn: () => fetchAllPages((p) => fetchProgramApplications(programId, p)),
    enabled: !!programId,
  });

  // 이수판정은 승인된(참여 확정) 신청자만 대상이다.
  const rows = (data ?? []).filter((a) => a.applicationStatus === 'APPROVED');
  const completed = rows.filter((r) => r.completionStatus === 'COMPLETED').length;
  const failed = rows.filter((r) => r.completionStatus === 'FAILED').length;
  const pending = rows.length - completed - failed;

  const donutData = [
    { label: '수료', value: completed, color: '#059669' },
    { label: '미수료', value: failed, color: '#CF222E' },
    { label: '판정전', value: pending, color: '#D1D5DB' },
  ];
  const completionPct = rows.length > 0 ? Math.round((completed / rows.length) * 100) : 0;

  if (isError) {
    return (
      <div className="bg-white rounded-[8px] border border-[#FEE2E2] px-4 py-12 text-center text-[13px] text-[#CF222E]">
        {error?.message ?? '신청 목록을 불러오지 못했습니다.'}
      </div>
    );
  }

  return (
    <div>
      {/* Summary + donut */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 mb-5 flex items-start gap-8">
        <div className="flex-1">
          <h3 className="text-[13px] font-bold text-[#1F2328] mb-3">이수 판정 안내</h3>
          <p className="text-[12px] text-[#656D76] leading-relaxed">
            운영 종료 후 출석률이 프로그램별 이수기준을 충족하면 서버가 자동으로 수료/미수료를
            확정합니다. 이 화면은 그 결과를 표시만 하며, 별도의 수동 확정 절차는 없습니다.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            {[
              { label: `수료 ${completed}`, bg: '#D1FAE5', text: '#059669' },
              { label: `미수료 ${failed}`, bg: '#FEE2E2', text: '#CF222E' },
              { label: `판정전 ${pending}`, bg: '#F3F4F6', text: '#9AA0A6' },
            ].map((b) => (
              <span
                key={b.label}
                className="text-[11px] font-black px-3 py-1 rounded-full"
                style={{ background: b.bg, color: b.text }}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          <p className="text-[11px] font-bold text-[#656D76] mb-2 text-center">수료율</p>
          {rows.length > 0 ? (
            <DonutChart segments={donutData} size={140} centerValue={`${completionPct}%`} />
          ) : (
            <div
              role="status"
              className="w-[140px] h-[140px] flex items-center justify-center text-center text-[11px] text-[#9AA0A6] rounded-full border border-dashed border-[#E5E7EB] px-3"
            >
              승인된 참여자가 없어 표시할 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden mb-24">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {['학번', '성명', '판정', '이수증'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 2 ? 'text-center' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-[13px] text-[#9AA0A6]">
                    불러오는 중...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-[13px] text-[#9AA0A6]">
                    승인된 참여자가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const style = COMPLETION_STYLE[r.completionStatus] ?? PENDING_STYLE;
                  return (
                    <tr
                      key={r.applicationId}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                        {r.studentNo}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#1F2328]">{r.studentName}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.certificateNo ? (
                          <span className="text-[11px] text-[#059669] font-semibold">
                            이수증 발급됨 <span className="font-mono text-[#9AA0A6]">({r.certificateNo})</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#D1D5DB]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

/**
 * 비교과 프로그램 참여·결과 관리 3탭 (신청심사/출결관리/결과등록·이수판정).
 *
 * @param {Object} props
 * @param {() => void} props.onBack
 */
/**
 * @param {Object} props
 * @param {number} props.programId
 * @param {string} props.programName
 * @param {() => void} props.onBack
 */
export default function ParticipationPage({ programId, programName, onBack }) {
  const [tab, setTab] = useState('review');

  const TABS = [
    { key: 'review', label: '① 신청 심사' },
    { key: 'attendance', label: '② 출결 관리' },
    { key: 'result', label: '③ 결과 등록·이수 판정' },
  ];

  return (
    <div>
      <ProgramBar onBack={onBack} programId={programId} programName={programName} />

      <div className="mb-5">
        <Tabs tabs={TABS} active={tab} onChange={setTab} accentColor="#374151" />
      </div>

      {tab === 'review' && <ApplicationReview programId={programId} />}
      {tab === 'attendance' && <AttendanceManage programId={programId} />}
      {tab === 'result' && <ResultJudge programId={programId} />}
    </div>
  );
}
