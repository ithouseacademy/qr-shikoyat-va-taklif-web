# QR Feedback Platform (Multi-tenant SaaS)

Django REST + Channels + Celery + PostgreSQL  |  React + TypeScript + Vite + Tailwind (PWA, Web Push)

> **Muhim:** loyiha kodi yozib bo‘lingan, lekin yaratilgan muhitda internet va Django o‘rnatilmaganligi sababli
> **ishga tushirib sinalmagan**. Birinchi ishga tushirishda kichik xatolar chiqishi mumkin — pastdagi
> "Birinchi ishga tushirish" bosqichlarini ketma-ket bajaring va xato matnini yuboring, tuzatamiz.

## Tez ishga tushirish (lokal, SQLite bilan)

```bash
cd backend
python -m venv venv && source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                    # USE_SQLITE=1 qiling (PostgreSQLsiz sinash uchun)
python manage.py generate_vapid                         # chiqqan 2 qatorni .env ga qo'ying
python manage.py makemigrations accounts organizations branches departments qr_codes feedback notifications integrations audit
python manage.py migrate
python manage.py seed_demo                              # demo ma'lumotlar
python manage.py test apps                              # testlar
python manage.py runserver                              # http://localhost:8000  (daphne: WebSocket ham ishlaydi)
```
```bash
cd frontend
npm install
npm run dev                                             # http://localhost:5173  (/api va /ws avtomatik proksi)
```

Demo loginlar (seed_demo):
- Super admin: `super@feedback.uz` / `Super12345!`  → `/super`
- Marokand egasi: `owner@marokand.uz` / `Demo12345!` → `/app`
- WEBSTORM egasi: `owner@webstorm.uz` / `Demo12345!`
- Manager/Employee: `manager@marokand.uz`, `employee@marokand.uz` (parol `Demo12345!`)

Mijoz sahifasi: kabinet → **QR kodlar** → havolani oching (`/marokand/qr/<token>`).

## PostgreSQL + Redis + Celery (to‘liq rejim)
`.env` da `USE_SQLITE=0`, `POSTGRES_*`, `REDIS_URL=redis://localhost:6379/0`, `CELERY_EAGER=0`, so‘ng:
```bash
celery -A config worker -l info
celery -A config beat -l info      # eskirgan push subscription tozalash
```

## Docker bilan deployment
```bash
cp backend/.env.example backend/.env    # SECRET_KEY, DEBUG=0, ALLOWED_HOSTS, FRONTEND_URL, VAPID_*, CORS/CSRF ni to'ldiring
docker compose up -d --build
docker compose exec backend python manage.py makemigrations accounts organizations branches departments qr_codes feedback notifications integrations audit
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser   # yoki seed_demo
```
Productionda HTTPS **majburiy** (Service Worker va Web Push faqat HTTPS yoki localhost'da ishlaydi). Nginx oldiga Caddy/Traefik/Certbot qo‘ying.
`migrations/` papkalari bo‘sh yetkazilgan — `makemigrations` ni bir marta ishga tushirib, hosil bo‘lgan fayllarni git'ga qo‘shing.

## Push bildirishnomalarni sinash
1. `generate_vapid` kalitlarini `.env` ga qo‘ying, backendni qayta ishga tushiring.
2. Frontendni `npm run build && npm run preview` (yoki dev'da `VITE_SW_DEV=1`) bilan oching; HTTPS yoki localhost.
3. Sozlamalar → Push → **“Bu qurilmada push’ni yoqish”** (ruxsat faqat shu tugmadan so‘raladi).
4. Boshqa brauzerda QR havolasi orqali shikoyat yuboring → bildirishnoma keladi, bosilsa murojaat ochiladi.
5. **iPhone:** iOS 16.4+, Safari → Share → Add to Home Screen, ilovani Home Screen'dan oching, keyin push'ni yoqing.
   Android/Chrome va iOS'ni alohida haqiqiy qurilmada sinang.

## Arxitektura qisqacha
- **Tenant izolyatsiyasi:** `OrganizationMembership` → `TenantMixin` har querysetni `organization` bo‘yicha filtrlaydi; FK maydonlar `TenantSerializer` bilan tekshiriladi; testlar: `apps/feedback/tests.py`.
- **Rollar:** owner / admin (sozlamalar, xodimlar) · manager (murojaat, QR, statistika) · employee (faqat o‘ziga biriktirilgan) · super admin (`is_superuser`, `/api/admin/*`).
- **Anonim mijoz:** faqat `/api/public/qr/<token>/...`; faqat faol QR; token ~72 bit tasodifiy; rate limit; honeypot; rasm validatsiyasi (Pillow); `Idempotency-Key` bilan dublikatdan himoya.
- **Real-time:** Django Channels `ws/notifications/?token=<JWT>`.
- **Push:** `pywebpush` + VAPID, Celery retry, 404/410 da subscription o‘chiriladi, har bir qurilma alohida subscription.
- **Oflayn:** service worker interfeysni keshlaydi; API keshlanmaydi. Matnli murojaatlar oflayn navbatga tushib, internet qaytganda yuboriladi (rasmli murojaat internet talab qiladi).

## Ma'lum cheklovlar / keyingi qadamlar
- Bitta foydalanuvchi = bitta tashkilot.
- Telegram bot token bazada ochiq matnda saqlanadi (frontendga qaytarilmaydi); productionda shifrlash (masalan `django-fernet-fields`) tavsiya etiladi.
- Mijozga javob: mijoz `/track/<murojaat raqami>` orqali ko‘radi (push/SMS yuborilmaydi).
- PDF hisobotlarda lotin harflari uchun DejaVu shrifti kerak (Dockerfile o‘rnatadi).
- Frontend `tsc` bilan tekshirilmagan (strict o‘chiq); `npm run build` xatolarini ko‘rib chiqing.
