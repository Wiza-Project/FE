import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPrograms, fetchCompetencyOptions } from '@/api/programs';
import { applyToProgram } from '@/api/programApplications';
import { PageHeader, StatusBadge, Pagination, Button, Modal, toast } from '@/components/common';
import { formatDate } from '@/utils/date';

const ACCENT = '#2563EB';

// ProgramListItemResponseDTO(GET /api/students/programs) -> 목록 화면에서 쓰는 행 모양으로 변환.
const toRow = (dto) => ({
  id: dto.programId,
  name: dto.programName,
  category: dto.programTypeCodeName,
  dept: dto.operatingUnitCodeName,
  period: `${formatDate(dto.recruitmentStartsAt)} ~ ${formatDate(dto.recruitmentEndsAt)}`,
  recruitStart: dto.recruitmentStartsAt,
  recruitEnd: dto.recruitmentEndsAt,
  capacity: dto.capacity ?? 0,
  status: dto.programStatusLabel,
  applied: dto.applicantCount ?? 0,
  competency: dto.competencyName ?? null,
  mileage: dto.mileagePoints ?? 0,
  myApplicationStatus: dto.myApplicationStatus ?? null,
  myApplicationStatusLabel: dto.myApplicationStatusLabel ?? null,
});

const SORT_OPTIONS = [
  { value: 'new', label: '신규순' },
  { value: 'deadline', label: '마감임박순' },
];

// 백엔드 정렬 화이트리스트(createdAt/recruitmentEndsAt/programName)에 맞춘 매핑.
const SORT_PARAM = {
  new: 'createdAt,desc',
  deadline: 'recruitmentEndsAt,asc',
};

const COMP_COLORS = {
  자기관리: '#2563EB',
  의사소통: '#7C3AED',
  글로벌: '#0891B2',
  대인관계: '#059669',
  '종합적 사고력': '#D97706',
  '자원·정보·기술 활용': '#6B7280',
};

function CompBadge({ label }) {
  const color = COMP_COLORS[label] ?? '#6B7280';
  return (
    <span
      className="inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white mr-1"
      style={{ background: color }}
    >
      {label}
    </span>
  );
}

const isFull = (p) => p.applied >= p.capacity && p.capacity > 0;
// 모집기간이 끝나면(운영중/종료) 신청을 받지 않는다 — ProgramDetail.jsx의 isClosed와 같은 이유.
const isRecruitClosed = (p) => p.status === '종료' || p.status === '운영중';

/**
 * @param {Object} props
 * @param {(id: string) => void} props.onDetail
 * @param {() => void} [props.onMyApplications]
 */
export default function ProgramList({ onDetail, onMyApplications }) {
  const [viewMode, setViewMode] = useState('table');
  const [chip, setChip] = useState('전체');
  const [sort, setSort] = useState('new');
  const [comp, setComp] = useState('');
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [applyTarget, setApplyTarget] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [applying, setApplying] = useState(false);
  const PAGE_SIZE = 10;

  const queryClient = useQueryClient();

  const status = chip === '모집중' ? 'DRAFT' : undefined;
  const competencyId = comp || undefined;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['studentPrograms', { status, competencyId, keyword: submittedKeyword, sort, page }],
    queryFn: () =>
      fetchPrograms({
        status,
        competencyId,
        keyword: submittedKeyword || undefined,
        sort: SORT_PARAM[sort],
        page: page - 1,
        size: PAGE_SIZE,
      }),
  });

  const { data: competencyOptionsData } = useQuery({
    queryKey: ['competencyOptions'],
    queryFn: fetchCompetencyOptions,
  });

  const COMP_OPTIONS = [
    { value: '', label: '핵심역량 전체' },
    ...(competencyOptionsData ?? []).map((c) => ({
      value: String(c.competencyId),
      label: c.competencyName,
    })),
  ];

  useEffect(() => {
    if (!data) return;
    const lastPage = Math.max(1, data.totalPages || 1);
    if (page > lastPage) setPage(lastPage);
  }, [data, page]);

  useEffect(() => {
    setPage(1);
  }, [comp, chip, sort]);

  const openApply = (p) => {
    setAgreed(false);
    setApplyTarget(p);
  };

  const closeApply = () => {
    if (applying) return;
    setApplyTarget(null);
  };

  const handleApplyConfirm = async () => {
    if (!applyTarget) return;
    setApplying(true);
    try {
      const res = await applyToProgram(applyTarget.id);
      if (res.applicationStatus === 'WAITLISTED') {
        toast(`정원이 마감되어 대기 ${res.waitlistOrder ?? ''}순번으로 등록되었습니다.`, 'info');
      } else {
        toast('신청이 완료되었습니다.', 'success');
      }
      setApplyTarget(null);
      queryClient.invalidateQueries({ queryKey: ['studentPrograms'] });
    } catch (err) {
      toast(err.message ?? '신청에 실패했습니다.', 'danger');
    } finally {
      setApplying(false);
    }
  };

  const CHIPS = ['전체', '모집중'];

  const paged = (data?.content ?? []).map(toRow);
  const totalItems = data?.totalElements ?? 0;
  const totalPages = Math.max(1, data?.totalPages || 1);
  const currentPage = Math.min(page, totalPages);

  const runSearch = () => {
    setPage(1);
    setSubmittedKeyword(keyword);
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '비교과 프로그램' }]}
        title="비교과 프로그램"
        subtitle="다양한 비교과 프로그램에 참여하여 핵심역량을 키워보세요."
        accentColor={ACCENT}
        actions={
          onMyApplications && (
            <Button size="sm" variant="outline" onClick={onMyApplications}>
              내 신청 내역 →
            </Button>
          )
        }
      />

      {/* FilterBar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#656D76] uppercase">핵심역량</label>
            <select
              value={comp}
              onChange={(e) => setComp(e.target.value)}
              className="h-9 px-3 pr-7 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white appearance-none focus:outline-none focus:border-[#2563EB]"
            >
              {COMP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#656D76] uppercase">검색어</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="프로그램명 검색"
              className="h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#2563EB] w-48"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                setComp('');
                setKeyword('');
                setChip('전체');
                setPage(1);
                setSubmittedKeyword('');
              }}
              className="h-9 px-4 text-[13px] font-semibold text-[#656D76] border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
            >
              초기화
            </button>
            <button
              onClick={runSearch}
              className="h-9 px-4 text-[13px] font-bold text-white rounded-[6px] transition-colors"
              style={{ background: ACCENT }}
            >
              조회
            </button>
          </div>
        </div>
      </div>

      {/* Chip filters + sort + view toggle */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {CHIPS.map((label) => (
            <button
              key={label}
              onClick={() => setChip(label)}
              aria-pressed={chip === label}
              className={`px-3 py-1.5 rounded-[999px] text-[12px] font-bold transition-all border ${chip === label ? 'text-white border-transparent' : 'bg-white border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB]'}`}
              style={chip === label ? { background: ACCENT } : {}}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-8 px-3 pr-7 text-[12px] font-semibold text-[#1F2328] bg-white border border-[#E5E7EB] rounded-[6px] appearance-none focus:outline-none focus:border-[#2563EB]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {/* View toggle */}
          <div className="flex border border-[#E5E7EB] rounded-[6px] overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center justify-center w-8 h-8 transition-colors ${viewMode === 'table' ? 'bg-[#2563EB] text-white' : 'bg-white text-[#9AA0A6] hover:bg-[#F9FAFB]'}`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="14" height="3" rx="1" />
                <rect x="1" y="6" width="14" height="3" rx="1" />
                <rect x="1" y="11" width="14" height="3" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center justify-center w-8 h-8 transition-colors border-l border-[#E5E7EB] ${viewMode === 'card' ? 'bg-[#2563EB] text-white' : 'bg-white text-[#9AA0A6] hover:bg-[#F9FAFB]'}`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isError && (
        <div className="bg-white rounded-[8px] border border-[#FEE2E2] px-4 py-8 mb-4 text-center text-[13px] text-[#CF222E]">
          {error?.message ?? '프로그램 목록을 불러오지 못했습니다.'}
        </div>
      )}
      {isLoading && !isError && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-8 mb-4 text-center text-[13px] text-[#656D76]">
          불러오는 중...
        </div>
      )}

      {/* TABLE VIEW */}
      {!isLoading && !isError && viewMode === 'table' && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {[
                    '프로그램명',
                    '주관부서',
                    '연계역량',
                    '모집기간',
                    '정원',
                    '적립점수',
                    '상태',
                    '신청',
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '프로그램명' ? 'text-left' : 'text-center'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((p, i) => {
                  const full = isFull(p);
                  const recruitClosed = isRecruitClosed(p);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-[#E5E7EB] last:border-0 hover:bg-[#EFF6FF] transition-colors ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                    >
                      {/* Name */}
                      <td className="px-3 py-3 text-left max-w-[220px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => onDetail(p.id)}
                            className="font-semibold text-[#1F2328] hover:text-[#2563EB] hover:underline text-left"
                          >
                            {p.name}
                          </button>
                          {full && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E]">
                              정원마감
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-[#656D76] whitespace-nowrap">
                        {p.dept}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {p.competency ? (
                          <CompBadge label={p.competency} />
                        ) : (
                          <span className="text-[#9AA0A6]">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-[#656D76] whitespace-nowrap text-[12px]">
                        {p.period}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {p.capacity > 0 ? (
                          <span className={full ? 'text-[#CF222E] font-bold' : ''}>
                            {p.applied}/{p.capacity}명
                          </span>
                        ) : (
                          <span className="text-[#9AA0A6]">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-[#D97706]">
                        {p.mileage}점
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={full ? '마감' : p.status} size="sm" />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {p.myApplicationStatus ? (
                          <span className="inline-flex items-center h-7 px-3 text-[12px] font-bold text-[#656D76] bg-[#F3F4F6] rounded-[5px]">
                            신청완료
                          </span>
                        ) : full ? (
                          <button
                            onClick={() => openApply(p)}
                            disabled={recruitClosed}
                            className="h-7 px-3 text-[12px] font-bold text-[#2563EB] border border-[#2563EB] rounded-[5px] hover:bg-[#EFF6FF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {recruitClosed ? p.status : '대기신청'}
                          </button>
                        ) : (
                          <button
                            onClick={() => openApply(p)}
                            disabled={recruitClosed}
                            className="h-7 px-3 text-[12px] font-bold text-white rounded-[5px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: recruitClosed ? '#9AA0A6' : ACCENT }}
                          >
                            {recruitClosed ? p.status : '신청'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[12px] text-[#656D76]">총 {totalItems}건</span>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
            />
          </div>
        </div>
      )}

      {/* CARD VIEW */}
      {!isLoading && !isError && viewMode === 'card' && (
        <>
          <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2">
            {paged.map((p) => {
              const full = isFull(p);
              const recruitClosed = isRecruitClosed(p);
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-[10px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow flex flex-col"
                >
                  <div
                    className="h-1"
                    style={{ background: COMP_COLORS[p.competency] ?? ACCENT }}
                  />
                  <div className="p-4 flex flex-col flex-1 gap-2.5">
                    <div>
                      <div className="flex gap-1 mb-1.5 flex-wrap">
                        {p.competency && <CompBadge label={p.competency} />}
                        {full && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E]">
                            정원마감
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => onDetail(p.id)}
                        className="text-[14px] font-bold text-[#1F2328] hover:text-[#2563EB] text-left leading-snug"
                      >
                        {p.name}
                      </button>
                    </div>
                    <div className="text-[12px] text-[#656D76]">
                      {p.dept} · {p.period}
                    </div>
                    {p.capacity > 0 && (
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#9AA0A6]">정원</span>
                          <span
                            className={`font-semibold ${full ? 'text-[#CF222E]' : 'text-[#1F2328]'}`}
                          >
                            {p.applied}/{p.capacity}명
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((p.applied / p.capacity) * 100, 100)}%`,
                              background: full ? '#CF222E' : ACCENT,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6] mt-auto">
                      <span className="text-[12px] font-bold text-[#D97706]">🏅 {p.mileage}점</span>
                      {p.myApplicationStatus ? (
                        <span className="inline-flex items-center h-7 px-3 text-[12px] font-bold text-[#656D76] bg-[#F3F4F6] rounded-[5px]">
                          신청완료
                        </span>
                      ) : (
                        <button
                          onClick={() => openApply(p)}
                          disabled={recruitClosed}
                          className={`h-7 px-3 text-[12px] font-bold rounded-[5px] transition-colors disabled:opacity-40 ${full ? 'text-[#2563EB] border border-[#2563EB] hover:bg-[#EFF6FF]' : 'text-white'}`}
                          style={full ? {} : { background: recruitClosed ? '#9AA0A6' : ACCENT }}
                        >
                          {recruitClosed ? p.status : full ? '대기신청' : '신청'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
            />
          </div>
        </>
      )}

      {/* 목록에서 바로 신청 — 이용약관 동의 모달.
          TODO: 공통 약관 동의 컴포넌트 구현되면 아래 체크박스/문구를 그 컴포넌트로 교체. */}
      <Modal
        open={!!applyTarget}
        onClose={closeApply}
        title="신청 확인"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeApply} disabled={applying}>
              취소
            </Button>
            <Button
              size="sm"
              disabled={!agreed}
              loading={applying}
              style={{ background: agreed ? ACCENT : undefined }}
              onClick={handleApplyConfirm}
            >
              신청
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-[#1F2328]">
            {applyTarget && `[${applyTarget.name}]에 신청하시겠습니까? 신청 후 승인까지 1~2 영업일 소요될 수 있습니다.`}
          </p>
          {applyTarget && isFull(applyTarget) && (
            <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-[8px] px-4 py-3">
              <p className="text-[12px] font-bold text-[#92400E]">
                정원이 마감되어 신청 시 대기열로 등록됩니다.
              </p>
            </div>
          )}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded-[3px] accent-[#2563EB] flex-shrink-0"
            />
            <span className="text-[12px] text-[#656D76] leading-snug">
              프로그램 이용약관 및 개인정보 처리 방침에 동의합니다.
            </span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
