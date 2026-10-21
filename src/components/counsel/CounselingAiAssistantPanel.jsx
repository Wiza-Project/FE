import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestCounselingAiChat } from '@/api/counselAi';
import { createCounselingReservation, fetchAvailableSchedules } from '@/api/counsel';
import { ApiError } from '@/api/client';
import { Button, SkeletonLoader, toast } from '@/components/common';
import { useCounselingConsent } from '@/hooks/useCounselingConsent';
import { useAuthStore } from '@/stores/authStore';
import {
  COUNSELING_AI_ACTION,
  COUNSELING_RESERVATION_ERROR_CODE,
  COUNSELING_RESERVATION_STATUS_LABEL,
} from '@/constants/domain';
import { formatKstDateTime } from '@/utils/counselingDate';

const ACCENT = '#0891B2';
const MAX_CONTENT_LENGTH = 3000;
// 공통 client가 타임아웃·연결 끊김·본문 없는 응답을 모두 이 코드로 바꾼다(HTTP status는 남지 않는다).
const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

// 화면 안에서만 쓰는 진행 단계다(DB enum 아님). 확인 질문이 켜진 상태는 단계가 아니라
// 별도 값 awaitingConfirmation으로 표현한다.
const PHASE = {
  COLLECTING: 'COLLECTING',
  SUBMITTING: 'SUBMITTING',
  SUCCEEDED: 'SUCCEEDED',
  OUTCOME_UNKNOWN: 'OUTCOME_UNKNOWN',
};
// 동의 화면은 이 패널 안의 내부 단계다. 다른 컴포넌트로 전환하면 패널이 사라져 신청 내용이 날아가기 때문이다.
const VIEW = { MAIN: 'MAIN', CONSENT: 'CONSENT' };

// 채팅 흐름에 쌓이는 항목의 종류. 후보·추천·확인 카드도 모두 대화 안에서만 보여 준다.
const ITEM = {
  TEXT: 'TEXT',
  TYPE_RECOMMENDATION: 'TYPE_RECOMMENDATION',
  CANDIDATES: 'CANDIDATES',
  CONFIRMATION: 'CONFIRMATION',
};

const INITIAL_CARD = {
  // 초안(유형·일정·요약)이나 검색 조건이 바뀔 때마다 늘린다. 오래된 응답을 가려내는 기준이다.
  version: 0,
  typeId: null,
  scheduleId: null,
  // 확인 카드에 보여 줄 선택 일정 정보(후보 또는 재조회 결과). 없으면 일정 번호만 안다.
  selectedSchedule: null,
  // 서버가 누적해 준 신청 내용 요약. 학생이 직접 고칠 수 없고 서버 응답으로만 바뀐다.
  requestContent: '',
  // 서버가 준 후보(표시 순서 그대로, 최대 5개). 채팅의 번호(1~5)와 같은 순서다.
  candidates: [],
  typeRecommendation: null,
  filters: null,
  // 서버가 ASK_CONFIRMATION으로 현재 초안의 확인 카드를 띄운 뒤에만 true.
  // 학생이 채팅을 보내면 곧바로 false로 내린다(대화는 수정 요청일 수 있기 때문).
  awaitingConfirmation: false,
  // 지금 유효한 확인 카드의 번호. 이 번호가 아닌 카드는 "이전 확인 카드"로 버튼이 꺼진다.
  confirmationId: null,
  phase: PHASE.COLLECTING,
  view: VIEW.MAIN,
  // 모델 장애 등으로 챗봇 진행을 멈춘 상태. 일반 신청 화면 이동만 안내한다.
  chatStopped: false,
  reservation: null,
};

const INTRO_MESSAGE =
  '요즘 어떤 점이 고민인지 알려주세요. 고민에 맞는 상담 유형과 예약 가능한 일정을 안내하고, 대화로 신청 내용을 정리해 신청까지 도와 드릴게요.';

const SCHEDULE_GONE_MESSAGE =
  '선택한 일정이 마감되었거나 더 이상 신청할 수 없어요. 신청 내용은 그대로 두었으니, 원하는 다른 일정을 채팅으로 말씀해 주세요.';
const TYPE_GONE_MESSAGE =
  '선택한 상담 유형을 더 이상 신청할 수 없어요. 신청 내용은 그대로 두었으니, 원하는 상담 유형과 일정을 채팅으로 다시 말씀해 주세요.';
const RETRY_HINT = '신청 내용은 그대로 두었으니 잠시 후 "신청할게요"라고 말씀해 주세요.';

// 목록에서 초안과 같은 일정(scheduleId·유형 모두 일치)을 찾는다. 없으면 null이라 ?? 로 이어 쓸 수 있다.
const isSameScheduleTarget = (list, draft) =>
  list.find(
    (item) => item?.scheduleId === draft.scheduleId && item?.counselingTypeId === draft.typeId,
  ) ?? null;

// 유형·일정이 있고 신청 내용이 trim 후 1~3,000자여야 제출할 수 있다(서버도 같은 기준으로 다시 검증한다).
function isDraftComplete(card) {
  const contentLength = card.requestContent.trim().length;
  return (
    Boolean(card.typeId) &&
    Boolean(card.scheduleId) &&
    contentLength >= 1 &&
    contentLength <= MAX_CONTENT_LENGTH
  );
}

// 카드와 서버 응답의 draft를 같은 모양으로 맞춰 비교한다. 생략된(null) 필드는 없음으로 본다.
const draftOfCard = (card) => ({
  typeId: card.typeId,
  scheduleId: card.scheduleId,
  content: card.requestContent.trim(),
});
const draftOfResponse = (draft) => ({
  typeId: draft.counselingTypeId ?? null,
  scheduleId: draft.scheduleId ?? null,
  content: (draft.requestContent ?? '').trim(),
});
const isSameDraft = (a, b) =>
  a.typeId === b.typeId && a.scheduleId === b.scheduleId && a.content === b.content;

// 검색 조건을 순서·생략 여부와 상관없이 비교하려고 문자열로 만든다.
const filterKey = (filters) =>
  [filters?.dateFrom, filters?.dateTo, filters?.startTimeFrom, filters?.startTimeTo]
    .map((value) => value ?? '')
    .join('|');
const candidateKey = (candidates) =>
  candidates.map((item) => `${item.counselingTypeId}-${item.scheduleId}`).join(',');

// 서버에는 화면 문맥만 보낸다. 대화 원문 전체는 보내지 않는다(후보는 ID 쌍만).
// awaitingConfirmation은 화면 값이 아니라 "이번 메시지를 보내기 직전의 값"(sent.awaiting)을 받는다.
const buildContext = (card, awaitingConfirmation) => {
  const isEmpty =
    card.version === 0 &&
    !card.typeId &&
    !card.scheduleId &&
    !card.requestContent &&
    card.candidates.length === 0 &&
    !card.filters;
  if (isEmpty) {
    return null;
  }
  return {
    version: card.version,
    draft: {
      counselingTypeId: card.typeId,
      scheduleId: card.scheduleId,
      requestContent: card.requestContent.trim() || null,
    },
    candidates: card.candidates.slice(0, 5).map((candidate) => ({
      counselingTypeId: candidate.counselingTypeId,
      scheduleId: candidate.scheduleId,
    })),
    awaitingConfirmation,
    filters: card.filters,
  };
};

// 상담사·시간·장소 중 하나라도 다르면 학생이 확인한 카드와 다른 일정으로 본다.
const isSameScheduleInfo = (a, b) =>
  Boolean(a) &&
  a.counselorName === b.counselorName &&
  new Date(a.startsAt).getTime() === new Date(b.startsAt).getTime() &&
  new Date(a.endsAt).getTime() === new Date(b.endsAt).getTime() &&
  (a.location ?? null) === (b.location ?? null);

const formatKstRange = (schedule) =>
  `${formatKstDateTime(schedule.startsAt)} ~ ${formatKstDateTime(schedule.endsAt).slice(-5)}`;

const resolveTypeName = (card) => {
  if (!card.typeId) {
    return null;
  }
  return (
    (card.selectedSchedule?.counselingTypeId === card.typeId
      ? card.selectedSchedule.counselingTypeName
      : null) ??
    (card.typeRecommendation?.counselingTypeId === card.typeId
      ? card.typeRecommendation.typeName
      : null) ??
    card.candidates.find((candidate) => candidate.counselingTypeId === card.typeId)
      ?.counselingTypeName ??
    null
  );
};

/**
 * 상담 전 고민을 대화로 정리하고, 실제 예약 가능한 일정을 대화로 고른 뒤 읽기 전용 확인 카드로 신청까지 진행한다.
 * 신청 내용 요약은 서버 응답으로만 바뀌고 학생은 대화로 수정을 요청한다(직접 입력 칸 없음).
 * 상담 유형·일정은 대화 또는 채팅 안 최신 후보 카드를 눌러 고른다.
 * 버튼('이 내용으로 신청')과 자연어('신청할게요')는 모두 handleFinalSubmit 하나로 합쳐진다.
 * 대화·신청 내용은 이 컴포넌트의 메모리에만 있고 새로고침·화면 이동 시 사라진다(브라우저 저장소 사용 안 함).
 *
 * @param {Object} props
 * @param {() => void} props.onOpenApply 일반 상담 신청 화면으로 이동(일정 등 인자를 넘기지 않는다)
 * @param {() => void} props.onOpenMy 내 상담 화면으로 이동
 * @param {() => void} props.onBack
 */
export default function CounselingAiAssistantPanel({ onOpenApply, onOpenMy, onBack }) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const [card, setCard] = useState(INITIAL_CARD);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 0, kind: ITEM.TEXT, role: 'assistant', content: INTRO_MESSAGE },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // 비동기 응답이 돌아왔을 때는 그 시점의 렌더 값(state)이 낡아 있을 수 있다.
  // 그래서 "지금 실제 값"이 필요한 판단은 항상 ref로 한다.
  // cardRef는 card state와 항상 같은 값을 갖는다(updateCard가 둘을 함께 바꾼다).
  const cardRef = useRef(INITIAL_CARD);
  const mountedRef = useRef(false);
  const userIdRef = useRef(userId);
  // 채팅 요청 순번. 새 요청이나 제출이 시작되면 올려서 진행 중이던 이전 요청의 응답을 폐기한다.
  const chatSeqRef = useRef(0);
  // 제출 진행 중 여부. state는 다음 렌더가 되어야 바뀌므로 버튼 더블클릭·버튼과 자연어 동시 입력을
  // 막을 수 없다. ref는 즉시 바뀌므로 첫 await 전에 이것으로 막는다.
  const submissionRef = useRef(false);
  const focusRef = useRef(null);
  const messageInputRef = useRef(null);
  // 채팅 항목·확인 카드 번호를 만드는 카운터
  const itemIdRef = useRef(0);

  const consent = useCounselingConsent({ enabled: card.view === VIEW.CONSENT });
  const { refreshConsentState } = consent;

  // 예약 POST는 자동 재시도를 하지 않는다(재시도하면 같은 신청이 두 번 생길 수 있다).
  // 신청 내용(민감정보)이 mutation 캐시에 남지 않도록 gcTime 0과 reset을 함께 쓴다.
  const createReservationMutation = useMutation({
    mutationFn: createCounselingReservation,
    retry: false,
    gcTime: 0,
  });

  useEffect(() => {
    mountedRef.current = true;
    userIdRef.current = userId;
    return () => {
      // 언마운트나 계정 변경 뒤에 도착한 응답은 화면·캐시·토스트에 반영하지 않는다.
      mountedRef.current = false;
    };
  }, [userId]);

  const updateCard = (updater) => {
    const next = updater(cardRef.current);
    cardRef.current = next;
    setCard(next);
  };
  const nextItemId = () => {
    itemIdRef.current += 1;
    return itemIdRef.current;
  };
  const appendItem = (item) => {
    setMessages((previous) => [...previous, { id: nextItemId(), ...item }]);
  };
  const appendMessage = (role, content) => {
    appendItem({ kind: ITEM.TEXT, role, content });
  };
  const appendCandidates = (candidates) => {
    appendItem({ kind: ITEM.CANDIDATES, candidates });
  };

  // 가장 아래(최신) 후보 목록 항목. 번호는 이 목록 기준이라 나머지는 "이전 목록"으로 흐리게 표시한다.
  const latestCandidatesId = messages.findLast((item) => item.kind === ITEM.CANDIDATES)?.id ?? null;
  const isSettledPhase = card.phase === PHASE.SUCCEEDED || card.phase === PHASE.OUTCOME_UNKNOWN;
  // 제출 중·결과 확정·챗봇 중단 상태에서는 채팅과 확인 카드 버튼을 막는다.
  const isCardLocked = isCardLockedNow(card);

  // 단계가 바뀌었을 때 키보드·스크린리더 사용자가 결과를 놓치지 않도록 해당 제목·오류로 포커스를 옮긴다.
  const focusTarget =
    card.view === VIEW.CONSENT
      ? 'consent'
      : isSettledPhase
        ? 'result'
        : alertMessage
          ? 'alert'
          : null;
  useEffect(() => {
    if (focusTarget) {
      focusRef.current?.focus();
    }
  }, [focusTarget, alertMessage]);

  // 채팅 응답 처리가 끝났을 때 키보드 사용자가 바로 이어서 입력하도록 입력창으로 포커스를 돌려준다.
  // 오류·결과·동의 제목처럼 포커스를 받아야 할 다른 대상이 있거나 입력이 잠겼으면 빼앗지 않는다.
  // (요청만 해 두고 다음 렌더가 끝난 뒤에 판단해야 disabled가 풀린 입력창에 포커스가 들어간다.)
  const pendingInputFocusRef = useRef(false);
  const requestInputFocus = () => {
    pendingInputFocusRef.current = true;
  };
  useEffect(() => {
    if (!pendingInputFocusRef.current) {
      return;
    }
    pendingInputFocusRef.current = false;
    if (!focusTarget && !isCardLocked && card.view === VIEW.MAIN) {
      messageInputRef.current?.focus();
    }
  });

  // 새 항목이 추가되거나 로딩 표시가 바뀌면 대화 목록을 맨 아래로 스크롤한다.
  const listRef = useRef(null);
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, isChatLoading]);

  // ── 채팅 ────────────────────────────────────────────────────────────────
  // 응답 action을 카드·채팅 흐름에 반영한다. 자연어 신청 확인(CONFIRM_RESERVATION)이 모든 조건을
  // 만족하면 true를 돌려주고, 호출한 쪽이 공통 제출을 실행한다.
  const applyChatResponse = (response, sent) => {
    const action = response.action;
    // 서버 계약상 null인 선택 필드는 응답에서 생략되므로 없음과 null을 같게 다룬다.
    const respDraft = response.draft ?? null;
    const respFilters = response.filters ?? null;
    const respRecommendation = response.counselingTypeRecommendation ?? null;
    const respCandidates = response.scheduleRecommendations;
    const before = cardRef.current;

    if (action === COUNSELING_AI_ACTION.OPEN_GENERAL_APPLICATION) {
      // 모델 장애·해석 불확실: 챗봇 진행을 멈추고 일반 신청 이동 버튼만 보여 준다(자동 이동·자동 신청 없음).
      appendMessage('assistant', response.reply);
      updateCard((current) => ({
        ...current,
        awaitingConfirmation: false,
        chatStopped: true,
        version: current.version + 1,
      }));
      return false;
    }

    if (action === COUNSELING_AI_ACTION.CONFIRM_RESERVATION) {
      // 서버의 CONFIRM reply는 "신청을 진행할게요" 같은 문구라 조건이 안 맞아 신청하지 않는 경우에
      // 그대로 보이면 거짓 안내가 된다. 그래서 reply는 아예 보여 주지 않고 화면이 결과에 맞는 문구를 쓴다.
      // 자연어 수긍은 "메시지를 보내기 직전에 확인 대기였고(sent.awaiting)", 응답 draft가
      // 보낸 스냅샷·현재 카드와 유형·일정·내용이 모두 같으며 version이 그대로일 때만 신청으로 이어진다.
      const current = cardRef.current;
      const isConfirmedCard =
        sent.awaiting &&
        respDraft !== null &&
        current.version === sent.version &&
        isDraftComplete(current) &&
        isSameDraft(draftOfResponse(respDraft), sent.draft) &&
        isSameDraft(draftOfResponse(respDraft), draftOfCard(current));
      if (isConfirmedCard) {
        appendMessage('assistant', '확인했어요. 신청을 진행합니다.');
        return true;
      }
      // 조건 불충족: 카드·초안·후보를 건드리지 않고 다시 확인받도록 안내만 한다.
      appendMessage(
        'assistant',
        '아직 신청하지 않았어요. 다시 확인해 드릴 테니 "신청할게요"라고 말씀해 주세요.',
      );
      return false;
    }

    appendMessage('assistant', response.reply);

    // 카드를 서버 초안으로 바꾸는 action은 UPDATE_DRAFT·ASK_CONFIRMATION뿐이다.
    // INFORM·알 수 없는 값은 후보·조건만 갱신한다.
    const isAskingConfirmation = action === COUNSELING_AI_ACTION.ASK_CONFIRMATION;
    const adoptsDraft = isAskingConfirmation || action === COUNSELING_AI_ACTION.UPDATE_DRAFT;
    const confirmationId = isAskingConfirmation ? nextItemId() : null;
    updateCard((current) => {
      let next = {
        ...current,
        candidates: respCandidates,
        filters: respFilters,
        typeRecommendation: respRecommendation ?? current.typeRecommendation,
        awaitingConfirmation: false,
      };
      if (adoptsDraft && respDraft !== null) {
        // draft.scheduleId가 없는 UPDATE_DRAFT는 선택 일정이 마감됐거나 조건에 안 맞게 된 경우(D14·D16)다.
        // 일정 선택만 해제하고 신청 내용 요약은 그대로 둔다.
        const nextDraft = draftOfResponse(respDraft);
        const shownSchedule =
          // 탐색 순서: 새 응답 후보 → 지금 선택된 일정 → 이전 후보.
          // selectedSchedule은 채택 시점 값이거나 제출 전 재조회로 갱신된 값이라 같은 ID의 이전 후보보다
          // 오래될 수 없다. 이전 후보를 먼저 보면 옛 장소가 카드에 되살아나 재확인이 반복된다.
          isSameScheduleTarget(respCandidates, nextDraft) ??
          isSameScheduleTarget([current.selectedSchedule], nextDraft) ??
          isSameScheduleTarget(current.candidates, nextDraft);
        next = {
          ...next,
          typeId: nextDraft.typeId,
          scheduleId: nextDraft.scheduleId,
          requestContent: respDraft.requestContent ?? '',
          selectedSchedule: nextDraft.scheduleId ? shownSchedule : null,
        };
      }
      // 확인 대기는 ASK_CONFIRMATION일 때만 켠다. reply 문구로 판단하지 않는다.
      if (isAskingConfirmation && isDraftComplete(next)) {
        next.awaitingConfirmation = true;
        next.confirmationId = confirmationId;
      }
      // 채택한 초안이나 조건이 실제로 달라졌을 때만 version을 올린다.
      if (
        !isSameDraft(draftOfCard(current), draftOfCard(next)) ||
        filterKey(current.filters) !== filterKey(next.filters)
      ) {
        next.version = current.version + 1;
      }
      return next;
    });

    // 채팅 흐름에 추천 유형·후보 목록·확인 카드를 덧붙인다. 번호(1~5)는 서버가 후보를 해석하는 순서
    // (context.candidates)와 같아야 하므로 응답 순서 그대로 표시한다.
    const after = cardRef.current;
    if (
      respRecommendation &&
      respRecommendation.counselingTypeId !== before.typeRecommendation?.counselingTypeId
    ) {
      appendItem({ kind: ITEM.TYPE_RECOMMENDATION, recommendation: respRecommendation });
    }
    const wasScheduleCleared = Boolean(before.scheduleId) && !after.scheduleId;
    if (
      respCandidates.length > 0 &&
      (candidateKey(respCandidates) !== candidateKey(before.candidates) || wasScheduleCleared)
    ) {
      appendCandidates(respCandidates);
    }
    if (after.awaitingConfirmation) {
      // 이 시점의 값을 카드에 복사해 둔다. 이후 초안이 바뀌어도 과거 카드는 그때 본 내용 그대로 남는다.
      appendItem({
        kind: ITEM.CONFIRMATION,
        id: confirmationId,
        typeName: resolveTypeName(after),
        schedule: after.selectedSchedule,
        scheduleId: after.scheduleId,
        content: after.requestContent.trim(),
      });
    }
    return false;
  };

  // 메시지를 보낼 수 있는 상태인지 "지금 실제 값"(ref)으로 판단한다. 폼과 후보 버튼이 함께 쓴다.
  // 빈 문자열 검사는 입력을 받는 쪽(handleSendMessage·sendChatMessage)이 맡는다.
  const canSendChat = () =>
    !isChatLoading && !submissionRef.current && !isCardLockedNow(cardRef.current);

  // 폼 제출: 입력창 처리(preventDefault, 입력 비우기)만 하고 실제 전송은 sendChatMessage에 맡긴다.
  const handleSendMessage = (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !canSendChat()) {
      return;
    }
    setMessage('');
    sendChatMessage(trimmedMessage);
  };

  // 채팅 전송 본문. 폼 입력과 후보 선택 버튼이 같은 경로(스냅샷·순번·폐기 검사 포함)를 쓴다.
  const sendChatMessage = async (text) => {
    const trimmedMessage = text.trim();
    const current = cardRef.current;
    if (!trimmedMessage || !canSendChat()) {
      return;
    }

    const requestSeq = chatSeqRef.current + 1;
    chatSeqRef.current = requestSeq;
    const requestUserId = userIdRef.current;
    // 보내는 순간의 스냅샷. 서버 응답이 "신청 확인"인지 판단할 때 이 값과 대조한다.
    const sent = {
      version: current.version,
      draft: draftOfCard(current),
      awaiting: current.awaitingConfirmation,
    };
    // 응답을 적용해도 되는 상태인지: 화면이 살아 있고, 같은 계정이고, 내가 가장 최근 요청이어야 한다.
    const isRequestCurrent = () =>
      mountedRef.current &&
      userIdRef.current === requestUserId &&
      chatSeqRef.current === requestSeq;

    appendMessage('user', trimmedMessage);
    setAlertMessage('');
    setIsChatLoading(true);
    // 대화는 "수정해 주세요"일 수도 있으므로 메시지를 보내는 순간 화면의 확인 대기를 해제한다.
    // 그러면 카드 버튼이 꺼져서 버튼과 "신청할게요" 자연어가 동시에 신청을 시도할 수 없다.
    // 서버에는 보내기 직전의 값(sent.awaiting)을 알려 주어 자연어 수긍은 계속 인식된다.
    updateCard((latest) => ({ ...latest, awaitingConfirmation: false }));

    let shouldSubmit = false;
    try {
      const response = await requestCounselingAiChat(
        trimmedMessage,
        buildContext(current, sent.awaiting),
      );
      if (!isRequestCurrent()) {
        return;
      }
      if (response.basedOnVersion !== cardRef.current.version) {
        // 요청을 보낸 뒤 신청 내용이 바뀌었다. 예전 상태 기준의 응답이라 반영하지 않는다.
        appendMessage(
          'assistant',
          '대화 도중 신청 내용이 바뀌어 이전 답변은 반영하지 않았어요. 다시 말씀해 주세요.',
        );
        return;
      }
      shouldSubmit = applyChatResponse(response, sent);
    } catch (error) {
      // 예약 POST가 진행 중이면(chatSeq가 이미 올라가 isRequestCurrent가 false) 늦은 채팅 실패는 무시한다.
      // 채팅은 쓰기가 없어 실패해도 "예약 결과 불명"이 아니다. 챗봇만 멈추고 일반 신청을 안내한다.
      if (!isRequestCurrent() || submissionRef.current) {
        return;
      }
      updateCard((latest) => ({
        ...latest,
        awaitingConfirmation: false,
        chatStopped: true,
        version: latest.version + 1,
      }));
      // 403(A004)은 응답 지연이 아니라 권한 문제이므로 문구만 따로 안내한다(챗봇 중단·이동 버튼은 동일).
      setAlertMessage(
        error instanceof ApiError && error.code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN
          ? 'AI 도우미를 사용할 권한이 없습니다. 문제가 계속되면 상담센터에 문의하거나 일반 상담 신청 화면을 이용해 주세요.'
          : 'AI 도우미 응답을 받지 못했습니다. 이 화면에서는 더 진행할 수 없으니 일반 상담 신청 화면에서 신청해 주세요.',
      );
    } finally {
      if (isRequestCurrent()) {
        setIsChatLoading(false);
        requestInputFocus();
      }
    }

    if (shouldSubmit) {
      await handleFinalSubmit({ source: 'CHAT', expectedVersion: sent.version, sent });
    }
  };

  // 최신 후보 목록의 [이 일정 선택]. 화면이 초안에 일정을 직접 넣은 뒤 같은 내용을 채팅으로 알린다.
  // - 직접 넣는 이유: 모델이 "2번" 같은 번호를 잘못 해석해 엉뚱한 일정을 고르는 일을 막는다.
  //   서버는 이어서 오는 채팅에서 이 일정이 아직 가용한지 다시 대조한다(D14).
  // - 이 버튼은 예약을 제출하지 않는다. 신청은 이후 서버가 내는 확인 카드를 승인해야만 나간다.
  const handleSelectCandidate = (candidate, number) => {
    const current = cardRef.current;
    const isInCurrentList = current.candidates[number - 1]?.scheduleId === candidate.scheduleId;
    const isAlreadySelected =
      current.scheduleId === candidate.scheduleId && current.typeId === candidate.counselingTypeId;
    // 렌더 시점 값이 아니라 최신 값으로 다시 검사한다(과거 목록·잠금·진행 중 요청·이미 선택됨).
    if (!isInCurrentList || isAlreadySelected || !canSendChat()) {
      return;
    }
    // 초안을 바꾸고 확인 대기를 풀면서 version을 올린다. 이 갱신이 끝난 카드를 기준으로
    // sendChatMessage가 스냅샷을 잡으므로 서버에는 새 일정이 담긴 context가 간다.
    updateCard((latest) => ({
      ...latest,
      typeId: candidate.counselingTypeId,
      scheduleId: candidate.scheduleId,
      // 말풍선에 남은 객체가 아니라 현재 목록의 객체를 쓴다(재조회로 갱신된 정보와 어긋나지 않게).
      selectedSchedule: current.candidates[number - 1],
      awaitingConfirmation: false,
      confirmationId: null,
      version: latest.version + 1,
    }));
    // 서버는 "N번"으로 일정을 지목하므로 번호는 반드시 넣고, 날짜는 사람이 읽는 확인용으로만 덧붙인다.
    sendChatMessage(`${number}번 일정(${formatKstDateTime(candidate.startsAt)})으로 할게요.`);
  };

  // 확인 카드의 [수정할래요]: 확인 대기만 풀고 채팅 입력창으로 돌아간다. 예약 POST도 채팅 요청도 없다.
  const handleEditRequest = (confirmationId) => {
    const current = cardRef.current;
    if (
      !current.awaitingConfirmation ||
      current.confirmationId !== confirmationId ||
      isCardLockedNow(current)
    ) {
      return;
    }
    updateCard((latest) => ({ ...latest, awaitingConfirmation: false }));
    appendMessage('assistant', '알겠어요. 어떤 부분을 바꾸고 싶은지 말씀해 주세요.');
    messageInputRef.current?.focus();
  };

  // 후보 목록을 기존 학생 가용 일정 조회로 다시 확인해 마감된 후보를 빼고 정보를 갱신한다(POST 아님).
  // 조회에 실패한 유형의 후보는 그대로 둔다. 최종 방어는 어차피 예약 POST의 서버 검증이다.
  const refreshCandidateAvailability = async (candidates, atVersion, requestUserId) => {
    const typeIds = [...new Set(candidates.map((candidate) => candidate.counselingTypeId))];
    const results = await Promise.allSettled(
      typeIds.map((typeId) =>
        queryClient.fetchQuery({
          queryKey: ['availableSchedules', typeId],
          queryFn: () => fetchAvailableSchedules(typeId),
          staleTime: 0,
        }),
      ),
    );
    // 그 사이 신청 내용이 바뀌었거나 화면·계정이 바뀌었으면 반영하지 않는다.
    if (
      !mountedRef.current ||
      userIdRef.current !== requestUserId ||
      cardRef.current.version !== atVersion
    ) {
      return;
    }
    const availableByType = new Map();
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        availableByType.set(typeIds[index], result.value);
      }
    });
    const previousKey = candidateKey(cardRef.current.candidates);
    updateCard((current) => ({
      ...current,
      candidates: current.candidates.flatMap((candidate) => {
        const available = availableByType.get(candidate.counselingTypeId);
        if (!available) {
          return [candidate];
        }
        const latest = available.find((item) => item.scheduleId === candidate.scheduleId);
        return latest ? [{ ...candidate, ...latest }] : [];
      }),
    }));
    // 마감된 후보가 빠져 번호가 달라졌으면 최신 목록을 다시 보여 준다.
    const refreshed = cardRef.current.candidates;
    if (refreshed.length > 0 && candidateKey(refreshed) !== previousKey) {
      appendCandidates(refreshed);
    }
  };

  // ── 공통 제출: 버튼과 자연어(CONFIRM_RESERVATION)가 모두 여기로 온다 ─────────────
  // 초안이 "완성"됐다는 사실만으로는 절대 제출되지 않는다. 호출한 쪽이 아래 중 하나를 증명해야 한다.
  //  - BUTTON: 지금 이 확인 카드(confirmationId)가 유효한 확인 대기 상태일 것
  //  - CHAT: 메시지를 보내기 직전에 확인 대기였고(sent.awaiting) 그때의 초안이 지금 카드와 같을 것
  // expectedVersion은 "호출한 쪽이 본 카드가 지금 카드와 같은 세대인지" 확인하는 값일 뿐이다.
  // BUTTON 경로에서 "이 카드로 신청해도 되는가"를 실제로 막는 방어는 confirmationId(지금 유효한 카드인지)다.
  // 중복 실행은 submissionRef가 막는다.
  const handleFinalSubmit = async ({ source, expectedVersion, confirmationId, sent }) => {
    const start = cardRef.current;
    // (1) 동기 가드. 첫 await 전에 막아야 버튼 두 번 클릭 같은 중복이 POST를 두 번 만들지 않는다.
    if (submissionRef.current || !mountedRef.current) {
      return;
    }
    if (
      start.version !== expectedVersion ||
      start.view !== VIEW.MAIN ||
      start.chatStopped ||
      start.phase !== PHASE.COLLECTING ||
      !isDraftComplete(start)
    ) {
      return;
    }
    if (source === 'BUTTON') {
      if (!start.awaitingConfirmation || start.confirmationId !== confirmationId) {
        return;
      }
    } else if (!sent?.awaiting || !isSameDraft(sent.draft, draftOfCard(start))) {
      return;
    }
    const requestUserId = userIdRef.current;
    if (requestUserId === null) {
      return;
    }
    submissionRef.current = true;
    // (2) 진행 중인 채팅 분석을 무효화한다. 이 요청의 응답이 나중에 와도 카드를 바꾸거나 제출하지 못한다.
    chatSeqRef.current += 1;
    setIsChatLoading(false);
    setAlertMessage('');
    // 제출에 쓸 값을 지금 고정한다. 이후 화면 값이 바뀌어도 학생이 확인한 값만 보낸다.
    const snapshot = {
      typeId: start.typeId,
      scheduleId: start.scheduleId,
      content: start.requestContent.trim(),
      schedule: start.selectedSchedule,
    };
    updateCard((current) => ({ ...current, phase: PHASE.SUBMITTING, awaitingConfirmation: false }));

    // await 뒤에는 화면이 살아 있는지, 같은 계정인지, 카드 version이 그대로인지 매번 다시 본다.
    // (제출 중에는 채팅이 막혀 있어 version이 바뀌면 이례적인 상황이라 중단한다.)
    const isCurrent = () =>
      mountedRef.current &&
      userIdRef.current === requestUserId &&
      cardRef.current.version === expectedVersion;
    // 제출이 끝난 뒤(실패·복구)에는 어떤 결과든 version을 올리고 확인 대기를 풀어,
    // 이전 확인 질문에 대한 "신청할게요"가 다시 도착해도 같은 신청이 재실행되지 않게 한다.
    // 복구 뒤에는 학생이 다시 대화로 확인 카드를 받아야 신청할 수 있다.
    const reopenCard = (patch = {}, alert = '') => {
      updateCard((current) => ({
        ...current,
        phase: PHASE.COLLECTING,
        awaitingConfirmation: false,
        version: current.version + 1,
        ...patch,
      }));
      setAlertMessage(alert);
    };
    // 동의 단계에 들어올 때마다 이전 체크·오류를 지워 매번 학생이 직접 체크하게 한다.
    const moveToConsentView = () => {
      consent.resetConsentChecked();
      consent.setConsentError('');
      reopenCard({ view: VIEW.CONSENT });
    };
    // S002 복구: 요약은 두고 일정 선택만 해제한다. 재선택·재확인 전에는 POST하지 않는다.
    // C002(유형 없음)는 유형까지 해제하고 그 유형의 후보도 뺀다.
    const recoverScheduleGone = (alert, isTypeGone = false) => {
      const remaining = cardRef.current.candidates.filter((candidate) =>
        isTypeGone
          ? candidate.counselingTypeId !== snapshot.typeId
          : candidate.scheduleId !== snapshot.scheduleId,
      );
      reopenCard(
        {
          typeId: isTypeGone ? null : cardRef.current.typeId,
          scheduleId: null,
          selectedSchedule: null,
          candidates: remaining,
        },
        alert,
      );
      // 후보에서 하나가 빠져 번호가 밀렸으므로 채팅에 새 번호의 목록을 다시 보여 준다.
      if (remaining.length > 0) {
        appendCandidates(remaining);
      }
      refreshCandidateAvailability(remaining, cardRef.current.version, requestUserId);
    };

    try {
      // (3) 최신 정책과 본인 동의를 서버에서 다시 조회한다. 판단은 캐시가 아니라 이 결과로 한다.
      let consentState;
      try {
        consentState = await refreshConsentState();
      } catch {
        // 조회 실패는 아직 아무것도 쓰기 전이므로 "결과 불명"이 아니다. 동의가 무효라고 단정하지도 않는다.
        if (isCurrent()) {
          reopenCard({}, `동의 정보를 확인하지 못해 신청하지 않았어요. ${RETRY_HINT}`);
        }
        return;
      }
      if (!isCurrent()) {
        return;
      }
      if (!consentState.policy || !consentState.consent) {
        // 동의가 없거나 정책이 바뀌었다. POST하지 않고 내부 동의 단계로 간다(신청 내용 유지).
        moveToConsentView();
        return;
      }

      // (4) 선택한 일정의 최신 정보를 기존 학생 가용 일정 조회로 다시 확인한다.
      let latestSchedules;
      try {
        latestSchedules = await queryClient.fetchQuery({
          queryKey: ['availableSchedules', snapshot.typeId],
          queryFn: () => fetchAvailableSchedules(snapshot.typeId),
          staleTime: 0,
        });
      } catch {
        if (isCurrent()) {
          reopenCard({}, `선택한 일정을 확인하지 못해 신청하지 않았어요. ${RETRY_HINT}`);
        }
        return;
      }
      if (!isCurrent()) {
        return;
      }
      const latestSchedule = latestSchedules.find(
        (item) => item.scheduleId === snapshot.scheduleId,
      );
      if (!latestSchedule) {
        recoverScheduleGone(SCHEDULE_GONE_MESSAGE);
        return;
      }
      if (!isSameScheduleInfo(snapshot.schedule, latestSchedule)) {
        // 학생이 확인한 카드와 실제 일정이 다르다. 초안의 일정 정보만 새로 바꾸고 확인 대기는 풀어
        // 새 확인을 대화로 받게 한다(POST 0회).
        reopenCard({
          selectedSchedule: {
            ...(snapshot.schedule ?? {
              counselingTypeId: snapshot.typeId,
              counselingTypeName: null,
            }),
            ...latestSchedule,
          },
        });
        const placeText = latestSchedule.location ? ` · ${latestSchedule.location}` : '';
        const scheduleText = `${formatKstRange(latestSchedule)} · ${latestSchedule.counselorName}${placeText}`;
        appendMessage(
          'assistant',
          `선택하신 일정의 상담사·시간·장소가 바뀌었어요. 일정 정보를 새로 갱신했으니 "신청할게요"라고 말씀하시면 바뀐 내용으로 다시 확인해 드릴게요. (${scheduleText})`,
        );
        requestInputFocus();
        return;
      }

      // (5) 예약 POST. 학생 ID는 보내지 않는다(서버가 로그인 정보로 정한다).
      let reservation;
      try {
        reservation = await createReservationMutation.mutateAsync({
          counselingTypeId: snapshot.typeId,
          scheduleId: snapshot.scheduleId,
          consentId: consentState.consent.userConsentId,
          requestContent: snapshot.content,
        });
      } catch (error) {
        const code = error instanceof ApiError ? error.code : NETWORK_ERROR_CODE;
        if (code === NETWORK_ERROR_CODE) {
          // 무효화는 캐시를 "오래됨"으로만 표시할 뿐 새 데이터를 만들지 않아 언마운트·계정 변경 뒤에도 안전하다.
          // 그래서 isCurrent()보다 먼저 실행한다(서버에 저장됐을 수 있는데 화면이 사라져도 목록이 낡은 채 남지 않게).
          queryClient.invalidateQueries({ queryKey: ['counselingReservations'] });
        }
        if (!isCurrent()) {
          return;
        }
        if (code === NETWORK_ERROR_CODE) {
          // 타임아웃·연결 끊김: 서버가 이미 저장했는데 응답만 못 받았을 수도 있다.
          // 실패로 단정하고 다시 보내면 같은 신청이 두 번 생길 수 있으므로 재제출을 막고 내 상담 확인을 안내한다.
          updateCard((current) => ({
            ...current,
            phase: PHASE.OUTCOME_UNKNOWN,
            awaitingConfirmation: false,
            version: current.version + 1,
          }));
          return;
        }
        if (code === COUNSELING_RESERVATION_ERROR_CODE.SCHEDULE_NOT_AVAILABLE) {
          recoverScheduleGone(SCHEDULE_GONE_MESSAGE);
          return;
        }
        if (code === COUNSELING_RESERVATION_ERROR_CODE.RESOURCE_NOT_FOUND) {
          recoverScheduleGone(TYPE_GONE_MESSAGE, true);
          return;
        }
        if (code === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN) {
          // A004는 동의 문제 말고 권한 문제에도 쓰인다. 동의를 다시 조회해 무효일 때만 재동의로 보낸다.
          let recheck;
          try {
            recheck = await refreshConsentState();
          } catch {
            if (isCurrent()) {
              reopenCard({}, `권한 또는 동의 상태를 확인하지 못했어요. ${RETRY_HINT}`);
            }
            return;
          }
          if (!isCurrent()) {
            return;
          }
          if (!recheck.policy || !recheck.consent) {
            moveToConsentView();
          } else {
            reopenCard(
              {},
              '신청 권한이 없어 상담을 신청할 수 없습니다. 동의는 유효하므로 다시 동의하지 않아도 됩니다. 문제가 계속되면 상담센터에 문의해 주세요.',
            );
          }
          return;
        }
        reopenCard(
          {},
          code === COUNSELING_RESERVATION_ERROR_CODE.INVALID_INPUT
            ? `신청 내용을 확인하지 못했어요. ${RETRY_HINT}`
            : `상담 신청에 실패했어요. ${RETRY_HINT}`,
        );
        return;
      }

      // (6) 성공은 서버 응답의 예약 ID·상태로만 표시한다.
      // 캐시 무효화는 새 캐시를 만들지 않고 낡은 표시만 해서 언마운트 뒤에도 안전하므로 isCurrent()보다 먼저 한다
      // (CounselingProposalAcceptDialog와 같은 방식). 토스트·화면 반영은 화면·계정이 그대로일 때만 한다.
      queryClient.invalidateQueries({ queryKey: ['counselingReservations'] });
      queryClient.invalidateQueries({ queryKey: ['availableSchedules'] });
      if (!isCurrent()) {
        return;
      }
      updateCard((current) => ({
        ...current,
        phase: PHASE.SUCCEEDED,
        awaitingConfirmation: false,
        version: current.version + 1,
        reservation: {
          reservationId: reservation.reservationId,
          reservationStatus: reservation.reservationStatus,
        },
      }));
      toast('상담 신청이 접수되었습니다. 상담사 승인을 기다려 주세요.', 'success');
    } finally {
      // 성공·결과 불명 뒤에는 phase가 COLLECTING이 아니라서 가드를 풀어도 다시 제출되지 않는다.
      submissionRef.current = false;
      createReservationMutation.reset();
    }
  };

  // ── 내부 동의 단계 ────────────────────────────────────────────────────────
  const handleAgreeAndReturn = async () => {
    const requestUserId = userIdRef.current;
    const isConsentReady = await consent.agreeCurrentPolicy();
    if (!isConsentReady || !mountedRef.current || userIdRef.current !== requestUserId) {
      return;
    }
    // 동의만으로 자동 신청하지 않는다. 확인 대기도 복원하지 않고, 대화로 다시 확인받게 한다.
    updateCard((current) => ({
      ...current,
      view: VIEW.MAIN,
      phase: PHASE.COLLECTING,
      awaitingConfirmation: false,
      version: current.version + 1,
    }));
    appendMessage(
      'assistant',
      '동의가 완료됐어요. "신청할게요"라고 말씀하시면 다시 확인해 드릴게요.',
    );
    // 동의 화면에서 돌아오면 입력창으로 포커스를 옮겨 키보드 사용자가 위치를 잃지 않게 한다.
    requestInputFocus();
  };
  const handleLeaveConsent = () => {
    consent.resetConsentChecked();
    consent.setConsentError('');
    updateCard((current) => ({
      ...current,
      view: VIEW.MAIN,
      awaitingConfirmation: false,
      version: current.version + 1,
    }));
    requestInputFocus();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[12px] text-[#656D76]">학생상담 · AI 도우미</p>
          <h2 className="mt-1 text-[20px] font-bold text-[#1F2328]">상담 전 AI 도우미</h2>
          <p className="mt-1 text-[12px] text-[#656D76]">
            대화로 고민을 정리하고 상담 유형과 일정을 고른 뒤, 확인 카드에서 내용을 확인하고 신청해
            보세요.
          </p>
          <p className="mt-1 text-[11px] text-[#9AA0A6]">
            이 화면의 대화와 신청 내용은 저장되지 않습니다. 새로고침하거나 다른 화면으로 이동하면
            사라집니다.
          </p>
        </div>
        {/* 제출 중에 나가면 접수 결과를 화면에서 알 수 없으므로 끝날 때까지 막는다. */}
        <Button
          size="sm"
          variant="outline"
          disabled={card.phase === PHASE.SUBMITTING}
          onClick={onBack}
        >
          ← 뒤로
        </Button>
      </div>

      {card.view === VIEW.CONSENT ? (
        <ConsentSection
          consent={consent}
          headingRef={focusTarget === 'consent' ? focusRef : null}
          onAgree={handleAgreeAndReturn}
          onLeave={handleLeaveConsent}
        />
      ) : (
        <>
          {isSettledPhase && (
            <ResultSection
              phase={card.phase}
              reservation={card.reservation}
              headingRef={focusTarget === 'result' ? focusRef : null}
              onOpenMy={onOpenMy}
            />
          )}

          <section className="max-w-[720px] rounded-[10px] border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[#1F2328]">상담 전 대화</h3>
              <span className="text-[11px] text-[#9AA0A6]">AI 안내</span>
            </div>

            {/* 새 항목(후보·확인 카드 포함)이 "추가"될 때만 읽히도록 aria-relevant를 additions로 둔다.
                기존 항목의 문구 변경(이전 확인 카드 표시 등)은 낭독되지 않는다.
                높이를 제한하고 안에서 스크롤해 입력창과 버튼이 화면 밖으로 밀리지 않게 한다. */}
            <div
              ref={listRef}
              className="flex max-h-[60vh] min-h-[240px] flex-col gap-3 overflow-y-auto rounded-[8px] bg-[#F8FAFC] p-3"
              aria-live="polite"
              aria-relevant="additions"
            >
              {messages.map((item) => {
                if (item.kind === ITEM.CANDIDATES) {
                  return (
                    <CandidatesBubble
                      key={item.id}
                      item={item}
                      isLatest={
                        item.id === latestCandidatesId &&
                        candidateKey(item.candidates) === candidateKey(card.candidates)
                      }
                      canSelect={!isChatLoading && !isCardLocked}
                      selectedTarget={{ scheduleId: card.scheduleId, typeId: card.typeId }}
                      onSelect={handleSelectCandidate}
                    />
                  );
                }
                if (item.kind === ITEM.TYPE_RECOMMENDATION) {
                  return <TypeRecommendationBubble key={item.id} item={item} />;
                }
                if (item.kind === ITEM.CONFIRMATION) {
                  return (
                    <ConfirmationCard
                      key={item.id}
                      item={item}
                      isLatest={item.id === card.confirmationId}
                      phase={card.phase}
                      isActive={
                        item.id === card.confirmationId &&
                        card.awaitingConfirmation &&
                        card.phase === PHASE.COLLECTING &&
                        !card.chatStopped
                      }
                      onSubmit={() =>
                        handleFinalSubmit({
                          source: 'BUTTON',
                          expectedVersion: cardRef.current.version,
                          confirmationId: item.id,
                        })
                      }
                      onEdit={() => handleEditRequest(item.id)}
                    />
                  );
                }
                return (
                  <div
                    key={item.id}
                    className={
                      'max-w-[88%] rounded-[8px] px-3 py-2 text-[12px] leading-relaxed ' +
                      (item.role === 'user'
                        ? 'self-end bg-[#CFFAFE] text-[#164E63]'
                        : 'self-start border border-[#E5E7EB] bg-white text-[#444D56]')
                    }
                  >
                    {item.content}
                  </div>
                );
              })}
              {isChatLoading && (
                <div className="self-start rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] text-[#656D76]">
                  상담 유형과 일정을 확인하고 있습니다...
                </div>
              )}
            </div>

            {alertMessage && (
              <p
                ref={focusTarget === 'alert' ? focusRef : null}
                tabIndex={-1}
                className="mt-2 text-[12px] text-[#CF222E] outline-none"
                role="alert"
              >
                {alertMessage}
              </p>
            )}

            {card.chatStopped && (
              <section
                role="status"
                className="mt-3 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] p-4"
              >
                <h3 className="text-[14px] font-bold text-[#92400E]">일반 상담 신청 화면 안내</h3>
                <p className="mt-2 text-[11px] leading-relaxed text-[#92400E]">
                  AI 도우미로는 더 이상 신청을 진행할 수 없습니다. 일반 상담 신청 화면으로 이동하면
                  지금까지의 대화와 신청 내용은 사라지니, 필요한 내용은 미리 복사해 두세요.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  style={{ background: ACCENT }}
                  onClick={() => onOpenApply()}
                >
                  일반 상담 신청 화면으로 이동
                </Button>
              </section>
            )}

            <form className="mt-3 flex gap-2" onSubmit={handleSendMessage}>
              <label className="sr-only" htmlFor="counseling-ai-message">
                상담 고민 입력
              </label>
              <textarea
                id="counseling-ai-message"
                ref={messageInputRef}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="예: 취업 방향이 막막하고 면접이 불안해요."
                rows={2}
                maxLength={3000}
                disabled={isCardLocked}
                className="min-w-0 flex-1 resize-none rounded-[8px] border border-[#D0D7DE] px-3 py-2 text-[12px] outline-none focus:border-[#0891B2] focus:ring-2 focus:ring-[#CFFAFE] disabled:bg-[#F3F4F6]"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!message.trim() || isChatLoading || isCardLocked}
                loading={isChatLoading}
                style={{ background: ACCENT }}
              >
                보내기
              </Button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}

/**
 * 대화 안에 표시하는 번호 붙은 일정 후보. 번호(1~5)는 서버가 "2번 일정" 같은 말을 해석하는 순서와 같다.
 *
 * @param {Object} props
 * @param {{candidates: Object[]}} props.item
 * @param {boolean} props.isLatest 가장 최근 목록이면서 현재 후보와 같은지
 * @param {boolean} props.canSelect 채팅 응답 대기·제출 중·종료·챗봇 중단이 아니라 선택해도 되는 상태인지
 * @param {{scheduleId: number|null, typeId: number|null}} props.selectedTarget 지금 초안의 일정
 * @param {(candidate: Object, number: number) => void} props.onSelect
 */
function CandidatesBubble({ item, isLatest, canSelect, selectedTarget, onSelect }) {
  return (
    <div
      className={
        'max-w-[92%] self-start rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] text-[#444D56]' +
        (isLatest ? '' : ' opacity-60')
      }
    >
      {/* 이전 목록 표시는 색이 아니라 글로도 알린다. 나중에 바뀌는 문구라 낭독하지 않는다. */}
      {!isLatest && (
        <p aria-live="off" className="mb-1 text-[11px] font-semibold text-[#656D76]">
          이전 목록입니다. 번호는 가장 아래 최신 목록 기준입니다.
        </p>
      )}
      <p className="font-semibold text-[#1F2328]">예약 가능한 일정</p>
      <ol className="mt-2 flex flex-col gap-2">
        {item.candidates.map((schedule, index) => {
          const isSelected =
            selectedTarget.scheduleId === schedule.scheduleId &&
            selectedTarget.typeId === schedule.counselingTypeId;
          // 카드 전체가 하나의 버튼이다(div onClick 대신 button). 최신 목록에서만 켠다.
          // 과거 목록은 번호가 현재 후보와 달라질 수 있어 끈다. 선택됨은 색이 아니라 글자와 aria-pressed로 알린다.
          // 접근 가능한 이름은 카드 안의 보이는 글자에서 자동으로 만들어지므로 aria-label로 덮어쓰지 않는다.
          const isDisabled = !isLatest || !canSelect || isSelected;
          return (
            <li key={`${schedule.counselingTypeId}-${schedule.scheduleId}`}>
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={isDisabled}
                onClick={() => onSelect(schedule, index + 1)}
                className={`w-full rounded-[6px] border-2 p-2 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0891B2] disabled:cursor-not-allowed ${
                  isSelected
                    ? 'border-[#0891B2] bg-[#ECFEFF] shadow-[0_0_0_3px_rgba(8,145,178,0.12)]'
                    : 'border-[#E5E7EB] bg-white enabled:hover:border-[#67E8F9] enabled:hover:shadow-[0_1px_4px_rgba(8,145,178,0.08)]'
                }`}
              >
                <span className="block font-bold text-[#1F2328]">
                  {index + 1}번 · {formatKstRange(schedule)}
                </span>
                <span className="mt-1 block text-[11px] text-[#656D76]">
                  {schedule.counselingTypeName} · {schedule.counselorName}
                  {schedule.location ? ` · ${schedule.location}` : ' · 장소 미정'} · 잔여{' '}
                  {schedule.remainingCapacity}명
                </span>
                {/* 상태 글자: 선택됨 / 선택 가능 안내. 과거 목록·대기 중에는 안내를 붙이지 않는다. */}
                {isSelected ? (
                  <span className="mt-1 block text-[11px] font-bold text-[#0E7490]">선택됨</span>
                ) : (
                  !isDisabled && (
                    <span className="mt-1 block text-[11px] text-[#0E7490]">눌러서 선택</span>
                  )
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[11px] text-[#656D76]">
        원하는 일정을 번호나 날짜·시간으로 말씀해 주세요.
      </p>
    </div>
  );
}

/**
 * 추천 상담 유형이 바뀌었을 때만 짧게 보여 준다.
 *
 * @param {Object} props
 * @param {{recommendation: {typeName: string, reason: string}}} props.item
 */
function TypeRecommendationBubble({ item }) {
  return (
    <div className="max-w-[88%] self-start rounded-[8px] border border-[#A5F3FC] bg-[#ECFEFF] px-3 py-2 text-[12px] text-[#155E75]">
      <p className="font-semibold text-[#164E63]">추천 상담 유형: {item.recommendation.typeName}</p>
      <p className="mt-1 leading-relaxed">{item.recommendation.reason}</p>
    </div>
  );
}

/**
 * 읽기 전용 신청 확인 카드. 카드는 만들어진 시점의 내용을 그대로 복사해 두고 수정 칸이 없다.
 * 유효한(가장 최근이면서 확인 대기인) 카드만 버튼이 켜진다. 과거 카드가 살아 있으면 예전 내용으로
 * 신청이 나갈 수 있으므로 새 카드가 생기거나 대화가 이어지면 이전 카드의 버튼은 꺼진다.
 *
 * @param {Object} props
 * @param {Object} props.item 카드 스냅샷(유형명·일정·요약)
 * @param {boolean} props.isLatest 가장 최근 확인 카드인지
 * @param {boolean} props.isActive 버튼을 켤 수 있는 상태인지
 * @param {string} props.phase 현재 진행 단계
 * @param {() => void} props.onSubmit
 * @param {() => void} props.onEdit
 */
function ConfirmationCard({ item, isLatest, isActive, phase, onSubmit, onEdit }) {
  const titleId = `counseling-ai-confirmation-${item.id}`;
  let statusText = '이전 확인 카드입니다.';
  if (isLatest && phase === PHASE.SUBMITTING) {
    statusText = '신청을 처리하고 있습니다. 잠시만 기다려 주세요.';
  } else if (isLatest && phase === PHASE.SUCCEEDED) {
    statusText = '신청이 접수되어 이 카드는 더 이상 사용할 수 없습니다.';
  } else if (isLatest && phase === PHASE.OUTCOME_UNKNOWN) {
    statusText = '결과를 확인할 수 없어 이 카드로는 다시 신청할 수 없습니다.';
  } else if (isActive) {
    statusText =
      '내용을 확인한 뒤 "이 내용으로 신청" 버튼을 누르거나 "신청할게요"라고 말씀해 주세요.';
  }

  return (
    <section
      aria-labelledby={titleId}
      className="max-w-[92%] self-start rounded-[8px] border-2 border-[#67E8F9] bg-white px-3 py-3 text-[12px] text-[#444D56]"
    >
      <h4 id={titleId} className="text-[13px] font-bold text-[#164E63]">
        신청 확인 카드
      </h4>
      <dl className="mt-2 space-y-2">
        <div>
          <dt className="text-[11px] font-semibold text-[#656D76]">상담 유형</dt>
          <dd>{item.typeName ?? '선택된 유형'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold text-[#656D76]">일정</dt>
          {/* 한 발화에 일정 변경과 내용 추가가 섞이면 기존 일정으로 카드가 뜰 수 있어(D19) 일정을 가장 눈에 띄게 둔다. */}
          <dd className="rounded-[6px] bg-[#ECFEFF] px-2 py-1.5 text-[13px] font-bold text-[#0E7490]">
            {item.schedule ? (
              <>
                {formatKstRange(item.schedule)}
                <br />
                {item.schedule.counselorName}
                {item.schedule.location ? ` · ${item.schedule.location}` : ' · 장소 미정'}
              </>
            ) : (
              `일정 번호 ${item.scheduleId} (신청 전에 상담사·시간·장소를 다시 확인합니다)`
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold text-[#656D76]">신청 내용 요약</dt>
          <dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{item.content}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-[#656D76]">
        신청하면 담당 상담사가 승인해야 예약이 확정됩니다. 요약은 담당 상담사만 열람합니다.
      </p>
      {/* 상태가 바뀔 때마다 읽으면 소음이라 낭독하지 않는다(버튼 활성 여부와 제목으로 알 수 있다). */}
      <p aria-live="off" className="mt-2 text-[11px] font-semibold text-[#155E75]">
        {statusText}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!isActive}
          loading={isLatest && phase === PHASE.SUBMITTING}
          style={{ background: ACCENT }}
          onClick={onSubmit}
        >
          이 내용으로 신청
        </Button>
        <Button size="sm" variant="outline" disabled={!isActive} onClick={onEdit}>
          수정할래요
        </Button>
      </div>
    </section>
  );
}

// 채팅 전송·확인 카드 버튼은 렌더 시점 값이 아닌 최신 카드로 잠금 여부를 판단한다.
function isCardLockedNow(card) {
  return (
    card.chatStopped ||
    card.view !== VIEW.MAIN ||
    card.phase === PHASE.SUBMITTING ||
    card.phase === PHASE.SUCCEEDED ||
    card.phase === PHASE.OUTCOME_UNKNOWN
  );
}

/**
 * 신청 접수 완료 또는 결과 불명 안내. 접수 완료는 "상담사 승인 완료"가 아니다.
 *
 * @param {Object} props
 * @param {'SUCCEEDED'|'OUTCOME_UNKNOWN'} props.phase
 * @param {{reservationId: number, reservationStatus: string}|null} props.reservation 서버 응답 값
 * @param {import('react').Ref<HTMLHeadingElement>|null} props.headingRef
 * @param {() => void} props.onOpenMy
 */
function ResultSection({ phase, reservation, headingRef, onOpenMy }) {
  const isSucceeded = phase === PHASE.SUCCEEDED;
  return (
    <section
      aria-labelledby="counseling-ai-result-title"
      className={
        'mb-4 max-w-[960px] rounded-[10px] border p-4 ' +
        (isSucceeded ? 'border-[#BBF7D0] bg-[#F0FDF4]' : 'border-[#FDE68A] bg-[#FFFBEB]')
      }
    >
      <h3
        id="counseling-ai-result-title"
        ref={headingRef}
        tabIndex={-1}
        className={
          'text-[14px] font-bold outline-none ' +
          (isSucceeded ? 'text-[#14532D]' : 'text-[#92400E]')
        }
      >
        {isSucceeded
          ? '상담 신청이 접수되었습니다 — 상담사 승인 대기'
          : '신청 결과를 확인하지 못했습니다'}
      </h3>
      {isSucceeded ? (
        <p className="mt-2 text-[12px] leading-relaxed text-[#14532D]">
          예약번호 {reservation.reservationId} · 상태{' '}
          {COUNSELING_RESERVATION_STATUS_LABEL[reservation.reservationStatus] ??
            reservation.reservationStatus}
          . 아직 상담사가 승인한 것은 아니며, 승인되면 예약이 확정됩니다.
        </p>
      ) : (
        <p className="mt-2 text-[12px] leading-relaxed text-[#92400E]">
          네트워크 문제로 신청이 접수되었는지 알 수 없습니다. 자동으로 다시 신청하지 않으며, 이
          화면에서는 같은 신청을 다시 제출할 수 없습니다. 내 상담에서 접수되었는지 먼저 확인해
          주세요.
        </p>
      )}
      <Button size="sm" className="mt-3" style={{ background: ACCENT }} onClick={onOpenMy}>
        {isSucceeded ? '내 상담 보기' : '내 상담에서 확인'}
      </Button>
    </section>
  );
}

/**
 * 패널 안에서 보여 주는 개인정보 동의 단계. 신청 내용은 부모(패널)가 그대로 들고 있다.
 *
 * @param {Object} props
 * @param {ReturnType<typeof useCounselingConsent>} props.consent
 * @param {import('react').Ref<HTMLHeadingElement>|null} props.headingRef
 * @param {() => void} props.onAgree
 * @param {() => void} props.onLeave
 */
function ConsentSection({ consent, headingRef, onAgree, onLeave }) {
  const {
    currentPolicy,
    activeConsent,
    isLoading,
    isFetching,
    error,
    hasConfigError,
    refetch,
    consentChecked,
    changeConsentChecked,
    consentError,
    isAgreeing,
  } = consent;
  const canProceed = Boolean(activeConsent) || consentChecked.checked;

  return (
    <section
      aria-labelledby="counseling-ai-consent-title"
      className="max-w-[640px] rounded-[10px] border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
    >
      <h3
        id="counseling-ai-consent-title"
        ref={headingRef}
        tabIndex={-1}
        className="text-[14px] font-bold text-[#1F2328] outline-none"
      >
        상담 개인정보 동의 확인
      </h3>
      <p className="mt-1 text-[12px] leading-relaxed text-[#656D76]">
        신청을 진행하려면 최신 개인정보 동의가 필요합니다. 입력한 신청 내용은 그대로 유지됩니다.
        동의한 뒤에도 자동으로 신청되지 않으며, 신청 내용을 다시 확인하고 신청 버튼을 눌러야 합니다.
      </p>

      {isLoading && (
        <div role="status" aria-busy="true" className="mt-3">
          <span className="sr-only">동의 정보를 불러오는 중입니다.</span>
          <SkeletonLoader rows={3} cols={1} />
        </div>
      )}

      {!isLoading && error && (
        <div
          role="alert"
          className="mt-3 rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3"
        >
          <p className="text-[13px] font-bold text-[#7F1D1D]">동의 정보를 불러오지 못했습니다.</p>
          <p className="mb-3 mt-1 text-[12px] text-[#CF222E]">잠시 후 다시 시도해 주세요.</p>
          <Button size="sm" variant="outline" loading={isFetching} onClick={refetch}>
            다시 시도
          </Button>
        </div>
      )}

      {!isLoading && !error && hasConfigError && (
        <div
          role="alert"
          className="mt-3 rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3"
        >
          <p className="text-[13px] font-bold text-[#7F1D1D]">
            상담 신청을 위한 동의 항목 설정에 문제가 있어 신청을 진행할 수 없습니다.
          </p>
          <p className="mt-1 text-[12px] text-[#CF222E]">상담센터에 문의해 주세요.</p>
        </div>
      )}

      {!isLoading && !error && !hasConfigError && currentPolicy && (
        <div className="mt-3 rounded-[8px] border border-[#E5E7EB]">
          <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-4 py-3">
            <h4 className="text-[13px] font-bold text-[#1F2328]">{currentPolicy.title}</h4>
            <span className="font-mono text-[10px] text-[#9AA0A6]">v{currentPolicy.version}</span>
            <span className="ml-auto rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-black text-[#CF222E]">
              필수
            </span>
          </div>
          {/* content는 서버가 내려주는 plain text다. HTML로 신뢰하지 않으므로 그대로 escape되어 렌더된다. */}
          <div className="whitespace-pre-wrap px-4 py-4 text-[12px] leading-relaxed text-[#444D56]">
            {currentPolicy.content}
          </div>
          <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
            {activeConsent ? (
              <p className="text-[12px] font-semibold text-[#1A7F37]">이미 동의했습니다.</p>
            ) : (
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={consentChecked.checked}
                  onChange={(event) => changeConsentChecked(event.target.checked)}
                  disabled={isAgreeing}
                  className="h-5 w-5 flex-shrink-0 rounded-[4px]"
                  style={{ accentColor: ACCENT }}
                />
                <span className="text-[12px] font-semibold text-[#1F2328]">
                  위 상담 정보 처리 방침을 읽었으며 이에 동의합니다.
                </span>
              </label>
            )}
          </div>
        </div>
      )}

      {consentError && (
        <p
          role="alert"
          className="mt-3 rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] font-semibold text-[#CF222E]"
        >
          {consentError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button size="sm" variant="secondary" disabled={isAgreeing} onClick={onLeave}>
          동의하지 않고 돌아가기
        </Button>
        <Button
          size="sm"
          disabled={!currentPolicy || !canProceed || isAgreeing}
          loading={isAgreeing}
          style={{ background: ACCENT }}
          onClick={onAgree}
        >
          동의하고 신청 내용으로 돌아가기
        </Button>
      </div>
    </section>
  );
}
