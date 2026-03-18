import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authApi } from '../api/client';
import { resolveMediaUrl } from '../utils/media';
import { formatMoney, formatSkillPrice } from '../utils/format';

function MasterProfilePage() {
  const { id } = useParams();
  const [master, setMaster] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    let active = true;
    setStatus({ loading: true, error: '' });

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

  return (
    <section className="profile-layout reveal-up">
      <article className="profile-main card">
        <p className="pill">{master.specialization || 'Usta xizmati'}</p>
        <h1>{master.full_name || 'Usta'}</h1>
        <p className="muted">
          {master.service_city || 'Shahar kiritilmagan'} - {master.experience_years || 0} yil tajriba
        </p>
        <p>{master.about || 'Usta hozircha batafsil ma`lumot qoldirmagan.'}</p>

        <h3>Xizmatlar</h3>
        {Array.isArray(master.skills) && master.skills.length > 0 ? (
          <div className="worker-skill-grid">
            {master.skills.map((skill) => (
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
      </article>

      <aside className="profile-side card">
        <div className="profile-avatar-wrap">
          <img
            src={resolveMediaUrl(master.profile_photo_url, { userType: 'worker' })}
            alt="Usta rasmi"
            className="profile-avatar"
          />
        </div>
        <p className="price">{formatMoney(master.min_order_price)}</p>
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
