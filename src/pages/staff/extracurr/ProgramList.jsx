import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge, Pagination, toast, Button } from '@/components/common';
import { useCommonCode } from '@/hooks/useCommonCode';
import { fetchProgramsAdmin } from '@/api/programs';
import { formatDate } from '@/utils/date';

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
  const [category, setCategory] = useState('전체');
  const [dept, setDept] = useState('전체');
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(1);

  const { data: departmentCodes = [] } = useCommonCode('DEPARTMENT');
  const depts = ['전체', ...departmentCodes.map((c) => c.codeName)];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['adminPrograms', { status, keyword: submittedKeyword, page }],
    queryFn: () =>
      fetchProgramsAdmin({
        status: status || undefined,
        keyword: submittedKeyword || undefined,
        page: page - 1,
        size: PAGE_SIZE,
      }),
  });

  const rows = (data?.content ?? []).map(toRow);
  const categories = ['전체', ...Array.from(new Set(rows.map((r) => r.category).filter(Boolean)))];

  // 분류/주관부서는 백엔드 목록 API가 쿼리 파라미터로 지원하지 않아, 이미 내려온
  // 현재 페이지 데이터 안에서만 걸러진다(서버 페이지네이션과는 별개).
  const filtered = rows.filter(
    (r) => (category === '전체' || r.category === category) && (dept === '전체' || r.dept === dept),
  );

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
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-4 grid grid-cols-5 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[#656D76] mb-1">상태</label>
          <select
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
        {[
          { label: '분류', value: category, set: setCategory, opts: categories },
          { label: '주관부서', value: dept, set: setDept, opts: depts },
        ].map((f) => (
          <div key={f.label}>
            <label className="block text-[10px] font-semibold text-[#656D76] mb-1">{f.label}</label>
            <select
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="w-full h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:ring-2 focus:ring-[#374151]/30 focus:border-[#374151]"
            >
              {f.opts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
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
            {data?.totalElements ?? 0}개
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[#9AA0A6]">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
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
                            onClick={() => onEdit(p.id, p.raw)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] transition-colors bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                          >
                            수정
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
              page={page}
              totalPages={data?.totalPages || 1}
              onChange={setPage}
              totalItems={data?.totalElements}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </div>
    </div>
  );
}
