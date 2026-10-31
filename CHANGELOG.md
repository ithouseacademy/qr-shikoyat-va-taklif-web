# Changelog

Barcha muhim o‘zgarishlar shu faylda yuritiladi.
Format: [Keep a Changelog](https://keepachangelog.com/) · Versiya: SemVer (`MAJOR.MINOR.PATCH`).

## [1.1.0] — 2026-10-31

### Qo‘shildi
- Telegram bot endi murojaatga biriktirilgan rasm va videolarni ham yuboradi.
- Rasm `sendPhoto`, video `sendVideo` orqali yuboriladi; format qabul qilinmasa `sendDocument` zaxira usuli ishlatiladi.
- Railway deployment: `DATABASE_URL` (PostgreSQL) qo‘llab-quvvatlanadi, `PORT` bo‘yicha ishga tushish, `railway.json` va `start.sh`.
- Domenlar sozlandi: `qrfeedback.webstorm.uz` (frontend) va `qrfeedbackbackend.webstorm.uz` (backend) uchun `ALLOWED_HOSTS`, CORS, CSRF va `VITE_API_URL`.
- `MEDIA_ROOT` muhit o‘zgaruvchisi (Railway volume uchun).

## [1.0.0] — 2026-10-30

Birinchi rasmiy versiya. WEBSTORM IT tomonidan ishlab chiqilgan.

### Qo‘shildi
- Multi-tenant arxitektura: tashkilot, filial, bo‘lim, xodimlar va rollar (owner/admin/manager/employee).
- JWT autentifikatsiya, parolni tiklash, super-admin paneli (`/super`).
- QR-kod yaratish, rang/logo sozlash, faol/nofaol qilish va skanerlash statistikasi.
- Anonim mijoz sahifasi: taklif, shikoyat, baholash, ijtimoiy tarmoqlar.
- Murojaatlar: holat, javob/izoh, biriktirish, tarix, filtr/search, eksport.
- Bildirishnomalar: ilova ichida, WebSocket real-time, Web Push (VAPID) va push sozlamalari.
- Statistika va hisobotlar (Excel/PDF), dashboard grafiklari.
- PWA: offline rejim, o‘rnatish, service worker, push.
- Oflayn navbat: matnli murojaatlar internet qaytganda avtomatik yuboriladi.
- Brending: WEBSTORM IT logotipi, PWA ikonkalari, favicon, `Dastur haqida` sahifasi.
- Tashkilot sozlamalari: brend rangi, logotip, aloqa ma’lumotlari, ijtimoiy tarmoqlar.
- Ijtimoiy tarmoqlar bo‘limi (`/app/social`): tayyor platformalar + custom havolalar (max 20).
- Murojaatga fayl biriktirish: 3 tagacha rasm (JPG/PNG/WEBP, 5MB) va 1 ta video (MP4/WEBM/MOV, 20MB).
- Admin panelda fayl preview: jadvalda thumbnail/film belgisi, ichida rasm va video pleyer.
- Mijoz sahifasida yuborilgan murojaat holati eslatmasi (brauzer xotirasi orqali).
- Mijoz anonimligi haqida eslatma: “Sizning kimligingiz bizga ko‘rinmaydi.”
- Admin sidebar: guruhlangan (Asosiy/Boshqaruv/Tahlil/Tizim), ochiladigan bo‘limlar va bildirishnoma badge’si.
- Versiya boshqaruvi: `VERSION`, `frontend/src/version.ts`, `settings.APP_VERSION`, `/api/version/`.
