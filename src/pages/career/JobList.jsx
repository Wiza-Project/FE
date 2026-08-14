import { useState } from 'react';
import { PageHeader, Button, Pagination, toast } from '@/components/common';

const ACCENT = '#059669';

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const JOBS = [
  {
    id: 'J001',
    category: '추천채용',
    title: '소프트웨어 개발자 (신입/경력)',
    company: '(주)테크노바',
    ncs: '응용SW개발',
    region: '서울 강남구',
    deadline: '2026-08-16',
    dDay: 3,
    benefits: ['서류면제', '가산점'],
    bookmarked: true,
    applied: true,
  },
  {
    id: 'J002',
    category: '교내채용',
    title: '데이터 분석가 인턴',
    company: '삼성전자',
    ncs: '데이터분석',
    region: '수원 영통구',
    deadline: '2026-08-19',
    dDay: 6,
    benefits: ['가산점'],
    bookmarked: false,
    applied: false,
  },
  {
    id: 'J003',
    category: '인턴십',
    title: 'UI/UX 디자이너 인턴',
    company: '카카오',
    ncs: '컴퓨터그래픽스',
    region: '제주시',
    deadline: '2026-08-20',
    dDay: 7,
    benefits: [],
    bookmarked: false,
    applied: false,
  },
  {
    id: 'J004',
    category: '일반채용',
    title: '경영지원 사원',
    company: 'LG화학',
    ncs: '총무',
    region: '서울 영등포',
    deadline: '2026-08-21',
    dDay: 8,
    benefits: [],
    bookmarked: false,
    applied: false,
  },
  {
    id: 'J005',
    category: '추천채용',
    title: '임베디드 시스템 개발자',
    company: '현대모비스',
    ncs: '임베디드개발',
    region: '용인시',
    deadline: '2026-08-13',
    dDay: 0,
    benefits: ['서류면제'],
    bookmarked: true,
    applied: false,
  },
  {
    id: 'J006',
    category: '일반채용',
    title: '회계·재무 담당자',
    company: 'SK하이닉스',
    ncs: '회계',
    region: '이천시',
    deadline: '2026-08-22',
    dDay: 9,
    benefits: [],
    bookmarked: false,
    applied: false,
  },
  {
    id: 'J007',
    category: '교내채용',
    title: '산학협력 연구원',
    company: 'POSCO홀딩스',
    ncs: '생산관리',
    region: '포항시',
    deadline: '2026-08-25',
    dDay: 12,
    benefits: ['가산점'],
    bookmarked: false,
    applied: false,
  },
  {
    id: 'J008',
    category: '인턴십',
    title: '마케팅 인턴',
    company: 'CJ제일제당',
    ncs: '마케팅',
    region: '서울 중구',
    deadline: '2026-08-15',
    dDay: 2,
    benefits: [],
    bookmarked: false,
    applied: false,
  },
  {
    id: 'J009',
    category: '채용행사',
    title: '2026 하반기 채용박람회',
    company: '공동주관',
    ncs: '전직종',
    region: '서울 코엑스',
    deadline: '2026-08-14',
    dDay: 1,
    benefits: [],
    bookmarked: false,
    applied: false,
  },
  {
    id: 'J010',
    category: '일반채용',
    title: '기계 설계 엔지니어',
    company: '두산에너빌리티',
    ncs: '기계설계',
    region: '창원시',
    deadline: '2026-08-28',
    dDay: 15,
    benefits: [],
    bookmarked: false,
    applied: false,
  },
  {
    id: 'J011',
    category: '추천채용',
    title: 'AI·머신러닝 엔지니어',
    company: 'NAVER',
    ncs: 'AI개발',
    region: '성남 분당구',
    deadline: '2026-08-30',
    dDay: 17,
    benefits: ['서류면제'],
    bookmarked: false,
    applied: false,
  },
  {
    id: 'J012',
    category: '일반채용',
    title: '영업관리 담당자',
    company: '롯데백화점',
    ncs: '영업관리',
    region: '서울 중구',
    deadline: '2026-09-05',
    dDay: 23,
    benefits: [],
    bookmarked: false,
    applied: false,
  },
];

const CAT_COLORS = {
  추천채용: 'bg-[#FEF3C7] text-[#D97706]',
  교내채용: 'bg-[#DBEAFE] text-[#0969DA]',
  인턴십: 'bg-[#F3E8FF] text-[#7C3AED]',
  일반채용: 'bg-[#F3F4F6] text-[#6E7781]',
  채용행사: 'bg-[#DCFCE7] text-[#059669]',
};

const TAB_COUNTS = [
  { key: '전체', label: '전체', count: 342 },
  { key: '추천채용', label: '추천채용', count: 12 },
  { key: '교내채용', label: '교내채용', count: 8 },
  { key: '일반채용', label: '일반채용', count: 305 },
  { key: '인턴십', label: '인턴십', count: 15 },
  { key: '채용행사', label: '채용행사', count: 2 },
];

const BENEFIT_STYLES = {
  서류면제: 'bg-[#DCFCE7] text-[#059669]',
  가산점: 'bg-[#DCFCE7] text-[#059669]',
};

// ─── D-Day label ──────────────────────────────────────────────────────────────

function DDayBadge({ dDay }) {
  const urgent = dDay <= 3;
  const label = dDay === 0 ? 'D-DAY' : `D-${dDay}`;
  return (
    <div className="text-center">
      <div className={`text-[11px] font-black ${urgent ? 'text-[#CF222E]' : 'text-[#656D76]'}`}>
        {label}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {(id: string) => void} props.onDetail
 * @param {() => void} props.onBookmarks
 */
export default function JobList({ onDetail, onBookmarks }) {
  const [activeTab, setActiveTab] = useState('전체');
  const [keyword, setKeyword] = useState('');
  const [ncs, setNcs] = useState('');
  const [region, setRegion] = useState('');
  const [empType, setEmpType] = useState('');
  const [jobs, setJobs] = useState(JOBS);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = jobs.filter(
    (j) =>
      (activeTab === '전체' || j.category === activeTab) &&
      (!keyword || j.title.includes(keyword) || j.company.includes(keyword)) &&
      (!ncs || j.ncs.includes(ncs)) &&
      (!region || j.region.includes(region)),
  );
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleBookmark = (id, e) => {
    e.stopPropagation();
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, bookmarked: !j.bookmarked } : j)));
    const job = jobs.find((j) => j.id === id);
    toast(
      job?.bookmarked ? '관심 공고에서 제거되었습니다.' : '관심 공고에 저장되었습니다.',
      'success',
    );
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '취업·창업' }, { label: '채용공고' }]}
        title="채용공고"
        subtitle="추천채용, 교내채용, 인턴십 등 다양한 채용 기회를 탐색하세요."
        accentColor={ACCENT}
        actions={
          <button
            onClick={onBookmarks}
            className="flex items-center gap-1.5 h-8 px-4 text-[13px] font-bold rounded-[6px] border border-[#E5E7EB] text-[#656D76] hover:border-[#059669] hover:text-[#059669] transition-colors"
          >
            <span className="text-[15px]">★</span> 관심 공고
          </button>
        }
      />

      {/* FilterBar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 mb-4 flex items-end flex-wrap gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {[
          {
            label: '직무 (NCS)',
            opts: [
              '전체',
              '응용SW개발',
              '데이터분석',
              '임베디드개발',
              'AI개발',
              '회계',
              '마케팅',
              '기계설계',
              '영업관리',
              '총무',
              '생산관리',
              '컴퓨터그래픽스',
            ],
            val: ncs,
            set: setNcs,
          },
          {
            label: '지역',
            opts: ['전체', '서울', '경기', '인천', '부산', '대구', '제주', '기타'],
            val: region,
            set: setRegion,
          },
          {
            label: '고용형태',
            opts: ['전체', '정규직', '계약직', '인턴', '아르바이트'],
            val: empType,
            set: setEmpType,
          },
        ].map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#656D76] uppercase">{f.label}</label>
            <select
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              className="h-9 px-3 pr-8 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] appearance-none min-w-[140px]"
            >
              {f.opts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-[11px] font-semibold text-[#656D76] uppercase">
            기업명·공고명
          </label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="기업명 또는 공고명 검색"
            className="h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] w-full"
          />
        </div>
        <Button size="sm" style={{ background: ACCENT }}>
          조회
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setKeyword('');
            setNcs('');
            setRegion('');
            setEmpType('');
          }}
        >
          초기화
        </Button>
        <Button size="sm" variant="outline" className="ml-auto">
          엑셀
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-4 bg-[#F3F4F6] rounded-[8px] p-1 w-fit">
        {TAB_COUNTS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              setPage(1);
            }}
            className={`h-8 px-4 text-[12px] font-semibold rounded-[6px] transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === t.key ? 'bg-white text-[#1F2328] shadow-sm' : 'text-[#656D76] hover:text-[#1F2328]'}`}
          >
            {t.label}
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-[#059669] text-white' : 'bg-[#E5E7EB] text-[#9AA0A6]'}`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['구분', '공고명', '기업', '직무(NCS)', '지역', '마감', '혜택', '관리'].map((h) => (
                <th
                  key={h}
                  className={`px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${['공고명', '기업'].includes(h) ? 'text-left' : 'text-center'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((j, i) => (
              <tr
                key={j.id}
                onClick={() => onDetail(j.id)}
                className={`border-b border-[#F3F4F6] last:border-0 cursor-pointer hover:bg-[#F0FDF4] transition-colors ${j.applied ? 'opacity-70' : ''} ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
              >
                <td className="px-3 py-3 text-center">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLORS[j.category]}`}
                  >
                    {j.category}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {j.applied && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-[3px] bg-[#DCFCE7] text-[#059669] flex-shrink-0">
                        지원완료
                      </span>
                    )}
                    <span className="font-semibold text-[#1F2328] hover:text-[#059669] transition-colors leading-snug">
                      {j.title}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-[#656D76] whitespace-nowrap">{j.company}</td>
                <td className="px-3 py-3 text-center text-[#656D76] whitespace-nowrap">{j.ncs}</td>
                <td className="px-3 py-3 text-center text-[12px] text-[#656D76] whitespace-nowrap">
                  {j.region}
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="text-[11px] text-[#9AA0A6]">{j.deadline}</div>
                  <DDayBadge dDay={j.dDay} />
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex flex-col gap-1 items-center">
                    {j.benefits.map((b) => (
                      <span
                        key={b}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] ${BENEFIT_STYLES[b]}`}
                      >
                        {b}
                      </span>
                    ))}
                    {j.benefits.length === 0 && <span className="text-[#C8D0D9]">—</span>}
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={(e) => toggleBookmark(j.id, e)}
                    className={`text-[18px] transition-colors hover:scale-110 ${j.bookmarked ? 'text-[#D97706]' : 'text-[#D1D5DB] hover:text-[#D97706]'}`}
                  >
                    {j.bookmarked ? '★' : '☆'}
                  </button>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[#9AA0A6] text-[13px]">
                  검색 조건에 맞는 공고가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-[#E5E7EB]">
          <Pagination
            page={page}
            totalPages={Math.ceil(filtered.length / PAGE_SIZE)}
            onChange={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      </div>
    </div>
  );
}
