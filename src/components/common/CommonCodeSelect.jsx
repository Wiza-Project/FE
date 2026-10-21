import { useCommonCode } from '@/hooks/useCommonCode';
import { Select } from './Select';

/**
 * 공통코드 그룹을 옵션으로 채우는 셀렉트박스.
 * 각 도메인의 하드코딩된 옵션 배열(src/data/programOptions.js 등) 대신 이 컴포넌트로
 * 갈아끼우면 됩니다. value / onChange 는 공통코드의 `code` 필드(예: 'D100') 기준입니다.
 *
 * @param {Object} props
 * @param {string} props.groupCode 조회할 공통코드 그룹 (예: 'DEPARTMENT', 'PROGRAM_TYPE')
 * @param {string} [props.label]
 * @param {string|null} [props.placeholder] 목록 최상단 안내 옵션(value: ''). null이면 넣지 않음
 * @param {boolean} [props.disabled]
 */
export function CommonCodeSelect({
  groupCode,
  label,
  placeholder = '선택하세요',
  className = '',
  disabled = false,
  ...props
}) {
  const { data: codes = [], isLoading, isError } = useCommonCode(groupCode);

  const options = isLoading
    ? [{ value: '', label: '불러오는 중…' }]
    : isError
      ? [{ value: '', label: '목록을 불러오지 못했습니다' }]
      : [
          ...(placeholder === null ? [] : [{ value: '', label: placeholder }]),
          ...codes.map((c) => ({ value: c.code, label: c.codeName })),
        ];

  return (
    <Select
      label={label}
      options={options}
      className={className}
      disabled={disabled || isLoading || isError}
      {...props}
    />
  );
}
