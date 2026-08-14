import { useState } from 'react';
import {
  PageHeader,
  StatTile,
  StatusBadge,
  Pagination,
  Button,
  Modal,
  toast,
} from '@/components/common';

const ACCENT = '#2563EB';

const APPS = [
  {
    id: 'A001',
    appliedAt: '2026-03-10',
    name: '진로탐색 워크숍',
    type: '개인',
    status: '수료',
    attendance: 95,
    completed: true,
    mileage: 100,
  },
  {
    id: 'A002',
    appliedAt: '2026-03-12',
    name: '독서인증제',
    type: '개인',
    status: '활동진행',
    attendance: 67,
    completed: false,
    mileage: 0,
  },
  {
    id: 'A003',
    appliedAt: '2026-04-01',
    name: '리더십 캠프',
    type: '그룹',
    status: '승인',
    attendance: 0,
    completed: false,
    mileage: 0,
  },
  {
    id: 'A004',
    appliedAt: '2026-04-05',
    name: '영어 프레젠테이션 클리닉',
    type: '개인',
    status: '수정요청',
    attendance: 40,
    completed: false,
    mileage: 0,
  },
  {
    id: 'A005',
    appliedAt: '2026-04-10',
    name: '캡스톤디자인 경진대회',
    type: '그룹',
    status: '반려',
    attendance: 0,
    completed: false,
    mileage: 0,
  },
  {
    id: 'A006',
    appliedAt: '2026-02-20',
    name: '해외문화체험 워크숍',
    type: '개인',
    status: '수료',
    attendance: 88,
    completed: true,
    mileage: 200,
  },
  {
    id: 'A007',
    appliedAt: '2026-02-15',
    name: 'NCS 직업기초능력 특강',
    type: '개인',
    status: '미수료',
    attendance: 60,
    completed: false,
    mileage: 0,
  },
  {
    id: 'A008',
    appliedAt: '2026-05-01',
    name: '빅데이터 분석 워크숍',
    type: '개인',
    status: '대기',
    attendance: 0,
    completed: false,
    mileage: 0,
  },
];

const BTN_MAP = {
  수료: { label: '수료증', variant: 'outline' },
  활동진행: { label: '활동일지', color: ACCENT },
  승인: { label: '취소', variant: 'danger' },
  수정요청: { label: '재신청', color: ACCENT },
  반려: { label: '사유확인', variant: 'secondary' },
  미수료: { label: '이의신청', variant: 'secondary' },
  대기: { label: '취소', variant: 'outline' },
};

/**
 * @param {Object} props
 * @param {(id: string) => void} props.onActivity
 * @param {(id: string) => void} props.onSurvey
 */
export default function MyApplications({ onActivity, onSurvey }) {
  const [page, setPage] = useState(1);
  const [rejectModal, setRejectModal] = useState(false);
  const PAGE_SIZE = 8;

  const totalMileage = APPS.filter((a) => a.status === '수료').reduce((s, a) => s + a.mileage, 0);
  const paged = APPS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleBtn = (app) => {
    if (app.status === '수료') {
      onSurvey(app.id);
      return;
    }
    if (app.status === '활동진행') {
      onActivity(app.id);
      return;
    }
    if (app.status === '반려') {
      setRejectModal(true);
      return;
    }
    if (app.status === '승인' || app.status === '대기') {
      toast('취소 처리되었습니다.', 'info');
      return;
    }
    if (app.status === '수정요청') {
      toast('재신청 화면으로 이동합니다.', 'info');
      return;
    }
    toast(`${BTN_MAP[app.status].label} 처리 중...`, 'info');
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '비교과 프로그램' }, { label: '내 신청 내역' }]}
        title="내 신청 내역"
        subtitle="비교과 프로그램 신청 및 활동 이력을 관리합니다."
        accentColor={ACCENT}
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatTile label="전체 신청" value="8건" sub="이번 학기" accentColor={ACCENT} />
        <StatTile label="승인" value="6건" sub="참여 확정" accentColor="#1A7F37" />
        <StatTile label="수료" value="4건" sub="이번 학기 완료" accentColor="#7C3AED" />
        <StatTile
          label="적립 마일리지"
          value={`${totalMileage.toLocaleString()}점`}
          sub="이번 학기 누적"
          accentColor="#D97706"
        />
      </div>

      {/* FilterBar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 mb-4 flex items-end gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76] uppercase">상태</label>
          <select className="h-9 px-3 pr-7 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white appearance-none focus:outline-none focus:border-[#2563EB]">
            <option>전체</option>
            <option>수료</option>
            <option>활동진행</option>
            <option>승인</option>
            <option>수정요청</option>
            <option>반려</option>
            <option>미수료</option>
            <option>대기</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76] uppercase">프로그램명</label>
          <input
            placeholder="프로그램 검색"
            className="h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#2563EB] w-48"
          />
        </div>
        <Button size="sm" className="mb-0">
          조회
        </Button>
        <Button size="sm" variant="secondary" className="mb-0">
          초기화
        </Button>
        <span className="text-[12px] text-[#9AA0A6] ml-auto">총 {APPS.length}건</span>
      </div>

      {/* Notice */}
      <div className="flex items-center gap-2 mb-3 text-[12px] text-[#656D76]">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="#9AA0A6">
          <circle cx="8" cy="8" r="7" />
          <path d="M8 4v5M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        활동진행 상태부터는 직접 취소할 수 없습니다. 담당자에게 문의하세요.
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['신청일', '프로그램명', '구분', '상태', '출석률', '수료', '적립', '관리'].map(
                (h) => (
                  <th
                    key={h}
                    className={`px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '프로그램명' ? 'text-left' : 'text-center'}`}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {paged.map((app, i) => {
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
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${app.type === '그룹' ? 'bg-[#DBEAFE] text-[#0969DA]' : 'bg-[#F3F4F6] text-[#6E7781]'}`}
                    >
                      {app.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StatusBadge status={app.status} size="sm" />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {app.attendance > 0 ? (
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
                      <span className="text-[12px] font-bold text-[#D97706]">{app.mileage}점</span>
                    ) : (
                      <span className="text-[#9AA0A6] text-[12px]">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => handleBtn(app)}
                      className={`h-7 px-3 text-[11px] font-bold rounded-[5px] transition-colors ${
                        app.status === '반려'
                          ? 'text-[#CF222E] border border-[#CF222E] hover:bg-[#FEF2F2]'
                          : app.status === '수정요청'
                            ? 'text-white'
                            : 'border border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB]'
                      }`}
                      style={
                        app.status === '수정요청' || app.status === '활동진행'
                          ? { background: ACCENT }
                          : app.status === '수료'
                            ? { background: '#7C3AED', color: 'white' }
                            : {}
                      }
                    >
                      {btn.label}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-[#E5E7EB]">
          <Pagination
            page={page}
            totalPages={Math.ceil(APPS.length / PAGE_SIZE)}
            onChange={setPage}
            totalItems={APPS.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      </div>

      <Modal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title="반려 사유"
        size="sm"
        footer={
          <Button size="sm" onClick={() => setRejectModal(false)}>
            확인
          </Button>
        }
      >
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-4 py-3">
          <p className="text-[12px] font-semibold text-[#CF222E] mb-2">
            반려 일시: 2026-04-12 14:30
          </p>
          <p className="text-[13px] text-[#1F2328]">
            캡스톤디자인 경진대회는 공과대학 재학생을 우선 모집합니다. 신청자의 소속
            학과(컴퓨터공학과)가 해당 학기 우선모집 대상에서 제외되어 반려 처리되었습니다. 다음
            학기에 다시 신청해 주세요.
          </p>
        </div>
      </Modal>
    </div>
  );
}
