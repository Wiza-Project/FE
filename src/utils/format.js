/**
 * 채용공고 제목에서 관리용 넘버링 패턴을 제거하여 학생 화면용으로 정제
 * 예: '[서울] 백엔드 개발자 (No.1005)' -> '[서울] 백엔드 개발자'
 * 예: '피드 백엔드 API 개발자 (채용 No.2007)' -> '피드 백엔드 API 개발자'
 */
export function cleanJobTitle(title) {
  if (!title) return '채용공고';
  return title.replace(/\s*\([^)]*No[^)]*\)/gi, '').trim();
}