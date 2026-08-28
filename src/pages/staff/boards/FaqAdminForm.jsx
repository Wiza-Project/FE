import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select, toast } from '@/components/common';
import { createBoardPost, updateBoardPost, fetchBoardPost, fetchFaqCategories } from '@/api/boards';
import { ApiError } from '@/api/client';

const BOARD_CODE = 'FAQ';
const ACCENT = '#1F2937';

const STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: '게시중' },
  { value: 'DRAFT', label: '임시저장' },
  { value: 'HIDDEN', label: '숨김' },
];

function getErrorMessage(error, fallback) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  // B001: 삭제되었거나 존재하지 않는 categoryCode. B002: 비활성화된 카테고리로 등록/수정 시도.
  if (error.code === 'B001') {
    return '선택한 카테고리를 찾을 수 없습니다. 새로고침 후 다시 선택해 주세요.';
  }
  if (error.code === 'B002') {
    return '선택한 카테고리가 비활성화되어 있습니다. 다른 카테고리를 선택해 주세요.';
  }
  return error.message || fallback;
}

/**
 * 교직원 FAQ 등록/수정 폼.
 * POST /api/admin/boards/FAQ/posts, PATCH /api/admin/boards/FAQ/posts/{postId}
 *
 * @param {Object} props
 * @param {number} [props.postId] 편집 대상. 있으면 수정 모드.
 * @param {() => void} props.onBack
 * @param {() => void} props.onSubmit
 */
export default function FaqAdminForm({ postId, onBack, onSubmit }) {
  const isEdit = !!postId;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [postStatus, setPostStatus] = useState('PUBLISHED');
  const [errors, setErrors] = useState({});
  const [prefilled, setPrefilled] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading, isError: categoriesErrored } = useQuery({
    queryKey: ['faqCategories'],
    queryFn: fetchFaqCategories,
  });

  const {
    data: detailData,
    isLoading: detailLoading,
    isError: detailErrored,
    error: detailError,
  } = useQuery({
    queryKey: ['boardPost', BOARD_CODE, postId],
    queryFn: () => fetchBoardPost(BOARD_CODE, postId),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit || prefilled || !detailData) return;
    setTitle(detailData.title ?? '');
    setContent(detailData.content ?? '');
    setCategoryCode(detailData.categoryCode ?? '');
    setPostStatus(detailData.postStatus ?? 'PUBLISHED');
    setPrefilled(true);
  }, [isEdit, prefilled, detailData]);

  const handleError = (err) => {
    toast(getErrorMessage(err, isEdit ? '수정 중 오류가 발생했습니다.' : '등록 중 오류가 발생했습니다.'), 'error');
  };

  const createMutation = useMutation({
    mutationFn: (payload) => createBoardPost(BOARD_CODE, payload),
    onSuccess: () => {
      toast('FAQ가 등록되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminBoardPosts', BOARD_CODE] });
      onSubmit();
    },
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateBoardPost(BOARD_CODE, postId, payload),
    onSuccess: () => {
      toast('수정 내용이 저장되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminBoardPosts', BOARD_CODE] });
      queryClient.invalidateQueries({ queryKey: ['boardPost', BOARD_CODE, postId] });
      onSubmit();
    },
    onError: handleError,
  });

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = true;
    if (!content.trim()) newErrors.content = true;
    if (!categoryCode) newErrors.categoryCode = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast('질문, 답변, 카테고리를 모두 입력해 주세요.', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload = { title: title.trim(), content: content.trim(), categoryCode, postStatus };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  if (isEdit && detailLoading) {
    return (
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-10 text-center text-[13px] text-[#9AA0A6]">
        불러오는 중...
      </div>
    );
  }

  if (isEdit && detailErrored) {
    return (
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-10 text-center">
        <p className="text-[14px] font-bold text-[#1F2328] mb-3">
          {getErrorMessage(detailError, 'FAQ를 불러오지 못했습니다.')}
        </p>
        <Button variant="outline" onClick={onBack}>
          목록으로
        </Button>
      </div>
    );
  }

  const saving = isEdit ? updateMutation.isPending : createMutation.isPending;
  const categoryOptions = [
    { value: '', label: categoriesLoading ? '불러오는 중…' : '선택하세요' },
    ...categories.map((c) => ({
      value: c.categoryCode,
      label: c.active === false ? `${c.categoryName} (비활성)` : c.categoryName,
    })),
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-[#9AA0A6] hover:text-[#1F2328] transition-colors"
        >
          ← 목록
        </button>
        <div className="h-4 w-px bg-[#E5E7EB]" />
        <h2 className="text-[16px] font-bold text-[#1F2328]">{isEdit ? 'FAQ 수정' : 'FAQ 등록'}</h2>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6 flex flex-col gap-5 max-w-[720px]">
        <div className="flex items-start gap-5">
          <div className="flex-1">
            <Select
              label="카테고리"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              options={categoryOptions}
              disabled={categoriesLoading || categoriesErrored}
            />
            {categoriesErrored && (
              <p className="text-[11px] text-[#CF222E] mt-1">카테고리 목록을 불러오지 못했습니다.</p>
            )}
            {errors.categoryCode && (
              <p className="text-[11px] text-[#CF222E] mt-1">카테고리를 선택해 주세요.</p>
            )}
          </div>
          <div className="w-40">
            <Select label="게시 상태" value={postStatus} onChange={(e) => setPostStatus(e.target.value)} options={STATUS_OPTIONS} />
          </div>
        </div>

        <Input
          label="질문"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title ? '질문을 입력해 주세요.' : undefined}
          maxLength={200}
          placeholder="자주 묻는 질문을 입력하세요"
        />

        <div className="flex flex-col gap-1">
          <label className="text-[13px] font-semibold text-[#1F2328]" htmlFor="faq-content">
            답변
          </label>
          <textarea
            id="faq-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="답변 내용을 입력하세요"
            className={`w-full px-3 py-2.5 text-[13px] rounded-[6px] border resize-none focus:outline-none focus:ring-1 focus:ring-[#1F2937] focus:border-[#1F2937] ${errors.content ? 'border-[#CF222E]' : 'border-[#E5E7EB]'}`}
          />
          {errors.content && <span className="text-[11px] text-[#CF222E]">답변을 입력해 주세요.</span>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5 max-w-[720px]">
        <Button variant="outline" onClick={onBack}>
          취소
        </Button>
        <Button loading={saving} onClick={handleSubmit} style={{ background: ACCENT }}>
          {isEdit ? '수정 저장' : '등록'}
        </Button>
      </div>
    </div>
  );
}
