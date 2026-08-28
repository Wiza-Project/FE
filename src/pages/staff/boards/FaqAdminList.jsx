import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Input,
  Button,
  Pagination,
  EmptyState,
  SkeletonLoader,
  ConfirmDialog,
  StatusBadge,
  toast,
} from '@/components/common';
import { fetchBoardPosts, fetchFaqCategories, deleteBoardPost } from '@/api/boards';
import { ApiError } from '@/api/client';
import { formatDate } from '@/utils/date';
import FaqCategoryManager from './FaqCategoryManager';

const BOARD_CODE = 'FAQ';
const PAGE_SIZE = 10;
const ACCENT = '#1F2937';

function getErrorMessage(error, fallback) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  return error.message || fallback;
}

/**
 * 교직원 FAQ 관리 목록. GET /api/boards/FAQ/posts 재사용 + 카테고리 필터 +
 * DELETE /api/admin/boards/FAQ/posts/{postId}. 카테고리 자체는 게시판 API가 아니라
 * 공통코드(FAQ_CATEGORY)로 관리되며, 관리자 CRUD 화면·API는 만들지 않고 배포 시
 * 시드로만 반영하기로 확정됐다 — FaqCategoryManager 모달은 읽기
 * 전용 목록이 최종 형태다.
 *
 * @param {Object} props
 * @param {() => void} props.onNew
 * @param {(postId: number) => void} props.onEdit
 */
export default function FaqAdminList({ onNew, onEdit }) {
  const [categoryCode, setCategoryCode] = useState('');
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: categories = [], isError: categoriesErrored } = useQuery({
    queryKey: ['faqCategories'],
    queryFn: fetchFaqCategories,
  });

  const listQueryKey = ['adminBoardPosts', BOARD_CODE, { keyword: submittedKeyword, categoryCode, page }];
  const { data, isLoading, isError, error } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      fetchBoardPosts(BOARD_CODE, {
        keyword: submittedKeyword || undefined,
        categoryCode: categoryCode || undefined,
        page: page - 1,
        size: PAGE_SIZE,
      }),
  });

  useEffect(() => {
    if (!data) return;
    const lastPage = Math.max(1, data.totalPages || 1);
    if (page > lastPage) setPage(lastPage);
  }, [data, page]);

  const deleteMutation = useMutation({
    mutationFn: (postId) => deleteBoardPost(BOARD_CODE, postId),
    onSuccess: () => {
      toast('삭제되었습니다.', 'success');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['adminBoardPosts', BOARD_CODE] });
    },
    onError: (err) => {
      toast(getErrorMessage(err, '삭제 중 오류가 발생했습니다.'), 'error');
      setDeleteTarget(null);
    },
  });

  const posts = data?.content ?? [];
  const totalItems = data?.totalElements ?? 0;
  const totalPages = Math.max(1, data?.totalPages || 1);
  const currentPage = Math.min(page, totalPages);

  const runSearch = () => {
    setPage(1);
    setSubmittedKeyword(keyword);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-bold text-[#1F2328]">FAQ 관리</h2>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            학생 포털에 노출되는 자주 묻는 질문을 등록·수정·삭제합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCategoryModalOpen(true)}>
            카테고리 목록
          </Button>
          <Button onClick={onNew} style={{ background: ACCENT }}>
            + FAQ 등록
          </Button>
        </div>
      </div>

      <div className="mb-4">
        {categoriesErrored ? (
          <p className="text-[12px] text-[#9AA0A6]">카테고리 목록을 불러오지 못했습니다.</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {[{ categoryCode: '', categoryName: '전체' }, ...categories].map((c) => {
              const active = categoryCode === c.categoryCode;
              const disabled = c.active === false;
              return (
                <button
                  key={c.categoryCode || 'all'}
                  onClick={() => {
                    setCategoryCode(c.categoryCode);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-[999px] text-[12px] font-semibold transition-colors border ${active ? 'text-white border-transparent' : 'bg-white border-[#E5E7EB] text-[#656D76] hover:border-[#1F2937] hover:text-[#1F2328]'}`}
                  style={active ? { background: ACCENT, borderColor: ACCENT } : {}}
                >
                  {c.categoryName}
                  {disabled && <span className="ml-1 text-[10px] opacity-70">(비활성)</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 mb-4">
        <div className="flex-1 max-w-[360px]">
          <Input
            label="검색"
            placeholder="질문으로 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
        </div>
        <Button size="md" variant="outline" onClick={runSearch}>
          조회
        </Button>
      </div>

      {isLoading && <SkeletonLoader rows={6} cols={4} />}

      {isError && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-12 text-center text-[13px] text-[#CF222E]">
          {getErrorMessage(error, 'FAQ 목록을 불러오지 못했습니다.')}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {['질문', '카테고리', '게시일', '관리'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 3 ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12">
                      <EmptyState message="등록된 FAQ가 없습니다." />
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr
                      key={post.postId}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-4 py-3 max-w-[360px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-semibold text-[#1F2328] truncate">{post.title}</p>
                          {post.postStatus && post.postStatus !== 'PUBLISHED' && (
                            <StatusBadge status={post.postStatusLabel ?? post.postStatus} size="sm" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#656D76]">
                        {post.categoryName ?? '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#656D76]">
                        {post.publishedAt ? formatDate(post.publishedAt) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-center">
                          <button
                            onClick={() => onEdit(post.postId)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] transition-colors bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => setDeleteTarget(post)}
                            className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] transition-colors bg-[#FEE2E2] text-[#CF222E] hover:bg-[#FECACA]"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 pb-3 pt-1">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="FAQ 삭제 확인"
        message={`'${deleteTarget?.title ?? ''}' FAQ를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.postId)}
        onCancel={() => !deleteMutation.isPending && setDeleteTarget(null)}
      />

      <FaqCategoryManager open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} />
    </div>
  );
}
