import { AuthenticateWithRedirectCallback } from '@clerk/react';

function SsoCallbackPage() {
  return (
    <section className="auth-shell reveal-up">
      <article className="auth-card card">
        <h2>Tasdiqlanmoqda...</h2>
        <p className="auth-subtitle">Iltimos, kuting. Tizimga kirish yakunlanmoqda.</p>
        <AuthenticateWithRedirectCallback />
      </article>
    </section>
  );
}

export default SsoCallbackPage;
