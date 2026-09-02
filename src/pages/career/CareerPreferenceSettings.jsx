import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, toast } from '@/components/common';
import { getJobPreference, saveJobPreference } from '@/api/career';
import { useCommonCode } from '@/hooks/useCommonCode';

const ACCENT = '#059669';

// TODO: 0902 현재 데이터 연결 테스트 선행, 이후 하드코딩 수정 필요

// 17개 광역시/도 폴백
const FALLBACK_REGIONS = [
  { codeId: 101, code: 'RG100', codeName: '서울' },
  { codeId: 102, code: 'RG200', codeName: '부산' },
  { codeId: 103, code: 'RG300', codeName: '대구' },
  { codeId: 104, code: 'RG400', codeName: '인천' },
  { codeId: 105, code: 'RG500', codeName: '광주' },
  { codeId: 106, code: 'RG600', codeName: '대전' },
  { codeId: 107, code: 'RG700', codeName: '울산' },
  { codeId: 108, code: 'RG800', codeName: '세종' },
  { codeId: 109, code: 'RG900', codeName: '경기' },
  { codeId: 110, code: 'RG1000', codeName: '강원' },
  { codeId: 111, code: 'RG1100', codeName: '충북' },
  { codeId: 112, code: 'RG1200', codeName: '충남' },
  { codeId: 113, code: 'RG1300', codeName: '전북' },
  { codeId: 114, code: 'RG1400', codeName: '전남' },
  { codeId: 115, code: 'RG1500', codeName: '경북' },
  { codeId: 116, code: 'RG1600', codeName: '경남' },
  { codeId: 117, code: 'RG1700', codeName: '제주' },
];

// 9대 표준 NCS 폴백 데이터
const FALLBACK_NCS = [
  { codeId: 1, code: '02010101', codeName: '경영기획', categoryName: '경영·회계·사무 > 기획사무 > 기획 > 경영기획', jobDescription: '경영목표를 달성하기 위한 전략 수립 및 사업계획 수립' },
  { codeId: 2, code: '02020201', codeName: '인사관리', categoryName: '경영·회계·사무 > 인사·조직 > 인사 > 인사관리', jobDescription: '인적자원 확보, 육성, 평가, 보상 등 인력 운영 업무' },
  { codeId: 3, code: '02030201', codeName: '마케팅기획', categoryName: '경영·회계·사무 > 마케팅 > 마케팅전략 > 마케팅기획', jobDescription: '시장조사, 소비자 분석을 통한 상품 및 브랜드 마케팅 전략 수립' },
  { codeId: 4, code: '08020101', codeName: 'UI/UX디자인', categoryName: '문화·예술·디자인 > 디자인 > 시각디자인 > UI/UX디자인', jobDescription: '사용자 경험 리서치 및 웹/앱 인터페이스 화면 설계 및 디자인' },
  { codeId: 5, code: '20010101', codeName: '응용SW엔지니어링', categoryName: '정보통신 > 정보기술 > 정보기술개발 > 응용SW엔지니어링', jobDescription: '요구사항 분석을 기반으로 소프트웨어 설계, 코딩, 테스트 및 배포' },
  { codeId: 6, code: '20010204', codeName: '빅데이터분석·AI', categoryName: '정보통신 > 정보기술 > 인공지능 > 빅데이터분석·AI', jobDescription: '대용량 데이터 수집, 가공 및 머신러닝/딥러닝 모델 개발과 평가' },
  { codeId: 7, code: '20020101', codeName: '정보보안관리', categoryName: '정보통신 > 정보기술 > 정보보안 > 정보보안관리', jobDescription: '보안 정책 수립 및 네트워크, 시스템 침해대응 및 취약점 분석' },
  { codeId: 8, code: '23010101', codeName: '신재생에너지연구', categoryName: '환경·에너지 > 신재생에너지 > 태양광/수소 > 신재생에너지연구', jobDescription: '친환경 에너지 발전 시스템 설계 및 신재생 설비 기술 연구개발' },
  { codeId: 9, code: '99999999', codeName: '기타전문직무', categoryName: '기타 > 기타전문직무 > 기타직무 > 기타전문직무', jobDescription: '기타 다양한 산업 분야의 실무 및 전문 직무' },
];

const EMPLOYMENT_TYPES = [
  { value: 'REGULAR', label: '정규직' },
  { value: 'CONTRACT', label: '계약직' },
  { value: 'INTERN', label: '인턴' },
  { value: 'ANY', label: '고용형태 무관' },
];

export default function CareerPreferenceSettings({ onComplete }) {
  const queryClient = useQueryClient();
  const [selectedLargeCategory, setSelectedLargeCategory] = useState('전체');

  const [form, setForm] = useState({
    ncsStandardId: null,
    preferredRegionCodeId: null,
    preferredEmploymentType: 'REGULAR',
    minimumSalary: 3500,
  });

  const { data: regions = [] } = useCommonCode('REGION_CODE');
  const { data: ncsData = [] } = useCommonCode('NCS_CODE');

  const ncsItems = ncsData.length > 0 ? ncsData : FALLBACK_NCS;

  const largeCategories = useMemo(() => {
    const set = new Set(['전체']);
    ncsItems.forEach((item) => {
      const parts = (item.categoryName || item.codeName || '').split(' > ');
      if (parts[0]) set.add(parts[0]);
    });
    return Array.from(set);
  }, [ncsItems]);

  const filteredNcsItems = useMemo(() => {
    if (selectedLargeCategory === '전체') return ncsItems;
    return ncsItems.filter((item) => (item.categoryName || item.codeName || '').startsWith(selectedLargeCategory));
  }, [ncsItems, selectedLargeCategory]);

  const { data: prefData, isLoading } = useQuery({
    queryKey: ['careerJobPreference'],
    queryFn: () => getJobPreference(),
  });

  useEffect(() => {
    if (prefData) {
      setForm({
        ncsStandardId: prefData.ncsStandardId ?? prefData.ncsCodeId ?? ncsItems[0]?.codeId,
        preferredRegionCodeId: prefData.preferredRegionCodeId ?? prefData.regionCodeId ?? regions[0]?.codeId,
        preferredEmploymentType: prefData.preferredEmploymentType || 'REGULAR',
        minimumSalary: prefData.minimumSalary || 3500,
      });
    } else if (ncsItems.length > 0 && regions.length > 0 && !form.ncsStandardId) {
      setForm((p) => ({
        ...p,
        ncsStandardId: ncsItems[0]?.codeId,
        preferredRegionCodeId: regions[0]?.codeId,
      }));
    }
  }, [prefData, ncsData, regions]);

  const saveMutation = useMutation({
    mutationFn: (payload) => saveJobPreference(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['careerJobPreference'] });
      queryClient.invalidateQueries({ queryKey: ['careerRecommendedJobs'] });
      toast('취업 희망 조건이 저장되었습니다!', 'success');
      if (onComplete) onComplete();
    },
    onError: (err) => {
      toast(err?.message || err?.response?.data?.message || '저장에 실패했습니다.', 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const selectedNcs = ncsItems.find((item) => item.codeId === form.ncsStandardId);

  if (isLoading) return <div className="p-16 text-center text-[#9AA0A6]">불러오는 중...</div>;

  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6 max-w-[800px]">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E5E7EB]">
        <div>
          <h2 className="text-[16px] font-bold text-[#1F2328]">취업 희망 조건 설정</h2>
          <p className="text-[12px] text-[#656D76] mt-1">
            설정하신 직무와 지역은 <strong> AI 잡매칭(PROFILING)</strong>의 기준 데이터로 즉시 동기화됩니다.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-bold text-[#1F2328]">
              희망 직무 분류 (NCS 표준 체계) <span className="text-[#CF222E]">*</span>
            </label>
            {selectedNcs && (
              <span className="text-[11px] font-bold text-[#059669] bg-[#DCFCE7] px-2 py-0.5 rounded">
                선택됨: {selectedNcs.codeName}
              </span>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
            {largeCategories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedLargeCategory(cat)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-[6px] transition-colors whitespace-nowrap ${
                  selectedLargeCategory === cat
                    ? 'bg-[#1F2937] text-white'
                    : 'bg-[#F3F4F6] text-[#656D76] hover:bg-[#E5E7EB]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto p-1 border border-[#E5E7EB] rounded-[8px] bg-[#FAFAFA]">
            {filteredNcsItems.map((ncs) => {
              const selected = form.ncsStandardId === ncs.codeId;
              return (
                <div
                  key={ncs.codeId}
                  onClick={() => setForm((p) => ({ ...p, ncsStandardId: ncs.codeId }))}
                  className={`p-3 rounded-[6px] border cursor-pointer transition-all flex flex-col justify-between ${
                    selected
                      ? 'border-[#059669] bg-white shadow-sm ring-1 ring-[#059669]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#A7F3D0]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[12px] font-bold text-[#1F2328]">
                        {selected ? '✓ ' : ''}{ncs.codeName}
                      </span>
                      <span className="text-[10px] font-mono text-[#9AA0A6] bg-[#F3F4F6] px-1 rounded">
                        {ncs.code}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#656D76] truncate mb-1.5">{ncs.categoryName || ncs.codeName}</p>
                    <p className="text-[11px] text-[#4B5563] line-clamp-2 leading-relaxed">
                      {ncs.jobDescription || `${ncs.codeName} 관련 직무`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-bold text-[#1F2328] mb-2">
            희망 근무 지역 <span className="text-[#CF222E]">*</span>
          </label>
          <select
            value={form.preferredRegionCodeId || ''}
            onChange={(e) => setForm((p) => ({ ...p, preferredRegionCodeId: Number(e.target.value) }))}
            className="w-full h-10 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669]"
          >
            {regions.map((reg) => (
              <option key={reg.codeId} value={reg.codeId}>
                {reg.codeName} ({reg.code})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-bold text-[#1F2328] mb-2">희망 고용 형태</label>
            <select
              value={form.preferredEmploymentType}
              onChange={(e) => setForm((p) => ({ ...p, preferredEmploymentType: e.target.value }))}
              className="w-full h-10 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669]"
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#1F2328] mb-2">희망 연봉 (단위: 만원)</label>
            <input
              type="number"
              step="100"
              min="2000"
              max="10000"
              value={form.minimumSalary}
              onChange={(e) => setForm((p) => ({ ...p, minimumSalary: Number(e.target.value) }))}
              className="w-full h-10 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669]"
            />
          </div>
        </div>

        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px] p-3 text-[11px] text-[#14532D] leading-relaxed">
          희망 직무를 저장하면 <strong>{selectedNcs?.codeName || '선택 직무'}</strong>와의 실시간 AI 맞춤 공고를 제공합니다.
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
          <Button
            type="submit"
            size="md"
            loading={saveMutation.isPending}
            style={{ background: ACCENT }}
            className="px-6"
          >
            희망 조건 저장하기
          </Button>
        </div>
      </form>
    </div>
  );
}