import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authApi } from '../api/client';
import { resolveMediaUrl } from '../utils/media';
import { formatDate, formatSkillPrice } from '../utils/format';

const PROFILE_TABS = [
  { key: 'overview', label: 'Asosiy ma`lumot' },
  { key: 'services', label: 'Xizmatlar' },
  { key: 'portfolio', label: 'Ish namunalari' },
  { key: 'reviews', label: 'Mijozlar fikri' },
];

function MasterProfilePage() {
  const { id } = useParams();
  const [master, setMaster] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    let active = true;
    setStatus({ loading: true, error: '' });
    setActiveTab('overview');

    authApi
      .getPublicWorker(id)
      .then((data) => {
        if (!active) {
          return;
        }
        setMaster(data);
        setStatus({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setMaster(null);
        setStatus({
          loading: false,
          error: error.message || 'Usta profili topilmadi.',
        });
      });

    return () => {
      active = false;
    };
  }, [id]);

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

        <Link to="/chat" className="button button-primary full-width">
          Chatni boshlash
        </Link>
        <Link to="/elonlar" className="button button-ghost full-width">
          E'lonlarni ko`rish
        </Link>
      </aside>
    </section>
  );
}

export default MasterProfilePage;
