import { useEffect, useState } from 'react';
import { fetchPrograms } from '@/api/programs';
import { PageHeader, StatusBadge, Pagination, Button } from '@/components/common';
import { formatDate } from '@/utils/date';
import { useCommonCode } from '@/hooks/useCommonCode';

const ACCENT = '#2563EB';

// ProgramListItemResponseDTO(GET /api/students/programs) -> 목록 화면에서 쓰는 행 모양으로 변환.
// 신청인원(applied)/연계역량(competency)/적립점수(mileage)는 해당 API가 아직
// 내려주지 않아 화면이 깨지지 않도록 안전한 기본값을 채운다.
const toRow = (dto) => ({
  id: dto.programId,
  name: dto.programName,
  category: dto.programTypeCodeName,
  dept: dto.operatingUnitCodeName,
  period: `${formatDate(dto.recruitmentStartsAt)} ~ ${formatDate(dto.recruitmentEndsAt)}`,
  capacity: dto.capacity ?? 0,
  status: dto.programStatusLabel,
  applied: 0,
  competency: null,
  mileage: 0,
});

const COMP_OPTIONS = [
  { value: '', label: '핵심역량 전체' },
  { value: '자기관리', label: '자기관리' },
  { value: '의사소통', label: '의사소통' },
  { value: '글로벌', label: '글로벌' },
  { value: '대인관계', label: '대인관계' },
  { value: '종합적 사고력', label: '종합적 사고력' },
  { value: '자원·정보·기술 활용', label: '자원·정보·기술 활용' },
];

const SORT_OPTIONS = [
  { value: 'new', label: '신규순' },
  { value: 'deadline', label: '마감임박순' },
  { value: 'recommend', label: '추천순' },
];

const CHIPS = [
  { label: '전체', count: 128 },
  { label: '모집중', count: 24 },
  { label: '마감임박', count: 5 },
  { label: '신청가능', count: 18 },
  { label: '내 학과 대상', count: 11 },
];

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

function getStatusBadges(p) {
  const isFull = p.applied >= p.capacity && p.capacity > 0;
  const days =
    p.period !== '상시'
      ? Math.ceil(
          (new Date(p.period.split(' ~ ')[1] ?? p.period).getTime() - Date.now()) / 86400000,
        )
      : 99;
  const isUrgent =
    !isFull && (days <= 3 || (p.capacity > 0 && (p.capacity - p.applied) / p.capacity <= 0.1));
  return { isFull, isUrgent, days };
}

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
  const [dept, setDept] = useState('');
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [programs, setPrograms] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const PAGE_SIZE = 10;

  const { data: departmentCodes = [] } = useCommonCode('DEPARTMENT');
  const deptOptions = [
    { value: '', label: '주관부서 전체' },
    ...departmentCodes.map((c) => ({ value: c.code, label: c.codeName })),
  ];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPrograms({
      keyword: submittedKeyword || undefined,
      page: page - 1,
      size: PAGE_SIZE,
      sort: 'createdAt,desc',
    })
      .then((res) => {
        if (cancelled) return;
        setPrograms(res.content.map(toRow));
        setTotalItems(res.totalElements);
        setTotalPages(res.totalPages || 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? '프로그램 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, submittedKeyword]);

  // 핵심역량/주관부서 필터는 백엔드가 아직 쿼리 파라미터로 지원하지 않아,
  // 현재 페이지에 이미 내려온 데이터 안에서만 걸러진다(서버 페이지네이션과는 별개).
  const filtered = programs.filter(
    (p) => (!comp || p.competency === comp) && (!dept || p.dept === dept),
  );
  const paged = filtered;

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
            <label className="text-[11px] font-semibold text-[#656D76] uppercase">주관부서</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="h-9 px-3 pr-7 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white appearance-none focus:outline-none focus:border-[#2563EB]"
            >
              {deptOptions.map((o) => (
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
                setDept('');
                setKeyword('');
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
          {CHIPS.map((c) => (
            <button
              key={c.label}
              onClick={() => setChip(c.label)}
              className={`px-3 py-1.5 rounded-[999px] text-[12px] font-bold transition-all border ${chip === c.label ? 'text-white border-transparent' : 'bg-white border-[#E5E7EB] text-[#656D76] hover:border-[#2563EB] hover:text-[#2563EB]'}`}
              style={chip === c.label ? { background: ACCENT } : {}}
            >
              {c.label}{' '}
              <span className={chip === c.label ? 'text-[#BFDBFE]' : 'text-[#9AA0A6]'}>
                {c.count}
              </span>
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

      {/* TABLE VIEW */}
      {!loading && !error && viewMode === 'table' && (
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
                  const { isFull, isUrgent } = getStatusBadges(p);
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
                          {isUrgent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                              마감임박
                            </span>
                          )}
                          {isFull && (
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
                          <span className={isFull ? 'text-[#CF222E] font-bold' : ''}>
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
                        <StatusBadge status={isFull ? '마감' : p.status} size="sm" />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isFull ? (
                          <button className="h-7 px-3 text-[12px] font-bold text-[#2563EB] border border-[#2563EB] rounded-[5px] hover:bg-[#EFF6FF] transition-colors">
                            대기신청
                          </button>
                        ) : (
                          <button
                            onClick={() => onDetail(p.id)}
                            disabled={p.status === '종료'}
                            className="h-7 px-3 text-[12px] font-bold text-white rounded-[5px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: p.status === '종료' ? '#9AA0A6' : ACCENT }}
                          >
                            {p.status === '종료' ? '종료' : '신청'}
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
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
            />
          </div>
        </div>
      )}

      {/* CARD VIEW */}
      {!loading && !error && viewMode === 'card' && (
        <>
          <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2">
            {paged.map((p) => {
              const { isFull, isUrgent, days } = getStatusBadges(p);
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
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex gap-1 mb-1.5 flex-wrap">
                          {p.competency && <CompBadge label={p.competency} />}
                          {isUrgent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                              마감임박
                            </span>
                          )}
                          {isFull && (
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
                      {days <= 7 && days > 0 && (
                        <span
                          className={`text-[12px] font-black flex-shrink-0 ${days <= 3 ? 'text-[#CF222E]' : 'text-[#D97706]'}`}
                        >
                          D-{days}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[#656D76]">
                      {p.dept} · {p.period}
                    </div>
                    {p.capacity > 0 && (
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#9AA0A6]">정원</span>
                          <span
                            className={`font-semibold ${isFull ? 'text-[#CF222E]' : 'text-[#1F2328]'}`}
                          >
                            {p.applied}/{p.capacity}명
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((p.applied / p.capacity) * 100, 100)}%`,
                              background: isFull ? '#CF222E' : ACCENT,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6] mt-auto">
                      <span className="text-[12px] font-bold text-[#D97706]">🏅 {p.mileage}점</span>
                      <button
                        onClick={() => onDetail(p.id)}
                        disabled={p.status === '종료'}
                        className={`h-7 px-3 text-[12px] font-bold rounded-[5px] transition-colors disabled:opacity-40 ${isFull ? 'text-[#2563EB] border border-[#2563EB] hover:bg-[#EFF6FF]' : 'text-white'}`}
                        style={
                          isFull ? {} : { background: p.status === '종료' ? '#9AA0A6' : ACCENT }
                        }
                      >
                        {p.status === '종료' ? '종료' : isFull ? '대기신청' : '신청'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
            />
          </div>
        </>
      )}
    </div>
  );
}
