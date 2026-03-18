import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { verifyEmail, resendActivation } = useAuth();
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const [form, setForm] = useState({
    email: initialEmail,
    code: '',
  });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onVerify = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    try {
      await verifyEmail({ email: form.email, code: form.code });
      setStatus({
        loading: false,
        error: '',
        success: 'Email tasdiqlandi. Bosh sahifaga o`tkazilmoqda...',
      });
      window.setTimeout(() => navigate('/', { replace: true }), 900);
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || 'Tasdiqlash jarayonida xatolik yuz berdi.',
        success: '',
      });
    }
  };

  const onResend = async () => {
    setStatus({ loading: true, error: '', success: '' });

    try {
      await resendActivation({ email: form.email });
      setStatus({
        loading: false,
        error: '',
        success: 'Kod qayta yuborildi. Emailni tekshiring.',
      });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || 'Kod yuborishda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  return (
    <section className="auth-shell reveal-up">
      <article className="auth-card card">
        <h2>Emailni tasdiqlash</h2>
        <p className="auth-subtitle">Emailga yuborilgan 5 xonali kodni kiriting.</p>

        <form className="stack-small" onSubmit={onVerify}>
          <label className="label" htmlFor="verify-email">
            Email
          </label>
          <input
            id="verify-email"
            className="input"
            type="email"
            value={form.email}
            onChange={updateField('email')}
            required
          />

          <label className="label" htmlFor="verify-code">
            Tasdiqlash kodi
          </label>
          <input
            id="verify-code"
            className="input"
            value={form.code}
            onChange={updateField('code')}
            placeholder="12345"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            required
          />

          <button className="button button-primary full-width" type="submit" disabled={status.loading}>
            {status.loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
          </button>
          <button
            className="button button-ghost full-width"
            type="button"
            onClick={onResend}
            disabled={status.loading || !form.email}
          >
            {status.loading ? 'Yuborilmoqda...' : 'Kodni qayta yuborish'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/auth/login">Tizimga kirish</Link>
          <Link to="/auth/register">Qayta ro`yxatdan o`tish</Link>
        </div>

        {status.error && <p className="form-message error">{status.error}</p>}
        {status.success && <p className="form-message success">{status.success}</p>}
      </article>
    </section>
  );
}

export default VerifyEmailPage;
