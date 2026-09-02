import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Pagination, toast } from '@/components/common';
import { useCommonCode } from '@/hooks/useCommonCode';
import {
  getCompanies,
  verifyCompany,
  registerCompany,
  updateCompany,
} from '@/api/careerStaff';

const ACCENT = '#1F2937';
const PAGE_SIZE = 10;

// TODO: 0902 현재 데이터 연결 테스트 선행, 이후 하드코딩 수정 필요

const COMPANY_CERT_STYLE = {
  VERIFIED: { label: '인증', bg: '#D1FAE5', text: '#059669' },
  PENDING: { label: '심사중', bg: '#FEF3C7', text: '#D97706' },
  REJECTED: { label: '반려', bg: '#FEE2E2', text: '#CF222E' },
};

const FALLBACK_NCS = [
  { codeId: 1, code: '02010101', codeName: '경영·회계·사무' },
  { codeId: 2, code: '02020201', codeName: '인사·조직' },
  { codeId: 3, code: '02030201', codeName: '마케팅·영업' },
  { codeId: 4, code: '08020101', codeName: '디자인·콘텐츠' },
  { codeId: 5, code: '20010101', codeName: '정보기술(IT)' },
  { codeId: 6, code: '20010204', codeName: '인공지능·빅데이터' },
  { codeId: 7, code: '20020101', codeName: '정보보안' },
  { codeId: 8, code: '23010101', codeName: '환경·에너지' },
  { codeId: 9, code: '99999999', codeName: '기타전문직무' },
];

export default function TabCompanyCert() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 기업 상세 조회 및 수정용 타겟 상태
  const [detailTarget, setDetailTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const { data: ncsData = [] } = useCommonCode('NCS_CODE');
  const ncsList = ncsData.length > 0 ? ncsData : FALLBACK_NCS;

  const INITIAL_REG_FORM = {
    companyName: '',
    businessRegistrationNo: '',
    representativeName: '',
    contactName: '',
    industry: '',
    companyScale: 'MEDIUM',
    address: '',
    contactEmail: '',
    contactPhone: '',
  };
  const [regForm, setRegForm] = useState(INITIAL_REG_FORM);

  // 1. 기업 목록 조회 (필터링 및 페이징)
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['staffCompaniesList', page, statusFilter],
    queryFn: () =>
      getCompanies({
        page: page - 1,
        size: PAGE_SIZE,
        verificationStatus: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    keepPreviousData: true,
  });

  const rows = pageData?.content || (Array.isArray(pageData) ? pageData : []);
  const totalElements = pageData?.totalElements || rows.length || 0;
  const totalPages = pageData?.totalPages || 1;

  // 2. 인증 심사 Mutation
  const verifyMutation = useMutation({
    mutationFn: ({ companyAccountId, verificationStatus, rejectionReason }) =>
      verifyCompany(companyAccountId, { verificationStatus, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffCompaniesList'] });
      setRejectTarget(null);
      setDetailTarget(null);
      setRejectionReason('');
      toast('기업 인증 심사 상태가 갱신되었습니다.', 'success');
    },
    onError: (err) => {
      toast(err?.message || err?.response?.data?.message || '처리에 실패했습니다.', 'error');
    },
  });

  // 3. 신규 기업 등록 Mutation
  const registerMutation = useMutation({
    mutationFn: (payload) => registerCompany(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffCompaniesList'] });
      setIsRegisterOpen(false);
      setRegForm(INITIAL_REG_FORM);
      toast('협약 기업이 정상 등록되었습니다!', 'success');
    },
    onError: (err) => {
      toast(err?.response?.data?.message || err?.response?.data?.error || '기업 등록에 실패했습니다.', 'error');
    },
  });

  // 4. 심사중 기업 정보 수정 Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateCompany(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffCompaniesList'] });
      setDetailTarget(null);
      toast('기업 정보가 성공적으로 수정되었습니다.', 'success');
    },
    onError: (err) => {
      toast(err?.response?.data?.message || '기업 정보 수정에 실패했습니다.', 'error');
    },
  });

  // --- 유효성 검사 헬퍼 ---
  const isValidEmail = (email) => {
    if (!email) return true;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!regForm.companyName || !regForm.businessRegistrationNo || !regForm.representativeName || !regForm.contactName) {
      toast('기업명, 사업자등록번호(10자리), 대표자명, 담당자명은 필수 입력입니다.', 'error');
      return;
    }
    if (regForm.businessRegistrationNo.length !== 10) {
      toast('사업자등록번호는 10자리 숫자여야 합니다.', 'error');
      return;
    }
    if (regForm.contactEmail && !isValidEmail(regForm.contactEmail)) {
      toast('올바른 이메일 형식(예: hr@company.com)으로 입력해 주세요.', 'error');
      return;
    }
    registerMutation.mutate(regForm);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editForm.companyName || !editForm.representativeName || !editForm.contactName) {
      toast('기업명, 대표자명, 담당자명은 필수입니다.', 'error');
      return;
    }
    if (editForm.contactEmail && !isValidEmail(editForm.contactEmail)) {
      toast('올바른 이메일 형식으로 입력해 주세요.', 'error');
      return;
    }
    updateMutation.mutate({
      id: detailTarget.companyAccountId,
      payload: editForm,
    });
  };

  const openDetailModal = (company) => {
    setDetailTarget(company);
    setEditForm({
      companyName: company.companyName || '',
      businessRegistrationNo: company.businessRegistrationNo || company.businessNumber || '',
      representativeName: company.representativeName || company.ceoName || '',
      contactName: company.contactName || '',
      industry: company.industry || '',
      companyScale: company.companyScale || 'MEDIUM',
      address: company.address || '',
      contactEmail: company.contactEmail || '',
      contactPhone: company.contactPhone || '',
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 상단 탭 필터 및 버튼 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`h-8 px-3 text-[12px] font-bold rounded-[6px] transition-colors ${
                statusFilter === st
                  ? 'bg-[#1F2937] text-white shadow-sm'
                  : 'bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB]'
              }`}
            >
              {st === 'ALL'
                ? '전체 상태'
                : st === 'PENDING'
                ? '심사중'
                : st === 'VERIFIED'
                ? '인증 완료'
                : '반려'}
            </button>
          ))}
        </div>

        <Button size="sm" style={{ background: ACCENT }} onClick={() => setIsRegisterOpen(true)}>
          + 신규 기업 등록
        </Button>
      </div>

      {/* 기업 인증 목록 테이블 */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <span className="text-[13px] font-bold text-[#1F2328]">협약 기업 인증 현황</span>
          </div>
          <span className="text-[12px] text-[#656D76] font-medium">총 {totalElements}건</span>
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
                  <td colSpan={7} className="py-12 text-center text-[#9AA0A6]">해당 조건의 기업 계정이 없습니다.</td>
                </tr>
              ) : (
                rows.map((c) => {
                  const cs = COMPANY_CERT_STYLE[c.verificationStatus] || { label: c.verificationStatus, bg: '#F3F4F6', text: '#374151' };
                  return (
                    <tr
                      key={c.companyAccountId}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] cursor-pointer"
                      onClick={() => openDetailModal(c)}
                    >
                      <td className="px-4 py-3 font-mono text-[10px] text-center font-bold" style={{ color: ACCENT }}>
                        {c.companyAccountId}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#1F2328]">
                        <span className="hover:underline text-[#1F2328]">{c.companyName}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] text-center">
                        {c.businessRegistrationNo || c.businessNumber || '—'}
                      </td>
                      <td className="px-4 py-3 text-[#656D76] text-center">{c.representativeName || c.ceoName || '—'}</td>
                      <td className="px-4 py-3 text-[#656D76] text-center font-medium">{c.industry || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cs.bg, color: cs.text }}>
                          {cs.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {c.verificationStatus === 'PENDING' ? (
                          <div className="flex gap-1.5 justify-center">
                            <button
                              disabled={verifyMutation.isPending}
                              onClick={() =>
                                verifyMutation.mutate({ companyAccountId: c.companyAccountId, verificationStatus: 'VERIFIED' })
                              }
                              className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] text-white transition-colors"
                              style={{ background: ACCENT }}
                            >
                              승인
                            </button>
                            <button
                              disabled={verifyMutation.isPending}
                              onClick={() => setRejectTarget(c)}
                              className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA] transition-colors"
                            >
                              반려
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#9AA0A6]">완료</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalElements > 0 && (
          <div className="px-4 py-3 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[12px] text-[#656D76]">총 {totalElements}건</span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={totalElements}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </div>

      {/* 신규 기업 등록 모달 */}
      <Modal
        open={isRegisterOpen}
        onClose={() => {
          setIsRegisterOpen(false);
          setRegForm(INITIAL_REG_FORM);
        }}
        title="신규 협약 기업 등록"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsRegisterOpen(false); setRegForm(INITIAL_REG_FORM); }}>
              취소
            </Button>
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
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={regForm.businessRegistrationNo}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  if (raw.length <= 10) setRegForm((p) => ({ ...p, businessRegistrationNo: raw }));
                }}
                placeholder="숫자 10자리 입력"
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
                list="ncs-industry-list-reg"
                value={regForm.industry}
                onChange={(e) => setRegForm((p) => ({ ...p, industry: e.target.value }))}
                placeholder="선택하거나 직접 입력"
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              />
              <datalist id="ncs-industry-list-reg">
                {ncsList.map((n) => (
                  <option key={n.codeId} value={n.codeName} />
                ))}
              </datalist>
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
                type="text"
                value={regForm.contactEmail}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^a-zA-Z0-9@._-]/g, '');
                  setRegForm((p) => ({ ...p, contactEmail: raw }));
                }}
                placeholder="hr@company.com"
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">담당자 연락처</label>
              <input
                type="text"
                inputMode="tel"
                maxLength={13}
                value={regForm.contactPhone}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9-]/g, '');
                  if (raw.length <= 13) setRegForm((p) => ({ ...p, contactPhone: raw }));
                }}
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

      {/* 기업 상세 확인 및 심사중 수정 모달 (옵셔널 체이닝 및 닫기 방어코드 적용) */}
      <Modal
        open={Boolean(detailTarget && editForm)}
        onClose={() => {
          setDetailTarget(null);
          setEditForm(null);
        }}
        title={`협약 기업 정보 ${detailTarget?.verificationStatus === 'PENDING' ? '(심사중 - 수정 가능)' : '(상세 조회)'}`}
        footer={
          <div className="flex justify-between items-center w-full">
            <div>
              {detailTarget?.verificationStatus === 'PENDING' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    style={{ background: ACCENT }}
                    loading={verifyMutation.isPending}
                    onClick={() =>
                      detailTarget?.companyAccountId &&
                      verifyMutation.mutate({ companyAccountId: detailTarget.companyAccountId, verificationStatus: 'VERIFIED' })
                    }
                  >
                    즉시 승인
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      const target = detailTarget;
                      setDetailTarget(null);
                      setEditForm(null);
                      setRejectTarget(target);
                    }}
                  >
                    반려 처리
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDetailTarget(null);
                  setEditForm(null);
                }}
              >
                닫기
              </Button>
              {detailTarget?.verificationStatus === 'PENDING' && (
                <Button style={{ background: ACCENT }} loading={updateMutation.isPending} onClick={handleEditSubmit}>
                  정보 수정 저장
                </Button>
              )}
            </div>
          </div>
        }
      >
        {detailTarget && editForm && (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-3 text-[12px]">
            <div className="p-3 bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#656D76]">기업 계정 ID: </span>
                <span className="font-mono font-bold text-[#1F2328]">{detailTarget.companyAccountId}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#656D76] mr-2">현재 상태:</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: COMPANY_CERT_STYLE[detailTarget.verificationStatus]?.bg,
                    color: COMPANY_CERT_STYLE[detailTarget.verificationStatus]?.text,
                  }}
                >
                  {COMPANY_CERT_STYLE[detailTarget.verificationStatus]?.label}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1F2328] mb-1">기업명</label>
              <input
                disabled={detailTarget.verificationStatus !== 'PENDING'}
                value={editForm.companyName}
                onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))}
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none disabled:bg-[#F3F4F6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">사업자등록번호</label>
                <input
                  disabled
                  value={editForm.businessRegistrationNo}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-[#F3F4F6] text-[#656D76] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">대표자명</label>
                <input
                  disabled={detailTarget.verificationStatus !== 'PENDING'}
                  value={editForm.representativeName}
                  onChange={(e) => setEditForm((p) => ({ ...p, representativeName: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none disabled:bg-[#F3F4F6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">업종</label>
                <input
                  disabled={detailTarget.verificationStatus !== 'PENDING'}
                  list="ncs-industry-list-edit"
                  value={editForm.industry}
                  onChange={(e) => setEditForm((p) => ({ ...p, industry: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none disabled:bg-[#F3F4F6]"
                />
                <datalist id="ncs-industry-list-edit">
                  {ncsList.map((n) => (
                    <option key={n.codeId} value={n.codeName} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">기업 규모</label>
                <select
                  disabled={detailTarget.verificationStatus !== 'PENDING'}
                  value={editForm.companyScale}
                  onChange={(e) => setEditForm((p) => ({ ...p, companyScale: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none disabled:bg-[#F3F4F6]"
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
                <label className="block font-bold text-[#1F2328] mb-1">담당자 성명</label>
                <input
                  disabled={detailTarget.verificationStatus !== 'PENDING'}
                  value={editForm.contactName}
                  onChange={(e) => setEditForm((p) => ({ ...p, contactName: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none disabled:bg-[#F3F4F6]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">담당자 이메일</label>
                <input
                  disabled={detailTarget.verificationStatus !== 'PENDING'}
                  value={editForm.contactEmail}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^a-zA-Z0-9@._-]/g, '');
                    setEditForm((p) => ({ ...p, contactEmail: raw }));
                  }}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none disabled:bg-[#F3F4F6]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">담당자 연락처</label>
                <input
                  disabled={detailTarget.verificationStatus !== 'PENDING'}
                  value={editForm.contactPhone}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9-]/g, '');
                    if (raw.length <= 13) setEditForm((p) => ({ ...p, contactPhone: raw }));
                  }}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none disabled:bg-[#F3F4F6]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1F2328] mb-1">본사 주소</label>
              <input
                disabled={detailTarget.verificationStatus !== 'PENDING'}
                value={editForm.address}
                onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none disabled:bg-[#F3F4F6]"
              />
            </div>
          </form>
        )}
      </Modal>

      {/* 반려 사유 모달 */}
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
            placeholder="사업자등록번호 불일치 등 구체적인 반려 사유를 입력하세요."
            rows={3}
            className="w-full p-2.5 rounded-[6px] border border-[#E5E7EB] focus:outline-none resize-none"
          />
        </div>
      </Modal>
    </div>
  );
}