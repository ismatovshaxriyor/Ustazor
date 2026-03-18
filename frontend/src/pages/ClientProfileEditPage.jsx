import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';

function ClientProfileEditPage() {
  const navigate = useNavigate();
  const { isAuthenticated, fetchMe, updateMe, deleteAccount } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [status, setStatus] = useState({ loading: true, saving: false, error: '', success: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;

    fetchMe()
      .then((me) => {
        if (!active) {
          return;
        }
        setForm({
          fullName: me.full_name || '',
          phoneNumber: me.phone_number || '',
        });
        setPhotoPreview(resolveMediaUrl(me.profile_photo_url, { userType: me.user_type || 'client' }));
        setStatus({ loading: false, saving: false, error: '', success: '' });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setStatus({
          loading: false,
          saving: false,
          error: error.message || 'Profilni yuklab bo`lmadi.',
          success: '',
        });
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, fetchMe]);

  const updateField = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onPhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus((prev) => ({ ...prev, saving: true, error: '', success: '' }));

    const payload = new FormData();
    payload.append('full_name', form.fullName);
    payload.append('phone_number', form.phoneNumber);
    if (photoFile) {
      payload.append('profile_photo', photoFile);
    }

    try {
      await updateMe(payload);
      setStatus({
        loading: false,
        saving: false,
        error: '',
        success: 'Profil yangilandi. Profil sahifasiga o`tkazilmoqda...',
      });
      window.setTimeout(() => navigate('/profile', { replace: true }), 850);
    } catch (error) {
      setStatus({
        loading: false,
        saving: false,
        error: error.message || 'Profilni saqlashda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  const onDeleteAccount = async () => {
    const confirmed = window.confirm("Akkauntni o`chirsangiz, ma`lumotlaringiz qayta tiklanmaydi. Davom etasizmi?");
    if (!confirmed) {
      return;
    }

    setStatus((prev) => ({ ...prev, saving: true, error: '', success: '' }));
    try {
      await deleteAccount();
      navigate('/', { replace: true });
    } catch (error) {
      setStatus({
        loading: false,
        saving: false,
        error: error.message || 'Akkauntni o`chirishda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <section className="profile-shell reveal-up">
      <article className="profile-card card">
        <div className="profile-edit-head">
          <h2>Profilni tahrirlash</h2>
          <Link to="/profile" className="button button-ghost">
            Orqaga
          </Link>
        </div>
        <p className="auth-subtitle">Rasm, ism va telefon ma`lumotlarini yangilang.</p>

        {status.loading ? (
          <p className="muted">Yuklanmoqda...</p>
        ) : (
          <form className="stack-small" onSubmit={onSubmit}>
            <div className="profile-photo-editor">
              <img
                src={photoPreview || '/brand/logo-transparent.png'}
                alt="Profil rasmi"
                className="profile-avatar profile-avatar-editor"
              />
              <div className="profile-photo-actions">
                <label className="button button-ghost" htmlFor="profile-photo-input">
                  Rasm tanlash
                </label>
                <input
                  id="profile-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={onPhotoChange}
                  className="hidden-input"
                />
                <p className="muted">PNG/JPG tavsiya etiladi.</p>
              </div>
            </div>

            <div className="profile-grid">
              <div>
                <label className="label" htmlFor="profile-full-name">
                  To`liq ism
                </label>
                <input
                  id="profile-full-name"
                  className="input"
                  value={form.fullName}
                  onChange={updateField('fullName')}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="profile-phone">
                  Telefon raqam
                </label>
                <input
                  id="profile-phone"
                  className="input"
                  value={form.phoneNumber}
                  onChange={updateField('phoneNumber')}
                  required
                />
              </div>
            </div>

            <button className="button button-primary" type="submit" disabled={status.saving}>
              {status.saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
            <button
              className="button button-ghost danger-button"
              type="button"
              onClick={onDeleteAccount}
              disabled={status.saving}
            >
              Akkauntni o`chirish
            </button>
          </form>
        )}

        {status.error && <p className="form-message error">{status.error}</p>}
        {status.success && <p className="form-message success">{status.success}</p>}
      </article>
    </section>
  );
}

export default ClientProfileEditPage;
