import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tabs,
  Button,
  RadarChart,
  EmptyState,
  SkeletonLoader,
  ConfirmDialog,
  toast,
} from '@/components/common';
import {
  fetchCoverLetters,
  fetchCoverLetter,
  createCoverLetter,
  updateCoverLetter,
  createCoverLetterVersion,
  deleteCoverLetter,
} from '@/api/careerDocuments';
import { ApiError } from '@/api/client';
import { formatDateTime } from '@/utils/date';

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

/** ApiError면 서버 메시지를, 아니면 네트워크 오류 문구를 돌려준다(403/404 등도 서버 메시지 우선). */
function getCoverLetterErrorMessage(error, fallback) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  return error.message || fallback;
}

function CoverLetterTab() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['career', 'coverLetters'],
    queryFn: () => fetchCoverLetters(),
  });
  const versions = listQuery.data?.content ?? [];
  const hasAny = versions.length > 0;

  const [selectedId, setSelectedId] = useState(null);
  const [loadedId, setLoadedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // 문항 questionId 채번용 — 배열 길이 기반으로 만들면 삭제 후 추가 시 기존 문항과 충돌할
  // 수 있어, 지금까지 나온 최대 번호보다 항상 큰 값을 내도록 별도로 관리한다.
  const nextQuestionSeqRef = useRef(1);
  const parseQuestionSeq = (id) => {
    const m = /^Q(\d+)$/.exec(id ?? '');
    return m ? Number(m[1]) : 0;
  };
  const makeQuestionId = () => {
    const id = `Q${nextQuestionSeqRef.current}`;
    nextQuestionSeqRef.current += 1;
    return id;
  };

  // 목록이 로드되면 최신 버전(서버가 최신순으로 내려주는 첫 항목)을 기본 선택한다.
  useEffect(() => {
    const list = listQuery.data?.content;
    if (!list) return;
    if (list.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) =>
      prev && list.some((v) => v.careerDocumentId === prev) ? prev : list[0].careerDocumentId,
    );
  }, [listQuery.data]);

  const detailQuery = useQuery({
    queryKey: ['career', 'coverLetter', selectedId],
    queryFn: () => fetchCoverLetter(selectedId),
    enabled: !!selectedId,
  });

  // 선택한 문서가 바뀌었을 때만 폼에 서버 데이터를 채운다 — 같은 문서의 백그라운드
  // 재조회(저장 후 invalidate 등)로 입력 중인 내용이 덮어써지지 않도록 한다.
  useEffect(() => {
    const doc = detailQuery.data;
    if (!doc || doc.careerDocumentId === loadedId) return;
    setTitle(doc.documentTitle ?? '');
    // 누락된 questionId는 서버가 이미 내려준 값들과 겹치지 않는 다음 번호로 채운다.
    const existingIds = new Set((doc.questions ?? []).map((q) => q.questionId).filter(Boolean));
    let fallbackSeq = 1;
    const nextFallbackId = () => {
      while (existingIds.has(`Q${fallbackSeq}`)) fallbackSeq += 1;
      const id = `Q${fallbackSeq}`;
      existingIds.add(id);
      return id;
    };
    const loadedQuestions = (doc.questions ?? []).map((q) => ({
      questionId: q.questionId ?? nextFallbackId(),
      question: q.question ?? '',
      answer: q.answer ?? '',
    }));
    setQuestions(loadedQuestions);
    nextQuestionSeqRef.current =
      Math.max(0, ...loadedQuestions.map((q) => parseQuestionSeq(q.questionId))) + 1;
    setLoadedId(doc.careerDocumentId);
    setCreating(false);
  }, [detailQuery.data, loadedId]);

  const startCreate = () => {
    setSelectedId(null);
    setLoadedId(null);
    setTitle('');
    setQuestions([{ questionId: 'Q1', question: '', answer: '' }]);
    nextQuestionSeqRef.current = 2;
    setCreating(true);
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { questionId: makeQuestionId(), question: '', answer: '' }]);
  };

  const removeQuestion = (idx) => {
    if (questions.length <= 1) {
      toast('문항은 최소 1개 이상이어야 합니다.', 'error');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const buildPayload = () => ({
    documentTitle: title.trim(),
    questions: questions.map(({ questionId, question, answer }) => ({
      questionId,
      question: question.trim(),
      answer: answer.trim(),
    })),
    aiAssistanceUsed: false,
  });

  const validate = () => {
    if (!title.trim()) {
      toast('제목을 입력해 주세요.', 'error');
      return false;
    }
    if (questions.length === 0) {
      toast('문항을 1개 이상 추가해 주세요.', 'error');
      return false;
    }
    for (const q of questions) {
      if (!q.question.trim()) {
        toast('빈 질문이 있습니다. 모든 문항의 질문을 입력해 주세요.', 'error');
        return false;
      }
      if (!q.answer.trim()) {
        toast('빈 답변이 있습니다. 모든 문항의 답변을 입력해 주세요.', 'error');
        return false;
      }
    }
    return true;
  };

  const createMutation = useMutation({
    mutationFn: createCoverLetter,
    onSuccess: (doc) => {
      queryClient.setQueryData(['career', 'coverLetter', doc.careerDocumentId], doc);
      queryClient.invalidateQueries({ queryKey: ['career', 'coverLetters'] });
      setSelectedId(doc.careerDocumentId);
      setCreating(false);
      toast('자기소개서가 저장되었습니다.', 'success');
    },
    onError: (err) => toast(getCoverLetterErrorMessage(err, '저장에 실패했습니다.'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateCoverLetter(selectedId, payload),
    onSuccess: (doc) => {
      queryClient.setQueryData(['career', 'coverLetter', doc.careerDocumentId], doc);
      queryClient.invalidateQueries({ queryKey: ['career', 'coverLetters'] });
      toast('자기소개서가 저장되었습니다.', 'success');
    },
    onError: (err) => toast(getCoverLetterErrorMessage(err, '저장에 실패했습니다.'), 'error'),
  });

  const versionMutation = useMutation({
    mutationFn: () => createCoverLetterVersion(selectedId),
    onSuccess: (doc) => {
      queryClient.setQueryData(['career', 'coverLetter', doc.careerDocumentId], doc);
      queryClient.invalidateQueries({ queryKey: ['career', 'coverLetters'] });
      setSelectedId(doc.careerDocumentId);
      toast('새 버전이 생성되었습니다.', 'success');
    },
    onError: (err) =>
      toast(getCoverLetterErrorMessage(err, '새 버전 생성에 실패했습니다.'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCoverLetter(selectedId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['career', 'coverLetter', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['career', 'coverLetters'] });
      setSelectedId(null);
      setLoadedId(null);
      setDeleteConfirmOpen(false);
      toast('자기소개서가 삭제되었습니다.', 'success');
    },
    onError: (err) => {
      toast(getCoverLetterErrorMessage(err, '삭제에 실패했습니다.'), 'error');
      setDeleteConfirmOpen(false);
    },
  });

  const saving =
    createMutation.isPending || updateMutation.isPending || versionMutation.isPending;

  const handleSave = () => {
    if (saving || !validate()) return;
    if (creating || !selectedId) {
      createMutation.mutate(buildPayload());
    } else {
      updateMutation.mutate(buildPayload());
    }
  };

  // ── 로딩 / 오류 / 빈 상태 ──
  if (listQuery.isLoading) {
    return <SkeletonLoader rows={4} cols={3} />;
  }

  if (listQuery.isError) {
    return (
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-10 text-center">
        <p className="text-[14px] font-bold text-[#1F2328] mb-3">
          {getCoverLetterErrorMessage(listQuery.error, '자기소개서 목록을 불러오지 못했습니다.')}
        </p>
        <Button size="sm" variant="outline" onClick={() => listQuery.refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (!hasAny && !creating) {
    return (
      <EmptyState
        message="아직 작성한 자기소개서가 없습니다."
        sub="첫 자기소개서를 작성하고 버전으로 관리해 보세요."
        action={
          <Button size="sm" style={{ background: ACCENT }} onClick={startCreate}>
            첫 자기소개서 작성
          </Button>
        }
      />
    );
  }

  const showForm = creating || (!!selectedId && !!detailQuery.data);
  const detailLoading = !creating && !!selectedId && detailQuery.isLoading;
  const detailErrored = !creating && !!selectedId && detailQuery.isError;

  return (
    <div className="flex flex-col gap-4 max-w-[800px]">
      {/* 버전 선택 · 새 버전 생성 */}
      {hasAny && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-4 flex items-center gap-3 flex-wrap">
          <label
            htmlFor="coverLetterVersion"
            className="text-[12px] font-semibold text-[#656D76]"
          >
            버전
          </label>
          <select
            id="coverLetterVersion"
            value={creating ? '' : (selectedId ?? '')}
            onChange={(e) => {
              setCreating(false);
              setSelectedId(Number(e.target.value));
            }}
            className="h-8 px-3 pr-7 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] appearance-none"
          >
            {versions.map((v, i) => (
              <option key={v.careerDocumentId} value={v.careerDocumentId}>
                {v.documentTitle} · v{v.versionNo}
                {i === 0 ? ' (최신)' : ''} · {formatDateTime(v.updatedAt)}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedId || saving}
            loading={versionMutation.isPending}
            onClick={() => versionMutation.mutate()}
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            새 버전 생성
          </Button>
        </div>
      )}

      {detailLoading && <SkeletonLoader rows={3} cols={2} />}

      {detailErrored && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-10 text-center">
          <p className="text-[14px] font-bold text-[#1F2328]">
            {getCoverLetterErrorMessage(
              detailQuery.error,
              '문서를 찾을 수 없거나 접근할 수 없습니다.',
            )}
          </p>
        </div>
      )}

      {showForm && !detailLoading && !detailErrored && (
        <>
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <label
              htmlFor="coverLetterTitle"
              className="block text-[12px] font-semibold text-[#656D76] mb-1.5"
            >
              제목
            </label>
            <input
              id="coverLetterTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 2026 하반기 공채 자기소개서"
              className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
            />
          </div>

          {questions.map((q, idx) => {
            const chars = q.answer.length;
            return (
              <div
                key={q.questionId}
                className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
                  <label
                    htmlFor={`question-${idx}`}
                    className="text-[11px] font-semibold text-[#656D76] flex-shrink-0"
                  >
                    문항 {idx + 1}
                  </label>
                  <input
                    id={`question-${idx}`}
                    value={q.question}
                    onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                    placeholder="질문을 입력하세요 (예: 지원 동기)"
                    className="flex-1 h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
                  />
                  <button
                    onClick={() => removeQuestion(idx)}
                    className="text-[#C8D0D9] hover:text-[#CF222E] transition-colors text-[14px] flex-shrink-0"
                    aria-label={`문항 ${idx + 1} 삭제`}
                  >
                    ✕
                  </button>
                </div>
                <div className="px-5 py-4">
                  <label htmlFor={`answer-${idx}`} className="sr-only">
                    문항 {idx + 1} 답변
                  </label>
                  <textarea
                    id={`answer-${idx}`}
                    value={q.answer}
                    onChange={(e) => updateQuestion(idx, 'answer', e.target.value)}
                    rows={6}
                    placeholder="내용을 입력해 주세요."
                    className="w-full px-3 py-2.5 text-[13px] border border-[#E5E7EB] rounded-[6px] resize-none focus:outline-none focus:border-[#059669] placeholder:text-[#C8D0D9]"
                  />
                  <div className="flex items-center justify-end mt-1.5">
                    <span className="text-[12px] font-bold text-[#9AA0A6]">
                      {chars.toLocaleString()}자
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <div>
            <button
              onClick={addQuestion}
              className="h-8 px-3 text-[12px] font-bold rounded-[6px] border border-dashed border-[#D1D5DB] text-[#656D76] hover:border-[#059669] hover:text-[#059669] transition-colors"
            >
              + 문항 추가
            </button>
          </div>

          <div className="flex justify-end gap-2">
            {!creating && selectedId && (
              <Button
                size="sm"
                variant="outline"
                style={{ color: '#CF222E', borderColor: '#FECACA' }}
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={saving || deleteMutation.isPending}
              >
                삭제
              </Button>
            )}
            <Button size="sm" style={{ background: ACCENT }} loading={saving} onClick={handleSave}>
              저장
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="자기소개서 삭제"
        message="이 버전을 삭제하면 되돌릴 수 없습니다. 삭제하시겠습니까?"
        confirmLabel="삭제"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * 이력서·자기소개서 화면. 이력서 탭은 아직 API 연동 대상이 아니라 기존 목업을 그대로 유지하고,
 * 자기소개서 탭만 실제 API(자기소개서 버전 CRUD)로 동작한다. 상단 "버전" 공용 컨트롤은 이력서
 * 탭 전용 목업이라 자기소개서 탭에서는 숨기고, 자기소개서 자체 버전 선택 UI를 탭 내부에 둔다.
 */
export default function ResumeEditor() {
  const [tab, setTab] = useState('resume');
  const [version, setVersion] = useState('v3 (최신)');

  const handleSave = () => {
    toast('새 버전(v4)으로 저장되었습니다.', 'success');
  };

  return (
    <div>
      {tab === 'resume' && (
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
      )}

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
