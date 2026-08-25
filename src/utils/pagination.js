/**
 * 백엔드가 한 번에 내려주는 최대 size에 상관없이, totalPages를 보고 끝까지
 * 순회하며 모든 페이지의 content를 모아 반환한다.
 * @param {(params: { page: number, size: number }) => Promise<{content: object[], totalPages?: number}>} fetchPage
 * @param {{ size?: number }} [options]
 * @returns {Promise<object[]>}
 */
export async function fetchAllPages(fetchPage, { size = 100 } = {}) {
  let page = 0;
  let all = [];
  let totalPages = 1;
  do {
    const res = await fetchPage({ page, size });
    all = all.concat(res.content ?? []);
    totalPages = res.totalPages ?? 1;
    page += 1;
  } while (page < totalPages);
  return all;
}
