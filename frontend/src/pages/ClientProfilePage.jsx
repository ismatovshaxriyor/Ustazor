import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';

const vacancyInitialForm = {
  title: '',
  description: '',
  category: '',
  city: '',
  address: '',
  dueDate: '',
  priceType: 'negotiable',
  priceAmount: '',
};

const statusLabels = {
  open: 'Yangi',
  in_progress: 'Jarayonda',
  completed: 'Yakunlangan',
  cancelled: 'Bekor qilingan',
};

function formatPrice(order) {
  if (order.price_type === 'negotiable') {
    return 'Kelishiladi';
  }
  const amount = Number(order.price_amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Aniq narx';
  }
  return `${amount.toLocaleString('uz-UZ')} so'm`;
}

function ClientProfilePage() {
  const { isAuthenticated, fetchMe, tokens, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [ordersStatus, setOrdersStatus] = useState({ loading: true, error: '' });
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);
  const [vacancyForm, setVacancyForm] = useState(vacancyInitialForm);
  const [vacancyStatus, setVacancyStatus] = useState({ saving: false, error: '', success: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;
    const profilePromise = user ? Promise.resolve(user) : fetchMe();
    const ordersPromise = tokens.access ? authApi.listOrders(tokens.access) : Promise.resolve([]);

    Promise.all([profilePromise, ordersPromise])
      .then(([me, ordersData]) => {
        if (!active) {
          return;
        }
        const normalizedOrders = Array.isArray(ordersData) ? ordersData : (ordersData.results || []);
        setProfile(me);
        setOrders(normalizedOrders);
        setStatus({ loading: false, error: '' });
        setOrdersStatus({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setStatus({
          loading: false,
          error: error.message || 'Profilni yuklab bo`lmadi.',
        });
        setOrdersStatus({
          loading: false,
          error: error.message || 'E`lonlarni yuklab bo`lmadi.',
        });
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, fetchMe, tokens.access, user]);

  const updateVacancyField = (field) => (event) => {
    setVacancyForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const openVacancyModal = () => {
    setVacancyStatus({ saving: false, error: '', success: '' });
    setIsVacancyModalOpen(true);
  };

  const closeVacancyModal = () => {
    setIsVacancyModalOpen(false);
  };

  const onCreateVacancy = async (event) => {
    event.preventDefault();
    setVacancyStatus({ saving: true, error: '', success: '' });

    if (vacancyForm.priceType === 'fixed' && !vacancyForm.priceAmount) {
      setVacancyStatus({
        saving: false,
        error: 'Aniq narx tanlanganda narx qiymatini kiriting.',
        success: '',
      });
      return;
    }

    try {
      const payload = {
        title: vacancyForm.title,
        description: vacancyForm.description,
        category: vacancyForm.category,
        city: vacancyForm.city,
        address: vacancyForm.address,
        price_type: vacancyForm.priceType,
      };
      if (vacancyForm.priceType === 'fixed') {
        payload.price_amount = vacancyForm.priceAmount;
      }
      if (vacancyForm.dueDate) {
        payload.due_date = vacancyForm.dueDate;
      }

      const created = await authApi.createOrder(payload, tokens.access);
      setOrders((prev) => [created, ...prev]);
      setVacancyForm(vacancyInitialForm);
      setIsVacancyModalOpen(false);
      setVacancyStatus({
        saving: false,
        error: '',
        success: 'Vakansiya muvaffaqiyatli yaratildi.',
      });
    } catch (error) {
      setVacancyStatus({
        saving: false,
        error: error.message || 'Vakansiya yaratishda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
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
    <section className="profile-shell stack-medium reveal-up">
      <article className="profile-view-card card">
        <div className="profile-view-top">
          <div className="profile-avatar-wrap">
            <img
              src={resolveMediaUrl(profile?.profile_photo_url, { userType: 'client' })}
              alt="Profil rasmi"
              className="profile-avatar"
            />
          </div>
          <div className="profile-view-meta">
            <h2>{profile?.full_name || 'Foydalanuvchi'}</h2>
            <p className="muted">{profile?.email}</p>
            <p className="muted">{profile?.phone_number}</p>
          </div>
          <div className="profile-top-actions">
            <Link to="/profile/edit" className="button button-primary">
              Profilni tahrirlash
            </Link>
            <button type="button" className="button button-ghost" onClick={openVacancyModal}>
              Vakansiya yaratish
            </button>
          </div>
        </div>

        <div className="profile-badges">
          <span className={`profile-badge${profile?.is_verified ? ' badge-ok' : ''}`}>
            {profile?.is_verified ? 'Email tasdiqlangan' : 'Email tasdiqlanmagan'}
          </span>
        </div>

        {!isVacancyModalOpen && vacancyStatus.error && <p className="form-message error">{vacancyStatus.error}</p>}
        {!isVacancyModalOpen && vacancyStatus.success && (
          <p className="form-message success">{vacancyStatus.success}</p>
        )}
        {status.error && <p className="form-message error">{status.error}</p>}
      </article>

      <article className="profile-view-card card">
        <div className="section-row-head">
          <h3>Mening e`lonlarim</h3>
          <Link to="/orders" className="button button-ghost">
            Barchasini boshqarish
          </Link>
        </div>

        {ordersStatus.loading ? (
          <p className="muted">E`lonlar yuklanmoqda...</p>
        ) : orders.length === 0 ? (
          <p className="muted">Hozircha e`lon joylamagansiz.</p>
        ) : (
          <div className="order-list stack-small">
            {orders.slice(0, 6).map((order) => (
              <article key={order.id} className="order-item">
                <div className="order-item-head">
                  <h4>{order.title}</h4>
                  <span className={`status-pill status-${order.status}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
                <p>{order.description}</p>
                <p className="muted">
                  {order.category || 'Yo`nalish berilmagan'} · {order.city || 'Shahar berilmagan'}
                </p>
                <p className="price">{formatPrice(order)}</p>
              </article>
            ))}
          </div>
        )}

        {ordersStatus.error && <p className="form-message error">{ordersStatus.error}</p>}
      </article>

      {isVacancyModalOpen && (
        <div className="modal-backdrop" onClick={closeVacancyModal} role="presentation">
          <article className="modal-card card" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>Yangi vakansiya yaratish</h3>
              <button type="button" className="button button-ghost" onClick={closeVacancyModal}>
                Yopish
              </button>
            </div>

            {isVacancyModalOpen && vacancyStatus.error && <p className="form-message error">{vacancyStatus.error}</p>}

            <form className="stack-small" onSubmit={onCreateVacancy}>
              <div>
                <label className="label" htmlFor="vacancy-title">
                  Sarlavha
                </label>
                <input
                  id="vacancy-title"
                  className="input"
                  value={vacancyForm.title}
                  onChange={updateVacancyField('title')}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="vacancy-description">
                  Tavsif
                </label>
                <textarea
                  id="vacancy-description"
                  className="input"
                  rows={4}
                  value={vacancyForm.description}
                  onChange={updateVacancyField('description')}
                  required
                />
              </div>

              <div className="profile-grid">
                <div>
                  <label className="label" htmlFor="vacancy-category">
                    Yo`nalish
                  </label>
                  <input
                    id="vacancy-category"
                    className="input"
                    value={vacancyForm.category}
                    onChange={updateVacancyField('category')}
                    placeholder="Masalan: Elektrik"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="vacancy-city">
                    Shahar
                  </label>
                  <input
                    id="vacancy-city"
                    className="input"
                    value={vacancyForm.city}
                    onChange={updateVacancyField('city')}
                    placeholder="Masalan: Toshkent"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="vacancy-address">
                  Manzil
                </label>
                <input
                  id="vacancy-address"
                  className="input"
                  value={vacancyForm.address}
                  onChange={updateVacancyField('address')}
                  placeholder="Ixtiyoriy"
                />
              </div>

              <div className="profile-grid">
                <div>
                  <label className="label" htmlFor="vacancy-price-type">
                    Narx turi
                  </label>
                  <select
                    id="vacancy-price-type"
                    className="input"
                    value={vacancyForm.priceType}
                    onChange={updateVacancyField('priceType')}
                  >
                    <option value="negotiable">Kelishish asosida</option>
                    <option value="fixed">Aniq narx</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="vacancy-due-date">
                    Muddat
                  </label>
                  <input
                    id="vacancy-due-date"
                    type="date"
                    className="input"
                    value={vacancyForm.dueDate}
                    onChange={updateVacancyField('dueDate')}
                  />
                </div>
              </div>

              {vacancyForm.priceType === 'fixed' && (
                <div>
                  <label className="label" htmlFor="vacancy-price-amount">
                    Narx (so`m)
                  </label>
                  <input
                    id="vacancy-price-amount"
                    type="number"
                    className="input"
                    min="1"
                    value={vacancyForm.priceAmount}
                    onChange={updateVacancyField('priceAmount')}
                    required
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={closeVacancyModal}>
                  Bekor qilish
                </button>
                <button className="button button-primary" type="submit" disabled={vacancyStatus.saving}>
                  {vacancyStatus.saving ? 'Yaratilmoqda...' : 'Vakansiya yaratish'}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
    </section>
  );
}

export default ClientProfilePage;
