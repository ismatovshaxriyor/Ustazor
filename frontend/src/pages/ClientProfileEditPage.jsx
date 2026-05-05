import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Instagram, Phone, PhoneCall, Save, Send, Trash2, User, UserX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';

function ClientProfileEditPage() {
  const navigate = useNavigate();
  const { isAuthenticated, fetchMe, updateMe, deleteAccount } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    secondaryPhoneNumber: '',
    telegramUsername: '',
    instagramUsername: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [profileUserType, setProfileUserType] = useState('client');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [hasCustomPhoto, setHasCustomPhoto] = useState(false);
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
          secondaryPhoneNumber: me.secondary_phone_number || '',
          telegramUsername: me.telegram_username || '',
          instagramUsername: me.instagram_username || '',
        });
        const nextUserType = me.user_type || 'client';
        const rawPhotoUrl = `${me.profile_photo_url || ''}`;
        const isDefaultPhoto =
          !rawPhotoUrl
          || rawPhotoUrl.includes('default_client.png')
          || rawPhotoUrl.includes('default_worker.png')
          || rawPhotoUrl.includes('default_user.png');
        setProfileUserType(nextUserType);
        setHasCustomPhoto(!isDefaultPhoto);
        setRemovePhoto(false);
        setPhotoPreview(resolveMediaUrl(rawPhotoUrl, { userType: nextUserType }));
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

    setRemovePhoto(false);
    setHasCustomPhoto(true);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onRemovePhoto = () => {
    setPhotoFile(null);
    setRemovePhoto(true);
    setHasCustomPhoto(false);
    setPhotoPreview(resolveMediaUrl('', { userType: profileUserType }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus((prev) => ({ ...prev, saving: true, error: '', success: '' }));

    const payload = new FormData();
    payload.append('full_name', form.fullName);
    payload.append('phone_number', form.phoneNumber);
    payload.append('secondary_phone_number', form.secondaryPhoneNumber);
    payload.append('telegram_username', form.telegramUsername);
    payload.append('instagram_username', form.instagramUsername);
    if (photoFile) {
      payload.append('profile_photo', photoFile);
    }
    if (removePhoto && !photoFile) {
      payload.append('remove_profile_photo', 'true');
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
            <ArrowLeft size={16} />
            Orqaga
          </Link>
        </div>
        <p className="auth-subtitle">Rasm, ism va bog`lanish ma`lumotlarini yangilang.</p>

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
                <div className="profile-photo-action-row">
                  <label className="button button-ghost" htmlFor="profile-photo-input">
                    <ImagePlus size={16} />
                    Rasm tanlash
                  </label>
                  {hasCustomPhoto ? (
                    <button
                      type="button"
                      className="button button-ghost danger-button"
                      onClick={onRemovePhoto}
                    >
                      <Trash2 size={16} />
                      Rasmni olib tashlash
                    </button>
                  ) : null}
                </div>
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
                <label className="label label-with-icon" htmlFor="profile-full-name">
                  <User size={14} />
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
                <label className="label label-with-icon" htmlFor="profile-phone">
                  <Phone size={14} />
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

              <div>
                <label className="label label-with-icon" htmlFor="profile-secondary-phone">
                  <PhoneCall size={14} />
                  Qo`shimcha telefon
                </label>
                <input
                  id="profile-secondary-phone"
                  className="input"
                  value={form.secondaryPhoneNumber}
                  onChange={updateField('secondaryPhoneNumber')}
                  placeholder="+998901112233"
                />
              </div>

              <div>
                <label className="label label-with-icon" htmlFor="profile-telegram">
                  <Send size={14} />
                  Telegram username
                </label>
                <input
                  id="profile-telegram"
                  className="input"
                  value={form.telegramUsername}
                  onChange={updateField('telegramUsername')}
                  placeholder="@username"
                />
              </div>

              <div>
                <label className="label label-with-icon" htmlFor="profile-instagram">
                  <Instagram size={14} />
                  Instagram username
                </label>
                <input
                  id="profile-instagram"
                  className="input"
                  value={form.instagramUsername}
                  onChange={updateField('instagramUsername')}
                  placeholder="@username"
                />
              </div>
            </div>

            <button className="button button-primary" type="submit" disabled={status.saving}>
              <Save size={16} />
              {status.saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
            <button
              className="button button-ghost danger-button"
              type="button"
              onClick={onDeleteAccount}
              disabled={status.saving}
            >
              <UserX size={16} />
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
