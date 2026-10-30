import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="hero">
      <h1>Страница не найдена</h1>
      <p>
        <Link to="/">На главную</Link>
      </p>
    </section>
  );
}
