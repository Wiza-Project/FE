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
import { fetchBoardPosts, deleteBoardPost } from '@/api/boards';
import { ApiError } from '@/api/client';
import { formatDate } from '@/utils/date';

const BOARD_CODE = 'NOTICE';
const PAGE_SIZE = 10;
const ACCENT = '#1F2937';

function getErrorMessage(error, fallback) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  return error.message || fallback;
}

/**
 * 교직원 공지사항 관리 목록. GET /api/boards/NOTICE/posts 재사용 + DELETE /api/staff/boards/NOTICE/posts/{postId}.
 *
 * @param {Object} props
 * @param {() => void} props.onNew
 * @param {(postId: number) => void} props.onEdit
 */
export default function NoticeAdminList({ onNew, onEdit }) {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryClient = useQueryClient();
  const listQueryKey = ['adminBoardPosts', BOARD_CODE, { keyword: submittedKeyword, page }];
  const { data, isLoading, isError, error } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      fetchBoardPosts(BOARD_CODE, {
        keyword: submittedKeyword || undefined,
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
          <h2 className="text-[16px] font-bold text-[#1F2328]">공지사항 관리</h2>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            학생 포털에 노출되는 공지사항을 등록·수정·삭제합니다.
          </p>
        </div>
        <Button onClick={onNew} style={{ background: ACCENT }}>
          + 공지 등록
        </Button>
      </div>

      <div className="flex items-end gap-2 mb-4">
        <div className="flex-1 max-w-[360px]">
          <Input
            label="검색"
            placeholder="제목으로 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
        </div>
        <Button size="md" variant="outline" onClick={runSearch}>
          조회
        </Button>
      </div>

      {isLoading && <SkeletonLoader rows={6} cols={5} />}

      {isError && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-12 text-center text-[13px] text-[#CF222E]">
          {getErrorMessage(error, '공지사항 목록을 불러오지 못했습니다.')}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {['제목', '작성자', '고정', '첨부', '게시일', '관리'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 2 ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12">
                      <EmptyState message="등록된 공지사항이 없습니다." />
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr
                      key={post.postId}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-4 py-3 max-w-[320px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-semibold text-[#1F2328] truncate">{post.title}</p>
                          {post.postStatus && post.postStatus !== 'PUBLISHED' && (
                            <StatusBadge status={post.postStatusLabel ?? post.postStatus} size="sm" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#656D76]">
                        {post.authorName ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {post.pinned && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                            고정
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-[#9AA0A6]">
                        {post.hasAttachment ? '✓' : ''}
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
        title="공지사항 삭제 확인"
        message={`'${deleteTarget?.title ?? ''}' 공지사항을 삭제하시겠습니까?`}
        confirmLabel="삭제"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.postId)}
        onCancel={() => !deleteMutation.isPending && setDeleteTarget(null)}
      />
    </div>
  );
}
