import { useState } from 'react';
import { Button, Modal, StatusBadge, toast } from '@/components/common';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

const COUNSELORS = [
  '선택하세요',
  '김지도 (진로·역량)',
  '이상담 (심리·정서)',
  '박가이드 (학업고민)',
  '최코치 (대인관계)',
];

const INITIAL = [
  {
    id: 'CI-2026-0041',
    receivedAt: '08-13 09:05',
    studentId: '20231234',
    name: '홍길동',
    dept: '컴퓨터공학과',
    year: 3,
    type: '진로·역량',
    memo: '취업 준비 방향 상담 요청',
    status: '미배정',
    counselor: null,
  },
  {
    id: 'CI-2026-0040',
    receivedAt: '08-13 09:32',
    studentId: '20232211',
    name: '박나라',
    dept: '국어국문학과',
    year: 2,
    type: '학업고민',
    memo: '성적 하락으로 인한 불안',
    status: '미배정',
    counselor: null,
  },
  {
    id: 'CI-2026-0039',
    receivedAt: '08-12 15:11',
    studentId: '20231111',
    name: '김영희',
    dept: '경영학과',
    year: 4,
    type: '심리·정서',
    memo: '반복적인 학습 무기력감',
    status: '배정완료',
    counselor: '이상담 (심리·정서)',
  },
  {
    id: 'CI-2026-0038',
    receivedAt: '08-12 11:44',
    studentId: '20230555',
    name: '이준혁',
    dept: '산업공학과',
    year: 3,
    type: '대인관계',
    memo: '팀플 갈등 및 사회적 어려움',
    status: '배정완료',
    counselor: '최코치 (대인관계)',
  },
  {
    id: 'CI-2026-0037',
    receivedAt: '08-11 10:02',
    studentId: '20231500',
    name: '정유진',
    dept: '화학공학과',
    year: 1,
    type: '진로·역량',
    memo: '전공 적성 고민',
    status: '배정완료',
    counselor: '김지도 (진로·역량)',
  },
  {
    id: 'CI-2026-0036',
    receivedAt: '08-11 14:30',
    studentId: '20229900',
    name: '오한별',
    dept: '경영학과',
    year: 4,
    type: '학업고민',
    memo: '논문 지도 연계 요청',
    status: '취소',
    counselor: null,
  },
];

// 상담 유형 구분은 색상 대신 배경 명도 단계로만 표시합니다(무채색 기조).
const TYPE_COLORS = {
  '진로·역량': { bg: '#E5E7EB', text: '#1F2937' },
  학업고민: { bg: '#F3F4F6', text: '#374151' },
  '심리·정서': { bg: '#F3F4F6', text: '#4B5563' },
  대인관계: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function CenterIntake() {
  const [rows, setRows] = useState(INITIAL);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignCounselor, setAssignCounselor] = useState('선택하세요');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [filterStatus, setFilterStatus] = useState('전체');

  const filtered = filterStatus === '전체' ? rows : rows.filter((r) => r.status === filterStatus);
  const unassigned = rows.filter((r) => r.status === '미배정').length;

  const openAssign = (row) => {
    setAssignTarget(row);
    setAssignCounselor(row.counselor ?? '선택하세요');
  };

  const submitAssign = () => {
    if (assignCounselor === '선택하세요') {
      toast('배정할 상담사를 선택해 주세요.', 'error');
      return;
    }
    if (!assignTarget) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === assignTarget.id ? { ...r, status: '배정완료', counselor: assignCounselor } : r,
      ),
    );
    toast(`${assignTarget.name}을(를) ${assignCounselor}에게 배정했습니다.`, 'success');
    setAssignTarget(null);
    setAssignCounselor('선택하세요');
  };

  const cancelIntake = (id) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: '취소', counselor: null } : r)),
    );
    toast('접수가 취소되었습니다.', 'info');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">접수·배정</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            센터 전용 — 상담 요청을 접수하고 담당 상담사를 배정합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unassigned > 0 && (
            <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706]">
              미배정 {unassigned}건
            </span>
          )}
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#F3F4F6]"
            style={{ color: ACCENT }}
          >
            센터장·직원 전용
          </span>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: '전체 접수', value: rows.length, color: ACCENT, bg: '#F3F4F6' },
          {
            label: '미배정',
            value: rows.filter((r) => r.status === '미배정').length,
            color: '#D97706',
            bg: '#FEF3C7',
          },
          {
            label: '배정완료',
            value: rows.filter((r) => r.status === '배정완료').length,
            color: '#059669',
            bg: '#D1FAE5',
          },
        ].map((t) => (
          <div
            key={t.label}
            className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 flex items-center gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
          >
            <div
              className="w-10 h-10 rounded-[8px] flex items-center justify-center text-[18px] font-black"
              style={{ background: t.bg, color: t.color }}
            >
              {t.value}
            </div>
            <span className="text-[12px] font-semibold text-[#656D76]">{t.label}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {['전체', '미배정', '배정완료', '취소'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`h-7 px-3 text-[11px] font-bold rounded-full transition-colors ${filterStatus === s ? 'text-white' : 'bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB]'}`}
            style={filterStatus === s ? { background: ACCENT } : {}}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {[
                  '접수번호',
                  '접수일시',
                  '학번',
                  '성명',
                  '학과/학년',
                  '유형',
                  '상태',
                  '배정 상담사',
                  '처리',
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 6 ? 'text-center' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const tc = TYPE_COLORS[r.type] ?? { bg: '#F3F4F6', text: '#656D76' };
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors ${r.status === '미배정' ? 'bg-[#FFFBEB]' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-[10px]" style={{ color: ACCENT }}>
                      {r.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                      {r.receivedAt}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                      {r.studentId}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1F2328]">{r.name}</td>
                    <td className="px-4 py-3 text-[#656D76]">
                      {r.dept} · {r.year}학년
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: tc.bg, color: tc.text }}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.counselor ? (
                        <span className="text-[11px] text-[#444D56]">{r.counselor}</span>
                      ) : (
                        <span className="text-[11px] text-[#D1D5DB]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => {
                            setDetailRow(r);
                            setDetailOpen(true);
                          }}
                          className="h-6 px-2 text-[9px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB] transition-colors whitespace-nowrap"
                        >
                          상세
                        </button>
                        {r.status !== '취소' && (
                          <button
                            onClick={() => openAssign(r)}
                            className="h-6 px-2 text-[9px] font-bold rounded-[4px] whitespace-nowrap transition-colors"
                            style={{ background: '#F3F4F6', color: ACCENT }}
                          >
                            {r.status === '배정완료' ? '재배정' : '배정'}
                          </button>
                        )}
                        {r.status === '미배정' && (
                          <button
                            onClick={() => cancelIntake(r.id)}
                            className="h-6 px-2 text-[9px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors whitespace-nowrap"
                          >
                            취소
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[12px] text-[#9AA0A6]">
                    해당 상태의 접수 건이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign modal */}
      <Modal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title="상담사 배정"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignTarget(null)}>
              취소
            </Button>
            <Button style={{ background: ACCENT }} onClick={submitAssign}>
              배정 확정
            </Button>
          </div>
        }
      >
        {assignTarget && (
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[12px]">
              <p className="font-bold text-[#1F2328] mb-1">
                {assignTarget.name} · {assignTarget.dept} {assignTarget.year}학년
              </p>
              <p className="text-[#656D76]">유형: {assignTarget.type}</p>
              <p className="text-[#656D76] mt-1">메모: {assignTarget.memo}</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
                담당 상담사 <span className="text-[#CF222E]">*</span>
              </label>
              <select
                value={assignCounselor}
                onChange={(e) => setAssignCounselor(e.target.value)}
                className="w-full h-9 px-2 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                style={{ borderColor: ACCENT }}
              >
                {COUNSELORS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            {assignTarget.status === '배정완료' && (
              <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[11px] text-[#92400E]">
                현재 배정 상담사: {assignTarget.counselor}. 재배정 시 기존 예약이 초기화될 수
                있습니다.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Detail modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="접수 상세"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              닫기
            </Button>
          </div>
        }
      >
        {detailRow && (
          <div className="flex flex-col gap-3 text-[12px]">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '접수번호', value: detailRow.id },
                { label: '접수일시', value: detailRow.receivedAt },
                { label: '학번', value: detailRow.studentId },
                { label: '성명', value: detailRow.name },
                { label: '학과', value: detailRow.dept },
                { label: '학년', value: `${detailRow.year}학년` },
                { label: '유형', value: detailRow.type },
                { label: '상태', value: detailRow.status },
              ].map((f) => (
                <div
                  key={f.label}
                  className="p-2.5 rounded-[6px] bg-[#F9FAFB] border border-[#E5E7EB]"
                >
                  <p className="text-[10px] text-[#9AA0A6] mb-0.5">{f.label}</p>
                  <p className="font-bold text-[#1F2328]">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB]">
              <p className="text-[10px] text-[#9AA0A6] mb-1">상담 신청 메모</p>
              <p className="text-[#444D56] leading-relaxed">{detailRow.memo}</p>
            </div>
            <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[11px] text-[#92400E]">
              🔒 상담 원문은 배정된 상담사만 열람할 수 있습니다.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
