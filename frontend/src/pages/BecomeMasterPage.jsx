import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function BecomeMasterPage() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user?.user_type === 'worker') {
    return <Navigate to="/profile/edit" replace />;
  }

  return (
    <section className="stack-medium">
      <div className="section-heading reveal-up">
        <p className="eyebrow">usta onboarding</p>
        <h1>Platformaga usta sifatida qo`shiling</h1>
      </div>

      <div className="become-grid reveal-up delay-1">
        <article className="card become-intro">
          <h2>Nima uchun Ustazor?</h2>
          <ul className="list-clean">
            <li>Har kuni yangi mijozlardan buyurtmalar.</li>
            <li>Profil orqali ishlaringizni portfolioda ko`rsatish.</li>
            <li>Xizmatlar bo`yicha aniq narx va tajribani ko`rsatish.</li>
            <li>Chat orqali tez kelishuv va xavfsiz aloqa.</li>
          </ul>
        </article>

        <article className="card become-form-card">
          {isAuthenticated ? (
            <div className="stack-small">
              <p className="muted">
                Siz hozir mijoz akkauntidasiz. Usta profil faqat usta akkaunt uchun ochiladi.
              </p>
              <Link className="button button-ghost full-width" to="/profile">
                Profilga qaytish
              </Link>
            </div>
          ) : (
            <div className="stack-small">
              <p className="muted">
                Usta profilini yaratish uchun avval ro`yxatdan o`ting. Ro`yxatdan o`tishda
                foydalanuvchi turini <strong>Usta</strong> qilib tanlang.
              </p>
              <Link className="button button-primary full-width" to="/auth/register?user_type=worker">
                Usta sifatida ro`yxatdan o`tish
              </Link>
              <Link className="button button-ghost full-width" to="/auth/login">
                Akkauntga kirish
              </Link>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

export default BecomeMasterPage;
