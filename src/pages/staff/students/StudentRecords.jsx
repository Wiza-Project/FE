import { useEffect, useState } from 'react';
import { fetchStudentList, fetchStudentStatusSummary, fetchStudentDetail } from '@/api/students';
import { useCommonCode } from '@/hooks/useCommonCode';
import {
  Modal,
  StatusBadge,
  Tabs,
  InfoField,
  Button,
  Pagination,
  SkeletonLoader,
  EmptyState,
  toast,
} from '@/components/common';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)
const PAGE_SIZE = 10;

const STATUSES = ['전체', '재학', '휴학', '졸업', '제적', '자퇴'];

const DETAIL_TABS = [
  { key: 'basic', label: '기본정보' },
  { key: 'history', label: '변동이력' },
];

/**
 * 학적부관리 모달 상단의 학번/이름 검색바. 모달을 닫지 않고 다른 학생으로 바로 전환할 수 있게 합니다.
 * GET /api/admin/students?keyword= 로 검색해 최상단 일치 건을 바로 엽니다.
 */
function DetailSearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const submit = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetchStudentList({ keyword: query.trim(), page: 0, size: 1 });
      const found = res.content?.[0];
      if (!found) {
        toast('일치하는 학생이 없습니다. 학번 또는 이름을 정확히 입력해 주세요.', 'error');
        return;
      }
      onSelect(found.studentId);
      setQuery('');
    } catch (err) {
      toast(err.message ?? '학생 검색에 실패했습니다.', 'error');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 py-2">
      <span className="text-[11px] font-semibold text-[#656D76] shrink-0">학번(이름)</span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="다른 학생의 학번 또는 이름을 입력하세요"
        className="flex-1 h-8 px-2.5 text-[12px] rounded-[5px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#9CA3AF]"
      />
      <button
        onClick={submit}
        disabled={searching}
        className="h-8 px-3.5 text-[12px] font-bold rounded-[5px] text-white shrink-0 disabled:opacity-50"
        style={{ background: ACCENT }}
      >
        조회
      </button>
    </div>
  );
}

/**
 * 원래 있던 "주민번호 보이기" 토글은 평문 조회 엔드포인트가 없어 없앴습니다 — 누르면
 * 아무 일도 안 일어나는 버튼을 보여주는 것보다, 다른 필드처럼 "-"로 두는 게 낫다고
 * 판단했습니다(학생 화면 보호자연락처와 동일한 판단).
 */
function DetailHeader({ student }) {
  return (
    <div className="flex gap-5 pb-4 mb-4 border-b border-[#E5E7EB]">
      <div className="w-20 h-24 rounded-[6px] bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center shrink-0">
        <svg width="28" height="28" viewBox="0 0 16 16" fill="#C1C7CD">
          <circle cx="8" cy="5.5" r="3" />
          <path d="M2 15c0-3.314 2.686-6 6-6s6 2.686 6 6" />
        </svg>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-x-5 gap-y-3">
        <InfoField label="학번" value={student.studentId} />
        <InfoField label="이름" value={student.name} />
        <InfoField label="영문성명" value={student.englishName} />
        <InfoField label="소속" value={student.department} />
        <InfoField label="주민번호" value={student.ssnMasked} />
        <InfoField label="성별" value={student.gender} />
        <InfoField label="학년" value={student.grade} />
        <InfoField label="분반" value={student.classGroup} />
        <InfoField label="주야구분" value={student.dayNight} />
        <InfoField label="휴대전화" value={student.phone} />
        <InfoField label="학적상태">
          <StatusBadge status={student.status} />
        </InfoField>
        <InfoField label="최종변동" value={student.history?.at(-1)?.code} />
        <InfoField label="입학일자" value={student.admissionDate} />
        <InfoField label="지도교수" value={student.advisor} />
        <InfoField label="복수전공/부전공" value={student.doubleMajor} />
      </div>
    </div>
  );
}

function BasicInfoTab({ student }) {
  return (
    <div className="grid grid-cols-3 gap-x-5 gap-y-4">
      <InfoField label="이메일" value={student.email} />
      <InfoField label="자택 전화번호" value={student.homePhone} />
      <InfoField label="국가구분" value={student.nationality} />
      <InfoField label="우편번호" value={student.zipcode} />
      <div className="col-span-2">
        <InfoField label="주소" value={student.address} />
      </div>
      <InfoField label="출신고등학교" value={student.highSchool} />
      <InfoField label="고교졸업일자" value={student.highSchoolGradDate} />
      <InfoField
        label="입학성적"
        value={student.admissionScore != null ? `${student.admissionScore}점` : undefined}
      />
      <InfoField label="전형구분" value={student.admissionTypeDetail} />
      <InfoField label="재입학일자" value={student.reenrollDate} />
      <InfoField label="졸업일자" value={student.graduationDate} />
    </div>
  );
}

function HistoryTab({ student }) {
  if (!student.history?.length) {
    return <div className="py-12 text-center text-[13px] text-[#9AA0A6]">-</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
            {['No', '변동일자', '변동코드', '변동사유', '병무구분'].map((h, i) => (
              <th
                key={h}
                className={`px-3 py-2.5 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i === 0 ? 'text-center' : 'text-left'}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {student.history.map((h, i) => (
            <tr key={i} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]">
              <td className="px-3 py-2.5 text-center text-[#9AA0A6]">{i + 1}</td>
              <td className="px-3 py-2.5 font-mono text-[11px] text-[#444D56]">{h.date}</td>
              <td className="px-3 py-2.5 font-semibold text-[#1F2328]">{h.code}</td>
              <td className="px-3 py-2.5 text-[#656D76]">{h.reason}</td>
              <td className="px-3 py-2.5 text-[#656D76]">{h.military}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 교직원 포털 · 학적 조회 화면.
 *
 * 목록은 GET /api/admin/students, 상단 통계 타일은 GET /api/admin/students/summary,
 * 학적부관리 모달 상세는 GET /api/admin/students/{studentId}로 조회합니다.
 *
 * 
 * 실제 채워지는 필드는 학번/이름/연락처/이메일/소속/학년/학적상태뿐입니다. 화면 레이아웃(목록 컬럼,
 * 모달의 기본정보·변동이력 탭)은 원래 기획대로 전부 유지하고, 값이 없는 항목만
 * InfoField가 자동으로 "-"를 보여주게 했습니다 — 데이터가 이후에 채워지면 레이아웃을
 * 다시 만들 필요 없이 API 응답만 채우면 됩니다.
 *
 * 주의(회신 1장): `department` 필터·표시는 학과가 아니라 교내 행정 조직 4개
 * (common_code 그룹 DEPARTMENT) 중 하나입니다. "학과"라고 표기하지 않습니다.
 */
export default function StudentRecords() {
  const { data: departmentCodes = [] } = useCommonCode('DEPARTMENT');
  const deptOptions = [
    { value: '전체', label: '전체' },
    ...departmentCodes.map((c) => ({ value: c.code, label: c.codeName })),
  ];

  const [dept, setDept] = useState('전체');
  const [status, setStatus] = useState('전체');
  const [grade, setGrade] = useState(''); // 학년 저장 포맷이 아직 미확정이라 자유 입력으로 둠
  const [keyword, setKeyword] = useState('');
  const [submittedGrade, setSubmittedGrade] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState(null);

  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState('basic');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStudentList({
      department: dept === '전체' ? undefined : dept,
      status: status === '전체' ? undefined : status,
      grade: submittedGrade || undefined,
      keyword: submittedKeyword || undefined,
      page: page - 1,
      size: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setRows(res.content ?? []);
        setTotalItems(res.totalElements ?? 0);
        setTotalPages(res.totalPages || 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? '학생 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dept, status, submittedGrade, submittedKeyword, page]);

  useEffect(() => {
    fetchStudentStatusSummary()
      .then(setSummary)
      .catch(() => setSummary(null)); // 타일은 부가 정보라 실패해도 목록 조회 자체는 막지 않습니다.
  }, []);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setTab('basic');
    fetchStudentDetail(detailId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (cancelled) return;
        toast(err.message ?? '학적 상세 정보를 불러오지 못했습니다.', 'error');
        setDetailId(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  const runSearch = () => {
    setPage(1);
    setSubmittedKeyword(keyword);
    setSubmittedGrade(grade);
  };

  const withFilterReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const notReady = (label) => toast(`${label} 기능은 백엔드 연동 준비 중입니다.`, 'info');

  const tiles = [
    { label: '전체', value: summary?.total ?? '-' },
    { label: '재학', value: summary?.byStatus?.['재학'] ?? '-' },
    { label: '휴학', value: summary?.byStatus?.['휴학'] ?? '-' },
    { label: '졸업', value: summary?.byStatus?.['졸업'] ?? '-' },
  ];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[18px] font-black text-[#1F2328]">학적 조회</h1>
        <p className="text-[12px] text-[#9AA0A6] mt-0.5">
          학생의 학적사항(재학상태·학적변동이력)을 조회합니다.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-4 flex flex-col gap-1"
          >
            <span className="text-[12px] font-semibold text-[#656D76] uppercase tracking-wide">
              {t.label}
            </span>
            <span className="text-[24px] font-bold" style={{ color: ACCENT }}>
              {t.value}
              {t.value !== '-' && (
                <span className="text-[13px] font-semibold text-[#9AA0A6]">명</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-4 mb-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76]">소속</label>
          <select
            value={dept}
            onChange={(e) => withFilterReset(setDept)(e.target.value)}
            className="h-9 px-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#9CA3AF] min-w-[170px]"
          >
            {deptOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76]">학년</label>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="예: 3"
            className="h-9 px-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#9CA3AF] w-[80px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76]">재학상태</label>
          <select
            value={status}
            onChange={(e) => withFilterReset(setStatus)(e.target.value)}
            className="h-9 px-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#9CA3AF] min-w-[100px]"
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-[11px] font-semibold text-[#656D76]">학번/이름 검색</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="학번 또는 이름을 입력하세요"
            className="h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#9CA3AF]"
          />
        </div>
        <button
          onClick={runSearch}
          className="h-9 px-5 text-[13px] font-bold rounded-[6px] text-white shrink-0"
          style={{ background: ACCENT }}
        >
          조회
        </button>
      </div>

      {/* Result table */}
      {loading ? (
        <SkeletonLoader rows={PAGE_SIZE} cols={9} />
      ) : error ? (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB]">
          <EmptyState message="학생 목록을 불러오지 못했습니다." sub={error} />
        </div>
      ) : (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#1F2328]">조회 결과</span>
            <span className="text-[12px] text-[#9AA0A6]">{totalItems}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {[
                    'No',
                    '학번',
                    '이름',
                    '소속',
                    '학년',
                    '입학년도',
                    '재학상태',
                    '지도교수',
                    '상세',
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
                {rows.map((s, i) => (
                  <tr
                    key={s.studentId}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#9AA0A6]">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#444D56]">
                      {s.studentId}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1F2328]">{s.name}</td>
                    <td className="px-4 py-3 text-[#656D76]">{s.department ?? '-'}</td>
                    <td className="px-4 py-3 text-[#656D76]">{s.grade ?? '-'}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                      {s.admissionYear ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center text-[#656D76]">{s.advisor ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setDetailId(s.studentId)}
                        className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[12px] text-[#9AA0A6]">
                      조회 조건에 해당하는 학생이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalItems > 0 && (
            <div className="px-5 pb-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={PAGE_SIZE}
                onChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* 학적부관리 모달 */}
      <Modal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title="학적부관리"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => notReady('정보 수정')}>
              정보 수정
            </Button>
            <Button variant="secondary" onClick={() => notReady('학적상태 변경')}>
              학적상태 변경
            </Button>
            <Button variant="outline" onClick={() => notReady('증명서 출력')}>
              증명서 출력
            </Button>
          </>
        }
      >
        <DetailSearchBar onSelect={setDetailId} />
        {detailLoading || !detail ? (
          <SkeletonLoader rows={4} cols={3} />
        ) : (
          <div>
            <DetailHeader student={detail} />
            <Tabs tabs={DETAIL_TABS} active={tab} onChange={setTab} accentColor={ACCENT} />
            {tab === 'basic' ? <BasicInfoTab student={detail} /> : <HistoryTab student={detail} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
