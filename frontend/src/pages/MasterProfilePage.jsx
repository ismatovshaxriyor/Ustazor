import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';
import { formatDate, formatSkillPrice } from '../utils/format';

const PROFILE_TABS = [
  { key: 'overview', label: 'Asosiy ma`lumot' },
  { key: 'services', label: 'Xizmatlar' },
  { key: 'portfolio', label: 'Ish namunalari' },
  { key: 'reviews', label: 'Mijozlar fikri' },
];

function MasterProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tokens, user, isAuthenticated } = useAuth();
  const [master, setMaster] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: '', startingChat: false });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    let active = true;
    setStatus({ loading: true, error: '', startingChat: false });
    setActiveTab('overview');

    authApi
      .getPublicWorker(id, user ? (tokens?.access || null) : null)
      .then((data) => {
        if (!active) {
          return;
        }
        setMaster(data);
        setStatus({ loading: false, error: '', startingChat: false });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setMaster(null);
        setStatus({
          loading: false,
          error: error.message || 'Usta profili topilmadi.',
          startingChat: false,
        });
      });

    return () => {
      active = false;
    };
  }, [id, tokens?.access, user]);

  if (status.loading) {
    return (
      <section className="empty-state">
        <p className="muted">Usta profili yuklanmoqda...</p>
      </section>
    );
  }

  if (!master) {
    return (
      <section className="empty-state">
        <h1>Usta topilmadi</h1>
        <Link to="/masters" className="button button-primary">
          Katalogga qaytish
        </Link>
        {status.error && <p className="form-message error">{status.error}</p>}
      </section>
    );
  }

  const services = Array.isArray(master.skills) ? master.skills : [];
  const portfolioItems = Array.isArray(master.portfolio) ? master.portfolio : [];
  const reviews = Array.isArray(master.reviews) ? master.reviews : [];
  const canStartChat = isAuthenticated && user?.user_type === 'client' && tokens?.access && master?.id;

  const onStartChat = async () => {
    if (!canStartChat) {
      navigate('/auth/login?next=/chat');
      return;
    }
    setStatus((prev) => ({ ...prev, startingChat: true, error: '' }));
    try {
      const data = await authApi.startChatThread(
        {
          worker_id: master.worker_user_id,
          initial_message: `Salom, ${master.full_name || 'usta'}!`,
        },
        tokens.access,
      );
      if (!data?.thread_id) {
        throw new Error('Chat yaratilmagan.');
      }
      navigate(`/chat/${data.thread_id}`);
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        startingChat: false,
        error: error.message || 'Chatni boshlab bo`lmadi.',
      }));
    }
  };

  return (
    <section className="profile-layout reveal-up">
      <article className="profile-main card">
        <p className="pill">{master.specialization || 'Usta xizmati'}</p>
        <h1>{master.full_name || 'Usta'}</h1>
        <p className="muted">
          {master.service_city || 'Shahar kiritilmagan'} - {master.experience_years || 0} yil tajriba
        </p>
        <p className="muted">
          {master.rating_count > 0
            ? `⭐ ${Number(master.rating_avg || 0).toFixed(1)} (${master.rating_count} ta baho)`
            : '⭐ Hozircha baho yo`q'}
        </p>
        <p>{master.about || 'Usta hozircha batafsil ma`lumot qoldirmagan.'}</p>

        <div className="profile-tabs" role="tablist" aria-label="Usta profili bo`limlari">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`profile-tab${activeTab === tab.key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' ? (
          <section className="tab-panel">
            <div className="worker-meta-grid">
              <article className="worker-meta-card">
                <p className="worker-meta-label">Mutaxassislik</p>
                <p className="worker-meta-value">{master.specialization || 'Kiritilmagan'}</p>
              </article>
              <article className="worker-meta-card">
                <p className="worker-meta-label">Xizmat hududi</p>
                <p className="worker-meta-value">{master.service_city || 'Kiritilmagan'}</p>
              </article>
              <article className="worker-meta-card">
                <p className="worker-meta-label">Tajriba</p>
                <p className="worker-meta-value">{master.experience_years || 0} yil</p>
              </article>
            </div>
            <div className="worker-meta-grid">
              <article className="worker-meta-card">
                <p className="worker-meta-label">Reyting</p>
                <p className="worker-meta-value">
                  {master.rating_count > 0
                    ? `${Number(master.rating_avg || 0).toFixed(1)} (${master.rating_count} ta)`
                    : 'Baho yo`q'}
                </p>
              </article>
              <article className="worker-meta-card">
                <p className="worker-meta-label">Xizmatlar soni</p>
                <p className="worker-meta-value">{services.length}</p>
              </article>
              <article className="worker-meta-card">
                <p className="worker-meta-label">Ish namunalari</p>
                <p className="worker-meta-value">{portfolioItems.length}</p>
              </article>
            </div>
          </section>
        ) : null}

        {activeTab === 'services' ? (
          <section className="tab-panel">
            <h3>Xizmatlar</h3>
            {services.length > 0 ? (
              <div className="worker-skill-grid">
                {services.map((skill) => (
                  <article key={skill.id} className="worker-skill-card">
                    <div className="worker-skill-head">
                      <h4>{skill.title}</h4>
                      <span className="status-pill status-open">{skill.experience_years || 0} yil</span>
                    </div>
                    <p>{skill.description || 'Izoh kiritilmagan.'}</p>
                    <p className="muted">Narx: {formatSkillPrice(skill)}</p>
                    {skill.extra_info && <p className="muted">Qo`shimcha: {skill.extra_info}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Hozircha xizmatlar kiritilmagan.</p>
            )}
          </section>
        ) : null}

        {activeTab === 'portfolio' ? (
          <section className="tab-panel">
            <h3>Ish namunalari</h3>
            {portfolioItems.length > 0 ? (
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
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Hozircha ish namunalari kiritilmagan.</p>
            )}
          </section>
        ) : null}

        {activeTab === 'reviews' ? (
          <section className="tab-panel">
            <h3>Mijozlar fikri</h3>
            {reviews.length > 0 ? (
              <div className="worker-skill-grid">
                {reviews.map((review) => (
                  <article key={review.id} className="worker-skill-card">
                    <div className="worker-skill-head">
                      <h4>{review.client_name || 'Mijoz'}</h4>
                      <span className="status-pill status-completed">{`⭐ ${review.rating}`}</span>
                    </div>
                    <p>{review.comment || 'Izoh qoldirilmagan.'}</p>
                    <p className="muted">{formatDate(review.created_at)}</p>
                    {Array.isArray(review.images) && review.images.length > 0 ? (
                      <div className="portfolio-image-row">
                        {review.images.map((image) => (
                          <img
                            key={image.id}
                            src={resolveMediaUrl(image.image_url)}
                            alt="Baho rasmi"
                            className="portfolio-image-thumb"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Hozircha mijoz baholari yo`q.</p>
            )}
          </section>
        ) : null}
      </article>

      <aside className="profile-side card">
        <div className="profile-avatar-wrap">
          <img
            src={resolveMediaUrl(master.profile_photo_url, { userType: 'worker' })}
            alt="Usta rasmi"
            className="profile-avatar"
          />
        </div>
        <p className="muted">{master.is_available ? 'Hozir buyurtma oladi' : 'Hozir band'}</p>
        <p className="muted">Aloqa: {master.phone_number || 'Telefon kiritilmagan'}</p>
        {master.secondary_phone_number ? (
          <p className="muted">{`Qo'shimcha: ${master.secondary_phone_number}`}</p>
        ) : null}
        {master.telegram_username ? (
          <p className="muted">{`Telegram: @${master.telegram_username}`}</p>
        ) : null}
        {master.instagram_username ? (
          <p className="muted">{`Instagram: @${master.instagram_username}`}</p>
        ) : null}

        <button
          type="button"
          className="button button-primary full-width"
          onClick={onStartChat}
          disabled={status.startingChat}
        >
          {status.startingChat ? 'Yuklanmoqda...' : 'Chatni boshlash'}
        </button>
        <Link to="/elonlar" className="button button-ghost full-width">
          E'lonlarni ko`rish
        </Link>
        {status.error ? <p className="form-message error">{status.error}</p> : null}
      </aside>
    </section>
  );
}

export default MasterProfilePage;
