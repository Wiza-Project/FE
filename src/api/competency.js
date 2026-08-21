import { apiClient } from '@/api/client';

/**
 * 핵심역량 등록 (SCR-A01). 역량코드(C1~C6)와 축순서는 서버가 자동 결정한다.
 *
 * @param {Object} params
 * @param {string} params.competencyName
 * @param {string} [params.englishName]
 * @param {string} [params.description]
 * @returns {Promise<{competencyId: number, competencyCode: string, competencyName: string, englishName: string|null, description: string|null, displayOrder: number, active: boolean}>}
 */
export const registerCompetency = async ({ competencyName, englishName, description }) => {
  const { data } = await apiClient.post('/admin/competencies', {
    competencyName,
    englishName,
    description,
  });
  return data;
};

/**
 * 축순서 지정 (SCR-A01). 결과 화면 방사형 차트에 표시될 위치를 1~6 중에서 지정한다.
 * 지정하려는 번호가 비어 있으면 해당 역량만 변경된다. 다른 역량이 이미 그 번호를
 * 쓰고 있으면 서버가 두 역량의 축순서를 서로 맞바꾼다(스왑) — 이 경우 응답 배열에
 * 두 역량이 모두 담겨 온다.
 *
 * @param {Object} params
 * @param {number} params.competencyId
 * @param {number} params.displayOrder 1~6
 * @returns {Promise<Array<{competencyId: number, competencyCode: string, competencyName: string, englishName: string|null, description: string|null, displayOrder: number, active: boolean}>>}
 *   빈 슬롯으로 이동한 경우 1개, 스왑이 일어난 경우 2개([이동한 역량, 자리를 내준 역량] 순서)
 */
export const changeCompetencyDisplayOrder = async ({ competencyId, displayOrder }) => {
  const { data } = await apiClient.patch(`/admin/competencies/${competencyId}/display-order`, {
    displayOrder,
  });
  return data;
};

/**
 * 사용여부 관리 (SCR-A01). 응답 이력이 있는 역량도 삭제 대신 비활성 처리로 과거 기록을 보존한다.
 *
 * @param {Object} params
 * @param {number} params.competencyId
 * @param {boolean} params.active
 * @returns {Promise<{competencyId: number, competencyCode: string, competencyName: string, englishName: string|null, description: string|null, displayOrder: number, active: boolean}>}
 */
export const changeCompetencyActiveStatus = async ({ competencyId, active }) => {
  const { data } = await apiClient.patch(`/admin/competencies/${competencyId}/active-status`, {
    active,
  });
  return data;
};
