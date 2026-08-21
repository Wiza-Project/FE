import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closeCounselorSchedule,
  createCounselorSchedule,
  fetchCounselorSchedules,
  updateCounselorSchedule,
} from '@/api/counsel';
import { ApiError } from '@/api/client';
import { Button, Drawer, Modal, toast } from '@/components/common';
import { COUNSELOR_SCHEDULE_STATUS, COUNSELOR_SCHEDULE_STATUS_LABEL } from '@/constants/domain';

const ACCENT = '#1F2937';
const DAYS = ['월', '화', '수', '목', '금'];
const HALF_COUNT = 18;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SCHEDULE_QUERY_KEY = ['counselorSchedules'];
const CLOSE_MODAL_DESCRIPTION_ID = 'counselor-schedule-close-description';

function pad(value) {
  return String(value).padStart(2, '0');
}

function halfToTime(half) {
  const hour = 9 + Math.floor(half / 2);
  const minute = half % 2 === 0 ? '00' : '30';
  return `${pad(hour)}:${minute}`;
}

function getKstCalendarDate(value = new Date()) {
  const date = new Date(value);
  const kstDate = new Date(date.getTime() + KST_OFFSET_MS);
  return new Date(Date.UTC(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate()));
}

function addKstDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function getKstWeekStart(date = getKstCalendarDate()) {
  return addKstDays(date, -((date.getUTCDay() + 6) % 7));
}

function dateLabel(date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function instantToKstParts(instant) {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return null;
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
    weekday: (kst.getUTCDay() + 6) % 7,
    minute: kst.getUTCHours() * 60 + kst.getUTCMinutes(),
  };
}

function instantToKstDateTimeLocal(instant) {
  const parts = instantToKstParts(instant);
  if (!parts) return '';
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(Math.floor(parts.minute / 60))}:${pad(parts.minute % 60)}`;
}

function instantToKstDate(instant) {
  return instantToKstDateTimeLocal(instant).slice(0, 10);
}

function kstDateTimeLocalToInstant(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) -
      KST_OFFSET_MS,
  );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function kstDeadlineDateToInstant(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999) - KST_OFFSET_MS,
  );

  // Date 객체의 자동 보정으로 존재하지 않는 날짜가 전송되는 것을 막는다.
  if (instantToKstDate(date.toISOString()) !== value) return null;
  return date.toISOString();
}

function getPreviousKstDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T/.exec(value);
  if (!match) return '';
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)) - DAY_MS);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function getTodayKstDate() {
  const today = getKstCalendarDate();
  return `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;
}

function formatKstDateTime(instant) {
  return instantToKstDateTimeLocal(instant).replace('T', ' ') || '-';
}

function buildDateTimeLocal(date, half) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${halfToTime(half)}`;
}

function getErrorMessage(error, action) {
  if (!(error instanceof ApiError))
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  if (error.code === 'A004') return '이 일정에 접근할 권한이 없습니다.';
  if (error.code === 'C002') return '요청한 일정을 찾을 수 없습니다. 목록을 새로고침해 주세요.';
  if (error.code === 'S002')
    return error.message || `일정 겹침, 예약 이력 또는 상태 때문에 ${action}할 수 없습니다.`;
  if (error.code === 'C001') return error.message || '입력값을 다시 확인해 주세요.';
  return error.message || `${action} 중 오류가 발생했습니다.`;
}

function emptyForm(date, start = 0, end = 2) {
  return {
    counselingTypeId: '',
    startsAt: buildDateTimeLocal(date, start),
    endsAt: buildDateTimeLocal(date, end),
    capacity: '1',
    bookingDeadline: '',
    location: '',
  };
}

function formFromSchedule(schedule) {
  return {
    counselingTypeId: String(schedule.counselingTypeId ?? ''),
    startsAt: instantToKstDateTimeLocal(schedule.startsAt),
    endsAt: instantToKstDateTimeLocal(schedule.endsAt),
    capacity: String(schedule.capacity ?? ''),
    bookingDeadline: schedule.bookingDeadline
      ? instantToKstDate(schedule.bookingDeadline)
      : '',
    location: schedule.location ?? '',
  };
}

function validateSchedule(form) {
  const counselingTypeId = Number(form.counselingTypeId);
  const capacity = Number(form.capacity);
  const startsAt = kstDateTimeLocalToInstant(form.startsAt);
  const endsAt = kstDateTimeLocalToInstant(form.endsAt);
  const bookingDeadline = form.bookingDeadline
    ? kstDeadlineDateToInstant(form.bookingDeadline)
    : null;
  const location = form.location.trim();

  if (!Number.isInteger(counselingTypeId) || counselingTypeId <= 0)
    return { error: '상담 유형 ID는 1 이상의 정수여야 합니다.' };
  if (!startsAt || new Date(startsAt).getTime() <= Date.now())
    return { error: '시작 시각은 현재 시각 이후여야 합니다.' };
  if (!endsAt || new Date(endsAt).getTime() <= new Date(startsAt).getTime())
    return { error: '종료 시각은 시작 시각보다 뒤여야 합니다.' };
  if (!Number.isInteger(capacity) || capacity <= 0)
    return { error: '정원은 1 이상의 정수여야 합니다.' };
  if (form.bookingDeadline) {
    if (!bookingDeadline || new Date(bookingDeadline).getTime() <= Date.now())
      return { error: '예약 마감일 종료 시각(한국 시간)이 이미 지났습니다.' };
    if (form.bookingDeadline >= form.startsAt.slice(0, 10))
      return { error: '예약 마감일은 상담 시작일의 전날까지 선택할 수 있습니다.' };
  }
  if (location.length > 300) return { error: '장소는 300자 이하여야 합니다.' };

  return {
    request: {
      counselingTypeId,
      startsAt,
      endsAt,
      capacity,
      bookingDeadline,
      location: location || null,
    },
  };
}

function ScheduleForm({ form, setForm, formError }) {
  const updateField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const bookingDeadlineMax = getPreviousKstDate(form.startsAt);
  const bookingDeadlineMin = getTodayKstDate();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label
          className="mb-1.5 block text-[11px] font-semibold text-[#656D76]"
          htmlFor="counselingTypeId"
        >
          상담 유형 ID <span className="text-[#CF222E]">*</span>
        </label>
        <input
          id="counselingTypeId"
          type="number"
          min="1"
          step="1"
          value={form.counselingTypeId}
          onChange={(event) => updateField('counselingTypeId', event.target.value)}
          className="h-9 w-full rounded-[6px] border border-[#E5E7EB] px-3 text-[13px] focus:border-[#374151] focus:outline-none"
          required
        />
        <p className="mt-1 text-[10px] text-[#9AA0A6]">
          상담 유형 조회 계약이 없어 ID를 직접 입력합니다.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="mb-1.5 block text-[11px] font-semibold text-[#656D76]"
            htmlFor="startsAt"
          >
            시작 시각 (한국 시간) <span className="text-[#CF222E]">*</span>
          </label>
          <input
            id="startsAt"
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) => updateField('startsAt', event.target.value)}
            className="h-9 w-full rounded-[6px] border border-[#E5E7EB] px-2 text-[13px] focus:border-[#374151] focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-[#656D76]" htmlFor="endsAt">
            종료 시각 (한국 시간) <span className="text-[#CF222E]">*</span>
          </label>
          <input
            id="endsAt"
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) => updateField('endsAt', event.target.value)}
            className="h-9 w-full rounded-[6px] border border-[#E5E7EB] px-2 text-[13px] focus:border-[#374151] focus:outline-none"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="mb-1.5 block text-[11px] font-semibold text-[#656D76]"
            htmlFor="capacity"
          >
            정원 <span className="text-[#CF222E]">*</span>
          </label>
          <input
            id="capacity"
            type="number"
            min="1"
            step="1"
            value={form.capacity}
            onChange={(event) => updateField('capacity', event.target.value)}
            className="h-9 w-full rounded-[6px] border border-[#E5E7EB] px-3 text-[13px] focus:border-[#374151] focus:outline-none"
            required
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-[11px] font-semibold text-[#656D76]"
            htmlFor="bookingDeadline"
          >
            예약 마감일 (한국 시간)
          </label>
          <input
            id="bookingDeadline"
            type="date"
            min={bookingDeadlineMin}
            max={bookingDeadlineMax || undefined}
            value={form.bookingDeadline}
            onChange={(event) => updateField('bookingDeadline', event.target.value)}
            className="h-9 w-full rounded-[6px] border border-[#E5E7EB] px-2 text-[13px] focus:border-[#374151] focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold text-[#656D76]" htmlFor="location">
          장소
        </label>
        <input
          id="location"
          type="text"
          maxLength="300"
          value={form.location}
          onChange={(event) => updateField('location', event.target.value)}
          className="h-9 w-full rounded-[6px] border border-[#E5E7EB] px-3 text-[13px] focus:border-[#374151] focus:outline-none"
        />
        <p className="mt-1 text-right text-[10px] text-[#9AA0A6]">{form.location.length}/300</p>
      </div>
      <UnsupportedControls />
      {formError && (
        <p
          className="rounded-[6px] border border-[#FECACA] bg-[#FEE2E2] p-2.5 text-[11px] font-semibold text-[#CF222E]"
          role="alert"
        >
          ⚠ {formError}
        </p>
      )}
    </div>
  );
}

function UnsupportedControls() {
  const notify = () =>
    toast('백엔드 연동 준비 중인 기능입니다. 현재 일정에는 저장되지 않습니다.', 'info');
  return (
    <div className="flex flex-col gap-4 border-t border-[#E5E7EB] pt-4">
      <p className="text-[11px] font-semibold text-[#656D76]">연동 준비 중 (현재 저장되지 않음)</p>
      <div>
        <span className="mb-1.5 block text-[11px] font-semibold text-[#656D76]">상담 방식</span>
        <div className="flex gap-2">
          {['대면', '온라인'].map((method) => (
            <button
              key={method}
              type="button"
              onClick={notify}
              className="h-9 flex-1 rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] text-[12px] text-[#9AA0A6]"
            >
              {method}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-[12px] font-semibold text-[#9AA0A6]">
        <input type="checkbox" disabled /> 휴무 처리{' '}
        <span className="text-[10px] font-normal">(예약 불가 표시)</span>
      </label>
      <label className="flex items-center gap-2 text-[12px] font-semibold text-[#9AA0A6]">
        <input type="checkbox" disabled /> 반복 등록
      </label>
    </div>
  );
}

function scheduleFitsGrid(schedule, weekStart) {
  const start = instantToKstParts(schedule.startsAt);
  const end = instantToKstParts(schedule.endsAt);
  if (
    !start ||
    !end ||
    start.year !== end.year ||
    start.month !== end.month ||
    start.day !== end.day
  )
    return false;
  const date = new Date(Date.UTC(start.year, start.month - 1, start.day));
  const dayIndex = Math.round((date.getTime() - weekStart.getTime()) / DAY_MS);
  return (
    dayIndex >= 0 &&
    dayIndex < 5 &&
    start.weekday < 5 &&
    start.minute >= 540 &&
    end.minute <= 1080 &&
    start.minute % 30 === 0 &&
    end.minute % 30 === 0 &&
    end.minute > start.minute
  );
}

function ActionButtons({ schedule, onEdit, onClose, isClosing, compact = false }) {
  const canEdit = schedule.status === COUNSELOR_SCHEDULE_STATUS.OPEN && !schedule.hasReservation;
  const canClose = schedule.status === COUNSELOR_SCHEDULE_STATUS.OPEN;
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'mt-1' : 'mt-3'}`}>
      <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => onEdit(schedule)}>
        {canEdit
          ? '수정'
          : schedule.hasReservation
            ? '예약 이력으로 수정 불가'
            : '마감되어 수정 불가'}
      </Button>
      <Button
        variant="danger"
        size="sm"
        disabled={!canClose || isClosing}
        onClick={() => onClose(schedule)}
      >
        마감
      </Button>
    </div>
  );
}

export default function MySchedule() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => getKstWeekStart());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [form, setForm] = useState(() => emptyForm(getKstWeekStart()));
  const [formError, setFormError] = useState('');
  const [bookedWarn, setBookedWarn] = useState(null);
  const [closingSchedule, setClosingSchedule] = useState(null);
  const [actionError, setActionError] = useState('');
  const dragDay = useRef(null);
  const dragStartHalf = useRef(null);
  const dragEndHalf = useRef(null);
  const [dragRange, setDragRange] = useState(null);
  const weekDates = useMemo(
    () => Array.from({ length: 5 }, (_, index) => addKstDays(weekStart, index)),
    [weekStart],
  );
  const {
    data: schedules = [],
    isLoading,
    error,
  } = useQuery({ queryKey: SCHEDULE_QUERY_KEY, queryFn: fetchCounselorSchedules });
  const invalidateSchedules = () => queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
  const createMutation = useMutation({
    mutationFn: createCounselorSchedule,
    onSuccess: () => {
      invalidateSchedules();
      setDrawerOpen(false);
      toast('일정이 등록되었습니다.', 'success');
    },
    onError: (mutationError) => setFormError(getErrorMessage(mutationError, '등록')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ scheduleId, request }) => updateCounselorSchedule(scheduleId, request),
    onSuccess: () => {
      invalidateSchedules();
      setDrawerOpen(false);
      setEditingSchedule(null);
      toast('일정이 수정되었습니다.', 'success');
    },
    onError: (mutationError) => setFormError(getErrorMessage(mutationError, '수정')),
  });
  const closeMutation = useMutation({
    mutationFn: closeCounselorSchedule,
    onSuccess: () => {
      invalidateSchedules();
      setClosingSchedule(null);
      setActionError('');
      toast('일정이 마감되었습니다.', 'success');
    },
    onError: (mutationError) => setActionError(getErrorMessage(mutationError, '마감')),
  });
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const visibleSchedules = schedules.filter((schedule) => scheduleFitsGrid(schedule, weekStart));
  const outsideSchedules = schedules.filter((schedule) => {
    const parts = instantToKstParts(schedule.startsAt);
    if (!parts) return false;
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    return (
      date.getTime() >= weekStart.getTime() &&
      date.getTime() < addKstDays(weekStart, 7).getTime() &&
      !scheduleFitsGrid(schedule, weekStart)
    );
  });
  const slotGrid = useMemo(() => {
    const grid = {};
    visibleSchedules.forEach((schedule) => {
      const start = instantToKstParts(schedule.startsAt);
      const end = instantToKstParts(schedule.endsAt);
      const date = new Date(Date.UTC(start.year, start.month - 1, start.day));
      const day = Math.round((date.getTime() - weekStart.getTime()) / DAY_MS);
      const startHalf = (start.minute - 540) / 30;
      const endHalf = (end.minute - 540) / 30;
      for (let half = startHalf; half < endHalf; half += 1)
        grid[`${day}-${half}`] = { schedule, startHalf, endHalf };
    });
    return grid;
  }, [visibleSchedules, weekStart]);

  const openEditDrawer = (schedule) => {
    if (schedule.status !== 'OPEN' || schedule.hasReservation) {
      toast(
        schedule.hasReservation
          ? '예약 이력이 있는 일정은 수정할 수 없습니다.'
          : '마감된 일정은 수정할 수 없습니다.',
        'info',
      );
      return;
    }
    setEditingSchedule(schedule);
    setForm(formFromSchedule(schedule));
    setFormError('');
    setDrawerOpen(true);
  };
  const handleScheduleClick = (schedule) => {
    if (schedule.status === COUNSELOR_SCHEDULE_STATUS.OPEN && !schedule.hasReservation) {
      openEditDrawer(schedule);
      return;
    }
    setBookedWarn(schedule);
  };
  const openCloseModal = (schedule) => {
    if (schedule.status !== 'OPEN') {
      toast('이미 마감된 일정입니다.', 'info');
      return;
    }
    setActionError('');
    setClosingSchedule(schedule);
  };
  const handleMouseDown = (day, half) => {
    dragDay.current = day;
    dragStartHalf.current = half;
    dragEndHalf.current = half + 1;
    setDragRange({ day, start: half, end: half + 1 });
  };
  const handleMouseEnter = (day, half) => {
    if (dragDay.current !== day || dragStartHalf.current === null) return;
    dragEndHalf.current = half + 1;
    setDragRange({
      day,
      start: Math.min(dragStartHalf.current, half),
      end: Math.max(dragStartHalf.current, half) + 1,
    });
  };
  useEffect(() => {
    const handleMouseUp = () => {
      if (
        dragDay.current !== null &&
        dragStartHalf.current !== null &&
        dragEndHalf.current !== null
      ) {
        const start = Math.min(dragStartHalf.current, dragEndHalf.current - 1);
        const end = Math.max(dragStartHalf.current, dragEndHalf.current - 1) + 1;
        setEditingSchedule(null);
        setForm(emptyForm(weekDates[dragDay.current], start, end));
        setFormError('');
        setDragRange(null);
        setDrawerOpen(true);
      }
      dragDay.current = null;
      dragStartHalf.current = null;
      dragEndHalf.current = null;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [weekDates]);
  const handleSubmit = (event) => {
    event.preventDefault();
    const result = validateSchedule(form);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setFormError('');
    if (editingSchedule)
      updateMutation.mutate({ scheduleId: editingSchedule.scheduleId, request: result.request });
    else createMutation.mutate(result.request);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">내 일정</h1>
          <p className="mt-0.5 text-[12px] text-[#9AA0A6]">
            가능 시간대를 드래그로 선택해 슬롯을 등록하세요. 모든 시각은 한국 시간입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart((previous) => addKstDays(previous, -7))}
          >
            이전 주
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(getKstWeekStart())}>
            현재 주
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart((previous) => addKstDays(previous, 7))}
          >
            다음 주
          </Button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-[2px] border border-[#86EFAC] bg-[#F0FDF4]" />
          예약 가능
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-[2px] border border-[#D1D5DB] bg-[#F3F4F6]" />
          마감
        </span>
        <span className="text-[#656D76]">예약 이력이 있으면 수정할 수 없습니다.</span>
      </div>
      {isLoading ? (
        <p className="rounded-[8px] border border-[#E5E7EB] bg-white p-6 text-center text-[12px] text-[#656D76]">
          일정을 불러오는 중입니다.
        </p>
      ) : error ? (
        <p
          className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] p-4 text-[12px] text-[#CF222E]"
          role="alert"
        >
          {getErrorMessage(error, '조회')}
        </p>
      ) : (
        <>
          <div className="select-none overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div
              className="grid border-b border-[#E5E7EB]"
              style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}
            >
              <div className="border-r border-[#E5E7EB] bg-[#F6F8FA]" />
              {DAYS.map((day, index) => (
                <div
                  key={day}
                  className="border-r border-[#E5E7EB] bg-[#F6F8FA] py-2 text-center last:border-0"
                >
                  <p className="text-[11px] font-bold text-[#656D76]">{day}</p>
                  <p className="text-[10px] text-[#9AA0A6]">{dateLabel(weekDates[index])}</p>
                </div>
              ))}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '520px' }}>
              {Array.from({ length: HALF_COUNT }, (_, half) => (
                <div
                  key={half}
                  className="grid border-b border-[#F3F4F6] last:border-0"
                  style={{ gridTemplateColumns: '56px repeat(5, 1fr)', minHeight: '28px' }}
                >
                  <div className="flex items-start justify-end border-r border-[#E5E7EB] bg-[#F6F8FA] pr-2 pt-1">
                    {half % 2 === 0 && (
                      <span className="font-mono text-[9px] text-[#9AA0A6]">
                        {halfToTime(half)}
                      </span>
                    )}
                  </div>
                  {DAYS.map((_, day) => {
                    const item = slotGrid[`${day}-${half}`];
                    const isFirstHalf = item && item.startHalf === half;
                    const isDragging =
                      dragRange &&
                      dragRange.day === day &&
                      half >= dragRange.start &&
                      half < dragRange.end;
                    if (item && !isFirstHalf)
                      return (
                        <div
                          key={`${day}-${half}`}
                          className="border-r border-[#F3F4F6] last:border-0"
                        />
                      );
                    const schedule = item?.schedule;
                    const isOpen = schedule?.status === COUNSELOR_SCHEDULE_STATUS.OPEN;
                    return (
                      <div
                        key={`${day}-${half}`}
                        className="relative cursor-pointer border-r border-[#F3F4F6] last:border-0"
                        style={isDragging ? { background: '#F3F4F6' } : undefined}
                        onMouseDown={() => !schedule && handleMouseDown(day, half)}
                        onMouseEnter={() => !schedule && handleMouseEnter(day, half)}
                      >
                        {schedule && (
                          <button
                            type="button"
                            onClick={() => handleScheduleClick(schedule)}
                            className={`absolute inset-x-0.5 top-0.5 z-10 flex flex-col overflow-hidden rounded-[4px] border px-1.5 py-1 text-left hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#1F2937] ${isOpen ? 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]' : 'border-[#D1D5DB] bg-[#F3F4F6] text-[#4B5563]'}`}
                            style={{ height: `${(item.endHalf - item.startHalf) * 28 - 4}px` }}
                            aria-label={`${formatKstDateTime(schedule.startsAt)}부터 ${formatKstDateTime(schedule.endsAt)}까지, ${COUNSELOR_SCHEDULE_STATUS_LABEL[schedule.status]}, ${schedule.hasReservation ? '예약 이력 있음' : '예약 이력 없음'}`}
                          >
                            <span className="text-[9px] font-black leading-tight">
                              {halfToTime(item.startHalf)}~{halfToTime(item.endHalf)}
                            </span>
                            <span className="mt-0.5 text-[8px] leading-tight">
                              유형 {schedule.counselingTypeId} ·{' '}
                              {COUNSELOR_SCHEDULE_STATUS_LABEL[schedule.status]}
                            </span>
                            <span className="text-[8px] leading-tight">
                              {schedule.hasReservation ? '예약 이력 있음' : '예약 이력 없음'}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {outsideSchedules.length > 0 && (
            <section className="mt-4 rounded-[8px] border border-[#E5E7EB] bg-white p-4">
              <h2 className="text-[13px] font-bold text-[#1F2328]">화면 범위 밖 일정</h2>
              <p className="mt-1 text-[11px] text-[#656D76]">
                주말, 09:00~18:00 범위 밖, 30분 단위가 아닌 일정 또는 여러 날짜에 걸친 일정입니다.
                데이터는 숨기지 않고 아래에 표시합니다.
              </p>
              <ul className="mt-3 flex flex-col gap-3">
                {outsideSchedules.map((schedule) => (
                  <li
                    key={schedule.scheduleId}
                    className="rounded-[6px] border border-[#E5E7EB] p-3 text-[12px]"
                  >
                    <p className="font-semibold text-[#1F2328]">
                      유형 {schedule.counselingTypeId} · {formatKstDateTime(schedule.startsAt)} ~{' '}
                      {formatKstDateTime(schedule.endsAt)}
                    </p>
                    <p className="mt-1 text-[#656D76]">
                      {COUNSELOR_SCHEDULE_STATUS_LABEL[schedule.status]} ·{' '}
                      {schedule.hasReservation ? '예약 이력 있음' : '예약 이력 없음'}
                      {schedule.location ? ` · ${schedule.location}` : ''}
                    </p>
                    <ActionButtons
                      schedule={schedule}
                      onEdit={openEditDrawer}
                      onClose={openCloseModal}
                      isClosing={closeMutation.isPending}
                      compact
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {visibleSchedules.length === 0 && outsideSchedules.length === 0 && (
            <p className="mt-3 text-center text-[12px] text-[#656D76]">
              이 주에 등록된 상담 일정이 없습니다.
            </p>
          )}
        </>
      )}
      <Drawer
        open={drawerOpen}
        onClose={() => !isSubmitting && setDrawerOpen(false)}
        title={editingSchedule ? '슬롯 수정' : '슬롯 등록'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={isSubmitting}>
              취소
            </Button>
            <Button
              style={{ background: ACCENT }}
              type="submit"
              form="counselorScheduleForm"
              loading={isSubmitting}
            >
              {editingSchedule ? '수정' : '저장'}
            </Button>
          </div>
        }
      >
        <form id="counselorScheduleForm" onSubmit={handleSubmit}>
          <ScheduleForm form={form} setForm={setForm} formError={formError} />
        </form>
      </Drawer>
      <Modal
        open={bookedWarn !== null}
        onClose={() => setBookedWarn(null)}
        title={bookedWarn?.hasReservation ? '예약자 있는 일정 변경' : '마감된 일정'}
        footer={
          <>
            <Button variant="outline" onClick={() => setBookedWarn(null)}>
              확인
            </Button>
            {bookedWarn?.status === COUNSELOR_SCHEDULE_STATUS.OPEN && (
              <Button
                variant="danger"
                onClick={() => {
                  setBookedWarn(null);
                  openCloseModal(bookedWarn);
                }}
              >
                마감
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="rounded-[8px] border border-[#FED7AA] bg-[#FFF7ED] p-3 text-[12px] text-[#92400E]">
            {bookedWarn?.hasReservation
              ? '이 일정에는 예약 이력이 있어 수정할 수 없습니다. 일정 마감만 가능합니다.'
              : '마감된 일정은 수정하거나 재오픈할 수 없습니다.'}
          </p>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-[#656D76]">
              대체 일정 선택
            </label>
            <select
              disabled
              className="h-9 w-full rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] px-2 text-[12px] text-[#9AA0A6]"
            >
              <option>— 백엔드 연동 준비 중 —</option>
            </select>
            <p className="mt-1 text-[11px] text-[#9AA0A6]">
              대체 일정 안내와 알림 발송은 현재 일정 상태를 변경하지 않습니다.
            </p>
          </div>
        </div>
      </Modal>
      <Modal
        open={closingSchedule !== null}
        onClose={() => !closeMutation.isPending && setClosingSchedule(null)}
        title="상담 일정 마감"
        size="sm"
        descriptionId={CLOSE_MODAL_DESCRIPTION_ID}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setClosingSchedule(null)}
              disabled={closeMutation.isPending}
            >
              취소
            </Button>
            <Button
              variant="danger"
              loading={closeMutation.isPending}
              onClick={() => closeMutation.mutate(closingSchedule.scheduleId)}
            >
              마감하기
            </Button>
          </>
        }
      >
        <p id={CLOSE_MODAL_DESCRIPTION_ID} className="text-[13px] leading-relaxed text-[#1F2328]">
          기존 예약은 유지되고 신규 예약만 차단되며 재오픈할 수 없음
        </p>
        {actionError && (
          <p
            className="mt-3 rounded-[6px] border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] text-[#CF222E]"
            role="alert"
          >
            {actionError}
          </p>
        )}
        <div className="mt-4 border-t border-[#E5E7EB] pt-3">
          <p className="text-[11px] text-[#656D76]">대체 일정 선택 및 알림 발송</p>
          <button
            type="button"
            className="mt-2 h-8 rounded-[6px] border border-[#E5E7EB] px-3 text-[11px] text-[#9AA0A6]"
            onClick={() =>
              toast('백엔드 연동 준비 중인 기능입니다. 현재 일정은 변경되지 않습니다.', 'info')
            }
          >
            대체 일정 선택
          </button>
        </div>
      </Modal>
    </div>
  );
}
