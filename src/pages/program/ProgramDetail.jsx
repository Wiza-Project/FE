import { useState } from 'react';
import { PageHeader, StatusBadge, Button, ConfirmDialog, toast } from '@/components/common';

const ACCENT = '#2563EB';

// 데모용 고정 데이터 — applyState를 바꿔가며 'ineligible' | 'full' 케이스를 확인할 수 있습니다.
const PROGRAM_DATA = {
  id: 'P016',
  name: '해외문화체험 워크숍',
  dept: '국제교류처',
  period: '2026-09-01 ~ 2026-09-05',
  sessions: '5회차',
  location: '국제관 201호',
  recruitPeriod: '2026-08-01 ~ 2026-08-19',
  capacity: 30,
  applied: 20,
  target: '2~4학년 전 학과',
  competencies: ['글로벌', '의사소통'],
  completionCond: '출석률 80% 이상 + 활동일지 5회 + 만족도 설문',
  mileage: 200,
  status: '모집중',
  dDay: 3,
  mode: '오프라인',
  category: '글로벌',
};

const VERIFY_ROWS = [
  { label: '학년 요건 (2~4학년)', status: '충족' },
  { label: '학과 제한 없음', status: '해당없음' },
  { label: '선수 프로그램 이수', status: '해당없음' },
  { label: '중복 신청 여부', status: '충족' },
  { label: '정원 여유 (잔여 10명)', status: '충족' },
];

const VERIFY_STYLES = {
  충족: 'bg-[#DCFCE7] text-[#1A7F37]',
  해당없음: 'bg-[#F3F4F6] text-[#6E7781]',
  미충족: 'bg-[#FEE2E2] text-[#CF222E]',
};

const COMP_COLORS = {
  글로벌: '#0891B2',
  의사소통: '#7C3AED',
  자기관리: '#2563EB',
};

/**
 * @param {Object} props
 * @param {string} [props.programId] 목록에서 선택한 프로그램 ID. 아직 상세 데이터가 프로그램별로
 *   분리되어 있지 않아 현재는 미사용이며, 항상 PROGRAM_DATA(P016)를 보여줍니다. 프로그램별 상세
 *   API가 준비되면 이 값으로 데이터를 조회하도록 교체하세요.
 * @param {() => void} props.onBack
 * @param {() => void} props.onApplySuccess
 */
export default function ProgramDetail({ onBack, onApplySuccess }) {
  const [applyState] = useState('eligible'); // toggle: 'ineligible' | 'full'
  const [reason, setReason] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [interested, setInterested] = useState(false);

  const p = PROGRAM_DATA;
  const waitCount = 3;

  const handleApply = async () => {
    setConfirmOpen(false);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    toast('신청이 완료되었습니다.', 'success');
    onApplySuccess();
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '비교과 프로그램', onClick: onBack }, { label: p.name }]}
        title={p.name}
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 목록으로
          </Button>
        }
      />

      {/* Title badge row */}
      <div className="flex items-center gap-2 mb-5 -mt-2">
        <StatusBadge status="모집중" />
        <span className="text-[12px] font-black text-[#CF222E]">D-{p.dDay}</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
          {p.mode}
        </span>
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
                { label: '주관부서', value: p.dept },
                { label: '운영기간', value: `${p.period} (${p.sessions})` },
                { label: '장소', value: p.location },
                { label: '모집기간', value: p.recruitPeriod },
                { label: '정원', value: `${p.capacity}명 (현재 ${p.applied}명 신청)` },
                { label: '모집대상', value: p.target },
              ].map((row) => (
                <div key={row.label} className="flex px-5 py-3">
                  <span className="w-24 flex-shrink-0 text-[13px] font-semibold text-[#656D76]">
                    {row.label}
                  </span>
                  <span className="text-[13px] text-[#1F2328]">{row.value}</span>
                </div>
              ))}
              <div className="flex px-5 py-3">
                <span className="w-24 flex-shrink-0 text-[13px] font-semibold text-[#656D76]">
                  연계역량
                </span>
                <div className="flex gap-1.5">
                  {p.competencies.map((c) => (
                    <span
                      key={c}
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
                      style={{ background: COMP_COLORS[c] ?? '#6B7280' }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex px-5 py-3">
                <span className="w-24 flex-shrink-0 text-[13px] font-semibold text-[#656D76]">
                  수료조건
                </span>
                <span className="text-[13px] text-[#1F2328]">{p.completionCond}</span>
              </div>
              <div className="flex px-5 py-3">
                <span className="w-24 flex-shrink-0 text-[13px] font-semibold text-[#656D76]">
                  적립 마일리지
                </span>
                <span className="text-[13px] font-black text-[#D97706]">{p.mileage}점</span>
              </div>
            </div>

            {/* Capacity bar */}
            <div className="px-5 py-4 border-t border-[#F3F4F6]">
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="text-[#656D76]">신청 현황</span>
                <span className="font-bold text-[#1F2328]">
                  {p.applied}/{p.capacity}명
                </span>
              </div>
              <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] rounded-full"
                  style={{ width: `${(p.applied / p.capacity) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mileage notice */}
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
              수료 후 <strong>만족도 설문을 완료해야</strong> 마일리지가 적립됩니다. 설문 미제출 시
              수료증 발급도 제한됩니다.
            </p>
          </div>
        </div>

        {/* ── Right: Apply panel ── */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden h-fit sticky top-4">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <h2 className="text-[14px] font-bold text-[#1F2328]">신청</h2>
          </div>
          <div className="px-5 py-5 flex flex-col gap-4">
            {/* Verification result */}
            {applyState === 'eligible' && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] px-4 py-3 flex items-center gap-2.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="#1A7F37"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <circle cx="8" cy="8" r="7" fill="#DCFCE7" />
                  <path d="M5 8l2 2 4-4" />
                </svg>
                <span className="text-[13px] font-bold text-[#14532D]">
                  신청 자격 검증 완료 — 신청 가능합니다.
                </span>
              </div>
            )}
            {applyState === 'ineligible' && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-4 py-3 flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="#CF222E">
                  <circle cx="8" cy="8" r="7" />
                  <path
                    d="M5 5l6 6M11 5l-6 6"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[13px] font-bold text-[#7F1D1D]">
                  모집 대상 학년(2~4학년)에 해당하지 않습니다.
                </span>
              </div>
            )}
            {applyState === 'full' && (
              <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-[8px] px-4 py-3">
                <p className="text-[12px] font-bold text-[#92400E]">
                  현재 대기 {waitCount}순번으로 등록됩니다.
                </p>
              </div>
            )}

            {/* Verify table */}
            <div className="border border-[#E5E7EB] rounded-[6px] overflow-hidden">
              <table className="w-full text-[12px] border-collapse">
                <tbody>
                  {VERIFY_ROWS.map((row, i) => (
                    <tr key={row.label} className={`${i > 0 ? 'border-t border-[#F3F4F6]' : ''}`}>
                      <td className="px-3 py-2 text-[#656D76]">{row.label}</td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${VERIFY_STYLES[row.status]}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Reason textarea */}
            {applyState === 'eligible' && (
              <div>
                <label className="text-[12px] font-semibold text-[#656D76] mb-1.5 block">
                  신청 사유 <span className="text-[#9AA0A6] font-normal">(선택)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="신청 동기나 참여 목표를 입력해 주세요."
                  rows={3}
                  className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder:text-[#9AA0A6]"
                />
              </div>
            )}

            {/* Agreement */}
            {applyState !== 'ineligible' && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded-[3px] accent-[#2563EB] flex-shrink-0"
                />
                <span className="text-[12px] text-[#656D76] leading-snug">
                  프로그램 이용약관 및 개인정보 처리 방침에 동의합니다.{' '}
                  <button className="text-[#2563EB] underline">전문보기</button>
                </span>
              </label>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {applyState === 'eligible' && (
                <Button
                  size="md"
                  className="w-full justify-center"
                  disabled={!agreed}
                  loading={loading}
                  style={{ background: agreed ? ACCENT : undefined }}
                  onClick={() => setConfirmOpen(true)}
                >
                  신청하기
                </Button>
              )}
              {applyState === 'full' && (
                <Button
                  size="md"
                  className="w-full justify-center"
                  variant="outline"
                  disabled={!agreed}
                  onClick={() => setConfirmOpen(true)}
                >
                  대기 신청
                </Button>
              )}
              {applyState === 'ineligible' && (
                <Button size="md" className="w-full justify-center" disabled>
                  신청 불가
                </Button>
              )}
              <button
                onClick={() => {
                  setInterested(!interested);
                  toast(
                    interested ? '관심 해제되었습니다.' : '관심 프로그램에 추가되었습니다.',
                    'success',
                  );
                }}
                className={`w-full h-9 text-[13px] font-semibold rounded-[6px] border transition-colors ${interested ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB]'}`}
              >
                {interested ? '♥ 관심 등록됨' : '♡ 관심 프로그램'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="신청 확인"
        message={`[${p.name}]에 신청하시겠습니까? 신청 후 승인까지 1~2 영업일 소요될 수 있습니다.`}
        confirmLabel="신청하기"
        onConfirm={handleApply}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
