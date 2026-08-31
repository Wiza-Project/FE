import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, toast } from '@/components/common';
import { useCommonCode } from '@/hooks/useCommonCode';
import {
  getStaffJobPostings,
  createJobPosting,
  updateJobPostingStatus,
  getCompanies,
} from '@/api/careerStaff';

const ACCENT = '#1F2937';

const POST_STATUS_STYLE = {
  PUBLISHED: { label: '게시', bg: '#D1FAE5', text: '#059669' },
  CLOSED: { label: '마감', bg: '#FEE2E2', text: '#CF222E' },
  DRAFT: { label: '대기/숨김', bg: '#F3F4F6', text: '#9AA0A6' },
};

// 9대 임베딩용 표준 NCS 폴백 데이터
const FALLBACK_NCS = [
  { codeId: 1, code: '02010101', codeName: '경영기획' },
  { codeId: 2, code: '02020201', codeName: '인사관리' },
  { codeId: 3, code: '02030201', codeName: '마케팅기획' },
  { codeId: 4, code: '08020101', codeName: 'UI/UX디자인' },
  { codeId: 5, code: '20010101', codeName: '응용SW엔지니어링' },
  { codeId: 6, code: '20010204', codeName: '빅데이터분석·AI' },
  { codeId: 7, code: '20020101', codeName: '정보보안관리' },
  { codeId: 8, code: '23010101', codeName: '신재생에너지연구' },
  { codeId: 9, code: '99999999', codeName: '기타전문직무' },
];

// 공고 게시 관리
export default function TabPostManagement() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // 신규 공고 등록 폼 상태
  const [createForm, setCreateForm] = useState({
    companyAccountId: '',
    postingTitle: '',
    ncsCodeId: '',
    regionCodeId: '',
    jobDescription: '',
    employmentType: '정규직',
    salaryInfo: '연봉 3,600만원 이상',
    workLocation: '서울 강남구 테헤란로',
    applicationStartsAt: '2026-09-01T09:00:00Z',
    applicationEndsAt: '2026-09-30T18:00:00Z',
    postingType: 'GENERAL',
  });

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['staffAllJobPostings'],
    queryFn: () => getStaffJobPostings({ size: 100 }),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['staffCompaniesList'],
    queryFn: () => getCompanies({ size: 100 }),
  });

  const { data: regions = [] } = useCommonCode('REGION_CODE');
  const { data: ncsData = [] } = useCommonCode('NCS_CODE');

  const ncsList = ncsData.length > 0 ? ncsData : FALLBACK_NCS;
  const posts = pageData?.content || (Array.isArray(pageData) ? pageData : []);
  const companies = companiesData?.content || (Array.isArray(companiesData) ? companiesData : []);

  const createMutation = useMutation({
    mutationFn: (payload) => createJobPosting(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffAllJobPostings'] });
      queryClient.invalidateQueries({ queryKey: ['staffJobReviewList'] });
      setIsCreateOpen(false);
      toast('채용공고가 성공적으로 등록되었습니다!', 'success');
    },
    onError: (err) => {
      toast(err?.response?.data?.message || '공고 등록에 실패했습니다.', 'error');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ jobPostingId, postingStatus }) =>
      updateJobPostingStatus(jobPostingId, { postingStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffAllJobPostings'] });
      toast('공고 게시 상태가 변경되었습니다.', 'success');
    },
    onError: (err) => {
      toast(err?.response?.data?.message || '상태 변경에 실패했습니다.', 'error');
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!createForm.companyAccountId || !createForm.postingTitle) {
      toast('기업 및 공고 제목은 필수입니다.', 'error');
      return;
    }
    createMutation.mutate({
      ...createForm,
      companyAccountId: Number(createForm.companyAccountId),
      ncsCodeId: createForm.ncsCodeId ? Number(createForm.ncsCodeId) : undefined,
      regionCodeId: createForm.regionCodeId ? Number(createForm.regionCodeId) : undefined,
    });
  };

  const toggleSel = (id) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <span className="text-[13px] font-bold text-[#1F2328]">전체 채용공고 게시 관리</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#656D76] font-medium mr-2">총 {posts.length}건 등록됨</span>
            <Button size="sm" style={{ background: ACCENT }} onClick={() => setIsCreateOpen(true)}>
              + 신규 공고 등록
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F6F8FA]">
                <th className="w-8 px-4 py-3">
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      setSelected(e.target.checked ? posts.map((p) => p.jobPostingId) : [])
                    }
                  />
                </th>
                {['공고 ID', '공고명', '기업명', '직무(NCS)', '구분', '고용형태', '접수기간', '게시 상태', '상태 제어'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#9AA0A6]">공고 목록을 불러오는 중입니다...</td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#9AA0A6]">등록된 채용공고가 없습니다. 상단 [신규 공고 등록] 버튼을 클릭하세요.</td>
                </tr>
              ) : (
                posts.map((p) => {
                  const s = POST_STATUS_STYLE[p.postingStatus] || { label: p.postingStatus, bg: '#F3F4F6', text: '#374151' };
                  return (
                    <tr key={p.jobPostingId} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selected.includes(p.jobPostingId)}
                          onChange={() => toggleSel(p.jobPostingId)}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-center font-bold" style={{ color: ACCENT }}>{p.jobPostingId}</td>
                      <td className="px-4 py-3 font-bold text-[#1F2328]">{p.postingTitle}</td>
                      <td className="px-4 py-3 text-[#656D76]">{p.companyName}</td>
                      <td className="px-4 py-3 text-[#656D76] text-center">{p.ncsCodeName || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D1FAE5]" style={{ color: ACCENT }}>
                          {p.postingType === 'RECOMMENDED' ? '추천채용' : '일반'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#656D76] text-center">{p.employmentType || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] text-center whitespace-nowrap">
                        {p.applicationStartsAt ? String(p.applicationStartsAt).slice(5, 10) : ''} ~ {p.applicationEndsAt ? String(p.applicationEndsAt).slice(5, 10) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.text }}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {p.postingStatus !== 'PUBLISHED' && (
                            <button
                              onClick={() => statusMutation.mutate({ jobPostingId: p.jobPostingId, postingStatus: 'PUBLISHED' })}
                              className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#D1FAE5] text-[#059669]"
                            >
                              게시
                            </button>
                          )}
                          {p.postingStatus !== 'CLOSED' && (
                            <button
                              onClick={() => statusMutation.mutate({ jobPostingId: p.jobPostingId, postingStatus: 'CLOSED' })}
                              className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#FEE2E2] text-[#CF222E]"
                            >
                              마감
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 신규 공고 등록 모달 */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="신규 채용공고 직접 등록 (구인 접수)"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>취소</Button>
            <Button style={{ background: ACCENT }} loading={createMutation.isPending} onClick={handleCreateSubmit}>
              공고 등록 완료
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-[12px]">
          <div>
            <label className="block font-bold text-[#1F2328] mb-1">채용 기업 선택 <span className="text-[#CF222E]">*</span></label>
            <select
              value={createForm.companyAccountId}
              onChange={(e) => setCreateForm((p) => ({ ...p, companyAccountId: e.target.value }))}
              className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            >
              <option value="">기업을 선택하세요</option>
              {companies.map((c) => (
                <option key={c.companyAccountId} value={c.companyAccountId}>
                  {c.companyName} ({c.businessNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#1F2328] mb-1">공고명 <span className="text-[#CF222E]">*</span></label>
            <input
              value={createForm.postingTitle}
              onChange={(e) => setCreateForm((p) => ({ ...p, postingTitle: e.target.value }))}
              placeholder="예: 2026 하반기 신입 백엔드 엔지니어 채용"
              className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">NCS 직무 분류</label>
              <select
                value={createForm.ncsCodeId}
                onChange={(e) => setCreateForm((p) => ({ ...p, ncsCodeId: e.target.value }))}
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              >
                <option value="">직무 선택</option>
                {ncsList.map((n) => (
                  <option key={n.codeId} value={n.codeId}>
                    {n.codeName} ({n.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">근무 지역</label>
              <select
                value={createForm.regionCodeId}
                onChange={(e) => setCreateForm((p) => ({ ...p, regionCodeId: e.target.value }))}
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              >
                <option value="">지역 선택</option>
                {regions.map((r) => (
                  <option key={r.codeId} value={r.codeId}>{r.codeName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">고용 형태</label>
              <select
                value={createForm.employmentType}
                onChange={(e) => setCreateForm((p) => ({ ...p, employmentType: e.target.value }))}
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              >
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="인턴">인턴</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">공고 구분</label>
              <select
                value={createForm.postingType}
                onChange={(e) => setCreateForm((p) => ({ ...p, postingType: e.target.value }))}
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              >
                <option value="GENERAL">일반 채용</option>
                <option value="RECOMMENDED">추천 채용</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1F2328] mb-1">직무 상세 설명</label>
            <textarea
              value={createForm.jobDescription}
              onChange={(e) => setCreateForm((p) => ({ ...p, jobDescription: e.target.value }))}
              rows={4}
              placeholder="자격요건 및 직무 상세 요강을 입력하세요."
              className="w-full p-2.5 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}