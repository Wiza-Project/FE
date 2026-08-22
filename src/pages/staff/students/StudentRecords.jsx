import { useState } from 'react';
import { Modal, StatusBadge, Tabs, InfoField, Button, toast } from '@/components/common';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

const DEPTS = [
  '전체',
  '컴퓨터공학과',
  '경영학과',
  '심리학과',
  '산업공학과',
  '화학공학과',
  '국어국문학과',
  '사회복지학과',
];

const STATUSES = ['전체', '재학', '휴학', '졸업', '제적', '자퇴'];
const GRADES = ['전체', '1학년', '2학년', '3학년', '4학년'];

// 교직원용 "학적부관리" 모달(기본정보/변동이력 탭)에 필요한 상세 필드까지 포함한 목업입니다.
// 실제 학적원부 화면은 성적/장학/등록/병역 등 이 프로젝트에 아직 없는 도메인 탭도 갖고 있지만,
// 여기서는 데이터가 실재하는 기본정보·변동이력 탭만 구현했습니다.
const STUDENTS = [
  {
    studentId: '20231234',
    name: '홍길동',
    englishName: 'Hong Gil-dong',
    gender: '남',
    dept: '컴퓨터공학과',
    grade: '3학년',
    classGroup: 'A반',
    dayNight: '주간',
    admissionYear: 2023,
    admissionType: '신입학',
    curriculumType: '일반과정',
    status: '재학',
    advisor: '김지도 교수',
    doubleMajor: '경영학과 (복수전공)',
    birth: '2003-04-12',
    ssn: '030412-3******',
    phone: '010-1234-5678',
    phone2: null,
    email: 'hong@korea.ac.kr',
    zipcode: '07326',
    address: '서울시 영등포구 여의도동 123-4',
    nationality: '대한민국',
    highSchool: '한국고등학교',
    highSchoolGradDate: '2023-02-08',
    admissionScore: 812,
    admissionTypeDetail: '일반전형',
    reenrollDate: null,
    graduationDate: null,
    history: [
      { date: '2023-03-02', code: '입학', reason: '신입학', military: '-' },
      { date: '2026-03-02', code: '재학', reason: '2026학년도 1학기 등록', military: '-' },
    ],
  },
  {
    studentId: '20231111',
    name: '김영희',
    englishName: 'Kim Young-hee',
    gender: '여',
    dept: '경영학과',
    grade: '4학년',
    classGroup: 'B반',
    dayNight: '주간',
    admissionYear: 2023,
    admissionType: '신입학',
    curriculumType: '일반과정',
    status: '재학',
    advisor: '이상담 교수',
    doubleMajor: null,
    birth: '2003-08-21',
    ssn: '030821-4******',
    phone: '010-2222-3333',
    phone2: '02-333-4444',
    email: 'kim@korea.ac.kr',
    zipcode: '04524',
    address: '서울시 중구 을지로 45',
    nationality: '대한민국',
    highSchool: '서울고등학교',
    highSchoolGradDate: '2023-02-07',
    admissionScore: 795,
    admissionTypeDetail: '일반전형',
    reenrollDate: '2026-03-02',
    graduationDate: null,
    history: [
      { date: '2023-03-02', code: '입학', reason: '신입학', military: '-' },
      { date: '2025-03-02', code: '휴학', reason: '일반휴학 1년', military: '해당없음' },
      { date: '2026-03-02', code: '복학', reason: '일반복학', military: '해당없음' },
    ],
  },
  {
    studentId: '20230777',
    name: '이민수',
    englishName: 'Lee Min-su',
    gender: '남',
    dept: '산업공학과',
    grade: '3학년',
    classGroup: 'A반',
    dayNight: '주간',
    admissionYear: 2023,
    admissionType: '신입학',
    curriculumType: '일반과정',
    status: '휴학',
    advisor: '박가이드 교수',
    doubleMajor: null,
    birth: '2003-11-03',
    ssn: '031103-3******',
    phone: '010-3333-4444',
    phone2: null,
    email: 'lee@korea.ac.kr',
    zipcode: '35240',
    address: '대전시 유성구 대학로 12',
    nationality: '대한민국',
    highSchool: '대전고등학교',
    highSchoolGradDate: '2023-02-09',
    admissionScore: 780,
    admissionTypeDetail: '일반전형',
    reenrollDate: '2027년 1학기 (예정)',
    graduationDate: null,
    history: [
      { date: '2023-03-02', code: '입학', reason: '신입학', military: '-' },
      { date: '2026-03-02', code: '휴학', reason: '군입대휴학', military: '입영' },
    ],
  },
  {
    studentId: '20211500',
    name: '정유진',
    englishName: 'Jung Yu-jin',
    gender: '여',
    dept: '화학공학과',
    grade: '4학년',
    classGroup: 'C반',
    dayNight: '주간',
    admissionYear: 2021,
    admissionType: '신입학',
    curriculumType: '일반과정',
    status: '졸업',
    advisor: '최코치 교수',
    doubleMajor: null,
    birth: '2001-02-17',
    ssn: '010217-4******',
    phone: '010-4444-5555',
    phone2: null,
    email: 'jung@korea.ac.kr',
    zipcode: '61186',
    address: '광주시 북구 용봉로 8',
    nationality: '대한민국',
    highSchool: '광주고등학교',
    highSchoolGradDate: '2021-02-05',
    admissionScore: 825,
    admissionTypeDetail: '특별전형',
    reenrollDate: null,
    graduationDate: '2026-02-20',
    history: [
      { date: '2021-03-02', code: '입학', reason: '신입학', military: '-' },
      { date: '2026-02-20', code: '졸업', reason: '2025학년도 2학기 졸업사정 통과', military: '-' },
    ],
  },
  {
    studentId: '20221900',
    name: '오한별',
    englishName: 'Oh Han-byeol',
    gender: '여',
    dept: '경영학과',
    grade: '4학년',
    classGroup: 'B반',
    dayNight: '야간',
    admissionYear: 2022,
    admissionType: '편입학',
    curriculumType: '일반과정',
    status: '제적',
    advisor: '김지도 교수',
    doubleMajor: null,
    birth: '2002-06-30',
    ssn: '020630-4******',
    phone: '010-5555-6666',
    phone2: null,
    email: 'oh@korea.ac.kr',
    zipcode: '48058',
    address: '부산시 해운대구 센텀로 90',
    nationality: '대한민국',
    highSchool: '부산고등학교',
    highSchoolGradDate: '2020-02-06',
    admissionScore: null,
    admissionTypeDetail: '편입학전형',
    reenrollDate: null,
    graduationDate: null,
    history: [
      { date: '2022-03-02', code: '입학', reason: '편입학', military: '-' },
      { date: '2025-09-01', code: '제적', reason: '등록금 미납 제적', military: '-' },
    ],
  },
  {
    studentId: '20232211',
    name: '박나라',
    englishName: 'Park Na-ra',
    gender: '여',
    dept: '국어국문학과',
    grade: '2학년',
    classGroup: 'A반',
    dayNight: '주간',
    admissionYear: 2023,
    admissionType: '신입학',
    curriculumType: '일반과정',
    status: '재학',
    advisor: '이상담 교수',
    doubleMajor: null,
    birth: '2004-01-09',
    ssn: '040109-4******',
    phone: '010-6666-7777',
    phone2: null,
    email: 'park@korea.ac.kr',
    zipcode: '03127',
    address: '서울시 종로구 자하문로 5',
    nationality: '대한민국',
    highSchool: '경기고등학교',
    highSchoolGradDate: '2023-02-08',
    admissionScore: 760,
    admissionTypeDetail: '일반전형',
    reenrollDate: null,
    graduationDate: null,
    history: [
      { date: '2023-03-02', code: '입학', reason: '신입학', military: '-' },
      { date: '2026-03-02', code: '재학', reason: '2026학년도 1학기 등록', military: '-' },
    ],
  },
  {
    studentId: '20230912',
    name: '임수아',
    englishName: 'Lim Su-a',
    gender: '여',
    dept: '사회복지학과',
    grade: '4학년',
    classGroup: 'C반',
    dayNight: '주간',
    admissionYear: 2023,
    admissionType: '신입학',
    curriculumType: '일반과정',
    status: '재학',
    advisor: '박가이드 교수',
    doubleMajor: '심리학과 (부전공)',
    birth: '2003-09-14',
    ssn: '030914-4******',
    phone: '010-7777-8888',
    phone2: null,
    email: 'im@korea.ac.kr',
    zipcode: '16419',
    address: '수원시 영통구 월드컵로 206',
    nationality: '대한민국',
    highSchool: '수원고등학교',
    highSchoolGradDate: '2023-02-07',
    admissionScore: 771,
    admissionTypeDetail: '일반전형',
    reenrollDate: null,
    graduationDate: null,
    history: [
      { date: '2023-03-02', code: '입학', reason: '신입학', military: '-' },
      { date: '2026-03-02', code: '재학', reason: '2026학년도 1학기 등록', military: '-' },
    ],
  },
  {
    studentId: '20241002',
    name: '박철수',
    englishName: 'Park Chul-su',
    gender: '남',
    dept: '컴퓨터공학과',
    grade: '1학년',
    classGroup: 'A반',
    dayNight: '주간',
    admissionYear: 2024,
    admissionType: '신입학',
    curriculumType: '일반과정',
    status: '재학',
    advisor: '최코치 교수',
    doubleMajor: null,
    birth: '2005-05-22',
    ssn: '050522-3******',
    phone: '010-8888-9999',
    phone2: null,
    email: 'chulsoo@korea.ac.kr',
    zipcode: '13529',
    address: '성남시 분당구 판교로 200',
    nationality: '대한민국',
    highSchool: '분당고등학교',
    highSchoolGradDate: '2024-02-08',
    admissionScore: 798,
    admissionTypeDetail: '일반전형',
    reenrollDate: null,
    graduationDate: null,
    history: [{ date: '2024-03-02', code: '입학', reason: '신입학', military: '-' }],
  },
];

const DETAIL_TABS = [
  { key: 'basic', label: '기본정보' },
  { key: 'history', label: '변동이력' },
];

/**
 * 학적부관리 모달 상단의 학번/이름 검색바. 모달을 닫지 않고 다른 학생으로 바로 전환할 수 있게 합니다.
 */
function DetailSearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const submit = () => {
    if (!query.trim()) return;
    const found = STUDENTS.find((s) => s.studentId === query.trim() || s.name === query.trim());
    if (!found) {
      toast('일치하는 학생이 없습니다. 학번 또는 이름을 정확히 입력해 주세요.', 'error');
      return;
    }
    onSearch(found);
    setQuery('');
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
        className="h-8 px-3.5 text-[12px] font-bold rounded-[5px] text-white shrink-0"
        style={{ background: ACCENT }}
      >
        조회
      </button>
    </div>
  );
}

function DetailHeader({ student }) {
  const [ssnVisible, setSsnVisible] = useState(false);

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
        <InfoField label="이름" value={`${student.name} (${student.englishName})`} />
        <InfoField label="소속학과" value={student.dept} />
        <InfoField label="주민번호/성별">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#1F2328] font-mono">
              {ssnVisible
                ? student.ssn.replace('*', student.gender === '남' ? '1' : '2')
                : student.ssn}
            </span>
            <span className="text-[13px] text-[#656D76]">{student.gender}</span>
            <button
              onClick={() => setSsnVisible((v) => !v)}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#E5E7EB] text-[#656D76] hover:bg-[#F3F4F6]"
            >
              {ssnVisible ? '가리기' : '보이기'}
            </button>
          </div>
        </InfoField>
        <InfoField label="학년/분반" value={`${student.grade} · ${student.classGroup}`} />
        <InfoField label="주야구분" value={student.dayNight} />
        <InfoField label="휴대전화" value={student.phone} />
        <InfoField label="학적상태">
          <StatusBadge status={student.status} />
        </InfoField>
        <InfoField label="최종변동" value={student.history.at(-1)?.code} />
        <InfoField
          label="입학일자"
          value={`${student.admissionYear}-03-02 (${student.admissionType})`}
        />
        <InfoField label="지도교수" value={student.advisor} />
        <InfoField label="복수전공/부전공" value={student.doubleMajor ?? '해당 없음'} />
      </div>
    </div>
  );
}

function BasicInfoTab({ student }) {
  return (
    <div className="grid grid-cols-3 gap-x-5 gap-y-4">
      <InfoField label="이메일" value={student.email} />
      <InfoField label="자택 전화번호" value={student.phone2 ?? '해당 없음'} />
      <InfoField label="국가구분" value={student.nationality} />
      <InfoField label="우편번호" value={student.zipcode} />
      <div className="col-span-2">
        <InfoField label="주소" value={student.address} />
      </div>
      <InfoField label="출신고등학교" value={student.highSchool} />
      <InfoField label="고교졸업일자" value={student.highSchoolGradDate} />
      <InfoField
        label="입학성적"
        value={student.admissionScore != null ? `${student.admissionScore}점` : '해당 없음'}
      />
      <InfoField label="전형구분" value={student.admissionTypeDetail} />
      <InfoField label="재입학일자" value={student.reenrollDate ?? '해당 없음'} />
      <InfoField label="졸업일자" value={student.graduationDate ?? '해당 없음'} />
    </div>
  );
}

function HistoryTab({ student }) {
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

export default function StudentRecords() {
  const [dept, setDept] = useState('전체');
  const [status, setStatus] = useState('전체');
  const [grade, setGrade] = useState('전체');
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('basic');

  const filtered = STUDENTS.filter(
    (s) =>
      (dept === '전체' || s.dept === dept) &&
      (status === '전체' || s.status === status) &&
      (grade === '전체' || s.grade === grade) &&
      (!keyword || s.studentId.includes(keyword) || s.name.includes(keyword)),
  );

  const counts = {
    전체: STUDENTS.length,
    재학: STUDENTS.filter((s) => s.status === '재학').length,
    휴학: STUDENTS.filter((s) => s.status === '휴학').length,
    졸업: STUDENTS.filter((s) => s.status === '졸업').length,
  };

  const openDetail = (s) => {
    setDetail(s);
    setTab('basic');
  };

  const notReady = (label) => toast(`${label} 기능은 백엔드 연동 준비 중입니다.`, 'info');

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
        {[
          { label: '전체', value: counts['전체'] },
          { label: '재학', value: counts['재학'] },
          { label: '휴학', value: counts['휴학'] },
          { label: '졸업', value: counts['졸업'] },
        ].map((t) => (
          <div
            key={t.label}
            className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-4 flex flex-col gap-1"
          >
            <span className="text-[12px] font-semibold text-[#656D76] uppercase tracking-wide">
              {t.label}
            </span>
            <span className="text-[24px] font-bold" style={{ color: ACCENT }}>
              {t.value}
              <span className="text-[13px] font-semibold text-[#9AA0A6]">명</span>
            </span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-4 mb-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76]">학과</label>
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="h-9 px-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#9CA3AF] min-w-[150px]"
          >
            {DEPTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76]">학년</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="h-9 px-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#9CA3AF] min-w-[100px]"
          >
            {GRADES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#656D76]">재학상태</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
            placeholder="학번 또는 이름을 입력하세요"
            className="h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#9CA3AF]"
          />
        </div>
        <button
          className="h-9 px-5 text-[13px] font-bold rounded-[6px] text-white shrink-0"
          style={{ background: ACCENT }}
        >
          조회
        </button>
      </div>

      {/* Result table */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="text-[13px] font-bold text-[#1F2328]">조회 결과</span>
          <span className="text-[12px] text-[#9AA0A6]">{filtered.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {[
                  'No',
                  '학번',
                  '이름',
                  '학과',
                  '학년',
                  '입학년도',
                  '재학상태',
                  '지도교수',
                  '상세',
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 6 ? 'text-center' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.studentId}
                  className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                >
                  <td className="px-4 py-3 text-[#9AA0A6]">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[#444D56]">{s.studentId}</td>
                  <td className="px-4 py-3 font-bold text-[#1F2328]">{s.name}</td>
                  <td className="px-4 py-3 text-[#656D76]">{s.dept}</td>
                  <td className="px-4 py-3 text-[#656D76]">{s.grade}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6]">
                    {s.admissionYear}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={s.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-center text-[#656D76]">{s.advisor}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openDetail(s)}
                      className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors"
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[12px] text-[#9AA0A6]">
                    조회 조건에 해당하는 학생이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 학적부관리 모달 */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
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
        {detail && (
          <div>
            <DetailSearchBar onSearch={openDetail} />
            <DetailHeader student={detail} />
            <Tabs tabs={DETAIL_TABS} active={tab} onChange={setTab} accentColor={ACCENT} />
            {tab === 'basic' ? <BasicInfoTab student={detail} /> : <HistoryTab student={detail} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
