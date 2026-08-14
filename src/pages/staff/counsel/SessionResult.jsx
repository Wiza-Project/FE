import { useState } from 'react';
import { Button, Modal, toast } from '@/components/common';

const ACCENT = '#0891B2';

export default function SessionResult() {
  const SESSION = {
    id: 'CS-2026-0315',
    student: '최지수',
    studentId: '20232050',
    dept: '심리학과',
    date: '2026-08-13',
    confirmedAt: '2026-08-13 11:42',
    confirmedBy: '김지도',
  };

  const [confirmed, setConfirmed] = useState(true);
  const [summary, setSummary] = useState(
    '학생은 대인관계 어려움과 진로 불안을 주요 호소 문제로 제시함. 경청 중심의 지지적 상담을 진행하며 단기 목표를 설정함.',
  );
  const [plan, setPlan] = useState(
    '1. 진로탐색 워크숍 참여 (2026-09)\n2. 주 1회 일기 쓰기\n3. 다음 상담 2026-09-10 예약',
  );
  const [corrections, setCorrections] = useState([
    {
      id: 'COR-001',
      datetime: '2026-08-20 14:52',
      author: '김지도',
      reason: '오탈자 수정 및 실행계획 보완',
      prevSummary: '학생은 대인관계 어려움과 진로 불안을 호소 문제로 제시함.',
      prevPlan: '1. 워크숍 참여\n2. 다음 상담 예약',
      expanded: false,
    },
  ]);

  const [corrOpen, setCorrOpen] = useState(false);
  const [corrReason, setCorrReason] = useState('');
  const [corrSummary, setCorrSummary] = useState('');
  const [corrPlan, setCorrPlan] = useState('');
  const [unlockOpen, setUnlockOpen] = useState(false);

  const openCorrection = () => {
    setCorrReason('');
    setCorrSummary(summary);
    setCorrPlan(plan);
    setCorrOpen(true);
  };

  const submitCorrection = () => {
    if (!corrReason.trim()) {
      toast('정정 사유를 입력해 주세요.', 'error');
      return;
    }
    const newCor = {
      id: `COR-${String(corrections.length + 1).padStart(3, '0')}`,
      datetime:
        '2026-08-' +
        String(new Date().getDate()).padStart(2, '0') +
        ' ' +
        new Date().toTimeString().slice(0, 5),
      author: '김지도',
      reason: corrReason,
      prevSummary: summary,
      prevPlan: plan,
      expanded: false,
    };
    setPlan(corrPlan);
    setSummary(corrSummary);
    setCorrections((prev) => [newCor, ...prev]);
    setCorrOpen(false);
    toast('결과가 정정되었습니다. 정정 이력이 기록됩니다.', 'success');
  };

  const toggleExpand = (id) => {
    setCorrections((prev) => prev.map((c) => (c.id === id ? { ...c, expanded: !c.expanded } : c)));
  };

  // Unconfirmed view (for demo toggle)
  if (!confirmed) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-[36px] mb-3">📋</div>
          <p className="text-[14px] font-bold text-[#1F2328]">아직 확정된 상담 결과가 없습니다.</p>
          <p className="text-[12px] text-[#9AA0A6] mt-1">
            상담 기록 작성 후 완료 처리를 진행하세요.
          </p>
          <button
            onClick={() => setConfirmed(true)}
            className="mt-4 text-[12px] font-bold hover:underline"
            style={{ color: ACCENT }}
          >
            (데모) 확정 상태 보기 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">상담 결과</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            <span className="font-mono">{SESSION.id}</span> · {SESSION.student} · {SESSION.date}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUnlockOpen(true)}>
            결과 정정
          </Button>
          <button
            onClick={() => setConfirmed(false)}
            className="text-[11px] text-[#9AA0A6] hover:underline"
          >
            (데모) 미확정 보기
          </button>
        </div>
      </div>

      {/* Confirmed result card */}
      <div
        className="bg-white rounded-[8px] border-2 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden mb-5"
        style={{ borderColor: ACCENT }}
      >
        {/* Confirmed stamp */}
        <div
          className="px-5 py-3 flex items-center gap-3 border-b"
          style={{ background: '#ECFEFF', borderColor: '#A5F3FC' }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-black shrink-0"
            style={{ background: ACCENT }}
          >
            ✓
          </div>
          <span className="text-[12px] font-black" style={{ color: ACCENT }}>
            확정 {corrections[0]?.datetime ?? SESSION.confirmedAt} · {SESSION.confirmedBy}
          </span>
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669]">
            확정 완료
          </span>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Session meta */}
          <div className="grid grid-cols-4 gap-4 pb-4 border-b border-[#F3F4F6]">
            {[
              { label: '학생', value: `${SESSION.student} (${SESSION.studentId})` },
              { label: '학과', value: SESSION.dept },
              { label: '상담일', value: SESSION.date },
              { label: '출석', value: '출석' },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-[10px] text-[#9AA0A6] mb-0.5">{f.label}</p>
                <p className="text-[12px] font-bold text-[#1F2328]">{f.value}</p>
              </div>
            ))}
          </div>

          {/* Public summary — READ ONLY */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#CFFAFE]"
                style={{ color: ACCENT }}
              >
                학생 공개
              </span>
              <span className="text-[11px] font-bold text-[#1F2328]">공개 요약</span>
              <span className="ml-auto text-[10px] text-[#9AA0A6] flex items-center gap-1">
                <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                  <rect
                    x="1"
                    y="5"
                    width="8"
                    height="7"
                    rx="1"
                    stroke="#9AA0A6"
                    strokeWidth="1.2"
                  />
                  <path d="M3 5V3.5a2 2 0 014 0V5" stroke="#9AA0A6" strokeWidth="1.2" />
                </svg>
                잠김
              </span>
            </div>
            <div className="px-4 py-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed">
              {summary}
            </div>
          </div>

          {/* Action plan — READ ONLY */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-[#1F2328]">실행계획</span>
              <span className="ml-auto text-[10px] text-[#9AA0A6] flex items-center gap-1">
                <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                  <rect
                    x="1"
                    y="5"
                    width="8"
                    height="7"
                    rx="1"
                    stroke="#9AA0A6"
                    strokeWidth="1.2"
                  />
                  <path d="M3 5V3.5a2 2 0 014 0V5" stroke="#9AA0A6" strokeWidth="1.2" />
                </svg>
                잠김
              </span>
            </div>
            <div className="px-4 py-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#444D56] leading-relaxed whitespace-pre-line">
              {plan}
            </div>
          </div>

          {/* Private note — locked for non-owner */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E]">
                비공개 · 상담사 전용
              </span>
            </div>
            <div className="px-4 py-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] flex items-center gap-3 text-[13px] text-[#9AA0A6]">
              <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                <rect
                  x="1"
                  y="8"
                  width="14"
                  height="12"
                  rx="2"
                  stroke="#9AA0A6"
                  strokeWidth="1.5"
                />
                <path d="M4 8V5.5a4 4 0 018 0V8" stroke="#9AA0A6" strokeWidth="1.5" />
              </svg>
              담당 상담사만 열람할 수 있습니다.
            </div>
          </div>
        </div>
      </div>

      {/* Correction history timeline */}
      {corrections.length > 0 && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#D97706]" />
            <h2 className="text-[13px] font-bold text-[#1F2328]">정정 이력</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
              {corrections.length}건
            </span>
            <p className="text-[11px] text-[#9AA0A6] ml-1">원본은 보존됩니다.</p>
          </div>

          <div className="flex flex-col gap-0">
            {corrections.map((c, i) => (
              <div key={c.id} className="relative pl-7">
                {/* Timeline line */}
                {i < corrections.length - 1 && (
                  <div className="absolute left-3 top-6 bottom-0 w-px bg-[#E5E7EB]" />
                )}
                {/* Dot */}
                <div className="absolute left-0 top-4 w-6 h-6 rounded-full border-2 border-[#D97706] bg-white flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#D97706]" />
                </div>

                <div className="pb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] font-mono text-[#9AA0A6]">{c.datetime}</span>
                    <span className="text-[11px] font-bold text-[#1F2328]">{c.author}</span>
                    <span className="text-[11px] text-[#D97706]">{c.reason}</span>
                    <button
                      onClick={() => toggleExpand(c.id)}
                      className="ml-auto text-[10px] text-[#9AA0A6] hover:text-[#1F2328] transition-colors font-semibold"
                    >
                      {c.expanded ? '변경 전 내용 접기 ▲' : '변경 전 내용 펼치기 ▼'}
                    </button>
                  </div>

                  {c.expanded && (
                    <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[8px] p-4 flex flex-col gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-[#9AA0A6] mb-1">
                          변경 전 공개 요약
                        </p>
                        <p className="text-[12px] text-[#656D76] leading-relaxed">
                          {c.prevSummary}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#9AA0A6] mb-1">
                          변경 전 실행계획
                        </p>
                        <p className="text-[12px] text-[#656D76] leading-relaxed whitespace-pre-line">
                          {c.prevPlan}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correction modal */}
      <Modal
        open={corrOpen}
        onClose={() => setCorrOpen(false)}
        title="결과 정정"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCorrOpen(false)}>
              취소
            </Button>
            <Button style={{ background: '#D97706' }} onClick={submitCorrection}>
              정정 저장
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              정정 사유 <span className="text-[#CF222E]">*</span>
            </label>
            <input
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
              placeholder="예) 오탈자 수정, 실행계획 보완 등"
              className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#D97706] bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              공개 요약 (변경)
            </label>
            <textarea
              value={corrSummary}
              onChange={(e) => setCorrSummary(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#D97706] bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              실행계획 (변경)
            </label>
            <textarea
              value={corrPlan}
              onChange={(e) => setCorrPlan(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#D97706] bg-white"
            />
          </div>
          <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[11px] text-[#92400E]">
            정정 후 변경 이력이 타임라인에 기록됩니다. 원본은 삭제되지 않습니다.
          </div>
        </div>
      </Modal>

      {/* Unlock confirm */}
      <Modal
        open={unlockOpen}
        onClose={() => setUnlockOpen(false)}
        title="결과 정정 확인"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUnlockOpen(false)}>
              취소
            </Button>
            <Button
              style={{ background: '#D97706' }}
              onClick={() => {
                setUnlockOpen(false);
                openCorrection();
              }}
            >
              정정 진행
            </Button>
          </div>
        }
      >
        <div className="p-3 rounded-[8px] bg-[#FFFBEB] border border-[#FDE68A] text-[12px] text-[#92400E] leading-relaxed">
          확정된 상담 결과를 수정합니다. 변경 이력이 기록되며 원본은 보존됩니다.
        </div>
      </Modal>
    </div>
  );
}
