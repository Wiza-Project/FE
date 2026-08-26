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
const GRADES = ['전체', 1, 2, 3, 4];

const DETAIL_TABS = [
  { key: 'basic', label: '기본정보' },
  { key: 'history', label: '변동이력' },
];

const CHANGE_COLUMNS = ['No', '변동일자', '변동유형', '변동사유', '병무구분', '비고'];

/** 우편번호+기본주소+상세주소를 한 줄로 합친다. 셋 다 없으면 undefined(InfoField가 "-" 처리). */
function formatAddress(student) {
  const line = [student.addressBasic, student.addressDetail].filter(Boolean).join(' ');
  if (!line) return undefined;
  return student.zipcode ? `(${student.zipcode}) ${line}` : line;
}

function formatScheduledReturn(student) {
  if (!student.scheduledReturnYear) return undefined;
  return student.scheduledReturnSemesterCode
    ? `${student.scheduledReturnYear} / ${student.scheduledReturnSemesterCode}`
    : `${student.scheduledReturnYear}`;
}

function formatCompletedSemesters(student) {
  if (student.completedSemesters == null) return undefined;
  return student.semesterExceeded
    ? `${student.completedSemesters}학기 (학기초과)`
    : `${student.completedSemesters}학기`;
}

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
      onSelect(found.userId);
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
 * "주민번호 보이기" 토글은 평문 조회 엔드포인트가 없어 두지 않았습니다 — 누르면
 * 아무 일도 안 일어나는 버튼을 보여주는 것보다, 다른 필드처럼 마스킹 값 그대로 두는 게
 * 낫다고 판단했습니다(학생 화면과 동일한 판단). 증명사진도 채워질 URL이 없어 자리만
 * 유지하고 항상 플레이스홀더 아이콘을 보여줍니다.
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
        <InfoField label="학과" value={student.majorName} />
        <InfoField label="주민번호" value={student.residentNoMasked} />
        <InfoField label="학년" value={student.grade != null ? `${student.grade}학년` : undefined} />
        <InfoField label="휴대전화" value={student.phone} />
        <InfoField label="학적상태">
          <StatusBadge status={student.status} />
        </InfoField>
        <InfoField label="최근변동사유" value={student.latestChangeReason} />
        <InfoField label="입학일자" value={student.admissionDate} />
        <InfoField label="지도교수" value={student.advisorName} />
      </div>
    </div>
  );
}

function BasicInfoTab({ student }) {
  return (
    <div className="grid grid-cols-3 gap-x-5 gap-y-4">
      <InfoField label="이메일" value={student.email} />
      <InfoField label="이수학기" value={formatCompletedSemesters(student)} />
      <InfoField label="입학구분" value={student.admissionType} />
      <InfoField label="교육과정년도" value={student.curriculumYear} />
      <InfoField label="복학예정" value={formatScheduledReturn(student)} />
      <InfoField label="졸업일자" value={student.graduationDate} />
      <InfoField label="학위명" value={student.degreeName} />
      <InfoField label="학위번호" value={student.degreeNo} />
      <div className="col-span-2">
        <InfoField label="주소" value={formatAddress(student)} />
      </div>
      <div className="col-span-2">
        <InfoField label="보호자 연락처" value={student.guardianPhone} />
      </div>
    </div>
  );
}

function HistoryTab({ student }) {
  if (!student.changes?.length) {
    return <div className="py-12 text-center text-[13px] text-[#9AA0A6]">-</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
            {CHANGE_COLUMNS.map((h, i) => (
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
          {student.changes.map((h) => (
            <tr key={h.no} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]">
              <td className="px-3 py-2.5 text-center text-[#9AA0A6]">{h.no}</td>
              <td className="px-3 py-2.5 font-mono text-[11px] text-[#444D56]">{h.changeDate}</td>
              <td className="px-3 py-2.5 font-semibold text-[#1F2328]">{h.changeTypeName}</td>
              <td className="px-3 py-2.5 text-[#656D76]">{h.changeReasonName ?? '-'}</td>
              <td className="px-3 py-2.5 text-[#656D76]">{h.militaryStatus ?? '-'}</td>
              <td className="px-3 py-2.5 text-[#656D76]">{h.note ?? '-'}</td>
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
 * 학적부관리 모달 상세는 GET /api/admin/students/{userId}로 조회합니다
 *
 * 상세 조회의 경로 변수는 학번이 아니라 목록 응답의 `userId`(app_user 내부 PK)입니다.
 *
 * 필터·표시를 전부 `major`/`majorName` 기준으로 바꿨습니다("학과"로 표기).
 *
 
 * "정보 수정"·"학적상태 변경" 버튼은 교직원 수정 API가 다음 라운드로 넘어가 있어
 * 계속 토스트만 띄웁니다.
 */
export default function StudentRecords() {
  const { data: majorCodes = [] } = useCommonCode('MAJOR');
  const majorOptions = [
    { value: '전체', label: '전체' },
    ...majorCodes.map((c) => ({ value: c.codeId, label: c.codeName })),
  ];

  const [major, setMajor] = useState('전체');
  const [status, setStatus] = useState('전체');
  const [grade, setGrade] = useState('전체');
  const [keyword, setKeyword] = useState('');
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
      majorCodeId: major === '전체' ? undefined : major,
      status: status === '전체' ? undefined : status,
      grade: grade === '전체' ? undefined : grade,
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
  }, [major, status, grade, submittedKeyword, page]);

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
    { label: '제적', value: summary?.byStatus?.['제적'] ?? '-' },
    { label: '자퇴', value: summary?.byStatus?.['자퇴'] ?? '-' },
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
      <div className="grid grid-cols-6 gap-4 mb-5 max-[900px]:grid-cols-3">
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
          <label className="text-[11px] font-semibold text-[#656D76]">학과</label>
          <select
            value={major}
            onChange={(e) => withFilterReset(setMajor)(e.target.value)}
            className="h-9 px-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#9CA3AF] min-w-[170px]"
          >
            {majorOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76]">학년</label>
          <select
            value={grade}
            onChange={(e) => withFilterReset(setGrade)(e.target.value)}
            className="h-9 px-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#9CA3AF] w-[90px]"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g === '전체' ? '전체' : `${g}학년`}
              </option>
            ))}
          </select>
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
        <SkeletonLoader rows={PAGE_SIZE} cols={8} />
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
                  {['No', '학번', '이름', '학과', '학년', '입학일자', '재학상태', '상세'].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 4 ? 'text-center' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr
                    key={s.userId}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#9AA0A6]">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#444D56]">
                      {s.studentId}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1F2328]">{s.name}</td>
                    <td className="px-4 py-3 text-[#656D76]">{s.majorName ?? '-'}</td>
                    <td className="px-4 py-3 text-center text-[#656D76]">
                      {s.grade != null ? `${s.grade}학년` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-[11px] text-[#9AA0A6]">
                      {s.admissionDate ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setDetailId(s.userId)}
                        className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[12px] text-[#9AA0A6]">
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
