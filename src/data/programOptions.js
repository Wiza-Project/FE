/**
 * 비교과 프로그램 등록 폼(ProgramForm.jsx)에서 쓰는 드롭다운 옵션.
 *
 * 백엔드는 operatingUnitCodeId/programTypeCodeId/mileagePolicyId를 공통코드·
 * 마스터 테이블 FK로 받지만, 아직 그 목록을 조회하는 API가 없어 임시로
 * 하드코딩한 목업 옵션이다. 공통코드 조회 API가 준비되면 이 파일을 지우고
 * react-query로 교체하세요.
 *
 * competencyId(연계 핵심역량)는 GET /api/admin/programs/competencies로 실제
 * 연동됐다 — src/api/programs.js의 fetchCompetencyOptions 참고.
 */

// 운영 단위 (operatingUnitCodeId)
export const OPERATING_UNIT_OPTIONS = [
  { id: 1, label: '학생처' },
  { id: 2, label: '국제교류원' },
  { id: 3, label: '취업지원팀' },
  { id: 4, label: '학생상담센터' },
  { id: 5, label: '창업지원단' },
  { id: 6, label: '도서관' },
  { id: 7, label: '교양교육원' },
];

// 프로그램 분류 (programTypeCodeId)
export const PROGRAM_TYPE_OPTIONS = [
  { id: 1, label: '학습' },
  { id: 2, label: '진로' },
  { id: 3, label: '취업' },
  { id: 4, label: '리더십' },
  { id: 5, label: '글로벌' },
  { id: 6, label: '봉사' },
  { id: 7, label: '창업' },
  { id: 8, label: '문화' },
];

// 마일리지 정책 (mileagePolicyId, optional)
export const MILEAGE_POLICY_OPTIONS = [
  { id: 1, label: '2026-v1 기본 정책' },
  { id: 2, label: '글로벌 프로그램 가산 정책' },
  { id: 3, label: '봉사활동 연계 정책' },
];
