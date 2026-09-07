import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  fetchMyApplications,
  cancelMyApplication,
  applyToProgram,
  confirmMyApplication,
} from '@/api/programApplications';
import {
  PageHeader,
  StatTile,
  StatusBadge,
  Pagination,
  Button,
  Modal,
  toast,
} from '@/components/common';
import { formatDate } from '@/utils/date';
import { useProgramConsent } from '@/hooks/useProgramConsent';
import { PROGRAM_APPLICATION_ERROR_CODE, CONSENT_MODULE_CODE } from '@/constants/domain';

const ACCENT = '#2563EB';

// 이수 판정(completionStatus)이 나온 건은 그 결과를, 아직이면 신청 처리 상태 라벨을 그대로 보여준다.
// FE 디자인의 "활동진행"/"수정요청" 상태는 백엔드에 대응 개념이 없어 표현할 수 없다.
const STATUS_LABEL = { COMPLETED: '수료', FAILED: '미수료' };

// ProgramApplicationSummaryResponseDTO(GET /api/students/programs/applications) -> 목록 행으로 변환.
const toRow = (dto) => ({
  id: dto.applicationId,
  programId: dto.programId,
  applicationId: dto.applicationId,
  appliedAt: formatDate(dto.appliedAt),
  name: dto.programName,
  applicationStatus: dto.applicationStatus,
  status: STATUS_LABEL[dto.completionStatus] ?? dto.applicationStatusLabel,
  waitlistOrder: dto.waitlistOrder,
  attendance: dto.attendanceRate ?? null,
  completed: dto.completionStatus === 'COMPLETED',
  completionStatus: dto.completionStatus,
  mileage: dto.earnedMileagePoints ?? 0,
  decisionReason: dto.decisionReason,
  processedAt: dto.processedAt,
  cancellationReason: dto.cancellationReason,
  remainingCapacity: dto.remainingCapacity,
  recruitmentEndsAt: dto.recruitmentEndsAt,
});

// recruitmentEndsAt이 없는(레거시) 데이터는 마감 아님으로 간주 — 최종 판단은 어차피
// applyToProgram API 호출 시 백엔드가 한다.
const isRecruitmentClosed = (iso, now) => !!iso && new Date(iso).getTime() < now;

const CANCELABLE = new Set(['APPLIED', 'WAITLISTED', 'APPROVED']);

const BTN_MAP = {
  수료: { label: '만족도 설문', variant: 'outline' },
  신청완료: { label: '취소', variant: 'outline' },
  승인: { label: '취소', variant: 'danger' },
  반려: { label: '사유확인', variant: 'secondary' },
  대기: { label: '취소', variant: 'outline' },
  취소: { label: '재신청', variant: 'outline' },
};

/**
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {(target: {programId: number}) => void} props.onActivity
 * @param {(target: {programId: number, applicationId: number, programName: string}) => void} props.onSurvey
 */
export default function MyApplications({ onBack, onActivity, onSurvey }) {
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [apps, setApps] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState('전체');
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [reapplyingIds, setReapplyingIds] = useState(new Set());
  const [cancelingIds, setCancelingIds] = useState(new Set());
  const [reapplyTarget, setReapplyTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [openContentIds, setOpenContentIds] = useState(() => new Set());
  const [now, setNow] = useState(() => Date.now());
  const PAGE_SIZE = 8;

  const consent = useProgramConsent();
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMyApplications({ page: page - 1, size: PAGE_SIZE, sort: 'createdAt,desc' })
      .then((res) => {
        if (cancelled) return;
        setApps(res.content.map(toRow));
        setTotalItems(res.totalElements);
        setTotalPages(res.totalPages || 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? '신청 내역을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  // 전체 신청 건수는 서버 페이지네이션 totalElements(정확), 승인/수료 건수는
  // 별도 집계 API가 없어 현재 페이지에 내려온 데이터 기준 근사치다.
  const approvedCount = apps.filter((a) => a.applicationStatus === 'APPROVED').length;
  const completedCount = apps.filter((a) => a.completed).length;
  const totalMileage = apps.filter((a) => a.completed).reduce((s, a) => s + a.mileage, 0);

  const filtered = apps.filter(
    (a) =>
      (statusFilter === '전체' || a.status === statusFilter) &&
      (!submittedKeyword || a.name.includes(submittedKeyword)),
  );

  const runCancel = async (app) => {
    setCancelingIds((prev) => new Set(prev).add(app.programId));
    try {
      await cancelMyApplication(app.programId, app.applicationId);
      toast('취소 처리되었습니다.', 'success');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast(err.message ?? '취소에 실패했습니다.', 'danger');
    } finally {
      clearCanceling(app.programId);
    }
  };

  const clearReapplying = (programId) =>
    setReapplyingIds((prev) => {
      const next = new Set(prev);
      next.delete(programId);
      return next;
    });

  const clearCanceling = (programId) =>
    setCancelingIds((prev) => {
      const next = new Set(prev);
      next.delete(programId);
      return next;
    });

  const openReapply = (app) => {
    if (reapplyingIds.has(app.programId)) return;
    consent.resetChecked();
    setOpenContentIds(new Set());
    setReapplyTarget(app);
  };

  const closeReapply = () => {
    if (reapplyTarget && reapplyingIds.has(reapplyTarget.programId)) return;
    setReapplyTarget(null);
  };

  const toggleContent = (consentPolicyId) => {
    setOpenContentIds((prev) => {
      const next = new Set(prev);
      if (next.has(consentPolicyId)) next.delete(consentPolicyId);
      else next.add(consentPolicyId);
      return next;
    });
  };

  const handleReapplyConfirm = async () => {
    if (!reapplyTarget) return;
    const app = reapplyTarget;
    setReapplyingIds((prev) => new Set(prev).add(app.programId));
    try {
      await consent.ensureAllAgreed();
    } catch (err) {
      toast(err.message ?? '약관 동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'danger');
      clearReapplying(app.programId);
      return;
    }
    try {
      const res = await applyToProgram(app.programId);
      if (res.applicationStatus === 'WAITLISTED') {
        toast(`정원이 마감되어 대기 ${res.waitlistOrder ?? ''}순번으로 등록되었습니다.`, 'info');
      } else {
        toast('재신청이 완료되었습니다.', 'success');
      }
      setReapplyTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.code === PROGRAM_APPLICATION_ERROR_CODE.REQUIRED_CONSENT_NOT_AGREED) {
        toast('필수 동의 항목에 동의해야 재신청할 수 있습니다.', 'danger');
        queryClient.invalidateQueries({ queryKey: ['myConsents'] });
        queryClient.invalidateQueries({ queryKey: ['consentPolicies', CONSENT_MODULE_CODE.PROGRAM] });
      } else {
        toast(err.message ?? '재신청에 실패했습니다.', 'danger');
      }
    } finally {
      clearReapplying(app.programId);
    }
  };

  const openConfirm = (app) => {
    if (reapplyingIds.has(app.programId)) return;
    consent.resetChecked();
    setOpenContentIds(new Set());
    setConfirmTarget(app);
  };

  const closeConfirm = () => {
    if (confirmTarget && reapplyingIds.has(confirmTarget.programId)) return;
    setConfirmTarget(null);
  };

  const handleConfirmDecision = async () => {
    if (!confirmTarget) return;
    const app = confirmTarget;
    setReapplyingIds((prev) => new Set(prev).add(app.programId));
    try {
      await consent.ensureAllAgreed();
    } catch (err) {
      toast(err.message ?? '약관 동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'danger');
      clearReapplying(app.programId);
      return;
    }
    try {
      await confirmMyApplication(app.programId, app.applicationId);
      toast('신청이 확정되었습니다.', 'success');
      setConfirmTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.code === PROGRAM_APPLICATION_ERROR_CODE.REQUIRED_CONSENT_NOT_AGREED) {
        toast('필수 동의 항목에 동의해야 신청을 확정할 수 있습니다.', 'danger');
        queryClient.invalidateQueries({ queryKey: ['myConsents'] });
        queryClient.invalidateQueries({ queryKey: ['consentPolicies', CONSENT_MODULE_CODE.PROGRAM] });
      } else {
        toast(err.message ?? '확정에 실패했습니다.', 'danger');
      }
    } finally {
      clearReapplying(app.programId);
    }
  };

  const handleBtn = (app) => {
    if (app.status === '취소') {
      openReapply(app);
      return;
    }
    if (app.status === '수료') {
      onSurvey({ programId: app.programId, applicationId: app.applicationId, programName: app.name });
      return;
    }
    if (app.status === '반려') {
      setRejectTarget(app);
      return;
    }
    if (CANCELABLE.has(app.applicationStatus) && !app.completionStatus) {
      runCancel(app);
      return;
    }
    toast(`${BTN_MAP[app.status]?.label ?? app.status} 처리 중...`, 'info');
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: '비교과 프로그램', onClick: onBack },
          { label: '내 신청 내역' },
        ]}
        title="내 신청 내역"
        subtitle="비교과 프로그램 신청 및 활동 이력을 관리합니다."
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 목록으로
          </Button>
        }
      />

      {/* Stat tiles: 승인/수료/적립 마일리지는 별도 집계 API가 없어 현재 페이지 데이터 기준 근사치다. */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatTile label="전체 신청" value={`${totalItems}건`} sub="전체" accentColor={ACCENT} />
        <StatTile
          label="승인"
          value={`${approvedCount}건`}
          sub="현재 페이지 기준"
          accentColor="#1A7F37"
        />
        <StatTile
          label="수료"
          value={`${completedCount}건`}
          sub="현재 페이지 기준"
          accentColor="#7C3AED"
        />
        <StatTile
          label="적립 마일리지"
          value={`${totalMileage.toLocaleString()}점`}
          sub="현재 페이지 기준"
          accentColor="#D97706"
        />
      </div>

      {/* FilterBar: 이 API는 상태/이름 쿼리 파라미터를 지원하지 않아 현재 페이지에 이미 내려온
          데이터 안에서만 걸러진다(서버 페이지네이션과는 별개, ProgramList.jsx와 동일한 방식). */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 mb-4 flex items-end gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76] uppercase">상태</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 pr-7 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white appearance-none focus:outline-none focus:border-[#2563EB]"
          >
            <option>전체</option>
            <option>수료</option>
            <option>신청완료</option>
            <option>승인</option>
            <option>반려</option>
            <option>미수료</option>
            <option>대기</option>
            <option>취소</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76] uppercase">프로그램명</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="프로그램 검색"
            className="h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#2563EB] w-48"
          />
        </div>
        <Button size="sm" className="mb-0" onClick={() => setSubmittedKeyword(keyword)}>
          조회
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="mb-0"
          onClick={() => {
            setStatusFilter('전체');
            setKeyword('');
            setSubmittedKeyword('');
          }}
        >
          초기화
        </Button>
        <span className="text-[12px] text-[#9AA0A6] ml-auto">총 {totalItems}건</span>
      </div>

      {error && (
        <div className="bg-white rounded-[8px] border border-[#FEE2E2] px-4 py-8 mb-4 text-center text-[13px] text-[#CF222E]">
          {error}
        </div>
      )}
      {loading && !error && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-8 mb-4 text-center text-[13px] text-[#656D76]">
          불러오는 중...
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {['신청일', '프로그램명', '상태', '출석률', '수료', '적립', '관리'].map((h) => (
                  <th
                    key={h}
                    className={`px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '프로그램명' ? 'text-left' : 'text-center'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, i) => {
                const btn = BTN_MAP[app.status];
                return (
                  <tr
                    key={app.id}
                    className={`border-b border-[#E5E7EB] last:border-0 hover:bg-[#FAFAFA] transition-colors ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                  >
                    <td className="px-3 py-3 text-center text-[#9AA0A6] text-[12px]">
                      {app.appliedAt}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#1F2328]">{app.name}</td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-center">
                      {app.attendance != null ? (
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-16 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${app.attendance}%`,
                                background: app.attendance >= 80 ? '#1A7F37' : '#CF222E',
                              }}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-bold ${app.attendance >= 80 ? 'text-[#1A7F37]' : 'text-[#CF222E]'}`}
                          >
                            {app.attendance}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#9AA0A6] text-[12px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {app.completed ? (
                        <span className="text-[12px] font-bold text-[#1A7F37]">✓ 수료</span>
                      ) : (
                        <span className="text-[12px] text-[#9AA0A6]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {app.mileage > 0 ? (
                        <span className="text-[12px] font-bold text-[#D97706]">
                          {app.mileage}점
                        </span>
                      ) : (
                        <span className="text-[#9AA0A6] text-[12px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        {app.status === '반려' ? (
                          <button
                            onClick={() => handleBtn(app)}
                            className="h-7 px-3 text-[11px] font-bold rounded-[5px] transition-colors text-[#CF222E] border border-[#CF222E] hover:bg-[#FEF2F2]"
                          >
                            사유확인
                          </button>
                        ) : app.status === '대기' ? (
                          <>
                            <button
                              onClick={() => openConfirm(app)}
                              disabled={reapplyingIds.has(app.programId)}
                              className="h-7 px-3 text-[11px] font-bold rounded-[5px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white"
                              style={{ background: ACCENT }}
                            >
                              {reapplyingIds.has(app.programId) ? '처리 중...' : '신청'}
                            </button>
                            <button
                              onClick={() => handleBtn(app)}
                              disabled={reapplyingIds.has(app.programId) || cancelingIds.has(app.programId)}
                              className="h-7 px-3 text-[11px] font-bold rounded-[5px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB]"
                            >
                              {cancelingIds.has(app.programId) ? '처리 중...' : (btn?.label ?? '취소')}
                            </button>
                          </>
                        ) : app.status === '취소' ? (
                          isRecruitmentClosed(app.recruitmentEndsAt, now) ? (
                            <span className="text-[11px] text-[#9AA0A6]">신청 불가</span>
                          ) : app.remainingCapacity == null ? (
                            <span className="text-[11px] text-[#9AA0A6]">정원 확인 불가</span>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                onClick={() => handleBtn(app)}
                                disabled={reapplyingIds.has(app.programId)}
                                className="h-7 px-3 text-[11px] font-bold rounded-[5px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF]"
                              >
                                {reapplyingIds.has(app.programId)
                                  ? '처리 중...'
                                  : app.remainingCapacity > 0
                                    ? '재신청'
                                    : '대기'}
                              </button>
                              {app.remainingCapacity <= 0 && (
                                <span className="text-[10px] text-[#CF222E]">정원이 마감되었습니다</span>
                              )}
                            </div>
                          )
                        ) : (
                          <>
                            <button
                              onClick={() => onActivity({ programId: app.programId })}
                              className="h-7 px-3 text-[11px] font-bold rounded-[5px] border border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                            >
                              출결
                            </button>
                            {app.status !== '미수료' && (
                              <button
                                onClick={() => handleBtn(app)}
                                disabled={cancelingIds.has(app.programId)}
                                className={`h-7 px-3 text-[11px] font-bold rounded-[5px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                  app.status === '반려'
                                    ? 'text-[#CF222E] border border-[#CF222E] hover:bg-[#FEF2F2]'
                                    : 'border border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB]'
                                }`}
                                style={
                                  app.status === '수료' ? { background: '#7C3AED', color: 'white' } : {}
                                }
                              >
                                {cancelingIds.has(app.programId) ? '처리 중...' : (btn?.label ?? app.status)}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-[#E5E7EB]">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
            />
          </div>
        </div>
      )}

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="반려 사유"
        size="sm"
        footer={
          <Button size="sm" onClick={() => setRejectTarget(null)}>
            확인
          </Button>
        }
      >
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-4 py-3">
          <p className="text-[12px] font-semibold text-[#CF222E] mb-2">
            반려 일시: {rejectTarget?.processedAt ? formatDate(rejectTarget.processedAt) : '-'}
          </p>
          <p className="text-[13px] text-[#1F2328]">
            {rejectTarget?.decisionReason || '등록된 반려 사유가 없습니다.'}
          </p>
        </div>
      </Modal>

      {/* 재신청 — 이용약관 동의 모달 (ProgramList.jsx의 신청 모달과 동일한 패턴). */}
      <Modal
        open={!!reapplyTarget}
        onClose={closeReapply}
        title="재신청 확인"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={closeReapply}
              disabled={reapplyTarget && reapplyingIds.has(reapplyTarget.programId)}
            >
              취소
            </Button>
            <Button
              size="sm"
              disabled={
                !consent.canProceed ||
                consent.isLoading ||
                (reapplyTarget && reapplyingIds.has(reapplyTarget.programId))
              }
              loading={reapplyTarget && reapplyingIds.has(reapplyTarget.programId)}
              style={{ background: consent.canProceed ? ACCENT : undefined }}
              onClick={handleReapplyConfirm}
            >
              재신청
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-[#1F2328]">
            {reapplyTarget && `[${reapplyTarget.name}]에 재신청하시겠습니까?`}
          </p>
          {consent.isLoading && (
            <p className="text-[12px] text-[#9AA0A6]">약관 정보를 불러오는 중...</p>
          )}
          {!consent.isLoading && consent.isError && (
            <p className="text-[12px] text-[#CF222E]">
              약관 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          )}
          {!consent.isLoading && !consent.isError && (
            <div className="flex flex-col gap-2">
              {consent.requiredPolicies.map((policy) => {
                const agreed = consent.isPolicyAgreed(policy.consentPolicyId);
                const contentOpen = openContentIds.has(policy.consentPolicyId);
                if (agreed) {
                  return (
                    <p
                      key={policy.consentPolicyId}
                      className="text-[12px] font-semibold text-[#1A7F37]"
                    >
                      ✓ {policy.title}에 동의했습니다.
                    </p>
                  );
                }
                return (
                  <div key={policy.consentPolicyId} className="flex flex-col gap-1.5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consent.checkedIds.has(policy.consentPolicyId)}
                        onChange={(e) =>
                          consent.toggleChecked(policy.consentPolicyId, e.target.checked)
                        }
                        className="mt-0.5 w-4 h-4 rounded-[3px] accent-[#2563EB] flex-shrink-0"
                      />
                      <span className="text-[12px] text-[#656D76] leading-snug">
                        {policy.title}에 동의합니다.
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleContent(policy.consentPolicyId)}
                      aria-expanded={contentOpen}
                      aria-label={`${policy.title} 내용 ${contentOpen ? '접기' : '보기'}`}
                      className="text-[12px] text-[#2563EB] underline self-start ml-[26px]"
                    >
                      {contentOpen ? '내용 접기' : '내용 보기'}
                    </button>
                    {contentOpen && (
                      <div className="max-h-32 overflow-y-auto text-[11px] text-[#656D76] whitespace-pre-wrap bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 py-2">
                        {policy.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* 대기 신청 확정 — 재신청 모달과 동일한 패턴의 이용약관 동의 모달. */}
      <Modal
        open={!!confirmTarget}
        onClose={closeConfirm}
        title="신청 확정 확인"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={closeConfirm}
              disabled={confirmTarget && reapplyingIds.has(confirmTarget.programId)}
            >
              취소
            </Button>
            <Button
              size="sm"
              disabled={
                !consent.canProceed ||
                consent.isLoading ||
                (confirmTarget && reapplyingIds.has(confirmTarget.programId))
              }
              loading={confirmTarget && reapplyingIds.has(confirmTarget.programId)}
              style={{ background: consent.canProceed ? ACCENT : undefined }}
              onClick={handleConfirmDecision}
            >
              신청
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-[#1F2328]">
            {confirmTarget && `[${confirmTarget.name}]의 대기 신청을 확정하시겠습니까?`}
          </p>
          {consent.isLoading && (
            <p className="text-[12px] text-[#9AA0A6]">약관 정보를 불러오는 중...</p>
          )}
          {!consent.isLoading && consent.isError && (
            <p className="text-[12px] text-[#CF222E]">
              약관 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          )}
          {!consent.isLoading && !consent.isError && (
            <div className="flex flex-col gap-2">
              {consent.requiredPolicies.map((policy) => {
                const agreed = consent.isPolicyAgreed(policy.consentPolicyId);
                const contentOpen = openContentIds.has(policy.consentPolicyId);
                if (agreed) {
                  return (
                    <p
                      key={policy.consentPolicyId}
                      className="text-[12px] font-semibold text-[#1A7F37]"
                    >
                      ✓ {policy.title}에 동의했습니다.
                    </p>
                  );
                }
                return (
                  <div key={policy.consentPolicyId} className="flex flex-col gap-1.5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consent.checkedIds.has(policy.consentPolicyId)}
                        onChange={(e) =>
                          consent.toggleChecked(policy.consentPolicyId, e.target.checked)
                        }
                        className="mt-0.5 w-4 h-4 rounded-[3px] accent-[#2563EB] flex-shrink-0"
                      />
                      <span className="text-[12px] text-[#656D76] leading-snug">
                        {policy.title}에 동의합니다.
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleContent(policy.consentPolicyId)}
                      aria-expanded={contentOpen}
                      aria-label={`${policy.title} 내용 ${contentOpen ? '접기' : '보기'}`}
                      className="text-[12px] text-[#2563EB] underline self-start ml-[26px]"
                    >
                      {contentOpen ? '내용 접기' : '내용 보기'}
                    </button>
                    {contentOpen && (
                      <div className="max-h-32 overflow-y-auto text-[11px] text-[#656D76] whitespace-pre-wrap bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 py-2">
                        {policy.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
