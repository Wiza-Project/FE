import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tabs,
  Button,
  EmptyState,
  SkeletonLoader,
  ConfirmDialog,
  toast,
} from '@/components/common';
import {
  fetchResumes,
  fetchResume,
  createResume,
  updateResume,
  createResumeVersion,
  deleteResume,
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

/**
 * ApiError면 서버 메시지를, 아니면 네트워크 오류 문구를 돌려준다(403/404 등도 서버 메시지 우선).
 * 이력서 contentData 검증 실패(C001)는 "contentData.contact.email: 올바른 이메일 형식이
 * 아닙니다." 처럼 내부 필드 경로를 붙여 콤마로 이어붙여 내려오므로, 그 경로 접두어만 지워
 * 사용자에게는 메시지만 보이게 한다.
 */
function getApiErrorMessage(error, fallback) {
  if (!(error instanceof ApiError)) {
    return '네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  const raw = error.message || fallback;
  return raw
    .split(', ')
    .map((part) => part.replace(/^[\w.[\]]+:\s*/, ''))
    .join(' / ');
}

// ─── Resume Tab ───────────────────────────────────────────────────────────────
// 이력서 contentData는 서버가 검증하는 고정 템플릿이다. 성명·학력·경력·자격·
// 어학 모두 학사행정 자동 연동 없이 학생이 직접 입력한다 — 비교과·핵심역량 자동 채움은
// 원천 도메인 준비 후 별도 API로 추가될 예정이라 아직 없다.

const emptyContact = () => ({ name: '', phoneNumber: '', email: '', address: '' });
const emptyEducation = () => ({
  schoolName: '',
  major: '',
  admissionDate: '',
  graduationDate: '',
  enrollmentStatus: '',
});
const emptyCareer = () => ({
  companyName: '',
  position: '',
  startDate: '',
  endDate: '',
  description: '',
});
const emptyCertification = () => ({ certificationName: '', issuer: '', acquiredDate: '' });
const emptyLanguageTest = () => ({ testName: '', score: '', acquiredDate: '' });
const withDefaults = (defaults, source) =>
  Object.fromEntries(Object.keys(defaults).map((key) => [key, source?.[key] ?? defaults[key]]));

const EDUCATION_FIELDS = [
  { key: 'schoolName', label: '학교명', required: true, placeholder: '예) 가나다대학교', maxLength: 100 },
  { key: 'major', label: '전공', placeholder: '예) 컴퓨터공학과', maxLength: 100 },
  { key: 'admissionDate', label: '입학일', type: 'date', width: 150 },
  { key: 'graduationDate', label: '졸업일', type: 'date', width: 150 },
  { key: 'enrollmentStatus', label: '학적상태', placeholder: '예) 재학중, 졸업', width: 120, maxLength: 20 },
];

const CAREER_FIELDS = [
  { key: 'companyName', label: '회사명', required: true, placeholder: '예) (주)테크노바', maxLength: 100 },
  { key: 'position', label: '직위·직무', placeholder: '예) 백엔드 개발자', maxLength: 100 },
  { key: 'startDate', label: '시작일', type: 'date', width: 150 },
  { key: 'endDate', label: '종료일', type: 'date', width: 150 },
];

const CERTIFICATION_FIELDS = [
  { key: 'certificationName', label: '자격증명', required: true, placeholder: '예) 정보처리기사', maxLength: 100 },
  { key: 'issuer', label: '발급기관', placeholder: '예) 한국산업인력공단', maxLength: 100 },
  { key: 'acquiredDate', label: '취득일', type: 'date', width: 150 },
];

const LANGUAGE_TEST_FIELDS = [
  { key: 'testName', label: '시험명', required: true, placeholder: '예) TOEIC', maxLength: 100 },
  { key: 'score', label: '점수/등급', placeholder: '예) 905, AL', width: 140, maxLength: 20 },
  { key: 'acquiredDate', label: '취득일', type: 'date', width: 150 },
];

/**
 * 학력·경력·자격증·어학처럼 "여러 건을 추가/삭제하는 카드형 목록" 공통 UI.
 * @param {Object} props
 * @param {string} props.title
 * @param {Object[]} props.items
 * @param {Object[]} props.fields 각 항목: {key, label, required?, placeholder?, type?, width?, maxLength?}
 * @param {{key: string, label: string, placeholder?: string, maxLength?: number}} [props.textField] 전체 폭 textarea(설명 등)
 * @param {string} props.emptyMessage
 * @param {string} props.emptySub
 * @param {() => void} props.onAdd
 * @param {(idx: number) => void} props.onRemove
 * @param {(idx: number, field: string, value: string) => void} props.onChange
 */
function RepeatableFieldSection({
  title,
  items,
  fields,
  textField,
  emptyMessage,
  emptySub,
  onAdd,
  onRemove,
  onChange,
}) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
        <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
        <h2 className="text-[14px] font-bold text-[#1F2328]">{title}</h2>
        <button
          onClick={onAdd}
          className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-[5px] border text-[#059669] border-[#059669] hover:bg-[#F0FDF4] transition-colors"
        >
          + 추가
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState message={emptyMessage} sub={emptySub} />
      ) : (
        <div className="divide-y divide-[#F3F4F6]">
          {items.map((item, idx) => (
            <div key={idx} className="px-5 py-4 flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-2.5 items-end">
                {fields.map((f) => (
                  <div key={f.key} style={{ flex: f.width ? `0 1 ${f.width}px` : '1 1 140px' }}>
                    <label
                      className="block text-[11px] font-semibold text-[#656D76] mb-1"
                      htmlFor={`${title}-${idx}-${f.key}`}
                    >
                      {f.label}
                      {f.required && <span className="text-[#CF222E]"> *</span>}
                    </label>
                    <input
                      id={`${title}-${idx}-${f.key}`}
                      type={f.type ?? 'text'}
                      value={item[f.key] ?? ''}
                      maxLength={f.maxLength}
                      onChange={(e) => onChange(idx, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full h-8 px-2.5 text-[12px] border border-[#E5E7EB] rounded-[5px] focus:outline-none focus:border-[#059669]"
                    />
                  </div>
                ))}
                <button
                  onClick={() => onRemove(idx)}
                  className="h-8 px-1 text-[#C8D0D9] hover:text-[#CF222E] transition-colors text-[13px]"
                  aria-label={`${title} ${idx + 1} 삭제`}
                >
                  ✕
                </button>
              </div>
              {textField && (
                <div>
                  <label
                    className="block text-[11px] font-semibold text-[#656D76] mb-1"
                    htmlFor={`${title}-${idx}-${textField.key}`}
                  >
                    {textField.label}
                  </label>
                  <textarea
                    id={`${title}-${idx}-${textField.key}`}
                    value={item[textField.key] ?? ''}
                    maxLength={textField.maxLength}
                    onChange={(e) => onChange(idx, textField.key, e.target.value)}
                    placeholder={textField.placeholder}
                    rows={2}
                    className="w-full px-2.5 py-2 text-[12px] border border-[#E5E7EB] rounded-[5px] resize-none focus:outline-none focus:border-[#059669]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeTab() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['career', 'resumes'],
    queryFn: () => fetchResumes(),
  });
  const versions = listQuery.data?.content ?? [];
  const hasAny = versions.length > 0;

  const [selectedId, setSelectedId] = useState(null);
  const [loadedId, setLoadedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [title, setTitle] = useState('이력서');
  const [contact, setContact] = useState(emptyContact());
  const [educations, setEducations] = useState([]);
  const [careers, setCareers] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [languageTests, setLanguageTests] = useState([]);
  const [portfolioUrl, setPortfolioUrl] = useState('');

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
    queryKey: ['career', 'resume', selectedId],
    queryFn: () => fetchResume(selectedId),
    enabled: !!selectedId,
  });

  // 선택한 문서가 바뀌었을 때만 폼에 서버 데이터를 채운다 — 같은 문서의 백그라운드
  // 재조회(저장 후 invalidate 등)로 입력 중인 내용이 덮어써지지 않도록 한다.
  useEffect(() => {
    const doc = detailQuery.data;
    if (!doc || doc.careerDocumentId === loadedId) return;
    setTitle(doc.documentTitle ?? '이력서');
    const content = doc.contentData ?? {};
    setContact(withDefaults(emptyContact(), content.contact));
    setEducations((content.educations ?? []).map((e) => withDefaults(emptyEducation(), e)));
    setCareers((content.careers ?? []).map((c) => withDefaults(emptyCareer(), c)));
    setCertifications((content.certifications ?? []).map((c) => withDefaults(emptyCertification(), c)));
    setLanguageTests((content.languageTests ?? []).map((l) => withDefaults(emptyLanguageTest(), l)));
    setPortfolioUrl(content.extra?.portfolioUrl ?? '');
    setLoadedId(doc.careerDocumentId);
    setCreating(false);
  }, [detailQuery.data, loadedId]);

  const startCreate = () => {
    setSelectedId(null);
    setLoadedId(null);
    setTitle('이력서');
    setContact(emptyContact());
    setEducations([]);
    setCareers([]);
    setCertifications([]);
    setLanguageTests([]);
    setPortfolioUrl('');
    setCreating(true);
  };

  const addItem = (setter, factory) => setter((prev) => [...prev, factory()]);
  const removeItem = (setter, idx) => setter((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (setter, idx, field, value) =>
    setter((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));

  const buildPayload = () => ({
    documentTitle: title.trim(),
    contentData: {
      contact: {
        name: contact.name.trim(),
        phoneNumber: contact.phoneNumber.trim() || null,
        email: contact.email.trim() || null,
        address: contact.address.trim() || null,
      },
      educations: educations.map((e) => ({
        schoolName: e.schoolName.trim(),
        major: e.major.trim() || null,
        admissionDate: e.admissionDate || null,
        graduationDate: e.graduationDate || null,
        enrollmentStatus: e.enrollmentStatus.trim() || null,
      })),
      careers: careers.map((c) => ({
        companyName: c.companyName.trim(),
        position: c.position.trim() || null,
        startDate: c.startDate || null,
        endDate: c.endDate || null,
        description: c.description.trim() || null,
      })),
      certifications: certifications.map((c) => ({
        certificationName: c.certificationName.trim(),
        issuer: c.issuer.trim() || null,
        acquiredDate: c.acquiredDate || null,
      })),
      languageTests: languageTests.map((l) => ({
        testName: l.testName.trim(),
        score: l.score.trim() || null,
        acquiredDate: l.acquiredDate || null,
      })),
      extra: portfolioUrl.trim() ? { portfolioUrl: portfolioUrl.trim() } : {},
    },
  });

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    if (!title.trim()) {
      toast('제목을 입력해 주세요.', 'error');
      return false;
    }
    if (!contact.name.trim()) {
      toast('성명을 입력해 주세요.', 'error');
      return false;
    }
    if (contact.email.trim() && !EMAIL_PATTERN.test(contact.email.trim())) {
      toast('이메일 형식이 올바르지 않습니다.', 'error');
      return false;
    }
    if (educations.some((e) => !e.schoolName.trim())) {
      toast('학력 항목의 학교명을 입력해 주세요.', 'error');
      return false;
    }
    if (careers.some((c) => !c.companyName.trim())) {
      toast('경력 항목의 회사명을 입력해 주세요.', 'error');
      return false;
    }
    if (certifications.some((c) => !c.certificationName.trim())) {
      toast('자격증 항목의 자격증명을 입력해 주세요.', 'error');
      return false;
    }
    if (languageTests.some((l) => !l.testName.trim())) {
      toast('어학 항목의 시험명을 입력해 주세요.', 'error');
      return false;
    }
    return true;
  };

  const createMutation = useMutation({
    mutationFn: createResume,
    onSuccess: (doc) => {
      queryClient.setQueryData(['career', 'resume', doc.careerDocumentId], doc);
      queryClient.invalidateQueries({ queryKey: ['career', 'resumes'] });
      setSelectedId(doc.careerDocumentId);
      setCreating(false);
      toast('이력서가 저장되었습니다.', 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err, '저장에 실패했습니다.'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateResume(selectedId, payload),
    onSuccess: (doc) => {
      queryClient.setQueryData(['career', 'resume', doc.careerDocumentId], doc);
      queryClient.invalidateQueries({ queryKey: ['career', 'resumes'] });
      toast('임시 저장되었습니다.', 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err, '저장에 실패했습니다.'), 'error'),
  });

  const versionMutation = useMutation({
    mutationFn: () => createResumeVersion(selectedId),
    onSuccess: (doc) => {
      queryClient.setQueryData(['career', 'resume', doc.careerDocumentId], doc);
      queryClient.invalidateQueries({ queryKey: ['career', 'resumes'] });
      setSelectedId(doc.careerDocumentId);
      toast('새 버전이 생성되었습니다.', 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err, '새 버전 생성에 실패했습니다.'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteResume(selectedId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['career', 'resume', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['career', 'resumes'] });
      setSelectedId(null);
      setLoadedId(null);
      setDeleteConfirmOpen(false);
      toast('이력서가 삭제되었습니다.', 'success');
    },
    onError: (err) => {
      toast(getApiErrorMessage(err, '삭제에 실패했습니다.'), 'error');
      setDeleteConfirmOpen(false);
    },
  });

  const saving = createMutation.isPending || updateMutation.isPending || versionMutation.isPending;

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
          {getApiErrorMessage(listQuery.error, '이력서 목록을 불러오지 못했습니다.')}
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
        message="아직 작성한 이력서가 없습니다."
        sub="연락처와 학력·경력·자격 정보를 입력하고 첫 이력서를 작성해 보세요."
        action={
          <Button size="sm" style={{ background: ACCENT }} onClick={startCreate}>
            첫 이력서 작성
          </Button>
        }
      />
    );
  }

  const showForm = creating || (!!selectedId && !!detailQuery.data);
  const detailLoading = !creating && !!selectedId && detailQuery.isLoading;
  const detailErrored = !creating && !!selectedId && detailQuery.isError;

  return (
    <div className="flex flex-col gap-4 max-w-[900px]">
      {/* 버전 선택 · 새 버전 생성 */}
      {hasAny && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-4 flex items-center gap-3 flex-wrap">
          <label htmlFor="resumeVersion" className="text-[12px] font-semibold text-[#656D76]">
            버전
          </label>
          <select
            id="resumeVersion"
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
          <span className="text-[11px] text-[#9AA0A6]">
            아직 저장하지 않은 수정값은 새 버전에 반영되지 않습니다. 먼저 임시 저장해 주세요.
          </span>
        </div>
      )}

      {detailLoading && <SkeletonLoader rows={3} cols={2} />}

      {detailErrored && (
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] p-10 text-center">
          <p className="text-[14px] font-bold text-[#1F2328]">
            {getApiErrorMessage(detailQuery.error, '문서를 찾을 수 없거나 접근할 수 없습니다.')}
          </p>
        </div>
      )}

      {showForm && !detailLoading && !detailErrored && (
        <>
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <label htmlFor="resumeTitle" className="block text-[12px] font-semibold text-[#656D76] mb-1.5">
              제목
            </label>
            <input
              id="resumeTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 2026 하반기 이력서"
              className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
            />
          </div>

          {/* 연락처 */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <h2 className="text-[14px] font-bold text-[#1F2328]">연락처</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="resumeName" className="block text-[12px] font-semibold text-[#656D76] mb-1.5">
                  성명 <span className="text-[#CF222E]">*</span>
                </label>
                <input
                  id="resumeName"
                  value={contact.name}
                  maxLength={50}
                  onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                  placeholder="홍길동"
                  className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
                />
              </div>
              <div>
                <label htmlFor="resumePhone" className="block text-[12px] font-semibold text-[#656D76] mb-1.5">
                  연락처
                </label>
                <input
                  id="resumePhone"
                  value={contact.phoneNumber}
                  onChange={(e) => setContact((c) => ({ ...c, phoneNumber: e.target.value }))}
                  placeholder="010-1234-5678"
                  className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
                />
              </div>
              <div>
                <label htmlFor="resumeEmail" className="block text-[12px] font-semibold text-[#656D76] mb-1.5">
                  이메일
                </label>
                <input
                  id="resumeEmail"
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  placeholder="example@korea.ac.kr"
                  className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
                />
              </div>
              <div>
                <label htmlFor="resumeAddress" className="block text-[12px] font-semibold text-[#656D76] mb-1.5">
                  주소
                </label>
                <input
                  id="resumeAddress"
                  value={contact.address}
                  maxLength={200}
                  onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))}
                  placeholder="서울특별시 강남구 …"
                  className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
                />
              </div>
            </div>
          </div>

          <RepeatableFieldSection
            title="학력"
            items={educations}
            fields={EDUCATION_FIELDS}
            emptyMessage="등록한 학력 정보가 없습니다."
            emptySub="+ 추가 버튼으로 학력을 입력해 보세요."
            onAdd={() => addItem(setEducations, emptyEducation)}
            onRemove={(idx) => removeItem(setEducations, idx)}
            onChange={(idx, field, value) => updateItem(setEducations, idx, field, value)}
          />

          <RepeatableFieldSection
            title="경력"
            items={careers}
            fields={CAREER_FIELDS}
            textField={{ key: 'description', label: '설명', placeholder: '담당 업무를 입력하세요.', maxLength: 500 }}
            emptyMessage="등록한 경력 정보가 없습니다."
            emptySub="+ 추가 버튼으로 경력을 입력해 보세요."
            onAdd={() => addItem(setCareers, emptyCareer)}
            onRemove={(idx) => removeItem(setCareers, idx)}
            onChange={(idx, field, value) => updateItem(setCareers, idx, field, value)}
          />

          <RepeatableFieldSection
            title="자격증"
            items={certifications}
            fields={CERTIFICATION_FIELDS}
            emptyMessage="등록한 자격증 정보가 없습니다."
            emptySub="+ 추가 버튼으로 자격증을 입력해 보세요."
            onAdd={() => addItem(setCertifications, emptyCertification)}
            onRemove={(idx) => removeItem(setCertifications, idx)}
            onChange={(idx, field, value) => updateItem(setCertifications, idx, field, value)}
          />

          <RepeatableFieldSection
            title="어학"
            items={languageTests}
            fields={LANGUAGE_TEST_FIELDS}
            emptyMessage="등록한 어학 성적이 없습니다."
            emptySub="+ 추가 버튼으로 어학 성적을 입력해 보세요."
            onAdd={() => addItem(setLanguageTests, emptyLanguageTest)}
            onRemove={(idx) => removeItem(setLanguageTests, idx)}
            onChange={(idx, field, value) => updateItem(setLanguageTests, idx, field, value)}
          />

          {/* 비교과·핵심역량 — 아직 자동 연동 API가 없어 준비 중 표시 */}
          <div className="grid gap-4 grid-cols-2">
            <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
                <h2 className="text-[14px] font-bold text-[#1F2328]">비교과 활동 이력</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76] ml-1">
                  연동 준비 중
                </span>
              </div>
              <EmptyState
                message="비교과 활동 이력 자동 연동을 준비 중입니다."
                sub="연동이 완료되면 참여한 프로그램 이력이 자동으로 표시됩니다."
              />
            </div>

            <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
                <h2 className="text-[14px] font-bold text-[#1F2328]">핵심역량 진단 결과</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#656D76] ml-1">
                  연동 준비 중
                </span>
              </div>
              <EmptyState
                message="핵심역량 진단 결과 자동 연동을 준비 중입니다."
                sub="연동이 완료되면 최근 진단 결과가 자동으로 표시됩니다."
              />
            </div>
          </div>

          {/* 추가 정보(선택) — 템플릿에 없는 값은 extra에만 담는다 */}
          <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-5">
            <label
              htmlFor="resumePortfolioUrl"
              className="block text-[12px] font-semibold text-[#656D76] mb-1.5"
            >
              포트폴리오·외부 링크 (선택)
            </label>
            <input
              id="resumePortfolioUrl"
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://github.com/…"
              className="w-full h-9 px-3 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-none focus:border-[#059669]"
            />
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
              {creating || !selectedId ? '저장' : '임시 저장'}
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="이력서 삭제"
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

// ─── Cover Letter Tab ─────────────────────────────────────────────────────────

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
    onError: (err) => toast(getApiErrorMessage(err, '저장에 실패했습니다.'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateCoverLetter(selectedId, payload),
    onSuccess: (doc) => {
      queryClient.setQueryData(['career', 'coverLetter', doc.careerDocumentId], doc);
      queryClient.invalidateQueries({ queryKey: ['career', 'coverLetters'] });
      toast('자기소개서가 저장되었습니다.', 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err, '저장에 실패했습니다.'), 'error'),
  });

  const versionMutation = useMutation({
    mutationFn: () => createCoverLetterVersion(selectedId),
    onSuccess: (doc) => {
      queryClient.setQueryData(['career', 'coverLetter', doc.careerDocumentId], doc);
      queryClient.invalidateQueries({ queryKey: ['career', 'coverLetters'] });
      setSelectedId(doc.careerDocumentId);
      toast('새 버전이 생성되었습니다.', 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err, '새 버전 생성에 실패했습니다.'), 'error'),
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
      toast(getApiErrorMessage(err, '삭제에 실패했습니다.'), 'error');
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
          {getApiErrorMessage(listQuery.error, '자기소개서 목록을 불러오지 못했습니다.')}
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
            {getApiErrorMessage(
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
 * 이력서·자기소개서 화면. 두 탭 모두 취창업 API(이력서/자기소개서 버전 CRUD)로 동작한다.
 * 이력서의 연락처·학력·경력·자격·어학은 학사행정 자동 연동 없이 학생이 직접 입력하는
 * 고정 템플릿이며(BE WP-215), 비교과 활동·핵심역량 진단 결과는 자동 연동 API가 아직 없어
 * "연동 준비 중" 상태로 표시한다.
 */
export default function ResumeEditor() {
  const [tab, setTab] = useState('resume');

  return (
    <div>
      <Tabs
        tabs={[
          { key: 'resume', label: '이력서' },
          { key: 'coverletter', label: '자기소개서' },
        ]}
        active={tab}
        onChange={setTab}
        accentColor={ACCENT}
      />

      {tab === 'resume' && <ResumeTab />}
      {tab === 'coverletter' && <CoverLetterTab />}
    </div>
  );
}
