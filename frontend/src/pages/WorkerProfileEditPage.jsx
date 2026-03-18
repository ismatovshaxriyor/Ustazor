import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
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
    specialization: '',
    experienceYears: 0,
    serviceCity: '',
    about: '',
    minOrderPrice: '',
    isAvailable: true,
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
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
          specialization: worker.specialization || '',
          experienceYears: worker.experience_years ?? 0,
          serviceCity: worker.service_city || '',
          about: worker.about || '',
          minOrderPrice: worker.min_order_price || '',
          isAvailable: Boolean(worker.is_available),
        });
        setPhotoPreview(resolveMediaUrl(me.profile_photo_url, { userType: 'worker' }));
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

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus((prev) => ({ ...prev, saving: true, error: '', success: '' }));

    const userPayload = new FormData();
    userPayload.append('full_name', form.fullName);
    userPayload.append('phone_number', form.phoneNumber);
    if (photoFile) {
      userPayload.append('profile_photo', photoFile);
    }

    const workerPayload = {
      specialization: form.specialization,
      experience_years: Number(form.experienceYears || 0),
      service_city: form.serviceCity,
      about: form.about,
      is_available: Boolean(form.isAvailable),
      min_order_price: form.minOrderPrice === '' ? null : form.minOrderPrice,
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
                <label className="button button-ghost" htmlFor="worker-profile-photo-input">
                  Rasm tanlash
                </label>
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
                <label className="label" htmlFor="worker-full-name">
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
                <label className="label" htmlFor="worker-phone">
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
            </div>

            <div className="profile-grid">
              <div>
                <label className="label" htmlFor="worker-specialization">
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
                <label className="label" htmlFor="worker-city">
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
              <div>
                <label className="label" htmlFor="worker-price">
                  Minimal narx (so`m)
                </label>
                <input
                  id="worker-price"
                  className="input"
                  type="number"
                  min="0"
                  value={form.minOrderPrice}
                  onChange={updateField('minOrderPrice')}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="worker-about">
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
