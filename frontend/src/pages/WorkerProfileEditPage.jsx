import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  ImagePlus,
  Info,
  Instagram,
  MapPin,
  Phone,
  PhoneCall,
  Save,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';

function WorkerProfileEditPage() {
  const {
    isAuthenticated,
    user,
    fetchMe,
    updateMe,
    fetchWorkerProfile,
    updateWorkerProfile,
  } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    secondaryPhoneNumber: '',
    telegramUsername: '',
    instagramUsername: '',
    specialization: '',
    experienceYears: 0,
    serviceCity: '',
    about: '',
    isAvailable: true,
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [profileUserType, setProfileUserType] = useState('worker');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [hasCustomPhoto, setHasCustomPhoto] = useState(false);
  const [status, setStatus] = useState({ loading: true, saving: false, error: '', success: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;

    Promise.all([fetchMe(), fetchWorkerProfile()])
      .then(([me, worker]) => {
        if (!active) {
          return;
        }

        setForm({
          fullName: me.full_name || '',
          phoneNumber: me.phone_number || '',
          secondaryPhoneNumber: me.secondary_phone_number || '',
          telegramUsername: me.telegram_username || '',
          instagramUsername: me.instagram_username || '',
          specialization: worker.specialization || '',
          experienceYears: worker.experience_years ?? 0,
          serviceCity: worker.service_city || '',
          about: worker.about || '',
          isAvailable: Boolean(worker.is_available),
        });
        const nextUserType = me.user_type || 'worker';
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
  }, [isAuthenticated, fetchMe, fetchWorkerProfile]);

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

    const userPayload = new FormData();
    userPayload.append('full_name', form.fullName);
    userPayload.append('phone_number', form.phoneNumber);
    userPayload.append('secondary_phone_number', form.secondaryPhoneNumber);
    userPayload.append('telegram_username', form.telegramUsername);
    userPayload.append('instagram_username', form.instagramUsername);
    if (photoFile) {
      userPayload.append('profile_photo', photoFile);
    }
    if (removePhoto && !photoFile) {
      userPayload.append('remove_profile_photo', 'true');
    }

    const workerPayload = {
      specialization: form.specialization,
      experience_years: Number(form.experienceYears || 0),
      service_city: form.serviceCity,
      about: form.about,
      is_available: Boolean(form.isAvailable),
    };

    try {
      await updateMe(userPayload);
      await updateWorkerProfile(workerPayload);
      setStatus({
        loading: false,
        saving: false,
        error: '',
        success: 'Usta profili yangilandi.',
      });
    } catch (error) {
      setStatus({
        loading: false,
        saving: false,
        error: error.message || 'Profilni saqlashda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user?.user_type && user.user_type !== 'worker') {
    return <Navigate to="/profile" replace />;
  }

  return (
    <section className="profile-shell reveal-up">
      <article className="profile-card card">
        <div className="profile-edit-head">
          <h2>Usta profilini tahrirlash</h2>
          <Link to="/profile" className="button button-ghost">
            <ArrowLeft size={16} />
            Orqaga
          </Link>
        </div>
        <p className="auth-subtitle">
          Bu yerda faqat profil ma`lumotlari yangilanadi. Xizmatlarni profil sahifasida modal
          orqali boshqarasiz.
        </p>

        {status.loading ? (
          <p className="muted">Yuklanmoqda...</p>
        ) : (
          <form className="stack-small" onSubmit={onSubmit}>
            <div className="profile-photo-editor">
              <img src={photoPreview} alt="Profil rasmi" className="profile-avatar profile-avatar-editor" />
              <div className="profile-photo-actions">
                <div className="profile-photo-action-row">
                  <label className="button button-ghost" htmlFor="worker-profile-photo-input">
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
                  id="worker-profile-photo-input"
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
                <label className="label label-with-icon" htmlFor="worker-full-name">
                  <User size={14} />
                  To`liq ism
                </label>
                <input
                  id="worker-full-name"
                  className="input"
                  value={form.fullName}
                  onChange={updateField('fullName')}
                  required
                />
              </div>
              <div>
                <label className="label label-with-icon" htmlFor="worker-phone">
                  <Phone size={14} />
                  Telefon raqam
                </label>
                <input
                  id="worker-phone"
                  className="input"
                  value={form.phoneNumber}
                  onChange={updateField('phoneNumber')}
                  required
                />
              </div>
              <div>
                <label className="label label-with-icon" htmlFor="worker-telegram">
                  <Send size={14} />
                  Telegram username
                </label>
                <input
                  id="worker-telegram"
                  className="input"
                  value={form.telegramUsername}
                  onChange={updateField('telegramUsername')}
                  placeholder="@username"
                />
              </div>
              <div>
                <label className="label label-with-icon" htmlFor="worker-secondary-phone">
                  <PhoneCall size={14} />
                  Qo`shimcha telefon
                </label>
                <input
                  id="worker-secondary-phone"
                  className="input"
                  value={form.secondaryPhoneNumber}
                  onChange={updateField('secondaryPhoneNumber')}
                  placeholder="+998901112233"
                />
              </div>
              <div>
                <label className="label label-with-icon" htmlFor="worker-instagram">
                  <Instagram size={14} />
                  Instagram username
                </label>
                <input
                  id="worker-instagram"
                  className="input"
                  value={form.instagramUsername}
                  onChange={updateField('instagramUsername')}
                  placeholder="@username"
                />
              </div>
            </div>

            <div className="profile-grid">
              <div>
                <label className="label label-with-icon" htmlFor="worker-specialization">
                  <Briefcase size={14} />
                  Mutaxassislik
                </label>
                <input
                  id="worker-specialization"
                  className="input"
                  value={form.specialization}
                  onChange={updateField('specialization')}
                  placeholder="Masalan: Elektrik, santexnik"
                />
              </div>
              <div>
                <label className="label" htmlFor="worker-experience">
                  Tajriba (yil)
                </label>
                <input
                  id="worker-experience"
                  className="input"
                  type="number"
                  min="0"
                  value={form.experienceYears}
                  onChange={updateField('experienceYears')}
                />
              </div>
            </div>

            <div className="profile-grid">
              <div>
                <label className="label label-with-icon" htmlFor="worker-city">
                  <MapPin size={14} />
                  Xizmat hududi
                </label>
                <input
                  id="worker-city"
                  className="input"
                  value={form.serviceCity}
                  onChange={updateField('serviceCity')}
                  placeholder="Masalan: Toshkent"
                />
              </div>
            </div>

            <div>
              <label className="label label-with-icon" htmlFor="worker-about">
                <Info size={14} />
                O`zim haqimda
              </label>
              <textarea
                id="worker-about"
                className="input"
                rows={5}
                value={form.about}
                onChange={updateField('about')}
                placeholder="Qaysi ishlarni bajarasiz, qanday tajribangiz bor..."
              />
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={updateField('isAvailable')}
              />
              Hozir buyurtmalarni qabul qilaman
            </label>
            <button className="button button-primary" type="submit" disabled={status.saving}>
              <Save size={16} />
              {status.saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
            <Link className="button button-ghost" to="/profile">
              Xizmatlarni boshqarish
            </Link>
          </form>
        )}

        {status.error && <p className="form-message error">{status.error}</p>}
        {status.success && <p className="form-message success">{status.success}</p>}
      </article>
    </section>
  );
}

export default WorkerProfileEditPage;
