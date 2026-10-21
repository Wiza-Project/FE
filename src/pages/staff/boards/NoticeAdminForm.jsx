import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select, FileUpload, toast } from '@/components/common';
import { createBoardPost, updateBoardPost, fetchBoardPost } from '@/api/boards';
import { ApiError } from '@/api/client';

const BOARD_CODE = 'NOTICE';
const ACCENT = '#1F2937';
const MAX_ATTACHMENTS = 5;

const STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: '게시중' },
  { value: 'DRAFT', label: '임시저장' },
  { value: 'HIDDEN', label: '숨김' },
];

function getErrorMessage(error, fallback) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  // B007: removeFileIds에 이 게시글의 첨부가 아닌 storedFileId가 섞여 있을 때 404.
  if (error.code === 'B007') {
    return '이미 삭제되었거나 이 공지의 첨부가 아닌 파일이 포함되어 있습니다. 새로고침 후 다시 시도해 주세요.';
  }
  // B006: 첨부파일은 게시글당 최대 5개까지만 허용된다.
  if (error.code === 'B006') {
    return '첨부파일은 최대 5개까지 등록할 수 있습니다.';
  }
  return error.message || fallback;
}

/**
 * 교직원 공지사항 등록/수정 폼.
 * POST /api/staff/boards/NOTICE/posts, PATCH /api/staff/boards/NOTICE/posts/{postId}
 *
 * @param {Object} props
 * @param {number} [props.postId] 편집 대상. 있으면 수정 모드.
 * @param {() => void} props.onBack
 * @param {() => void} props.onSubmit
 */
export default function NoticeAdminForm({ postId, onBack, onSubmit }) {
  const isEdit = !!postId;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [postStatus, setPostStatus] = useState('PUBLISHED');
  const [newFiles, setNewFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [removeFileIds, setRemoveFileIds] = useState([]);
  const [errors, setErrors] = useState({});
  const [prefilled, setPrefilled] = useState(false);

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
    setPinned(!!detailData.pinned);
    setPostStatus(detailData.postStatus ?? 'PUBLISHED');
    setExistingAttachments(detailData.attachments ?? []);
    setPrefilled(true);
  }, [isEdit, prefilled, detailData]);

  const handleError = (err) => {
    toast(getErrorMessage(err, isEdit ? '수정 중 오류가 발생했습니다.' : '등록 중 오류가 발생했습니다.'), 'error');
  };

  const createMutation = useMutation({
    mutationFn: (payload) => createBoardPost(BOARD_CODE, payload),
    onSuccess: () => {
      toast('공지사항이 등록되었습니다.', 'success');
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

  const totalAttachmentCount = existingAttachments.length + newFiles.length;

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = true;
    if (!content.trim()) newErrors.content = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast('제목과 내용을 입력해 주세요.', 'error');
      return false;
    }
    // 서버가 게시글당 첨부 5개를 초과하면 400(B006)으로 거절하므로 미리 막는다.
    if (totalAttachmentCount > MAX_ATTACHMENTS) {
      toast(`첨부파일은 최대 ${MAX_ATTACHMENTS}개까지 등록할 수 있습니다.`, 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload = {
      title: title.trim(),
      content: content.trim(),
      pinned,
      postStatus,
      files: newFiles.length > 0 ? newFiles : undefined,
      ...(isEdit && removeFileIds.length > 0 ? { removeFileIds } : {}),
    };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const markAttachmentForRemoval = (storedFileId) => {
    setExistingAttachments((prev) => prev.filter((f) => f.storedFileId !== storedFileId));
    setRemoveFileIds((prev) => [...prev, storedFileId]);
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
          {getErrorMessage(detailError, '공지사항을 불러오지 못했습니다.')}
        </p>
        <Button variant="outline" onClick={onBack}>
          목록으로
        </Button>
      </div>
    );
  }

  const saving = isEdit ? updateMutation.isPending : createMutation.isPending;

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
        <h2 className="text-[16px] font-bold text-[#1F2328]">
          {isEdit ? '공지사항 수정' : '공지사항 등록'}
        </h2>
      </div>

      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-6 flex flex-col gap-5 max-w-[720px]">
        <Input
          label="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title ? '제목을 입력해 주세요.' : undefined}
          maxLength={200}
          placeholder="공지 제목을 입력하세요"
        />

        <div className="flex flex-col gap-1">
          <label className="text-[13px] font-semibold text-[#1F2328]" htmlFor="notice-content">
            내용
          </label>
          <textarea
            id="notice-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="공지 내용을 입력하세요"
            className={`w-full px-3 py-2.5 text-[13px] rounded-[6px] border resize-none focus:outline-none focus:ring-1 focus:ring-[#1F2937] focus:border-[#1F2937] ${errors.content ? 'border-[#CF222E]' : 'border-[#E5E7EB]'}`}
          />
          {errors.content && <span className="text-[11px] text-[#CF222E]">내용을 입력해 주세요.</span>}
        </div>

        <div className="flex items-end gap-5">
          <div className="w-40">
            <Select label="게시 상태" value={postStatus} onChange={(e) => setPostStatus(e.target.value)} options={STATUS_OPTIONS} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer w-fit h-9">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="rounded-[3px] border-[#D1D5DB] accent-[#1F2937]"
            />
            <span className="text-[13px] font-semibold text-[#1F2328]">상단 고정</span>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-semibold text-[#1F2328]">첨부파일</label>
            <span className={`text-[11px] ${totalAttachmentCount > MAX_ATTACHMENTS ? 'text-[#CF222E] font-semibold' : 'text-[#9AA0A6]'}`}>
              {totalAttachmentCount}/{MAX_ATTACHMENTS}
            </span>
          </div>

          {existingAttachments.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-3">
              {existingAttachments.map((f) => (
                <div
                  key={f.storedFileId}
                  className="flex items-center gap-2 px-3 py-2 bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB]"
                >
                  <span className="text-[12px] text-[#1F2328] flex-1 truncate">
                    {f.originalFileName}
                  </span>
                  <button
                    onClick={() => markAttachmentForRemoval(f.storedFileId)}
                    className="text-[11px] font-semibold text-[#CF222E] hover:underline"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}

          <FileUpload multiple onFiles={(files) => setNewFiles((prev) => [...prev, ...files])} />
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
