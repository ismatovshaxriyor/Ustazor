import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Kelishiladi';
  }
  return `${amount.toLocaleString('uz-UZ')} so'm`;
}

function formatKonikmaPrice(konikma) {
  const min = Number(konikma.min_price || 0);
  const max = Number(konikma.max_price || 0);

  if (min > 0 && max > 0) {
    return `${min.toLocaleString('uz-UZ')} - ${max.toLocaleString('uz-UZ')} so'm`;
  }
  if (min > 0) {
    return `${min.toLocaleString('uz-UZ')} so'm dan boshlab`;
  }
  return 'Kelishiladi';
}

const konikmaInitialForm = {
  title: '',
  description: '',
  minPrice: '',
  maxPrice: '',
  experienceYears: 0,
  extraInfo: '',
  isActive: true,
};

function WorkerProfilePage() {
  const {
    isAuthenticated,
    user,
    fetchMe,
    fetchWorkerProfile,
    fetchWorkerSkills,
    createWorkerSkill,
    updateWorkerSkill,
    deleteWorkerSkill,
  } = useAuth();
  const [account, setAccount] = useState(null);
  const [workerProfile, setWorkerProfile] = useState(null);
  const [konikmalar, setKonikmalar] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [isKonikmaModalOpen, setIsKonikmaModalOpen] = useState(false);
  const [konikmaForm, setKonikmaForm] = useState(konikmaInitialForm);
  const [konikmaStatus, setKonikmaStatus] = useState({ saving: false, error: '', success: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;

    Promise.all([fetchMe(), fetchWorkerProfile(), fetchWorkerSkills()])
      .then(([me, worker, skillsData]) => {
        if (!active) {
          return;
        }
        setAccount(me);
        setWorkerProfile(worker);
        setKonikmalar(Array.isArray(skillsData) ? skillsData : (skillsData.results || []));
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
  }, [isAuthenticated, fetchMe, fetchWorkerProfile, fetchWorkerSkills]);

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
      setKonikmaStatus({ saving: false, error: '', success: 'Xizmat qo`shildi.' });
      setKonikmaForm(konikmaInitialForm);
      setIsKonikmaModalOpen(false);
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
      setKonikmaStatus({ saving: false, error: '', success: "Xizmat holati yangilandi." });
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

    try {
      await deleteWorkerSkill(konikmaId);
      setKonikmalar((prev) => prev.filter((item) => item.id !== konikmaId));
      setKonikmaStatus({ saving: false, error: '', success: "Xizmat o`chirildi." });
    } catch (error) {
      setKonikmaStatus({
        saving: false,
        error: error.message || 'Xizmatni o`chirishda xatolik yuz berdi.',
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

  return (
    <section className="profile-shell reveal-up">
      <article className="profile-view-card card">
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
          <article className="worker-meta-card">
            <p className="worker-meta-label">Minimal buyurtma narxi</p>
            <p className="worker-meta-value">{formatMoney(workerProfile?.min_order_price)}</p>
          </article>
        </div>

        <article className="worker-about-card">
          <p className="worker-meta-label">O`zim haqimda</p>
          <p>{workerProfile?.about || 'Hozircha ma`lumot qo`shilmagan.'}</p>
        </article>

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

        {status.error && <p className="form-message error">{status.error}</p>}
      </article>

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
    </section>
  );
}

export default WorkerProfilePage;
