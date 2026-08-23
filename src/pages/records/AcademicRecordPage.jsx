import { useEffect, useState } from 'react';
import { fetchMyAcademicRecord } from '@/api/students';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonLoader,
  InfoField as Field,
} from '@/components/common';

const ACCENT = '#2563EB';

const CHANGE_COLUMNS = ['No', '변동일자', '변동유형', '변동사유', '병무구분', '비고'];

/** 우편번호+기본주소+상세주소를 한 줄로 합친다. 셋 다 없으면 undefined(Field가 "-" 처리). */
function formatAddress(record) {
  const line = [record.addressBasic, record.addressDetail].filter(Boolean).join(' ');
  if (!line) return undefined;
  return record.zipcode ? `(${record.zipcode}) ${line}` : line;
}

/** 복학예정 학년도+학기코드를 한 줄로 합친다. 최신 휴학 행이 아니면 항상 undefined. */
function formatScheduledReturn(record) {
  if (!record.scheduledReturnYear) return undefined;
  return record.scheduledReturnSemesterCode
    ? `${record.scheduledReturnYear} / ${record.scheduledReturnSemesterCode}`
    : `${record.scheduledReturnYear}`;
}

function formatCompletedSemesters(record) {
  if (record.completedSemesters == null) return undefined;
  return record.semesterExceeded
    ? `${record.completedSemesters}학기 (학기초과)`
    : `${record.completedSemesters}학기`;
}

/**
 * 학생 포털 · 학적 정보 화면.
 *
 * GET /api/students/academic-record로 조회합니다. BE 회신(scms-be/docs/2026-08-23_
 * academic-record-api-response.md, WP-151 구현 완료) 기준으로 신규 테이블
 * (student_academic_detail/student_academic_change) 덕분에 주민번호 마스킹/주소/
 * 지도교수/학적변동이력 등이 실제로 채워집니다.
 *
 * 신상정보(student_academic_detail) 행 자체가 없는 학생은 관련 필드가 전부 null로
 * 내려오므로 InfoField의 `value ?? '-'` 폴백을 그대로 씁니다.
 *
 * - TODO: 증명사진 URL은 이번 응답에 없어 채울 데이터가 없습니다 — 다만 칸은 미리 잡아둡니다
 *   (교직원 학적부관리 모달과 동일하게 플레이스홀더 아이콘만 표시). URL 필드가 생기면
 *   이 칸의 아이콘을 <img>로 바꾸기만 하면 됩니다.

 */
export default function AcademicRecordPage() {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMyAcademicRecord()
      .then((data) => {
        if (!cancelled) setRecord(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? '학적 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '학적 정보' }]}
        title="학적 정보"
        subtitle="본인의 학적사항과 학적변동 이력을 조회합니다."
        accentColor={ACCENT}
      />

      {loading ? (
        <SkeletonLoader rows={5} cols={4} />
      ) : error ? (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-5 mb-5">
          <EmptyState message="학적 정보를 불러오지 못했습니다." sub={error} />
        </div>
      ) : (
        <>
          {/* 학적 정보 카드 */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-bold text-[#1F2328]">학적 정보</h2>
              <StatusBadge status={record.status} />
            </div>

            <div className="flex gap-5">
              {/* 증명사진 자리. photo_file_group_id를 채우는 업로드 API가 아직 없어
                  URL이 없다 — 자리만 미리 잡아두고 필드가 생기면 <img>로 바꾼다. */}
              <div className="w-20 h-24 rounded-[6px] bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center shrink-0">
                <svg width="28" height="28" viewBox="0 0 16 16" fill="#C1C7CD">
                  <circle cx="8" cy="5.5" r="3" />
                  <path d="M2 15c0-3.314 2.686-6 6-6s6 2.686 6 6" />
                </svg>
              </div>

              <div className="flex-1 grid grid-cols-4 gap-x-6 gap-y-4 max-[900px]:grid-cols-2">
                <Field label="학번" value={record.studentId} />
                <Field label="성명" value={record.name} />
                <Field label="주민번호" value={record.residentNoMasked} />
                <Field label="휴대폰번호" value={record.phone} />
                <Field label="이메일" value={record.email} />
                <Field label="학과" value={record.majorName} />
                <Field
                  label="학년"
                  value={record.grade != null ? `${record.grade}학년` : undefined}
                />
                <Field label="이수학기" value={formatCompletedSemesters(record)} />
                <Field label="지도교수" value={record.advisorName} />
                <Field label="입학일자" value={record.admissionDate} />
                <Field label="입학구분" value={record.admissionType} />
                <Field label="교육과정년도" value={record.curriculumYear} />
                <Field label="졸업일자" value={record.graduationDate} />
                <Field label="학위명" value={record.degreeName} />
                <Field label="학위번호" value={record.degreeNo} />
                <Field label="복학예정" value={formatScheduledReturn(record)} />
                <div className="col-span-2">
                  <Field label="주소" value={formatAddress(record)} />
                </div>
                <div className="col-span-2">
                  <Field label="보호자 연락처" value={record.guardianPhone} />
                </div>
              </div>
            </div>
          </div>

          {/* 학적변동목록 */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#1F2328]">학적변동목록</span>
              <span className="text-[12px] text-[#9AA0A6]">총 {record.changes?.length ?? 0}건</span>
            </div>
            {record.changes?.length ? (
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
                    {record.changes.map((h) => (
                      <tr
                        key={h.no}
                        className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                      >
                        <td className="px-3 py-2.5 text-center text-[#9AA0A6]">{h.no}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-[#444D56]">
                          {h.changeDate}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-[#1F2328]">
                          {h.changeTypeName}
                        </td>
                        <td className="px-3 py-2.5 text-[#656D76]">{h.changeReasonName ?? '-'}</td>
                        <td className="px-3 py-2.5 text-[#656D76]">{h.militaryStatus ?? '-'}</td>
                        <td className="px-3 py-2.5 text-[#656D76]">{h.note ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-[13px] text-[#9AA0A6]">-</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
