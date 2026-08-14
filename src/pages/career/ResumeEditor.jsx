import { useState } from 'react';
import { Tabs, Button, RadarChart, toast } from '@/components/common';

const ACCENT = '#059669';

// ─── Data ────────────────────────────────────────────────────────────────────

const PERSONAL = [
  { label: '성명', value: '홍길동', locked: true },
  { label: '학번', value: '20231234', locked: true },
  { label: '학과', value: '컴퓨터공학과', locked: true },
  { label: '학년·학적', value: '3학년 / 재학', locked: true },
  { label: '연락처', value: '010-1234-5678', locked: false },
  { label: '이메일', value: 'hong@korea.ac.kr', locked: false },
];

const CERTS = [
  { type: '자격증', content: '정보처리기사', date: '2025-06-15', source: '증빙 연동' },
  { type: '어학', content: 'TOEIC 860점', date: '2025-11-10', source: '증빙 연동' },
  { type: '어학', content: 'OPIc IH', date: '2026-02-20', source: '직접 입력' },
  { type: '자격증', content: 'AWS SAA', date: '2026-04-08', source: '직접 입력' },
];

const EXTRACURR = [
  {
    period: '2026-03 ~ 08',
    name: '해외문화체험 워크숍',
    type: '문화·글로벌',
    competency: '글로벌',
    mileage: 200,
    status: '수료',
  },
  {
    period: '2026-02 ~ 03',
    name: '진로탐색 워크숍',
    type: '진로',
    competency: '자기관리',
    mileage: 100,
    status: '수료',
  },
  {
    period: '2025-09 ~ 12',
    name: '리더십 캠프',
    type: '리더십',
    competency: '대인관계',
    mileage: 150,
    status: '수료',
  },
  {
    period: '2025-03 ~ 06',
    name: 'NCS 직업기초능력 특강',
    type: '역량',
    competency: '종합사고',
    mileage: 60,
    status: '수료',
  },
];

const COMP_LABELS = ['자기관리', '의사소통', '글로벌', '대인관계', '종합사고', '자원정보'];
const COMP_VALUES = [78, 65, 52, 80, 71, 68];

const CBI_QUESTIONS = [
  {
    id: 'Q1',
    label: '지원 동기와 포부',
    hint: '해당 직무·기업을 지원하게 된 동기와 입사 후 이루고 싶은 목표를 서술하세요.',
    limit: 800,
  },
  {
    id: 'Q2',
    label: '성장 과정',
    hint: '본인의 성장 과정에서 중요한 경험이나 가치관 형성에 영향을 준 사건을 서술하세요.',
    limit: 800,
  },
  {
    id: 'Q3',
    label: '직무 역량',
    hint: '지원 직무와 관련된 경험·프로젝트를 바탕으로 본인의 역량을 서술하세요.',
    limit: 800,
  },
];

// ─── Lock icon ────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 14" fill="#9AA0A6">
      <rect x="2" y="6" width="8" height="7" rx="1" />
      <path
        d="M4 6V4a2 2 0 014 0v2"
        stroke="#9AA0A6"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Resume Tab ───────────────────────────────────────────────────────────────

function ResumeTab({ onSave }) {
  const [tooltip, setTooltip] = useState(null);
  const [editValues, setEditValues] = useState({
    연락처: '010-1234-5678',
    이메일: 'hong@korea.ac.kr',
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Top row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
        {/* Personal & education */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <h2 className="text-[14px] font-bold text-[#1F2328]">인적사항 · 학력</h2>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {PERSONAL.map((row) => (
              <div key={row.label} className="flex items-center gap-3 px-5 py-3">
                <span className="w-24 flex-shrink-0 text-[12px] font-semibold text-[#656D76]">
                  {row.label}
                </span>
                {row.locked ? (
                  <div
                    className="flex-1 flex items-center gap-2 relative"
                    onMouseEnter={() => setTooltip(row.label)}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <div className="flex-1 h-9 px-3 bg-[#F6F8FA] border border-[#E5E7EB] rounded-[6px] flex items-center gap-2">
                      <LockIcon />
                      <span className="text-[13px] text-[#9AA0A6] select-none">{row.value}</span>
                    </div>
                    {tooltip === row.label && (
                      <div className="absolute left-0 bottom-10 bg-[#1F2328] text-white text-[10px] px-2.5 py-1.5 rounded-[6px] whitespace-nowrap z-10 shadow-lg">
                        학사행정시스템 연동 값으로 수정할 수 없습니다.
                        <div className="absolute top-full left-4 border-4 border-transparent border-t-[#1F2328]" />
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    value={editValues[row.label] ?? row.value}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, [row.label]: e.target.value }))
                    }
                    className="flex-1 h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Certs & language */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <h2 className="text-[14px] font-bold text-[#1F2328]">자격 · 어학</h2>
            <button className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-[5px] border text-[#059669] border-[#059669] hover:bg-[#F0FDF4] transition-colors">
              + 추가
            </button>
          </div>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {['구분', '내용', '취득일', '출처'].map((h) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '내용' ? 'text-left' : 'text-center'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CERTS.map((c, i) => (
                <tr
                  key={i}
                  className={`border-b border-[#F3F4F6] last:border-0 ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                >
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76]">
                      {c.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-[#1F2328]">{c.content}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-[#9AA0A6]">{c.date}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.source === '증빙 연동' ? 'bg-[#DCFCE7] text-[#059669]' : 'bg-[#F3F4F6] text-[#6E7781]'}`}
                    >
                      {c.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        {/* Extracurricular auto-linked */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <h2 className="text-[14px] font-bold text-[#1F2328]">비교과 활동 이력</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#059669] ml-1">
              자동 연동
            </span>
          </div>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {['기간', '프로그램명', '유형', '연계역량', '마일리지', '상태'].map((h) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${h === '프로그램명' ? 'text-left' : 'text-center'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EXTRACURR.map((e, i) => (
                <tr
                  key={i}
                  className={`border-b border-[#F3F4F6] last:border-0 ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                >
                  <td className="px-3 py-2.5 text-center text-[#9AA0A6] whitespace-nowrap font-mono text-[11px]">
                    {e.period}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-[#1F2328]">{e.name}</td>
                  <td className="px-3 py-2.5 text-center text-[#656D76]">{e.type}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                      {e.competency}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold text-[#D97706]">
                    {e.mileage}점
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#059669]">
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Competency radar */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <h2 className="text-[14px] font-bold text-[#1F2328]">핵심역량 진단 결과</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#059669] ml-1">
              자동 연동
            </span>
          </div>
          <div className="flex flex-col items-center py-4 px-3">
            <RadarChart labels={COMP_LABELS} values={COMP_VALUES} color={ACCENT} size={180} />
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
              {COMP_LABELS.map((l, i) => (
                <div key={l} className="flex items-center gap-1 text-[11px] text-[#656D76]">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: ACCENT, opacity: 0.7 }}
                  />
                  {l} <span className="font-bold text-[#1F2328]">{COMP_VALUES[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast('임시 저장되었습니다.', 'success')}
        >
          임시 저장
        </Button>
        <Button size="sm" style={{ background: ACCENT }} onClick={onSave}>
          새 버전으로 저장
        </Button>
      </div>
    </div>
  );
}

// ─── Cover Letter Tab ─────────────────────────────────────────────────────────

function CoverLetterTab() {
  const [answers, setAnswers] = useState({
    Q1: '저는 어릴 때부터 소프트웨어가 사람들의 삶을 변화시키는 모습에 매료되어 개발자의 꿈을 키워왔습니다. 특히 (주)테크노바가 추구하는 "기술로 사회 문제를 해결한다"는 비전이 제 가치관과 깊이 일치하여 지원하게 되었습니다.',
    Q2: '',
    Q3: '',
  });
  const [aiUsed, setAiUsed] = useState({ Q1: false, Q2: false, Q3: false });
  const [aiLoading, setAiLoading] = useState({ Q1: false, Q2: false, Q3: false });

  const handleAI = async (id, type) => {
    setAiLoading((prev) => ({ ...prev, [id]: true }));
    await new Promise((r) => setTimeout(r, 1200));
    setAiLoading((prev) => ({ ...prev, [id]: false }));
    setAiUsed((prev) => ({ ...prev, [id]: true }));
    if (type === '초안') {
      setAnswers((prev) => ({
        ...prev,
        [id]: `[AI 초안] 저는 ${id === 'Q2' ? '어린 시절 다양한 도전을 통해' : '직무 관련 프로젝트 경험을 통해'} 성장해왔습니다. 이 내용은 AI가 생성한 초안입니다. 본인의 경험과 언어로 수정해 주세요.`,
      }));
    } else {
      toast('AI 첨삭이 완료되었습니다. 아래 수정안을 검토하세요.', 'success');
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[800px]">
      {CBI_QUESTIONS.map((q) => {
        const chars = answers[q.id]?.length ?? 0;
        const isOver = chars > q.limit;
        const used = aiUsed[q.id];
        const loading = aiLoading[q.id];
        return (
          <div
            key={q.id}
            className={`bg-white rounded-[8px] border shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden ${isOver ? 'border-[#FECACA]' : 'border-[#E5E7EB]'}`}
          >
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2 flex-wrap">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[13px] font-bold text-[#1F2328] flex-1">{q.label}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAI(q.id, '초안')}
                  disabled={loading}
                  className="h-7 px-3 text-[11px] font-bold rounded-[5px] border border-[#E5E7EB] text-[#656D76] hover:border-[#059669] hover:text-[#059669] transition-colors disabled:opacity-50"
                >
                  {loading ? '생성 중…' : '✦ AI 초안 생성'}
                </button>
                <button
                  onClick={() => handleAI(q.id, '첨삭')}
                  disabled={loading || !answers[q.id]}
                  className="h-7 px-3 text-[11px] font-bold rounded-[5px] border border-[#E5E7EB] text-[#656D76] hover:border-[#059669] hover:text-[#059669] transition-colors disabled:opacity-50"
                >
                  ✦ AI 첨삭
                </button>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] text-[#9AA0A6] mb-2">{q.hint}</p>
              <textarea
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                rows={6}
                placeholder="내용을 입력해 주세요."
                className={`w-full px-3 py-2.5 text-[13px] border rounded-[6px] resize-none focus:outline-none placeholder:text-[#C8D0D9] ${isOver ? 'border-[#FECACA] focus:border-[#CF222E]' : 'border-[#E5E7EB] focus:border-[#059669]'}`}
              />
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-2">
                  {used && (
                    <>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#9AA0A6]">
                        AI 보조 사용
                      </span>
                      <span className="text-[10px] text-[#C8D0D9]">
                        AI 생성 결과는 참고안이며 최종 확정은 본인이 합니다.
                      </span>
                    </>
                  )}
                </div>
                <span
                  className={`text-[12px] font-bold ${isOver ? 'text-[#CF222E]' : chars > q.limit * 0.8 ? 'text-[#D97706]' : 'text-[#9AA0A6]'}`}
                >
                  {chars.toLocaleString()} / {q.limit.toLocaleString()}자
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast('임시 저장되었습니다.', 'success')}
        >
          임시 저장
        </Button>
        <Button
          size="sm"
          style={{ background: ACCENT }}
          onClick={() => toast('자기소개서가 저장되었습니다.', 'success')}
        >
          저장
        </Button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ResumeEditor() {
  const [tab, setTab] = useState('resume');
  const [version, setVersion] = useState('v3 (최신)');

  const handleSave = () => {
    toast('새 버전(v4)으로 저장되었습니다.', 'success');
  };

  return (
    <div>
      {/* Version controls */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-[12px] font-semibold text-[#656D76]">버전</label>
          <select
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="h-8 px-3 pr-7 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] appearance-none"
          >
            <option>v3 (최신)</option>
            <option>v2</option>
            <option>v1</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            새 버전으로 저장
          </Button>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'resume', label: '이력서' },
          { key: 'coverletter', label: '자기소개서' },
        ]}
        active={tab}
        onChange={setTab}
        accentColor={ACCENT}
      />

      {tab === 'resume' && <ResumeTab onSave={handleSave} />}
      {tab === 'coverletter' && <CoverLetterTab />}
    </div>
  );
}
