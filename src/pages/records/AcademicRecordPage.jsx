import { useState } from 'react';
import { CURRENT_USER, MY_ACADEMIC_RECORD } from '@/data/dummy';
import {
  PageHeader,
  StatusBadge,
  Button,
  Input,
  EmptyState,
  InfoField as Field,
  toast,
} from '@/components/common';

const ACCENT = '#2563EB';

/**
 * 학생 포털 · 학적 정보 화면.
 *
 * 학생이 본인의 학적사항(신상정보)을 조회하고, 학적변동목록·전공신청목록을 확인합니다.
 * 보호자 연락처만 본인이 직접 수정할 수 있고 나머지 항목은 읽기 전용입니다 —
 * 신상정보 정정은 학적 담당 부서를 통해야 하는 항목이라 이 화면에서 바로 고치게 하지 않았습니다.
 *
 * 데이터는 전부 dummy.js의 MY_ACADEMIC_RECORD 목업입니다. 실제 API 연동 시
 * react-query 훅으로 교체하세요.
 */
export default function AcademicRecordPage() {
  const r = MY_ACADEMIC_RECORD;
  const [guardianPhone, setGuardianPhone] = useState(r.guardianPhone);
  const [savedPhone, setSavedPhone] = useState(r.guardianPhone);

  const handleSavePhone = () => {
    if (!guardianPhone.trim()) {
      toast('보호자 연락처를 입력해 주세요.', 'error');
      return;
    }
    setSavedPhone(guardianPhone);
    toast('보호자 연락처가 저장되었습니다.', 'success');
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '학적 정보' }]}
        title="학적 정보"
        subtitle="본인의 학적사항과 학적변동·전공신청 이력을 조회합니다."
        accentColor={ACCENT}
      />

      {/* 학적 정보 카드 */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-5 py-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-[#1F2328]">학적 정보</h2>
          <StatusBadge status={CURRENT_USER.status} />
        </div>

        <div className="grid grid-cols-4 gap-x-6 gap-y-4 max-[900px]:grid-cols-2">
          <Field label="학번" value={CURRENT_USER.studentId} />
          <Field label="성명" value={CURRENT_USER.name} />
          <Field label="영문성명" value={r.englishName} />
          <Field label="생년월일" value={r.birth} />
          <Field label="주민번호" value={r.ssn} />
          <Field label="휴대폰번호" value={r.phone} />
          <Field label="이메일" value={CURRENT_USER.email} />
          <Field label="소속" value={`${r.college} ${CURRENT_USER.department}`} />
          <Field label="학년/이수학기" value={`${CURRENT_USER.grade}학년 / ${r.semestersCompleted}학기`} />
          <Field label="입학일자" value={r.admissionDate} />
          <Field label="지도교수" value={r.advisor} />
          <Field label="복수전공" value={r.doubleMajor ?? '해당 없음'} />
          <div className="col-span-2">
            <Field label="주소" value={r.address} />
          </div>
          <Field label="보호자 연락처" className="col-span-2">
            <div className="flex items-center gap-2">
              <Input
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="ex) 010-1234-5678"
                className="max-w-[220px]"
              />
              <Button
                variant="secondary"
                size="md"
                onClick={handleSavePhone}
                disabled={guardianPhone === savedPhone}
              >
                연락처 저장
              </Button>
            </div>
          </Field>
        </div>
      </div>

      {/* 학적변동목록 / 전공신청목록 */}
      <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#1F2328]">학적변동목록</span>
            <span className="text-[12px] text-[#9AA0A6]">총 {r.history.length}건</span>
          </div>
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
                {r.history.map((h, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
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
        </div>

        <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#1F2328]">전공신청목록</span>
            <span className="text-[12px] text-[#9AA0A6]">
              총 {r.majorApplications.length}건
            </span>
          </div>
          {r.majorApplications.length === 0 ? (
            <EmptyState message="신청한 전공 내역이 없습니다." />
          ) : (
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
                  {r.majorApplications.map((a, i) => (
                    <tr key={i} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="px-3 py-2.5 text-center text-[#9AA0A6]">{i + 1}</td>
                      <td className="px-3 py-2.5 text-[#1F2328]">{a.type}</td>
                      <td className="px-3 py-2.5 text-[#1F2328]">{a.dept}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-[#444D56]">
                        {a.date}
                      </td>
                      <td className="px-3 py-2.5 text-[#656D76]">{a.applied}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
