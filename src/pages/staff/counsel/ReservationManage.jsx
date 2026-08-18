import { useState } from 'react';
import { Button, Modal, StatusBadge, toast } from '@/components/common';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

const RESERVATIONS = [
  {
    id: 'CS-2026-0318',
    appliedAt: '08-12 09:11',
    studentId: '20231234',
    name: '홍길동',
    dept: '컴퓨터공학과',
    type: '진로·역량',
    wishDate: '08-14 10:00',
    status: '대기',
  },
  {
    id: 'CS-2026-0319',
    appliedAt: '08-12 11:32',
    studentId: '20231111',
    name: '김영희',
    dept: '경영학과',
    type: '학업고민',
    wishDate: '08-15 14:00',
    status: '대기',
  },
  {
    id: 'CS-2026-0320',
    appliedAt: '08-12 14:05',
    studentId: '20230777',
    name: '이민수',
    dept: '산업공학과',
    type: '대인관계',
    wishDate: '08-14 16:00',
    status: '대기',
  },
  {
    id: 'CS-2026-0315',
    appliedAt: '08-10 10:20',
    studentId: '20232050',
    name: '최지수',
    dept: '심리학과',
    type: '심리·정서',
    wishDate: '08-13 10:00',
    status: '확정',
  },
  {
    id: 'CS-2026-0316',
    appliedAt: '08-11 09:44',
    studentId: '20231876',
    name: '정하준',
    dept: '컴퓨터공학과',
    type: '진로·역량',
    wishDate: '08-13 14:00',
    status: '확정',
  },
  {
    id: 'CS-2026-0310',
    appliedAt: '08-08 16:05',
    studentId: '20231654',
    name: '윤태양',
    dept: '경영학과',
    type: '학업고민',
    wishDate: '08-10 11:00',
    status: '반려',
  },
];

const TODAY_SESSIONS = RESERVATIONS.filter(
  (r) => r.wishDate.startsWith('08-13') && r.status === '확정',
);

const REJECT_REASONS = ['선택하세요', '일정 충돌', '담당 상담사 부재', '신청 내용 미흡', '기타'];

export default function ReservationManage() {
  const [rows, setRows] = useState(RESERVATIONS);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectCode, setRejectCode] = useState('선택하세요');
  const [rejectDetail, setRejectDetail] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewId, setPreviewId] = useState('');

  const handleConfirm = (id) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: '확정' } : r)));
    toast(`예약 ${id}을 확정했습니다.`, 'success');
  };

  const handleRejectConfirm = () => {
    if (rejectCode === '선택하세요') {
      toast('사유를 선택해 주세요.', 'error');
      return;
    }
    if (!rejectTarget) return;
    setRows((prev) => prev.map((r) => (r.id === rejectTarget.id ? { ...r, status: '반려' } : r)));
    setRejectTarget(null);
    setRejectCode('선택하세요');
    setRejectDetail('');
    toast('반려 처리되었습니다. 학생에게 사유가 공개됩니다.', 'info');
  };

  const pending = rows.filter((r) => r.status === '대기');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">예약 관리</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            대기 중인 예약을 확인하고 승인·반려 처리하세요.
          </p>
        </div>
        <span
          className="text-[12px] font-bold px-3 py-1 rounded-full bg-[#F3F4F6]"
          style={{ color: ACCENT }}
        >
          대기 {pending.length}건
        </span>
      </div>

      {/* Today's sessions */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <h2 className="text-[13px] font-bold text-[#1F2328]">오늘의 상담</h2>
          <span className="text-[11px] text-[#9AA0A6]">2026-08-13 (목)</span>
        </div>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
        >
          {TODAY_SESSIONS.length === 0 ? (
            <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 text-[12px] text-[#9AA0A6]">
              오늘 예정된 상담이 없습니다.
            </div>
          ) : (
            TODAY_SESSIONS.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-[8px] border-2 p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
                style={{ borderColor: ACCENT }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[14px] font-black" style={{ color: ACCENT }}>
                      {s.wishDate.split(' ')[1]}
                    </p>
                    <p className="text-[10px] text-[#9AA0A6] font-mono">{s.id}</p>
                  </div>
                  <StatusBadge status="확정" size="sm" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[11px] font-black"
                    style={{ color: ACCENT }}
                  >
                    {s.name[0]}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-[#1F2328]">{s.name}</p>
                    <p className="text-[10px] text-[#9AA0A6]">
                      {s.studentId} · {s.dept}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76] font-semibold">
                    {s.type}
                  </span>
                  <button
                    onClick={() => {
                      setPreviewId(s.id);
                      setPreviewOpen(true);
                    }}
                    className="text-[11px] font-bold hover:underline transition-colors"
                    style={{ color: ACCENT }}
                  >
                    사전정보 보기 →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reservation table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <span className="text-[13px] font-bold text-[#1F2328]">전체 예약 목록</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {[
                  '예약번호',
                  '신청일시',
                  '학번',
                  '성명',
                  '학과',
                  '유형',
                  '희망 일시',
                  '상태',
                  '처리',
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 7 ? 'text-center' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[10px]" style={{ color: ACCENT }}>
                      {r.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                      {r.appliedAt}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                      {r.studentId}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1F2328]">{r.name}</td>
                    <td className="px-4 py-3 text-[#656D76]">{r.dept}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6]"
                        style={{ color: ACCENT }}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#444D56] whitespace-nowrap">
                      {r.wishDate}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-center">
                        {/* Privacy rule: no content preview in list */}
                        <button
                          onClick={() => {
                            setPreviewId(r.id);
                            setPreviewOpen(true);
                          }}
                          className="h-6 px-2 text-[9px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB] transition-colors"
                        >
                          신청내용
                        </button>
                        {r.status === '대기' && (
                          <>
                            <button
                              onClick={() => handleConfirm(r.id)}
                              className="h-6 px-2 text-[10px] font-bold rounded-[4px] bg-[#D1FAE5] text-[#059669] hover:bg-[#A7F3D0] transition-colors"
                            >
                              예정 확정
                            </button>
                            <button
                              onClick={() => setRejectTarget(r)}
                              className="h-6 px-2 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors"
                            >
                              반려
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="예약 반려"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              취소
            </Button>
            <Button style={{ background: '#CF222E' }} onClick={handleRejectConfirm}>
              반려 처리
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              반려 사유 <span className="text-[#CF222E]">*</span>
            </label>
            <select
              value={rejectCode}
              onChange={(e) => setRejectCode(e.target.value)}
              className="w-full h-9 px-2 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151]"
            >
              {REJECT_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              상세 사유
            </label>
            <textarea
              value={rejectDetail}
              onChange={(e) => setRejectDetail(e.target.value)}
              rows={3}
              placeholder="학생에게 공개되는 사유를 입력하세요."
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none bg-white focus:outline-none focus:border-[#374151]"
            />
          </div>
          <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#92400E]">
            ⚠ 반려 사유는 학생에게 공개됩니다.
          </div>
        </div>
      </Modal>

      {/* Preview modal — minimal info per privacy rule */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="신청 내용 확인"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              닫기
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB]">
            <p className="text-[10px] font-mono text-[#9AA0A6] mb-1">{previewId}</p>
            <p className="text-[12px] font-bold text-[#1F2328] mb-2">
              진로 방향과 취업 준비에 대해 상담받고 싶습니다. 현재 3학년으로 졸업 이후 진로가
              막막합니다.
            </p>
            <div className="text-[11px] text-[#9AA0A6]">기타 요청: 대면 희망 / 오전 시간 선호</div>
          </div>
          <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[11px] text-[#92400E]">
            🔒 상담 내용 상세 기록은 담당 상담사만 열람할 수 있습니다.
          </div>
        </div>
      </Modal>
    </div>
  );
}
