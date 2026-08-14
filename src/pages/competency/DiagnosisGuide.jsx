import { useState } from 'react';
import { Button } from '@/components/common';

const GUIDE_INFO = [
  { label: '응시기간', value: '2026-03-02 ~ 2026-03-20' },
  { label: '문항 수', value: '90문항' },
  { label: '소요시간', value: '약 15분' },
  { label: '응답 척도', value: '5점 리커트 척도' },
  { label: '구분', value: '2026학년도 1학기 사전 진단' },
];

/**
 * @param {Object} props
 * @param {() => void} props.onStart
 * @param {() => void} props.onViewResult
 * @param {boolean} [props.alreadyDone]
 */
export default function DiagnosisGuide({ onStart, onViewResult, alreadyDone }) {
  const [agreed, setAgreed] = useState(false);
  const [expandPrivacy, setExpandPrivacy] = useState(false);

  if (alreadyDone) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-full max-w-[640px] bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-1 bg-[#7C3AED]" />
          <div className="px-8 py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1A7F37"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-[20px] font-bold text-[#1F2328] mb-2">이미 응시를 완료했습니다.</h2>
            <p className="text-[13px] text-[#656D76] mb-6">
              2026학년도 1학기 사전 진단을 2026-03-08에 완료하였습니다.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="md" onClick={onViewResult}>
                결과 보기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-[680px]">
        {/* Main card */}
        <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-1 bg-[#7C3AED]" />

          <div className="px-8 pt-7 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                사전 진단
              </span>
              <span className="text-[11px] text-[#9AA0A6]">2026학년도 1학기</span>
            </div>
            <h1 className="text-[22px] font-bold text-[#1F2328]">2026학년도 1학기 사전 진단</h1>
            <p className="text-[13px] text-[#656D76] mt-1">
              핵심역량 6개 영역, 총 90문항을 응답합니다.
            </p>
          </div>

          {/* Info grid */}
          <div className="px-8 py-5">
            <div className="grid grid-cols-2 gap-0 border border-[#E5E7EB] rounded-[8px] overflow-hidden text-[13px]">
              {GUIDE_INFO.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex gap-0 ${i < GUIDE_INFO.length - 1 ? 'border-b border-[#E5E7EB]' : ''} ${i % 2 === 0 && i < GUIDE_INFO.length - 1 ? 'border-r border-[#E5E7EB]' : ''}`}
                >
                  <div className="w-28 flex-shrink-0 px-4 py-3 bg-[#F6F8FA] font-semibold text-[#656D76]">
                    {item.label}
                  </div>
                  <div className="flex-1 px-4 py-3 text-[#1F2328]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Competency overview */}
          <div className="px-8 pb-5">
            <div className="text-[12px] font-semibold text-[#656D76] uppercase tracking-wide mb-3">
              역량별 문항 구성
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'C1', label: '자기관리', count: 15, color: '#2563EB' },
                { key: 'C2', label: '의사소통', count: 15, color: '#7C3AED' },
                { key: 'C3', label: '글로벌', count: 15, color: '#0891B2' },
                { key: 'C4', label: '대인관계', count: 15, color: '#059669' },
                { key: 'C5', label: '종합적 사고력', count: 15, color: '#D97706' },
                { key: 'C6', label: '자원·정보·기술', count: 15, color: '#6B7280' },
              ].map((c) => (
                <div
                  key={c.key}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] bg-[#F9FAFB] border border-[#E5E7EB]"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                    style={{ background: c.color }}
                  >
                    {c.key}
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[#1F2328]">{c.label}</div>
                    <div className="text-[11px] text-[#9AA0A6]">{c.count}문항</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notice box */}
          <div className="px-8 pb-5">
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="#656D76">
                  <circle cx="8" cy="8" r="7" />
                  <path
                    d="M8 4v5M8 11h.01"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[12px] font-bold text-[#656D76] uppercase tracking-wide">
                  유의사항
                </span>
              </div>
              <ul className="text-[13px] text-[#656D76] space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-[#9AA0A6] flex-shrink-0 mt-0.5">·</span>중간에 저장하고
                  나중에 이어서 응시할 수 있습니다.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#9AA0A6] flex-shrink-0 mt-0.5">·</span>제출 후에는 응답을
                  수정할 수 없습니다.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#9AA0A6] flex-shrink-0 mt-0.5">·</span>솔직하고 신중하게
                  응답해 주세요. 정답은 없습니다.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#9AA0A6] flex-shrink-0 mt-0.5">·</span>응시 중 세션이
                  만료되면 임시 저장된 내용은 보존됩니다.
                </li>
              </ul>
            </div>
          </div>

          {/* Privacy consent */}
          <div className="px-8 pb-6">
            <div
              className={`rounded-[8px] border transition-colors overflow-hidden ${agreed ? 'border-[#7C3AED]' : 'border-[#E5E7EB]'}`}
            >
              <div className="px-5 py-4 flex items-start gap-3">
                <input
                  id="privacyAgree"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded-[3px] accent-[#7C3AED] cursor-pointer flex-shrink-0"
                />
                <label htmlFor="privacyAgree" className="flex-1 cursor-pointer select-none">
                  <span className="text-[13px] font-bold text-[#1F2328]">
                    진단 목적 개인정보 수집·이용에 동의합니다.
                  </span>
                  <span className="ml-2 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#CF222E]">
                    필수
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setExpandPrivacy((p) => !p)}
                  className="text-[12px] text-[#7C3AED] font-semibold hover:underline flex-shrink-0 flex items-center gap-1"
                >
                  {expandPrivacy ? '접기' : '상세보기'}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="currentColor"
                    className={`transition-transform ${expandPrivacy ? 'rotate-180' : ''}`}
                  >
                    <path d="M1 3l4 4 4-4" />
                  </svg>
                </button>
              </div>
              {expandPrivacy && (
                <div className="border-t border-[#E5E7EB] px-5 py-4 bg-[#FAFAFA]">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-[#656D76] uppercase text-[11px]">
                        <th className="text-left py-1.5 pr-4 font-semibold">항목</th>
                        <th className="text-left py-1.5 pr-4 font-semibold">수집 항목</th>
                        <th className="text-left py-1.5 font-semibold">보유 기간</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#1F2328]">
                      <tr className="border-t border-[#F3F4F6]">
                        <td className="py-2 pr-4">진단 응답</td>
                        <td className="py-2 pr-4">역량 진단 응답값, 학번, 학과</td>
                        <td className="py-2">졸업 후 5년</td>
                      </tr>
                      <tr className="border-t border-[#F3F4F6]">
                        <td className="py-2 pr-4">분석 결과</td>
                        <td className="py-2 pr-4">역량별 점수, 백분위, 등급</td>
                        <td className="py-2">졸업 후 5년</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="px-8 pb-8">
            <Button
              size="lg"
              className="w-full justify-center"
              disabled={!agreed}
              style={{ background: agreed ? '#7C3AED' : undefined }}
              onClick={onStart}
            >
              진단 시작하기
            </Button>
            {!agreed && (
              <p className="text-center text-[12px] text-[#9AA0A6] mt-2">
                개인정보 수집·이용에 동의 후 시작할 수 있습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
