import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { authApi } from '../api/client';
import { normalizeListResponse } from '../utils/format';

function MastersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialFilters = {
    category: searchParams.get('category') || '',
    city: searchParams.get('city') || '',
    minRating: searchParams.get('min_rating') || '',
    minExperience: searchParams.get('min_experience') || '',
    sort: searchParams.get('sort') || 'rating_desc',
  };

  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery.trim());
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [masters, setMasters] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('q', query.trim());
    }
    if (filters.category.trim()) {
      params.set('category', filters.category.trim());
    }
    if (filters.city.trim()) {
      params.set('city', filters.city.trim());
    }
    if (filters.minRating.trim()) {
      params.set('min_rating', filters.minRating.trim());
    }
    if (filters.minExperience.trim()) {
      params.set('min_experience', filters.minExperience.trim());
    }
    if (filters.sort && filters.sort !== 'rating_desc') {
      params.set('sort', filters.sort);
    }

    setSearchParams(params, { replace: true });
  }, [query, filters, setSearchParams]);

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
        category: filters.category,
        city: filters.city,
        min_rating: filters.minRating,
        min_experience: filters.minExperience,
        sort: filters.sort,
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
  }, [query, filters]);

  const categories = useMemo(() => {
    const values = new Set(directory.map((item) => item.specialization).filter(Boolean));
    if (filters.category.trim()) {
      values.add(filters.category.trim());
    }
    return ['all', ...Array.from(values)];
  }, [directory, filters.category]);

  const cities = useMemo(() => {
    const values = new Set(directory.map((item) => item.service_city).filter(Boolean));
    if (filters.city.trim()) {
      values.add(filters.city.trim());
    }
    return ['all', ...Array.from(values)];
  }, [directory, filters.city]);

  const activeFilterCount = useMemo(
    () => [
      filters.category,
      filters.city,
      filters.minRating,
      filters.minExperience,
      filters.sort !== 'rating_desc' ? filters.sort : '',
    ].filter(Boolean).length,
    [filters],
  );

  const onSearchSubmit = (event) => {
    event.preventDefault();
    setQuery(queryInput.trim());
  };

  const openFilterModal = () => {
    setDraftFilters(filters);
    setIsFilterModalOpen(true);
  };

  const closeFilterModal = () => {
    setIsFilterModalOpen(false);
  };

  const updateDraftFilter = (field) => (event) => {
    const value = event.target.value;
    setDraftFilters((prev) => ({
      ...prev,
      [field]: value === 'all' ? '' : value,
    }));
  };

  const resetDraftFilters = () => {
    setDraftFilters({
      category: '',
      city: '',
      minRating: '',
      minExperience: '',
      sort: 'rating_desc',
    });
  };

  const applyFilters = () => {
    setQuery(queryInput.trim());
    setFilters({
      category: draftFilters.category,
      city: draftFilters.city,
      minRating: draftFilters.minRating,
      minExperience: draftFilters.minExperience,
      sort: draftFilters.sort || 'rating_desc',
    });
    setIsFilterModalOpen(false);
  };

  return (
    <section className="stack-medium">
      <div className="section-heading reveal-up">
        <p className="eyebrow">usta qidiruv</p>
        <h1>Ishingizga mos ustani toping</h1>
      </div>

      <div className="masters-toolbar reveal-up delay-1">
        <form className="masters-search-form" onSubmit={onSearchSubmit}>
          <input
            className="input"
            placeholder="Usta yoki xizmat bo'yicha qidirish"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
          />
          <button className="button button-primary" type="submit">
            Qidirish
          </button>
        </form>
        <button type="button" className="button button-ghost masters-filter-button" onClick={openFilterModal}>
          <SlidersHorizontal size={18} />
          <span>Filtr</span>
          {activeFilterCount > 0 ? <span className="masters-filter-count">{activeFilterCount}</span> : null}
        </button>
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
                  <p className="price">
                    {master.rating_count > 0
                      ? `⭐ ${Number(master.rating_avg || 0).toFixed(1)} (${master.rating_count})`
                      : '⭐ Reyting yo`q'}
                  </p>
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

      {isFilterModalOpen && (
        <div className="modal-backdrop" onClick={closeFilterModal} role="presentation">
          <article className="modal-card card masters-filter-modal" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>Ustalarni filtrlash</h3>
              <button type="button" className="button button-ghost" onClick={closeFilterModal}>
                Yopish
              </button>
            </div>

            <div className="masters-filter-grid">
              <div>
                <label className="label" htmlFor="masters-filter-category">
                  Yo'nalish
                </label>
                <select
                  id="masters-filter-category"
                  className="input"
                  value={draftFilters.category || 'all'}
                  onChange={updateDraftFilter('category')}
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item === 'all' ? "Barcha yo'nalish" : item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="masters-filter-city">
                  Shahar
                </label>
                <select
                  id="masters-filter-city"
                  className="input"
                  value={draftFilters.city || 'all'}
                  onChange={updateDraftFilter('city')}
                >
                  {cities.map((item) => (
                    <option key={item} value={item}>
                      {item === 'all' ? 'Barcha shahar' : item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="masters-filter-rating">
                  Reyting
                </label>
                <select
                  id="masters-filter-rating"
                  className="input"
                  value={draftFilters.minRating || 'all'}
                  onChange={updateDraftFilter('minRating')}
                >
                  <option value="all">Har qanday reyting</option>
                  <option value="4.5">4.5+ reyting</option>
                  <option value="4">4.0+ reyting</option>
                  <option value="3">3.0+ reyting</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="masters-filter-experience">
                  Tajriba
                </label>
                <select
                  id="masters-filter-experience"
                  className="input"
                  value={draftFilters.minExperience || 'all'}
                  onChange={updateDraftFilter('minExperience')}
                >
                  <option value="all">Har qanday tajriba</option>
                  <option value="1">1+ yil</option>
                  <option value="3">3+ yil</option>
                  <option value="5">5+ yil</option>
                  <option value="10">10+ yil</option>
                </select>
              </div>

              <div className="masters-filter-grid-wide">
                <label className="label" htmlFor="masters-filter-sort">
                  Saralash
                </label>
                <select
                  id="masters-filter-sort"
                  className="input"
                  value={draftFilters.sort}
                  onChange={updateDraftFilter('sort')}
                >
                  <option value="rating_desc">Reyting: yuqoridan</option>
                  <option value="rating_asc">Reyting: pastdan</option>
                  <option value="newest">So`nggi yangilangan</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="button button-ghost" onClick={resetDraftFilters}>
                Filtrlarni tozalash
              </button>
              <button type="button" className="button button-primary" onClick={applyFilters}>
                Qidirish
              </button>
            </div>
          </article>
        </div>
      )}

      {status.error && <p className="form-message error">{status.error}</p>}
    </section>
  );
}

export default MastersPage;
