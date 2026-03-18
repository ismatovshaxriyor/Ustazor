import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/client';
import { formatMoney, normalizeListResponse } from '../utils/format';

function MastersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [category, setCategory] = useState(() => searchParams.get('category') || '');
  const [city, setCity] = useState(() => searchParams.get('city') || '');
  const [masters, setMasters] = useState([]);
  const [directory, setDirectory] = useState([]);
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
    authApi
      .listPublicWorkers()
      .then((data) => {
        if (!active) {
          return;
        }
        setDirectory(normalizeListResponse(data));
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setDirectory([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setStatus((prev) => ({ ...prev, loading: true, error: '' }));

    authApi
      .listPublicWorkers({
        q: query,
        category,
        city,
      })
      .then((data) => {
        if (!active) {
          return;
        }
        setMasters(normalizeListResponse(data));
        setStatus({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setMasters([]);
        setStatus({
          loading: false,
          error: error.message || 'Ustalar ro`yxatini yuklab bo`lmadi.',
        });
      });

    return () => {
      active = false;
    };
  }, [query, category, city]);

  const categories = useMemo(() => {
    const values = new Set(directory.map((item) => item.specialization).filter(Boolean));
    if (category.trim()) {
      values.add(category.trim());
    }
    return ['all', ...Array.from(values)];
  }, [directory, category]);

  const cities = useMemo(() => {
    const values = new Set(directory.map((item) => item.service_city).filter(Boolean));
    if (city.trim()) {
      values.add(city.trim());
    }
    return ['all', ...Array.from(values)];
  }, [directory, city]);

  return (
    <section className="stack-medium">
      <div className="section-heading reveal-up">
        <p className="eyebrow">usta qidiruv</p>
        <h1>Ishingizga mos ustani toping</h1>
      </div>

      <div className="filter-bar reveal-up delay-1">
        <input
          className="input"
          placeholder="Usta yoki xizmat bo'yicha qidirish"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="input"
          value={category || 'all'}
          onChange={(event) => setCategory(event.target.value === 'all' ? '' : event.target.value)}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item === 'all' ? "Barcha yo'nalish" : item}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={city || 'all'}
          onChange={(event) => setCity(event.target.value === 'all' ? '' : event.target.value)}
        >
          {cities.map((item) => (
            <option key={item} value={item}>
              {item === 'all' ? 'Barcha shahar' : item}
            </option>
          ))}
        </select>
      </div>

      {status.loading ? (
        <p className="muted">Ustalar yuklanmoqda...</p>
      ) : masters.length === 0 ? (
        <p className="muted">Filtringiz bo`yicha usta topilmadi.</p>
      ) : (
        <div className="card-grid reveal-up delay-2">
          {masters.map((master) => (
            <article key={master.id} className="listing-card">
              <p className="pill">{master.specialization || 'Usta xizmati'}</p>
              <h3>{master.full_name || 'Usta'}</h3>
              <p className="muted">
                {master.service_city || 'Shahar kiritilmagan'} · {master.experience_years || 0} yil tajriba
              </p>
              <p>{master.about || 'Usta hozircha batafsil ma`lumot qoldirmagan.'}</p>

              <div className="chip-row">
                {(master.skills || []).slice(0, 4).map((skill) => (
                  <span key={skill} className="chip">
                    {skill}
                  </span>
                ))}
              </div>

              <div className="listing-footer">
                <div>
                  <p className="price">{formatMoney(master.min_order_price)}</p>
                  <p className="muted">
                    {master.is_available ? 'Buyurtma qabul qiladi' : 'Hozir band'}
                  </p>
                </div>
                <Link to={`/masters/${master.id}`} className="button button-primary">
                  Profilni ko'rish
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

export default MastersPage;
