/**
 * 비교과 프로그램 등록 폼(ProgramForm.jsx)에서 쓰는 드롭다운 옵션.
 *
 * 백엔드는 mileagePolicyId를 공통코드·마스터 테이블 FK로 받지만, 아직 그
 * 목록을 조회하는 API가 없어 임시로 하드코딩한 목업 옵션이다. 공통코드
 * 조회 API가 준비되면 이 파일을 지우고 react-query로 교체하세요.
 *
 * competencyId(연계 핵심역량)는 GET /api/admin/competencies로 실제
 * 연동됐다 — src/api/programs.js의 fetchCompetencyOptions 참고.
 *
 * operatingUnitCodeId(운영부서)/programTypeCodeId(비교과 분류)는 화면에
 * 노출되는 선택 UI가 없어 여기서 관리하지 않는다 — 값은 백엔드 default에
 * 위임한다. src/pages/staff/extracurr/ProgramForm.jsx의 buildPayload 참고.
 */

// 마일리지 정책 (mileagePolicyId, optional)
export const MILEAGE_POLICY_OPTIONS = [
  { id: 1, label: '2026-v1 기본 정책' },
  { id: 2, label: '글로벌 프로그램 가산 정책' },
  { id: 3, label: '봉사활동 연계 정책' },
];
