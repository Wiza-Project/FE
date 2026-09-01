import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pagination, StatusBadge } from '@/components/common';
import {
  counselingSessionsQueryKey,
  fetchCounselingSessions,
} from '@/api/counsel';
import {
  COUNSELING_SESSION_ATTENDANCE_STATUS_LABEL,
  COUNSELING_SESSION_STATUS,
  COUNSELING_SESSION_STATUS_LABEL,
} from '@/constants/domain';
import { formatKstDateTime } from './staffCounselingDate';
import SessionDetailModal from './SessionDetailModal';
import {
  ATTENDANCE_BADGE_VARIANT,
  SESSION_STATUS_BADGE_VARIANT,
  getSessionErrorMessage,
} from './sessionRecordPresentation';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)
const PAGE_SIZE = 20;

const STATUS_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: COUNSELING_SESSION_STATUS.PLANNED, label: COUNSELING_SESSION_STATUS_LABEL.PLANNED },
  { value: COUNSELING_SESSION_STATUS.COMPLETED, label: COUNSELING_SESSION_STATUS_LABEL.COMPLETED },
  { value: COUNSELING_SESSION_STATUS.CANCELED, label: COUNSELING_SESSION_STATUS_LABEL.CANCELED },
];

/**
 * 상담사 본인 담당 회기의 목록·필터·페이지와 선택된 회기 ID만 소유한다. 선택된 회기의 상세,
 * 후속 회기 생성·출결 완료·취소, 비공개 상담 기록은 SessionDetailModal에 위임한다.
 */
export default function SessionRecord() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [detailSessionId, setDetailSessionId] = useState(null);

  const {
    data: sessionPage,
    isLoading,
    isError,
    error: listError,
    isPlaceholderData,
  } = useQuery({
    // queryKey는 counselingSessionsQueryKey 내부에서 statusFilter가 ''일 때도 'ALL'로 정규화하지
    // 않으므로(nullish만 처리), placeholderData 비교와 동일한 정규화 값을 직접 넘겨 맞춘다.
    queryKey: counselingSessionsQueryKey(page, statusFilter || 'ALL'),
    queryFn: () =>
      fetchCounselingSessions({ page, size: PAGE_SIZE, sessionStatus: statusFilter || undefined }),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === (statusFilter || 'ALL') ? previousData : undefined,
    retry: false,
  });

  const content = sessionPage?.content ?? [];
  const totalElements = sessionPage?.totalElements ?? 0;
  const totalPages = sessionPage?.totalPages ?? 0;

  useEffect(() => {
    if (isPlaceholderData || isError || !sessionPage) return;
    if (totalPages === 0 && page !== 0) {
      setPage(0);
      return;
    }
    if (totalPages > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [isError, isPlaceholderData, page, sessionPage, totalPages]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">회기 관리</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            담당 회기를 조회하고 후속 회기 생성·출결 완료·취소를 처리하세요.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="h-8 px-2.5 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151]"
          aria-label="회기 상태 필터"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <span className="text-[13px] font-bold text-[#1F2328]">회기 목록</span>
          {!isLoading && !isError && (
            <span className="ml-auto text-[11px] text-[#9AA0A6]">총 {totalElements}건</span>
          )}
        </div>

        {isLoading ? (
          <p className="p-6 text-center text-[12px] text-[#656D76]">목록을 불러오는 중입니다.</p>
        ) : isError ? (
          <p className="p-4 text-[12px] text-[#CF222E]" role="alert">
            {getSessionErrorMessage(listError)}
          </p>
        ) : content.length === 0 ? (
          <p className="p-6 text-center text-[12px] text-[#656D76]">조회된 회기가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {[
                    '회기',
                    '학생',
                    '상담유형',
                    '시작 ~ 종료',
                    '출석',
                    '회기상태',
                    '다음 회기 예정',
                    '상세',
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
                {content.map((s) => (
                  <tr
                    key={s.sessionId}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[11px]" style={{ color: ACCENT }}>
                      #{s.sessionId} · {s.sessionNo}회기
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#1F2328]">
                      {s.studentName}
                      <span className="text-[#9AA0A6] font-mono ml-1">({s.studentNumber})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6]"
                        style={{ color: ACCENT }}
                      >
                        {s.counselingTypeName}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#444D56] whitespace-nowrap">
                      {formatKstDateTime(s.startsAt)} ~ {formatKstDateTime(s.endsAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={s.attendanceStatus}
                        variant={ATTENDANCE_BADGE_VARIANT[s.attendanceStatus]}
                        label={COUNSELING_SESSION_ATTENDANCE_STATUS_LABEL[s.attendanceStatus]}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={s.sessionStatus}
                        variant={SESSION_STATUS_BADGE_VARIANT[s.sessionStatus]}
                        label={COUNSELING_SESSION_STATUS_LABEL[s.sessionStatus]}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] whitespace-nowrap">
                      {s.nextSessionAt ? formatKstDateTime(s.nextSessionAt) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setDetailSessionId(s.sessionId)}
                        className="h-6 px-2 text-[9px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB] transition-colors"
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && !isError && totalPages > 1 && (
        <Pagination
          page={page + 1}
          totalPages={totalPages}
          totalItems={totalElements}
          pageSize={PAGE_SIZE}
          onChange={(nextPage) => setPage(nextPage - 1)}
        />
      )}

      <SessionDetailModal sessionId={detailSessionId} onClose={() => setDetailSessionId(null)} />
    </div>
  );
}
