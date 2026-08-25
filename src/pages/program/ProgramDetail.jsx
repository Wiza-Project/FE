import { useEffect, useState } from 'react';
import { PageHeader, StatusBadge, Button, ConfirmDialog, toast } from '@/components/common';
import { fetchProgramDetail } from '@/api/programs';
import { applyToProgram } from '@/api/programApplications';
import { formatDate } from '@/utils/date';

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
  const [agreed, setAgreed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);

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
      const res = await applyToProgram(programId);
      if (res.applicationStatus === 'WAITLISTED') {
        toast(`정원이 마감되어 대기 ${res.waitlistOrder ?? ''}순번으로 등록되었습니다.`, 'info');
      } else {
        toast('신청이 완료되었습니다.', 'success');
      }
      onApplySuccess();
    } catch (err) {
      toast(err.message ?? '신청에 실패했습니다.', 'danger');
    } finally {
      setApplying(false);
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
  const location = p.sessions?.[0]?.location || '-';
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
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">프로그램 정보</h2>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {[
                { label: '주관부서', value: p.operatingUnitCodeName || '-' },
                { label: '운영기간', value: `${period} (${sessionCount}회차)` },
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
            </div>

            {/* Capacity bar */}
            {p.capacity > 0 && (
              <div className="px-5 py-4 border-t border-[#F3F4F6]">
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="text-[#656D76]">신청 현황</span>
                  <span className="font-bold text-[#1F2328]">
                    {applied}/{p.capacity}명
                  </span>
                </div>
                <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] rounded-full"
                    style={{ width: `${Math.min((applied / p.capacity) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
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
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded-[3px] accent-[#2563EB] flex-shrink-0"
                    />
                    <span className="text-[12px] text-[#656D76] leading-snug">
                      프로그램 이용약관 및 개인정보 처리 방침에 동의합니다.
                    </span>
                  </label>
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
                      disabled={!agreed}
                      loading={applying}
                      style={{ background: agreed ? ACCENT : undefined }}
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
