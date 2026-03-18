import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import ClientProfilePage from './ClientProfilePage';
import WorkerProfilePage from './WorkerProfilePage';
import { useAuth } from '../context/AuthContext';

function ProfilePage() {
  const { isAuthenticated, user, fetchMe } = useAuth();
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (user?.user_type) {
      setStatus({ loading: false, error: '' });
      return;
    }

    let active = true;
    setStatus({ loading: true, error: '' });

    fetchMe()
      .then(() => {
        if (!active) {
          return;
        }
        setStatus({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setStatus({
          loading: false,
          error: error.message || 'Profilni ochishda xatolik yuz berdi.',
        });
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.user_type, fetchMe]);

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

  if (status.error) {
    return (
      <section className="profile-shell reveal-up">
        <article className="profile-view-card card">
          <p className="form-message error">{status.error}</p>
        </article>
      </section>
    );
  }

  if (user?.user_type === 'worker') {
    return <WorkerProfilePage />;
  }

  return <ClientProfilePage />;
}

export default ProfilePage;
