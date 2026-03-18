import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PROPOSAL_STATUS_LABELS } from '../utils/format';

function formatProposalStatus(status) {
  return PROPOSAL_STATUS_LABELS[status] || status;
}

function WorkerDashboardPage() {
  const { isAuthenticated, user, fetchWorkerDashboard, fetchWorkerSkills, fetchMyProposals } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [skills, setSkills] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;

    Promise.all([fetchWorkerDashboard(), fetchWorkerSkills(), fetchMyProposals()])
      .then(([dashboardData, skillsData, proposalsData]) => {
        if (!active) {
          return;
        }
        setDashboard(dashboardData);
        setSkills(Array.isArray(skillsData) ? skillsData : (skillsData.results || []));
        setProposals(Array.isArray(proposalsData) ? proposalsData : (proposalsData.results || []));
        setStatus({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setStatus({
          loading: false,
          error: error.message || 'Boshqaruv paneli ma`lumotlarini yuklab bo`lmadi.',
        });
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, fetchWorkerDashboard, fetchWorkerSkills, fetchMyProposals]);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user?.user_type && user.user_type !== 'worker') {
    return <Navigate to="/profile" replace />;
  }

  if (status.loading) {
    return (
      <section className="stack-medium">
        <article className="card dashboard-card">
          <p className="muted">Boshqaruv paneli yuklanmoqda...</p>
        </article>
      </section>
    );
  }

  const topSkills = skills.slice(0, 4);

  return (
    <section className="stack-medium">
      <div className="section-heading reveal-up">
        <p className="eyebrow">usta paneli</p>
        <h1>Ishlarim Boshqaruv Paneli</h1>
      </div>

      <div className="dashboard-stats reveal-up delay-1">
        <article className="card dashboard-stat">
          <p className="dashboard-label">Profil to`liqligi</p>
          <h3>{dashboard?.profile_completion_percent || 0}%</h3>
        </article>
        <article className="card dashboard-stat">
          <p className="dashboard-label">Xizmatlar</p>
          <h3>{dashboard?.skills_count || 0}</h3>
          <p className="muted">Faol: {dashboard?.active_skills_count || 0}</p>
        </article>
        <article className="card dashboard-stat">
          <p className="dashboard-label">Yangi buyurtmalarim</p>
          <h3>{dashboard?.open_orders_count || 0}</h3>
        </article>
        <article className="card dashboard-stat">
          <p className="dashboard-label">Yakunlangan ishlar</p>
          <h3>{dashboard?.completed_orders_count || 0}</h3>
        </article>
      </div>

      <div className="dual-grid reveal-up delay-2">
        <article className="card dashboard-card">
          <div className="section-row-head">
            <h3>Top xizmatlarim</h3>
            <Link to="/profile/edit" className="button button-ghost">
              Tahrirlash
            </Link>
          </div>

          {topSkills.length === 0 ? (
            <p className="muted">Hozircha xizmat qo`shilmagan. Profil sahifasida qo`shing.</p>
          ) : (
            <div className="worker-skill-grid">
              {topSkills.map((skill) => (
                <article key={skill.id} className="worker-skill-card">
                  <div className="worker-skill-head">
                    <h4>{skill.title}</h4>
                    <span className={`status-pill ${skill.is_active ? 'status-completed' : 'status-cancelled'}`}>
                      {skill.is_active ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>
                  <p className="muted">{skill.description || 'Izoh kiritilmagan'}</p>
                  <p className="muted">Tajriba: {skill.experience_years || 0} yil</p>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="card dashboard-card">
          <div className="section-row-head">
            <h3>Mening murojaatlarim</h3>
            <Link to="/elonlar" className="button button-ghost">
              E`lonlar
            </Link>
          </div>

          {proposals.length === 0 ? (
            <p className="muted">Hozircha e`lonlarga murojaat yubormagansiz.</p>
          ) : (
            <div className="mini-vacancy-list">
              {proposals.slice(0, 5).map((proposal) => (
                <article key={proposal.id} className="vacancy-snippet">
                  <h4>{proposal.vacancy_title}</h4>
                  <p className="muted">{proposal.vacancy_city || 'Shahar kiritilmagan'}</p>
                  <div className="snippet-meta">
                    <span className="pill">{formatProposalStatus(proposal.status)}</span>
                    {proposal.chat_thread_id ? (
                      <Link to={`/chat/${proposal.chat_thread_id}`} className="button button-ghost">
                        Chat
                      </Link>
                    ) : (
                      <Link to={`/elonlar/${proposal.vacancy_id}`} className="button button-ghost">
                        Ko`rish
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>

      {status.error && <p className="form-message error">{status.error}</p>}
    </section>
  );
}

export default WorkerDashboardPage;
