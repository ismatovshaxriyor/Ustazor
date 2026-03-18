import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    try {
      await login({ email: form.email, password: form.password });
      setStatus({ loading: false, error: '', success: 'Muvaffaqiyatli kirdingiz.' });
      navigate('/');
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || 'Kirishda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  return (
    <section className="auth-shell reveal-up">
      <article className="auth-card card">
        <h2>Tizimga kirish</h2>
        <p className="auth-subtitle">Akkountingizga kiring va buyurtmalarni boshqaring.</p>

        <form className="stack-small" onSubmit={onSubmit}>
          <label className="label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="input"
            type="email"
            value={form.email}
            onChange={updateField('email')}
            required
          />

          <label className="label" htmlFor="login-password">
            Parol
          </label>
          <input
            id="login-password"
            className="input"
            type="password"
            value={form.password}
            onChange={updateField('password')}
            required
          />

          <button className="button button-primary full-width" type="submit" disabled={status.loading}>
            {status.loading ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/auth/register">Ro`yxatdan o`tish</Link>
          <Link to="/auth/verify">Emailni tasdiqlash</Link>
        </div>

        {status.error && <p className="form-message error">{status.error}</p>}
        {status.success && <p className="form-message success">{status.success}</p>}
      </article>
    </section>
  );
}

export default LoginPage;
