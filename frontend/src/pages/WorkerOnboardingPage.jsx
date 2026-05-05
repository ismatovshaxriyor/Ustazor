import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STEP_TITLES = [
  'Asosiy ma`lumot',
  'Ish ma`lumotlari',
  'Xizmatlar',
  'Ish namunalari',
  "Bog'lanish",
];

const initialServiceForm = {
  title: '',
  description: '',
  minPrice: '',
  maxPrice: '',
  experienceYears: 0,
  extraInfo: '',
};

const initialPortfolioForm = {
  title: '',
  description: '',
  location: '',
  completedAt: '',
  images: [],
};

function WorkerOnboardingPage() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    user,
    fetchMe,
    updateMe,
    fetchWorkerProfile,
    updateWorkerProfile,
    fetchWorkerSkills,
    createWorkerSkill,
    fetchMyPortfolio,
    createPortfolio,
  } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [serviceCount, setServiceCount] = useState(0);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phoneNumber: '',
    specialization: '',
    serviceCity: '',
    experienceYears: 0,
    about: '',
    isAvailable: true,
  });
  const [serviceForm, setServiceForm] = useState(initialServiceForm);
  const [portfolioForm, setPortfolioForm] = useState(initialPortfolioForm);
  const [contactForm, setContactForm] = useState({
    telegramUsername: '',
    instagramUsername: '',
    secondaryPhoneNumber: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    Promise.all([fetchMe(), fetchWorkerProfile(), fetchWorkerSkills(), fetchMyPortfolio()])
      .then(([me, workerProfile, skillsResponse, portfolioResponse]) => {
        if (!active) {
          return;
        }
        setProfileForm({
          fullName: me.full_name || '',
          phoneNumber: me.phone_number || '',
          specialization: workerProfile.specialization || '',
          serviceCity: workerProfile.service_city || '',
          experienceYears: workerProfile.experience_years ?? 0,
          about: workerProfile.about || '',
          isAvailable: Boolean(workerProfile.is_available),
        });
        setContactForm({
          telegramUsername: me.telegram_username || '',
          instagramUsername: me.instagram_username || '',
          secondaryPhoneNumber: me.secondary_phone_number || '',
        });
        const skills = Array.isArray(skillsResponse) ? skillsResponse : (skillsResponse.results || []);
        const portfolio = Array.isArray(portfolioResponse)
          ? portfolioResponse
          : (portfolioResponse.results || []);
        setServiceCount(skills.length);
        setPortfolioCount(portfolio.length);
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }
        setError(loadError.message || 'Onboarding ma`lumotlarini yuklab bo`lmadi.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, fetchMe, fetchWorkerProfile, fetchWorkerSkills, fetchMyPortfolio]);

  const stepTitle = useMemo(() => STEP_TITLES[step - 1] || '', [step]);

  const updateProfileField = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateServiceField = (field) => (event) => {
    const value = event.target.value;
    setServiceForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePortfolioField = (field) => (event) => {
    if (field === 'images') {
      setPortfolioForm((prev) => ({ ...prev, images: Array.from(event.target.files || []) }));
      return;
    }
    setPortfolioForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const updateContactField = (field) => (event) => {
    setContactForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const nextStep = () => {
    setError('');
    setSuccess('');
    setStep((prev) => Math.min(prev + 1, STEP_TITLES.length));
  };

  const prevStep = () => {
    setError('');
    setSuccess('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const saveStepOne = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = new FormData();
      payload.append('full_name', profileForm.fullName);
      payload.append('phone_number', profileForm.phoneNumber);
      await updateMe(payload);
      setSuccess("Asosiy ma`lumotlar saqlandi.");
      nextStep();
    } catch (saveError) {
      setError(saveError.message || "Asosiy ma`lumotlarni saqlab bo`lmadi.");
    } finally {
      setSaving(false);
    }
  };

  const saveStepTwo = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateWorkerProfile({
        specialization: profileForm.specialization,
        service_city: profileForm.serviceCity,
        experience_years: Number(profileForm.experienceYears || 0),
        about: profileForm.about,
        is_available: Boolean(profileForm.isAvailable),
      });
      setSuccess("Ish bo`yicha ma`lumotlar saqlandi.");
      nextStep();
    } catch (saveError) {
      setError(saveError.message || "Ish ma`lumotlarini saqlab bo`lmadi.");
    } finally {
      setSaving(false);
    }
  };

  const saveService = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const minPrice = serviceForm.minPrice === '' ? null : Number(serviceForm.minPrice);
      const maxPrice = serviceForm.maxPrice === '' ? null : Number(serviceForm.maxPrice);
      await createWorkerSkill({
        title: serviceForm.title,
        description: serviceForm.description,
        min_price: minPrice,
        max_price: maxPrice,
        experience_years: Number(serviceForm.experienceYears || 0),
        extra_info: serviceForm.extraInfo,
        is_active: true,
      });
      setServiceCount((prev) => prev + 1);
      setServiceForm(initialServiceForm);
      setSuccess("Xizmat qo`shildi. Yana qo`shishingiz yoki keyingi qadamga o`tishingiz mumkin.");
    } catch (saveError) {
      setError(saveError.message || "Xizmatni saqlab bo`lmadi.");
    } finally {
      setSaving(false);
    }
  };

  const savePortfolio = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = new FormData();
      payload.append('title', portfolioForm.title);
      payload.append('description', portfolioForm.description);
      payload.append('location', portfolioForm.location);
      if (portfolioForm.completedAt) {
        payload.append('completed_at', portfolioForm.completedAt);
      }
      portfolioForm.images.forEach((image) => payload.append('images', image));
      await createPortfolio(payload);
      setPortfolioCount((prev) => prev + 1);
      setPortfolioForm(initialPortfolioForm);
      setSuccess("Ish namunasi qo`shildi. Yana qo`shishingiz yoki keyingi qadamga o`tishingiz mumkin.");
    } catch (saveError) {
      setError(saveError.message || "Ish namunasini saqlab bo`lmadi.");
    } finally {
      setSaving(false);
    }
  };

  const finishOnboarding = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = new FormData();
      payload.append('telegram_username', contactForm.telegramUsername);
      payload.append('instagram_username', contactForm.instagramUsername);
      payload.append('secondary_phone_number', contactForm.secondaryPhoneNumber);
      await updateMe(payload);
      navigate('/profile', { replace: true });
    } catch (saveError) {
      setError(saveError.message || "Bog'lanish ma`lumotlarini saqlab bo`lmadi.");
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/auth/login?next=%2Fauth%2Fworker-onboarding" replace />;
  }

  if (user?.user_type && user.user_type !== 'worker') {
    return <Navigate to="/profile" replace />;
  }

  if (loading) {
    return (
      <section className="auth-shell reveal-up">
        <article className="auth-card card">
          <p className="muted">Onboarding yuklanmoqda...</p>
        </article>
      </section>
    );
  }

  return (
    <section className="auth-shell reveal-up">
      <article className="auth-card card worker-onboarding-card">
        <p className="eyebrow">usta onboarding</p>
        <h2>{`${step}. ${stepTitle}`}</h2>
        <p className="auth-subtitle">{`Qadam ${step}/${STEP_TITLES.length}`}</p>

        <div className="worker-onboarding-progress">
          {STEP_TITLES.map((item, index) => (
            <span
              key={item}
              className={`worker-onboarding-dot${index + 1 <= step ? ' active' : ''}`}
              aria-label={item}
            />
          ))}
        </div>

        {step === 1 && (
          <form className="stack-small" onSubmit={saveStepOne}>
            <label className="label" htmlFor="worker-onboard-name">To`liq ism</label>
            <input
              id="worker-onboard-name"
              className="input"
              value={profileForm.fullName}
              onChange={updateProfileField('fullName')}
              required
            />
            <label className="label" htmlFor="worker-onboard-phone">Telefon raqam</label>
            <input
              id="worker-onboard-phone"
              className="input"
              value={profileForm.phoneNumber}
              onChange={updateProfileField('phoneNumber')}
              required
            />
            <button className="button button-primary full-width" type="submit" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Davom etish'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="stack-small" onSubmit={saveStepTwo}>
            <div className="profile-grid">
              <div>
                <label className="label" htmlFor="worker-onboard-specialization">Mutaxassislik</label>
                <input
                  id="worker-onboard-specialization"
                  className="input"
                  value={profileForm.specialization}
                  onChange={updateProfileField('specialization')}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="worker-onboard-experience">Tajriba (yil)</label>
                <input
                  id="worker-onboard-experience"
                  className="input"
                  type="number"
                  min="0"
                  value={profileForm.experienceYears}
                  onChange={updateProfileField('experienceYears')}
                />
              </div>
            </div>
            <label className="label" htmlFor="worker-onboard-city">Xizmat hududi</label>
            <input
              id="worker-onboard-city"
              className="input"
              value={profileForm.serviceCity}
              onChange={updateProfileField('serviceCity')}
              required
            />
            <label className="label" htmlFor="worker-onboard-about">Qisqa ma`lumot</label>
            <textarea
              id="worker-onboard-about"
              className="input"
              rows={4}
              value={profileForm.about}
              onChange={updateProfileField('about')}
            />
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={profileForm.isAvailable}
                onChange={updateProfileField('isAvailable')}
              />
              Hozir buyurtmalarni qabul qilaman
            </label>
            <button className="button button-primary full-width" type="submit" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Davom etish'}
            </button>
          </form>
        )}

        {step === 3 && (
          <form className="stack-small" onSubmit={saveService}>
            <p className="muted">{`Qo'shilgan xizmatlar: ${serviceCount}`}</p>
            <label className="label" htmlFor="worker-onboard-service-title">Xizmat nomi</label>
            <input
              id="worker-onboard-service-title"
              className="input"
              value={serviceForm.title}
              onChange={updateServiceField('title')}
              placeholder="Masalan: Elektr montaj"
              required
            />
            <label className="label" htmlFor="worker-onboard-service-description">Izoh</label>
            <textarea
              id="worker-onboard-service-description"
              className="input"
              rows={3}
              value={serviceForm.description}
              onChange={updateServiceField('description')}
            />
            <div className="profile-grid">
              <div>
                <label className="label" htmlFor="worker-onboard-service-min">Minimal narx</label>
                <input
                  id="worker-onboard-service-min"
                  className="input"
                  type="number"
                  min="0"
                  value={serviceForm.minPrice}
                  onChange={updateServiceField('minPrice')}
                />
              </div>
              <div>
                <label className="label" htmlFor="worker-onboard-service-max">Maksimal narx</label>
                <input
                  id="worker-onboard-service-max"
                  className="input"
                  type="number"
                  min="0"
                  value={serviceForm.maxPrice}
                  onChange={updateServiceField('maxPrice')}
                />
              </div>
            </div>
            <button className="button button-primary full-width" type="submit" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : "Xizmat qo'shish"}
            </button>
            <button type="button" className="button button-ghost full-width" onClick={nextStep}>
              O`tkazib yuborish
            </button>
          </form>
        )}

        {step === 4 && (
          <form className="stack-small" onSubmit={savePortfolio}>
            <p className="muted">{`Qo'shilgan ish namunalari: ${portfolioCount}`}</p>
            <label className="label" htmlFor="worker-onboard-portfolio-title">Ish sarlavhasi</label>
            <input
              id="worker-onboard-portfolio-title"
              className="input"
              value={portfolioForm.title}
              onChange={updatePortfolioField('title')}
              required
            />
            <label className="label" htmlFor="worker-onboard-portfolio-description">Tavsif</label>
            <textarea
              id="worker-onboard-portfolio-description"
              className="input"
              rows={3}
              value={portfolioForm.description}
              onChange={updatePortfolioField('description')}
            />
            <div className="profile-grid">
              <div>
                <label className="label" htmlFor="worker-onboard-portfolio-location">Hudud</label>
                <input
                  id="worker-onboard-portfolio-location"
                  className="input"
                  value={portfolioForm.location}
                  onChange={updatePortfolioField('location')}
                />
              </div>
              <div>
                <label className="label" htmlFor="worker-onboard-portfolio-date">Sana</label>
                <input
                  id="worker-onboard-portfolio-date"
                  className="input"
                  type="date"
                  value={portfolioForm.completedAt}
                  onChange={updatePortfolioField('completedAt')}
                />
              </div>
            </div>
            <label className="label" htmlFor="worker-onboard-portfolio-images">Rasmlar</label>
            <input
              id="worker-onboard-portfolio-images"
              className="input"
              type="file"
              accept="image/*"
              multiple
              onChange={updatePortfolioField('images')}
            />
            <button className="button button-primary full-width" type="submit" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Ish namunasini qo`shish'}
            </button>
            <button type="button" className="button button-ghost full-width" onClick={nextStep}>
              O`tkazib yuborish
            </button>
          </form>
        )}

        {step === 5 && (
          <form className="stack-small" onSubmit={finishOnboarding}>
            <label className="label" htmlFor="worker-onboard-telegram">Telegram username</label>
            <input
              id="worker-onboard-telegram"
              className="input"
              value={contactForm.telegramUsername}
              onChange={updateContactField('telegramUsername')}
              placeholder="@username"
            />
            <label className="label" htmlFor="worker-onboard-instagram">Instagram username</label>
            <input
              id="worker-onboard-instagram"
              className="input"
              value={contactForm.instagramUsername}
              onChange={updateContactField('instagramUsername')}
              placeholder="@username"
            />
            <label className="label" htmlFor="worker-onboard-secondary-phone">Qo`shimcha telefon</label>
            <input
              id="worker-onboard-secondary-phone"
              className="input"
              value={contactForm.secondaryPhoneNumber}
              onChange={updateContactField('secondaryPhoneNumber')}
              placeholder="+998901112233"
            />
            <button className="button button-primary full-width" type="submit" disabled={saving}>
              {saving ? 'Yakunlanmoqda...' : 'Onboardingni yakunlash'}
            </button>
          </form>
        )}

        <div className="worker-onboarding-actions">
          <button
            type="button"
            className="button button-ghost"
            onClick={prevStep}
            disabled={step === 1 || saving}
          >
            Orqaga
          </button>
        </div>

        {error && <p className="form-message error">{error}</p>}
        {success && <p className="form-message success">{success}</p>}
      </article>
    </section>
  );
}

export default WorkerOnboardingPage;
