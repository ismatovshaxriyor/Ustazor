import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/client';

function formatBudget(vacancy) {
  if (vacancy.price_type === 'negotiable') {
    return 'Kelishiladi';
  }

  const amount = Number(vacancy.price_amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Aniq narx';
  }

  return `${amount.toLocaleString('uz-UZ')} so'm`;
}

function formatDate(value) {
  if (!value) {
    return 'Sana ko`rsatilmagan';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('uz-UZ');
}

function normalizeListResponse(data) {
  return Array.isArray(data) ? data : (data.results || []);
}

function VacanciesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [category, setCategory] = useState(() => searchParams.get('category') || '');
  const [city, setCity] = useState(() => searchParams.get('city') || '');
  const [vacancies, setVacancies] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('q', query.trim());
    }
    if (category.trim()) {
      params.set('category', category.trim());
    }
    if (city.trim()) {
      params.set('city', city.trim());
    }
    setSearchParams(params, { replace: true });
  }, [query, category, city, setSearchParams]);

  useEffect(() => {
    let active = true;
    setStatus((prev) => ({ ...prev, loading: true, error: '' }));

    authApi
      .listPublicVacancies({
        q: query,
        category,
        city,
      })
      .then((data) => {
        if (!active) {
          return;
        }
        setVacancies(normalizeListResponse(data));
        setStatus({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setVacancies([]);
        setStatus({
          loading: false,
          error: error.message || 'Vakansiyalarni yuklab bo`lmadi.',
        });
      });

    return () => {
      active = false;
    };
  }, [query, category, city]);

  const emptyText = useMemo(() => {
    if (query || category || city) {
      return 'Filtringiz bo`yicha vakansiya topilmadi.';
    }
    return 'Hozircha vakansiyalar mavjud emas.';
  }, [query, category, city]);

  return (
    <section className="stack-medium">
      <div className="section-heading reveal-up">
        <p className="eyebrow">mijoz e'lonlari</p>
        <h1>Vakansiyalar va ish e'lonlari</h1>
      </div>

      <div className="filter-bar reveal-up delay-1">
        <input
          className="input"
          placeholder="Vakansiya yoki tavsif bo`yicha qidirish"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <input
          className="input"
          placeholder="Yo`nalish (Masalan: Elektrik)"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
        <input
          className="input"
          placeholder="Shahar"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        />
      </div>

      {status.loading ? (
        <p className="muted">Vakansiyalar yuklanmoqda...</p>
      ) : vacancies.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <div className="card-grid reveal-up delay-2">
          {vacancies.map((vacancy) => (
            <article key={vacancy.id} className="listing-card">
              <p className="pill">{vacancy.category || 'Boshqa yo`nalish'}</p>
              <h3>{vacancy.title}</h3>
              <p>{vacancy.description}</p>
              <p className="muted">
                {vacancy.city || 'Shahar kiritilmagan'} · Joylangan: {formatDate(vacancy.created_at)}
              </p>
              <p className="muted">
                Muddat: {vacancy.due_date ? formatDate(vacancy.due_date) : 'Kelishiladi'}
              </p>

              <div className="listing-footer">
                <p className="price">{formatBudget(vacancy)}</p>
                <Link to={`/elonlar/${vacancy.id}`} className="button button-primary">
                  Batafsil
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {status.error && <p className="form-message error">{status.error}</p>}
    </section>
  );
}

export default VacanciesPage;
