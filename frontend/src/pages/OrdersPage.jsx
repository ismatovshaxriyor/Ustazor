import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

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

function OrdersPage() {
  const { isAuthenticated, tokens } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    city: '',
    priceType: 'negotiable',
    priceAmount: '',
  });
  const [status, setStatus] = useState({
    loading: true,
    creating: false,
    error: '',
    success: '',
  });

  const loadOrders = async (statusValue = '') => {
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
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    loadOrders(filterStatus);
  }, [isAuthenticated, tokens.access, filterStatus]);

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (form.priceType === 'fixed' && !form.priceAmount) {
      setStatus((prev) => ({
        ...prev,
        error: 'Aniq narx tanlanganda narx qiymatini kiriting.',
        success: '',
      }));
      return;
    }

    setStatus((prev) => ({ ...prev, creating: true, error: '', success: '' }));
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        city: form.city,
        price_type: form.priceType,
      };

      if (form.priceType === 'fixed') {
        payload.price_amount = form.priceAmount;
      }

      const created = await authApi.createOrder(payload, tokens.access);
      setOrders((prev) => [created, ...prev]);
      setForm({
        title: '',
        description: '',
        category: '',
        city: '',
        priceType: 'negotiable',
        priceAmount: '',
      });
      setStatus((prev) => ({
        ...prev,
        creating: false,
        success: 'Buyurtma muvaffaqiyatli yaratildi.',
      }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        creating: false,
        error: error.message || 'Buyurtma yaratishda xatolik yuz berdi.',
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

      <div className="dual-grid reveal-up">
        <article className="card order-create-card">
          <h3>Yangi buyurtma</h3>
          <p className="muted">Narxni kelishish asosida yoki aniq qiymat bilan qo`ying.</p>

          <form className="stack-small" onSubmit={onSubmit}>
            <label className="label" htmlFor="order-title">
              Sarlavha
            </label>
            <input
              id="order-title"
              className="input"
              value={form.title}
              onChange={updateField('title')}
              required
            />

            <label className="label" htmlFor="order-description">
              Tavsif
            </label>
            <textarea
              id="order-description"
              rows={4}
              value={form.description}
              onChange={updateField('description')}
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
                  value={form.category}
                  onChange={updateField('category')}
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
                  value={form.city}
                  onChange={updateField('city')}
                  placeholder="Masalan: Toshkent"
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
                  value={form.priceType}
                  onChange={updateField('priceType')}
                >
                  <option value="negotiable">Kelishish asosida</option>
                  <option value="fixed">Aniq narx</option>
                </select>
              </div>

              {form.priceType === 'fixed' ? (
                <div>
                  <label className="label" htmlFor="order-price-amount">
                    Narx (so`m)
                  </label>
                  <input
                    id="order-price-amount"
                    className="input"
                    type="number"
                    min="1"
                    value={form.priceAmount}
                    onChange={updateField('priceAmount')}
                    required
                  />
                </div>
              ) : (
                <div className="order-info-box">Narx ustalar bilan kelishiladi.</div>
              )}
            </div>

            <button className="button button-primary" type="submit" disabled={status.creating}>
              {status.creating ? 'Yaratilmoqda...' : 'Buyurtma yaratish'}
            </button>
          </form>
        </article>

        <article className="card order-list-card">
          <div className="section-row-head">
            <h3>Mening e`lonlarim</h3>
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
                  <p>{order.description}</p>
                  <p className="muted">
                    {order.category || 'Yo`nalish berilmagan'} · {order.city || 'Shahar berilmagan'}
                  </p>
                  <p className="price">{formatPrice(order)}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>

      {status.error && <p className="form-message error reveal-up">{status.error}</p>}
      {status.success && <p className="form-message success reveal-up">{status.success}</p>}
    </section>
  );
}

export default OrdersPage;
