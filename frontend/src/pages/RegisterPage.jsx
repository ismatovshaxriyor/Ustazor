import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const initialUserType = searchParams.get('user_type') === 'worker' ? 'worker' : 'client';
  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    password: '',
    userType: initialUserType,
  });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber,
        userType: form.userType,
      });

      setStatus({
        loading: false,
        error: '',
        success: 'Tasdiqlash kodi emailingizga yuborildi.',
      });

      navigate(`/auth/verify?email=${encodeURIComponent(form.email)}`);
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || "Ro`yxatdan o`tishda xatolik yuz berdi.",
        success: '',
      });
    }
  };

  return (
    <section className="auth-shell reveal-up">
      <article className="auth-card card">
        <h2>Ro`yxatdan o`tish</h2>
        <p className="auth-subtitle">Mijoz yoki usta sifatida akkaunt oching.</p>

        <form className="stack-small" onSubmit={onSubmit}>
          <label className="label" htmlFor="register-name">
            To`liq ism
          </label>
          <input
            id="register-name"
            className="input"
            value={form.fullName}
            onChange={updateField('fullName')}
            required
          />

          <label className="label" htmlFor="register-phone">
            Telefon raqam
          </label>
          <input
            id="register-phone"
            className="input"
            value={form.phoneNumber}
            onChange={updateField('phoneNumber')}
            placeholder="+998901234567"
            required
          />

          <label className="label" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
            className="input"
            type="email"
            value={form.email}
            onChange={updateField('email')}
            required
          />

          <label className="label" htmlFor="register-password">
            Parol
          </label>
          <input
            id="register-password"
            className="input"
            type="password"
            value={form.password}
            onChange={updateField('password')}
            minLength={8}
            required
          />

          <label className="label" htmlFor="register-user-type">
            Foydalanuvchi turi
          </label>
          <select
            id="register-user-type"
            className="input"
            value={form.userType}
            onChange={updateField('userType')}
          >
            <option value="client">Mijoz</option>
            <option value="worker">Usta</option>
          </select>

          <button className="button button-primary full-width" type="submit" disabled={status.loading}>
            {status.loading ? 'Yuborilmoqda...' : 'Ro`yxatdan o`tish'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/auth/login">Akkauntingiz bormi? Kirish</Link>
          <Link to="/auth/verify">Emailni tasdiqlash sahifasi</Link>
        </div>

        {status.error && <p className="form-message error">{status.error}</p>}
        {status.success && <p className="form-message success">{status.success}</p>}
      </article>
    </section>
  );
}

export default RegisterPage;
