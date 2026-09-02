/** 백엔드 SEMESTER 공통코드(CommonCodeSeeder)와 동일한 표기. */
export const SEMESTER_LABELS = {
  SPRING: '1학기',
  SUMMER: '여름학기',
  FALL: '2학기',
  WINTER: '겨울학기',
};

/**
 * 1학기: 3/2 ~ 8/31, 2학기: 9/1 ~ (다음해) 3/1.
 * "현재 학기 자동 판별" 백엔드 API가 없어 날짜 기준으로 계산한다.
 */
export function resolveCurrentAcademicPeriod(now = new Date()) {
  const year = now.getFullYear();
  const monthDay = (now.getMonth() + 1) * 100 + now.getDate();

  if (monthDay >= 302 && monthDay <= 831) {
    return { academicYear: year, semesterCode: 'SPRING' };
  }
  if (monthDay >= 901) {
    return { academicYear: year, semesterCode: 'FALL' };
  }
  // 1/1 ~ 3/1은 전년도 2학기에 속한다.
  return { academicYear: year - 1, semesterCode: 'FALL' };
}
