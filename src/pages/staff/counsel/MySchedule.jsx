import { useEffect, useRef, useState } from 'react';
import { Button, Drawer, Modal, toast } from '@/components/common';

const ACCENT = '#0891B2';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['월', '화', '수', '목', '금'];
const HALF_COUNT = 18; // 09:00 ~ 18:00 → 18 half-hour slots

function halfToTime(h) {
  const hour = 9 + Math.floor(h / 2);
  const min = h % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${min}`;
}

const TODAY_DATE = new Date('2026-08-13');
const WEEK_DATES = Array.from({ length: 5 }, (_, i) => {
  const d = new Date(TODAY_DATE);
  // Mon is i=0: find Monday of current week
  const dow = TODAY_DATE.getDay(); // 4 = Thu
  d.setDate(TODAY_DATE.getDate() - (dow === 0 ? 6 : dow - 1) + i);
  return d;
});

function dateLabel(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── Initial slot data ────────────────────────────────────────────────────────

const INIT_SLOTS = [
  {
    id: 's1',
    day: 0,
    startHalf: 2,
    endHalf: 4,
    mode: 'booked',
    capacity: 1,
    method: '대면',
    bookedCount: 1,
  },
  {
    id: 's2',
    day: 0,
    startHalf: 6,
    endHalf: 8,
    mode: 'available',
    capacity: 1,
    method: '대면',
    bookedCount: 0,
  },
  {
    id: 's3',
    day: 1,
    startHalf: 2,
    endHalf: 4,
    mode: 'available',
    capacity: 1,
    method: '온라인',
    bookedCount: 0,
  },
  {
    id: 's4',
    day: 1,
    startHalf: 8,
    endHalf: 10,
    mode: 'available',
    capacity: 1,
    method: '대면',
    bookedCount: 0,
  },
  {
    id: 's5',
    day: 2,
    startHalf: 2,
    endHalf: 4,
    mode: 'booked',
    capacity: 1,
    method: '대면',
    bookedCount: 1,
  },
  {
    id: 's6',
    day: 2,
    startHalf: 12,
    endHalf: 14,
    mode: 'available',
    capacity: 2,
    method: '온라인',
    bookedCount: 0,
  },
  {
    id: 's7',
    day: 3,
    startHalf: 2,
    endHalf: 4,
    mode: 'available',
    capacity: 1,
    method: '대면',
    bookedCount: 0,
  },
  {
    id: 's8',
    day: 3,
    startHalf: 8,
    endHalf: 10,
    mode: 'holiday',
    capacity: 0,
    method: '대면',
    bookedCount: 0,
  },
  {
    id: 's9',
    day: 4,
    startHalf: 2,
    endHalf: 4,
    mode: 'available',
    capacity: 1,
    method: '대면',
    bookedCount: 0,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MySchedule() {
  const [slots, setSlots] = useState(INIT_SLOTS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bookedWarn, setBookedWarn] = useState(null);

  // Drag state
  const dragDay = useRef(null);
  const dragStartH = useRef(null);
  const dragEndH = useRef(null);
  const [dragRange, setDragRange] = useState(null);

  // Drawer form
  const [fDay, setFDay] = useState(0);
  const [fStart, setFStart] = useState(0);
  const [fEnd, setFEnd] = useState(2);
  const [fCap, setFCap] = useState(1);
  const [fMethod, setFMethod] = useState('대면');
  const [fDeadline, setFDead] = useState(1);
  const [fRepeat, setFRepeat] = useState(false);
  const [fRepeatDay, setFRD] = useState('');
  const [fRepeatEnd, setFRE] = useState('');
  const [fHoliday, setFHol] = useState(false);
  const [timeError, setTimeError] = useState('');
  const [overlapError, setOverlapError] = useState('');
  const [altSlot, setAltSlot] = useState('');

  // Mouse drag handlers
  const handleMouseDown = (day, half) => {
    dragDay.current = day;
    dragStartH.current = half;
    dragEndH.current = half + 1;
    setDragRange({ day, start: half, end: half + 1 });
  };

  const handleMouseEnter = (day, half) => {
    if (dragDay.current !== day || dragStartH.current === null) return;
    dragEndH.current = half + 1;
    setDragRange({ day, start: dragStartH.current, end: half + 1 });
  };

  const openSlotDrawer = (day, start, end) => {
    setFDay(day);
    setFStart(start);
    setFEnd(end);
    setFCap(1);
    setFMethod('대면');
    setFDead(1);
    setFRepeat(false);
    setFRD('');
    setFRE('');
    setFHol(false);
    setTimeError('');
    setOverlapError('');
    setDragRange(null);
    setDrawerOpen(true);
  };

  useEffect(() => {
    const up = () => {
      if (dragDay.current !== null && dragStartH.current !== null && dragEndH.current !== null) {
        const start = Math.min(dragStartH.current, dragEndH.current - 1);
        const end = Math.max(dragStartH.current, dragEndH.current - 1) + 1;
        openSlotDrawer(dragDay.current, start, end);
      }
      dragDay.current = null;
      dragStartH.current = null;
      dragEndH.current = null;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const checkOverlap = (day, start, end) => {
    return slots.some((s) => s.day === day && s.startHalf < end && s.endHalf > start);
  };

  const saveSlot = () => {
    // Validate time order
    if (fEnd <= fStart) {
      setTimeError('시작 시간은 종료 시간보다 앞서야 합니다.');
      return;
    }
    setTimeError('');
    // Check overlap
    if (checkOverlap(fDay, fStart, fEnd)) {
      setOverlapError('이미 등록된 일정과 겹칩니다.');
      return;
    }
    setOverlapError('');
    const newSlot = {
      id: `s${Date.now()}`,
      day: fDay,
      startHalf: fStart,
      endHalf: fEnd,
      mode: fHoliday ? 'holiday' : 'available',
      capacity: fCap,
      method: fMethod,
      bookedCount: 0,
      repeat: fRepeat ? `매주 ${fRepeatDay} ~ ${fRepeatEnd}` : undefined,
    };
    setSlots((prev) => [...prev, newSlot]);
    setDrawerOpen(false);
    toast('일정이 등록되었습니다.', 'success');
  };

  const handleCellClick = (slot) => {
    if (slot.mode === 'booked' && slot.bookedCount > 0) {
      setBookedWarn(slot);
    } else {
      toast(
        `${DAYS[slot.day]}요일 ${halfToTime(slot.startHalf)}~${halfToTime(slot.endHalf)} 슬롯을 수정합니다.`,
        'info',
      );
    }
  };

  // Build a lookup: day → half → slot
  const slotGrid = {};
  slots.forEach((s) => {
    for (let h = s.startHalf; h < s.endHalf; h++) slotGrid[`${s.day}-${h}`] = s;
  });

  const SLOT_COLORS = {
    available: '#ECFEFF',
    booked: '#0891B2',
    holiday: '#F3F4F6',
  };
  const SLOT_TEXT = {
    available: '#0891B2',
    booked: '#FFFFFF',
    holiday: '#9AA0A6',
  };

  const HALF_OPTIONS = Array.from({ length: HALF_COUNT }, (_, i) => ({
    value: i,
    label: halfToTime(i),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">내 일정</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            가능 시간대를 드래그로 선택해 슬롯을 등록하세요.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {[
            { color: '#ECFEFF', border: '#A5F3FC', text: '#0891B2', label: '가능' },
            { color: '#0891B2', border: '#0891B2', text: '#FFF', label: '예약됨' },
            { color: '#F3F4F6', border: '#E5E7EB', text: '#9AA0A6', label: '휴무' },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span
                className="w-3.5 h-3.5 rounded-[2px] border"
                style={{ background: l.color, borderColor: l.border }}
              />
              <span className="text-[#656D76]">{l.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden select-none">
        {/* Header */}
        <div
          className="grid border-b border-[#E5E7EB]"
          style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}
        >
          <div className="bg-[#F6F8FA] border-r border-[#E5E7EB]" />
          {DAYS.map((d, i) => {
            const isToday = WEEK_DATES[i].toDateString() === TODAY_DATE.toDateString();
            return (
              <div
                key={d}
                className="py-2 text-center border-r border-[#E5E7EB] last:border-0"
                style={isToday ? { background: '#ECFEFF' } : { background: '#F6F8FA' }}
              >
                <p
                  className="text-[11px] font-bold"
                  style={isToday ? { color: ACCENT } : { color: '#656D76' }}
                >
                  {d}
                </p>
                <p
                  className="text-[10px]"
                  style={isToday ? { color: ACCENT } : { color: '#9AA0A6' }}
                >
                  {dateLabel(WEEK_DATES[i])}
                </p>
                {isToday && (
                  <div
                    className="w-1 h-1 rounded-full mx-auto mt-0.5"
                    style={{ background: ACCENT }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Time rows */}
        <div className="overflow-y-auto" style={{ maxHeight: '520px' }}>
          {Array.from({ length: HALF_COUNT }, (_, hi) => (
            <div
              key={hi}
              className="grid border-b border-[#F3F4F6] last:border-0"
              style={{ gridTemplateColumns: '56px repeat(5, 1fr)', minHeight: '28px' }}
            >
              {/* Time label — only on even (full hour) */}
              <div className="bg-[#F6F8FA] border-r border-[#E5E7EB] flex items-start justify-end pr-2 pt-1">
                {hi % 2 === 0 && (
                  <span className="text-[9px] text-[#9AA0A6] font-mono">{halfToTime(hi)}</span>
                )}
              </div>

              {DAYS.map((_, di) => {
                const key = `${di}-${hi}`;
                const slot = slotGrid[key];
                const isDragActive =
                  dragRange && dragRange.day === di && hi >= dragRange.start && hi < dragRange.end;
                const isFirstHalf = slot && slot.startHalf === hi;
                const spanHalves = slot ? slot.endHalf - slot.startHalf : 1;

                if (slot && !isFirstHalf) {
                  return <div key={key} className="border-r border-[#F3F4F6] last:border-0" />;
                }

                return (
                  <div
                    key={key}
                    className="border-r border-[#F3F4F6] last:border-0 relative cursor-pointer transition-colors"
                    style={isDragActive ? { background: '#CFFAFE' } : {}}
                    onMouseDown={() => !slot && handleMouseDown(di, hi)}
                    onMouseEnter={() => !slot && handleMouseEnter(di, hi)}
                    onClick={() => slot && handleCellClick(slot)}
                  >
                    {slot && isFirstHalf && (
                      <div
                        className="absolute inset-x-0.5 top-0.5 rounded-[4px] flex flex-col px-1.5 py-1 z-10 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        style={{
                          height: `${spanHalves * 28 - 4}px`,
                          background: SLOT_COLORS[slot.mode],
                          border: `1px solid ${slot.mode === 'booked' ? '#0E7490' : slot.mode === 'holiday' ? '#E5E7EB' : '#A5F3FC'}`,
                        }}
                      >
                        <p
                          className="text-[9px] font-black leading-tight"
                          style={{ color: SLOT_TEXT[slot.mode] }}
                        >
                          {halfToTime(slot.startHalf)}~{halfToTime(slot.endHalf)}
                        </p>
                        {slot.mode !== 'holiday' && (
                          <p
                            className="text-[8px] leading-tight mt-0.5"
                            style={{ color: SLOT_TEXT[slot.mode], opacity: 0.85 }}
                          >
                            {slot.method} {slot.bookedCount > 0 ? `· 예약 ${slot.bookedCount}` : ''}
                            {slot.repeat ? ' 🔁' : ''}
                          </p>
                        )}
                        {slot.mode === 'holiday' && (
                          <p className="text-[9px] text-[#9AA0A6]">휴무</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Slot register drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="슬롯 등록"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              취소
            </Button>
            <Button style={{ background: ACCENT }} onClick={saveSlot}>
              저장
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Day */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">요일</label>
            <div className="flex gap-2">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setFDay(i)}
                  className={`w-8 h-8 text-[12px] font-bold rounded-full border-2 transition-colors ${fDay === i ? 'text-white border-[#0891B2]' : 'bg-white text-[#656D76] border-[#E5E7EB]'}`}
                  style={fDay === i ? { background: ACCENT } : {}}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#9AA0A6] mt-1">{dateLabel(WEEK_DATES[fDay])}</p>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '시작 시간', val: fStart, set: setFStart },
              {
                label: '종료 시간',
                val: fEnd,
                set: (v) => {
                  setFEnd(v);
                  setTimeError('');
                },
              },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
                  {f.label}
                </label>
                <select
                  value={f.val}
                  onChange={(e) => f.set(Number(e.target.value))}
                  className="w-full h-9 px-2 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#0891B2]"
                >
                  {HALF_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Inline errors */}
          {timeError && (
            <div className="p-2.5 rounded-[6px] bg-[#FEE2E2] border border-[#FECACA] text-[11px] text-[#CF222E] font-semibold">
              ⚠ {timeError}
            </div>
          )}
          {overlapError && (
            <div className="p-2.5 rounded-[6px] bg-[#FEE2E2] border border-[#FECACA] text-[11px] text-[#CF222E] font-semibold">
              ⚠ {overlapError}
            </div>
          )}

          {/* Capacity + method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">정원</label>
              <input
                type="number"
                value={fCap}
                min={1}
                max={10}
                onChange={(e) => setFCap(Number(e.target.value))}
                className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#0891B2]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
                상담 방식
              </label>
              <div className="flex gap-2 mt-1">
                {['대면', '온라인'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setFMethod(m)}
                    className={`flex-1 h-9 text-[12px] font-semibold rounded-[6px] border-2 transition-colors ${fMethod === m ? 'text-white border-[#0891B2]' : 'bg-white text-[#656D76] border-[#E5E7EB]'}`}
                    style={fMethod === m ? { background: ACCENT } : {}}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              예약 마감
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#656D76]">상담</span>
              <input
                type="number"
                value={fDeadline}
                min={0}
                max={7}
                onChange={(e) => setFDead(Number(e.target.value))}
                className="w-16 h-8 px-2 text-[13px] text-center rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#0891B2]"
              />
              <span className="text-[12px] text-[#656D76]">일 전 마감</span>
            </div>
          </div>

          {/* Repeat */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={fRepeat}
                onChange={(e) => setFRepeat(e.target.checked)}
                className="accent-[#0891B2] w-3.5 h-3.5"
              />
              <span className="text-[12px] font-semibold text-[#444D56]">반복 등록</span>
            </label>
            {fRepeat && (
              <div className="flex gap-3 mt-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-[#656D76] mb-1">
                    반복 요일
                  </label>
                  <input
                    value={fRepeatDay}
                    onChange={(e) => setFRD(e.target.value)}
                    placeholder="예) 매주 월·수·금"
                    className="w-full h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#0891B2]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-[#656D76] mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={fRepeatEnd}
                    onChange={(e) => setFRE(e.target.value)}
                    className="w-full h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#0891B2]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Holiday */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fHoliday}
                onChange={(e) => setFHol(e.target.checked)}
                className="accent-[#9AA0A6] w-3.5 h-3.5"
              />
              <span className="text-[12px] font-semibold text-[#444D56]">휴무 처리</span>
              <span className="text-[10px] text-[#9AA0A6]">(예약 불가 표시)</span>
            </label>
          </div>
        </div>
      </Drawer>

      {/* Booked-slot change warning modal */}
      <Modal
        open={!!bookedWarn}
        onClose={() => setBookedWarn(null)}
        title="예약자 있는 일정 변경"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBookedWarn(null)}>
              취소
            </Button>
            <Button
              style={{ background: ACCENT }}
              onClick={() => {
                setBookedWarn(null);
                toast('대체 일정이 안내됩니다.', 'success');
              }}
            >
              변경 진행
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[12px] text-[#92400E]">
            이 일정에는 예약자 <strong>{bookedWarn?.bookedCount}명</strong>이 있습니다. 변경 시 대체
            일정을 등록하고 학생에게 안내됩니다.
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              대체 일정 선택
            </label>
            <select
              value={altSlot}
              onChange={(e) => setAltSlot(e.target.value)}
              className="w-full h-9 px-2 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#0891B2]"
            >
              <option value="">— 대체 슬롯 선택 —</option>
              {slots
                .filter(
                  (s) => s.mode === 'available' && s.bookedCount === 0 && s.id !== bookedWarn?.id,
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {DAYS[s.day]}요일 {halfToTime(s.startHalf)}~{halfToTime(s.endHalf)} ({s.method})
                  </option>
                ))}
            </select>
          </div>
          <p className="text-[11px] text-[#9AA0A6]">
            대체 일정 선택 시 학생에게 카카오 알림톡·이메일이 발송됩니다.
          </p>
        </div>
      </Modal>
    </div>
  );
}
