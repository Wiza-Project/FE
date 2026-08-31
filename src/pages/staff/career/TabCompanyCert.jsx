import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, toast } from '@/components/common';
import { getCompanies, verifyCompany, registerCompany } from '@/api/careerStaff';

const ACCENT = '#1F2937';

const COMPANY_CERT_STYLE = {
  VERIFIED: { label: '인증', bg: '#D1FAE5', text: '#059669' },
  PENDING: { label: '심사중', bg: '#FEF3C7', text: '#D97706' },
  REJECTED: { label: '반려', bg: '#FEE2E2', text: '#CF222E' },
};

// 기업 인증
export default function TabCompanyCert() {
  const queryClient = useQueryClient();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 백엔드 CompanyRegisterRequestDTO 유효성 검사 규칙 일치 (필수 필드 매핑)
  const [regForm, setRegForm] = useState({
    companyName: '',
    businessRegistrationNo: '',
    representativeName: '',
    contactName: '인사담당자',
    industry: 'IT/소프트웨어',
    companyScale: 'MEDIUM',
    address: '서울시 강남구 테헤란로 123',
    contactEmail: 'hr@company.com',
    contactPhone: '02-1234-5678',
  });

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['staffCompaniesList'],
    queryFn: () => getCompanies({ size: 100 }),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ companyAccountId, verificationStatus, rejectionReason }) =>
      verifyCompany(companyAccountId, { verificationStatus, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffCompaniesList'] });
      setRejectTarget(null);
      setRejectionReason('');
      toast('기업 인증 심사 상태가 갱신되었습니다.', 'success');
    },
    onError: (err) => {
      toast(err?.message || err?.response?.data?.message || '처리에 실패했습니다.', 'error');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload) => registerCompany(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffCompaniesList'] });
      setIsRegisterOpen(false);
      setRegForm({
        companyName: '',
        businessRegistrationNo: '',
        representativeName: '',
        contactName: '인사담당자',
        industry: 'IT/소프트웨어',
        companyScale: 'MEDIUM',
        address: '',
        contactEmail: '',
        contactPhone: '',
      });
      toast('협약 기업이 정상 등록되었습니다!', 'success');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || '기업 등록에 실패했습니다.';
      toast(msg, 'error');
    },
  });

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!regForm.companyName || !regForm.businessRegistrationNo || !regForm.representativeName || !regForm.contactName) {
      toast('기업명, 사업자등록번호, 대표자명, 담당자명은 필수 입력입니다.', 'error');
      return;
    }
    registerMutation.mutate(regForm);
  };

  const rows = pageData?.content || (Array.isArray(pageData) ? pageData : []);

  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
          <span className="text-[13px] font-bold text-[#1F2328]">협약 기업 인증 현황</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] mr-1">
            심사중 {rows.filter((c) => c.verificationStatus === 'PENDING').length}건
          </span>
          <Button size="sm" style={{ background: ACCENT }} onClick={() => setIsRegisterOpen(true)}>
            + 신규 기업 등록
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F6F8FA]">
              {['기업 ID', '기업명', '사업자번호', '대표자', '업종', '인증 상태', '심사 처리'].map((h) => (
                <th key={h} className="px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide text-center">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#9AA0A6]">기업 목록을 불러오는 중입니다...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#9AA0A6]">등록된 기업 계정이 없습니다.</td>
              </tr>
            ) : (
              rows.map((c) => {
                const cs = COMPANY_CERT_STYLE[c.verificationStatus] || { label: c.verificationStatus, bg: '#F3F4F6', text: '#374151' };
                return (
                  <tr key={c.companyAccountId} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 font-mono text-[10px] text-center font-bold" style={{ color: ACCENT }}>{c.companyAccountId}</td>
                    <td className="px-4 py-3 font-bold text-[#1F2328]">{c.companyName}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] text-center">
                      {c.businessRegistrationNo || c.businessNumber}
                    </td>
                    <td className="px-4 py-3 text-[#656D76] text-center">{c.representativeName || c.ceoName || '—'}</td>
                    <td className="px-4 py-3 text-[#656D76] text-center">{c.industry || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cs.bg, color: cs.text }}>{cs.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.verificationStatus === 'PENDING' ? (
                        <div className="flex gap-1.5 justify-center">
                          <button
                            disabled={verifyMutation.isPending}
                            onClick={() =>
                              verifyMutation.mutate({ companyAccountId: c.companyAccountId, verificationStatus: 'VERIFIED' })
                            }
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] text-white"
                            style={{ background: ACCENT }}
                          >
                            승인
                          </button>
                          <button
                            disabled={verifyMutation.isPending}
                            onClick={() => setRejectTarget(c)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E]"
                          >
                            반려
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#D1D5DB]">완료</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 신규 기업 등록 모달 */}
      <Modal
        open={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="신규 협약 기업 등록"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRegisterOpen(false)}>취소</Button>
            <Button style={{ background: ACCENT }} loading={registerMutation.isPending} onClick={handleRegisterSubmit}>
              기업 등록 완료
            </Button>
          </div>
        }
      >
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3 text-[12px]">
          <div>
            <label className="block font-bold text-[#1F2328] mb-1">기업명 <span className="text-[#CF222E]">*</span></label>
            <input
              value={regForm.companyName}
              onChange={(e) => setRegForm((p) => ({ ...p, companyName: e.target.value }))}
              placeholder="예: (주)카카오, 네이버(주)"
              className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">사업자등록번호 (10자리) <span className="text-[#CF222E]">*</span></label>
              <input
                value={regForm.businessRegistrationNo}
                onChange={(e) => setRegForm((p) => ({ ...p, businessRegistrationNo: e.target.value }))}
                placeholder="1234567890"
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">대표자명 <span className="text-[#CF222E]">*</span></label>
              <input
                value={regForm.representativeName}
                onChange={(e) => setRegForm((p) => ({ ...p, representativeName: e.target.value }))}
                placeholder="홍길동"
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">업종</label>
              <input
                value={regForm.industry}
                onChange={(e) => setRegForm((p) => ({ ...p, industry: e.target.value }))}
                placeholder="IT / 소프트웨어개발"
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">기업 규모</label>
              <select
                value={regForm.companyScale}
                onChange={(e) => setRegForm((p) => ({ ...p, companyScale: e.target.value }))}
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              >
                <option value="LARGE">대기업</option>
                <option value="MEDIUM">중견기업</option>
                <option value="SMALL">중소기업</option>
                <option value="STARTUP">스타트업</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">담당자 성명 <span className="text-[#CF222E]">*</span></label>
              <input
                value={regForm.contactName}
                onChange={(e) => setRegForm((p) => ({ ...p, contactName: e.target.value }))}
                placeholder="김담당"
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">담당자 이메일</label>
              <input
                type="email"
                value={regForm.contactEmail}
                onChange={(e) => setRegForm((p) => ({ ...p, contactEmail: e.target.value }))}
                placeholder="hr@company.com"
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">담당자 연락처</label>
              <input
                value={regForm.contactPhone}
                onChange={(e) => setRegForm((p) => ({ ...p, contactPhone: e.target.value }))}
                placeholder="02-1234-5678"
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1F2328] mb-1">본사 주소</label>
            <input
              value={regForm.address}
              onChange={(e) => setRegForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="서울시 강남구 테헤란로 123"
              className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            />
          </div>
        </form>
      </Modal>

      {/* 기업 반려 사유 모달 */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="기업 인증 심사 반려"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>취소</Button>
            <Button
              variant="danger"
              loading={verifyMutation.isPending}
              onClick={() =>
                verifyMutation.mutate({
                  companyAccountId: rejectTarget.companyAccountId,
                  verificationStatus: 'REJECTED',
                  rejectionReason,
                })
              }
            >
              반려 처리
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-[12px]">
          <p><strong>{rejectTarget?.companyName}</strong>의 인증 요청을 반려하시겠습니까?</p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="사업자등록번호 불일치 등 반려 사유를 입력하세요."
            rows={3}
            className="w-full p-2.5 rounded-[6px] border border-[#E5E7EB] focus:outline-none resize-none"
          />
        </div>
      </Modal>
    </div>
  );
}