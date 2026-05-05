import { useState } from 'react';
import { useUser } from '@clerk/react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PhoneCompletionPage() {
  const navigate = useNavigate();
  const { user: clerkUser } = useUser();
  const { isAuthenticated, phoneCompletionRequired, userTypeCompletionRequired, updateMe } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userType, setUserType] = useState('client');
  const [status, setStatus] = useState({ loading: false, error: '' });

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!phoneCompletionRequired && !userTypeCompletionRequired) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '' });
    try {
      const payload = {};
      if (phoneCompletionRequired) {
        payload.phone_number = phoneNumber;
      }
      if (userTypeCompletionRequired) {
        payload.user_type = userType;
      }

      await updateMe(payload);
      if (userTypeCompletionRequired && clerkUser) {
        try {
          await clerkUser.update({
            unsafeMetadata: {
              ...(clerkUser.unsafeMetadata || {}),
              user_type: userType,
            },
          });
        } catch {
          // Clerk metadata update bo'lmasa ham lokal bazadagi user_type saqlanadi.
        }
      }
      navigate('/', { replace: true });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message || "Ma'lumotlarni saqlashda xatolik yuz berdi.",
      });
      return;
    }
    setStatus({ loading: false, error: '' });
  };

  return (
    <section className="auth-shell reveal-up">
      <article className="auth-card card">
        <h2>Ro`yxatdan o`tishni yakunlang</h2>
        <p className="auth-subtitle">
          Davom etish uchun yetishmayotgan ma`lumotlarni kiriting.
        </p>

        <form className="stack-small" onSubmit={onSubmit}>
          {phoneCompletionRequired && (
            <>
              <label className="label" htmlFor="complete-phone-number">
                Telefon raqam
              </label>
              <input
                id="complete-phone-number"
                className="input"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+998901234567"
                required
              />
            </>
          )}

          {userTypeCompletionRequired && (
            <>
              <label className="label" htmlFor="complete-user-type">
                Foydalanuvchi turi
              </label>
              <select
                id="complete-user-type"
                className="input"
                value={userType}
                onChange={(event) => setUserType(event.target.value)}
                required
              >
                <option value="client">Mijoz</option>
                <option value="worker">Usta</option>
              </select>
            </>
          )}

          <button className="button button-primary full-width" type="submit" disabled={status.loading}>
            {status.loading ? 'Saqlanmoqda...' : 'Davom etish'}
          </button>
        </form>

        {status.error && <p className="form-message error">{status.error}</p>}
      </article>
    </section>
  );
}

export default PhoneCompletionPage;
