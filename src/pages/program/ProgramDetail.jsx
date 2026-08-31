import { useEffect, useState } from 'react';
import { PageHeader, StatusBadge, Button, ConfirmDialog, toast } from '@/components/common';
import { fetchProgramDetail, downloadProgramOperationPlan } from '@/api/programs';
import { applyToProgram } from '@/api/programApplications';
import { formatDate, formatDateTime, formatTime } from '@/utils/date';
import { useProgramConsent } from '@/hooks/useProgramConsent';
import { PROGRAM_APPLICATION_ERROR_CODE, CONSENT_MODULE_CODE } from '@/constants/domain';
import { useQueryClient } from '@tanstack/react-query';

const ACCENT = '#2563EB';

const COMP_COLORS = {
  글로벌: '#0891B2',
  의사소통: '#7C3AED',
  자기관리: '#2563EB',
};

/**
 * @param {Object} props
 * @param {number} [props.programId] 목록에서 선택한 프로그램 ID.
 * @param {() => void} props.onBack
 * @param {() => void} props.onApplySuccess
 */
export default function ProgramDetail({ programId, onBack, onApplySuccess }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [openContentIds, setOpenContentIds] = useState(() => new Set());
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const consent = useProgramConsent();
  const queryClient = useQueryClient();

  const toggleContent = (consentPolicyId) => {
    setOpenContentIds((prev) => {
      const next = new Set(prev);
      if (next.has(consentPolicyId)) next.delete(consentPolicyId);
      else next.add(consentPolicyId);
      return next;
    });
  };

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchProgramDetail(programId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? '프로그램 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [programId]);

  const handleApply = async () => {
    setConfirmOpen(false);
    setApplying(true);
    try {
      await consent.ensureAllAgreed();
    } catch (err) {
      toast(err.message ?? '약관 동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'danger');
      setApplying(false);
      return;
    }
    try {
      const res = await applyToProgram(programId);
      if (res.applicationStatus === 'WAITLISTED') {
        toast(`정원이 마감되어 대기 ${res.waitlistOrder ?? ''}순번으로 등록되었습니다.`, 'info');
      } else {
        toast('신청이 완료되었습니다.', 'success');
      }
      onApplySuccess();
    } catch (err) {
      if (err.code === PROGRAM_APPLICATION_ERROR_CODE.REQUIRED_CONSENT_NOT_AGREED) {
        toast('필수 동의 항목에 동의해야 신청할 수 있습니다.', 'danger');
        queryClient.invalidateQueries({ queryKey: ['myConsents'] });
        queryClient.invalidateQueries({ queryKey: ['consentPolicies', CONSENT_MODULE_CODE.PROGRAM] });
      } else {
        toast(err.message ?? '신청에 실패했습니다.', 'danger');
      }
    } finally {
      setApplying(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadProgramOperationPlan(programId, detail.fileName);
    } catch (err) {
      toast(err.message ?? '파일 다운로드에 실패했습니다.', 'danger');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-8 text-center text-[13px] text-[#656D76]">
        불러오는 중...
      </div>
    );
  }
  if (error || !detail) {
    return (
      <div className="bg-white rounded-[8px] border border-[#FEE2E2] px-4 py-8 text-center text-[13px] text-[#CF222E]">
        {error ?? '프로그램을 찾을 수 없습니다.'}
      </div>
    );
  }

  const p = detail;
  const period = `${formatDate(p.operationStartsAt)} ~ ${formatDate(p.operationEndsAt)}`;
  const sessionCount = p.sessions?.length ?? 0;
  const sessionLocations = new Set((p.sessions ?? []).map((s) => s.location).filter(Boolean));
  const location =
    sessionLocations.size === 0
      ? '-'
      : sessionLocations.size === 1
        ? [...sessionLocations][0]
        : '회차별 상이';
  const recruitPeriod = `${formatDate(p.recruitmentStartsAt)} ~ ${formatDate(p.recruitmentEndsAt)}`;
  // 모집기간이 끝나면(OPERATING/CLOSED) 신청을 받지 않는다 — 백엔드 apply()도 모집종료 시각 기준으로
  // 이미 거부하지만(APPLICATION_PERIOD_CLOSED), 버튼도 미리 막아 불필요한 실패 요청을 없앤다.
  const isClosed = p.programStatus === 'CLOSED' || p.programStatus === 'OPERATING';
  const applied = p.applicantCount ?? 0;
  const remaining = p.remainingCapacity ?? Math.max(p.capacity - applied, 0);
  const isFull = p.capacity > 0 && remaining <= 0;
  const dDay = Math.ceil(
    (new Date(p.recruitmentEndsAt).getTime() - Date.now()) / 86400000,
  );
  const formatSessionPeriod = (startsAt, endsAt) => {
    if (formatDate(startsAt) === formatDate(endsAt)) {
      return `${formatDate(startsAt)} ${formatTime(startsAt)} ~ ${formatTime(endsAt)}`;
    }
    return `${formatDateTime(startsAt)} ~ ${formatDateTime(endsAt)}`;
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '비교과 프로그램', onClick: onBack }, { label: p.programName }]}
        title={p.programName}
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 목록으로
          </Button>
        }
      />

      {/* Title badge row */}
      <div className="flex items-center gap-2 mb-5 -mt-2">
        <StatusBadge status={p.programStatusLabel} />
        {!isClosed && dDay >= 0 && (
          <span className="text-[12px] font-black text-[#CF222E]">D-{dDay}</span>
        )}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        {/* ── Left: Program info ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
                <h2 className="text-[14px] font-bold text-[#1F2328]">프로그램 정보</h2>
              </div>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {[
                { label: '주관부서', value: p.operatingUnitCodeName || '-' },
                { label: '프로그램유형', value: p.programTypeCodeName || '-' },
                { label: '운영기간', value: period },
                { label: '장소', value: location },
                { label: '모집기간', value: recruitPeriod },
                { label: '정원', value: `${p.capacity}명 (현재 ${applied}명 신청)` },
              ].map((row) => (
                <div key={row.label} className="flex px-5 py-3">
                  <span className="w-24 flex-shrink-0 text-[13px] font-semibold text-[#656D76]">
                    {row.label}
                  </span>
                  <span className="text-[13px] text-[#1F2328]">{row.value}</span>
                </div>
              ))}
              {p.competencyName && (
                <div className="flex px-5 py-3">
                  <span className="w-24 flex-shrink-0 text-[13px] font-semibold text-[#656D76]">
                    연계역량
                  </span>
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white h-fit"
                    style={{ background: COMP_COLORS[p.competencyName] ?? '#6B7280' }}
                  >
                    {p.competencyName}
                  </span>
                </div>
              )}
              {p.description && (
                <div className="flex px-5 py-3">
                  <span className="w-24 flex-shrink-0 text-[13px] font-semibold text-[#656D76]">
                    설명
                  </span>
                  <span className="text-[13px] text-[#1F2328] whitespace-pre-line">
                    {p.description}
                  </span>
                </div>
              )}
              {sessionCount > 0 && (
                <div className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setSessionsOpen((v) => !v)}
                    aria-expanded={sessionsOpen}
                    className="text-[12px] font-semibold text-[#2563EB] hover:underline"
                  >
                    회차 상세 {sessionsOpen ? '접기' : `보기 (총 ${sessionCount}회차)`}
                  </button>
                  {sessionsOpen && (
                    <div className="mt-2 flex flex-col gap-2">
                      {p.sessions.map((s, i) => (
                        <div
                          key={s.programSessionId ?? i}
                          className="text-[12px] text-[#656D76] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 py-2"
                        >
                          <span className="font-semibold text-[#1F2328]">{i + 1}회차</span>
                          {s.sessionName && <span> · {s.sessionName}</span>}
                          <div>{formatSessionPeriod(s.startsAt, s.endsAt)}</div>
                          {s.location && <div>{s.location}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {p.mileagePoints != null && (
                <div className="flex px-5 py-3">
                  <span className="w-24 flex-shrink-0 text-[13px] font-semibold text-[#656D76]">
                    적립 마일리지
                  </span>
                  <span className="text-[13px] font-black text-[#D97706]">
                    {p.mileagePoints}점
                  </span>
                </div>
              )}
              {p.fileName && (
                <div className="flex px-5 py-3">
                  <span className="w-24 flex-shrink-0 text-[13px] font-semibold text-[#656D76]">
                    첨부파일
                  </span>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex items-center gap-1.5 text-[13px] text-[#2563EB] hover:underline disabled:opacity-60 disabled:no-underline min-w-0"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="#2563EB"
                      className="flex-shrink-0"
                    >
                      <path d="M4 0h8l4 4v10a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2z" />
                    </svg>
                    <span className="truncate">
                      {downloading ? '다운로드 중…' : p.fileName}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mileage notice */}
          {p.mileagePoints != null && (
            <div className="bg-[#FFF7ED] border border-[#FDE68A] rounded-[8px] px-5 py-4 flex items-start gap-3">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="#D97706"
                className="flex-shrink-0 mt-0.5"
              >
                <path d="M8 1L1 14h14L8 1z" />
                <path d="M8 6v4M8 12h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-[12px] text-[#92400E] leading-snug">
                수료 후 <strong>만족도 설문을 완료해야</strong> 마일리지가 적립됩니다.
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Apply panel ── */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden h-fit sticky top-4">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <h2 className="text-[14px] font-bold text-[#1F2328]">신청</h2>
          </div>
          <div className="px-5 py-5 flex flex-col gap-4">
            {p.myApplicationStatus ? (
              <>
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] px-4 py-3 flex items-center gap-2">
                  <StatusBadge status={p.myApplicationStatusLabel} size="sm" />
                  <p className="text-[12px] font-bold text-[#1D4ED8]">이미 신청한 프로그램입니다.</p>
                </div>
                <Button
                  size="md"
                  variant="outline"
                  className="w-full justify-center"
                  onClick={onApplySuccess}
                >
                  내 신청내역 보기
                </Button>
              </>
            ) : (
              <>
                {isFull && !isClosed && (
                  <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-[8px] px-4 py-3">
                    <p className="text-[12px] font-bold text-[#92400E]">
                      정원이 마감되어 신청 시 대기열로 등록됩니다.
                    </p>
                  </div>
                )}

                {/* Agreement */}
                {!isClosed && (
                  <div className="flex flex-col gap-2">
                    {consent.isLoading && (
                      <p className="text-[12px] text-[#9AA0A6]">약관 정보를 불러오는 중...</p>
                    )}
                    {!consent.isLoading && consent.isError && (
                      <p className="text-[12px] text-[#CF222E]">
                        약관 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                      </p>
                    )}
                    {!consent.isLoading &&
                      !consent.isError &&
                      consent.requiredPolicies.map((policy) => {
                        const policyAgreed = consent.isPolicyAgreed(policy.consentPolicyId);
                        const contentOpen = openContentIds.has(policy.consentPolicyId);
                        if (policyAgreed) {
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

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  {isClosed ? (
                    <Button size="md" className="w-full justify-center" disabled>
                      모집이 마감되었습니다
                    </Button>
                  ) : (
                    <Button
                      size="md"
                      className="w-full justify-center"
                      disabled={!consent.canProceed || consent.isLoading}
                      loading={applying}
                      style={{ background: consent.canProceed ? ACCENT : undefined }}
                      onClick={() => setConfirmOpen(true)}
                    >
                      {isFull ? '대기 신청' : '신청하기'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="신청 확인"
        message={`[${p.programName}]에 신청하시겠습니까? 신청 후 승인까지 1~2 영업일 소요될 수 있습니다.`}
        confirmLabel="신청하기"
        onConfirm={handleApply}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
