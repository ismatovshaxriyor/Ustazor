import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';
import {
  formatBudget as formatPrice,
  STATUS_LABELS as statusLabels,
  PROPOSAL_STATUS_LABELS as proposalStatusLabels,
} from '../utils/format';

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

const reviewInitialForm = {
  rating: '5',
  comment: '',
  images: [],
};

function ClientProfilePage() {
  const {
    isAuthenticated,
    fetchMe,
    tokens,
    user,
    closeOrder,
    createOrderReview,
  } = useAuth();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [receivedProposals, setReceivedProposals] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [ordersStatus, setOrdersStatus] = useState({ loading: true, error: '' });
  const [proposalsStatus, setProposalsStatus] = useState({ loading: true, error: '' });
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
  const [vacancyForm, setVacancyForm] = useState(vacancyInitialForm);
  const [vacancyStatus, setVacancyStatus] = useState({ saving: false, error: '', success: '' });
  const [reviewForm, setReviewForm] = useState(reviewInitialForm);
  const [reviewStatus, setReviewStatus] = useState({ saving: false, error: '', success: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;
    const profilePromise = user ? Promise.resolve(user) : fetchMe();
    const ordersPromise = tokens.access ? authApi.listOrders(tokens.access) : Promise.resolve([]);
    const proposalsPromise = tokens.access ? authApi.listReceivedProposals(tokens.access) : Promise.resolve([]);

    Promise.all([profilePromise, ordersPromise, proposalsPromise])
      .then(([me, ordersData, proposalsData]) => {
        if (!active) {
          return;
        }
        const normalizedOrders = Array.isArray(ordersData) ? ordersData : (ordersData.results || []);
        const normalizedProposals = Array.isArray(proposalsData) ? proposalsData : (proposalsData.results || []);
        setProfile(me);
        setOrders(normalizedOrders);
        setReceivedProposals(normalizedProposals);
        setStatus({ loading: false, error: '' });
        setOrdersStatus({ loading: false, error: '' });
        setProposalsStatus({ loading: false, error: '' });
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
        setProposalsStatus({
          loading: false,
          error: error.message || 'Murojaatlarni yuklab bo`lmadi.',
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

  const openProposalModal = (order) => {
    setSelectedOrder(order);
    setIsProposalModalOpen(true);
  };

  const closeProposalModal = () => {
    setIsProposalModalOpen(false);
    setSelectedOrder(null);
  };

  const openReviewModal = (order) => {
    setSelectedReviewOrder(order);
    setReviewForm(reviewInitialForm);
    setReviewStatus({ saving: false, error: '', success: '' });
    setIsReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setSelectedReviewOrder(null);
  };

  const proposalsForSelectedOrder = selectedOrder
    ? receivedProposals.filter((proposal) => proposal.vacancy_id === selectedOrder.id)
    : [];

  const proposalCountByOrder = receivedProposals.reduce((acc, proposal) => {
    if (!acc[proposal.vacancy_id]) {
      acc[proposal.vacancy_id] = 0;
    }
    acc[proposal.vacancy_id] += 1;
    return acc;
  }, {});

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

  const onReviewFieldChange = (field) => (event) => {
    if (field === 'images') {
      const files = Array.from(event.target.files || []);
      setReviewForm((prev) => ({ ...prev, images: files }));
      return;
    }
    setReviewForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onCloseOrder = async (orderId) => {
    try {
      const updated = await closeOrder(orderId);
      setOrders((prev) => prev.map((item) => (item.id === orderId ? updated : item)));
      setVacancyStatus({
        saving: false,
        error: '',
        success: "E`lon yakunlangan holatga o`tkazildi.",
      });
    } catch (error) {
      setVacancyStatus({
        saving: false,
        error: error.message || "E`lonni yopishda xatolik yuz berdi.",
        success: '',
      });
    }
  };

  const onSubmitReview = async (event) => {
    event.preventDefault();
    if (!selectedReviewOrder) {
      return;
    }

    setReviewStatus({ saving: true, error: '', success: '' });

    try {
      const formData = new FormData();
      formData.append('rating', reviewForm.rating);
      formData.append('comment', reviewForm.comment);
      reviewForm.images.forEach((image) => {
        formData.append('images', image);
      });

      const created = await createOrderReview(selectedReviewOrder.id, formData);
      setOrders((prev) => prev.map((item) => (
        item.id === selectedReviewOrder.id
          ? { ...item, review_id: created.id }
          : item
      )));
      setReviewStatus({ saving: false, error: '', success: "Baho muvaffaqiyatli saqlandi." });
      setVacancyStatus({
        saving: false,
        error: '',
        success: "Ustaga baho muvaffaqiyatli qo`shildi.",
      });
      setIsReviewModalOpen(false);
    } catch (error) {
      setReviewStatus({
        saving: false,
        error: error.message || "Bahoni saqlashda xatolik yuz berdi.",
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
                <div className="snippet-meta">
                  <p className="muted">
                    Murojaatlar: {proposalCountByOrder[order.id] || 0}
                  </p>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => openProposalModal(order)}
                    >
                      Murojaatlarni ko`rish
                    </button>
                    {order.status === 'in_progress' && order.assigned_worker ? (
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => onCloseOrder(order.id)}
                      >
                        E`lonni yopish
                      </button>
                    ) : null}
                    {order.status === 'completed' && order.assigned_worker && !order.review_id ? (
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => openReviewModal(order)}
                      >
                        Ustani baholash
                      </button>
                    ) : null}
                    {order.review_id ? <span className="muted">Baholangan</span> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {ordersStatus.error && <p className="form-message error">{ordersStatus.error}</p>}
        {proposalsStatus.error && <p className="form-message error">{proposalsStatus.error}</p>}
      </article>

      {isProposalModalOpen && (
        <div className="modal-backdrop" onClick={closeProposalModal} role="presentation">
          <article className="modal-card card" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>{selectedOrder ? `${selectedOrder.title} uchun murojaatlar` : 'Murojaatlar'}</h3>
              <button type="button" className="button button-ghost" onClick={closeProposalModal}>
                Yopish
              </button>
            </div>
            <p className="muted">Ustani qabul qilish chat ichidan amalga oshiriladi.</p>

            {proposalsForSelectedOrder.length === 0 ? (
              <p className="muted">Bu e`lon uchun hozircha murojaat yo`q.</p>
            ) : (
              <div className="stack-small">
                {proposalsForSelectedOrder.map((proposal) => (
                  <article key={proposal.id} className="order-item">
                    <div className="order-item-head">
                      <h4>{proposal.worker_name || 'Usta'}</h4>
                      <span className={`status-pill status-${proposal.status}`}>
                        {proposalStatusLabels[proposal.status] || proposal.status}
                      </span>
                    </div>
                    <p className="muted">{proposal.worker_phone || 'Telefon ko`rsatilmagan'}</p>
                    <p>{proposal.cover_letter || 'Murojaat xati kiritilmagan.'}</p>
                    <p className="price">
                      Taklif narxi: {proposal.proposed_price ? `${Number(proposal.proposed_price).toLocaleString('uz-UZ')} so'm` : 'Kelishiladi'}
                    </p>

                    {proposal.chat_thread_id ? (
                      <div className="modal-actions">
                        <Link to={`/chat/${proposal.chat_thread_id}`} className="button button-primary">
                          Chatni ochish
                        </Link>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>
      )}

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

      {isReviewModalOpen && (
        <div className="modal-backdrop" onClick={closeReviewModal} role="presentation">
          <article className="modal-card card" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>
                {selectedReviewOrder?.assigned_worker_name
                  ? `${selectedReviewOrder.assigned_worker_name} uchun baho`
                  : 'Ustani baholash'}
              </h3>
              <button type="button" className="button button-ghost" onClick={closeReviewModal}>
                Yopish
              </button>
            </div>
            {reviewStatus.error && <p className="form-message error">{reviewStatus.error}</p>}

            <form className="stack-small" onSubmit={onSubmitReview}>
              <div>
                <label className="label" htmlFor="review-rating">
                  Reyting (1-5)
                </label>
                <select
                  id="review-rating"
                  className="input"
                  value={reviewForm.rating}
                  onChange={onReviewFieldChange('rating')}
                >
                  <option value="5">5 - A`lo</option>
                  <option value="4">4 - Yaxshi</option>
                  <option value="3">3 - Qoniqarli</option>
                  <option value="2">2 - Past</option>
                  <option value="1">1 - Yomon</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="review-comment">
                  Izoh
                </label>
                <textarea
                  id="review-comment"
                  className="input"
                  rows={4}
                  value={reviewForm.comment}
                  onChange={onReviewFieldChange('comment')}
                  placeholder="Ish sifati, vaqt, muloqot haqida yozing."
                />
              </div>
              <div>
                <label className="label" htmlFor="review-images">
                  Rasmlar (ixtiyoriy)
                </label>
                <input
                  id="review-images"
                  type="file"
                  className="input"
                  multiple
                  accept="image/*"
                  onChange={onReviewFieldChange('images')}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={closeReviewModal}>
                  Bekor qilish
                </button>
                <button className="button button-primary" type="submit" disabled={reviewStatus.saving}>
                  {reviewStatus.saving ? 'Saqlanmoqda...' : 'Bahoni yuborish'}
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
