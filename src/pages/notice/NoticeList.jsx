import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input, Button, Pagination, EmptyState, SkeletonLoader, Drawer, toast } from '@/components/common';
import { fetchBoardPosts, fetchBoardPost, downloadBoardFile } from '@/api/boards';
import { ApiError } from '@/api/client';
import { formatDate } from '@/utils/date';

const BOARD_CODE = 'NOTICE';
const PAGE_SIZE = 10;
const ACCENT = '#6B7280';

function getListErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  return error.message || '공지사항 목록을 불러오지 못했습니다.';
}

function AttachmentIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="inline-block align-[-1px]">
      <path
        d="M11 5.5L6.5 10a2 2 0 102.83 2.83L13.5 8.7a3.5 3.5 0 10-4.95-4.95L4.4 8.9"
        stroke="#9AA0A6"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NoticeDetailDrawer({ postId, onClose }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['boardPost', BOARD_CODE, postId],
    queryFn: () => fetchBoardPost(BOARD_CODE, postId),
    enabled: postId != null,
  });

  return (
    <Drawer open={postId != null} onClose={onClose} title="공지사항">
      {isLoading && (
        <div className="flex flex-col gap-3">
          <div className="h-5 w-2/3 bg-[#F3F4F6] rounded animate-pulse" />
          <div className="h-3 w-1/3 bg-[#F3F4F6] rounded animate-pulse" />
          <div className="h-32 w-full bg-[#F3F4F6] rounded animate-pulse mt-2" />
        </div>
      )}

      {isError && (
        <p className="text-[13px] text-[#CF222E]">
          {error instanceof ApiError ? error.message : '공지사항을 불러오지 못했습니다.'}
        </p>
      )}

      {!isLoading && !isError && data && (
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {data.pinned && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                고정
              </span>
            )}
            <h3 className="text-[16px] font-bold text-[#1F2328]">{data.title}</h3>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[#9AA0A6] mb-4 pb-4 border-b border-[#E5E7EB]">
            <span>{data.authorName ?? '학교'}</span>
            <span>·</span>
            <span>{formatDate(data.publishedAt ?? data.createdAt)}</span>
          </div>

          <p className="text-[13px] text-[#1F2328] whitespace-pre-wrap leading-relaxed">
            {data.content}
          </p>

          {data.attachments?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
              <p className="text-[12px] font-semibold text-[#656D76] mb-2">첨부파일</p>
              <div className="flex flex-col gap-1.5">
                {data.attachments.map((f) => (
                  <button
                    key={f.storedFileId}
                    onClick={() =>
                      downloadBoardFile(f.storedFileId, f.originalFileName).catch(() =>
                        toast('파일을 다운로드하지 못했습니다.', 'error'),
                      )
                    }
                    className="flex items-center gap-2 px-3 py-2 bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB] text-left hover:border-[#6B7280] transition-colors"
                  >
                    <AttachmentIcon />
                    <span className="text-[12px] text-[#1F2328] flex-1 truncate">
                      {f.originalFileName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

/** 학생용 공지사항 탭: 키워드 검색 + 목록(상단 고정 강조) + 페이지네이션 + 상세 드로어. */
export default function NoticeList() {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [openPostId, setOpenPostId] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['boardPosts', BOARD_CODE, { keyword: submittedKeyword, page }],
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
        <Button size="md" onClick={runSearch} style={{ background: ACCENT }}>
          검색
        </Button>
      </div>

      {isLoading && <SkeletonLoader rows={6} cols={4} />}

      {isError && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-12 text-center text-[13px] text-[#CF222E]">
          {getListErrorMessage(error)}
        </div>
      )}

      {!isLoading && !isError && posts.length === 0 && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] py-12">
          <EmptyState message="등록된 공지사항이 없습니다." />
        </div>
      )}

      {!isLoading && !isError && posts.length > 0 && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="divide-y divide-[#F3F4F6]">
            {posts.map((post) => (
              <button
                key={post.postId}
                onClick={() => setOpenPostId(post.postId)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#F9FAFB] ${post.pinned ? 'bg-[#FFFBEB]' : ''}`}
              >
                {post.pinned && (
                  <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                    고정
                  </span>
                )}
                <span
                  className={`flex-1 min-w-0 truncate text-[13px] ${post.pinned ? 'font-bold text-[#1F2328]' : 'text-[#1F2328]'}`}
                >
                  {post.title}
                </span>
                {post.hasAttachment && <AttachmentIcon />}
                <span className="flex-shrink-0 text-[12px] text-[#9AA0A6] hidden sm:inline">
                  {post.authorName ?? '학교'}
                </span>
                <span className="flex-shrink-0 text-[12px] text-[#9AA0A6] w-20 text-right">
                  {post.publishedAt ? formatDate(post.publishedAt) : ''}
                </span>
              </button>
            ))}
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

      <NoticeDetailDrawer postId={openPostId} onClose={() => setOpenPostId(null)} />
    </div>
  );
}
