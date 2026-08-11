import { useQuery } from '@tanstack/react-query';
import { fetchPing } from '@/api/health';

/**
 * 백엔드 연동 확인용 임시 페이지.
 * 확인이 끝나면 실제 대시보드로 교체하세요.
 */
export default function HomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ping'],
    queryFn: fetchPing,
  });

  return (
    <section>
      <h2>백엔드 연결 확인</h2>
      {isLoading && <p>확인 중...</p>}
      {error && <p className="error">연결 실패: {error.message}</p>}
      {data && <p>서버 응답: {data.message}</p>}

      <h3 style={{ marginTop: 32 }}>업무 영역</h3>
      <ul>
        <li>비교과프로그램 (P1100, P1200)</li>
        <li>핵심역량 진단 (P2100, P2200)</li>
        <li>상담관리 (P3100)</li>
        <li>마일리지 (P4100)</li>
        <li>취창업관리 (P5100)</li>
      </ul>
    </section>
  );
}
