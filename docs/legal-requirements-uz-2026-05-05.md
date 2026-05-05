# Ustazor uchun Legal Checklist (Draft)

Sana: 2026-05-05

## 1) O'zbekiston bo'yicha asosiy bazis

1. Shaxsga doir ma'lumotlar bo'yicha O'zbekiston qonunchiligi:
   - Privacy Policy'da ma'lumot turlari, maqsadlari, saqlash muddati, uchinchi tomonlarga uzatish va foydalanuvchi huquqlari aniq yozilishi kerak.
2. Elektron tijorat va elektron shartnoma qoidalari:
   - Terms of Service'da platforma roli, foydalanuvchi majburiyatlari, taklif/kelishuv modeli, javobgarlik chegaralari yozilishi kerak.
3. Iste'molchi huquqlari va reklamaga oid talablar:
   - Aldovchi bayonotlardan qochish, narx va xizmat ma'lumotlarida aniqlik.

## 2) Xalqaro foydalanuvchi bo'lsa

1. GDPR (EU):
   - lawful basis, data subject rights, retention, security, cross-border transfer bandlari.
2. CCPA/CPRA (California):
   - notice at collection, rights request jarayoni (access/delete/correct), contact channel.

## 3) Sizning mahsulotga mos majburiy bo'limlar

1. Terms of Service:
   - platforma nimani qiladi/nimani qilmaydi
   - akkaunt to'xtatish/bloklash shartlari
   - taqiqlangan kontent
   - nizolar va javobgarlikni cheklash
2. Privacy Policy:
   - qanday data olinadi (auth, chat, media, log)
   - nima uchun olinadi
   - qayerda/qancha muddat saqlanadi
   - kim bilan ulashiladi (Clerk va boshqalar)
   - foydalanuvchi qanday so'rov yuboradi
3. Versioning:
   - "Last updated" sana
   - ichki versiya (v1.0, v1.1 ...)

## 4) Texnik implementatsiya checklist

1. Frontendda ochiq sahifalar:
   - `/terms`
   - `/privacy`
2. Footerda doimiy havolalar.
3. Ro'yxatdan o'tishda ushbu sahifalarga havola.
4. Keyingi bosqich (backend):
   - `accepted_terms_version`
   - `accepted_privacy_version`
   - `accepted_at`

## Manbalar

1. O'zbekiston Respublikasi Qonun hujjatlari milliy bazasi: https://lex.uz/
2. GDPR rasmiy matni (EUR-Lex): https://eur-lex.europa.eu/eli/reg/2016/679/oj
3. California legislative information (CCPA/CPRA): https://leginfo.legislature.ca.gov/
4. Clerk hujjatlari (Auth va privacy bog'liq integratsiya): https://clerk.com/docs

Eslatma: bu hujjat texnik yo'nalish beradi, yakuniy huquqiy matn yurist tomonidan tasdiqlanishi kerak.
