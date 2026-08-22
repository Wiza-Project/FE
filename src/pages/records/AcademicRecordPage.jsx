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

/**
 * 학생 포털 · 학적 정보 화면.
 *
 * GET /api/students/academic-record로 조회합니다. BE 회신(scms-be/docs/2026-08-22_
 * academic-record-api-request.md "회신" 섹션) 기준으로 학번/성명/연락처/이메일/소속/
 * 학년/학적상태 7개 필드만 실제로 내려옵니다. 영문성명·생년월일·주민번호·입학일자·
 * 이수학기·지도교수·복수전공·주소·보호자연락처와 학적변동목록·전공신청목록은
 * 뒷받침하는 테이블/컬럼이 아직 없습니다.
 *
 * 화면 레이아웃 자체는 원래 기획(전체 필드 슬롯)을 그대로 유지하고, 값이 없는 항목만
 * "-"로 표시합니다(필드를 화면에서 지우지 않음 — InfoField가 value가 없으면 자동으로
 * "-"를 보여줍니다). 데이터가 뒤늦게 채워지면 record.xxx 값만 내려주면 되고 레이아웃은
 * 안 건드려도 됩니다.
 *
 * 보호자 연락처는 원래 학생이 직접 수정 가능한 필드였지만, 저장할 컬럼이 없어 이번
 * 라운드에서는 읽기 전용("-")으로 둡니다 — 수정 가능한 폼을 보여주고 실제로는 아무것도
 * 저장되지 않는 게 더 나쁜 UX라고 판단했습니다.
 *
 * 주의: `department`는 학과가 아니라 교내 행정 조직입니다(학생역량센터 등 4개 중 하나) —
 * "소속"으로만 표기하고 "학과"라고 쓰지 않습니다.
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
        subtitle="본인의 학적사항과 학적변동·전공신청 이력을 조회합니다."
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

            <div className="grid grid-cols-4 gap-x-6 gap-y-4 max-[900px]:grid-cols-2">
              <Field label="학번" value={record.studentId} />
              <Field label="성명" value={record.name} />
              <Field label="영문성명" value={record.englishName} />
              <Field label="생년월일" value={record.birthDate} />
              <Field label="주민번호" value={record.ssnMasked} />
              <Field label="휴대폰번호" value={record.phone} />
              <Field label="이메일" value={record.email} />
              <Field label="소속" value={record.department} />
              <Field label="학년" value={record.grade} />
              <Field label="이수학기" value={record.semestersCompleted} />
              <Field label="입학일자" value={record.admissionDate} />
              <Field label="지도교수" value={record.advisor} />
              <Field label="복수전공" value={record.doubleMajor} />
              <div className="col-span-2">
                <Field label="주소" value={record.address} />
              </div>
              <div className="col-span-2">
                <Field label="보호자 연락처" value={record.guardianPhone} />
              </div>
            </div>
          </div>

          {/* 학적변동목록 / 전공신청목록 */}
          <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
            <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#1F2328]">학적변동목록</span>
                <span className="text-[12px] text-[#9AA0A6]">
                  총 {record.history?.length ?? '-'}건
                </span>
              </div>
              {record.history?.length ? (
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
                      {record.history.map((h, i) => (
                        <tr
                          key={i}
                          className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                        >
                          <td className="px-3 py-2.5 text-center text-[#9AA0A6]">{i + 1}</td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-[#444D56]">
                            {h.date}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-[#1F2328]">{h.code}</td>
                          <td className="px-3 py-2.5 text-[#656D76]">{h.reason}</td>
                          <td className="px-3 py-2.5 text-[#656D76]">{h.military}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-[13px] text-[#9AA0A6]">-</div>
              )}
            </div>

            <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#1F2328]">전공신청목록</span>
                <span className="text-[12px] text-[#9AA0A6]">
                  총 {record.majorApplications?.length ?? '-'}건
                </span>
              </div>
              {record.majorApplications?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                        {['No', '구분', '학과명', '신청일자', '신청여부'].map((h, i) => (
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
                      {record.majorApplications.map((a, i) => (
                        <tr key={i} className="border-b border-[#F3F4F6] last:border-0">
                          <td className="px-3 py-2.5 text-center text-[#9AA0A6]">{i + 1}</td>
                          <td className="px-3 py-2.5 text-[#1F2328]">{a.type}</td>
                          <td className="px-3 py-2.5 text-[#1F2328]">{a.department}</td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-[#444D56]">
                            {a.appliedAt}
                          </td>
                          <td className="px-3 py-2.5 text-[#656D76]">{a.applied}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-[13px] text-[#9AA0A6]">-</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
