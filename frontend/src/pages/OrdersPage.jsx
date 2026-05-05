import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Pencil, Plus, Save, X } from 'lucide-react';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatBudget as formatPrice, STATUS_LABELS as statusLabels } from '../utils/format';

const initialOrderForm = {
  title: '',
  description: '',
  category: '',
  city: '',
  address: '',
  dueDate: '',
  priceType: 'negotiable',
  priceAmount: '',
};

function OrdersPage() {
  const { isAuthenticated, tokens } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [createForm, setCreateForm] = useState(initialOrderForm);
  const [editForm, setEditForm] = useState(initialOrderForm);
  const [status, setStatus] = useState({
    loading: true,
    creating: false,
    updating: false,
    error: '',
    success: '',
  });

  const loadOrders = useCallback(async (statusValue = '') => {
    if (!tokens.access) {
      return;
    }

    setStatus((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await authApi.listOrders(tokens.access, statusValue);
      const nextOrders = Array.isArray(data) ? data : (data.results || []);
      setOrders(nextOrders);
      setStatus((prev) => ({ ...prev, loading: false }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Buyurtmalarni yuklab bo`lmadi.',
      }));
    }
  }, [tokens.access]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    loadOrders(filterStatus);
  }, [isAuthenticated, loadOrders, filterStatus]);

  const updateCreateField = (field) => (event) => {
    setCreateForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const updateEditField = (field) => (event) => {
    setEditForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const openCreateModal = () => {
    setStatus((prev) => ({ ...prev, error: '', success: '' }));
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateForm(initialOrderForm);
  };

  const openEditModal = (order) => {
    setStatus((prev) => ({ ...prev, error: '', success: '' }));
    setEditingOrderId(order.id);
    setEditForm({
      title: order.title || '',
      description: order.description || '',
      category: order.category || '',
      city: order.city || '',
      address: order.address || '',
      dueDate: order.due_date || '',
      priceType: order.price_type || 'negotiable',
      priceAmount: order.price_amount || '',
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingOrderId(null);
    setEditForm(initialOrderForm);
  };

  const buildPayload = (formState) => {
    const payload = {
      title: formState.title,
      description: formState.description,
      category: formState.category,
      city: formState.city,
      address: formState.address,
      due_date: formState.dueDate || null,
      price_type: formState.priceType,
    };

    if (formState.priceType === 'fixed') {
      payload.price_amount = formState.priceAmount;
    } else {
      payload.price_amount = null;
    }

    return payload;
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (createForm.priceType === 'fixed' && !createForm.priceAmount) {
      setStatus((prev) => ({
        ...prev,
        error: 'Aniq narx tanlanganda narx qiymatini kiriting.',
        success: '',
      }));
      return;
    }

    setStatus((prev) => ({ ...prev, creating: true, error: '', success: '' }));
    try {
      const payload = buildPayload(createForm);
      const created = await authApi.createOrder(payload, tokens.access);
      setOrders((prev) => [created, ...prev]);
      setCreateForm(initialOrderForm);
      setStatus((prev) => ({
        ...prev,
        creating: false,
        success: 'Buyurtma muvaffaqiyatli yaratildi.',
      }));
      setIsCreateModalOpen(false);
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        creating: false,
        error: error.message || 'Buyurtma yaratishda xatolik yuz berdi.',
        success: '',
      }));
    }
  };

  const onSubmitEdit = async (event) => {
    event.preventDefault();
    if (!editingOrderId) {
      return;
    }

    if (editForm.priceType === 'fixed' && !editForm.priceAmount) {
      setStatus((prev) => ({
        ...prev,
        error: 'Aniq narx tanlanganda narx qiymatini kiriting.',
        success: '',
      }));
      return;
    }

    setStatus((prev) => ({ ...prev, updating: true, error: '', success: '' }));
    try {
      const payload = buildPayload(editForm);
      const updated = await authApi.updateOrder(editingOrderId, payload, tokens.access);
      setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setStatus((prev) => ({
        ...prev,
        updating: false,
        success: 'E`lon muvaffaqiyatli yangilandi.',
      }));
      closeEditModal();
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        updating: false,
        error: error.message || 'E`lonni yangilashda xatolik yuz berdi.',
        success: '',
      }));
    }
  };

  const emptyText = useMemo(() => {
    if (filterStatus) {
      return 'Bu statusda buyurtma topilmadi.';
    }
    return 'Hozircha buyurtma yo`q. Birinchi buyurtmangizni yarating.';
  }, [filterStatus]);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <section className="stack-medium">
      <div className="section-heading reveal-up">
        <p className="eyebrow">mijoz paneli</p>
        <h1>Buyurtmalarim</h1>
      </div>

      <article className="card order-list-card order-list-card-wide reveal-up">
          <div className="section-row-head order-list-head">
            <h3>Mening e`lonlarim</h3>
            <div className="order-toolbar">
              <select
                className="input order-filter"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="">Barcha statuslar</option>
                <option value="open">Yangi</option>
                <option value="in_progress">Jarayonda</option>
                <option value="completed">Yakunlangan</option>
                <option value="cancelled">Bekor qilingan</option>
              </select>
              <button type="button" className="button button-primary" onClick={openCreateModal}>
                <Plus size={16} />
                E`lon qo`shish
              </button>
            </div>
          </div>

          {status.loading ? (
            <p className="muted">Yuklanmoqda...</p>
          ) : orders.length === 0 ? (
            <p className="muted">{emptyText}</p>
          ) : (
            <div className="order-list stack-small">
              {orders.map((order) => (
                <article key={order.id} className="order-item">
                  <div className="order-item-head">
                    <h4>{order.title}</h4>
                    <span className={`status-pill status-${order.status}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <p className="order-item-description">{order.description}</p>
                  <div className="order-item-meta">
                    <p className="muted">
                      {order.category || 'Yo`nalish berilmagan'} · {order.city || 'Shahar berilmagan'}
                    </p>
                    {order.address ? <p className="muted">{order.address}</p> : null}
                    {order.due_date ? <p className="muted">{`Muddat: ${order.due_date}`}</p> : null}
                  </div>
                  <p className="price">{formatPrice(order)}</p>
                  <div className="order-item-actions">
                    <button type="button" className="button button-ghost" onClick={() => openEditModal(order)}>
                      <Pencil size={16} />
                      Tahrirlash
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
      </article>

      {!isCreateModalOpen && !isEditModalOpen && status.error && <p className="form-message error reveal-up">{status.error}</p>}
      {status.success && <p className="form-message success reveal-up">{status.success}</p>}

      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={closeCreateModal} role="presentation">
          <article className="modal-card card" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>Yangi buyurtma</h3>
              <button type="button" className="button button-ghost" onClick={closeCreateModal}>
                <X size={16} />
                Yopish
              </button>
            </div>
            <p className="muted">Narxni kelishish asosida yoki aniq qiymat bilan qo`ying.</p>

            {isCreateModalOpen && status.error && <p className="form-message error">{status.error}</p>}

            <form className="stack-small" onSubmit={onSubmit}>
              <label className="label" htmlFor="order-title">
                Sarlavha
              </label>
              <input
                id="order-title"
                className="input"
                value={createForm.title}
                onChange={updateCreateField('title')}
                required
              />

              <label className="label" htmlFor="order-description">
                Tavsif
              </label>
              <textarea
                id="order-description"
                className="input"
                rows={4}
                value={createForm.description}
                onChange={updateCreateField('description')}
                required
              />

              <div className="order-grid">
                <div>
                  <label className="label" htmlFor="order-category">
                    Yo`nalish
                  </label>
                  <input
                    id="order-category"
                    className="input"
                    value={createForm.category}
                    onChange={updateCreateField('category')}
                    placeholder="Masalan: Elektrik"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="order-city">
                    Shahar
                  </label>
                  <input
                    id="order-city"
                    className="input"
                    value={createForm.city}
                    onChange={updateCreateField('city')}
                    placeholder="Masalan: Toshkent"
                  />
                </div>
              </div>

              <div className="order-grid">
                <div>
                  <label className="label" htmlFor="order-address">
                    Manzil (ixtiyoriy)
                  </label>
                  <input
                    id="order-address"
                    className="input"
                    value={createForm.address}
                    onChange={updateCreateField('address')}
                    placeholder="Masalan: Chilonzor tumani"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="order-due-date">
                    Muddat (ixtiyoriy)
                  </label>
                  <input
                    id="order-due-date"
                    className="input"
                    type="date"
                    value={createForm.dueDate}
                    onChange={updateCreateField('dueDate')}
                  />
                </div>
              </div>

              <div className="order-grid">
                <div>
                  <label className="label" htmlFor="order-price-type">
                    Narx turi
                  </label>
                  <select
                    id="order-price-type"
                    className="input"
                    value={createForm.priceType}
                    onChange={updateCreateField('priceType')}
                  >
                    <option value="negotiable">Kelishish asosida</option>
                    <option value="fixed">Aniq narx</option>
                  </select>
                </div>

                {createForm.priceType === 'fixed' ? (
                  <div>
                    <label className="label" htmlFor="order-price-amount">
                      Narx (so`m)
                    </label>
                    <input
                      id="order-price-amount"
                      className="input"
                      type="number"
                      min="1"
                      value={createForm.priceAmount}
                      onChange={updateCreateField('priceAmount')}
                      required
                    />
                  </div>
                ) : (
                  <div className="order-info-box">Narx ustalar bilan kelishiladi.</div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={closeCreateModal}>
                  <X size={16} />
                  Bekor qilish
                </button>
                <button className="button button-primary" type="submit" disabled={status.creating}>
                  <Plus size={16} />
                  {status.creating ? 'Yaratilmoqda...' : 'Buyurtma yaratish'}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}

      {isEditModalOpen && (
        <div className="modal-backdrop" onClick={closeEditModal} role="presentation">
          <article className="modal-card card" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>E`lonni tahrirlash</h3>
              <button type="button" className="button button-ghost" onClick={closeEditModal}>
                <X size={16} />
                Yopish
              </button>
            </div>
            <p className="muted">Faqat o`zingiz yaratgan e`lonni yangilaysiz.</p>

            {isEditModalOpen && status.error && <p className="form-message error">{status.error}</p>}

            <form className="stack-small" onSubmit={onSubmitEdit}>
              <label className="label" htmlFor="order-edit-title">
                Sarlavha
              </label>
              <input
                id="order-edit-title"
                className="input"
                value={editForm.title}
                onChange={updateEditField('title')}
                required
              />

              <label className="label" htmlFor="order-edit-description">
                Tavsif
              </label>
              <textarea
                id="order-edit-description"
                className="input"
                rows={4}
                value={editForm.description}
                onChange={updateEditField('description')}
                required
              />

              <div className="order-grid">
                <div>
                  <label className="label" htmlFor="order-edit-category">
                    Yo`nalish
                  </label>
                  <input
                    id="order-edit-category"
                    className="input"
                    value={editForm.category}
                    onChange={updateEditField('category')}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="order-edit-city">
                    Shahar
                  </label>
                  <input
                    id="order-edit-city"
                    className="input"
                    value={editForm.city}
                    onChange={updateEditField('city')}
                  />
                </div>
              </div>

              <div className="order-grid">
                <div>
                  <label className="label" htmlFor="order-edit-address">
                    Manzil (ixtiyoriy)
                  </label>
                  <input
                    id="order-edit-address"
                    className="input"
                    value={editForm.address}
                    onChange={updateEditField('address')}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="order-edit-due-date">
                    Muddat (ixtiyoriy)
                  </label>
                  <input
                    id="order-edit-due-date"
                    className="input"
                    type="date"
                    value={editForm.dueDate}
                    onChange={updateEditField('dueDate')}
                  />
                </div>
              </div>

              <div className="order-grid">
                <div>
                  <label className="label" htmlFor="order-edit-price-type">
                    Narx turi
                  </label>
                  <select
                    id="order-edit-price-type"
                    className="input"
                    value={editForm.priceType}
                    onChange={updateEditField('priceType')}
                  >
                    <option value="negotiable">Kelishish asosida</option>
                    <option value="fixed">Aniq narx</option>
                  </select>
                </div>

                {editForm.priceType === 'fixed' ? (
                  <div>
                    <label className="label" htmlFor="order-edit-price-amount">
                      Narx (so`m)
                    </label>
                    <input
                      id="order-edit-price-amount"
                      className="input"
                      type="number"
                      min="1"
                      value={editForm.priceAmount}
                      onChange={updateEditField('priceAmount')}
                      required
                    />
                  </div>
                ) : (
                  <div className="order-info-box">Narx ustalar bilan kelishiladi.</div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={closeEditModal}>
                  <X size={16} />
                  Bekor qilish
                </button>
                <button className="button button-primary" type="submit" disabled={status.updating}>
                  <Save size={16} />
                  {status.updating ? 'Yangilanmoqda...' : 'Yangilash'}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
    </section>
  );
}

export default OrdersPage;
