import { useEffect, useState } from 'react';
import { PageHeader, ProgressBar, Button } from '@/components/common';
import { fetchProgramDetail, fetchMyAttendance } from '@/api/programs';
import { formatDate, formatDateTime } from '@/utils/date';

const ACCENT = '#2563EB';

// 백엔드는 출결 상태를 PRESENT/ABSENT 2단계로만 기록한다. 아직 기록되지 않은 회차는
// attendanceStatus가 null로 내려오며, 이를 "미확인"으로 표시한다.
const STATUS_LABEL = { PRESENT: '출석', ABSENT: '결석' };
const STATUS_STYLES = {
  출석: 'bg-[#DCFCE7] text-[#1A7F37]',
  결석: 'bg-[#FEE2E2] text-[#CF222E]',
  미확인: 'bg-[#F3F4F6] text-[#6E7781]',
};

/**
 * @param {Object} props
 * @param {number} props.programId
 * @param {() => void} props.onBack
 */
export default function ActivityManage({ programId, onBack }) {
  const [program, setProgram] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!programId) {
      setLoading(false);
      setError('프로그램 정보를 찾을 수 없습니다.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchProgramDetail(programId), fetchMyAttendance(programId)])
      .then(([programData, attendanceData]) => {
        if (cancelled) return;
        setProgram(programData);
        setAttendance(attendanceData);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? '출결 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [programId]);

  const presentCount = attendance.filter((a) => a.attendanceStatus === 'PRESENT').length;
  const absentCount = attendance.filter((a) => a.attendanceStatus === 'ABSENT').length;
  const confirmedCount = presentCount + absentCount;
  const attendRate = confirmedCount > 0 ? Math.round((presentCount / confirmedCount) * 100) : null;
  const now = Date.now();

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: '비교과 프로그램' },
          { label: '내 신청 내역', onClick: onBack },
          { label: '출결 확인' },
        ]}
        title="출결 확인"
        accentColor={ACCENT}
        actions={
          <Button size="sm" variant="outline" onClick={onBack}>
            ← 내역으로
          </Button>
        }
      />

      {error && (
        <div className="bg-white rounded-[8px] border border-[#FEE2E2] px-4 py-8 mb-4 text-center text-[13px] text-[#CF222E]">
          {error}
        </div>
      )}
      {loading && !error && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-8 mb-4 text-center text-[13px] text-[#656D76]">
          불러오는 중...
        </div>
      )}

      {!loading && !error && program && (
        <>
          {/* Program summary */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 mb-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[16px] font-bold text-[#1F2328]">
                    {program.programName}
                  </span>
                </div>
                <div className="flex gap-4 text-[12px] text-[#656D76]">
                  <span>
                    📅 {formatDate(program.operationStartsAt)} ~{' '}
                    {formatDate(program.operationEndsAt)} ({attendance.length}회차)
                  </span>
                  {program.managerUserName && <span>👤 담당자: {program.managerUserName}</span>}
                </div>
              </div>
              {attendRate != null && (
                <div className="text-right">
                  <div
                    className={`text-[24px] font-black ${attendRate >= 80 ? 'text-[#1A7F37]' : 'text-[#CF222E]'}`}
                  >
                    {attendRate}%
                  </div>
                  <div className="text-[11px] text-[#9AA0A6]">출석률</div>
                </div>
              )}
            </div>
            {attendRate != null && (
              <ProgressBar
                value={attendRate}
                color={attendRate >= 80 ? '#1A7F37' : '#CF222E'}
                showValue
              />
            )}
            {attendance.length > 0 && (
              <div className="flex gap-4 mt-3 text-[12px] text-[#656D76]">
                <span>
                  출석 <strong className="text-[#1A7F37]">{presentCount}회</strong>
                </span>
                <span>
                  결석 <strong className="text-[#CF222E]">{absentCount}회</strong>
                </span>
                <span>
                  미확인{' '}
                  <strong className="text-[#6E7781]">
                    {attendance.length - presentCount - absentCount}회
                  </strong>
                </span>
              </div>
            )}
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
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#656D76] uppercase">
                    장소
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#656D76] uppercase">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-[#9AA0A6]">
                      등록된 회차가 없습니다.
                    </td>
                  </tr>
                ) : (
                  attendance.map((a, i) => {
                    const label = STATUS_LABEL[a.attendanceStatus] ?? '미확인';
                    const isToday =
                      new Date(a.startsAt).toDateString() === new Date(now).toDateString();
                    return (
                      <tr
                        key={a.programSessionId}
                        className={`border-b border-[#E5E7EB] last:border-0 ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                      >
                        <td className="px-4 py-3 font-semibold text-[#1F2328]">
                          {a.sessionNo}회차{a.sessionName ? ` · ${a.sessionName}` : ''}
                          {isToday && (
                            <span className="ml-2 text-[10px] font-black text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded-full">
                              오늘
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#656D76]">
                          {formatDateTime(a.startsAt)} ~ {formatDateTime(a.endsAt)}
                        </td>
                        <td className="px-4 py-3 text-[#656D76]">{a.location || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[label]}`}
                          >
                            {label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
