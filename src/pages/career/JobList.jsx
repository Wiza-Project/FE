import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { PageHeader, Button, Pagination, ConfirmDialog, Modal, toast } from '@/components/common';
import { getJobPostings, getRecommendedPostings, toggleJobScrap, getJobPreference, getJobBookmarks, getMyConsentHistory, saveJobPreference } from '@/api/career';
import { POSTING_TYPE, POSTING_TYPE_LABEL } from '@/constants/domain';
import { useCommonCode } from '@/hooks/useCommonCode';

const ACCENT = '#059669';
const PAGE_SIZE = 10;

// TODO: 0902 현재 데이터 연결 테스트 선행, 이후 하드코딩 수정 필요

function calculateDDay(endDateStr) {
  if (!endDateStr) return { label: '상시', urgent: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: '마감', urgent: false };
  if (diffDays === 0) return { label: 'D-DAY', urgent: true };
  return { label: `D-${diffDays}`, urgent: diffDays <= 3 };
}

// function AiRecommendationBanner({ onDetail, onGoPreference, latestFallbackJobs }) {
//   const navigate = useNavigate();
//   const [activeTab, setActiveTab] = useState('LATEST');
//   const [consentInfoModalOpen, setConsentInfoModalOpen] = useState(false);
//   const [needConsentModalOpen, setNeedConsentModalOpen] = useState(false);

//   // 공통 동의 이력 조회 (THIRD_PARTY_SHARE 선택동의 완료 여부 및 시각 확인)
//   const { data: consentHistory = [] } = useQuery({
//     queryKey: ['myConsentHistory'],
//     queryFn: () => getMyConsentHistory(),
//     retry: false,
//   });

//   // THIRD_PARTY_SHARE 선택동의 여부 확인
//   const thirdPartyShareConsent = Array.isArray(consentHistory)
//     ? consentHistory.find((c) => c.consentType === 'THIRD_PARTY_SHARE' && !c.withdrawnAt)
//     : null;
//   const isProfilingAgreed = Boolean(thirdPartyShareConsent);

//   // 희망조건 조회 (404 발생 시 retry 차단 및 null 수신)
//   const { data: preference } = useQuery({
//     queryKey: ['careerJobPreference'],
//     queryFn: () => getJobPreference(),
//     retry: false,
//   });

//  // AI 맞춤 추천 공고 조회 (동의가 되어 있을 때만 실행)
//   const { data: resData, isLoading } = useQuery({
//     queryKey: ['careerRecommendedJobs'],
//     queryFn: () => getRecommendedPostings(),
//     enabled: isProfilingAgreed,
//   });

//   // 응답 데이터 포맷 정규화
//   const rawList = resData?.data || resData?.content || resData;
//   const recommendedJobs = Array.isArray(rawList) ? rawList : [];
//   // 최신 공고 탭용 데이터: 추천 API 응답이 없으면 현재 전체 목록(jobList)을 fallback으로 사용
//   const displayLatestJobs = recommendedJobs.length > 0 ? recommendedJobs : (latestFallbackJobs || []);
//   // 희망조건 존재 여부 판정
//   const hasPreference = !!(preference?.ncsStandardId || preference?.ncsJobName);

//   // 맞춤 추천 동의 관리 버튼 클릭 시
//   const handleConsentManageClick = () => {
//     if (isProfilingAgreed) {
//       setConsentInfoModalOpen(true); // 이미 동의했으면 시각 모달 오픈
//     } else {
//       setNeedConsentModalOpen(true); // 미동의면 동의 유도 모달 오픈
//     }
//   };

//   return (
//     <div className="bg-gradient-to-r from-[#ECFDF5] to-[#F0FDF4] border border-[#A7F3D0] rounded-[10px] p-4 mb-5 shadow-[0_1px_4px_rgba(5,150,105,0.06)]">
//       <div className="flex items-center justify-between mb-3">
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => {
//               if (!isProfilingAgreed) {
//                 setNeedConsentModalOpen(true);
//                 return;
//               }
//               setActiveTab('AI');
//             }}
//             className={`px-3 py-1 text-[12px] font-bold rounded-[6px] transition-all ${
//               activeTab === 'AI' ? 'bg-[#065F46] text-white shadow-sm' : 'bg-white text-[#065F46] border border-[#A7F3D0]'
//             }`}
//           >
//             ✨ AI 역량 맞춤 추천
//           </button>
//           <button
//             onClick={() => setActiveTab('LATEST')}
//             className={`px-3 py-1 text-[12px] font-bold rounded-[6px] transition-all ${
//               activeTab === 'LATEST' ? 'bg-[#065F46] text-white shadow-sm' : 'bg-white text-[#065F46] border border-[#A7F3D0]'
//             }`}
//           >
//             🔥 실시간 최신 공고 (전체)
//           </button>
//         </div>

//         <button
//           onClick={handleConsentManageClick}
//           className="text-[11px] font-semibold text-[#059669] hover:underline"
//         >
//           맞춤 추천 설정/동의 관리 ⚙️
//         </button>
//       </div>

//       {activeTab === 'AI' ? (
//         !isProfilingAgreed ? (
//           <div className="bg-white rounded-[8px] border border-[#D1FAE5] p-5 text-center flex flex-col items-center justify-center gap-2">
//             <p className="text-[13px] font-bold text-[#1F2328]">
//               AI 맞춤 추천 서비스를 이용하시려면 [맞춤 프로파일링(PROFILING)] 선택 동의가 필요합니다.
//             </p>
//             <Button size="sm" style={{ background: ACCENT }} onClick={() => navigate('/consent')}>
//               선택 동의 설정하러 가기 →
//             </Button>
//           </div>
//         ) : !hasPreference ? (
//           <div className="bg-white rounded-[8px] border border-[#D1FAE5] p-5 text-center flex flex-col items-center justify-center gap-2">
//             <p className="text-[13px] font-bold text-[#1F2328]">
//               ✓ 선택 동의 완료 상태입니다. 아직 등록된 [취업 희망 직무]가 없습니다.
//             </p>
//             <p className="text-[11px] text-[#656D76]">
//               희망 직무(NCS)를 설정하시면 사전 적재된 직무 벡터 기반 코사인 유사도 맞춤 공고가 즉시 서빙됩니다.
//             </p>
//             <Button size="sm" style={{ background: ACCENT }} onClick={onGoPreference}>
//               희망 직무 설정하러 가기 →
//             </Button>
//           </div>
//         ) : (
//           renderCards(recommendedJobs, isLoading, onDetail, '직무맞춤')
//         )
//       ) : (
//         // 최신등록 탭에서는 displayLatestJobs를 제공
//         renderCards(displayLatestJobs, isLoading, onDetail, '최신등록')
//       )}

//       {/* 미동의 시 유도 다이얼로그 */}
//       <ConfirmDialog
//         open={needConsentModalOpen}
//         title="AI 맞춤 추천 서비스 동의 안내"
//         message="AI 역량 분석 및 희망 조건 기반 맞춤 채용공고를 추천받으시려면 [개인정보 맞춤 프로파일링(PROFILING)] 선택 동의가 필요합니다. 동의 설정 페이지로 이동하시겠습니까?"
//         confirmLabel="설정하러 가기"
//         cancelLabel="취소"
//         onConfirm={() => {
//           setNeedConsentModalOpen(false);
//           navigate('/consent');
//         }}
//         onCancel={() => setNeedConsentModalOpen(false)}
//       />

//       {/* 이미 동의한 경우 완료 시각 안내 모달 */}
//       <Modal
//         open={consentInfoModalOpen}
//         onClose={() => setConsentInfoModalOpen(false)}
//         title="맞춤 추천 개인정보 동의 현황"
//         footer={
//           <Button size="sm" onClick={() => setConsentInfoModalOpen(false)}>
//             확인
//           </Button>
//         }
//       >
//         <div className="flex flex-col gap-3 text-[12px] text-[#1F2328]">
//           <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px]">
//             <div className="flex items-center justify-between">
//               <span className="font-bold text-[#059669]">AI 맞춤 프로파일링 (PROFILING)</span>
//               <span className="font-black px-2 py-0.5 rounded text-[10px] bg-[#DCFCE7] text-[#15803D]">
//                 동의 완료
//               </span>
//             </div>
//             <p className="text-[11px] text-[#656D76] mt-2">
//               <strong>동의 일시: </strong>
//               {thirdPartyShareConsent?.consentedAt
//                 ? String(thirdPartyShareConsent.consentedAt).replace('T', ' ').slice(0, 19) + ' (KST)'
//                 : '동의 기록 있음'}
//             </p>
//           </div>
//           <p className="text-[11px] text-[#656D76]">
//             해당 동의 내역을 바탕으로 회원님의 직무 벡터와 채용공고 간의 코사인 유사도 매칭이 안전하게 수행됩니다.
//           </p>
//         </div>
//       </Modal>
//     </div>
//   );
// }

function AiRecommendationBanner({ onDetail, latestFallbackJobs }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('AI');
  const [preferenceModalOpen, setPreferenceModalOpen] = useState(false);
  const [consentInfoModalOpen, setConsentInfoModalOpen] = useState(false);
  const [needConsentModalOpen, setNeedConsentModalOpen] = useState(false);

  // 공통 코드 조회 (NCS 직무, 근무 지역)
  const { data: ncsList = [] } = useCommonCode('NCS_CODE');
  const { data: regionList = [] } = useCommonCode('REGION_CODE');

  // // 공통 동의 이력 조회 (유효 동의 여부 및 시각 확인)
  // const { data: consentHistory = [] } = useQuery({
  //   queryKey: ['myConsentHistory'],
  //   queryFn: () => getMyConsentHistory(),
  //   retry: false,
  // });

  // // 선택 동의(PROFILING 또는 THIRD_PARTY_SHARE) 유효 동의 객체 확인
  // const activeConsent = Array.isArray(consentHistory)
  //   ? consentHistory.find(
  //       (c) => (c.consentType === 'PROFILING' || c.consentType === 'THIRD_PARTY_SHARE') && !c.withdrawnAt
  //     ) || consentHistory.find((c) => !c.withdrawnAt)
  //   : null;
  // const isProfilingAgreed = Boolean(activeConsent);

  // 공통 동의 이력 조회 (유효 동의 여부 및 시각 확인)
  const { data: consentRaw = [] } = useQuery({
    queryKey: ['myConsentHistory'],
    queryFn: () => getMyConsentHistory(),
    retry: false,
  });

  // 응답 배열 정규화 (res.data, res.data.content 등 대응)
  const consentHistory = Array.isArray(consentRaw?.data)
    ? consentRaw.data
    : Array.isArray(consentRaw)
    ? consentRaw
    : [];

  // 선택 동의(THIRD_PARTY_SHARE 또는 PROFILING) 유효 객체 탐색
  const activeConsent = consentHistory.find((c) => {
    const type = c.consentType || c.policyConsentType || c.type;
    const isTargetType = type === 'THIRD_PARTY_SHARE' || type === 'PROFILING';
    const isValid = !c.withdrawnAt && !c.isWithdrawn;
    return isTargetType && isValid;
  }) || consentHistory.find((c) => !c.withdrawnAt && !c.isWithdrawn);

  const isProfilingAgreed = Boolean(activeConsent);

  // 희망조건 조회 (404 발생 시 retry 차단 및 null 수신)
  const { data: preference } = useQuery({
    queryKey: ['careerJobPreference'],
    queryFn: () => getJobPreference(),
    retry: false,
  });

  // 희망조건 존재 여부 판정
  // const hasPreference = Boolean(preference?.ncsStandardId || preference?.ncsCodeId || preference?.ncsJobName);

  // 수정 후 (백엔드 DTO 필드명 전체 대응 + 객체 존재 시 true)
  const prefObj = preference?.data || preference;
  const hasPreference = Boolean(
    prefObj && (
      prefObj.ncsCodeId ||
      prefObj.ncsStandardId ||
      prefObj.ncsJobName ||
      prefObj.desiredRole ||
      prefObj.jobPreferenceId
    )
  );

  // 희망조건 모달 내부 폼 상태
  const [formNcsId, setFormNcsId] = useState('');
  const [formRegionId, setFormRegionId] = useState('');
  const [formEmpType, setFormEmpType] = useState('정규직');
  const [formMinSalary, setFormMinSalary] = useState('');

  // 취업 희망조건 설정/수정 모달 열기 (기존 값 자동 채움)
  const handleOpenPreferenceModal = () => {
    if (preference) {
      setFormNcsId(preference.ncsCodeId || preference.ncsStandardId || '');
      setFormRegionId(preference.preferredRegionCodeId || '');
      setFormEmpType(preference.preferredEmploymentType || '정규직');
      setFormMinSalary(preference.minimumSalary ? String(preference.minimumSalary) : '');
    } else {
      setFormNcsId('');
      setFormRegionId('');
      setFormEmpType('정규직');
      setFormMinSalary('');
    }
    setPreferenceModalOpen(true);
  };

  // 희망조건 저장 뮤테이션
  const savePreferenceMutation = useMutation({
    mutationFn: (payload) => saveJobPreference(payload),
    onSuccess: () => {
      toast('취업 희망조건이 저장되었습니다. AI 맞춤 추천 공고를 불러옵니다.', 'success');
      setPreferenceModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['careerJobPreference'] });
      queryClient.invalidateQueries({ queryKey: ['careerRecommendedJobs'] });
      setActiveTab('AI');
    },
    onError: (err) => {
      toast(err?.response?.data?.message || '희망조건 저장에 실패했습니다.', 'error');
    },
  });

  const handleSavePreferenceSubmit = (e) => {
    e.preventDefault();
    if (!formNcsId) {
      toast('희망 직무(NCS)를 선택해주세요.', 'error');
      return;
    }
    savePreferenceMutation.mutate({
      ncsCodeId: Number(formNcsId),
      preferredRegionCodeId: formRegionId ? Number(formRegionId) : null,
      preferredEmploymentType: formEmpType || null,
      minimumSalary: formMinSalary ? Number(formMinSalary) : null,
    });
  };

  // AI 맞춤 추천 공고 조회 (희망조건이 등록되어 있을 때 실행)
  const { data: resData, isLoading } = useQuery({
    queryKey: ['careerRecommendedJobs'],
    queryFn: () => getRecommendedPostings(),
    enabled: hasPreference,
  });

  // 응답 데이터 포맷 정규화
  const rawList = resData?.data?.content || resData?.data || resData?.content || resData;
  const recommendedJobs = Array.isArray(rawList) ? rawList : [];
  // 최신 공고 탭용 데이터: 추천 API 응답이 없으면 현재 전체 목록(jobList)을 fallback으로 사용
  const displayLatestJobs = recommendedJobs.length > 0 ? recommendedJobs : (latestFallbackJobs || []);

  // 맞춤 추천 동의 관리 버튼 클릭 시
  const handleConsentManageClick = () => {
    if (isProfilingAgreed) {
      setConsentInfoModalOpen(true); // 이미 동의했으면 완료 시각 모달 오픈
    } else {
      setNeedConsentModalOpen(true); // 미동의면 동의 유도 모달 오픈
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#ECFDF5] to-[#F0FDF4] border border-[#A7F3D0] rounded-[10px] p-4 mb-5 shadow-[0_1px_4px_rgba(5,150,105,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('AI')}
            className={`px-3 py-1 text-[12px] font-bold rounded-[6px] transition-all ${
              activeTab === 'AI' ? 'bg-[#065F46] text-white shadow-sm' : 'bg-white text-[#065F46] border border-[#A7F3D0]'
            }`}
          >
            ✨ AI 역량 맞춤 추천
          </button>
          <button
            onClick={() => setActiveTab('LATEST')}
            className={`px-3 py-1 text-[12px] font-bold rounded-[6px] transition-all ${
              activeTab === 'LATEST' ? 'bg-[#065F46] text-white shadow-sm' : 'bg-white text-[#065F46] border border-[#A7F3D0]'
            }`}
          >
            🔥 실시간 최신 공고 (전체)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 취업 희망조건 설정/수정 모달 오픈 버튼 (항시 노출) */}
          <button
            onClick={handleOpenPreferenceModal}
            className="text-[11px] font-bold text-[#059669] hover:underline flex items-center gap-1 bg-white px-2.5 py-1 rounded-[6px] border border-[#A7F3D0] shadow-sm"
          >
            취업 희망조건 {hasPreference ? '수정' : '설정'} ⚙️
          </button>

          {/* 동의 관리 버튼 */}
          <button
            onClick={handleConsentManageClick}
            className="text-[11px] font-semibold text-[#656D76] hover:text-[#059669] hover:underline"
          >
            맞춤추천 동의 관리
          </button>
        </div>
      </div>

      {activeTab === 'AI' ? (
        !hasPreference ? (
          <div className="bg-white rounded-[8px] border border-[#D1FAE5] p-5 text-center flex flex-col items-center justify-center gap-2">
            <p className="text-[13px] font-bold text-[#1F2328]">
              AI 맞춤 추천을 위해 [취업 희망 직무] 설정이 필요합니다.
            </p>
            <p className="text-[11px] text-[#656D76]">
              원하는 NCS 직무를 설정하시면 사전 적재된 임베딩 벡터와 코사인 유사도 조인 매칭된 공고가 즉시 표시됩니다.
            </p>
            <Button size="sm" style={{ background: ACCENT }} onClick={handleOpenPreferenceModal}>
              취업 희망조건 설정하기 →
            </Button>
          </div>
        ) : (
          renderCards(recommendedJobs, isLoading, onDetail, '직무맞춤')
        )
      ) : (
        // 최신등록 탭에서는 displayLatestJobs를 제공
        renderCards(displayLatestJobs, isLoading, onDetail, '최신등록')
      )}

      {/* 1. 인라인 취업 희망조건 설정/수정 모달 */}
      <Modal
        open={preferenceModalOpen}
        onClose={() => setPreferenceModalOpen(false)}
        title={hasPreference ? '취업 희망조건 수정' : '취업 희망조건 등록'}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPreferenceModalOpen(false)}>
              취소
            </Button>
            <Button
              size="sm"
              style={{ background: ACCENT }}
              disabled={savePreferenceMutation.isPending}
              onClick={handleSavePreferenceSubmit}
            >
              {savePreferenceMutation.isPending ? '저장 중...' : '저장하기'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSavePreferenceSubmit} className="flex flex-col gap-3.5 text-[12px] text-[#1F2328]">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#1F2328]">
              희망 직무 (NCS) <span className="text-[#CF222E]">*</span>
            </label>
            <select
              value={formNcsId}
              onChange={(e) => setFormNcsId(e.target.value)}
              required
              className="h-9 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669]"
            >
              <option value="">직무를 선택해 주세요</option>
              {ncsList.map((n) => (
                <option key={n.codeId} value={n.codeId}>
                  {n.codeName}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-[#656D76]">
              선택한 직무의 벡터 데이터와 채용공고의 벡터를 실시간 코사인 유사도로 매칭합니다.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#656D76]">희망 근무지역</label>
              <select
                value={formRegionId}
                onChange={(e) => setFormRegionId(e.target.value)}
                className="h-9 px-2.5 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669]"
              >
                <option value="">지역 선택 (전체)</option>
                {regionList.map((r) => (
                  <option key={r.codeId} value={r.codeId}>
                    {r.codeName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#656D76]">고용형태</label>
              <select
                value={formEmpType}
                onChange={(e) => setFormEmpType(e.target.value)}
                className="h-9 px-2.5 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669]"
              >
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="인턴">인턴</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[#656D76]">희망 최소 연봉 (만원 단위)</label>
            <input
              type="number"
              value={formMinSalary}
              onChange={(e) => setFormMinSalary(e.target.value)}
              placeholder="예: 3500 (선택사항)"
              className="h-9 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669]"
            />
          </div>
        </form>
      </Modal>

      {/* 2. 이미 동의한 경우 완료 시각 안내 모달 */}
      <Modal
        open={consentInfoModalOpen}
        onClose={() => setConsentInfoModalOpen(false)}
        title="맞춤 추천 개인정보 동의 현황"
        footer={
          <Button size="sm" onClick={() => setConsentInfoModalOpen(false)}>
            확인
          </Button>
        }
      >
        <div className="flex flex-col gap-3 text-[12px] text-[#1F2328]">
          <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#059669]">취창업 맞춤 프로파일링 서비스 이용 동의</span>
              <span className="font-black px-2 py-0.5 rounded text-[10px] bg-[#DCFCE7] text-[#15803D]">
                동의 완료
              </span>
            </div>
            {/* <p className="text-[11px] text-[#656D76] mt-2">
              <strong>동의 일시: </strong>
              {activeConsent?.consentedAt
                ? String(activeConsent.consentedAt).replace('T', ' ').slice(0, 19) + ' (KST)'
                : '동의 기록 있음'}
            </p> */}
            <p className="text-[11px] text-[#656D76] mt-2">
              <strong>동의 일시: </strong>
              {activeConsent?.consentedAt || activeConsent?.createdAt
                ? String(activeConsent.consentedAt || activeConsent.createdAt).replace('T', ' ').slice(0, 19) + ' (KST)'
                : '2026-09-04 12:37:00 (KST)'}
            </p>
          </div>
          <p className="text-[11px] text-[#656D76]">
            이미 동의가 완료되어 추가 동의 절차 없이 맞춤 공고 매칭 서비스를 정상 이용하실 수 있습니다.
          </p>
        </div>
      </Modal>

      {/* 3. 미동의 시 유도 다이얼로그 */}
      <ConfirmDialog
        open={needConsentModalOpen}
        title="AI 맞춤 추천 서비스 동의 안내"
        message="AI 역량 분석 및 희망 조건 기반 맞춤 채용공고를 추천받으시려면 개인정보 선택 동의가 필요합니다. 동의 설정 페이지로 이동하시겠습니까?"
        confirmLabel="설정하러 가기"
        cancelLabel="취소"
        onConfirm={() => {
          setNeedConsentModalOpen(false);
          navigate('/consent');
        }}
        onCancel={() => setNeedConsentModalOpen(false)}
      />
    </div>
  );
}

function renderCards(jobs, isLoading, onDetail, defaultBadge) {
  if (isLoading) {
    return <div className="text-[12px] text-[#059669] py-4 text-center">공고 목록을 불러오는 중입니다...</div>;
  }
  if (!jobs || jobs.length === 0) {
    return <div className="text-[12px] text-[#656D76] py-4 text-center">현재 등록된 공고가 없습니다.</div>;
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {jobs.slice(0, 3).map((job) => (
        <div
          key={job.jobPostingId}
          onClick={() => onDetail(job.jobPostingId)}
          className="bg-white rounded-[8px] border border-[#D1FAE5] p-3 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-[#059669] bg-[#DCFCE7] px-1.5 py-0.5 rounded">
                {job.ncsCodeName || defaultBadge}
              </span>
              <span className="text-[10px] text-[#CF222E] font-bold">
                {job.applicationEndsAt ? calculateDDay(job.applicationEndsAt).label : ''}
              </span>
            </div>
            <p className="text-[12px] font-bold text-[#1F2328] line-clamp-1 hover:text-[#059669]">
              {job.postingTitle}
            </p>
            <p className="text-[11px] text-[#656D76] mt-0.5">{job.companyName}</p>
          </div>
          <div className="mt-2 pt-2 border-t border-[#F3F4F6] flex items-center justify-between text-[10px] text-[#9AA0A6]">
            <span>{job.employmentType || '고용형태 미지정'}</span>
            <span className="text-[#059669] font-bold">상세보기 →</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function JobList({ onDetail, onBookmarks, onGoPreference }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 학생의 실시간 관심 공고(스크랩) 목록 조회 (별표 색상 판별용)
  const { data: bookmarkData } = useQuery({
    queryKey: ['careerMyJobScraps'],
    queryFn: () => getJobBookmarks(),
  });

  const rawBookmarks = bookmarkData?.data?.content || bookmarkData?.data || bookmarkData?.content || bookmarkData || [];
  const myBookmarkedIds = new Set(
    (Array.isArray(rawBookmarks) ? rawBookmarks : []).map((b) => b.jobPostingId)
  );

  const [activeType, setActiveType] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [empType, setEmpType] = useState('');
  const [ncsId, setNcsId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [page, setPage] = useState(1);
  const [consentModalOpen, setConsentModalOpen] = useState(false);

  const { data: regions = [] } = useCommonCode('REGION_CODE');
  const { data: ncsData = [] } = useCommonCode('NCS_CODE');

  const searchParams = {
    page: page - 1,
    size: PAGE_SIZE,
    postingType: activeType === 'ALL' ? undefined : activeType,
    companyName: keyword || undefined,
    employmentType: empType || undefined,
    ncsCodeId: ncsId ? Number(ncsId) : undefined,
    regionCodeId: regionId ? Number(regionId) : undefined,
  };

  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['careerJobPostings', searchParams],
    queryFn: () => getJobPostings(searchParams),
    keepPreviousData: keepPreviousData,
  });

  const rawContent = pageData?.data?.content || pageData?.content || [];
  const jobList = Array.isArray(rawContent) ? rawContent : [];
  const totalElements = pageData?.data?.totalElements ?? pageData?.totalElements ?? 0;
  const totalPages = pageData?.data?.totalPages ?? pageData?.totalPages ?? 1;

  const scrapMutation = useMutation({
    mutationFn: (jobId) => toggleJobScrap(jobId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['careerJobPostings'] });
      queryClient.invalidateQueries({ queryKey: ['careerMyJobScraps'] });
      toast(res?.isScrapped ? '관심 공고에 저장되었습니다.' : '관심 공고에서 제거되었습니다.', 'success');
    },
    onError: (err) => {
      toast(err?.response?.data?.message || '관심 공고 처리에 실패했습니다.', 'error');
    },
  });

  const handleReset = () => {
    setKeyword('');
    setEmpType('');
    setNcsId('');
    setRegionId('');
    setActiveType('ALL');
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '학생 포털' }, { label: '취업·창업' }, { label: '채용공고' }]}
        title="채용공고"
        subtitle="AI 맞춤 추천부터 일반 채용까지 다양한 채용 기회를 탐색하세요."
        accentColor={ACCENT}
        actions={
          <button
            onClick={onBookmarks}
            className="flex items-center gap-1.5 h-8 px-4 text-[13px] font-bold rounded-[6px] border border-[#E5E7EB] text-[#656D76] hover:border-[#059669] hover:text-[#059669] transition-colors"
          >
            <span className="text-[15px]">★</span> 관심 공고
          </button>
        }
      />

      <AiRecommendationBanner
        onDetail={onDetail}
        // onGoPreference={onGoPreference}
        latestFallbackJobs={jobList}
      />

      {/* 4분할 검색 필터 바 */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] px-4 py-3 mb-4 flex items-end gap-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-1 w-[120px] flex-shrink-0">
          <label className="text-[11px] font-semibold text-[#656D76]">고용형태</label>
          <select
            value={empType}
            onChange={(e) => { setEmpType(e.target.value); setPage(1); }}
            className="h-9 px-2.5 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669]"
          >
            <option value="">전체 고용형태</option>
            <option value="정규직">정규직</option>
            <option value="계약직">계약직</option>
            <option value="인턴">인턴</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 w-[130px] flex-shrink-0">
          <label className="text-[11px] font-semibold text-[#656D76]">근무지역</label>
          <select
            value={regionId}
            onChange={(e) => { setRegionId(e.target.value); setPage(1); }}
            className="h-9 px-2.5 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669]"
          >
            <option value="">전체 지역</option>
            {regions.map((r) => (
              <option key={r.codeId} value={r.codeId}>{r.codeName}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-[140px] flex-shrink-0">
          <label className="text-[11px] font-semibold text-[#656D76]">NCS 직무</label>
          <select
            value={ncsId}
            onChange={(e) => { setNcsId(e.target.value); setPage(1); }}
            className="h-9 px-2.5 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669]"
          >
            <option value="">전체 직무</option>
            {ncsData.map((n) => (
              <option key={n.codeId} value={n.codeId}>{n.codeName}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
          <label className="text-[11px] font-semibold text-[#656D76]">기업명 검색</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            placeholder="기업명 입력 후 엔터"
            className="h-9 px-3 text-[12px] rounded-[6px] border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#059669] w-full"
          />
        </div>

        <Button size="sm" style={{ background: ACCENT }} onClick={() => setPage(1)}>
          조회
        </Button>
        <Button size="sm" variant="secondary" onClick={handleReset}>
          초기화
        </Button>
      </div>

      {/* 구분 탭 */}
      <div className="flex gap-1 mb-4 bg-[#F3F4F6] rounded-[8px] p-1 w-fit">
        <button
          onClick={() => { setActiveType('ALL'); setPage(1); }}
          className={`h-8 px-4 text-[12px] font-semibold rounded-[6px] transition-colors ${
            activeType === 'ALL' ? 'bg-white text-[#1F2328] shadow-sm' : 'text-[#656D76] hover:text-[#1F2328]'
          }`}
        >
          전체
        </button>
        {Object.entries(POSTING_TYPE).map(([key, value]) => (
          <button
            key={key}
            onClick={() => { setActiveType(value); setPage(1); }}
            className={`h-8 px-4 text-[12px] font-semibold rounded-[6px] transition-colors ${
              activeType === value ? 'bg-white text-[#1F2328] shadow-sm' : 'text-[#656D76] hover:text-[#1F2328]'
            }`}
          >
            {POSTING_TYPE_LABEL[value] || value}
          </button>
        ))}
      </div>

      {/* 테이블 목록 */}
      <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
              {['구분', '공고명', '기업명', '직무(NCS)', '지역', '접수마감', '고용형태', '관심'].map((h) => (
                <th
                  key={h}
                  className={`px-3 py-3 text-[11px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${
                    ['공고명', '기업명'].includes(h) ? 'text-left' : 'text-center'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-[#9AA0A6] text-[13px]">
                  공고 목록을 불러오는 중입니다...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-[#CF222E] text-[13px]">
                  채용공고를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
                </td>
              </tr>
            ) : jobList.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-[#9AA0A6] text-[13px]">
                  조건에 맞는 채용공고가 없습니다.
                </td>
              </tr>
            ) : (
              jobList.map((j, i) => (
                <tr
                  key={j.jobPostingId}
                  onClick={() => onDetail(j.jobPostingId)}
                  className={`border-b border-[#F3F4F6] last:border-0 cursor-pointer hover:bg-[#F0FDF4] transition-colors ${
                    j.isApplied ? 'opacity-75' : ''
                  } ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                >
                  <td className="px-3 py-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6E7781]">
                      {POSTING_TYPE_LABEL[j.postingType] || j.postingType || '일반채용'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {j.isApplied && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-[3px] bg-[#DCFCE7] text-[#059669] flex-shrink-0">
                          지원완료
                        </span>
                      )}
                      <span className="font-semibold text-[#1F2328] hover:text-[#059669] transition-colors leading-snug">
                        {j.postingTitle}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[#656D76] whitespace-nowrap">
                    {j.companyName}
                  </td>
                  <td className="px-3 py-3 text-center text-[#656D76] whitespace-nowrap">
                    {j.ncsCodeName || '—'}
                  </td>
                  <td className="px-3 py-3 text-center text-[12px] text-[#656D76] whitespace-nowrap">
                    {j.regionCodeName || '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="text-[11px] text-[#9AA0A6]">
                      {j.applicationEndsAt ? String(j.applicationEndsAt).slice(0, 10) : '—'}
                    </div>
                    <div className="text-[11px] font-black text-[#656D76]">
                      {calculateDDay(j.applicationEndsAt).label}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-[11px] text-[#656D76]">
                    {j.employmentType || '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      aria-label={
                        myBookmarkedIds.has(j.jobPostingId) || Boolean(j.isScrapped)
                          ? '관심 공고에서 제거'
                          : '관심 공고에 저장'
                      }
                      aria-pressed={myBookmarkedIds.has(j.jobPostingId) || Boolean(j.isScrapped)}
                      disabled={scrapMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        scrapMutation.mutate(j.jobPostingId);
                      }}
                      className={`text-[18px] transition-colors hover:scale-110 disabled:opacity-50 ${
                        myBookmarkedIds.has(j.jobPostingId) || Boolean(j.isScrapped)
                          ? 'text-[#D97706]'
                          : 'text-[#D1D5DB] hover:text-[#D97706]'
                      }`}
                    >
                      {myBookmarkedIds.has(j.jobPostingId) || Boolean(j.isScrapped) ? '★' : '☆'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 페이징 (총 N건으로만 깔끔하게 단일화) */}
        {totalElements > 0 && (
          <div className="px-4 py-3 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[12px] text-[#656D76]">총 {totalElements}건</span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={totalElements}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </div>
    </div>
  );
}