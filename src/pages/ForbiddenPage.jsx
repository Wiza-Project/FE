import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <section>
      <h2>403</h2>
      <p>접근 권한이 없습니다.</p>
      <Link to="/">홈으로</Link>
    </section>
  );
}
