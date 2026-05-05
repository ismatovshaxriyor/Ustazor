import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Search, SlidersHorizontal } from 'lucide-react';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatBudget, formatDate, normalizeListResponse } from '../utils/format';

const VACANCY_STATUS_LABELS = {
  open: 'Yangi',
  in_progress: 'Jarayonda',
  completed: 'Yakunlangan',
  cancelled: 'Bekor qilingan',
};

function VacanciesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user, tokens, applyToVacancy, fetchMyProposals } = useAuth();
  const isWorker = isAuthenticated && user?.user_type === 'worker';
  const initialQuery = searchParams.get('q') || '';
  const initialFilters = {
    category: searchParams.get('category') || '',
    city: searchParams.get('city') || '',
    priceType: searchParams.get('price_type') || '',
  };
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery.trim());
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedVacancyId, setSelectedVacancyId] = useState(() => searchParams.get('vacancy') || '');
  const [vacancies, setVacancies] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [vacancyModal, setVacancyModal] = useState({
    open: false,
    loading: false,
    error: '',
    detail: null,
  });
  const [isApplyFormOpen, setIsApplyFormOpen] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [existingProposal, setExistingProposal] = useState(null);
  const [applyForm, setApplyForm] = useState({
    coverLetter: '',
    proposedPrice: '',
  });
  const [applyStatus, setApplyStatus] = useState({ saving: false, error: '', success: '' });

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
    if (filters.priceType.trim()) {
      params.set('price_type', filters.priceType.trim());
    }
    if (selectedVacancyId) {
      params.set('vacancy', selectedVacancyId);
    }
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [query, filters, selectedVacancyId, searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;
    authApi
      .listPublicVacancies()
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
    if (isAuthenticated && user?.user_type === 'client') {
      return;
    }

    let active = true;
    setStatus((prev) => ({ ...prev, loading: true, error: '' }));

    authApi
      .listPublicVacancies({
        q: query,
        category: filters.category,
        city: filters.city,
        price_type: filters.priceType,
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
  }, [query, filters, isAuthenticated, user?.user_type]);

  useEffect(() => {
    if (!selectedVacancyId) {
      setVacancyModal({ open: false, loading: false, error: '', detail: null });
      setIsApplyFormOpen(false);
      setShowContactDetails(false);
      setAlreadyApplied(false);
      setExistingProposal(null);
      setApplyStatus({ saving: false, error: '', success: '' });
      return;
    }

    let active = true;
    setVacancyModal({ open: true, loading: true, error: '', detail: null });
    setIsApplyFormOpen(false);
    setShowContactDetails(false);
    setApplyStatus({ saving: false, error: '', success: '' });

    const vacancyPromise = authApi.getPublicVacancy(selectedVacancyId, tokens?.access || null);
    const myProposalsPromise = isWorker
      ? fetchMyProposals().catch(() => [])
      : Promise.resolve([]);

    Promise.all([vacancyPromise, myProposalsPromise])
      .then(([detail, proposalsData]) => {
        if (!active) {
          return;
        }

        const proposalList = Array.isArray(proposalsData)
          ? proposalsData
          : (proposalsData.results || []);
        const currentProposal = proposalList.find(
          (item) => Number(item.vacancy_id) === Number(selectedVacancyId),
        ) || null;

        setAlreadyApplied(Boolean(currentProposal));
        setExistingProposal(currentProposal);
        setVacancyModal({ open: true, loading: false, error: '', detail });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setAlreadyApplied(false);
        setExistingProposal(null);
        setVacancyModal({
          open: true,
          loading: false,
          error: error.message || 'E`lon tafsilotini yuklab bo`lmadi.',
          detail: null,
        });
      });

    return () => {
      active = false;
    };
  }, [selectedVacancyId, isWorker, tokens?.access, fetchMyProposals]);

  const emptyText = useMemo(() => {
    if (query || filters.category || filters.city || filters.priceType) {
      return 'Filtringiz bo`yicha vakansiya topilmadi.';
    }
    return 'Hozircha vakansiyalar mavjud emas.';
  }, [query, filters]);

  const categories = useMemo(() => {
    const values = new Set(directory.map((item) => item.category).filter(Boolean));
    if (filters.category.trim()) {
      values.add(filters.category.trim());
    }
    return ['all', ...Array.from(values)];
  }, [directory, filters.category]);

  const cities = useMemo(() => {
    const values = new Set(directory.map((item) => item.city).filter(Boolean));
    if (filters.city.trim()) {
      values.add(filters.city.trim());
    }
    return ['all', ...Array.from(values)];
  }, [directory, filters.city]);

  const activeFilterCount = useMemo(
    () => [filters.category, filters.city, filters.priceType].filter(Boolean).length,
    [filters],
  );

  if (isAuthenticated && user?.user_type === 'client') {
    return <Navigate to="/orders" replace />;
  }

  const openVacancyModal = (vacancyId) => {
    setSelectedVacancyId(`${vacancyId}`);
  };

  const closeVacancyModal = () => {
    setSelectedVacancyId('');
  };

  const onApplyFieldChange = (field) => (event) => {
    setApplyForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

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
      priceType: '',
    });
  };

  const applyFilters = () => {
    setQuery(queryInput.trim());
    setFilters({
      category: draftFilters.category,
      city: draftFilters.city,
      priceType: draftFilters.priceType,
    });
    setIsFilterModalOpen(false);
  };

  const openApplyForm = () => {
    setApplyStatus({ saving: false, error: '', success: '' });
    setIsApplyFormOpen(true);
  };

  const closeApplyForm = () => {
    setIsApplyFormOpen(false);
    setApplyStatus({ saving: false, error: '', success: '' });
  };

  const submitApply = async (event) => {
    event.preventDefault();
    if (!selectedVacancyId) {
      return;
    }
    setApplyStatus({ saving: true, error: '', success: '' });

    try {
      const created = await applyToVacancy(selectedVacancyId, {
        cover_letter: applyForm.coverLetter,
        proposed_price: applyForm.proposedPrice ? applyForm.proposedPrice : null,
      });
      setApplyForm({ coverLetter: '', proposedPrice: '' });
      setAlreadyApplied(true);
      setExistingProposal(created);
      setApplyStatus({ saving: false, error: '', success: 'Murojaat yuborildi.' });
      setIsApplyFormOpen(false);

      if (created?.chat_thread_id) {
        closeVacancyModal();
        navigate(`/chat/${created.chat_thread_id}`);
      }
    } catch (error) {
      setApplyStatus({
        saving: false,
        error: error.message || 'Murojaat yuborishda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  const detail = vacancyModal.detail;
  const clientPhone = `${detail?.client_phone_number || ''}`.trim();
  const clientSecondaryPhone = `${detail?.client_secondary_phone_number || ''}`.trim();
  const clientEmail = `${detail?.client_email || ''}`.trim();
  const rawTelegram = `${detail?.client_telegram_username || ''}`.trim();
  const cleanTelegram = rawTelegram.startsWith('@') ? rawTelegram.slice(1) : rawTelegram;
  const telegramUrl = cleanTelegram ? `https://t.me/${encodeURIComponent(cleanTelegram)}` : '';
  const rawInstagram = `${detail?.client_instagram_username || ''}`.trim();
  const cleanInstagram = rawInstagram.startsWith('@') ? rawInstagram.slice(1) : rawInstagram;
  const instagramUrl = cleanInstagram
    ? `https://instagram.com/${encodeURIComponent(cleanInstagram)}`
    : '';
  const contactItems = [
    {
      key: 'phone',
      label: 'Telefon raqami',
      value: clientPhone,
      text: clientPhone,
      href: clientPhone ? `tel:${clientPhone}` : '',
    },
    {
      key: 'secondary_phone',
      label: "Qo`shimcha telefon",
      value: clientSecondaryPhone,
      text: clientSecondaryPhone,
      href: clientSecondaryPhone ? `tel:${clientSecondaryPhone}` : '',
    },
    {
      key: 'telegram',
      label: 'Telegram',
      value: cleanTelegram,
      text: `@${cleanTelegram}`,
      href: telegramUrl,
    },
    {
      key: 'instagram',
      label: 'Instagram',
      value: cleanInstagram,
      text: `@${cleanInstagram}`,
      href: instagramUrl,
    },
    {
      key: 'email',
      label: 'Email',
      value: clientEmail,
      text: clientEmail,
      href: clientEmail ? `mailto:${clientEmail}` : '',
    },
  ].filter((item) => item.value);

  return (
    <section className="stack-medium">
      <div className="section-heading reveal-up">
        <p className="eyebrow">mijoz e'lonlari</p>
        <h1>Vakansiyalar va ish e'lonlari</h1>
      </div>

      <div className="masters-toolbar reveal-up delay-1">
        <form className="masters-search-form" onSubmit={onSearchSubmit}>
          <input
            className="input"
            placeholder="Vakansiya yoki tavsif bo`yicha qidirish"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
          />
          <button className="button button-primary" type="submit">
            <Search size={16} />
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
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => openVacancyModal(vacancy.id)}
                >
                  <FileText size={16} />
                  Batafsil
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {status.error && <p className="form-message error">{status.error}</p>}

      {isFilterModalOpen && (
        <div className="modal-backdrop" onClick={closeFilterModal} role="presentation">
          <article className="modal-card card masters-filter-modal" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>Vakansiyalarni filtrlash</h3>
              <button type="button" className="button button-ghost" onClick={closeFilterModal}>
                Yopish
              </button>
            </div>

            <div className="masters-filter-grid">
              <div>
                <label className="label" htmlFor="vacancies-filter-category">
                  Yo`nalish
                </label>
                <select
                  id="vacancies-filter-category"
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
                <label className="label" htmlFor="vacancies-filter-city">
                  Shahar
                </label>
                <select
                  id="vacancies-filter-city"
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

              <div className="masters-filter-grid-wide">
                <label className="label" htmlFor="vacancies-filter-price-type">
                  Narx turi
                </label>
                <select
                  id="vacancies-filter-price-type"
                  className="input"
                  value={draftFilters.priceType || 'all'}
                  onChange={updateDraftFilter('priceType')}
                >
                  <option value="all">Har qanday narx turi</option>
                  <option value="negotiable">Kelishish asosida</option>
                  <option value="fixed">Aniq narx</option>
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

      {vacancyModal.open && (
        <div className="modal-backdrop" onClick={closeVacancyModal} role="presentation">
          <article className="modal-card card chat-vacancy-modal" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>E`lon tafsiloti</h3>
              <button type="button" className="button button-ghost" onClick={closeVacancyModal}>
                Yopish
              </button>
            </div>

            {vacancyModal.loading ? (
              <p className="muted">E`lon yuklanmoqda...</p>
            ) : vacancyModal.error ? (
              <p className="form-message error">{vacancyModal.error}</p>
            ) : detail ? (
              <div className="chat-vacancy-content">
                <p className="pill">{detail.category || 'Boshqa yo`nalish'}</p>
                <h3>{detail.title}</h3>
                <p>{detail.description || 'Tavsif kiritilmagan.'}</p>

                <div className="chat-vacancy-grid">
                  <div className="chat-vacancy-item">
                    <p className="chat-vacancy-item-label">Shahar</p>
                    <p className="chat-vacancy-item-value">{detail.city || 'Kiritilmagan'}</p>
                  </div>
                  <div className="chat-vacancy-item">
                    <p className="chat-vacancy-item-label">Narx</p>
                    <p className="chat-vacancy-item-value">{formatBudget(detail)}</p>
                  </div>
                  <div className="chat-vacancy-item">
                    <p className="chat-vacancy-item-label">Holat</p>
                    <p className="chat-vacancy-item-value">
                      {VACANCY_STATUS_LABELS[detail.status] || detail.status || 'Noma`lum'}
                    </p>
                  </div>
                  <div className="chat-vacancy-item">
                    <p className="chat-vacancy-item-label">Muddat</p>
                    <p className="chat-vacancy-item-value">
                      {detail.due_date ? formatDate(detail.due_date) : 'Kelishiladi'}
                    </p>
                  </div>
                </div>

                <div className="chat-vacancy-grid chat-vacancy-grid-bottom">
                  {detail.address ? (
                    <div className="chat-vacancy-item">
                      <p className="chat-vacancy-item-label">Manzil</p>
                      <p className="chat-vacancy-item-value">{detail.address}</p>
                    </div>
                  ) : (
                    <div className="chat-vacancy-item chat-vacancy-item-span-2">
                      <p className="chat-vacancy-item-label">Manzil</p>
                      <p className="chat-vacancy-item-value">Kiritilmagan</p>
                    </div>
                  )}

                  <div className="chat-vacancy-item">
                    <p className="chat-vacancy-item-label">Mijoz</p>
                    <p className="chat-vacancy-item-value">{detail.client_name || 'Foydalanuvchi'}</p>
                    <p className="chat-vacancy-item-label">Joylangan</p>
                    <p className="chat-vacancy-item-value">{formatDate(detail.created_at)}</p>
                  </div>
                </div>

                <div className="modal-actions">
                  {isWorker ? (
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={() => {
                        if (alreadyApplied && existingProposal?.chat_thread_id) {
                          closeVacancyModal();
                          navigate(`/chat/${existingProposal.chat_thread_id}`);
                          return;
                        }
                        openApplyForm();
                      }}
                    >
                      {alreadyApplied ? 'Chatni ochish' : 'Murojaat qilish'}
                    </button>
                  ) : isAuthenticated ? (
                    <button type="button" className="button button-ghost" disabled>
                      Murojaat yuborish faqat ustalar uchun
                    </button>
                  ) : (
                    <Link to="/auth/login" className="button button-primary" onClick={closeVacancyModal}>
                      Kirib murojaat qiling
                    </Link>
                  )}
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => setShowContactDetails((prev) => !prev)}
                  >
                    {showContactDetails ? "Bog'lanishni yopish" : "Bog'lanish"}
                  </button>
                </div>

                {showContactDetails && (
                  contactItems.length > 0 ? (
                    <div className="chat-vacancy-grid">
                      {contactItems.map((item) => (
                        <div key={item.key} className="chat-vacancy-item">
                          <p className="chat-vacancy-item-label">{item.label}</p>
                          <p className="chat-vacancy-item-value">
                            {item.href ? (
                              <a
                                href={item.href}
                                target={item.href.startsWith('http') ? '_blank' : undefined}
                                rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                              >
                                {item.text}
                              </a>
                            ) : (
                              item.text
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">Bog`lanish ma`lumotlari kiritilmagan.</p>
                  )
                )}

                {applyStatus.error && <p className="form-message error">{applyStatus.error}</p>}
                {applyStatus.success && <p className="form-message success">{applyStatus.success}</p>}

                {isApplyFormOpen && (
                  <form className="stack-small" onSubmit={submitApply}>
                    <div>
                      <label className="label" htmlFor="vacancy-modal-cover-letter">
                        Murojaat xati
                      </label>
                      <textarea
                        id="vacancy-modal-cover-letter"
                        className="input"
                        rows={4}
                        value={applyForm.coverLetter}
                        onChange={onApplyFieldChange('coverLetter')}
                        placeholder="Qisqacha tajribangiz va ish rejangizni yozing."
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="vacancy-modal-price">
                        Taklif narxi (ixtiyoriy)
                      </label>
                      <input
                        id="vacancy-modal-price"
                        className="input"
                        type="number"
                        min="1"
                        value={applyForm.proposedPrice}
                        onChange={onApplyFieldChange('proposedPrice')}
                        placeholder="Masalan: 2500000"
                      />
                    </div>

                    <div className="modal-actions">
                      <button type="button" className="button button-ghost" onClick={closeApplyForm}>
                        Bekor qilish
                      </button>
                      <button className="button button-primary" type="submit" disabled={applyStatus.saving}>
                        {applyStatus.saving ? 'Yuborilmoqda...' : 'Yuborish'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}
          </article>
        </div>
      )}
    </section>
  );
}

export default VacanciesPage;
