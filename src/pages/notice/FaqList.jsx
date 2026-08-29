import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input, Button, Pagination, EmptyState } from '@/components/common';
import { fetchBoardPosts, fetchBoardPost, fetchFaqCategories } from '@/api/boards';
import { ApiError } from '@/api/client';

const BOARD_CODE = 'FAQ';
const PAGE_SIZE = 10;
const ACCENT = '#6B7280';

function getErrorMessage(error, fallback) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  return error.message || fallback;
}

/** categoryCode 기준 필터 칩. Chips 공용 컴포넌트는 문자열 옵션만 받아
 * id·label이 다를 수 있는 카테고리 필터에는 맞지 않아 같은 톤으로 로컬 구현했다. */
function CategoryChips({ categories, value, onChange }) {
  const options = [{ categoryCode: '', categoryName: '전체' }, ...categories];
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((c) => {
        const active = value === c.categoryCode;
        return (
          <button
            key={c.categoryCode || 'all'}
            onClick={() => onChange(c.categoryCode)}
            aria-pressed={active}
            className={`px-3 py-1 rounded-[999px] text-[12px] font-semibold transition-colors border ${active ? 'text-white border-transparent' : 'bg-white border-[#E5E7EB] text-[#656D76] hover:border-[#6B7280] hover:text-[#374151]'}`}
            style={active ? { background: ACCENT, borderColor: ACCENT } : {}}
          >
            {c.categoryName}
          </button>
        );
      })}
    </div>
  );
}

function FaqAccordionItem({ post, open, onToggle }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['boardPost', BOARD_CODE, post.postId],
    queryFn: () => fetchBoardPost(BOARD_CODE, post.postId),
    enabled: open,
  });

  return (
    <div className="border-b border-[#F3F4F6] last:border-0">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#F9FAFB] transition-colors"
      >
        <span
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black text-white"
          style={{ background: ACCENT }}
        >
          Q
        </span>
        {post.categoryName && (
          <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76]">
            {post.categoryName}
          </span>
        )}
        <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-[#1F2328]">
          {post.title}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="#9AA0A6"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pl-12">
          {isLoading && (
            <div className="flex flex-col gap-2">
              <div className="h-3 w-full bg-[#F3F4F6] rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-[#F3F4F6] rounded animate-pulse" />
            </div>
          )}
          {isError && (
            <p className="text-[12px] text-[#CF222E]">
              {getErrorMessage(error, '답변을 불러오지 못했습니다.')}
            </p>
          )}
          {!isLoading && !isError && data && (
            <div className="flex items-start gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black"
                style={{ color: ACCENT, background: '#F3F4F6' }}
              >
                A
              </span>
              <p className="flex-1 text-[13px] text-[#444D56] whitespace-pre-wrap leading-relaxed">
                {data.content}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 학생용 FAQ 탭: 카테고리 필터 칩 + 키워드 검색 + 아코디언(질문/답변). Q&A 관련 UI는 없다. */
export default function FaqList() {
  const [categoryCode, setCategoryCode] = useState('');
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);

  const {
    data: categories = [],
    isError: categoriesErrored,
  } = useQuery({
    queryKey: ['faqCategories'],
    queryFn: fetchFaqCategories,
  });
  const activeCategories = categories.filter((c) => c.active !== false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['boardPosts', BOARD_CODE, { keyword: submittedKeyword, categoryCode, page }],
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
      <div className="mb-4">
        {categoriesErrored ? (
          <p className="text-[12px] text-[#9AA0A6]">카테고리 목록을 불러오지 못했습니다.</p>
        ) : (
          <CategoryChips
            categories={activeCategories}
            value={categoryCode}
            onChange={(code) => {
              setCategoryCode(code);
              setPage(1);
            }}
          />
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
        <Button size="md" onClick={runSearch} style={{ background: ACCENT }}>
          검색
        </Button>
      </div>

      {isLoading && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 bg-[#F3F4F6] rounded animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-12 text-center text-[13px] text-[#CF222E]">
          {getErrorMessage(error, 'FAQ 목록을 불러오지 못했습니다.')}
        </div>
      )}

      {!isLoading && !isError && posts.length === 0 && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] py-12">
          <EmptyState message="등록된 FAQ가 없습니다." sub="다른 검색어나 카테고리를 선택해 보세요." />
        </div>
      )}

      {!isLoading && !isError && posts.length > 0 && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {posts.map((post) => (
            <FaqAccordionItem
              key={post.postId}
              post={post}
              open={openId === post.postId}
              onToggle={() => setOpenId((prev) => (prev === post.postId ? null : post.postId))}
            />
          ))}

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
    </div>
  );
}
