import { useState } from 'react';
import {
  PageHeader,
  Tabs,
  StatusBadge,
  ProgressBar,
  Modal,
  FileUpload,
  Button,
  toast,
} from '@/components/common';

const ACCENT = '#2563EB';

// 이 화면(회차별 출결 상세, 활동일지 제출/조회, 결과보고서 제출)은 이번 연동 범위에서 제외됨.
// 백엔드에 학생이 자기 출결을 조회하는 API가 없고(교직원용 GET/PUT만 존재), 활동일지·결과보고
// 관련 API 자체가 없어 아래는 모두 데모용 고정 데이터로 남아있습니다.
const ATTEND = [
  { round: 1, date: '2026-08-12 (수) 10:00', method: 'QR', status: '출석' },
  { round: 2, date: '2026-08-14 (금) 10:00', method: 'QR', status: '출석' },
  { round: 3, date: '2026-08-19 (수) 10:00', method: '온라인', status: '출석' },
  { round: 4, date: '2026-08-21 (금) 10:00', method: 'QR', status: '지각' },
  { round: 5, date: '2026-08-26 (수) 10:00', method: 'QR', status: '미확인' },
];

const ATT_STYLES = {
  출석: 'bg-[#DCFCE7] text-[#1A7F37]',
  결석: 'bg-[#FEE2E2] text-[#CF222E]',
  지각: 'bg-[#FEF3C7] text-[#D97706]',
  미확인: 'bg-[#F3F4F6] text-[#6E7781]',
};

const LOGS = [
  { round: 1, status: '제출' },
  { round: 2, status: '제출' },
  {
    round: 3,
    status: '반려',
    rejectedReason: '활동 내용이 너무 짧습니다. 200자 이상으로 보완하여 재제출하세요.',
  },
  { round: 4, status: '미제출' },
  { round: 5, status: '미제출' },
];

/**
 * @param {Object} props
 * @param {() => void} props.onBack
 */
export default function ActivityManage({ onBack }) {
  const [tab, setTab] = useState('attend');
  const [logModal, setLogModal] = useState(null);
  const [logContent, setLogContent] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);

  const attended = ATTEND.filter((a) => a.status === '출석').length;
  const attendRate = Math.round((attended / ATTEND.length) * 100);
  const todayRound = ATTEND[4];

  const handleLogSave = async () => {
    setSavingLog(true);
    await new Promise((r) => setTimeout(r, 500));
    setSavingLog(false);
    toast('임시 저장되었습니다.', 'success');
  };

  const handleLogSubmit = async () => {
    if (!logContent.trim()) {
      toast('활동일지 내용을 입력해주세요.', 'warning');
      return;
    }
    setSubmittingLog(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmittingLog(false);
    setLogModal(null);
    toast('활동일지가 제출되었습니다.', 'success');
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: '비교과 프로그램' },
          { label: '내 신청 내역', onClick: onBack },
          { label: '활동 관리' },
        ]}
        title="활동 관리"
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 내역으로
          </Button>
        }
      />

      {/* Program summary */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[16px] font-bold text-[#1F2328]">해외문화체험 워크숍</span>
              <StatusBadge status="활동진행" />
            </div>
            <div className="flex gap-4 text-[12px] text-[#656D76]">
              <span>📅 2026-08-12 ~ 2026-08-26 (5회차)</span>
              <span>👤 담당자: 김담당 (국제교류처)</span>
              <span>📍 국제관 201호</span>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-[24px] font-black ${attendRate >= 80 ? 'text-[#1A7F37]' : 'text-[#CF222E]'}`}
            >
              {attendRate}%
            </div>
            <div className="text-[11px] text-[#9AA0A6]">출석률 (기준 80%)</div>
          </div>
        </div>
        <ProgressBar
          value={attendRate}
          color={attendRate >= 80 ? '#1A7F37' : '#CF222E'}
          showValue
        />
        <div className="flex gap-4 mt-3 text-[12px] text-[#656D76]">
          <span>
            출석 <strong className="text-[#1A7F37]">{attended}회</strong>
          </span>
          <span>
            결석 <strong className="text-[#CF222E]">0회</strong>
          </span>
          <span>
            지각 <strong className="text-[#D97706]">1회</strong>
          </span>
          <span>
            활동일지 제출{' '}
            <strong className="text-[#2563EB]">
              {LOGS.filter((l) => l.status === '제출').length}회
            </strong>
          </span>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'attend', label: '출결 현황' },
          { key: 'log', label: '활동일지' },
          { key: 'report', label: '결과보고' },
        ]}
        active={tab}
        onChange={setTab}
        accentColor={ACCENT}
      />

      {/* ── ATTEND TAB ── */}
      {tab === 'attend' && (
        <div className="flex flex-col gap-4">
          {/* Today QR card */}
          <div className="bg-[#EFF6FF] border-2 border-[#2563EB] rounded-[10px] p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-black text-white bg-[#CF222E] px-2 py-0.5 rounded-full">
                  오늘
                </span>
                <span className="text-[14px] font-bold text-[#1E3A8A]">
                  5회차 · 2026-08-26 (수) 10:00
                </span>
              </div>
              <p className="text-[12px] text-[#3B82F6]">
                QR 코드를 스캔하여 출석을 인증하세요. 수업 시작 10분 내에 인증 가능합니다.
              </p>
            </div>
            <Button
              size="md"
              style={{ background: ACCENT }}
              icon={
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" />
                  <rect x="11" y="11" width="4" height="4" rx="0.5" />
                </svg>
              }
            >
              QR 코드 보기
            </Button>
          </div>

          {/* Attend table */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#656D76] uppercase">
                    회차
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#656D76] uppercase">
                    일시
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#656D76] uppercase">
                    출석방식
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#656D76] uppercase">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {ATTEND.map((a, i) => (
                  <tr
                    key={a.round}
                    className={`border-b border-[#E5E7EB] last:border-0 ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} ${a.round === todayRound.round ? 'ring-1 ring-inset ring-[#BFDBFE]' : ''}`}
                  >
                    <td className="px-4 py-3 font-semibold text-[#1F2328]">
                      {a.round}회차
                      {a.round === todayRound.round && (
                        <span className="ml-2 text-[10px] font-black text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded-full">
                          오늘
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#656D76]">{a.date}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                        {a.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${ATT_STYLES[a.status]}`}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LOG TAB ── */}
      {tab === 'log' && (
        <div className="flex flex-col gap-3">
          {LOGS.map((log) => (
            <div
              key={log.round}
              className="bg-white rounded-[8px] border border-[#E5E7EB] p-5 flex items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[14px] font-black text-[#2563EB] flex-shrink-0">
                {log.round}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-bold text-[#1F2328]">
                    {log.round}회차 활동일지
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.status === '제출' ? 'bg-[#DCFCE7] text-[#1A7F37]' : log.status === '반려' ? 'bg-[#FEE2E2] text-[#CF222E]' : 'bg-[#F3F4F6] text-[#6E7781]'}`}
                  >
                    {log.status}
                  </span>
                </div>
                <div className="text-[12px] text-[#9AA0A6]">{ATTEND[log.round - 1]?.date}</div>
                {log.status === '반려' && log.rejectedReason && (
                  <div className="mt-2 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-3 py-2">
                    <p className="text-[11px] text-[#CF222E]">
                      <strong>반려 사유:</strong> {log.rejectedReason}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setLogModal(log.round)}
                className={`h-8 px-4 text-[12px] font-bold rounded-[6px] transition-colors ${log.status === '반려' ? 'bg-[#CF222E] text-white hover:bg-[#B91C1C]' : log.status === '제출' ? 'border border-[#E5E7EB] text-[#656D76] hover:bg-[#F9FAFB]' : 'text-white'}`}
                style={log.status === '미제출' ? { background: ACCENT } : {}}
              >
                {log.status === '반려' ? '재작성' : log.status === '제출' ? '수정' : '작성'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── REPORT TAB ── */}
      {tab === 'report' && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-[#2563EB]" />
            <h2 className="text-[14px] font-bold text-[#1F2328]">결과보고서</h2>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
                결과보고 내용
              </label>
              <textarea
                placeholder="프로그램 참여 결과, 소감, 배운 점 등을 작성해 주세요."
                rows={5}
                className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#2563EB] placeholder:text-[#9AA0A6]"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
                지출내역 및 영수증{' '}
                <span className="text-[#9AA0A6] font-normal text-[12px]">
                  (예산 지원 프로그램에 한함)
                </span>
              </label>
              <FileUpload accept=".pdf,.jpg,.png" maxSize="5MB" multiple />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast('임시 저장되었습니다.', 'success')}
              >
                임시 저장
              </Button>
              <Button
                size="sm"
                style={{ background: ACCENT }}
                onClick={() => toast('결과보고서가 제출되었습니다.', 'success')}
              >
                제출
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Log write modal */}
      <Modal
        open={logModal !== null}
        onClose={() => setLogModal(null)}
        title={`${logModal}회차 활동일지 작성`}
        size="lg"
        footer={
          <>
            <Button size="sm" variant="secondary" loading={savingLog} onClick={handleLogSave}>
              임시 저장
            </Button>
            <Button
              size="sm"
              loading={submittingLog}
              style={{ background: ACCENT }}
              onClick={handleLogSubmit}
            >
              제출
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] px-4 py-3 text-[12px] text-[#656D76]">
            📅 {ATTEND[(logModal ?? 1) - 1]?.date} · 담당자 확인 후 승인됩니다.
          </div>
          {LOGS[(logModal ?? 1) - 1]?.status === '반려' && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-3 py-2">
              <p className="text-[11px] text-[#CF222E]">
                <strong>반려 사유:</strong> {LOGS[(logModal ?? 1) - 1]?.rejectedReason}
              </p>
            </div>
          )}
          <div>
            <label className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
              활동 내용 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              value={logContent}
              onChange={(e) => setLogContent(e.target.value)}
              placeholder="이번 회차의 활동 내용과 배운 점을 200자 이상 작성해 주세요."
              rows={6}
              className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#2563EB] placeholder:text-[#9AA0A6]"
            />
            <div className="text-right text-[11px] text-[#9AA0A6] mt-1">{logContent.length}자</div>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
              활동 사진 <span className="text-[#9AA0A6] font-normal">(선택)</span>
            </label>
            <FileUpload accept=".jpg,.jpeg,.png" maxSize="10MB" multiple />
          </div>
        </div>
      </Modal>
    </div>
  );
}
