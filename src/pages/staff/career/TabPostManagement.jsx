import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Pagination, toast } from '@/components/common';
import { useCommonCode } from '@/hooks/useCommonCode';
import { apiClient } from '@/api/client';
import {
  getStaffJobPostings,
  createJobPosting,
  updateJobPosting,
  updateJobPostingStatus,
  bulkUpdateJobPostingStatus,
  bulkDeleteJobPostings,
  getCompanies,
} from '@/api/careerStaff';

const ACCENT = '#1F2937';
const PAGE_SIZE = 10;

const POST_STATUS_STYLE = {
  PUBLISHED: { label: '게시', bg: '#D1FAE5', text: '#059669' },
  CLOSED: { label: '마감', bg: '#FEE2E2', text: '#CF222E' },
  DRAFT: { label: '대기/숨김', bg: '#F3F4F6', text: '#9AA0A6' },
};

export default function TabPostManagement() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [companySearchText, setCompanySearchText] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // 공고 상세/수정 모달 타겟 상태
  const [detailTarget, setDetailTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // 신규 공고 등록 폼 초기값 (모집 요강 및 파일 첨부 포함)
  const INITIAL_CREATE_FORM = {
    companyAccountId: '',
    postingTitle: '',
    ncsCodeId: '',
    regionCodeId: '',
    jobDescription: '',
    employmentType: '정규직',
    salaryText: '연봉 3,600만원 이상',
    recruitmentCount: 1,
    applicationStartsAt: '2026-09-01T09:00:00Z',
    applicationEndsAt: '2026-09-30T18:00:00Z',
    postingType: 'GENERAL',
    benefitType: '',
    fileGroupId: null,
  };
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);

  // 1. 공고 목록 조회 (상태 필터링 및 페이징)
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['staffAllJobPostings', page, statusFilter],
    queryFn: () =>
      getStaffJobPostings({
        page: page - 1,
        size: PAGE_SIZE,
        postingStatus: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    keepPreviousData: true,
  });

  // 2. 기업 목록 조회
  const { data: companiesData } = useQuery({
    queryKey: ['staffVerifiedCompaniesList'],
    queryFn: () => getCompanies({ verificationStatus: 'VERIFIED', size: 100 }),
  });

  const { data: regions = [] } = useCommonCode('REGION_CODE');
  const { data: ncsData = [] } = useCommonCode('NCS_CODE');

  const rawPosts = pageData?.content || (Array.isArray(pageData) ? pageData : []);
  const posts = Array.isArray(rawPosts) ? rawPosts : [];
  const totalElements = pageData?.totalElements || posts.length || 0;
  const totalPages = pageData?.totalPages || 1;

  const rawCompanies = companiesData?.content || (Array.isArray(companiesData) ? companiesData : []);
  const companies = Array.isArray(rawCompanies) ? rawCompanies : [];

  // 검색어에 따른 기업 필터링
  const filteredCompanies = companies.filter((c) => {
    const text = `${c.companyName} ${c.businessRegistrationNo || c.businessNumber || ''}`;
    return text.toLowerCase().includes(companySearchText.toLowerCase());
  });

  // 3. Mutation 정의
  const createMutation = useMutation({
    mutationFn: (payload) => createJobPosting(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffAllJobPostings'] });
      queryClient.invalidateQueries({ queryKey: ['staffJobReviewList'] });
      setIsCreateOpen(false);
      setCreateForm(INITIAL_CREATE_FORM);
      setCompanySearchText('');
      toast('채용공고가 성공적으로 등록되었습니다!', 'success');
    },
    onError: (err) => {
      toast(err?.response?.data?.message || err?.message || '공고 등록에 실패했습니다.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateJobPosting(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffAllJobPostings'] });
      setDetailTarget(null);
      setEditForm(null);
      toast('공고 정보가 성공적으로 수정되었습니다.', 'success');
    },
    onError: (err) => toast(err?.response?.data?.message || '공고 수정에 실패했습니다.', 'error'),
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

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }) => bulkUpdateJobPostingStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffAllJobPostings'] });
      setSelected([]);
      toast('선택한 공고의 상태가 일괄 변경되었습니다.', 'success');
    },
    onError: () => toast('일괄 처리에 실패했습니다.', 'error'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => bulkDeleteJobPostings(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffAllJobPostings'] });
      setSelected([]);
      toast('선택한 공고가 삭제되었습니다.', 'info');
    },
    onError: () => toast('삭제 처리에 실패했습니다.', 'error'),
  });

  // 폼 제출 핸들러
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (
      !createForm.companyAccountId ||
      !createForm.postingTitle ||
      !createForm.ncsCodeId ||
      !createForm.regionCodeId ||
      !createForm.jobDescription ||
      !createForm.applicationEndsAt
    ) {
      toast('기업, 공고제목, 직무(NCS), 근무지역, 직무설명, 마감일시는 필수입니다.', 'error');
      return;
    }

    const formatToIso = (dateStr, defaultTime) => {
      if (!dateStr) return null;
      if (dateStr.includes('T')) return dateStr;
      return `${dateStr}T${defaultTime}:00Z`;
    };

    createMutation.mutate({
      ...createForm,
      applicationStartsAt: formatToIso(createForm.applicationStartsAt, '09:00'),
      applicationEndsAt: formatToIso(createForm.applicationEndsAt, '18:00'),
      companyAccountId: Number(createForm.companyAccountId),
      ncsCodeId: Number(createForm.ncsCodeId),
      regionCodeId: Number(createForm.regionCodeId),
      recruitmentCount: Number(createForm.recruitmentCount) || 1,
    });
  };

  // 수정 폼 제출 핸들러
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editForm.postingTitle || !editForm.jobDescription || !editForm.applicationEndsAt) {
      toast('공고제목, 직무상세설명, 마감일시는 필수입니다.', 'error');
      return;
    }

    const formatToIso = (dateStr, defaultTime) => {
      if (!dateStr) return null;
      if (dateStr.includes('T')) return dateStr;
      return `${dateStr}T${defaultTime}:00Z`;
    };

    updateMutation.mutate({
      id: detailTarget.jobPostingId,
      payload: {
        ...editForm,
        applicationStartsAt: formatToIso(editForm.applicationStartsAt, '09:00'),
        applicationEndsAt: formatToIso(editForm.applicationEndsAt, '18:00'),
        ncsCodeId: editForm.ncsCodeId ? Number(editForm.ncsCodeId) : undefined,
        regionCodeId: editForm.regionCodeId ? Number(editForm.regionCodeId) : undefined,
        recruitmentCount: Number(editForm.recruitmentCount) || 1,
      },
    });
  };

  const toggleSel = (id) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // 포스터 파일 업로드 핸들러
  const handlePosterUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/admin/career/job-postings/poster', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const resData = res.data?.data || res.data;
      const uploadedFileGroupId = resData?.fileGroupId || resData;

      if (uploadedFileGroupId) {
        if (isEdit) {
          setEditForm((p) => ({ ...p, fileGroupId: uploadedFileGroupId }));
        } else {
          setCreateForm((p) => ({ ...p, fileGroupId: uploadedFileGroupId }));
        }
        toast('포스터 이미지가 성공적으로 첨부되었습니다.', 'success');
      }
    } catch {
      toast('파일 업로드 중 오류가 발생했습니다.', 'error');
    }
  };

  // 상세 모달 열기 (기존 목록 데이터를 기반으로 안전하게 초기화)
  const openDetailModal = (post) => {
    setDetailTarget(post);
    setEditForm({
      companyName: post.companyName,
      postingTitle: post.postingTitle || '',
      ncsCodeId: post.ncsCodeId || '',
      regionCodeId: post.regionCodeId || '',
      jobDescription: post.jobDescription || (post.postingTitle ? `${post.postingTitle} 관련 상세 업무 및 자격 요건` : ''),
      employmentType: post.employmentType || '정규직',
      salaryText: post.salaryText || '',
      recruitmentCount: post.recruitmentCount || 1,
      applicationStartsAt: post.applicationStartsAt ? String(post.applicationStartsAt).slice(0, 10) : '',
      applicationEndsAt: post.applicationEndsAt ? String(post.applicationEndsAt).slice(0, 10) : '',
      postingType: post.postingType || 'GENERAL',
      benefitType: post.benefitType || '',
      fileGroupId: post.fileGroupId || null,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 상단 필터 및 일괄 제어 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {['ALL', 'PUBLISHED', 'CLOSED', 'DRAFT'].map((st) => (
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
                : st === 'PUBLISHED'
                ? '게시'
                : st === 'CLOSED'
                ? '마감'
                : '대기/숨김'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <div className="flex items-center gap-1.5 mr-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkStatusMutation.mutate({ ids: selected, status: 'PUBLISHED' })}
              >
                선택 게시
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkStatusMutation.mutate({ ids: selected, status: 'CLOSED' })}
              >
                선택 마감
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => bulkDeleteMutation.mutate(selected)}
              >
                선택 삭제 ({selected.length})
              </Button>
            </div>
          )}
          <Button size="sm" style={{ background: ACCENT }} onClick={() => setIsCreateOpen(true)}>
            + 신규 공고 등록
          </Button>
        </div>
      </div>

      {/* 공고 목록 테이블 */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <span className="text-[13px] font-bold text-[#1F2328]">전체 채용공고 게시 관리</span>
          </div>
          <span className="text-[12px] text-[#656D76] font-medium">총 {totalElements}건 등록됨</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F6F8FA]">
                <th className="w-8 px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={posts.length > 0 && selected.length === posts.length}
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
                  <td colSpan={10} className="py-12 text-center text-[#9AA0A6]">공고 목록을 불러오는 중입니다...</td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#9AA0A6]">조건에 맞는 채용공고가 없습니다.</td>
                </tr>
              ) : (
                posts.map((p) => {
                  const s = POST_STATUS_STYLE[p.postingStatus] || { label: p.postingStatus, bg: '#F3F4F6', text: '#374151' };
                  return (
                    <tr
                      key={p.jobPostingId}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] cursor-pointer"
                      onClick={() => openDetailModal(p)}
                    >
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.includes(p.jobPostingId)}
                          onChange={() => toggleSel(p.jobPostingId)}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-center font-bold" style={{ color: ACCENT }}>{p.jobPostingId}</td>
                      <td className="px-4 py-3 font-bold text-[#1F2328] hover:underline">{p.postingTitle}</td>
                      <td className="px-4 py-3 text-[#656D76]">{p.companyName}</td>
                      <td className="px-4 py-3 text-[#656D76] text-center">{p.ncsCodeName || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669]">
                          {p.postingType === 'RECOMMENDED' ? '추천채용' : '일반'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#656D76] text-center">{p.employmentType || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#9AA0A6] text-center whitespace-nowrap">
                        {p.applicationStartsAt ? String(p.applicationStartsAt).slice(5, 10) : ''} ~ {p.applicationEndsAt ? String(p.applicationEndsAt).slice(5, 10) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.text }}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
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

        {/* 페이징 */}
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

      {/* 신규 공고 등록 모달 */}
      <Modal
        open={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCompanySearchText('');
        }}
        title="신규 채용공고 직접 등록 (구인 접수)"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setCompanySearchText('');
              }}
            >
              취소
            </Button>
            <Button style={{ background: ACCENT }} loading={createMutation.isPending} onClick={handleCreateSubmit}>
              공고 등록 완료
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5 text-[12px]">
          {/* 기업 검색 & 선택 */}
          <div>
            <label className="block font-bold text-[#1F2328] mb-1">
              채용 기업 검색 및 선택 <span className="text-[#CF222E]">*</span>
            </label>
            <input
              type="text"
              placeholder="기업명 또는 사업자등록번호로 검색"
              value={companySearchText}
              onChange={(e) => setCompanySearchText(e.target.value)}
              className="w-full h-8 px-3 rounded-[6px] border border-[#E5E7EB] mb-1.5 focus:outline-none"
            />
            <select
              value={createForm.companyAccountId}
              onChange={(e) => setCreateForm((p) => ({ ...p, companyAccountId: e.target.value }))}
              className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
            >
              <option value="">기업을 선택하세요 ({filteredCompanies.length}건 검색됨)</option>
              {filteredCompanies.map((c) => (
                <option key={c.companyAccountId} value={c.companyAccountId}>
                  {c.companyName} ({c.businessRegistrationNo || c.businessNumber || '번호없음'})
                </option>
              ))}
            </select>
          </div>

          {/* 공고명 */}
          <div>
            <label className="block font-bold text-[#1F2328] mb-1">
              공고명 <span className="text-[#CF222E]">*</span>
            </label>
            <input
              value={createForm.postingTitle}
              onChange={(e) => setCreateForm((p) => ({ ...p, postingTitle: e.target.value }))}
              placeholder="예: 2026 하반기 신입 백엔드 엔지니어 채용"
              className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] focus:outline-none"
            />
          </div>

          {/* NCS 직무 / 근무 지역 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">
                NCS 직무 분류 <span className="text-[#CF222E]">*</span>
              </label>
              <select
                value={createForm.ncsCodeId}
                onChange={(e) => setCreateForm((p) => ({ ...p, ncsCodeId: e.target.value }))}
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              >
                <option value="">직무 선택</option>
                {ncsData.map((n) => (
                  <option key={n.codeId} value={n.codeId}>
                    {n.codeName} ({n.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">
                근무 지역 <span className="text-[#CF222E]">*</span>
              </label>
              <select
                value={createForm.regionCodeId}
                onChange={(e) => setCreateForm((p) => ({ ...p, regionCodeId: e.target.value }))}
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              >
                <option value="">지역 선택</option>
                {regions.map((r) => (
                  <option key={r.codeId} value={r.codeId}>
                    {r.codeName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 고용 형태 / 모집 인원 / 급여 */}
          <div className="grid grid-cols-3 gap-3">
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
              <label className="block font-bold text-[#1F2328] mb-1">모집 인원 (명)</label>
              <input
                type="number"
                min="1"
                value={createForm.recruitmentCount}
                onChange={(e) => setCreateForm((p) => ({ ...p, recruitmentCount: e.target.value }))}
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">급여 조건</label>
              <input
                value={createForm.salaryText}
                onChange={(e) => setCreateForm((p) => ({ ...p, salaryText: e.target.value }))}
                placeholder="연봉 3,600만원 이상"
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] focus:outline-none"
              />
            </div>
          </div>

          {/* 공고 구분 / 추천 혜택 */}
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">추천 혜택 / 복리후생</label>
              <input
                value={createForm.benefitType}
                onChange={(e) => setCreateForm((p) => ({ ...p, benefitType: e.target.value }))}
                placeholder="예: 서류전형 면제, 인센티브 지급"
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] focus:outline-none"
              />
            </div>
          </div>

          {/* 접수 기간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">접수 시작일시</label>
              <input
                type="date"
                value={createForm.applicationStartsAt ? createForm.applicationStartsAt.slice(0, 10) : ''}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, applicationStartsAt: `${e.target.value}T09:00:00Z` }))
                }
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1F2328] mb-1">
                접수 마감일시 <span className="text-[#CF222E]">*</span>
              </label>
              <input
                type="date"
                value={createForm.applicationEndsAt ? createForm.applicationEndsAt.slice(0, 10) : ''}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, applicationEndsAt: `${e.target.value}T18:00:00Z` }))
                }
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] focus:outline-none"
              />
            </div>
          </div>

          {/* 상세 채용 포스터 파일 첨부 (버튼형 UI) */}
          <div>
            <label className="block font-bold text-[#1F2328] mb-1.5">상세 채용 포스터 첨부</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-4 text-[12px] font-bold rounded-[6px] border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F9FAFB] hover:border-[#9CA3AF] transition-all shadow-sm flex items-center gap-1.5"
              >
                파일 선택
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handlePosterUpload(e, false)}
                className="hidden"
              />
              <span className="text-[12px] text-[#656D76]">
                {createForm.fileGroupId ? (
                  <span className="text-[#059669] font-bold">✓ 파일이 정상 첨부되었습니다. (ID: {createForm.fileGroupId})</span>
                ) : (
                  '선택된 파일 없음 (이미지 또는 PDF)'
                )}
              </span>
            </div>
          </div>

          {/* 직무 상세 설명 */}
          <div>
            <label className="block font-bold text-[#1F2328] mb-1">
              직무 상세 설명 <span className="text-[#CF222E]">*</span>
            </label>
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

      {/* 공고 상세 확인 및 수정 모달 */}
      <Modal
        open={Boolean(detailTarget && editForm)}
        onClose={() => {
          setDetailTarget(null);
          setEditForm(null);
        }}
        title="채용공고 상세 조회 및 정보 수정"
        footer={
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const target = detailTarget;
                  setDetailTarget(null);
                  setEditForm(null);
                  statusMutation.mutate({ jobPostingId: target.jobPostingId, postingStatus: 'PUBLISHED' });
                }}
              >
                게시 전환
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  const target = detailTarget;
                  setDetailTarget(null);
                  setEditForm(null);
                  statusMutation.mutate({ jobPostingId: target.jobPostingId, postingStatus: 'CLOSED' });
                }}
              >
                마감 처리
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setDetailTarget(null); setEditForm(null); }}>
                닫기
              </Button>
              <Button style={{ background: ACCENT }} loading={updateMutation.isPending} onClick={handleEditSubmit}>
                공고 수정 저장
              </Button>
            </div>
          </div>
        }
      >
        {detailTarget && editForm && (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-3.5 text-[12px]">
            <div className="p-3 bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#656D76]">공고 ID: </span>
                <span className="font-mono font-bold text-[#1F2328]">{detailTarget.jobPostingId}</span>
                <span className="text-[11px] text-[#656D76] ml-3">기업명: </span>
                <span className="font-bold text-[#1F2328]">{editForm.companyName}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#656D76] mr-2">게시 상태:</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: POST_STATUS_STYLE[detailTarget.postingStatus]?.bg,
                    color: POST_STATUS_STYLE[detailTarget.postingStatus]?.text,
                  }}
                >
                  {POST_STATUS_STYLE[detailTarget.postingStatus]?.label}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1F2328] mb-1">공고명</label>
              <input
                value={editForm.postingTitle}
                onChange={(e) => setEditForm((p) => ({ ...p, postingTitle: e.target.value }))}
                className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">NCS 직무 분류</label>
                <select
                  value={editForm.ncsCodeId}
                  onChange={(e) => setEditForm((p) => ({ ...p, ncsCodeId: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                >
                  <option value="">직무 선택</option>
                  {ncsData.map((n) => (
                    <option key={n.codeId} value={n.codeId}>{n.codeName} ({n.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">근무 지역</label>
                <select
                  value={editForm.regionCodeId}
                  onChange={(e) => setEditForm((p) => ({ ...p, regionCodeId: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                >
                  <option value="">지역 선택</option>
                  {regions.map((r) => (
                    <option key={r.codeId} value={r.codeId}>{r.codeName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">고용 형태</label>
                <select
                  value={editForm.employmentType}
                  onChange={(e) => setEditForm((p) => ({ ...p, employmentType: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none"
                >
                  <option value="정규직">정규직</option>
                  <option value="계약직">계약직</option>
                  <option value="인턴">인턴</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">모집 인원 (명)</label>
                <input
                  type="number"
                  min="1"
                  value={editForm.recruitmentCount}
                  onChange={(e) => setEditForm((p) => ({ ...p, recruitmentCount: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">급여 조건</label>
                <input
                  value={editForm.salaryText}
                  onChange={(e) => setEditForm((p) => ({ ...p, salaryText: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">접수 시작일시</label>
                <input
                  type="date"
                  value={editForm.applicationStartsAt}
                  onChange={(e) => setEditForm((p) => ({ ...p, applicationStartsAt: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1F2328] mb-1">접수 마감일시</label>
                <input
                  type="date"
                  value={editForm.applicationEndsAt}
                  onChange={(e) => setEditForm((p) => ({ ...p, applicationEndsAt: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] border border-[#E5E7EB] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1F2328] mb-1.5">상세 채용 포스터 첨부 변경</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="h-9 px-4 text-[12px] font-bold rounded-[6px] border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F9FAFB] transition-all shadow-sm flex items-center gap-1.5"
                >
                  파일 변경
                </button>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handlePosterUpload(e, true)}
                  className="hidden"
                />
                <span className="text-[12px] text-[#656D76]">
                  {editForm.fileGroupId ? (
                    <span className="text-[#059669] font-bold">✓ 파일 첨부됨 (ID: {editForm.fileGroupId})</span>
                  ) : (
                    '첨부된 포스터 파일 없음'
                  )}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1F2328] mb-1">직무 상세 설명</label>
              <textarea
                value={editForm.jobDescription}
                onChange={(e) => setEditForm((p) => ({ ...p, jobDescription: e.target.value }))}
                rows={4}
                className="w-full p-2.5 rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none resize-none"
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}