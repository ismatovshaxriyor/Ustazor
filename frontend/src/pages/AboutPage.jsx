import { Link } from 'react-router-dom';

const whyUstazor = [
  {
    title: "Aniq yo'naltirilgan qidiruv",
    description:
      "Mijozlar xizmat turi, hudud, narx va tajribaga qarab ustani tez topadi.",
  },
  {
    title: 'Tasdiqlangan profil ma`lumotlari',
    description:
      "Ustalar profilida aloqa, tajriba, xizmatlar va ish narxlari ochiq ko`rsatiladi.",
  },
  {
    title: 'Tez va qulay bog`lanish',
    description:
      "Mijoz bevosita usta bilan gaplashadi, kelishuvga keladi va ishni boshlaydi.",
  },
  {
    title: 'Barqaror hamkorlik',
    description:
      "Ustalar yangi buyurtma oqimini, mijozlar esa ishonchli ijrochini doimiy oladi.",
  },
];

const workflow = [
  {
    title: '1. Buyurtma yoki qidiruv',
    description:
      "Mijoz qidiruv orqali mos ustani topadi yoki vakansiya/buyurtma e`lonini joylaydi.",
  },
  {
    title: '2. Aloqa va kelishuv',
    description:
      "Tomonlar chat yoki telefon orqali narx, muddat va ish hajmini kelishib oladi.",
  },
  {
    title: '3. Ish bajarilishi',
    description:
      "Usta ishni bajaradi, mijoz natijani tasdiqlaydi va keyingi hamkorlik uchun baho beradi.",
  },
  {
    title: '4. Profil o`sishi',
    description:
      "Ustalar xizmatlarini, portfolio va xizmat hududini boyitib boradi.",
  },
];

function AboutPage() {
  return (
    <section className="stack-large reveal-up">
      <div className="section-heading">
        <p className="eyebrow">biz haqimizda</p>
        <h1>Ustazor - usta va mijozni bog`laydigan platforma</h1>
        <p className="muted">
          Bizning maqsadimiz - xizmat topish jarayonini shaffof, tez va ishonchli qilish.
        </p>
      </div>

      <article className="card section-block">
        <p className="auth-subtitle">
          Ustazor O`zbekiston bo`ylab ishlovchi raqamli bozor: bu yerda mijozlar uy, ofis va
          biznes uchun kerakli ustani tez topadi, ustalar esa o`z xizmatlarini aniq auditoriyaga
          taklif qiladi.
        </p>
        <div className="stats-grid">
          <article>
            <p className="stat-value">1,200+</p>
            <p className="stat-label">Faol usta profillari</p>
          </article>
          <article>
            <p className="stat-value">8,500+</p>
            <p className="stat-label">Bajarilgan buyurtmalar</p>
          </article>
          <article>
            <p className="stat-value">14</p>
            <p className="stat-label">Qamrab olingan hudud</p>
          </article>
        </div>
      </article>

      <section className="section-block card">
        <div className="section-row-head">
          <h2>Nima uchun aynan Ustazor?</h2>
        </div>
        <div className="steps-grid">
          {whyUstazor.map((item) => (
            <article className="step-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block card">
        <div className="section-row-head">
          <h2>Platforma qanday ishlaydi?</h2>
        </div>
        <div className="card-grid">
          {workflow.map((item) => (
            <article className="listing-card" key={item.title}>
              <h3>{item.title}</h3>
              <p className="muted">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dual-grid">
        <article className="card section-block">
          <p className="eyebrow">xavfsizlik</p>
          <h3>Ishonchli muhit yaratamiz</h3>
          <p className="muted">
            Hisoblar autentifikatsiya orqali himoyalanadi, usta profillari esa shaffof ma`lumotlar
            bilan taqdim etiladi. Bu mijoz uchun tanlovni, usta uchun esa ishonchni oshiradi.
          </p>
        </article>

        <article className="card section-block">
          <p className="eyebrow">o`sish</p>
          <h3>Usta va mijoz uchun real qiymat</h3>
          <p className="muted">
            Usta o`z xizmatlarini joylaydi, narx diapazonini belgilaydi va buyurtmalar oqimini
            kengaytiradi. Mijoz esa bitta platformada kerakli mutaxassisni topadi.
          </p>
        </article>
      </section>

      <section className="card section-block">
        <div className="section-heading">
          <p className="eyebrow">hamkorlik</p>
          <h2>Ishni boshlashga tayyormisiz?</h2>
          <p className="muted">
            Usta qidirmoqchimisiz yoki xizmat ko`rsatmoqchimisiz - bir necha daqiqada boshlashingiz
            mumkin.
          </p>
        </div>
        <div className="hero-actions">
          <Link to="/masters" className="button button-primary">
            Ustalarni qidirish
          </Link>
          <Link to="/auth/register" className="button button-ghost">
            Ro`yxatdan o`tish
          </Link>
        </div>
      </section>
    </section>
  );
}

export default AboutPage;
