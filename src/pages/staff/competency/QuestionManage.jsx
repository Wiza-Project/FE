import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, EmptyState, FileUpload, Modal, SkeletonLoader, toast } from '@/components/common';
import {
  editAssessmentQuestion,
  fetchAssessmentQuestions,
  fetchAssessmentQuestionVersionHistory,
  fetchCompetencyList,
  uploadAssessmentQuestions,
} from '@/api/competency';
import { ApiError } from '@/api/client';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// 새 응답옵션 행을 추가할 때 쓸 기본 라벨 없는 항목
const emptyOption = (value) => ({ value, label: '' });

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function QuestionManage() {
  const queryClient = useQueryClient();

  const [competencyId, setCompetencyId] = useState('');
  const [keyword, setKw] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // Excel upload (SCR-A03 #4)
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  // Drawer form
  const [fContent, setFContent] = useState('');
  const [fReverse, setFReverse] = useState(false);
  const [fOptions, setFOptions] = useState([]);

  const {
    data: competencyData,
    isLoading: competencyLoading,
    isError: competencyErrored,
  } = useQuery({
    queryKey: ['competencyList'],
    queryFn: fetchCompetencyList,
  });
  const competencyOptions = competencyData ?? [];

  const {
    data: questionData,
    isLoading: questionsLoading,
    isError: questionsErrored,
  } = useQuery({
    queryKey: ['assessmentQuestions', competencyId],
    queryFn: () => fetchAssessmentQuestions(Number(competencyId)),
    enabled: !!competencyId,
  });
  const questions = questionData ?? [];

  const filtered = questions.filter((q) => {
    if (!keyword) return true;
    return q.questionText.includes(keyword) || String(q.questionId).includes(keyword);
  });

  const { data: versionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['assessmentQuestionVersionHistory', editTarget?.previousQuestionId],
    queryFn: () => fetchAssessmentQuestionVersionHistory(editTarget.previousQuestionId),
    enabled: drawerOpen && !!editTarget?.previousQuestionId,
  });

  const openEdit = (q) => {
    setEditTarget(q);
    setFContent(q.questionText);
    setFReverse(q.reverse);
    if (Array.isArray(q.responseOptions)) {
      setFOptions(q.responseOptions.map((o) => ({ ...o })));
    } else {
      // BE가 responseOptions를 배열이 아닌 형태로 내려주는 경우 방어 — 서버 응답 이상 시
      // 빈 목록으로 시작해 사용자가 다시 입력하도록 한다.
      setFOptions([]);
      toast('응답옵션 정보를 불러오지 못했습니다. 새로 입력해 주세요.', 'error');
    }
    setDrawerOpen(true);
  };

  const updateOptionLabel = (idx, val) => {
    setFOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, label: val } : o)));
  };

  // value는 항상 1부터 시작하는 연속 정수로 유지한다(추가 시 prev.length + 1이 다음 값과 같도록).
  // 이 불변식이 깨지면 addOption이 기존 항목과 겹치는 value를 만들 수 있다.
  const addOption = () => {
    setFOptions((prev) => [...prev, emptyOption(prev.length + 1)]);
  };

  const removeOption = (idx) => {
    setFOptions((prev) =>
      prev.filter((_, i) => i !== idx).map((o, i) => ({ ...o, value: i + 1 })),
    );
  };

  const editMutation = useMutation({
    mutationFn: editAssessmentQuestion,
    onSuccess: (updated) => {
      setDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['assessmentQuestions', competencyId] });
      // questionId가 요청한 id와 다르면 BE가 제자리 수정 대신 새 버전을 만든 것이다(응시 이력 존재).
      if (updated.questionId !== editTarget.questionId) {
        toast(
          `응시 이력이 있어 새 버전(v${updated.versionNo})으로 저장되었습니다. 기존 버전은 과거 응시 기록에 그대로 보존됩니다.`,
          'success',
        );
      } else {
        toast('문항이 수정되었습니다.', 'success');
      }
    },
    onError: (e) => {
      toast(e instanceof ApiError ? e.message : '문항 수정에 실패했습니다.', 'error');
    },
  });

  const saveQuestion = () => {
    if (!fContent.trim()) {
      toast('문항 내용을 입력해 주세요.', 'error');
      return;
    }
    if (fOptions.length === 0) {
      toast('응답옵션은 최소 1개 이상이어야 합니다.', 'error');
      return;
    }
    if (fOptions.some((o) => !o.label.trim())) {
      toast('응답옵션 라벨을 모두 입력해 주세요.', 'error');
      return;
    }
    editMutation.mutate({
      questionId: editTarget.questionId,
      questionText: fContent.trim(),
      reverse: fReverse,
      responseOptions: fOptions,
    });
  };

  const openUpload = () => {
    setUploadFile(null);
    setUploadResult(null);
    setUploadOpen(true);
  };

  const uploadMutation = useMutation({
    mutationFn: uploadAssessmentQuestions,
    onSuccess: (result) => {
      setUploadResult(result);
      if (result.failureCount === 0) {
        toast(`${result.successCount}건의 문항이 등록되었습니다.`, 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['assessmentQuestions'] });
    },
    onError: (e) => {
      toast(e instanceof ApiError ? e.message : '엑셀 업로드에 실패했습니다.', 'error');
    },
  });

  const submitUpload = () => {
    if (!uploadFile) {
      toast('업로드할 엑셀 파일을 선택해 주세요.', 'error');
      return;
    }
    uploadMutation.mutate(uploadFile);
  };

  const competencyPlaceholder = competencyLoading
    ? '불러오는 중…'
    : competencyErrored
      ? '목록을 불러오지 못했습니다'
      : '핵심역량을 선택하세요';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">문항 관리</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            역량 진단 문항 수정·버전 관리 — 신규 등록은 엑셀 업로드로만 가능합니다.
          </p>
        </div>
        <Button variant="outline" onClick={openUpload}>
          엑셀 업로드
        </Button>
      </div>

      {/* FilterBar */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-4 mb-4 flex gap-3 flex-wrap items-end">
        <div className="flex flex-col gap-1 w-48">
          <label className="text-[10px] font-semibold text-[#656D76]">핵심역량</label>
          <select
            value={competencyId}
            onChange={(e) => setCompetencyId(e.target.value)}
            disabled={competencyLoading || competencyErrored}
            className="h-8 px-2 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151] disabled:bg-[#F3F4F6] disabled:text-[#9AA0A6]"
          >
            <option value="">{competencyPlaceholder}</option>
            {competencyOptions.map((c) => (
              <option key={c.competencyId} value={c.competencyId}>
                {c.competencyCode} {c.competencyName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-[10px] font-semibold text-[#656D76]">문항 검색</label>
          <input
            value={keyword}
            onChange={(e) => setKw(e.target.value)}
            placeholder="문항 ID 또는 내용..."
            disabled={!competencyId}
            className="h-8 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#374151] disabled:bg-[#F3F4F6]"
          />
        </div>
        <div className="flex items-end">
          <span
            className="text-[12px] font-bold px-3 py-1.5 rounded-[6px] bg-[#F3F4F6]"
            style={{ color: ACCENT }}
          >
            {filtered.length}문항
          </span>
        </div>
      </div>

      {/* Table */}
      {!competencyId ? (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB]">
          <EmptyState message="핵심역량을 선택하면 문항 목록을 볼 수 있습니다." />
        </div>
      ) : questionsLoading ? (
        <SkeletonLoader rows={6} cols={6} />
      ) : questionsErrored ? (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB]">
          <EmptyState message="문항 목록을 불러오지 못했습니다." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB]">
          <EmptyState message="등록된 문항이 없습니다." sub="엑셀 업로드로 문항을 등록해 주세요." />
        </div>
      ) : (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {['문항 ID', '문항 내용', '역문항', '버전', '응답옵션', '관리'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 2 ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr
                    key={q.questionId}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[10px]" style={{ color: ACCENT }}>
                      {q.questionId}
                    </td>
                    <td className="px-4 py-3 max-w-[360px]">
                      <p className="text-[12px] text-[#1F2328] leading-snug line-clamp-2">
                        {q.questionText}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {q.reverse ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
                          Y
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#D1D5DB]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-[11px] text-[#9AA0A6]">
                      v{q.versionNo}
                    </td>
                    <td className="px-4 py-3 text-center text-[11px] text-[#656D76]">
                      {Array.isArray(q.responseOptions) ? `${q.responseOptions.length}개` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEdit(q)}
                        className="h-5 px-2 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] hover:bg-[#F3F4F6] transition-colors"
                        style={{ color: ACCENT }}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Question edit drawer ── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="문항 수정"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDrawerOpen(false)}
              disabled={editMutation.isPending}
            >
              취소
            </Button>
            <Button
              style={{ background: ACCENT }}
              onClick={saveQuestion}
              loading={editMutation.isPending}
            >
              수정 저장
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {editTarget && (
            <p className="text-[10px] font-mono text-[#9AA0A6]">
              {editTarget.questionId} · {editTarget.competencyName} · v{editTarget.versionNo}
            </p>
          )}

          <div className="p-3 rounded-[8px] bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E] leading-relaxed">
            응시 이력이 있는 문항을 수정하면 자동으로 <strong>새 버전</strong>이 만들어지고, 기존
            버전은 과거 진단 응시 기록에 그대로 보존됩니다. 응시 이력이 없는 문항은 내용이 바로
            수정됩니다.
          </div>

          {/* Content */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              문항 내용 <span className="text-[#CF222E]">*</span>
            </label>
            <textarea
              value={fContent}
              onChange={(e) => setFContent(e.target.value)}
              rows={4}
              placeholder="나는 ..."
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151] bg-white"
            />
            <p className="text-[10px] text-[#9AA0A6] mt-1">{fContent.length}자</p>
          </div>

          {/* Reverse item toggle */}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-2">
              역문항 여부
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFReverse(!fReverse)}
                className={`relative w-9 h-5 rounded-full transition-colors ${fReverse ? '' : 'bg-[#D1D5DB]'}`}
                style={fReverse ? { background: '#D97706' } : {}}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${fReverse ? 'translate-x-4' : ''}`}
                />
              </button>
              <span
                className={`text-[12px] font-semibold ${fReverse ? 'text-[#D97706]' : 'text-[#9AA0A6]'}`}
              >
                {fReverse ? '역문항' : '일반문항'}
              </span>
            </div>
          </div>

          {/* Response options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-[#656D76]">응답옵션</label>
              <button
                onClick={addOption}
                className="h-6 px-2 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors"
                style={{ color: ACCENT }}
              >
                + 항목 추가
              </button>
            </div>
            <div className="rounded-[8px] border border-[#E5E7EB] overflow-hidden">
              {fOptions.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-4 py-2.5 ${idx < fOptions.length - 1 ? 'border-b border-[#F3F4F6]' : ''} hover:bg-[#FAFAFA]`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                    style={{ background: ACCENT }}
                  >
                    {item.value}
                  </div>
                  <input
                    value={item.label}
                    onChange={(e) => updateOptionLabel(idx, e.target.value)}
                    placeholder="응답 라벨"
                    className="flex-1 text-[12px] bg-transparent focus:outline-none focus:bg-white focus:border-b focus:border-[#374151] pb-0.5 transition-all"
                  />
                  <button
                    onClick={() => removeOption(idx)}
                    disabled={fOptions.length <= 1}
                    className="text-[11px] text-[#9AA0A6] hover:text-[#CF222E] disabled:opacity-30 disabled:hover:text-[#9AA0A6] shrink-0"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Version history */}
          {editTarget?.previousQuestionId && (
            <div>
              <label className="block text-[11px] font-semibold text-[#656D76] mb-2">
                이전 버전 이력
              </label>
              {historyLoading ? (
                <p className="text-[11px] text-[#9AA0A6]">불러오는 중…</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(versionHistory ?? []).map((h) => (
                    <div
                      key={h.questionId}
                      className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB]"
                    >
                      <p className="text-[10px] font-mono text-[#9AA0A6] mb-1">
                        {h.questionId} · v{h.versionNo}
                      </p>
                      <p className="text-[12px] text-[#1F2328] leading-snug">{h.questionText}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>

      {/* ── Excel upload modal (SCR-A03 #4) ── */}
      <Modal
        open={uploadOpen}
        onClose={() => {
          if (!uploadMutation.isPending) setUploadOpen(false);
        }}
        title="진단문항 엑셀 업로드"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={uploadMutation.isPending}
            >
              닫기
            </Button>
            {!uploadResult && (
              <Button
                style={{ background: ACCENT }}
                onClick={submitUpload}
                loading={uploadMutation.isPending}
              >
                업로드
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-[11px] text-[#656D76] leading-relaxed">
            엑셀 컬럼(상위역량 | 하위역량 | 문항번호 | 평가문항)에서 <strong>상위역량</strong>·
            <strong>평가문항</strong>만 사용됩니다. 응답옵션(5점 리커트)은 서버가 자동으로
            채우며, 역문항 여부는 전량 &apos;일반문항&apos;으로 등록됩니다.
          </div>

          {!uploadResult && (
            <FileUpload
              accept=".xlsx,.xls"
              maxSize="10MB"
              onFiles={(files) => setUploadFile(files[0] ?? null)}
            />
          )}

          {uploadResult && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-[8px] border border-[#E5E7EB] p-3 text-center">
                  <p className="text-[10px] text-[#9AA0A6] mb-1">전체</p>
                  <p className="text-[16px] font-black text-[#1F2328]">
                    {uploadResult.totalRows}
                  </p>
                </div>
                <div className="rounded-[8px] border border-[#D1FAE5] bg-[#ECFDF5] p-3 text-center">
                  <p className="text-[10px] text-[#059669] mb-1">성공</p>
                  <p className="text-[16px] font-black text-[#059669]">
                    {uploadResult.successCount}
                  </p>
                </div>
                <div className="rounded-[8px] border border-[#FEE2E2] bg-[#FEF2F2] p-3 text-center">
                  <p className="text-[10px] text-[#DC2626] mb-1">실패</p>
                  <p className="text-[16px] font-black text-[#DC2626]">
                    {uploadResult.failureCount}
                  </p>
                </div>
              </div>

              {uploadResult.warnings.length > 0 && (
                <div className="p-3 rounded-[8px] bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E] leading-relaxed">
                  {uploadResult.warnings.map((w) => (
                    <p key={w}>⚠ {w}</p>
                  ))}
                </div>
              )}

              {uploadResult.failures.length > 0 && (
                <div className="rounded-[8px] border border-[#E5E7EB] max-h-40 overflow-auto">
                  {uploadResult.failures.map((f) => (
                    <div
                      key={f.excelRowNo}
                      className="flex items-start gap-2 px-3 py-2 border-b border-[#F3F4F6] last:border-0"
                    >
                      <span className="text-[10px] font-mono text-[#9AA0A6] shrink-0">
                        {f.excelRowNo}행
                      </span>
                      <span className="text-[11px] text-[#CF222E]">{f.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
