import { useState } from 'react';
import { PageHeader, Tabs, Button, Modal, Drawer, StatusBadge, toast } from '@/components/common';

const ACCENT = '#0891B2';

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const RESERVATIONS = [
  {
    id: 'CS-2026-0331',
    type: '지도교수 진로·역량 상담',
    counselor: '김상담 지도교수',
    datetime: '2026-08-13 14:00',
    location: '산학협력관 305호',
    status: '신청',
    isToday: true,
  },
  {
    id: 'CS-2026-0330',
    type: '상담센터 개인상담',
    counselor: '이전문 전문상담사',
    datetime: '2026-08-20 10:00',
    location: '학생상담센터 201호',
    status: '예정',
  },
  {
    id: 'CS-2026-0312',
    type: '상담센터 개인상담',
    counselor: '이전문 전문상담사',
    datetime: '2026-08-15 15:00',
    location: '학생상담센터 201호',
    status: '배정대기',
  },
  {
    id: 'CS-2026-0290',
    type: '지도교수 진로·역량 상담',
    counselor: '김상담 지도교수',
    datetime: '2026-07-30 11:00',
    location: '산학협력관 305호',
    status: '진행',
  },
  {
    id: 'CS-2026-0241',
    type: '지도교수 진로·역량 상담',
    counselor: '김상담 지도교수',
    datetime: '2026-06-15 14:00',
    location: '산학협력관 305호',
    status: '완료',
  },
  {
    id: 'CS-2026-0190',
    type: '심리검사 · 해석상담',
    counselor: '박심리 전문상담사',
    datetime: '2026-05-20 10:00',
    location: '학생상담센터 202호',
    status: '종결',
  },
  {
    id: 'CS-2026-0130',
    type: '상담센터 개인상담',
    counselor: '이전문 전문상담사',
    datetime: '2026-04-10 13:00',
    location: '학생상담센터 201호',
    status: '반려',
    rejectReason:
      '동일 유형 상담이 진행 중인 경우 중복 신청이 불가합니다. 기존 상담 종결 후 재신청해 주세요.',
  },
  {
    id: 'CS-2026-0091',
    type: '지도교수 진로·역량 상담',
    counselor: '김상담 지도교수',
    datetime: '2026-03-05 09:00',
    location: '산학협력관 305호',
    status: '취소',
  },
];

const LOCKED_STATUSES = ['진행', '완료', '종결', '취소'];

// ─── History records ──────────────────────────────────────────────────────────

const HISTORY = [
  {
    id: 'H001',
    date: '2026-06-15',
    type: '지도교수 진로·역량 상담',
    counselor: '김상담 지도교수',
    status: '완료',
    publicSummary:
      '졸업 후 진로 방향 탐색 및 부족한 역량 강화 방안 논의. 취업 또는 대학원 진학 두 경로를 구체적으로 비교·분석하고 단기 목표를 수립하였음.',
    actionPlan: [
      '이번 학기 내 TOEIC 860점 이상 취득 목표 수립',
      '9월 캡스톤디자인 경진대회 참가 신청',
      '취업 포트폴리오 초안 작성 (10월 말까지)',
      '대학원 지도교수 1:1 상담 신청 예약',
    ],
    recommendedPrograms: [
      { name: '진로탐색 워크숍', dept: '취업지원팀', credit: 3, deadline: '2026-08-31' },
      { name: '영어 프레젠테이션 클리닉', dept: '국제교류처', credit: 2, deadline: '2026-09-15' },
    ],
  },
  {
    id: 'H002',
    date: '2026-05-20',
    type: '심리검사 · 해석상담',
    counselor: '박심리 전문상담사',
    status: '종결',
    publicSummary:
      'MBTI 및 MMPI-2 검사 실시 후 해석상담 진행. 성격 특성 및 현재 심리 상태 파악, 스트레스 관리 전략 수립에 집중하였음.',
    actionPlan: [
      '매일 15분 마음챙김 명상 실천',
      '수면 규칙화 — 오전 1시 전 취침 목표',
      '상담센터 집단상담 프로그램 참여 권고',
    ],
    recommendedPrograms: [
      { name: '마음건강 집단상담', dept: '학생상담센터', credit: 0, deadline: '2026-09-01' },
      { name: '스트레스 관리 특강', dept: '학생처', credit: 1, deadline: '2026-08-20' },
    ],
  },
];

// ─── Psych tests ──────────────────────────────────────────────────────────────

const PSYCH_TESTS = [
  {
    id: 'PT001',
    name: 'MBTI',
    appliedAt: '2026-08-10',
    status: '코드발송',
    deadline: '2026-08-17',
    isExpired: false,
  },
  {
    id: 'PT002',
    name: 'MMPI-2',
    appliedAt: '2026-07-25',
    status: '응시중',
    deadline: '2026-08-01',
    isExpired: false,
  },
  {
    id: 'PT003',
    name: 'Holland 진로탐색검사',
    appliedAt: '2026-06-01',
    status: '결과처리중',
    deadline: '2026-06-08',
    isExpired: false,
  },
  {
    id: 'PT004',
    name: 'Strong 직업흥미검사',
    appliedAt: '2026-05-10',
    status: '해석예약가능',
    deadline: '2026-05-17',
    isExpired: false,
  },
  {
    id: 'PT005',
    name: 'MBTI',
    appliedAt: '2026-03-15',
    status: '완료',
    deadline: '2026-03-22',
    isExpired: false,
  },
  {
    id: 'PT006',
    name: 'TCI 기질·성격검사',
    appliedAt: '2026-02-20',
    status: '만료',
    deadline: '2026-02-27',
    isExpired: true,
  },
];

const PSYCH_STATUS_STYLES = {
  코드발송: 'bg-[#DBEAFE] text-[#0969DA]',
  응시중: 'bg-[#DBEAFE] text-[#0969DA]',
  결과처리중: 'bg-[#FEF3C7] text-[#D97706]',
  해석예약가능: 'bg-[#DCFCE7] text-[#1A7F37]',
  완료: 'bg-[#F3F4F6] text-[#6E7781]',
  만료: 'bg-[#F3F4F6] text-[#9AA0A6]',
};

const PSYCH_STATUS_DESC = {
  코드발송: '검사 코드가 이메일로 발송되었습니다. 기한 내 응시하세요.',
  응시중: '검사를 진행 중입니다. 제출기한을 확인하세요.',
  결과처리중: '응시가 완료되어 결과를 처리 중입니다.',
  해석예약가능: '결과 처리가 완료되었습니다. 해석상담을 예약하세요.',
  완료: '해석상담이 완료되었습니다.',
  만료: '제출기한이 경과하여 만료되었습니다. 재신청이 필요합니다.',
};

// ─── Status badge overrides ───────────────────────────────────────────────────
// 예약 상태는 공용 StatusBadge의 사전에 없는 값(신청/예정/배정대기 등)이 섞여 있어
// 이 화면 전용 색상표로 별도 배지를 그립니다. (상담 이력 탭은 공용 StatusBadge를 그대로 씁니다.)

const RESV_BADGE_STYLES = {
  신청: 'bg-[#DBEAFE] text-[#0969DA]',
  예정: 'bg-[#DBEAFE] text-[#0969DA]',
  배정대기: 'bg-[#FEF3C7] text-[#D97706]',
  진행: 'bg-[#DBEAFE] text-[#0969DA]',
  완료: 'bg-[#DCFCE7] text-[#1A7F37]',
  종결: 'bg-[#F3F4F6] text-[#6E7781]',
  반려: 'bg-[#FEE2E2] text-[#CF222E]',
  취소: 'bg-[#F3F4F6] text-[#9AA0A6]',
};

function ResvBadge({ status }) {
  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${RESV_BADGE_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Tab: 예약 현황 ───────────────────────────────────────────────────────────

function ReservationTab({ onApply }) {
  const [cancelModal, setCancelModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetail, setCancelDetail] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  const handleCancel = async () => {
    setCancelling(true);
    await new Promise((r) => setTimeout(r, 600));
    setCancelling(false);
    setCancelModal(null);
    toast('예약이 취소되었습니다.', 'success');
  };

  const isLocked = (r) => LOCKED_STATUSES.includes(r.status) || r.isToday;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#9AA0A6]">총 {RESERVATIONS.length}건</p>
        <Button size="sm" style={{ background: ACCENT }} onClick={onApply}>
          + 상담 신청
        </Button>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['예약번호', '상담유형', '상담사', '일시', '장소', '상태', '관리'].map((h) => (
                <th
                  key={h}
                  className={`px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${['상담유형', '상담사'].includes(h) ? 'text-left' : 'text-center'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESERVATIONS.map((r, i) => {
              const locked = isLocked(r);
              return (
                <tr
                  key={r.id}
                  className={`border-b border-[#F3F4F6] last:border-0 ${r.isToday ? 'bg-[#F0FDFE]' : i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                >
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`font-mono font-bold text-[11px] ${r.isToday ? 'text-[#0891B2]' : 'text-[#656D76]'}`}
                    >
                      {r.id}
                    </span>
                    {r.isToday && (
                      <div className="text-[9px] font-black text-white bg-[#CF222E] rounded-full px-1.5 py-0.5 mt-0.5 inline-block ml-1">
                        TODAY
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 font-semibold text-[#1F2328]">{r.type}</td>
                  <td className="px-3 py-3 text-[#656D76]">{r.counselor}</td>
                  <td className="px-3 py-3 text-center text-[#656D76] whitespace-nowrap">
                    {r.datetime}
                  </td>
                  <td className="px-3 py-3 text-center text-[12px] text-[#656D76]">{r.location}</td>
                  <td className="px-3 py-3 text-center">
                    <ResvBadge status={r.status} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* 예정: 변경 + 취소 */}
                      {r.status === '예정' && (
                        <>
                          <div
                            className="relative"
                            onMouseEnter={() => (locked ? setTooltip(r.id + 'ch') : null)}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <button
                              disabled={locked}
                              onClick={() =>
                                !locked && toast('일정 변경 화면으로 이동합니다.', 'info')
                              }
                              className={`h-6 px-2.5 text-[11px] font-bold rounded-[5px] border transition-colors ${locked ? 'border-[#E5E7EB] text-[#C8D0D9] cursor-not-allowed' : 'border-[#0891B2] text-[#0891B2] hover:bg-[#F0FDFE]'}`}
                            >
                              변경
                            </button>
                            {tooltip === r.id + 'ch' && (
                              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#1F2328] text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-[6px] whitespace-nowrap z-10 shadow-lg">
                                마감 후에는 변경·취소할 수 없습니다.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1F2328]" />
                              </div>
                            )}
                          </div>
                          <div
                            className="relative"
                            onMouseEnter={() => (locked ? setTooltip(r.id + 'ca') : null)}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <button
                              disabled={locked}
                              onClick={() => !locked && setCancelModal(r)}
                              className={`h-6 px-2.5 text-[11px] font-bold rounded-[5px] border transition-colors ${locked ? 'border-[#E5E7EB] text-[#C8D0D9] cursor-not-allowed' : 'border-[#FEE2E2] text-[#CF222E] hover:bg-[#FEF2F2]'}`}
                            >
                              취소
                            </button>
                            {tooltip === r.id + 'ca' && (
                              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#1F2328] text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-[6px] whitespace-nowrap z-10 shadow-lg">
                                마감 후에는 변경·취소할 수 없습니다.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1F2328]" />
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* 신청 / 배정대기: 취소만 */}
                      {(r.status === '신청' || r.status === '배정대기') && (
                        <button
                          onClick={() => setCancelModal(r)}
                          className="h-6 px-2.5 text-[11px] font-bold rounded-[5px] border border-[#FEE2E2] text-[#CF222E] hover:bg-[#FEF2F2] transition-colors"
                        >
                          취소
                        </button>
                      )}

                      {/* 반려: 사유 확인 */}
                      {r.status === '반려' && (
                        <button
                          onClick={() => setRejectModal(r)}
                          className="h-6 px-2.5 text-[11px] font-bold rounded-[5px] border border-[#E5E7EB] text-[#656D76] hover:border-[#CF222E] hover:text-[#CF222E] transition-colors"
                        >
                          사유확인
                        </button>
                      )}

                      {/* Locked states: no button or dash */}
                      {['진행', '완료', '종결', '취소'].includes(r.status) && (
                        <span className="text-[11px] text-[#C8D0D9]">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cancel modal */}
      <Modal
        open={cancelModal !== null}
        onClose={() => setCancelModal(null)}
        title="예약 취소"
        size="md"
        footer={
          <>
            <Button size="sm" variant="secondary" onClick={() => setCancelModal(null)}>
              닫기
            </Button>
            <Button
              size="sm"
              loading={cancelling}
              style={{ background: '#CF222E' }}
              onClick={handleCancel}
            >
              취소 확정
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] px-4 py-3 text-[12px] text-[#656D76]">
            <span className="font-bold text-[#1F2328]">{cancelModal?.id}</span>
            {' · '}
            {cancelModal?.datetime}
            {' · '}
            {cancelModal?.counselor}
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
              취소 사유 <span className="text-[#CF222E]">*</span>
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#0891B2] appearance-none"
            >
              <option value="">선택하세요</option>
              <option value="personal">개인 사정</option>
              <option value="reschedule">일정 변경</option>
              <option value="other">기타</option>
            </select>
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
              상세 사유 <span className="text-[#9AA0A6] font-normal">(선택)</span>
            </label>
            <textarea
              value={cancelDetail}
              onChange={(e) => setCancelDetail(e.target.value)}
              placeholder="추가로 알려주실 내용을 입력해 주세요."
              rows={3}
              className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#0891B2] placeholder:text-[#9AA0A6]"
            />
          </div>

          <div className="flex items-start gap-2 bg-[#FEF3C7] border border-[#FDE68A] rounded-[6px] px-3 py-2.5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="#D97706"
              className="flex-shrink-0 mt-0.5"
            >
              <path d="M8 1L1 14h14L8 1z" />
              <path d="M8 6v4M8 12h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] text-[#92400E]">
              취소한 시간은 다른 학생이 예약할 수 있습니다. 신중하게 결정해 주세요.
            </p>
          </div>
        </div>
      </Modal>

      {/* Reject reason modal */}
      <Modal
        open={rejectModal !== null}
        onClose={() => setRejectModal(null)}
        title="반려 사유"
        size="sm"
        footer={
          <Button size="sm" onClick={() => setRejectModal(null)}>
            확인
          </Button>
        }
      >
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-4 py-3">
          <p className="text-[11px] font-bold text-[#CF222E] mb-1.5">처리 일시: 2026-04-11 09:30</p>
          <p className="text-[13px] text-[#1F2328] leading-relaxed">{rejectModal?.rejectReason}</p>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab: 상담 이력 ───────────────────────────────────────────────────────────

function HistoryTab() {
  const [drawerRecord, setDrawerRecord] = useState(null);

  return (
    <div>
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['상담일', '상담유형', '상담사', '상태', '공개 요약', ''].map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${['상담유형', '상담사', '공개 요약'].includes(h) ? 'text-left' : 'text-center'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HISTORY.map((h, i) => (
              <tr
                key={h.id}
                className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#F0FDFE] transition-colors ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
              >
                <td className="px-4 py-3 text-center text-[#9AA0A6] font-mono whitespace-nowrap">
                  {h.date}
                </td>
                <td className="px-4 py-3 font-semibold text-[#1F2328]">{h.type}</td>
                <td className="px-4 py-3 text-[#656D76]">{h.counselor}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={h.status} size="sm" />
                </td>
                <td className="px-4 py-3 max-w-[260px]">
                  <p className="text-[12px] text-[#656D76] leading-snug line-clamp-2">
                    {h.publicSummary}
                  </p>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setDrawerRecord(h)}
                    className="h-6 px-2.5 text-[11px] font-bold rounded-[5px] border transition-colors hover:bg-[#F0FDFE]"
                    style={{ borderColor: ACCENT, color: ACCENT }}
                  >
                    상세보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      <Drawer
        open={drawerRecord !== null}
        onClose={() => setDrawerRecord(null)}
        title="상담 이력 상세"
        footer={
          <Button size="sm" variant="secondary" onClick={() => setDrawerRecord(null)}>
            닫기
          </Button>
        }
      >
        {drawerRecord && (
          <div className="flex flex-col gap-5 py-2">
            {/* Meta */}
            <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[8px] px-4 py-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#0E7490]">{drawerRecord.type}</span>
                <StatusBadge status={drawerRecord.status} size="sm" />
              </div>
              <div className="flex gap-3 text-[12px] text-[#0891B2]">
                <span>📅 {drawerRecord.date}</span>
                <span>👤 {drawerRecord.counselor}</span>
              </div>
            </div>

            {/* Public summary */}
            <div>
              <h3 className="text-[13px] font-bold text-[#1F2328] mb-2 flex items-center gap-1.5">
                <div className="w-1 h-3.5 rounded-full" style={{ background: ACCENT }} />
                공개 요약
              </h3>
              <p className="text-[13px] text-[#444D56] leading-relaxed bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] px-4 py-3">
                {drawerRecord.publicSummary}
              </p>
            </div>

            {/* Action plan */}
            <div>
              <h3 className="text-[13px] font-bold text-[#1F2328] mb-2 flex items-center gap-1.5">
                <div className="w-1 h-3.5 rounded-full bg-[#7C3AED]" />
                실행계획
              </h3>
              <div className="bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] px-4 py-3">
                <ol className="flex flex-col gap-2">
                  {drawerRecord.actionPlan.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-[13px] text-[#1F2328]">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 mt-0.5"
                        style={{ background: ACCENT }}
                      >
                        {idx + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Recommended programs */}
            <div>
              <h3 className="text-[13px] font-bold text-[#1F2328] mb-2 flex items-center gap-1.5">
                <div className="w-1 h-3.5 rounded-full bg-[#2563EB]" />
                추천 비교과 프로그램
              </h3>
              <div className="flex flex-col gap-2">
                {drawerRecord.recommendedPrograms.map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-[#1F2328]">{p.name}</p>
                      <div className="flex gap-2 mt-0.5 text-[11px] text-[#9AA0A6]">
                        <span>{p.dept}</span>
                        {p.credit > 0 && <span>· {p.credit}학점</span>}
                        <span>· 마감 {p.deadline}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toast(`${p.name} 신청 화면으로 이동합니다.`, 'info')}
                      className="h-7 px-3 text-[11px] font-bold rounded-[6px] text-white whitespace-nowrap"
                      style={{ background: '#2563EB' }}
                    >
                      신청
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Private notice */}
            <div className="flex items-start gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-4 py-3">
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="#9AA0A6"
                className="flex-shrink-0 mt-0.5"
              >
                <circle cx="8" cy="8" r="7" />
                <path d="M8 4v5M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-[12px] text-[#9AA0A6] leading-snug">
                상담사가 작성한 상세 상담기록은 비공개입니다.
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ─── Tab: 심리검사 ────────────────────────────────────────────────────────────

function PsychTab() {
  return (
    <div className="flex flex-col gap-4">
      {/* Info banner */}
      <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[8px] px-5 py-3 flex items-start gap-3">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill={ACCENT}
          className="flex-shrink-0 mt-0.5"
        >
          <circle cx="8" cy="8" r="7" />
          <path d="M8 4v5M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-[12px] text-[#164E63]">
          해석상담 예약은 결과 처리 완료 후 활성화됩니다. 처리 기간은 응시 후 약 3~5 영업일
          소요됩니다.
        </p>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['검사명', '신청일', '상태', '제출기한', '안내', '관리'].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${['검사명', '안내'].includes(h) ? 'text-left' : 'text-center'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PSYCH_TESTS.map((t, i) => {
              const canBook = t.status === '해석예약가능';
              const expired = t.isExpired || t.status === '만료';
              return (
                <tr
                  key={t.id}
                  className={`border-b border-[#F3F4F6] last:border-0 ${expired ? 'opacity-60' : ''} ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                >
                  <td className="px-4 py-3 font-bold text-[#1F2328]">{t.name}</td>
                  <td className="px-4 py-3 text-center text-[#9AA0A6] font-mono">{t.appliedAt}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${PSYCH_STATUS_STYLES[t.status]}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-mono text-[12px] ${expired ? 'text-[#CF222E] line-through' : 'text-[#656D76]'}`}
                    >
                      {t.deadline}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-[11px] text-[#9AA0A6] leading-snug">
                      {PSYCH_STATUS_DESC[t.status]}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {expired ? (
                      <button
                        onClick={() => toast('재신청 화면으로 이동합니다.', 'info')}
                        className="h-6 px-2.5 text-[11px] font-bold rounded-[5px] border border-[#E5E7EB] text-[#656D76] hover:border-[#0891B2] hover:text-[#0891B2] transition-colors"
                      >
                        재신청
                      </button>
                    ) : t.status === '완료' ? (
                      <span className="text-[11px] text-[#C8D0D9]">—</span>
                    ) : (
                      <div className="relative inline-block group">
                        <button
                          disabled={!canBook}
                          onClick={() =>
                            canBook && toast('해석상담 예약 화면으로 이동합니다.', 'info')
                          }
                          className={`h-6 px-2.5 text-[11px] font-bold rounded-[5px] border transition-colors ${canBook ? 'text-white border-transparent' : 'border-[#E5E7EB] text-[#C8D0D9] cursor-not-allowed'}`}
                          style={canBook ? { background: ACCENT } : {}}
                        >
                          해석상담 예약
                        </button>
                        {!canBook && (
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#1F2328] text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-[6px] whitespace-nowrap z-10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            결과 처리 후 예약할 수 있습니다.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1F2328]" />
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {() => void} props.onApply
 */
export default function MyCounseling({ onApply }) {
  const [tab, setTab] = useState('reservation');

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '학생상담' }, { label: '내 상담' }]}
        title="내 상담"
        subtitle="예약 현황, 상담 이력, 심리검사 결과를 확인하세요."
        accentColor={ACCENT}
        actions={
          <Button size="sm" style={{ background: ACCENT }} onClick={onApply}>
            + 상담 신청
          </Button>
        }
      />

      <div className="mb-5">
        <Tabs
          tabs={[
            { key: 'reservation', label: '예약 현황' },
            { key: 'history', label: '상담 이력' },
            { key: 'psych', label: '심리검사' },
          ]}
          active={tab}
          onChange={setTab}
          accentColor={ACCENT}
        />
      </div>

      {tab === 'reservation' && <ReservationTab onApply={onApply} />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'psych' && <PsychTab />}
    </div>
  );
}
