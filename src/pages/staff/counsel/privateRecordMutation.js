// mutation 응답은 요청 당시 화면의 콜백으로 늦게 실행될 수 있으므로, 현재 열린 회기와
// 비공개 영역이 아직 유효할 때만 화면·캐시 반영을 허용한다.
export function shouldApplyPrivateRecordMutationSuccess({
  isMounted,
  requestSessionId,
  detailSessionId,
  privateRecordOpen,
}) {
  return isMounted && requestSessionId === detailSessionId && privateRecordOpen;
}

// setQueryData는 대상 Query가 없으면 새 캐시를 만들 수 있다. 이미 열람 중인 Query만 갱신해
// 회기 전환·모달 닫힘 뒤 늦게 도착한 비공개 원문이 새 캐시로 남지 않게 한다.
export function updatePrivateRecordQueryIfPresent(queryClient, queryKey, data) {
  const query = queryClient.getQueryCache().find({ queryKey, exact: true });

  if (!query) return false;

  queryClient.setQueryData(queryKey, data);
  return true;
}

// 회기 전환 직후 이전 Query 데이터가 잠시 보이더라도 현재 회기의 응답만 textarea에 seed한다.
// seeded가 true이면 충돌 재조회가 사용자가 입력 중인 값을 덮어쓰지 않도록 건너뛴다.
export function getPrivateRecordSeed({
  privateRecordOpen,
  privateRecord,
  detailSessionId,
  seeded,
}) {
  if (!privateRecordOpen || !privateRecord || privateRecord.sessionId !== detailSessionId || seeded)
    return undefined;

  return privateRecord.privateContent ?? '';
}
