import { useState } from 'react';
import { Button, toast } from '@/components/common';

const ACCENT = '#0891B2';

const PROGRAMS_BY_COMP = {
  자기관리: ['진로탐색 워크숍', '독서인증제', '리더십 캠프'],
  의사소통: ['영어 프레젠테이션 클리닉', 'NCS 직업기초 특강'],
  대인관계: ['리더십 캠프', '멘토링 프로그램'],
  글로벌: ['해외문화체험 워크숍', '해외봉사 프로그램'],
  문제해결: ['빅데이터 분석 워크숍', '창업 아이디어 경진대회'],
  직업윤리: ['봉사단 해외봉사 프로그램', 'NCS 직업기초 특강'],
};

export default function SessionRecord() {
  // Session context
  const SESSION = {
    id: 'CS-2026-0315',
    student: '최지수',
    studentId: '20232050',
    dept: '심리학과',
    type: '심리·정서',
    date: '2026-08-13',
    time: '10:00',
  };

  const [attendance, setAttendance] = useState(null);
  const [privateNote, setPrivateNote] = useState('');
  const [publicSummary, setPublicSummary] = useState('');
  const [actionPlan, setActionPlan] = useState('');

  const [compSel, setCompSel] = useState('자기관리');
  const [progSel, setProgSel] = useState(PROGRAMS_BY_COMP['자기관리'][0]);
  const [recommended, setRecommended] = useState([]);

  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  const addRecommended = () => {
    if (recommended.some((r) => r.prog === progSel)) {
      toast('이미 추가된 프로그램입니다.', 'error');
      return;
    }
    setRecommended((prev) => [...prev, { comp: compSel, prog: progSel }]);
    toast(`'${progSel}' 프로그램이 추가되었습니다.`, 'success');
  };

  const removeRec = (prog) => setRecommended((prev) => prev.filter((r) => r.prog !== prog));

  // Completion checklist
  const checks = [
    { key: 'attendance', label: '출석 여부 입력', done: attendance !== null },
    { key: 'private', label: '비공개 기록 입력', done: privateNote.trim().length > 0 },
    { key: 'public', label: '공개 요약 입력', done: publicSummary.trim().length > 0 },
  ];
  const canComplete = checks.every((c) => c.done);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast('임시 저장되었습니다.', 'success');
    }, 500);
  };

  const handleComplete = () => {
    if (!canComplete) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setCompleted(true);
      toast('상담 기록이 완료 처리되었습니다.', 'success');
    }, 600);
  };

  if (completed) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-[40px] mb-3">✅</div>
          <p className="text-[15px] font-bold text-[#1F2328]">상담 기록이 완료 처리되었습니다.</p>
          <p className="text-[12px] text-[#9AA0A6] mt-1">
            {SESSION.id} · {SESSION.student}
          </p>
          <button
            onClick={() => setCompleted(false)}
            className="mt-4 text-[12px] font-bold hover:underline"
            style={{ color: ACCENT }}
          >
            결과 확정으로 이동 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">상담 기록 작성</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            <span className="font-mono">{SESSION.id}</span> · {SESSION.student} · {SESSION.date}{' '}
            {SESSION.time}
          </p>
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '280px 1fr' }}>
        {/* LEFT: Student pre-info (reference — gray tone) */}
        <div className="flex flex-col gap-3">
          <div className="bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2 bg-[#F3F4F6]">
              <span className="text-[11px] font-bold text-[#656D76]">학생 사전 정보</span>
              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-[#E5E7EB] text-[#9AA0A6] font-bold">
                참고용
              </span>
            </div>

            {/* Basic info */}
            <div className="px-4 py-3 border-b border-[#F3F4F6]">
              <p className="text-[10px] font-bold text-[#9AA0A6] mb-2">기초조사 요청 내용</p>
              <p className="text-[11px] text-[#656D76] leading-relaxed">
                진로 방향과 취업 준비에 대해 상담받고 싶습니다. 현재 3학년으로 졸업 이후 진로가
                막막합니다. 대인관계에서도 어려움을 느끼고 있습니다.
              </p>
            </div>

            {/* Competency summary */}
            <div className="px-4 py-3 border-b border-[#F3F4F6]">
              <p className="text-[10px] font-bold text-[#9AA0A6] mb-2">
                핵심역량 진단 요약 (2026-1)
              </p>
              <div className="flex flex-col gap-1.5">
                {[
                  { name: '자기관리', score: 58 },
                  { name: '의사소통', score: 62 },
                  { name: '대인관계', score: 51 },
                  { name: '글로벌', score: 70 },
                  { name: '문제해결', score: 65 },
                  { name: '직업윤리', score: 72 },
                ].map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="text-[10px] text-[#9AA0A6] w-16 shrink-0">{c.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${c.score}%`,
                          background: c.score < 60 ? '#CF222E' : '#9CA3AF',
                        }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-bold w-7 text-right ${c.score < 60 ? 'text-[#CF222E]' : 'text-[#9AA0A6]'}`}
                    >
                      {c.score}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-[#CF222E] mt-1.5">⚠ 자기관리·대인관계 낮음</p>
            </div>

            {/* Extracurr summary */}
            <div className="px-4 py-3 border-b border-[#F3F4F6]">
              <p className="text-[10px] font-bold text-[#9AA0A6] mb-2">비교과 참여 요약</p>
              <div className="flex flex-col gap-1">
                {['독서인증제 (수료)', '진로탐색 워크숍 (수료)', '리더십 캠프 (진행중)'].map(
                  (p) => (
                    <p key={p} className="text-[11px] text-[#656D76] flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-[#D1D5DB] shrink-0" />
                      {p}
                    </p>
                  ),
                )}
              </div>
            </div>

            {/* Previous counseling */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-[#9AA0A6] mb-2">이전 상담 이력</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { date: '2025-11-10', type: '진로·역량' },
                  { date: '2025-03-15', type: '학업고민' },
                ].map((h) => (
                  <div key={h.date} className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-[#9AA0A6]">{h.date}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E5E7EB] text-[#656D76]">
                      {h.type}
                    </span>
                    <span className="text-[9px] text-[#D1D5DB] ml-auto">🔒 원문 비공개</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Record form */}
        <div className="flex flex-col gap-4">
          {/* Attendance */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-5">
            <div className="flex items-center gap-3 mb-3">
              <label className="text-[12px] font-bold text-[#1F2328]">
                출석 여부 <span className="text-[#CF222E]">*</span>
              </label>
              <div className="flex gap-2">
                {['출석', '노쇼'].map((v) => (
                  <label
                    key={v}
                    className={`flex items-center gap-2 px-4 py-2 rounded-[8px] border-2 cursor-pointer transition-all ${attendance === v ? (v === '출석' ? 'border-[#059669] bg-[#F0FDF4]' : 'border-[#CF222E] bg-[#FFF5F5]') : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'}`}
                    onClick={() => setAttendance(v)}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${attendance === v ? (v === '출석' ? 'border-[#059669]' : 'border-[#CF222E]') : 'border-[#D1D5DB]'}`}
                    >
                      {attendance === v && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: v === '출석' ? '#059669' : '#CF222E' }}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[12px] font-bold ${attendance === v ? (v === '출석' ? 'text-[#059669]' : 'text-[#CF222E]') : 'text-[#656D76]'}`}
                    >
                      {v}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Private note */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2 bg-[#FFF5F5]">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E]">
                비공개 · 상담사 전용
              </span>
              <span className="text-[11px] text-[#9AA0A6]">학생에게 공개되지 않습니다.</span>
            </div>
            <div className="p-4">
              <textarea
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                rows={6}
                placeholder="비공개 상담 내용, 관찰 사항, 위기 징후 등을 기록하세요."
                className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#0891B2] bg-[#FAFAFA]"
              />
              <p className="text-[10px] text-[#9AA0A6] mt-1 text-right">{privateNote.length}자</p>
            </div>
          </div>

          {/* Public summary */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2 bg-[#ECFEFF]">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#CFFAFE] text-[#0891B2]">
                학생 공개
              </span>
              <span className="text-[11px] text-[#0891B2]">
                학생이 마이페이지에서 열람할 수 있습니다.
              </span>
            </div>
            <div className="p-4">
              <textarea
                value={publicSummary}
                onChange={(e) => setPublicSummary(e.target.value)}
                rows={4}
                placeholder="학생에게 전달할 상담 요약을 작성하세요."
                className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#0891B2] bg-white"
              />
            </div>
          </div>

          {/* Action plan */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4">
            <label className="block text-[12px] font-bold text-[#1F2328] mb-2">실행계획</label>
            <textarea
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              rows={3}
              placeholder="예) 1. 진로 탐색 워크숍 참여 2. 이력서 초안 작성 3. 다음 상담 예약"
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#0891B2] bg-white"
            />
          </div>

          {/* Recommended programs */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4">
            <label className="block text-[12px] font-bold text-[#1F2328] mb-3">
              추천 비교과 프로그램 연결
            </label>
            <div className="flex gap-2 items-end mb-3 flex-wrap">
              <div className="flex flex-col gap-1 w-32">
                <label className="text-[10px] font-semibold text-[#656D76]">역량</label>
                <select
                  value={compSel}
                  onChange={(e) => {
                    setCompSel(e.target.value);
                    setProgSel(PROGRAMS_BY_COMP[e.target.value][0]);
                  }}
                  className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#0891B2]"
                >
                  {Object.keys(PROGRAMS_BY_COMP).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <label className="text-[10px] font-semibold text-[#656D76]">프로그램</label>
                <select
                  value={progSel}
                  onChange={(e) => setProgSel(e.target.value)}
                  className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#0891B2]"
                >
                  {(PROGRAMS_BY_COMP[compSel] ?? []).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={addRecommended}
                className="h-8 px-3 text-[11px] font-bold rounded-[6px] text-white shrink-0"
                style={{ background: ACCENT }}
              >
                + 추가
              </button>
            </div>
            {recommended.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recommended.map((r) => (
                  <span
                    key={r.prog}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#ECFEFF] border border-[#A5F3FC]"
                    style={{ color: ACCENT }}
                  >
                    <span className="text-[10px] text-[#9AA0A6]">{r.comp}</span>
                    {r.prog}
                    <button
                      onClick={() => removeRec(r.prog)}
                      className="text-[#9AA0A6] hover:text-[#CF222E] text-[12px]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Completion checklist + actions */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4">
            <p className="text-[11px] font-bold text-[#1F2328] mb-3">완료 처리 조건</p>
            <div className="flex flex-col gap-2 mb-4">
              {checks.map((c) => (
                <div key={c.key} className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${c.done ? 'border-[#059669] bg-[#059669]' : 'border-[#D1D5DB]'}`}
                  >
                    {c.done && (
                      <svg width="8" height="6" viewBox="0 0 8 6">
                        <path
                          d="M1 3l2 2 4-4"
                          stroke="white"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-[12px] ${c.done ? 'text-[#059669] line-through opacity-60' : 'text-[#656D76]'}`}
                  >
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" loading={saving} onClick={handleSave}>
                임시 저장
              </Button>
              <Button
                loading={saving}
                disabled={!canComplete}
                onClick={handleComplete}
                style={canComplete ? { background: ACCENT } : {}}
              >
                완료 처리
              </Button>
            </div>
            {!canComplete && (
              <p className="text-[10px] text-[#9AA0A6] mt-2 text-right">
                모든 조건을 충족해야 완료 처리가 가능합니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
