import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader,
  Stepper,
  Button,
  ConfirmDialog,
  EmptyState,
  SkeletonLoader,
} from '@/components/common';
import {
  fetchCounselingTypes,
  fetchAvailableSchedules,
  createCounselingReservation,
} from '@/api/counsel';
import {
  APPLICATION_ROUTE,
  APPLICATION_ROUTE_LABEL,
  COUNSELING_RESERVATION_ERROR_CODE,
  COUNSELING_RESERVATION_STATUS_LABEL,
} from '@/constants/domain';

// 신청 실패 사유를 사용자가 이해할 수 있는 문구로 바꾼다. 문서에 명시된 코드만 분기한다.
const getSubmitErrorMessage = (error) => {
  const errorCode = error?.code;
  if (errorCode === COUNSELING_RESERVATION_ERROR_CODE.SCHEDULE_NOT_AVAILABLE) {
    return '선택한 일정을 더 이상 사용할 수 없습니다. 다른 일정을 선택해 주세요.';
  }
  if (errorCode === COUNSELING_RESERVATION_ERROR_CODE.INVALID_INPUT) {
    return '신청 내용을 확인해 주세요.';
  }
  if (errorCode === COUNSELING_RESERVATION_ERROR_CODE.FORBIDDEN) {
    return '상담을 신청할 권한이 없습니다.';
  }
  return '상담 신청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
};

const ACCENT = '#0891B2';

// UTC ISO 문자열을 사용자 로컬 기준 날짜/요일/시간으로 변환한다.
const formatDateTime = (iso) => {
  const d = new Date(iso);
  return {
    dateLabel: d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
    dayLabel: d.toLocaleDateString('ko-KR', { weekday: 'short' }),
    timeLabel: d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  };
};

// "날짜 (요일) 시간" 한 줄 라벨. 선택 배너·확인 다이얼로그·완료 화면에서 같은 형식을 쓴다.
const formatScheduleLabel = (iso) => {
  const { dateLabel, dayLabel, timeLabel } = formatDateTime(iso);
  return `${dateLabel} (${dayLabel}) ${timeLabel}`;
};

// 상담사 필터 옵션과 필터링에서 같은 키 형식을 공유하도록 한 곳에서 조합한다.
// 두 곳의 키 형식이 어긋나면 필터가 아무 일정도 못 찾는 버그로 이어진다.
const counselorKeyOf = (schedule) =>
  `${schedule.counselorName}||${schedule.counselorDepartmentName ?? ''}`;

// ─── Schedule Card ────────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {import('@/api/counsel').AvailableSchedule} props.schedule
 * @param {boolean} props.isSelected
 * @param {() => void} props.onClick
 */
function ScheduleCard({ schedule, isSelected, onClick }) {
  const start = formatDateTime(schedule.startsAt);
  const end = formatDateTime(schedule.endsAt);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={`w-full rounded-[8px] border-2 p-3 text-left transition-all ${
        isSelected
          ? 'bg-[#ECFEFF] border-[#0891B2] shadow-[0_0_0_3px_rgba(8,145,178,0.12)]'
          : 'bg-white border-[#E5E7EB] hover:border-[#67E8F9] hover:shadow-[0_1px_4px_rgba(8,145,178,0.08)]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-[12px] font-black ${isSelected ? 'text-[#0891B2]' : 'text-[#1F2328]'}`}
        >
          {start.dateLabel} ({start.dayLabel}) {start.timeLabel}–{end.timeLabel}
        </span>
        {isSelected && (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: ACCENT }}
          >
            <svg
              width="8"
              height="6"
              viewBox="0 0 8 6"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M1 3l2 2 4-4" />
            </svg>
          </div>
        )}
      </div>
      <div className="text-[11px] font-semibold text-[#1F2328]">
        {schedule.counselorName}
        {schedule.counselorDepartmentName && (
          <span className="text-[#9AA0A6] font-normal"> · {schedule.counselorDepartmentName}</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#656D76]">
        {schedule.location && <span>{schedule.location}</span>}
        <span className="font-bold" style={{ color: ACCENT }}>
          잔여 {schedule.remainingCapacity}
        </span>
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * 상담 신청 4단계 흐름 (동의 → 유형 선택 → 일정 선택 → 완료).
 *
 * @param {Object} props
 * @param {() => void} props.onComplete
 * @param {() => void} [props.onBack]
 */
export default function CounselingApply({ onComplete, onBack }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const {
    data: counselingTypes = [],
    isLoading: isCounselingTypesLoading,
    isError: hasCounselingTypesError,
    isFetching: isCounselingTypesFetching,
    refetch: refetchCounselingTypes,
  } = useQuery({
    queryKey: ['counselingTypes'],
    queryFn: fetchCounselingTypes,
    // 서버는 활성 유형 전체(DIRECT·CENTER)를 내려주지만, 학생 온라인 신청은 현재 DIRECT만 제공한다.
    // CENTER(센터 접수)는 후순위라 화면에서 걸러낸다. 이 필터는 UX 차단이고 최종 방어는 백엔드가 한다.
    select: (types) => types.filter((type) => type.applicationRoute === APPLICATION_ROUTE.DIRECT),
  });

  // Step 0 — consent
  const [agreed, setAgreed] = useState(false);

  // Step 1 — type
  const [selectedType, setSelectedType] = useState(null);
  const HAS_CONFLICT = false; // set true to demo duplicate error

  const chosenType = counselingTypes.find((type) => type.typeCode === selectedType);

  // Step 2 — schedule. 유형별 실제 예약 가능 일정만 조회한다(서버가 이미 필터링해서 내려줌).
  const {
    data: schedules = [],
    isLoading: isSchedulesLoading,
    isError: hasSchedulesError,
    isFetching: isSchedulesFetching,
    refetch: refetchSchedules,
  } = useQuery({
    queryKey: ['availableSchedules', chosenType?.counselingTypeId],
    queryFn: () => fetchAvailableSchedules(chosenType.counselingTypeId),
    enabled: !!chosenType?.counselingTypeId,
  });

  const [counselorFilter, setCounselorFilter] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [memo, setMemo] = useState('');
  const [submitConfirm, setSubmitConfirm] = useState(false);
  // 메모 입력값 검증 오류와 API 제출 실패 오류를 분리한다.
  // memoError는 메모 필드에만 연결하고(aria-invalid/aria-describedby),
  // submitError(일정 만료 등 제출 실패)는 별도 알림 영역에 표시해 메모 필드에 잘못 묶이지 않게 한다.
  const [memoError, setMemoError] = useState('');
  const [submitError, setSubmitError] = useState('');
  // 서버 생성 응답에는 상담사명·일시·장소·유형명이 없어서, 완료 화면에 표시할 값을
  // 제출 시점의 chosenType/chosenSlot에서 미리 스냅샷해 둔다. 제출 후 availableSchedules를
  // 무효화하면 방금 예약한 슬롯이 목록에서 빠져 chosenSlot이 사라지기 때문이다.
  const [completionInfo, setCompletionInfo] = useState(null);
  const [createdReservation, setCreatedReservation] = useState(null);

  const createReservationMutation = useMutation({
    mutationFn: createCounselingReservation,
    onSuccess: (reservation) => {
      setCreatedReservation(reservation);
      queryClient.invalidateQueries({ queryKey: ['counselingReservations'] });
      queryClient.invalidateQueries({ queryKey: ['availableSchedules'] });
      setStep(3);
    },
    onError: (error) => {
      setSubmitError(getSubmitErrorMessage(error));
      if (error?.code === COUNSELING_RESERVATION_ERROR_CODE.SCHEDULE_NOT_AVAILABLE) {
        setSelectedSlot(null);
        queryClient.invalidateQueries({ queryKey: ['availableSchedules'] });
      }
    },
  });

  // Helpers
  const STEPS = ['동의', '유형 선택', '일정 선택', '신청 완료'];

  // 실제 일정 목록에서 상담사를 중복 없이 뽑아 필터 옵션으로 쓴다.
  const counselorOptions = useMemo(() => {
    const map = new Map();
    schedules.forEach((s) => {
      const key = counselorKeyOf(s);
      if (!map.has(key)) {
        map.set(key, { key, name: s.counselorName, dept: s.counselorDepartmentName });
      }
    });
    return Array.from(map.values());
  }, [schedules]);

  const filteredSchedules = useMemo(
    () =>
      counselorFilter
        ? schedules.filter((s) => counselorKeyOf(s) === counselorFilter)
        : schedules,
    [schedules, counselorFilter],
  );

  const chosenSlot = schedules.find((s) => s.scheduleId === selectedSlot);

  const handleFinalSubmit = () => {
    // 이미 요청이 진행 중이면 중복 제출을 막는다.
    if (createReservationMutation.isPending) {
      return;
    }
    // 다이얼로그가 열린 사이 일정이 갱신돼 선택 슬롯이 사라졌을 수 있다.
    // (다른 학생이 먼저 예약해 refetch로 목록에서 빠지는 경우 등)
    // 이때는 신청을 진행하지 않고 다이얼로그를 닫은 뒤 선택을 초기화한다.
    if (!chosenType || !chosenSlot || memo.trim() === '') {
      setSubmitConfirm(false);
      if (!chosenSlot) {
        setSelectedSlot(null);
      }
      return;
    }

    setCompletionInfo({
      typeName: chosenType.typeName,
      counselorName: chosenSlot.counselorName,
      startsAt: chosenSlot.startsAt,
      location: chosenSlot.location,
    });
    setSubmitConfirm(false);
    createReservationMutation.mutate({
      counselingTypeId: chosenType.counselingTypeId,
      scheduleId: chosenSlot.scheduleId,
      requestContent: memo.trim(),
      // TODO(consent): 공통 동의 API와 정책 확정 후 consentId를 연동한다.
    });
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '학생상담' }, { label: '상담 신청' }]}
        title="상담 신청"
        subtitle="상담 유형을 선택하고 가능한 일정을 예약하세요."
        accentColor={ACCENT}
        actions={
          onBack && (
            <Button size="sm" variant="outline" onClick={onBack}>
              ← 뒤로
            </Button>
          )
        }
      />

      {/* Stepper */}
      <div className="mb-6">
        <Stepper steps={STEPS} current={step} accentColor={ACCENT} />
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STEP 0 — Consent */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {step === 0 && (
        <div className="max-w-[640px] flex flex-col gap-4">
          {/* Consent card */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">상담 정보 처리 동의</h2>
              <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E]">
                필수
              </span>
            </div>
            <div className="px-5 py-5 text-[13px] leading-relaxed text-[#444D56]">
              <p className="font-bold text-[#1F2328] mb-3">한국대학교 학생상담 정보 처리 방침</p>
              <p className="mb-3">
                한국대학교(이하 &quot;학교&quot;)는 학생의 심리적 건강 증진과 성장 지원을 목적으로
                상담 서비스를 운영하며, 이 과정에서 수집되는 개인정보를 다음과 같이 처리합니다.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-[12px] text-[#656D76] mb-4">
                <li>
                  <strong className="text-[#1F2328]">수집 항목:</strong> 이름, 학번, 학과, 연락처,
                  상담 내용 및 기록
                </li>
                <li>
                  <strong className="text-[#1F2328]">이용 목적:</strong> 상담 서비스 제공, 사례
                  관리, 위기 개입, 교육통계 분석(비식별화)
                </li>
                <li>
                  <strong className="text-[#1F2328]">보유 기간:</strong> 졸업 후 5년간 보관 후 파기
                </li>
                <li>
                  <strong className="text-[#1F2328]">비밀보장 예외:</strong> 자해·타해 위험, 아동
                  학대 신고 의무, 법원 명령이 있는 경우
                </li>
                <li>
                  <strong className="text-[#1F2328]">제3자 제공:</strong> 원칙적으로 외부 제공 불가.
                  위기 상황 시 보호자·응급기관 연락 가능
                </li>
              </ol>
              <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[6px] px-4 py-3 text-[12px] text-[#164E63]">
                위 내용을 충분히 읽고 이해하였으며, 상담 정보 수집 및 처리에 동의합니다. 동의를
                거부할 권리가 있으나, 거부 시 상담 서비스 이용이 제한됩니다.
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 rounded-[4px] flex-shrink-0"
                  style={{ accentColor: ACCENT }}
                />
                <span className="text-[13px] font-semibold text-[#1F2328]">
                  위 상담 정보 처리 방침을 읽었으며 이에 동의합니다.
                </span>
              </label>
            </div>
          </div>

          {/* Consent history */}
          <div className="px-4 py-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
            <p className="text-[11px] font-semibold text-[#9AA0A6] mb-1.5 uppercase tracking-wide">
              동의 이력
            </p>
            <div className="flex flex-col gap-1">
              {[
                { ver: 'v2.1', date: '2026-03-01 09:22', note: '현재 버전' },
                { ver: 'v2.0', date: '2025-09-01 10:05', note: '이전 동의' },
              ].map((h) => (
                <div key={h.ver} className="flex items-center gap-3 text-[11px] text-[#9AA0A6]">
                  <span className="font-mono font-bold">{h.ver}</span>
                  <span>{h.date}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#E5E7EB] text-[#656D76]">
                    {h.note}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              size="md"
              disabled={!agreed}
              style={agreed ? { background: ACCENT } : {}}
              onClick={() => setStep(1)}
            >
              동의하고 다음 →
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STEP 1 — Type & Counselor */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {/* Conflict error */}
          {HAS_CONFLICT && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-5 py-4 flex items-start gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="#CF222E"
                className="flex-shrink-0 mt-0.5"
              >
                <circle cx="8" cy="8" r="7" />
                <path
                  d="M5 5l6 6M11 5l-6 6"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <p className="text-[13px] font-bold text-[#7F1D1D]">중복 신청 불가</p>
                <p className="text-[12px] text-[#CF222E] mt-0.5">
                  이미 진행 중인 같은 유형의 상담이 있어 신청할 수 없습니다.
                </p>
              </div>
            </div>
          )}

          <div className="max-w-[640px]">
            {/* Type selection */}
            <div className="flex flex-col gap-3" aria-live="polite">
              <h3 className="text-[13px] font-bold text-[#1F2328] flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                  style={{ background: ACCENT }}
                >
                  1
                </div>
                상담 유형 선택
              </h3>
              {isCounselingTypesLoading && <SkeletonLoader rows={3} cols={2} />}
              {hasCounselingTypesError && (
                <div
                  role="alert"
                  className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-4 py-4"
                >
                  <p className="text-[13px] font-bold text-[#7F1D1D]">
                    상담 유형을 불러오지 못했습니다.
                  </p>
                  <p className="text-[12px] text-[#CF222E] mt-1 mb-3">
                    잠시 후 다시 시도해 주세요.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={isCounselingTypesFetching}
                    onClick={() => refetchCounselingTypes()}
                  >
                    다시 시도
                  </Button>
                </div>
              )}
              {!isCounselingTypesLoading &&
                !hasCounselingTypesError &&
                counselingTypes.length === 0 && (
                  <EmptyState
                    message="신청 가능한 상담 유형이 없습니다."
                    sub="상담센터에 문의해 주세요."
                  />
                )}
              {counselingTypes.map((type) => {
                const isSelected = selectedType === type.typeCode;
                return (
                  <button
                    key={type.typeCode}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedType(type.typeCode);
                      setCounselorFilter(null);
                      setSelectedSlot(null);
                    }}
                    className={`w-full text-left rounded-[10px] border-2 p-4 transition-all ${isSelected ? 'bg-[#ECFEFF] shadow-[0_0_0_1px_rgba(8,145,178,0.2)]' : 'bg-white border-[#E5E7EB] hover:border-[#A5F3FC]'}`}
                    style={isSelected ? { borderColor: ACCENT } : {}}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p
                        className={`text-[13px] font-bold leading-snug ${isSelected ? 'text-[#0E7490]' : 'text-[#1F2328]'}`}
                      >
                        {type.typeName}
                      </p>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ml-2 transition-colors ${isSelected ? '' : 'border-[#D1D5DB]'}`}
                        style={isSelected ? { background: ACCENT, borderColor: ACCENT } : {}}
                      >
                        {isSelected && (
                          <svg
                            width="8"
                            height="6"
                            viewBox="0 0 8 6"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M1 3l2 2 4-4" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: isSelected ? `${ACCENT}18` : '#F3F4F6',
                          color: isSelected ? ACCENT : '#656D76',
                        }}
                      >
                        신청 경로: {APPLICATION_ROUTE_LABEL[type.applicationRoute] ?? type.applicationRoute}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: isSelected ? `${ACCENT}18` : '#F3F4F6',
                          color: isSelected ? ACCENT : '#656D76',
                        }}
                      >
                        상담 방식: {type.counselingMethod}
                      </span>
                    </div>
                    {type.precedingProcedure && (
                      <p className="text-[11px] text-[#656D76] leading-snug mt-2.5">
                        선행 절차: {type.precedingProcedure}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 justify-between">
            <Button size="sm" variant="secondary" onClick={() => setStep(0)}>
              ← 이전
            </Button>
            <Button
              size="md"
              disabled={!selectedType || HAS_CONFLICT}
              style={selectedType && !HAS_CONFLICT ? { background: ACCENT } : {}}
              onClick={() => setStep(2)}
            >
              다음 — 일정 선택 →
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STEP 2 — Schedule */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          {/* Type summary */}
          <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[8px] px-5 py-3 flex items-center gap-4 text-[12px]">
            <span className="font-bold text-[#0E7490]">{chosenType?.typeName}</span>
            <span className="text-[#0E7490]">예약 가능한 일정 중 하나를 선택하세요.</span>
          </div>

          {/* BE가 counselingTypeId를 아직 내려주지 않는 경우(BLOCKED 상태) */}
          {!chosenType?.counselingTypeId && (
            <EmptyState
              message="이 상담 유형은 아직 일정 조회를 사용할 수 없습니다."
              sub="상담센터에 문의하거나 다른 유형을 선택해 주세요."
            />
          )}

          {chosenType?.counselingTypeId && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-3 flex-wrap">
                <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
                <h2 className="text-[14px] font-bold text-[#1F2328]">예약 가능한 일정</h2>

                {/* 상담자 필터: 실제 조회된 일정에서 뽑은 상담자 목록만 사용한다 */}
                {counselorOptions.length > 0 && (
                  <select
                    aria-label="상담자 필터"
                    value={counselorFilter ?? ''}
                    onChange={(e) => setCounselorFilter(e.target.value || null)}
                    className="ml-auto text-[12px] border border-[#E5E7EB] rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-[#0891B2]"
                  >
                    <option value="">전체 상담자</option>
                    {counselorOptions.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.name}
                        {c.dept ? ` · ${c.dept}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-5">
                {isSchedulesLoading && <SkeletonLoader rows={3} cols={2} />}

                {hasSchedulesError && (
                  <div
                    role="alert"
                    className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-4 py-4"
                  >
                    <p className="text-[13px] font-bold text-[#7F1D1D]">
                      일정을 불러오지 못했습니다.
                    </p>
                    <p className="text-[12px] text-[#CF222E] mt-1 mb-3">
                      잠시 후 다시 시도해 주세요.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={isSchedulesFetching}
                      onClick={() => refetchSchedules()}
                    >
                      다시 시도
                    </Button>
                  </div>
                )}

                {!isSchedulesLoading && !hasSchedulesError && filteredSchedules.length === 0 && (
                  <EmptyState
                    message="예약 가능한 일정이 없습니다."
                    sub="다른 상담 유형이나 상담자를 확인해 주세요."
                  />
                )}

                {!isSchedulesLoading && !hasSchedulesError && filteredSchedules.length > 0 && (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredSchedules.map((schedule) => (
                      <ScheduleCard
                        key={schedule.scheduleId}
                        schedule={schedule}
                        isSelected={selectedSlot === schedule.scheduleId}
                        onClick={() => {
                          setSelectedSlot((prev) =>
                            prev === schedule.scheduleId ? null : schedule.scheduleId,
                          );
                          setSubmitError('');
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected slot banner */}
          {chosenSlot && (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] px-5 py-3 flex items-center gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#1A7F37"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="8" cy="8" r="7" fill="#DCFCE7" />
                <path d="M5 8l2 2 4-4" />
              </svg>
              <span className="text-[13px] font-bold text-[#14532D]">
                선택: {formatScheduleLabel(chosenSlot.startsAt)} · {chosenSlot.counselorName}
                {chosenSlot.location ? ` · ${chosenSlot.location}` : ''}
              </span>
            </div>
          )}

          {/* Memo */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
            <label htmlFor="counseling-memo" className="text-[13px] font-semibold text-[#1F2328] mb-1.5 block">
              상담 희망 내용 <span className="text-[#CF222E] font-normal text-[12px]">(필수)</span>
            </label>
            <textarea
              id="counseling-memo"
              value={memo}
              onChange={(e) => {
                setMemo(e.target.value);
                setMemoError('');
                setSubmitError('');
              }}
              placeholder="상담에서 다루고 싶은 내용이나 어려운 점을 간략히 작성해 주세요."
              rows={4}
              required
              aria-invalid={!!memoError}
              aria-describedby={memoError ? 'counseling-memo-error' : undefined}
              className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#0891B2] placeholder:text-[#9AA0A6]"
            />
            <p className="text-[11px] text-[#9AA0A6] mt-1.5">
              입력한 내용은 담당 상담사만 열람합니다.
            </p>
            {memoError && (
              <p id="counseling-memo-error" role="alert" className="text-[12px] text-[#CF222E] mt-2 font-semibold">
                {memoError}
              </p>
            )}
          </div>

          {/* 제출 실패(일정 만료 등)는 메모 필드가 아니라 별도 알림 영역에 표시한다. */}
          {submitError && (
            <div
              role="alert"
              className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-4 py-3 text-[13px] font-semibold text-[#CF222E]"
            >
              {submitError}
            </div>
          )}

          <div className="flex gap-2 justify-between">
            <Button size="sm" variant="secondary" onClick={() => setStep(1)}>
              ← 이전
            </Button>
            <Button
              size="md"
              disabled={!chosenSlot || createReservationMutation.isPending}
              loading={createReservationMutation.isPending}
              style={chosenSlot ? { background: ACCENT } : {}}
              onClick={() => {
                if (!chosenSlot) {
                  return;
                }
                if (memo.trim() === '') {
                  setMemoError('상담 희망 내용을 입력해 주세요.');
                  return;
                }
                setSubmitConfirm(true);
              }}
            >
              신청 완료 →
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STEP 3 — Complete */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="max-w-[560px]">
          {/* Completion card */}
          <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden">
            {/* Top accent strip */}
            <div className="h-1.5 w-full" style={{ background: ACCENT }} />
            <div className="p-8 flex flex-col items-center text-center gap-5">
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: '#CFFAFE' }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2C7.373 2 2 7.373 2 14s5.373 12 12 12 12-5.373 12-12S20.627 2 14 2z" />
                  <path d="M9 14l3 3 7-7" />
                </svg>
              </div>

              <div>
                <h2 className="text-[20px] font-black text-[#1F2328] mb-1">상담 신청 완료</h2>
                <p className="text-[13px] text-[#656D76]">
                  담당 상담사의 승인 후 예약이 확정됩니다.
                </p>
              </div>

              {/* Reservation info */}
              <div className="w-full bg-[#F9FAFB] rounded-[10px] border border-[#E5E7EB] divide-y divide-[#F3F4F6]">
                {[
                  {
                    label: '예약번호',
                    value: (
                      <span className="font-mono font-black text-[#0891B2]">
                        {createdReservation.reservationId}
                      </span>
                    ),
                  },
                  {
                    label: '상태',
                    value: (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#0969DA]">
                        {COUNSELING_RESERVATION_STATUS_LABEL[createdReservation.reservationStatus]}
                      </span>
                    ),
                  },
                  { label: '상담유형', value: completionInfo.typeName },
                  { label: '상담사', value: completionInfo.counselorName },
                  { label: '일시', value: formatScheduleLabel(completionInfo.startsAt) },
                  { label: '장소', value: completionInfo.location },
                ].map((row) => (
                  <div key={row.label} className="flex items-center px-5 py-3">
                    <span className="w-24 text-[12px] text-[#656D76] flex-shrink-0">
                      {row.label}
                    </span>
                    <span className="text-[13px] font-semibold text-[#1F2328]">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#F0FDFE] border border-[#A5F3FC] rounded-[8px] px-4 py-3 w-full text-left">
                <p className="text-[12px] text-[#164E63]">
                  📱 알림톡으로 예약 확정 안내가 발송됩니다. 상담 당일 취소는 최소{' '}
                  <strong>1일 전</strong>까지 가능합니다.
                </p>
              </div>

              <Button
                size="md"
                className="w-full justify-center"
                style={{ background: ACCENT }}
                onClick={onComplete}
              >
                내 상담 예약 보기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={submitConfirm}
        title="상담 신청 확인"
        message={`${chosenSlot ? formatScheduleLabel(chosenSlot.startsAt) : ''} · ${chosenSlot?.counselorName ?? ''}\n\n위 일정으로 상담을 신청하시겠습니까?`}
        confirmLabel="신청하기"
        onConfirm={handleFinalSubmit}
        onCancel={() => setSubmitConfirm(false)}
      />
    </div>
  );
}
