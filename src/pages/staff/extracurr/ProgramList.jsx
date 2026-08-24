import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatusBadge, Pagination, ConfirmDialog, toast, Button } from '@/components/common';
import { fetchProgramsAdmin, deleteProgram } from '@/api/programs';
import { ApiError } from '@/api/client';
import { formatDate } from '@/utils/date';
import { fetchAllPages } from '@/utils/pagination';

const PAGE_SIZE = 10;

// 백엔드 ProgramStatus enum(DRAFT/OPERATING/CLOSED)은 CommonCode가 아니라 순수 Java enum이라
// 공통코드 API로 한글 라벨을 받아올 수 없다. 행에 표시하는 상태 뱃지는 서버가 내려주는
// programStatusLabel을 그대로 쓰고, 필터용 select만 임시로 enum 코드를 한글로 옮겨 적었다.
// 실제 서버 응답과 다르면 이 매핑만 고치면 된다.
const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'DRAFT', label: '작성중' },
  { value: 'OPERATING', label: '운영중' },
  { value: 'CLOSED', label: '종료' },
];

// ProgramAdminListItemResponseDTO(GET /api/admin/programs) -> 화면에서 쓰는 행 모양으로 변환.
const toRow = (dto) => ({
  id: dto.programId,
  name: dto.programName,
  category: dto.programTypeCodeName,
  dept: dto.operatingUnitCodeName,
  operPeriod: `${formatDate(dto.operationStartsAt)} ~ ${formatDate(dto.operationEndsAt)}`,
  recruitPeriod: `${formatDate(dto.recruitmentStartsAt)} ~ ${formatDate(dto.recruitmentEndsAt)}`,
  applied: dto.applicantCount ?? 0,
  capacity: dto.capacity ?? 0,
  status: dto.programStatusLabel,
  raw: dto,
});

function getDeleteErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  if (error.code === 'A004') return '이 프로그램을 삭제할 권한이 없습니다.';
  if (error.code === 'P010') return error.message || '모집이 종료된 프로그램은 삭제할 수 없습니다.';
  return error.message || '삭제 중 오류가 발생했습니다.';
}

function ApplyBar({ applied, capacity }) {
  const pct = capacity > 0 ? Math.min(100, (applied / capacity) * 100) : 0;
  const full = pct >= 100;
  const near = pct >= 80;
  const color = full ? '#CF222E' : near ? '#D97706' : '#374151';
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="font-bold" style={{ color }}>
          {applied}
        </span>
        <span className="text-[#9AA0A6]">/{capacity}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden w-[64px]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/**
 * 교직원 비교과 프로그램 목록. GET /api/admin/programs 연동.
 *
 * @param {Object} props
 * @param {() => void} props.onNew
 * @param {(id: number, program: object) => void} props.onEdit
 * @param {(id: number, programName: string) => void} props.onParticipation
 */
export default function ProgramList({ onNew, onEdit, onParticipation }) {
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryClient = useQueryClient();
  const adminProgramsQueryKey = ['adminPrograms', { status, keyword: submittedKeyword }];
  const { data, isLoading, isError, error } = useQuery({
    queryKey: adminProgramsQueryKey,
    queryFn: () =>
      fetchAllPages((p) =>
        fetchProgramsAdmin({
          status: status || undefined,
          keyword: submittedKeyword || undefined,
          ...p,
        }),
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProgram,
    onSuccess: () => {
      toast('삭제되었습니다.', 'success');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['adminPrograms'] });
    },
    onError: (err) => {
      toast(getDeleteErrorMessage(err), 'error');
      setDeleteTarget(null);
      // 상태 경합(예: 다른 탭에서 방금 모집이 종료됨) 가능성이 있으니 최신 isDeletable을 다시 받아온다.
      queryClient.invalidateQueries({ queryKey: ['adminPrograms'] });
    },
  });

  const handleDeleteConfirm = () => {
    if (deleteMutation.isPending || !deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const rows = (data ?? []).map(toRow);

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const runSearch = () => {
    setPage(1);
    setSubmittedKeyword(keyword);
  };

  const handleUnsupported = (message) => toast(message, 'info');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-black text-[#1F2328]">비교과 프로그램 관리</h1>
          <p className="text-[13px] text-[#9AA0A6] mt-0.5">
            프로그램 개설·모집·운영 전 주기를 관리합니다.
          </p>
        </div>
        <Button onClick={onNew} style={{ background: '#374151' }}>
          + 프로그램 등록
        </Button>
      </div>

      {/* FilterBar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-4 grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="admin-program-status" className="block text-[10px] font-semibold text-[#656D76] mb-1">
            상태
          </label>
          <select
            id="admin-program-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:ring-2 focus:ring-[#374151]/30 focus:border-[#374151]"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-semibold text-[#656D76] mb-1">프로그램명</label>
          <div className="flex gap-1.5">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="검색..."
              className="flex-1 h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:ring-2 focus:ring-[#374151]/30 focus:border-[#374151]"
            />
            <button
              onClick={runSearch}
              className="h-8 px-3 text-[12px] font-bold rounded-[6px] bg-[#374151] text-white hover:bg-[#1F2937] transition-colors"
            >
              조회
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#1F2328]">프로그램 목록</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">
            {totalItems}개
          </span>
        </div>

        {isError && (
          <div className="px-4 py-12 text-center text-[13px] text-[#CF222E]">
            {error?.message ?? '프로그램 목록을 불러오지 못했습니다.'}
          </div>
        )}

        {isLoading && !isError && (
          <div className="px-4 py-12 text-center text-[13px] text-[#9AA0A6]">불러오는 중...</div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {[
                    'ID',
                    '프로그램명',
                    '분류',
                    '운영기간',
                    '모집기간',
                    '신청/정원',
                    '상태',
                    '관리',
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 5 ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[#9AA0A6]">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  paged.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] whitespace-nowrap">
                        {p.id}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-semibold text-[#1F2328] truncate">{p.name}</p>
                        <p className="text-[10px] text-[#9AA0A6]">{p.dept}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#656D76]">{p.category}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#444D56] whitespace-nowrap">
                        {p.operPeriod}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#444D56] whitespace-nowrap">
                        {p.recruitPeriod}
                      </td>
                      <td className="px-4 py-3">
                        <ApplyBar applied={p.applied} capacity={p.capacity} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-center flex-wrap">
                          <button
                            disabled={!p.raw.isEditable}
                            onClick={() => onEdit(p.id, p.raw)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                          >
                            수정
                          </button>
                          <button
                            disabled={!p.raw.isDeletable}
                            onClick={() => setDeleteTarget(p)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA]"
                          >
                            삭제
                          </button>
                          <button
                            onClick={() => onParticipation(p.id, p.name)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] transition-colors bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                          >
                            참여관리
                          </button>
                          <button
                            onClick={() =>
                              handleUnsupported('모집 마감 처리 API가 아직 준비되지 않았습니다.')
                            }
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] transition-colors bg-[#F3F4F6] text-[#9AA0A6] cursor-not-allowed"
                          >
                            모집마감
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="px-4 pb-3">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="프로그램 삭제 확인"
        message="정말 삭제하시겠습니까?"
        confirmLabel="삭제"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleteMutation.isPending && setDeleteTarget(null)}
      />
    </div>
  );
}
