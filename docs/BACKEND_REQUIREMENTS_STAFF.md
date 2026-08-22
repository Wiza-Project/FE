# 백엔드 요구사항 — 비교과 프로그램(교직원) 영역

WP-86(교직원 FE-BE 연동) 작업 중 `C:\project\BE` 소스코드를 직접 확인해 정리한, 비교과 프로그램 관리 화면에 필요하지만 아직 백엔드에 없는 API 목록입니다. 로컬 백엔드가 기동되어 있지 않아 Swagger로 실시간 확인은 하지 못했고, 컨트롤러/DTO/엔티티 코드를 grep하여 확인한 결과입니다 — 실제 배포된 스펙과 다를 수 있으니 착수 전 재확인을 권장합니다.

## 1. 프로그램 단건조회 `GET /admin/programs/{programId}`

**현재 상태**: 없음. `ProgramController`에는 목록(`GET /admin/programs`)·등록(`POST`)·수정(`PUT`)·삭제(`DELETE`)만 있고 단건조회가 없습니다.

**필요한 이유**: 프로그램 수정 폼을 프리필하려면 `description`, `competencyId`, `mileagePolicyId`, `operatingUnitCodeId`, `programTypeCodeId`, `fileGroupId` 등 목록 API가 내려주지 않는 필드가 필요합니다. 목록 API(`ProgramAdminListItemResponseDTO`)는 `operatingUnitCodeName`, `programTypeCodeName` 같은 라벨만 주고 원본 코드ID나 설명/역량/마일리지 정보를 주지 않아, 이 API 없이는 수정 폼을 안전하게 채울 수 없습니다. **현재 FE는 이 API가 없어 프로그램 수정 기능 자체를 비활성화한 상태입니다.**

**제안 응답 형태**: `ProgramUpdateRequestDTO`와 동일한 필드 + `programId`, `programStatus`를 포함한 `ProgramDetailResponseDTO`.

## 2. 프로그램 대기열 승격/제외, 모집마감 액션 API

**현재 상태**: 없음. 신청 목록(`ProgramApplicationAdminListItemResponseDTO`)에 `waitlistOrder` 필드는 있어 대기 순번 조회는 가능하지만, 대기자를 승격시키거나 대기열에서 제외하는 전용 액션, 그리고 모집을 조기 마감하는 액션 엔드포인트가 없습니다.

**제안**:
- `POST /admin/programs/{programId}/applications/{applicationId}/promote` — 대기자를 승인으로 전환
- `DELETE /admin/programs/{programId}/applications/{applicationId}/waitlist` 또는 유사한 제외 액션
- `PATCH /admin/programs/{programId}/close-recruitment` — 모집 조기 마감 (또는 기존 `PUT` 수정 API가 상태 전이를 허용하는지 확인)

## 3. 참여현황: 학과/학년/자격검증 필드

**현재 상태**: `GET /admin/programs/{programId}/applications` 응답에 `studentId, studentName, studentNo, applicationStatus, waitlistOrder, appliedAt, processedAt, completionStatus, certificateNo`만 있고 학과·학년·신청 자격 검증 결과(학년 미달, 선수요건 미충족, 중복신청 등) 필드가 없습니다.

**필요한 이유**: 신청심사 화면에서 담당자가 학과/학년으로 필터링하거나 자격요건을 한눈에 확인하지 못합니다.

**제안**: 응답 DTO에 `studentDepartmentName`, `studentGrade`, `eligibilityStatus`(또는 유사 필드) 추가, 혹은 학생 프로필과 조인한 별도 필드 세트.

## 4. 신청심사/참여현황 엑셀 다운로드 API

**현재 상태**: 전무. 레포 전체에 Apache POI 등 엑셀 생성 코드가 없습니다(`downloadFile()` 헬퍼는 FE에 이미 있어 백엔드가 blob만 내려주면 바로 연동 가능).

**제안**: `GET /admin/programs/{programId}/applications/excel` — 현재 필터 조건을 쿼리 파라미터로 받아 xlsx blob 응답.

## 5. 출결관리: 회차 목록 응답 형태 확인 + QR 체크인

**현재 상태**: 세션(회차) 단위 출결 조회/수정은 이미 존재합니다(`ProgramSessionAdminController`: `GET/POST .../sessions`, `ProgramAttendanceAdminController`: `GET/PUT .../sessions/{sessionId}/attendances`). 다만 QR 코드를 발급해 학생이 스캔하면 자동 출석 처리되는 기능은 전무합니다.

**필요한 이유**: 현재 FE 화면은 QR 출석 기능을 제거하고 수동 출결 그리드만 유지 중입니다. 회차 기반으로 화면을 재설계하려면 세션 목록 응답 필드(세션 회차 번호, 일시 등)를 먼저 확인해야 합니다.

**제안** (QR 기능을 실제로 만들 경우):
- `POST /admin/programs/{programId}/sessions/{sessionId}/checkin-code` — 만료시간이 있는 체크인 코드 발급
- `POST /students/programs/{programId}/sessions/{sessionId}/checkin` — 학생이 코드를 스캔해 본인 출석 등록 (학생용 엔드포인트)

## 6. 결과등록·이수판정

**정정(백엔드 담당자 확인)**: 수료/미수료를 수동으로 확정하는 액션 API는 **필요 없고 만들 계획도 없음**. `ProgramStatusScheduler`가 매분 실행되며 프로그램 운영종료 시각이 지나면 출석률과 프로그램별 이수 기준(`completion_rate`)을 비교해 자동으로 `COMPLETED`/`FAILED`를 확정한다. 판정 결과는 이미 다음 응답에 포함되어 내려온다:
- 학생용 내 신청내역(`ProgramApplicationSummaryResponseDTO`): `completionStatus`, `certificateNo`, `certificateIssuedAt`
- 관리자용 신청자 목록(`ProgramApplicationAdminListItemResponseDTO`): `completionStatus`, `certificateNo`

→ FE는 별도 "확정" API 호출 없이 이 목록 조회 응답의 필드를 그대로 표시하면 된다.

**이수증**: PDF 파일로 만들 계획이 아니므로 별도 발급 API는 필요 없다. 서버가 이수 확정 시 채번하는 `certificateNo` 문자열이 곧 이수증이며, FE는 이 값이 있으면 "이수증 발급됨"으로 표시하기만 하면 된다.

**완료**: ParticipationPage의 ③ 결과등록·이수판정 탭은 신청자 목록 API의 `completionStatus`/`certificateNo` 필드를 그대로 읽어 실제 판정 결과와 이수증 발급 여부를 표시하도록 연동했다(수동 확정 UI, 발급 버튼 모두 제거).

---

첨부파일 업로드(`FileGroup`/`StoredFile`) API는 공통코드 담당자가 별도로 구현 중이라 이 문서에서는 제외했습니다. 완료되면 프로그램 등록/수정 폼의 `fileGroupId` 연동을 추가로 진행하면 됩니다.
