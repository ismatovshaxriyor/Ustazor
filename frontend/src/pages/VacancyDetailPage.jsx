import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatBudget, formatDate } from '../utils/format';

function VacancyDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAuthenticated, user, applyToVacancy, fetchMyProposals } = useAuth();
  const [vacancy, setVacancy] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [existingProposal, setExistingProposal] = useState(null);
  const [applyForm, setApplyForm] = useState({
    coverLetter: '',
    proposedPrice: '',
  });
  const [applyStatus, setApplyStatus] = useState({ saving: false, error: '', success: '' });

  const isWorker = isAuthenticated && user?.user_type === 'worker';

  useEffect(() => {
    let active = true;
    setStatus({ loading: true, error: '' });
    setAlreadyApplied(false);
    setExistingProposal(null);
    setApplyStatus({ saving: false, error: '', success: '' });

    const vacancyPromise = authApi.getPublicVacancy(id);
    const myProposalsPromise = isWorker
      ? fetchMyProposals().catch(() => [])
      : Promise.resolve([]);

    Promise.all([vacancyPromise, myProposalsPromise])
      .then(([vacancyData, proposalsData]) => {
        if (!active) {
          return;
        }

        setVacancy(vacancyData);

        const proposalList = Array.isArray(proposalsData)
          ? proposalsData
          : (proposalsData.results || []);

        const currentProposal = proposalList.find((item) => Number(item.vacancy_id) === Number(id)) || null;
        const isAlreadySent = Boolean(currentProposal);
        setAlreadyApplied(isAlreadySent);
        setExistingProposal(currentProposal);
        setStatus({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setVacancy(null);
        setStatus({
          loading: false,
          error: error.message || 'Vakansiya topilmadi.',
        });
      });

    return () => {
      active = false;
    };
  }, [id, isWorker, fetchMyProposals]);

  const onApplyFieldChange = (field) => (event) => {
    setApplyForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const openApplyModal = () => {
    setApplyStatus({ saving: false, error: '', success: '' });
    setIsApplyModalOpen(true);
  };

  const closeApplyModal = () => {
    setIsApplyModalOpen(false);
  };

  const onSubmitApply = async (event) => {
    event.preventDefault();
    setApplyStatus({ saving: true, error: '', success: '' });

    try {
      const created = await applyToVacancy(id, {
        cover_letter: applyForm.coverLetter,
        proposed_price: applyForm.proposedPrice ? applyForm.proposedPrice : null,
      });
      setAlreadyApplied(true);
      setExistingProposal(created);
      setApplyForm({ coverLetter: '', proposedPrice: '' });
      setApplyStatus({ saving: false, error: '', success: 'Murojaatingiz yuborildi. Chatga yo`naltirilmoqda...' });
      setIsApplyModalOpen(false);

      if (created?.chat_thread_id) {
        navigate(`/chat/${created.chat_thread_id}`);
      }
    } catch (error) {
      setApplyStatus({
        saving: false,
        error: error.message || 'Murojaat yuborishda xatolik yuz berdi.',
        success: '',
      });
    }
  };

  if (status.loading) {
    return (
      <section className="empty-state">
        <p className="muted">Vakansiya yuklanmoqda...</p>
      </section>
    );
  }

  if (!vacancy) {
    return (
      <section className="empty-state">
        <h1>Vakansiya topilmadi</h1>
        <Link to="/elonlar" className="button button-primary">
          E'lonlar ro'yxatiga qaytish
        </Link>
        {status.error && <p className="form-message error">{status.error}</p>}
      </section>
    );
  }

  return (
    <section className="profile-layout reveal-up">
      <article className="profile-main card">
        <p className="pill">{vacancy.category || 'Boshqa yo`nalish'}</p>
        <h1>{vacancy.title}</h1>
        <p className="muted">
          {vacancy.city || 'Shahar kiritilmagan'} · Joylangan: {formatDate(vacancy.created_at)}
        </p>
        <p>{vacancy.description}</p>

        {vacancy.address && (
          <>
            <h3>Manzil</h3>
            <p>{vacancy.address}</p>
          </>
        )}

        <h3>Qo`shimcha ma`lumot</h3>
        <ul className="list-clean">
          <li>Narx turi: {vacancy.price_type === 'fixed' ? 'Aniq narx' : 'Kelishish asosida'}</li>
          <li>Mijoz: {vacancy.client_name || 'Foydalanuvchi'}</li>
          <li>Muddat: {vacancy.due_date ? formatDate(vacancy.due_date) : 'Kelishiladi'}</li>
        </ul>
      </article>

      <aside className="profile-side card">
        <p className="price">{formatBudget(vacancy)}</p>
        <p className="muted">Holati: {vacancy.status === 'open' ? 'Yangi' : vacancy.status}</p>

        {isWorker ? (
          <button
            className="button button-primary full-width"
            type="button"
            onClick={() => {
              if (alreadyApplied && existingProposal?.chat_thread_id) {
                navigate(`/chat/${existingProposal.chat_thread_id}`);
                return;
              }
              openApplyModal();
            }}
          >
            {alreadyApplied ? 'Chatni ochish' : 'Murojaat qilish'}
          </button>
        ) : isAuthenticated ? (
          <p className="muted">Murojaat yuborish faqat usta akkaunti uchun ochiq.</p>
        ) : (
          <Link to="/auth/login" className="button button-primary full-width">
            Kirib murojaat qiling
          </Link>
        )}
        <Link to="/chat" className="button button-ghost full-width">
          Mijoz bilan chat
        </Link>
        {applyStatus.error && <p className="form-message error">{applyStatus.error}</p>}
        {applyStatus.success && <p className="form-message success">{applyStatus.success}</p>}
      </aside>

      {isApplyModalOpen && (
        <div className="modal-backdrop" onClick={closeApplyModal} role="presentation">
          <article className="modal-card card" onClick={(event) => event.stopPropagation()}>
            <div className="section-row-head">
              <h3>E`longa murojaat yuborish</h3>
              <button type="button" className="button button-ghost" onClick={closeApplyModal}>
                Yopish
              </button>
            </div>

            {applyStatus.error && <p className="form-message error">{applyStatus.error}</p>}

            <form className="stack-small" onSubmit={onSubmitApply}>
              <div>
                <label className="label" htmlFor="proposal-cover-letter">
                  Murojaat xati
                </label>
                <textarea
                  id="proposal-cover-letter"
                  className="input"
                  rows={4}
                  value={applyForm.coverLetter}
                  onChange={onApplyFieldChange('coverLetter')}
                  placeholder="Qisqacha tajribangizni va ishni qanday bajarishingizni yozing."
                />
              </div>

              <div>
                <label className="label" htmlFor="proposal-price">
                  Taklif narxi (so`m, ixtiyoriy)
                </label>
                <input
                  id="proposal-price"
                  className="input"
                  type="number"
                  min="1"
                  value={applyForm.proposedPrice}
                  onChange={onApplyFieldChange('proposedPrice')}
                  placeholder="Masalan: 2500000"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={closeApplyModal}>
                  Bekor qilish
                </button>
                <button className="button button-primary" type="submit" disabled={applyStatus.saving}>
                  {applyStatus.saving ? 'Yuborilmoqda...' : 'Murojaat yuborish'}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
    </section>
  );
}

export default VacancyDetailPage;
