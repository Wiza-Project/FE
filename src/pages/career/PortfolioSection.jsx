import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Modal,
  FileUpload,
  EmptyState,
  SkeletonLoader,
  ConfirmDialog,
  toast,
} from '@/components/common';
import {
  fetchPortfolios,
  fetchPortfolio,
  createPortfolio,
  updatePortfolio,
  updatePortfolioVisibility,
  deletePortfolio,
  uploadPortfolioAttachments,
  downloadPortfolioAttachment,
} from '@/api/careerDocuments';
import { ApiError } from '@/api/client';
import { formatDate } from '@/utils/date';

const ACCENT = '#059669';
// 실제 Swagger 기준 첨부 가능 형식은 "이미지/PDF" (PortfolioController 설명).
const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.gif,.webp';

/** ApiError면 서버 메시지를, 아니면 네트워크 오류 문구를 돌려준다(403/404 등도 서버 메시지 우선). */
function getPortfolioErrorMessage(error, fallback) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  return error.message || fallback;
}

// ─── 목록 카드 ──────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {import('@/api/careerDocuments').PortfolioSummary} props.item
 * @param {() => void} props.onEdit
 * @param {() => void} props.onDelete
 * @param {() => void} props.onTogglePublic
 * @param {boolean} props.togglePending
 */
function PortfolioCard({ item, onEdit, onDelete, onTogglePublic, togglePending }) {
  return (
    <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-bold text-[#1F2328] leading-snug flex-1">
          {item.documentTitle}
        </p>
        <button
          onClick={onDelete}
          aria-label={`${item.documentTitle} 삭제`}
          className="text-[#C8D0D9] hover:text-[#CF222E] transition-colors flex-shrink-0 text-[14px] mt-0.5"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-[#656D76]">
        <svg width="12" height="14" viewBox="0 0 12 14" fill="#9AA0A6" className="flex-shrink-0">
          <path d="M7 1H2a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5L7 1z" />
          <path d="M7 1v4h4" stroke="#9AA0A6" strokeWidth="0.8" fill="none" />
        </svg>
        <span>{item.attachmentCount > 0 ? `첨부파일 ${item.attachmentCount}개` : '첨부파일 없음'}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] text-[#656D76]">공개 여부</span>
        <button
          onClick={onTogglePublic}
          disabled={togglePending}
          aria-pressed={item.isPublic}
          aria-label="공개 여부 전환"
          className={`w-10 h-5 rounded-full transition-colors relative disabled:opacity-50 ${item.isPublic ? 'bg-[#059669]' : 'bg-[#E5E7EB]'}`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${item.isPublic ? 'left-5' : 'left-0.5'}`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#C8D0D9]">최종 수정: {formatDate(item.updatedAt)}</span>
        <button className="text-[11px] text-[#059669] font-bold hover:underline" onClick={onEdit}>
          수정
        </button>
      </div>
    </div>
  );
}

// ─── 등록/수정 모달 ─────────────────────────────────────────────────────────

function emptyForm() {
  return {
    title: '',
    description: '',
    periodStart: '',
    periodEnd: '',
    skills: [],
    skillInput: '',
    externalUrl: '',
    isPublic: false,
  };
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {number|null} props.documentId null이면 신규 등록
 * @param {() => void} props.onClose
 * @param {() => void} props.onSaved
 */
function PortfolioFormModal({ open, documentId, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const isEdit = !!documentId;

  const detailQuery = useQuery({
    queryKey: ['career', 'portfolio', documentId],
    queryFn: () => fetchPortfolio(documentId),
    enabled: open && isEdit,
  });

  const [form, setForm] = useState(emptyForm());
  const [pendingFiles, setPendingFiles] = useState([]);
  const [loadedId, setLoadedId] = useState(null);

  // 모달을 닫을 때 상태를 비워, 다음에 열릴 때 서버 데이터를 새로 채우도록 한다.
  useEffect(() => {
    if (!open) {
      setLoadedId(null);
      setPendingFiles([]);
    }
  }, [open]);

  // 신규 등록은 열릴 때 즉시 빈 폼으로, 수정은 상세 조회가 끝나면 채운다.
  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      setForm(emptyForm());
      return;
    }
    const doc = detailQuery.data;
    if (!doc || doc.careerDocumentId === loadedId) return;
    const c = doc.contentData ?? {};
    setForm({
      title: doc.documentTitle ?? '',
      description: c.description ?? '',
      periodStart: c.periodStart ?? '',
      periodEnd: c.periodEnd ?? '',
      skills: Array.isArray(c.skills) ? c.skills : [],
      skillInput: '',
      externalUrl: c.externalUrl ?? '',
      isPublic: !!doc.isPublic,
    });
    setLoadedId(doc.careerDocumentId);
  }, [open, isEdit, detailQuery.data, loadedId]);

  const addSkill = () => {
    const value = form.skillInput.trim();
    if (!value) return;
    setForm((f) =>
      f.skills.includes(value)
        ? { ...f, skillInput: '' }
        : { ...f, skills: [...f.skills, value], skillInput: '' },
    );
  };
  const removeSkill = (skill) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));

  const buildContentData = () => ({
    description: form.description.trim() || null,
    periodStart: form.periodStart || null,
    periodEnd: form.periodEnd || null,
    skills: form.skills,
    externalUrl: form.externalUrl.trim() || null,
  });

  const createMutation = useMutation({ mutationFn: createPortfolio });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updatePortfolio(id, payload),
  });
  const uploadMutation = useMutation({
    mutationFn: ({ id, files }) => uploadPortfolioAttachments(id, files),
  });
  const visibilityMutation = useMutation({
    mutationFn: ({ id, isPublic }) => updatePortfolioVisibility(id, isPublic),
  });

  const saving =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadMutation.isPending ||
    visibilityMutation.isPending;

  const validate = () => {
    if (!form.title.trim()) {
      toast('제목을 입력해 주세요.', 'error');
      return false;
    }
    if (form.periodStart && form.periodEnd && form.periodStart > form.periodEnd) {
      toast('시작일은 종료일보다 빠르거나 같아야 합니다.', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (saving || !validate()) return;
    try {
      const doc = isEdit
        ? await updateMutation.mutateAsync({
            id: documentId,
            payload: {
              documentTitle: form.title.trim(),
              contentData: buildContentData(),
              aiAssistanceUsed: false,
            },
          })
        : await createMutation.mutateAsync({
            documentTitle: form.title.trim(),
            contentData: buildContentData(),
            aiAssistanceUsed: false,
          });

      // 첨부파일 업로드는 문서가 존재해야 호출할 수 있어, 본문 저장 뒤에 이어서 호출한다.
      if (pendingFiles.length > 0) {
        try {
          await uploadMutation.mutateAsync({ id: doc.careerDocumentId, files: pendingFiles });
        } catch (uploadErr) {
          toast(
            getPortfolioErrorMessage(
              uploadErr,
              '첨부파일 업로드에 실패했습니다. 항목 내용은 저장되었습니다.',
            ),
            'error',
          );
        }
      }

      // 공개 여부는 별도 API라, 값이 바뀐 경우에만 이어서 호출한다.
      if (form.isPublic !== !!doc.isPublic) {
        try {
          await visibilityMutation.mutateAsync({
            id: doc.careerDocumentId,
            isPublic: form.isPublic,
          });
        } catch (visErr) {
          toast(
            getPortfolioErrorMessage(visErr, '공개 여부 변경에 실패했습니다.'),
            'error',
          );
        }
      }

      queryClient.invalidateQueries({ queryKey: ['career', 'portfolio', doc.careerDocumentId] });
      toast(isEdit ? '포트폴리오가 수정되었습니다.' : '포트폴리오가 등록되었습니다.', 'success');
      onSaved();
    } catch (err) {
      toast(
        getPortfolioErrorMessage(err, isEdit ? '수정에 실패했습니다.' : '등록에 실패했습니다.'),
        'error',
      );
    }
  };

  const detailLoading = isEdit && detailQuery.isLoading;
  const detailErrored = isEdit && detailQuery.isError;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? '포트폴리오 수정' : '포트폴리오 추가'}
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button
            size="sm"
            style={{ background: ACCENT }}
            loading={saving}
            disabled={detailLoading || detailErrored}
            onClick={handleSubmit}
          >
            저장
          </Button>
        </>
      }
    >
      {detailLoading && <SkeletonLoader rows={3} cols={2} />}

      {detailErrored && (
        <p className="text-[13px] text-[#CF222E]">
          {getPortfolioErrorMessage(detailQuery.error, '문서를 찾을 수 없거나 접근할 수 없습니다.')}
        </p>
      )}

      {!detailLoading && !detailErrored && (
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="portfolioTitle"
              className="block text-[12px] font-semibold text-[#656D76] mb-1.5"
            >
              제목
            </label>
            <input
              id="portfolioTitle"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="예) 졸업작품 - 학사관리 시스템"
              className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
            />
          </div>

          <div>
            <label
              htmlFor="portfolioDescription"
              className="block text-[12px] font-semibold text-[#656D76] mb-1.5"
            >
              설명
            </label>
            <textarea
              id="portfolioDescription"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              placeholder="프로젝트·활동에 대한 설명을 입력하세요."
              className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#059669]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="portfolioPeriodStart"
                className="block text-[12px] font-semibold text-[#656D76] mb-1.5"
              >
                시작일
              </label>
              <input
                id="portfolioPeriodStart"
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
              />
            </div>
            <div>
              <label
                htmlFor="portfolioPeriodEnd"
                className="block text-[12px] font-semibold text-[#656D76] mb-1.5"
              >
                종료일
              </label>
              <input
                id="portfolioPeriodEnd"
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="portfolioExternalUrl"
              className="block text-[12px] font-semibold text-[#656D76] mb-1.5"
            >
              외부 링크
            </label>
            <input
              id="portfolioExternalUrl"
              type="url"
              value={form.externalUrl}
              onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
            />
          </div>

          <div>
            <label
              htmlFor="portfolioSkillInput"
              className="block text-[12px] font-semibold text-[#656D76] mb-1.5"
            >
              기술 태그
            </label>
            <div className="flex gap-2">
              <input
                id="portfolioSkillInput"
                value={form.skillInput}
                onChange={(e) => setForm((f) => ({ ...f, skillInput: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="예) React (Enter로 추가)"
                className="flex-1 h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
              />
              <Button type="button" variant="outline" size="sm" onClick={addSkill}>
                추가
              </Button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.skills.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#059669]"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="ml-0.5 text-[#059669] hover:text-[#CF222E]"
                      aria-label={`${s} 태그 삭제`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="block text-[12px] font-semibold text-[#656D76] mb-1.5">
              첨부파일
            </span>
            <FileUpload
              accept={ATTACHMENT_ACCEPT}
              maxSize="서버 정책에 따름"
              multiple
              onFiles={(files) => setPendingFiles((prev) => [...prev, ...files])}
            />
            <p className="text-[10px] text-[#9AA0A6] mt-1">저장 시 함께 업로드됩니다.</p>

            {isEdit && detailQuery.data?.attachments?.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {detailQuery.data.attachments.map((a) => (
                  <li
                    key={a.storedFileId}
                    className="flex items-center gap-2 text-[11px] text-[#656D76] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 py-1.5"
                  >
                    <span className="truncate flex-1">{a.originalFileName}</span>
                    <span className="text-[#C8D0D9]">
                      {(a.fileSize / 1024 / 1024).toFixed(1)}MB
                    </span>
                    <button
                      type="button"
                      className="text-[#059669] font-bold hover:underline"
                      onClick={() =>
                        downloadPortfolioAttachment(documentId, a.storedFileId, a.originalFileName)
                      }
                    >
                      다운로드
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {uploadMutation.isPending && (
              <p className="text-[11px] text-[#2563EB] mt-1.5">첨부파일 업로드 중…</p>
            )}
            {uploadMutation.isError && (
              <p className="text-[11px] text-[#CF222E] mt-1.5">
                {getPortfolioErrorMessage(uploadMutation.error, '첨부파일 업로드에 실패했습니다.')}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#F3F4F6] pt-3">
            <span className="text-[13px] font-semibold text-[#1F2328]">공개 여부</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
              aria-pressed={form.isPublic}
              aria-label="공개 여부 전환"
              className={`w-10 h-5 rounded-full transition-colors relative ${form.isPublic ? 'bg-[#059669]' : 'bg-[#E5E7EB]'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${form.isPublic ? 'left-5' : 'left-0.5'}`}
              />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

/**
 * 취업 준비 > 포트폴리오·희망조건 화면의 "포트폴리오" 섹션.
 * 희망직무·희망지역·고용형태·희망연봉·정보공개 동의는 이 컴포넌트의 범위 밖이며
 * PortfolioPrefs.jsx의 다른 섹션(목업)에 그대로 남아있다.
 */
export default function PortfolioSection() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['career', 'portfolios'],
    queryFn: () => fetchPortfolios(),
  });
  const items = listQuery.data?.content ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const visibilityMutation = useMutation({
    mutationFn: ({ id, isPublic }) => updatePortfolioVisibility(id, isPublic),
    onMutate: async ({ id, isPublic }) => {
      await queryClient.cancelQueries({ queryKey: ['career', 'portfolios'] });
      const prev = queryClient.getQueryData(['career', 'portfolios']);
      queryClient.setQueryData(['career', 'portfolios'], (old) =>
        old
          ? {
              ...old,
              content: old.content.map((p) =>
                p.careerDocumentId === id ? { ...p, isPublic } : p,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['career', 'portfolios'], ctx.prev);
      toast(getPortfolioErrorMessage(err, '공개 여부 변경에 실패했습니다.'), 'error');
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['career', 'portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['career', 'portfolio', vars.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deletePortfolio(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['career', 'portfolio', id] });
      queryClient.invalidateQueries({ queryKey: ['career', 'portfolios'] });
      setDeleteTarget(null);
      toast('포트폴리오가 삭제되었습니다.', 'success');
    },
    onError: (err) => {
      toast(getPortfolioErrorMessage(err, '삭제에 실패했습니다.'), 'error');
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };
  const openEdit = (id) => {
    setEditingId(id);
    setModalOpen(true);
  };
  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['career', 'portfolios'] });
    setModalOpen(false);
  };

  if (listQuery.isLoading) {
    return <SkeletonLoader rows={3} cols={4} />;
  }

  if (listQuery.isError) {
    return (
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-10 text-center">
        <p className="text-[14px] font-bold text-[#1F2328] mb-3">
          {getPortfolioErrorMessage(listQuery.error, '포트폴리오 목록을 불러오지 못했습니다.')}
        </p>
        <Button size="sm" variant="outline" onClick={() => listQuery.refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" style={{ background: ACCENT }} onClick={openCreate}>
          + 포트폴리오 추가
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          message="등록된 포트폴리오가 없습니다."
          sub="진행한 프로젝트나 활동을 포트폴리오로 정리해 보세요."
          action={
            <Button size="sm" style={{ background: ACCENT }} onClick={openCreate}>
              포트폴리오 추가
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 grid-cols-3">
          {items.map((item) => (
            <PortfolioCard
              key={item.careerDocumentId}
              item={item}
              onEdit={() => openEdit(item.careerDocumentId)}
              onDelete={() => setDeleteTarget(item)}
              onTogglePublic={() =>
                visibilityMutation.mutate({ id: item.careerDocumentId, isPublic: !item.isPublic })
              }
              togglePending={
                visibilityMutation.isPending &&
                visibilityMutation.variables?.id === item.careerDocumentId
              }
            />
          ))}
        </div>
      )}

      <PortfolioFormModal
        open={modalOpen}
        documentId={editingId}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="포트폴리오 삭제"
        message={`'${deleteTarget?.documentTitle ?? ''}' 항목을 삭제하면 되돌릴 수 없습니다. 삭제하시겠습니까?`}
        confirmLabel="삭제"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.careerDocumentId)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
