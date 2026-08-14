import { useState } from 'react';
import { PageHeader, Button, Input, toast } from '@/components/common';

const ACCENT = '#2563EB';

const INITIAL_MEMBERS = [
  {
    id: 'm1',
    studentId: '20231234',
    name: '홍길동',
    dept: '컴퓨터공학과',
    status: '대표',
    requestedAt: '2026-08-10 09:00',
  },
  {
    id: 'm2',
    studentId: '20231111',
    name: '김영희',
    dept: '경영학과',
    status: '동의 완료',
    requestedAt: '2026-08-10 09:05',
  },
  {
    id: 'm3',
    studentId: '20241002',
    name: '박철수',
    dept: '기계공학과',
    status: '대기',
    requestedAt: '2026-08-10 09:05',
  },
  {
    id: 'm4',
    studentId: '20230777',
    name: '이민수',
    dept: '산업공학과',
    status: '거절',
    requestedAt: '2026-08-10 09:10',
  },
];

const STATUS_STYLES = {
  대표: 'bg-[#DBEAFE] text-[#0969DA]',
  '동의 완료': 'bg-[#DCFCE7] text-[#1A7F37]',
  대기: 'bg-[#FEF3C7] text-[#D97706]',
  거절: 'bg-[#FEE2E2] text-[#CF222E]',
  만료: 'bg-[#F3F4F6] text-[#6E7781]',
};

/**
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {() => void} props.onComplete
 */
export default function GroupApply({ onBack, onComplete }) {
  const [teamName, setTeamName] = useState('');
  const [minMax] = useState({ min: 3, max: 5 });
  const [topic, setTopic] = useState('');
  const [searchId, setSearchId] = useState('');
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [searching, setSearching] = useState(false);

  const pendingCount = members.filter((m) => m.status === '대기').length;
  const allConfirmed = members.every((m) => m.status === '대표' || m.status === '동의 완료');
  const canConfirm = allConfirmed && teamName && topic && members.length >= minMax.min;

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    await new Promise((r) => setTimeout(r, 500));
    setSearching(false);
    toast(`학번 ${searchId}을 검색했습니다. 결과를 선택하여 추가하세요.`, 'info');
  };

  const handleRemove = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    toast('팀원이 제거되었습니다.', 'info');
  };

  const handleResend = (m) => {
    toast(`${m.name}에게 동의 요청을 재발송했습니다.`, 'success');
  };

  const handleConfirm = () => {
    toast('신청이 확정되었습니다. 담당자 승인 후 안내됩니다.', 'success');
    setTimeout(onComplete, 800);
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '비교과 프로그램', onClick: onBack }, { label: '그룹 신청' }]}
        title="그룹 비교과 신청 — 캡스톤디자인 경진대회"
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 목록으로
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4">
        {/* ── Left: Team info ── */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-[#2563EB]" />
            <h2 className="text-[14px] font-bold text-[#1F2328]">팀 정보</h2>
            <span className="text-[11px] text-[#9AA0A6] ml-1">
              최소 {minMax.min}명 ~ 최대 {minMax.max}명
            </span>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <Input
              label="팀명"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="팀 이름을 입력하세요"
            />
            <div>
              <label className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
                활동 주제
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="팀의 활동 주제나 목표를 입력해 주세요."
                rows={3}
                className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] placeholder:text-[#9AA0A6]"
              />
            </div>

            {/* Member search */}
            <div>
              <label className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
                팀원 검색 및 추가
              </label>
              <div className="flex gap-2">
                <input
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="학번 또는 이름으로 검색"
                  className="flex-1 h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button size="sm" variant="secondary" onClick={handleSearch} loading={searching}>
                  검색
                </Button>
              </div>
              <p className="text-[11px] text-[#9AA0A6] mt-1.5">
                검색 후 결과에서 추가할 수 있습니다. 동의 요청 알림이 발송됩니다.
              </p>
            </div>

            {/* Team count */}
            <div className="flex items-center justify-between text-[12px] bg-[#F6F8FA] rounded-[6px] px-4 py-3">
              <span className="text-[#656D76]">현재 팀원</span>
              <span
                className={`font-black text-[16px] ${members.length < minMax.min ? 'text-[#CF222E]' : members.length > minMax.max ? 'text-[#CF222E]' : 'text-[#2563EB]'}`}
              >
                {members.length}명
              </span>
              <span className="text-[#9AA0A6]">/ 최소 {minMax.min}명 이상</span>
            </div>
          </div>
        </div>

        {/* ── Right: Member & consent ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden flex-1">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-[#2563EB]" />
              <h2 className="text-[14px] font-bold text-[#1F2328]">팀원 및 동의 현황</h2>
              <span
                className="ml-auto text-[12px] font-bold"
                style={{ color: allConfirmed ? '#1A7F37' : '#D97706' }}
              >
                {members.filter((m) => m.status === '동의 완료' || m.status === '대표').length}/
                {members.length} 동의
              </span>
            </div>

            {/* Pending notice */}
            {pendingCount > 0 && (
              <div className="mx-5 mt-4 bg-[#FEF3C7] border border-[#FDE68A] rounded-[6px] px-4 py-3 flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="#D97706">
                  <path d="M8 1L1 14h14L8 1z" />
                  <path
                    d="M8 6v4M8 12h.01"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[12px] text-[#92400E] font-semibold">
                  팀원 {pendingCount}명의 동의가 남아 있습니다. 전원 동의 완료 시 신청이 확정됩니다.
                </span>
              </div>
            )}

            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="bg-[#F6F8FA] text-[#656D76] text-[11px] uppercase tracking-wide">
                      <th className="text-left px-3 py-2.5 font-semibold">구분</th>
                      <th className="text-left px-3 py-2.5 font-semibold">학번</th>
                      <th className="text-left px-3 py-2.5 font-semibold">성명</th>
                      <th className="text-left px-3 py-2.5 font-semibold">학과</th>
                      <th className="text-center px-3 py-2.5 font-semibold">동의상태</th>
                      <th className="text-right px-3 py-2.5 font-semibold">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, i) => (
                      <tr
                        key={m.id}
                        className={`border-t border-[#E5E7EB] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                      >
                        <td className="px-3 py-2.5">
                          {m.status === '대표' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#0969DA]">
                              대표
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#9AA0A6]">팀원</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px]">{m.studentId}</td>
                        <td className="px-3 py-2.5 font-semibold text-[#1F2328]">{m.name}</td>
                        <td className="px-3 py-2.5 text-[#656D76]">{m.dept}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[m.status]}`}
                          >
                            {m.status === '대표'
                              ? '본인'
                              : m.status === '대기'
                                ? '대기 (D-1)'
                                : m.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {m.status === '대기' && (
                            <button
                              onClick={() => handleResend(m)}
                              className="text-[11px] text-[#2563EB] hover:underline font-semibold mr-2"
                            >
                              재요청
                            </button>
                          )}
                          {m.status !== '대표' && (
                            <button
                              onClick={() => handleRemove(m.id)}
                              className="text-[11px] text-[#CF222E] hover:underline font-semibold"
                            >
                              제거
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 justify-center !text-[#2563EB] !border-[#2563EB]"
                  onClick={() => toast('동의 재요청을 전원에게 발송했습니다.', 'success')}
                >
                  동의 재요청
                </Button>
                <Button
                  size="sm"
                  className="flex-1 justify-center"
                  disabled={!canConfirm}
                  style={{ background: canConfirm ? ACCENT : undefined }}
                  onClick={handleConfirm}
                >
                  신청 확정
                </Button>
              </div>
            </div>
          </div>

          {/* ── AlimTalk preview ── */}
          <div className="bg-[#FEF9C3] border border-[#FDE68A] rounded-[8px] p-4">
            <div className="text-[11px] font-bold text-[#854D0E] uppercase tracking-wide mb-3">
              📨 알림톡 미리보기 (팀원 수신)
            </div>
            <div className="bg-white rounded-[8px] border border-[#FDE68A] p-4 shadow-sm">
              <div className="text-[12px] font-bold text-[#1F2328] mb-2">
                [한국대학교] 비교과 그룹 신청 동의 요청
              </div>
              <div className="text-[12px] text-[#656D76] leading-relaxed mb-3">
                <strong>홍길동</strong> 학생이 그룹 비교과 프로그램에 팀원으로 초대했습니다.
                <br />
                <br />
                📋 프로그램: 캡스톤디자인 경진대회
                <br />
                🏫 팀명: {teamName || '(팀명 미입력)'}
                <br />
                📅 운영기간: 2026-08-10 ~ 2026-08-31
                <br />
                <br />
                아래 버튼을 클릭하여 동의 여부를 선택해 주세요.
                <br />
                <span className="text-[#9AA0A6] text-[11px]">
                  ※ 24시간 내 미응답 시 자동 만료됩니다.
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-8 bg-[#2563EB] rounded-[6px] flex items-center justify-center text-white text-[12px] font-bold">
                  동의하기
                </div>
                <div className="flex-1 h-8 bg-[#F3F4F6] rounded-[6px] flex items-center justify-center text-[#656D76] text-[12px] font-semibold">
                  거절
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
