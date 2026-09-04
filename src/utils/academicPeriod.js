/** 백엔드 SEMESTER 공통코드(CommonCodeSeeder)와 동일한 표기. */
export const SEMESTER_LABELS = {
  SPRING: '1학기',
  SUMMER: '여름학기',
  FALL: '2학기',
  WINTER: '겨울학기',
};

/**
 * @param {string|null|undefined} code
 * @param {{ allLabel?: string, emptyLabel?: string }} [options]
 *   allLabel   - code === 'ALL'일 때 사용할 라벨 (미지정 시 코드를 그대로 통과)
 *   emptyLabel - code가 falsy일 때 사용할 라벨 (미지정 시 code를 그대로 반환)
 */
export function formatSemester(code, { allLabel, emptyLabel } = {}) {
  if (!code) return emptyLabel !== undefined ? emptyLabel : code;
  if (code === 'ALL' && allLabel !== undefined) return allLabel;
  return SEMESTER_LABELS[code] ?? code;
}
