import { useEffect, useState } from 'react';
import { fetchMyApplications, cancelMyApplication } from '@/api/programApplications';
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

const formatDate = (iso) => (iso ? iso.slice(0, 10) : '');

// 이수 판정(completionStatus)이 나온 건은 그 결과를, 아직이면 신청 처리 상태 라벨을 그대로 보여준다.
// FE 디자인의 "활동진행"/"수정요청" 상태는 백엔드에 대응 개념이 없어 표현할 수 없다.
const STATUS_LABEL = { COMPLETED: '수료', FAILED: '미수료' };

// ProgramApplicationSummaryResponseDTO(GET /api/students/programs/applications) -> 목록 행으로 변환.
// 구분(개인/그룹), 출석률(attendance), 적립 마일리지(mileage)는 이 API가 아직 내려주지 않아
// 화면이 깨지지 않도록 안전한 기본값을 채운다.
const toRow = (dto) => ({
  id: dto.applicationId,
  programId: dto.programId,
  applicationId: dto.applicationId,
  appliedAt: formatDate(dto.appliedAt),
  name: dto.programName,
  type: '개인',
  applicationStatus: dto.applicationStatus,
  status: STATUS_LABEL[dto.completionStatus] ?? dto.applicationStatusLabel,
  waitlistOrder: dto.waitlistOrder,
  attendance: 0,
  completed: dto.completionStatus === 'COMPLETED',
  mileage: 0,
  decisionReason: dto.decisionReason,
  processedAt: dto.processedAt,
  cancellationReason: dto.cancellationReason,
});

const CANCELABLE = new Set(['APPLIED', 'WAITLISTED', 'APPROVED']);

const BTN_MAP = {
  수료: { label: '수료증', variant: 'outline' },
  신청완료: { label: '취소', variant: 'outline' },
  승인: { label: '취소', variant: 'danger' },
  반려: { label: '사유확인', variant: 'secondary' },
  미수료: { label: '이의신청', variant: 'secondary' },
  대기: { label: '취소', variant: 'outline' },
  취소: { label: '취소됨', variant: 'secondary' },
};

/**
 * @param {Object} props
 * @param {(id: string) => void} props.onSurvey
 */
export default function MyApplications({ onSurvey }) {
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [apps, setApps] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState('전체');
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const PAGE_SIZE = 8;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMyApplications({ page: page - 1, size: PAGE_SIZE, sort: 'createdAt,desc' })
      .then((res) => {
        if (cancelled) return;
        setApps(res.content.map(toRow));
        setTotalItems(res.totalElements);
        setTotalPages(res.totalPages || 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? '신청 내역을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  // 전체 신청 건수는 서버 페이지네이션 totalElements(정확), 승인/수료/적립 마일리지는
  // 별도 집계 API가 없어 현재 페이지에 내려온 데이터 기준 근사치다.
  const approvedCount = apps.filter((a) => a.applicationStatus === 'APPROVED').length;
  const completedCount = apps.filter((a) => a.completed).length;
  const totalMileage = apps.filter((a) => a.completed).reduce((s, a) => s + a.mileage, 0);

  const filtered = apps.filter(
    (a) =>
      (statusFilter === '전체' || a.status === statusFilter) &&
      (!submittedKeyword || a.name.includes(submittedKeyword)),
  );

  const runCancel = async (app) => {
    try {
      await cancelMyApplication(app.programId, app.applicationId);
      toast('취소 처리되었습니다.', 'success');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast(err.message ?? '취소에 실패했습니다.', 'danger');
    }
  };

  const handleBtn = (app) => {
    if (app.status === '수료') {
      onSurvey(app.id);
      return;
    }
    if (app.status === '반려') {
      setRejectTarget(app);
      return;
    }
    if (CANCELABLE.has(app.applicationStatus)) {
      runCancel(app);
      return;
    }
    toast(`${BTN_MAP[app.status]?.label ?? app.status} 처리 중...`, 'info');
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '비교과 프로그램' }, { label: '내 신청 내역' }]}
        title="내 신청 내역"
        subtitle="비교과 프로그램 신청 및 활동 이력을 관리합니다."
        accentColor={ACCENT}
      />

      {/* Stat tiles: 승인/수료/적립 마일리지는 별도 집계 API가 없어 현재 페이지 데이터 기준 근사치, 적립
          마일리지는 이 API가 mileage 값을 내려주지 않아 항상 0으로 표시된다. */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatTile label="전체 신청" value={`${totalItems}건`} sub="전체" accentColor={ACCENT} />
        <StatTile
          label="승인"
          value={`${approvedCount}건`}
          sub="현재 페이지 기준"
          accentColor="#1A7F37"
        />
        <StatTile
          label="수료"
          value={`${completedCount}건`}
          sub="현재 페이지 기준"
          accentColor="#7C3AED"
        />
        <StatTile
          label="적립 마일리지"
          value={`${totalMileage.toLocaleString()}점`}
          sub="현재 페이지 기준"
          accentColor="#D97706"
        />
      </div>

      {/* FilterBar: 이 API는 상태/이름 쿼리 파라미터를 지원하지 않아 현재 페이지에 이미 내려온
          데이터 안에서만 걸러진다(서버 페이지네이션과는 별개, ProgramList.jsx와 동일한 방식). */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 mb-4 flex items-end gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76] uppercase">상태</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 pr-7 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white appearance-none focus:outline-none focus:border-[#2563EB]"
          >
            <option>전체</option>
            <option>수료</option>
            <option>신청완료</option>
            <option>승인</option>
            <option>반려</option>
            <option>미수료</option>
            <option>대기</option>
            <option>취소</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76] uppercase">프로그램명</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="프로그램 검색"
            className="h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#2563EB] w-48"
          />
        </div>
        <Button size="sm" className="mb-0" onClick={() => setSubmittedKeyword(keyword)}>
          조회
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="mb-0"
          onClick={() => {
            setStatusFilter('전체');
            setKeyword('');
            setSubmittedKeyword('');
          }}
        >
          초기화
        </Button>
        <span className="text-[12px] text-[#9AA0A6] ml-auto">총 {totalItems}건</span>
      </div>

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

      {/* Table */}
      {!loading && !error && (
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
            {filtered.map((app, i) => {
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
                      disabled={app.status === '취소'}
                      className={`h-7 px-3 text-[11px] font-bold rounded-[5px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        app.status === '반려'
                          ? 'text-[#CF222E] border border-[#CF222E] hover:bg-[#FEF2F2]'
                          : 'border border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB]'
                      }`}
                      style={app.status === '수료' ? { background: '#7C3AED', color: 'white' } : {}}
                    >
                      {btn?.label ?? app.status}
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
            totalPages={totalPages}
            onChange={setPage}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
          />
        </div>
      </div>
      )}

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="반려 사유"
        size="sm"
        footer={
          <Button size="sm" onClick={() => setRejectTarget(null)}>
            확인
          </Button>
        }
      >
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-4 py-3">
          <p className="text-[12px] font-semibold text-[#CF222E] mb-2">
            반려 일시: {rejectTarget?.processedAt ? formatDate(rejectTarget.processedAt) : '-'}
          </p>
          <p className="text-[13px] text-[#1F2328]">
            {rejectTarget?.decisionReason || '등록된 반려 사유가 없습니다.'}
          </p>
        </div>
      </Modal>
    </div>
  );
}
