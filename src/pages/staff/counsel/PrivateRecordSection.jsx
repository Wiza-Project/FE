import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, ConfirmDialog, toast } from '@/components/common';
import { ApiError } from '@/api/client';
import {
  confirmCounselingPrivateRecord,
  counselingPrivateRecordQueryKey,
  fetchCounselingPrivateRecord,
  saveCounselingPrivateRecord,
} from '@/api/counsel';
import { COUNSELING_PRIVATE_RECORD_STATUS, COUNSELING_SESSION_ERROR_CODE } from '@/constants/domain';
import { formatKstDateTime } from './staffCounselingDate';
import {
  getPrivateRecordSeed,
  shouldApplyPrivateRecordMutationSuccess,
  updatePrivateRecordQueryIfPresent,
} from './privateRecordMutation';

// 비공개 기록 원문 최대 길이 — BE 검증(1~10,000자)과 동일한 안내용 상한. 최종 경계는 서버가 정한다.
const PRIVATE_RECORD_MAX_LENGTH = 10000;

function getPrivateRecordErrorMessage(error) {
  if (!(error instanceof ApiError))
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  const { code } = error;
  if (code === COUNSELING_SESSION_ERROR_CODE.UNAUTHENTICATED)
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  if (code === COUNSELING_SESSION_ERROR_CODE.FORBIDDEN)
    return '이 회기의 비공개 기록에 접근할 권한이 없습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.SESSION_NOT_FOUND)
    return '해당 회기의 비공개 기록을 찾을 수 없습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.CONFLICT)
    return '상담 상태가 바뀌었습니다. 최신 정보를 다시 불러왔습니다.';
  if (code === COUNSELING_SESSION_ERROR_CODE.INVALID_INPUT)
    return error.message || '입력값을 다시 확인해 주세요.';
  return error.message || '처리 중 오류가 발생했습니다.';
}

/**
 * 상세 모달 안에서 렌더링하지만 비공개 기록의 열람·입력·저장·확정과 원문 캐시 수명주기는
 * 스스로 소유한다. 사용자가 '비공개 기록 열기'를 누르기 전에는 전용 GET을 호출하지 않는다.
 * 저장·확정 pending 여부만 onPendingChange(boolean)로 바깥 상세 모달에 알려 닫기 차단에 쓴다.
 */
export default function PrivateRecordSection({ sessionId, onPendingChange }) {
  const queryClient = useQueryClient();

  const [privateRecordOpen, setPrivateRecordOpen] = useState(false);
  const [privateContentInput, setPrivateContentInput] = useState('');
  const [privateRecordFormError, setPrivateRecordFormError] = useState('');
  const [confirmPrivateRecordOpen, setConfirmPrivateRecordOpen] = useState(false);
  // 서버에서 처음 받아온 초안으로 textarea를 한 번만 채운다. 이후 재조회(예: 충돌 재검증)에서
  // 값이 갱신돼도 사용자가 입력 중인 텍스트를 덮어쓰지 않기 위한 플래그다.
  const privateContentSeededRef = useRef(false);
  // mutation 성공 콜백은 요청 당시 렌더의 클로저를 사용할 수 있으므로, 회기 전환·영역 닫힘
  // 이후에도 콜백이 현재 화면 상태를 읽도록 최신 값을 ref에 보관한다.
  const privateRecordViewRef = useRef({ detailSessionId: null, privateRecordOpen: false });
  privateRecordViewRef.current.detailSessionId = sessionId;
  privateRecordViewRef.current.privateRecordOpen = privateRecordOpen;
  const previousDetailSessionIdRef = useRef(null);
  // useMutation({ onSuccess })에 준 콜백은 이 컴포넌트가 언마운트된 뒤에도 실행된다(TanStack
  // Query가 컴포넌트 생명주기와 무관하게 mutation을 완주시키기 때문). 이미 언마운트된 뒤 늦게
  // 도착한 응답이 setQueryData로 캐시를 새로 만들면, 그 새 엔트리는 이 화면이 useQuery에 준
  // gcTime: 0을 못 받고(setQueryData 인자에 안 실림) 기본 gcTime(5분)으로 생성돼 비공개
  // 원문이 그만큼 남는다. 이 플래그로 그 시점을 판별해 캐시 쓰기만 건너뛴다.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 사용자가 명시적으로 연 회기(sessionId)에 한해서만 전용 GET을 호출한다.
  // gcTime: 0 — 이 쿼리를 관찰하는 컴포넌트가 사라지는 즉시 캐시에서 제거한다. 닫기 핸들러의
  // removeQueries가 닿지 못하는 경로(닫지 않고 다른 메뉴로 이동해 화면이 언마운트되는 경우)에서도
  // 비공개 원문이 기본 gcTime(5분) 동안 캐시에 남지 않게 한다. 원문은 매번 명시적으로 다시 조회한다.
  const {
    data: privateRecord,
    isLoading: privateRecordLoading,
    isError: privateRecordIsError,
    error: privateRecordError,
  } = useQuery({
    queryKey: counselingPrivateRecordQueryKey(sessionId),
    queryFn: () => fetchCounselingPrivateRecord(sessionId),
    enabled: privateRecordOpen && sessionId !== null,
    gcTime: 0,
    retry: false,
  });

  // 서버 초안을 최초 1회만 textarea에 반영한다(위 privateContentSeededRef 설명 참고).
  // 이 effect는 seed effect보다 먼저 실행되어야 한다. B query data가 이미 준비돼도 A의
  // seeded 상태를 먼저 비워 B 원문을 textarea에 넣고, 이전 회기의 민감한 query를 제거한다.
  useEffect(() => {
    const previousSessionId = previousDetailSessionIdRef.current;

    if (previousSessionId !== null && previousSessionId !== sessionId) {
      queryClient.removeQueries({ queryKey: counselingPrivateRecordQueryKey(previousSessionId) });
    }

    if (previousSessionId !== sessionId) {
      setPrivateContentInput('');
      setPrivateRecordFormError('');
      setConfirmPrivateRecordOpen(false);
      privateContentSeededRef.current = false;
    }

    previousDetailSessionIdRef.current = sessionId;
  }, [sessionId, queryClient]);

  useEffect(() => {
    const privateRecordSeed = getPrivateRecordSeed({
      privateRecordOpen,
      privateRecord,
      detailSessionId: sessionId,
      seeded: privateContentSeededRef.current,
    });

    if (privateRecordSeed !== undefined) {
      setPrivateContentInput(privateRecordSeed);
      privateContentSeededRef.current = true;
    }
  }, [sessionId, privateRecordOpen, privateRecord]);

  // 비공개 기록 영역만 닫는다(상세 모달은 유지). 캐시와 로컬 입력값을 함께 지워
  // 다음에 다시 열었을 때 이전 세션의 원문이 잠깐이라도 남아있지 않게 한다.
  const closePrivateRecord = () => {
    if (sessionId !== null) {
      queryClient.removeQueries({ queryKey: counselingPrivateRecordQueryKey(sessionId) });
    }
    setPrivateRecordOpen(false);
    setPrivateContentInput('');
    setPrivateRecordFormError('');
    setConfirmPrivateRecordOpen(false);
    privateContentSeededRef.current = false;
  };

  const openPrivateRecord = () => {
    privateContentSeededRef.current = false;
    setPrivateRecordFormError('');
    setPrivateRecordOpen(true);
  };

  // [회귀 방지 불변식] 회기 A의 저장·확정 요청이 응답하는 시점에 사용자가 이미 회기 B를 열어
  // 두었다면(A 요청 중 footer 닫기는 막혀 있지만, 응답 자체가 늦게 온 경우까지 이중으로 방어),
  // A의 응답은 B의 화면(입력값·토스트·모달)을 절대 건드리면 안 된다. 이 함수 하나가 그 판정을
  // 전담하므로, 아래 두 mutation의 어떤 콜백이든 "화면을 바꾸기 전에 반드시 이 함수를 거쳤는가"만
  // 코드를 읽어 확인하면 이 불변식이 지켜지는지 정적으로 검증할 수 있다.
  // Query 캐시도 현재 열린 회기와 비공개 영역이 유효한 경우에만 갱신한다.
  const isPrivateRecordScreenFor = (requestSessionId) =>
    shouldApplyPrivateRecordMutationSuccess({
      isMounted: isMountedRef.current,
      requestSessionId,
      ...privateRecordViewRef.current,
    });

  // 비공개 기록 저장·확정 오류를 공통 분기한다. requestSessionId는 이 오류를 낸 요청이 대상으로
  // 삼은 회기다(최신 sessionId가 아니라 요청 변수에서 받는다).
  // S009(충돌)는 사용자 실수가 아니라 서버 상태가 바뀐 것이므로 최신 canSaveDraft/canConfirm/
  // recordStatus만 다시 받아오고 로컬 입력은 지우지 않는다. 권한·존재 오류는 영역을 닫는다.
  const onPrivateRecordMutationError = (mutationError, requestSessionId) => {
    // 캐시 무효화는 요청 회기 기준이라 지금 어떤 회기가 열려 있든 안전하다.
    // 반면 토스트·영역 닫기 같은 화면 조작은 isPrivateRecordScreenFor를 거친 뒤에만 한다.
    if (mutationError instanceof ApiError && mutationError.code === COUNSELING_SESSION_ERROR_CODE.CONFLICT) {
      queryClient.invalidateQueries({ queryKey: counselingPrivateRecordQueryKey(requestSessionId) });
      if (isPrivateRecordScreenFor(requestSessionId)) {
        toast(getPrivateRecordErrorMessage(mutationError), 'error');
      }
      return;
    }
    if (
      mutationError instanceof ApiError &&
      (mutationError.code === COUNSELING_SESSION_ERROR_CODE.FORBIDDEN ||
        mutationError.code === COUNSELING_SESSION_ERROR_CODE.SESSION_NOT_FOUND ||
        mutationError.code === COUNSELING_SESSION_ERROR_CODE.UNAUTHENTICATED)
    ) {
      if (isPrivateRecordScreenFor(requestSessionId)) {
        toast(getPrivateRecordErrorMessage(mutationError), 'error');
        closePrivateRecord();
      }
      return;
    }
    if (isPrivateRecordScreenFor(requestSessionId)) {
      setPrivateRecordFormError(getPrivateRecordErrorMessage(mutationError));
    }
  };

  const savePrivateRecordMutation = useMutation({
    mutationFn: ({ sessionId: targetSessionId, privateContent }) =>
      saveCounselingPrivateRecord(targetSessionId, { privateContent }),
    // 캐시는 요청이 대상으로 한 sessionId(variables.sessionId)에 귀속한다. 최신 클로저
    // sessionId를 쓰면 늦은 응답이 지금 열린 다른 회기 캐시를 덮어쓸 수 있다.
    onSuccess: (data, { sessionId: targetSessionId }) => {
      // 회기 목록·상세 캐시는 건드리지 않는다(원문이 섞이지 않아야 한다). 비공개 query만 갱신한다.
      // 언마운트 후에는 쓰지 않는다 — isMountedRef 선언부 주석 참고(gcTime: 0을 못 받는 새
      // 엔트리가 생겨 원문이 기본 gcTime(5분)만큼 캐시에 남는 것을 막는다).
      if (!isPrivateRecordScreenFor(targetSessionId)) return;

      const queryUpdated = updatePrivateRecordQueryIfPresent(
        queryClient,
        counselingPrivateRecordQueryKey(targetSessionId),
        data,
      );

      if (!queryUpdated) return;
      setPrivateContentInput(data.privateContent ?? '');
      toast('비공개 기록을 임시저장했습니다.', 'success');
    },
    onError: (mutationError, { sessionId: targetSessionId }) =>
      onPrivateRecordMutationError(mutationError, targetSessionId),
  });

  const confirmPrivateRecordMutation = useMutation({
    // 확정 요청 변수는 sessionId 스칼라 하나다(저장과 시그니처가 다르다).
    mutationFn: (targetSessionId) => confirmCounselingPrivateRecord(targetSessionId),
    onSuccess: (data, targetSessionId) => {
      // 언마운트 후에는 쓰지 않는다 — savePrivateRecordMutation.onSuccess와 같은 이유.
      if (!isPrivateRecordScreenFor(targetSessionId)) return;

      const queryUpdated = updatePrivateRecordQueryIfPresent(
        queryClient,
        counselingPrivateRecordQueryKey(targetSessionId),
        data,
      );

      if (!queryUpdated) return;
      setConfirmPrivateRecordOpen(false);
      toast('비공개 기록을 확정했습니다.', 'success');
    },
    onError: (mutationError, targetSessionId) => {
      if (isPrivateRecordScreenFor(targetSessionId)) {
        setConfirmPrivateRecordOpen(false);
      }
      onPrivateRecordMutationError(mutationError, targetSessionId);
    },
  });

  const submitSavePrivateRecord = () => {
    const trimmed = privateContentInput.trim();
    if (!trimmed) {
      setPrivateRecordFormError('비공개 기록 원문을 입력해 주세요.');
      return;
    }
    if (trimmed.length > PRIVATE_RECORD_MAX_LENGTH) {
      setPrivateRecordFormError('비공개 기록은 10,000자 이내로 입력해 주세요.');
      return;
    }
    setPrivateRecordFormError('');
    savePrivateRecordMutation.mutate({ sessionId, privateContent: trimmed });
  };

  const isPending = savePrivateRecordMutation.isPending || confirmPrivateRecordMutation.isPending;

  useEffect(() => {
    onPendingChange(isPending);
    return () => onPendingChange(false);
  }, [isPending, onPendingChange]);

  return (
    <>
      {/* 비공개 상담 기록 — 버튼을 눌러야만 전용 GET이 나간다(3.6절 명시적 열람 경계). */}
      <div className="border-t border-[#E5E7EB] pt-3">
        {!privateRecordOpen ? (
          <Button variant="outline" size="sm" onClick={openPrivateRecord}>
            비공개 기록 열기
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#656D76]">비공개 상담 기록</span>
              <button
                type="button"
                onClick={closePrivateRecord}
                disabled={savePrivateRecordMutation.isPending || confirmPrivateRecordMutation.isPending}
                className="text-[10px] text-[#9AA0A6] hover:text-[#374151] disabled:opacity-50"
              >
                닫기
              </button>
            </div>

            {privateRecordLoading ? (
              <p className="text-center text-[12px] text-[#656D76] py-3">
                불러오는 중입니다.
              </p>
            ) : privateRecordIsError ? (
              <p className="text-[12px] text-[#CF222E]" role="alert">
                {getPrivateRecordErrorMessage(privateRecordError)}
              </p>
            ) : !privateRecord ? null : privateRecord.recordStatus ===
              COUNSELING_PRIVATE_RECORD_STATUS.CONFIRMED ? (
              <div className="p-3 rounded-[8px] bg-[#F0FDF4] border border-[#BBF7D0]">
                <p className="text-[10px] font-semibold text-[#166534] mb-1">
                  확정됨 · {formatKstDateTime(privateRecord.confirmedAt)}
                </p>
                {/* dangerouslySetInnerHTML 금지 — 줄바꿈은 CSS로만 보존한다 */}
                <p className="text-[12px] text-[#1F2328] whitespace-pre-wrap">
                  {privateRecord.privateContent}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="privateContentInput"
                  className="block text-[11px] font-semibold text-[#656D76]"
                >
                  비공개 기록 원문 <span className="text-[#CF222E]">*</span>
                </label>
                <textarea
                  id="privateContentInput"
                  value={privateContentInput}
                  onChange={(e) => setPrivateContentInput(e.target.value)}
                  rows={6}
                  maxLength={PRIVATE_RECORD_MAX_LENGTH}
                  placeholder="담당 상담사만 볼 수 있는 비공개 상담 기록을 입력하세요."
                  disabled={savePrivateRecordMutation.isPending}
                  aria-invalid={!!privateRecordFormError}
                  aria-describedby={privateRecordFormError ? 'privateRecordFormError' : undefined}
                  className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151]"
                />
                <p className="text-[10px] text-[#9AA0A6] text-right">
                  {privateContentInput.length}/{PRIVATE_RECORD_MAX_LENGTH}자
                </p>
                {privateRecordFormError && (
                  <p
                    id="privateRecordFormError"
                    role="alert"
                    className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
                  >
                    ⚠ {privateRecordFormError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!privateRecord.canSaveDraft}
                    loading={savePrivateRecordMutation.isPending}
                    onClick={submitSavePrivateRecord}
                  >
                    임시저장
                  </Button>
                  <Button
                    size="sm"
                    // 저장 요청이 도는 동안 확정을 막는다. 확정은 원문을 받지 않고
                    // "지금 서버에 저장된 초안"을 그대로 확정하므로, 저장 완료 전에
                    // 확정이 먼저 처리되면 방금 입력한 내용이 아니라 그 이전 초안이
                    // 영구 확정되고(정정 기능 없음) 뒤이은 저장은 충돌로 실패한다.
                    // 반대 방향(확정 다이얼로그가 떠 있는 동안 저장 클릭)은 Modal의
                    // 풀스크린 backdrop이 저장 버튼을 가려 이미 막혀 있어 별도 처리가
                    // 필요 없다.
                    disabled={!privateRecord.canConfirm || savePrivateRecordMutation.isPending}
                    loading={confirmPrivateRecordMutation.isPending}
                    onClick={() => setConfirmPrivateRecordOpen(true)}
                  >
                    확정
                  </Button>
                </div>
                <p className="text-[10px] text-[#9AA0A6]">
                  저장·확정 가능 여부는 서버가 판단한 값을 그대로 따릅니다. 확정 후에는
                  수정할 수 없습니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 확정 확인 — 원문 없이 확정 여부만 다시 묻는다(본문에 원문을 재전송하지 않는다). */}
      <ConfirmDialog
        open={confirmPrivateRecordOpen}
        title="비공개 기록 확정"
        message="비공개 기록을 확정하시겠습니까? 확정 후에는 수정하거나 다시 확정할 수 없습니다."
        confirmLabel="확정"
        loading={confirmPrivateRecordMutation.isPending}
        onConfirm={() => confirmPrivateRecordMutation.mutate(sessionId)}
        onCancel={() => !confirmPrivateRecordMutation.isPending && setConfirmPrivateRecordOpen(false)}
      />
    </>
  );
}
