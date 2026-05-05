function PrivacyPage() {
  return (
    <section className="stack-medium reveal-up legal-page">
      <article className="card legal-card">
        <h1>Privacy Policy</h1>
        <p className="muted legal-meta">Oxirgi yangilanish: 2026-05-05 · Versiya: v1.1 (draft)</p>

        <h3>Huquqiy asos</h3>
        <p>
          Ushbu siyosat quyidagi asosiy huquqiy manbalarga tayangan holda tuzilgan:
        </p>
        <ul>
          <li>
            O&apos;zbekiston Respublikasi Qonuni “Shaxsga doir ma&apos;lumotlar to&apos;g&apos;risida”
            (02.07.2019, O&apos;RQ-547 / ZRU-547).
          </li>
          <li>
            O&apos;zbekiston Respublikasi Qonuni “Elektron tijorat to&apos;g&apos;risida”
            (29.04.2004, 613-II; 22.05.2015, O&apos;RQ-385).
          </li>
          <li>
            O&apos;zbekiston Respublikasi Qonuni “Iste&apos;molchilarning huquqlarini himoya qilish to&apos;g&apos;risida”.
          </li>
          <li>
            Xalqaro foydalanuvchilar uchun moslik bo&apos;yicha: GDPR (EU 2016/679) va CCPA/CPRA
            (Cal. Civ. Code §1798.100 va keyingi bo&apos;limlar).
          </li>
        </ul>
        <p className="muted">
          Manbalar:
          {' '}
          <a href="https://lex.uz/" target="_blank" rel="noreferrer">Lex.uz</a>
          {' · '}
          <a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj" target="_blank" rel="noreferrer">GDPR</a>
          {' · '}
          <a href="https://leginfo.legislature.ca.gov/" target="_blank" rel="noreferrer">CCPA/CPRA</a>
          {' · '}
          <a href="https://clerk.com/docs" target="_blank" rel="noreferrer">Clerk Docs</a>
        </p>

        <h3>1. Qanday ma&apos;lumotlar yig&apos;iladi</h3>
        <p>
          Ro&apos;yxatdan o&apos;tish va xizmatdan foydalanish jarayonida ism, telefon, email, profil
          ma&apos;lumotlari, chat xabarlari va texnik loglar yig&apos;ilishi mumkin.
        </p>
        <ul>
          <li>Identifikatsiya: ism, email, telefon, akkaunt identifikatorlari.</li>
          <li>Profil ma&apos;lumotlari: mutaxassislik, tajriba, hudud, portfolio, rasmlar.</li>
          <li>Aloqa ma&apos;lumotlari: telegram/instagram username, qo&apos;shimcha raqam.</li>
          <li>Texnik ma&apos;lumotlar: qurilma/IP, brauzer turi, xatolik loglari, sessiya loglari.</li>
          <li>Kommunikatsiya: chat xabarlari, biriktirilgan fayllar, supportga yuborilgan murojaatlar.</li>
        </ul>

        <h3>2. Ma&apos;lumotdan foydalanish maqsadi</h3>
        <p>
          Ma&apos;lumotlar akkaunt yuritish, xavfsizlik, xizmat ko&apos;rsatishni yaxshilash, foydalanuvchilarni
          bog&apos;lash va texnik qo&apos;llab-quvvatlash uchun ishlatiladi.
        </p>
        <ul>
          <li>Autentifikatsiya va akkaunt xavfsizligini ta&apos;minlash.</li>
          <li>Mijoz va ustani platformada o&apos;zaro ulash.</li>
          <li>Firibgarlikning oldini olish va moderatsiya.</li>
          <li>Tizim ishlashi va mahsulotni takomillashtirish (analitika/monitoring).</li>
        </ul>

        <h3>3. Qayta ishlashning huquqiy asosi</h3>
        <p>
          Qayta ishlash quyidagi asoslarda amalga oshiriladi: foydalanuvchi roziligi, xizmat ko&apos;rsatish
          shartnomasini bajarish, qonuniy majburiyatlarni bajarish hamda platformaning qonuniy manfaatlari.
        </p>

        <h3>4. Uchinchi tomon xizmatlari</h3>
        <p>
          Autentifikatsiya va infratuzilma uchun uchinchi tomonlar (masalan, Clerk) ishlatilishi
          mumkin. Bunday xizmatlar o&apos;z maxfiylik siyosatiga ega.
        </p>
        <ul>
          <li>Auth provayderlar: ro&apos;yxatdan o&apos;tish/kirishni boshqarish.</li>
          <li>Hosting/CDN/log xizmatlari: texnik ishlashni ta&apos;minlash.</li>
          <li>Email/SMS yuborish xizmatlari: tasdiqlash va bildirishnomalar.</li>
        </ul>

        <h3>5. Saqlash muddati va o&apos;chirish</h3>
        <p>
          Ma&apos;lumotlar xizmat ko&apos;rsatish maqsadlari uchun zarur bo&apos;lgan muddat davomida saqlanadi.
          Maqsad tugaganda yoki foydalanuvchi qonuniy so&apos;rov yuborganda data anonymizatsiya qilinadi
          yoki o&apos;chiriladi (qonun bilan belgilangan saqlash majburiyatlari bundan mustasno).
        </p>

        <h3>6. Saqlash va himoya</h3>
        <p>
          Ma&apos;lumotlar ruxsatsiz kirishdan himoyalash uchun tashkiliy va texnik choralar qo&apos;llanadi.
          Ma&apos;lumotlar faqat zarur muddat davomida saqlanadi.
        </p>
        <ul>
          <li>Ruxsat boshqaruvi va autentifikatsiya nazorati.</li>
          <li>Transport va saqlash xavfsizligi bo&apos;yicha texnik choralar.</li>
          <li>Audit loglari va incident monitoring.</li>
        </ul>

        <h3>7. Foydalanuvchi huquqlari</h3>
        <p>
          Foydalanuvchi o&apos;z ma&apos;lumotini ko&apos;rish, yangilash va qonunchilik doirasida o&apos;chirishni
          so&apos;rash huquqiga ega.
        </p>
        <ul>
          <li>Ma&apos;lumotga kirish huquqi.</li>
          <li>Noto&apos;g&apos;ri ma&apos;lumotni tuzatish huquqi.</li>
          <li>Qonunchilik doirasida o&apos;chirishni so&apos;rash huquqi.</li>
          <li>Rozilikni qaytarib olish (agar qayta ishlash rozilikka tayanayotgan bo&apos;lsa).</li>
        </ul>

        <h3>8. Transchegaraviy uzatish</h3>
        <p>
          Xizmat infratuzilmasiga qarab ma&apos;lumotlar boshqa yurisdiksiyalardagi serverlarda qayta
          ishlanishi mumkin. Bunday holatlarda platforma tegishli huquqiy va texnik himoya choralarini
          qo&apos;llaydi.
        </p>

        <h3>9. Cookie va o&apos;xshash texnologiyalar</h3>
        <p>
          Sessiya boshqaruvi, xavfsizlik va analitika uchun cookie yoki o&apos;xshash texnologiyalar
          qo&apos;llanishi mumkin. Zarur bo&apos;lsa alohida Cookie Notice joriy etiladi.
        </p>

        <h3>10. Bog&apos;lanish</h3>
        <p>
          Maxfiylikka oid savollar bo&apos;yicha: support@ustazor.uz
        </p>

        <p className="muted">
          Eslatma: ushbu matn huquqiy draft hisoblanadi. Yakuniy versiya yurist tomonidan tekshirilishi
          tavsiya etiladi.
        </p>
      </article>
    </section>
  );
}

export default PrivacyPage;
