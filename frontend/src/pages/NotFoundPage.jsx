import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="empty-state">
      <h1>Sahifa topilmadi</h1>
      <p className="muted">URL noto`g`ri bo`lishi mumkin.</p>
      <Link className="button button-primary" to="/">
        Bosh sahifaga qaytish
      </Link>
    </section>
  );
}

export default NotFoundPage;
