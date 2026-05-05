import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';
import { formatDate, formatSkillPrice as formatKonikmaPrice } from '../utils/format';

const konikmaInitialForm = {
  title: '',
  description: '',
  minPrice: '',
  maxPrice: '',
  experienceYears: 0,
  extraInfo: '',
  isActive: true,
};

const portfolioInitialForm = {
  title: '',
  description: '',
  location: '',
  completedAt: '',
  isFeatured: false,
  images: [],
};

function WorkerProfilePage() {
  const {
    isAuthenticated,
    user,
    fetchMe,
    fetchWorkerProfile,
    fetchWorkerSkills,
    fetchWorkerDashboard,
    createWorkerSkill,
    updateWorkerSkill,
    deleteWorkerSkill,
    fetchWorkerReviews,
    fetchMyPortfolio,
    createPortfolio,
    deletePortfolio,
  } = useAuth();
  const [account, setAccount] = useState(null);
  const [workerProfile, setWorkerProfile] = useState(null);
  const [workerStats, setWorkerStats] = useState(null);
  const [konikmalar, setKonikmalar] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [isKonikmaModalOpen, setIsKonikmaModalOpen] = useState(false);
  const [konikmaForm, setKonikmaForm] = useState(konikmaInitialForm);
  const [konikmaStatus, setKonikmaStatus] = useState({ saving: false, error: '', success: '' });
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [workerReviews, setWorkerReviews] = useState([]);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState(portfolioInitialForm);
  const [portfolioStatus, setPortfolioStatus] = useState({ saving: false, error: '', success: '' });
  const [activeSection, setActiveSection] = useState('overview');

  const refreshWorkerStats = useCallback(async () => {
    try {
      const latestStats = await fetchWorkerDashboard();
      setWorkerStats(latestStats);
    } catch {
      // Statistikani fon rejimida yangilashda xato bo`lsa, sahifani to`xtatmaymiz.
    }
  }, [fetchWorkerDashboard]);

  const clearKonikmaFeedback = useCallback(() => {
    setKonikmaStatus((prev) => ({ ...prev, error: '', success: '' }));
  }, []);

  const clearPortfolioFeedback = useCallback(() => {
    setPortfolioStatus((prev) => ({ ...prev, error: '', success: '' }));
  }, []);

  const onSectionChange = (section) => {
    setActiveSection(section);
    clearKonikmaFeedback();
    clearPortfolioFeedback();
    if (section === 'stats') {
      refreshWorkerStats();
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;

    Promise.all([fetchMe(), fetchWorkerProfile(), fetchWorkerSkills(), fetchMyPortfolio(), fetchWorkerDashboard()])
      .then(async ([me, worker, skillsData, portfolioData, dashboardData]) => {
        if (!active) {
          return;
        }
        const reviewsData = await fetchWorkerReviews(me.id).catch(() => []);
        if (!active) {
          return;
        }
        setAccount(me);
        setWorkerProfile(worker);
        setWorkerStats(dashboardData);
        setKonikmalar(Array.isArray(skillsData) ? skillsData : (skillsData.results || []));
        setPortfolioItems(Array.isArray(portfolioData) ? portfolioData : (portfolioData.results || []));
        setWorkerReviews(Array.isArray(reviewsData) ? reviewsData : (reviewsData.results || []));
        setStatus({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setStatus({
          loading: false,
          error: error.message || 'Usta profilini yuklab bo`lmadi.',
        });
      });

    return () => {
      active = false;
    };
  }, [
    isAuthenticated,
    fetchMe,
    fetchWorkerProfile,
    fetchWorkerSkills,
    fetchMyPortfolio,
    fetchWorkerDashboard,
    fetchWorkerReviews,
  ]);

  useEffect(() => {
    if (!konikmaStatus.error && !konikmaStatus.success) {
      return undefined;
    }
    const timerId = window.setTimeout(() => {
      clearKonikmaFeedback();
    }, 3500);
    return () => window.clearTimeout(timerId);
  }, [konikmaStatus.error, konikmaStatus.success, clearKonikmaFeedback]);

  useEffect(() => {
    if (!portfolioStatus.error && !portfolioStatus.success) {
      return undefined;
    }
    const timerId = window.setTimeout(() => {
      clearPortfolioFeedback();
    }, 3500);
    return () => window.clearTimeout(timerId);
  }, [portfolioStatus.error, portfolioStatus.success, clearPortfolioFeedback]);

  const updateKonikmaField = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setKonikmaForm((prev) => ({ ...prev, [field]: value }));
  };

  const openKonikmaModal = () => {
    setKonikmaForm(konikmaInitialForm);
    setKonikmaStatus({ saving: false, error: '', success: '' });
    setIsKonikmaModalOpen(true);
  };

  const closeKonikmaModal = () => {
    setIsKonikmaModalOpen(false);
  };

  const onCreateKonikma = async (event) => {
    event.preventDefault();
    setKonikmaStatus({ saving: true, error: '', success: '' });

    const minPrice = konikmaForm.minPrice === '' ? null : Number(konikmaForm.minPrice);
    const maxPrice = konikmaForm.maxPrice === '' ? null : Number(konikmaForm.maxPrice);

    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      setKonikmaStatus({
        saving: false,
        error: 'Maksimal narx minimal narxdan kichik bo`lishi mumkin emas.',
        success: '',
      });
      return;
    }

    try {
      const created = await createWorkerSkill({
        title: konikmaForm.title,
        description: konikmaForm.description,
        min_price: minPrice,
        max_price: maxPrice,
        experience_years: Number(konikmaForm.experienceYears || 0),
        extra_info: konikmaForm.extraInfo,
        is_active: Boolean(konikmaForm.isActive),
      });
      setKonikmalar((prev) => [created, ...prev]);
      setWorkerStats((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          skills_count: (prev.skills_count || 0) + 1,
          active_skills_count: (prev.active_skills_count || 0) + (created.is_active ? 1 : 0),
        };
      });
      setKonikmaStatus({ saving: false, error: '', success: 'Xizmat qo`shildi.' });
      setKonikmaForm(konikmaInitialForm);
      setIsKonikmaModalOpen(false);
      refreshWorkerStats();
    } catch (error) {
      setKonikmaStatus({
        saving: false,
        error: error.message || 'Xizmat qo`shishda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  const onToggleKonikma = async (konikma) => {
    try {
      const updated = await updateWorkerSkill(konikma.id, { is_active: !konikma.is_active });
      setKonikmalar((prev) => prev.map((item) => (item.id === konikma.id ? updated : item)));
      setWorkerStats((prev) => {
        if (!prev) {
          return prev;
        }
        const becameActive = !konikma.is_active && updated.is_active;
        const becameInactive = konikma.is_active && !updated.is_active;
        return {
          ...prev,
          active_skills_count: Math.max(
            0,
            (prev.active_skills_count || 0) + (becameActive ? 1 : 0) - (becameInactive ? 1 : 0),
          ),
        };
      });
      setKonikmaStatus({ saving: false, error: '', success: "Xizmat holati yangilandi." });
      refreshWorkerStats();
    } catch (error) {
      setKonikmaStatus({
        saving: false,
        error: error.message || 'Xizmat holatini yangilashda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  const onDeleteKonikma = async (konikmaId) => {
    const confirmed = window.confirm("Xizmat o`chirilsa, qayta tiklanmaydi. Davom etasizmi?");
    if (!confirmed) {
      return;
    }

    const removedKonikma = konikmalar.find((item) => item.id === konikmaId) || null;

    try {
      await deleteWorkerSkill(konikmaId);
      setKonikmalar((prev) => prev.filter((item) => item.id !== konikmaId));
      setWorkerStats((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          skills_count: Math.max(0, (prev.skills_count || 0) - 1),
          active_skills_count: Math.max(
            0,
            (prev.active_skills_count || 0) - (removedKonikma?.is_active ? 1 : 0),
          ),
        };
      });
      setKonikmaStatus({ saving: false, error: '', success: "Xizmat o`chirildi." });
      refreshWorkerStats();
    } catch (error) {
      setKonikmaStatus({
        saving: false,
        error: error.message || 'Xizmatni o`chirishda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  const updatePortfolioField = (field) => (event) => {
    if (field === 'images') {
      const files = Array.from(event.target.files || []);
      setPortfolioForm((prev) => ({ ...prev, images: files }));
      return;
    }
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setPortfolioForm((prev) => ({ ...prev, [field]: value }));
  };

  const openPortfolioModal = () => {
    setPortfolioForm(portfolioInitialForm);
    setPortfolioStatus({ saving: false, error: '', success: '' });
    setIsPortfolioModalOpen(true);
  };

  const closePortfolioModal = () => {
    setIsPortfolioModalOpen(false);
  };

  const onCreatePortfolio = async (event) => {
    event.preventDefault();
    setPortfolioStatus({ saving: true, error: '', success: '' });

    try {
      const formData = new FormData();
      formData.append('title', portfolioForm.title);
      formData.append('description', portfolioForm.description);
      formData.append('location', portfolioForm.location);
      formData.append('is_featured', String(Boolean(portfolioForm.isFeatured)));
      if (portfolioForm.completedAt) {
        formData.append('completed_at', portfolioForm.completedAt);
      }
      portfolioForm.images.forEach((image) => {
        formData.append('images', image);
      });

      const created = await createPortfolio(formData);
      setPortfolioItems((prev) => [created, ...prev]);
      setPortfolioStatus({ saving: false, error: '', success: "Ish namunasi qo`shildi." });
      setPortfolioForm(portfolioInitialForm);
      setIsPortfolioModalOpen(false);
    } catch (error) {
      setPortfolioStatus({
        saving: false,
        error: error.message || 'Ish namunasi qo`shishda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  const onDeletePortfolio = async (portfolioId) => {
    const confirmed = window.confirm("Ish namunasi o`chirilsa, qayta tiklanmaydi. Davom etasizmi?");
    if (!confirmed) {
      return;
    }

    try {
      await deletePortfolio(portfolioId);
      setPortfolioItems((prev) => prev.filter((item) => item.id !== portfolioId));
      setPortfolioStatus({ saving: false, error: '', success: "Ish namunasi o`chirildi." });
    } catch (error) {
      setPortfolioStatus({
        saving: false,
        error: error.message || 'Ish namunasini o`chirishda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user?.user_type && user.user_type !== 'worker') {
    return <Navigate to="/profile" replace />;
  }

  if (status.loading) {
    return (
      <section className="profile-shell reveal-up">
        <article className="profile-view-card card">
          <p className="muted">Profil yuklanmoqda...</p>
        </article>
      </section>
    );
  }

  const activeSkillsCount = konikmalar.filter((item) => item.is_active).length;

  return (
    <section className="profile-shell reveal-up">
      <div className="worker-profile-layout">
        <aside className="profile-sidebar card">
          <p className="worker-meta-label">Bo`limlar</p>
          <div className="profile-nav-list">
            <button
              type="button"
              className={`profile-nav-btn${activeSection === 'overview' ? ' active' : ''}`}
              onClick={() => onSectionChange('overview')}
            >
              Asosiy ma`lumot
            </button>
            <button
              type="button"
              className={`profile-nav-btn${activeSection === 'stats' ? ' active' : ''}`}
              onClick={() => onSectionChange('stats')}
            >
              <span>Statistika</span>
              <span className="profile-nav-count">{workerStats?.profile_views_count || 0}</span>
            </button>
            <button
              type="button"
              className={`profile-nav-btn${activeSection === 'skills' ? ' active' : ''}`}
              onClick={() => onSectionChange('skills')}
            >
              <span>Xizmatlar</span>
              <span className="profile-nav-count">{konikmalar.length}</span>
            </button>
            <button
              type="button"
              className={`profile-nav-btn${activeSection === 'portfolio' ? ' active' : ''}`}
              onClick={() => onSectionChange('portfolio')}
            >
              <span>Ish namunalari</span>
              <span className="profile-nav-count">{portfolioItems.length}</span>
            </button>
            <button
              type="button"
              className={`profile-nav-btn${activeSection === 'reviews' ? ' active' : ''}`}
              onClick={() => onSectionChange('reviews')}
            >
              <span>Reviewlar</span>
              <span className="profile-nav-count">{workerReviews.length}</span>
            </button>
          </div>
        </aside>

        <article className="worker-profile-content card">
          {activeSection === 'overview' && (
            <>
              <div className="profile-view-top">
                <div className="profile-avatar-wrap">
                  <img
                    src={resolveMediaUrl(account?.profile_photo_url, { userType: 'worker' })}
                    alt="Profil rasmi"
                    className="profile-avatar"
                  />
                </div>
                <div className="profile-view-meta">
                  <h2>{account?.full_name || 'Usta'}</h2>
                  <p className="muted">{account?.email}</p>
                  <p className="muted">{account?.phone_number}</p>
                  {account?.secondary_phone_number ? (
                    <p className="muted">{`Qo'shimcha: ${account.secondary_phone_number}`}</p>
                  ) : null}
                  {account?.telegram_username ? (
                    <p className="muted">@{account.telegram_username}</p>
                  ) : null}
                  {account?.instagram_username ? (
                    <p className="muted">{`Instagram: @${account.instagram_username}`}</p>
                  ) : null}
                </div>
                <Link to="/profile/edit" className="button button-primary">
                  Profilni tahrirlash
                </Link>
              </div>

              <div className="profile-badges">
                <span className={`profile-badge${account?.is_verified ? ' badge-ok' : ''}`}>
                  {account?.is_verified ? 'Email tasdiqlangan' : 'Email tasdiqlanmagan'}
                </span>
                <span className={`profile-badge${workerProfile?.is_available ? ' badge-ok' : ''}`}>
                  {workerProfile?.is_available ? 'Hozir buyurtma oladi' : 'Hozir band'}
                </span>
                <span className="profile-badge">
                  Tajriba: {workerProfile?.experience_years || 0} yil
                </span>
              </div>

              <div className="worker-meta-grid">
                <article className="worker-meta-card">
                  <p className="worker-meta-label">Mutaxassislik</p>
                  <p className="worker-meta-value">{workerProfile?.specialization || 'Kiritilmagan'}</p>
                </article>
                <article className="worker-meta-card">
                  <p className="worker-meta-label">Xizmat hududi</p>
                  <p className="worker-meta-value">{workerProfile?.service_city || 'Kiritilmagan'}</p>
                </article>
              </div>

              <article className="worker-about-card">
                <p className="worker-meta-label">O`zim haqimda</p>
                <p>{workerProfile?.about || 'Hozircha ma`lumot qo`shilmagan.'}</p>
              </article>
            </>
          )}

          {activeSection === 'skills' && (
            <div className="worker-skills-section">
              <div className="section-row-head">
                <h3>Xizmatlar</h3>
                <button type="button" className="button button-ghost" onClick={openKonikmaModal}>
                  Xizmat qo`shish
                </button>
              </div>
              {!isKonikmaModalOpen && konikmaStatus.error && (
                <p className="form-message error">{konikmaStatus.error}</p>
              )}
              {!isKonikmaModalOpen && konikmaStatus.success && (
                <p className="form-message success">{konikmaStatus.success}</p>
              )}

              {konikmalar.length === 0 ? (
                <p className="muted">Hozircha xizmat qo`shilmagan.</p>
              ) : (
                <div className="worker-skill-grid">
                  {konikmalar.map((konikma) => (
                    <article key={konikma.id} className="worker-skill-card">
                      <div className="worker-skill-head">
                        <h4>{konikma.title}</h4>
                        <span className={`status-pill ${konikma.is_active ? 'status-completed' : 'status-cancelled'}`}>
                          {konikma.is_active ? 'Faol' : 'Nofaol'}
                        </span>
                      </div>
                      <p>{konikma.description || 'Izoh kiritilmagan'}</p>
                      <p className="muted">Narx: {formatKonikmaPrice(konikma)}</p>
                      <p className="muted">Tajriba: {konikma.experience_years || 0} yil</p>
                      {konikma.extra_info && <p className="muted">Qo`shimcha: {konikma.extra_info}</p>}
                      <div className="skill-card-actions">
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => onToggleKonikma(konikma)}
                        >
                          {konikma.is_active ? 'Nofaol qilish' : 'Faol qilish'}
                        </button>
                        <button
                          type="button"
                          className="button button-ghost danger-button"
                          onClick={() => onDeleteKonikma(konikma.id)}
                        >
                          O`chirish
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'stats' && (
            <div className="worker-skills-section">
              <div className="section-row-head">
                <h3>Profil statistikasi</h3>
              </div>

              <div className="worker-meta-grid">
                <article className="worker-meta-card">
                  <p className="worker-meta-label">Profil ko`rilgan</p>
                  <p className="worker-meta-value">{workerStats?.profile_views_count || 0} marta</p>
                </article>
                <article className="worker-meta-card">
                  <p className="worker-meta-label">Faol xizmatlar</p>
                  <p className="worker-meta-value">{activeSkillsCount} ta</p>
                </article>
                <article className="worker-meta-card">
                  <p className="worker-meta-label">Yakunlangan ishlar</p>
                  <p className="worker-meta-value">{workerStats?.completed_orders_count || 0} ta</p>
                </article>
              </div>

              <div>
                <p className="worker-meta-label">Profilni yaqinda ko`rganlar</p>
                {Array.isArray(workerStats?.recent_profile_viewers) && workerStats.recent_profile_viewers.length > 0 ? (
                  <div className="worker-skill-grid">
                    {workerStats.recent_profile_viewers.map((viewer) => (
                      <article key={`${viewer.viewer_id}-${viewer.viewed_at}`} className="worker-skill-card">
                        <h4>{viewer.viewer_name || 'Foydalanuvchi'}</h4>
                        <p className="muted">{formatDate(viewer.viewed_at)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Hozircha profilingizni ko`rgan foydalanuvchilar yo`q.</p>
                )}
              </div>
            </div>
          )}

          {activeSection === 'portfolio' && (
            <div className="worker-skills-section">
              <div className="section-row-head">
                <h3>Ish namunalarim</h3>
                <button type="button" className="button button-ghost" onClick={openPortfolioModal}>
                  Ish qo`shish
                </button>
              </div>
              {!isPortfolioModalOpen && portfolioStatus.error && (
                <p className="form-message error">{portfolioStatus.error}</p>
              )}
              {!isPortfolioModalOpen && portfolioStatus.success && (
                <p className="form-message success">{portfolioStatus.success}</p>
              )}

              {portfolioItems.length === 0 ? (
                <p className="muted">Hozircha ish namunalari yo`q.</p>
              ) : (
                <div className="worker-skill-grid">
                  {portfolioItems.map((item) => (
                    <article key={item.id} className="worker-skill-card">
                      <div className="worker-skill-head">
                        <h4>{item.title}</h4>
                        {item.completed_at ? (
                          <span className="status-pill status-open">{formatDate(item.completed_at)}</span>
                        ) : null}
                      </div>
                      <p>{item.description || 'Tavsif kiritilmagan.'}</p>
                      {item.location ? <p className="muted">Hudud: {item.location}</p> : null}
                      {Array.isArray(item.images) && item.images.length > 0 ? (
                        <div className="portfolio-image-row">
                          {item.images.map((image) => (
                            <img
                              key={image.id}
                              src={resolveMediaUrl(image.image_url)}
                              alt={item.title}
                              className="portfolio-image-thumb"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      ) : null}
                      <div className="skill-card-actions">
                        <button
                          type="button"
                          className="button button-ghost danger-button"
                          onClick={() => onDeletePortfolio(item.id)}
                        >
                          O`chirish
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'reviews' && (
            <div className="worker-skills-section">
              <div className="section-row-head">
                <h3>Menga berilgan reviewlar</h3>
              </div>

              {workerReviews.length === 0 ? (
                <p className="muted">Hozircha reviewlar yo`q.</p>
              ) : (
                <div className="worker-skill-grid">
                  {workerReviews.map((review) => (
                    <article key={review.id} className="worker-skill-card">
                      <div className="worker-skill-head">
                        <h4>{review.client_name || 'Mijoz'}</h4>
                        <span className="status-pill status-open">{`${review.rating}/5`}</span>
                      </div>
                      <p className="muted">{formatDate(review.created_at)}</p>
                      <p>{review.comment || 'Izoh qoldirilmagan.'}</p>
                      {Array.isArray(review.images) && review.images.length > 0 ? (
                        <div className="portfolio-image-row">
                          {review.images.map((image) => (
                            <img
                              key={image.id}
                              src={resolveMediaUrl(image.image_url)}
                              alt="Review rasmi"
                              className="portfolio-image-thumb"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {status.error && <p className="form-message error">{status.error}</p>}
        </article>
      </div>

      {isKonikmaModalOpen && (
        <div className="modal-backdrop" onClick={closeKonikmaModal} role="presentation">
          <article className="modal-card card" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>Yangi xizmat qo`shish</h3>
              <button type="button" className="button button-ghost" onClick={closeKonikmaModal}>
                Yopish
              </button>
            </div>
            {isKonikmaModalOpen && konikmaStatus.error && (
              <p className="form-message error">{konikmaStatus.error}</p>
            )}

            <form className="stack-small" onSubmit={onCreateKonikma}>
              <div className="profile-grid">
                <div>
                  <label className="label" htmlFor="konikma-title">
                    Xizmat nomi
                  </label>
                  <input
                    id="konikma-title"
                    className="input"
                    value={konikmaForm.title}
                    onChange={updateKonikmaField('title')}
                    placeholder="Masalan: Elektr montaj"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="konikma-experience">
                    Tajriba (yil)
                  </label>
                  <input
                    id="konikma-experience"
                    className="input"
                    type="number"
                    min="0"
                    value={konikmaForm.experienceYears}
                    onChange={updateKonikmaField('experienceYears')}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="konikma-description">
                  Izoh
                </label>
                <textarea
                  id="konikma-description"
                  className="input"
                  rows={3}
                  value={konikmaForm.description}
                  onChange={updateKonikmaField('description')}
                  placeholder="Bu xizmat bo`yicha qanday ishlarni qilasiz?"
                />
              </div>

              <div className="profile-grid">
                <div>
                  <label className="label" htmlFor="konikma-min-price">
                    Minimal narx (so`m)
                  </label>
                  <input
                    id="konikma-min-price"
                    className="input"
                    type="number"
                    min="0"
                    value={konikmaForm.minPrice}
                    onChange={updateKonikmaField('minPrice')}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="konikma-max-price">
                    Maksimal narx (so`m)
                  </label>
                  <input
                    id="konikma-max-price"
                    className="input"
                    type="number"
                    min="0"
                    value={konikmaForm.maxPrice}
                    onChange={updateKonikmaField('maxPrice')}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="konikma-extra">
                  Qo`shimcha ma`lumot
                </label>
                <textarea
                  id="konikma-extra"
                  className="input"
                  rows={2}
                  value={konikmaForm.extraInfo}
                  onChange={updateKonikmaField('extraInfo')}
                  placeholder="Masalan: Material alohida, kafolat bor..."
                />
              </div>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={konikmaForm.isActive}
                  onChange={updateKonikmaField('isActive')}
                />
                Xizmat faol holatda bo`lsin
              </label>

              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={closeKonikmaModal}>
                  Bekor qilish
                </button>
                <button className="button button-primary" type="submit" disabled={konikmaStatus.saving}>
                  {konikmaStatus.saving ? 'Saqlanmoqda...' : 'Xizmat qo`shish'}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}

      {isPortfolioModalOpen && (
        <div className="modal-backdrop" onClick={closePortfolioModal} role="presentation">
          <article className="modal-card card" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>Yangi ish namunasi</h3>
              <button type="button" className="button button-ghost" onClick={closePortfolioModal}>
                Yopish
              </button>
            </div>
            {isPortfolioModalOpen && portfolioStatus.error && (
              <p className="form-message error">{portfolioStatus.error}</p>
            )}

            <form className="stack-small" onSubmit={onCreatePortfolio}>
              <div>
                <label className="label" htmlFor="portfolio-title">
                  Ish nomi
                </label>
                <input
                  id="portfolio-title"
                  className="input"
                  value={portfolioForm.title}
                  onChange={updatePortfolioField('title')}
                  placeholder="Masalan: Ofis to`liq ta`miri"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="portfolio-description">
                  Tavsif
                </label>
                <textarea
                  id="portfolio-description"
                  className="input"
                  rows={3}
                  value={portfolioForm.description}
                  onChange={updatePortfolioField('description')}
                />
              </div>

              <div className="profile-grid">
                <div>
                  <label className="label" htmlFor="portfolio-location">
                    Hudud
                  </label>
                  <input
                    id="portfolio-location"
                    className="input"
                    value={portfolioForm.location}
                    onChange={updatePortfolioField('location')}
                    placeholder="Masalan: Toshkent"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="portfolio-completed-at">
                    Tugagan sana
                  </label>
                  <input
                    id="portfolio-completed-at"
                    className="input"
                    type="date"
                    value={portfolioForm.completedAt}
                    onChange={updatePortfolioField('completedAt')}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="portfolio-images">
                  Rasmlar
                </label>
                <input
                  id="portfolio-images"
                  className="input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={updatePortfolioField('images')}
                />
              </div>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={portfolioForm.isFeatured}
                  onChange={updatePortfolioField('isFeatured')}
                />
                Muhim ish sifatida ko`rsatilsin
              </label>

              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={closePortfolioModal}>
                  Bekor qilish
                </button>
                <button className="button button-primary" type="submit" disabled={portfolioStatus.saving}>
                  {portfolioStatus.saving ? 'Saqlanmoqda...' : 'Ishni qo`shish'}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
    </section>
  );
}

export default WorkerProfilePage;
