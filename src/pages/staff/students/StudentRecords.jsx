import { useState } from 'react';
import { Modal, StatusBadge } from '@/components/common';

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

const STUDENTS = [
  {
    studentId: '20231234',
    name: '홍길동',
    dept: '컴퓨터공학과',
    grade: '3학년',
    admissionYear: 2023,
    status: '재학',
    advisor: '김지도 교수',
    doubleMajor: '경영학과 (복수전공)',
    birth: '2003-04-12',
    phone: '010-1234-5678',
    email: 'hong@korea.ac.kr',
    history: [
      { date: '2023-03-02', event: '입학', note: '2023학년도 1학기' },
      { date: '2026-03-02', event: '재학', note: '2026학년도 1학기 등록' },
    ],
  },
  {
    studentId: '20231111',
    name: '김영희',
    dept: '경영학과',
    grade: '4학년',
    admissionYear: 2023,
    status: '재학',
    advisor: '이상담 교수',
    doubleMajor: null,
    birth: '2003-08-21',
    phone: '010-2222-3333',
    email: 'kim@korea.ac.kr',
    history: [
      { date: '2023-03-02', event: '입학', note: '2023학년도 1학기' },
      { date: '2025-03-02', event: '휴학', note: '일반휴학 1년' },
      { date: '2026-03-02', event: '복학', note: '2026학년도 1학기' },
    ],
  },
  {
    studentId: '20230777',
    name: '이민수',
    dept: '산업공학과',
    grade: '3학년',
    admissionYear: 2023,
    status: '휴학',
    advisor: '박가이드 교수',
    doubleMajor: null,
    birth: '2003-11-03',
    phone: '010-3333-4444',
    email: 'lee@korea.ac.kr',
    history: [
      { date: '2023-03-02', event: '입학', note: '2023학년도 1학기' },
      { date: '2026-03-02', event: '휴학', note: '군입대휴학' },
    ],
  },
  {
    studentId: '20211500',
    name: '정유진',
    dept: '화학공학과',
    grade: '4학년',
    admissionYear: 2021,
    status: '졸업',
    advisor: '최코치 교수',
    doubleMajor: null,
    birth: '2001-02-17',
    phone: '010-4444-5555',
    email: 'jung@korea.ac.kr',
    history: [
      { date: '2021-03-02', event: '입학', note: '2021학년도 1학기' },
      { date: '2026-02-20', event: '졸업', note: '2025학년도 2학기 졸업사정 통과' },
    ],
  },
  {
    studentId: '20221900',
    name: '오한별',
    dept: '경영학과',
    grade: '4학년',
    admissionYear: 2022,
    status: '제적',
    advisor: '김지도 교수',
    doubleMajor: null,
    birth: '2002-06-30',
    phone: '010-5555-6666',
    email: 'oh@korea.ac.kr',
    history: [
      { date: '2022-03-02', event: '입학', note: '2022학년도 1학기' },
      { date: '2025-09-01', event: '제적', note: '등록금 미납 제적' },
    ],
  },
  {
    studentId: '20232211',
    name: '박나라',
    dept: '국어국문학과',
    grade: '2학년',
    admissionYear: 2023,
    status: '재학',
    advisor: '이상담 교수',
    doubleMajor: null,
    birth: '2004-01-09',
    phone: '010-6666-7777',
    email: 'park@korea.ac.kr',
    history: [
      { date: '2023-03-02', event: '입학', note: '2023학년도 1학기' },
      { date: '2026-03-02', event: '재학', note: '2026학년도 1학기 등록' },
    ],
  },
  {
    studentId: '20230912',
    name: '임수아',
    dept: '사회복지학과',
    grade: '4학년',
    admissionYear: 2023,
    status: '재학',
    advisor: '박가이드 교수',
    doubleMajor: '심리학과 (부전공)',
    birth: '2003-09-14',
    phone: '010-7777-8888',
    email: 'im@korea.ac.kr',
    history: [
      { date: '2023-03-02', event: '입학', note: '2023학년도 1학기' },
      { date: '2026-03-02', event: '재학', note: '2026학년도 1학기 등록' },
    ],
  },
  {
    studentId: '20241002',
    name: '박철수',
    dept: '컴퓨터공학과',
    grade: '1학년',
    admissionYear: 2024,
    status: '재학',
    advisor: '최코치 교수',
    doubleMajor: null,
    birth: '2005-05-22',
    phone: '010-8888-9999',
    email: 'chulsoo@korea.ac.kr',
    history: [{ date: '2024-03-02', event: '입학', note: '2024학년도 1학기' }],
  },
];

export default function StudentRecords() {
  const [dept, setDept] = useState('전체');
  const [status, setStatus] = useState('전체');
  const [grade, setGrade] = useState('전체');
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState(null);

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
                      onClick={() => setDetail(s)}
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

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="학적사항 상세" size="lg">
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#F3F4F6]">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-black text-white shrink-0"
                style={{ background: ACCENT }}
              >
                {detail.name[0]}
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#1F2328]">
                  {detail.name}{' '}
                  <span className="text-[12px] font-mono text-[#9AA0A6]">{detail.studentId}</span>
                </p>
                <p className="text-[12px] text-[#656D76]">
                  {detail.dept} · {detail.grade}
                </p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={detail.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px]">
              {[
                { label: '입학년도', value: `${detail.admissionYear}학년도` },
                { label: '지도교수', value: detail.advisor },
                { label: '생년월일', value: detail.birth },
                { label: '연락처', value: detail.phone },
                { label: '이메일', value: detail.email },
                { label: '복수전공/부전공', value: detail.doubleMajor ?? '해당 없음' },
              ].map((f) => (
                <div
                  key={f.label}
                  className="p-2.5 rounded-[6px] bg-[#F9FAFB] border border-[#E5E7EB]"
                >
                  <p className="text-[10px] text-[#9AA0A6] mb-0.5">{f.label}</p>
                  <p className="font-bold text-[#1F2328]">{f.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[11px] font-bold text-[#1F2328] mb-2">학적 변동 이력</p>
              <div className="flex flex-col gap-0">
                {detail.history.map((h, i) => (
                  <div key={i} className="relative pl-6 pb-4 last:pb-0">
                    {i < detail.history.length - 1 && (
                      <div className="absolute left-[7px] top-4 bottom-0 w-px bg-[#E5E7EB]" />
                    )}
                    <div
                      className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 bg-white"
                      style={{ borderColor: ACCENT }}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#9AA0A6]">{h.date}</span>
                      <span className="text-[12px] font-bold text-[#1F2328]">{h.event}</span>
                    </div>
                    <p className="text-[11px] text-[#656D76] mt-0.5">{h.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
