# QR Feedback Platform — loyiha qo‘llanmasi

> **Versiya:** 1.0.0 · **Egasi va ishlab chiqaruvchi:** WEBSTORM IT
> Bu fayl loyiha haqidagi to‘liq ma’lumot, versiyalash qoidalari va kelgusi AI/developer uchun
> yo‘riqnoma. Har qanday o‘zgarishdan oldin shu faylni o‘qing va oxirida tegishli bo‘limlarni yangilang.

## 1. Loyiha nima qiladi

QR-kod orqali mijozlardan **taklif, shikoyat va baho** yig‘adigan multi-tenant SaaS platforma.

- Har bir tashkilot (tenant) o‘z filiallari, bo‘limlari, xodimlari va QR-kodlariga ega.
- Mijoz ro‘yxatdan o‘tmasdan QR havola orqali anonim murojaat yuboradi.
- Admin panelda murojaatlar ko‘riladi, javob beriladi, holat o‘zgartiriladi, statistika va hisobotlar olinadi.
- PWA sifatida o‘rnatiladi; WebSocket va Web Push orqali real-time bildirishnomalar oladi.

## 2. Texnologiyalar

| Qism | Texnologiya |
|---|---|
| Backend | Django 5.0.14, Django REST Framework, SimpleJWT, Channels (Daphne), Celery, Redis |
| DB | SQLite (lokal default), PostgreSQL (production/Docker) |
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6, TanStack Query 5, Axios, Recharts, lucide-react |
| PWA | Service Worker, manifest, Web Push (VAPID), offline queue |
| Deploy | Docker Compose + Nginx (frontend static + `/api`, `/media`, `/ws` proxy) |

## 3. Repozitoriy tuzilishi

```text
qr-feedback-platform/
├─ VERSION                      # joriy versiya (1.0.0)
├─ CHANGELOG.md                 # versiyalar tarixi
├─ OPENCODE.md                  # shu fayl
├─ AGENTS.md                    # AI agentlar uchun qisqa qoida
├─ docker-compose.yml
├─ backend/
│  ├─ config/                   # settings, urls, asgi/wsgi, views (version)
│  ├─ apps/
│  │  ├─ accounts/              # User, auth, JWT, parol tiklash
│  │  ├─ organizations/         # Organization, Settings, Membership, admin API
│  │  ├─ branches/              # Filiallar
│  │  ├─ departments/           # Bo‘limlar
│  │  ├─ qr_codes/              # QRCode, QRScan, QR rasm
│  │  ├─ feedback/              # Feedback, Attachment, Comment, History, public API
│  │  ├─ notifications/         # Notification, PushSubscription, WebSocket consumer
│  │  ├─ analytics/             # Statistika, hisobot, eksport
│  │  ├─ integrations/          # Telegram, email
│  │  └─ audit/                 # Audit log
│  ├─ media/                    # yuklangan logo va murojaat fayllari
│  └─ manage.py
└─ frontend/
   ├─ public/                   # logo.png, icons/, manifest.json, sw.js, offline.html
   └─ src/
      ├─ pages/                 # sahifalar
      ├─ layouts/               # DashboardLayout (sidebar)
      ├─ components/            # UI, InstallPrompt
      ├─ contexts/              # AuthContext
      ├─ hooks/                 # notifications
      ├─ services/              # api, push, offlineQueue
      ├─ utils/                 # fmtDate, mediaUrl, isVideoUrl, social
      ├─ types/
      ├─ version.ts             # APP_VERSION
      └─ App.tsx                # route’lar
```

## 4. Lokal ishga tushirish

Backend (Windows PowerShell/cmd):

```bash
cd backend
python manage.py migrate
python manage.py seed_demo        # ixtiyoriy demo ma’lumot
python manage.py runserver 0.0.0.0:8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

- `frontend/.env` da `VITE_API_URL` bo‘sh bo‘lsa, Vite `/api`, `/media`, `/ws` ni `localhost:8000` ga proksi qiladi.
- Telefonda sinash uchun kompyuterning LAN IP’si orqali oching: `http://192.168.x.x:5173/<slug>/qr/<token>`.
- Backendni `0.0.0.0:8000` da ishga tushiring (telefon uchun).

Demo loginlar (`seed_demo`):
- Super admin: `super@feedback.uz` / `Super12345!` → `/super`
- Owner: `owner@marokand.uz` / `Demo12345!` → `/app`
- Manager: `manager@marokand.uz`, Employee: `employee@marokand.uz` (parol `Demo12345!`)

## 5. Tekshirish buyruqlari

```bash
# backend
cd backend
python manage.py check
python manage.py test apps.feedback apps.organizations

# frontend
cd frontend
npm run build
```

- Build’da chunk hajmi (>500 kB) ogohlantirishi bor — bu **xato emas**.
- `tsc` alohida ishlamaydi; TypeScript tekshiruvi `npm run build` orqali.
- O‘zgarishdan keyin har doim `npm run build` va backend testlarini ishga tushiring.

## 6. Muhit o‘zgaruvchilari

`backend/.env` (namuna: `backend/.env.example`):

| Kalit | Izoh |
|---|---|
| `SECRET_KEY` | Django maxfiy kaliti |
| `APP_VERSION` | Ixtiyoriy; berilmasa `1.0.0` |
| `DEBUG` | `1` lokal, `0` production |
| `ALLOWED_HOSTS` | Vergul bilan |
| `FRONTEND_URL` | QR public URL va CORS uchun |
| `USE_SQLITE` | `1` — SQLite, `0` — PostgreSQL |
| `POSTGRES_*` | PostgreSQL ulanishi |
| `REDIS_URL` | Channels/Celery; bo‘sh bo‘lsa in-memory/eager |
| `CELERY_EAGER` | `1` lokal sinov |
| `VAPID_*` | Web Push kalitlari (`python manage.py generate_vapid`) |
| `EMAIL_*` | Email backend |

`frontend/.env`:
- `VITE_API_URL=` — dev’da bo‘sh; productionda API domeni (masalan `https://api.example.uz`).

## 7. Rollar va huquqlar

| Rol | Huquqlar |
|---|---|
| `super_admin` | `/super` panel: tashkilotlar, userlar, audit, umumiy statistika |
| `owner` | Tashkilot egasi: hamma narsa, jumladan sozlamalar, xodimlar, ijtimoiy tarmoqlar |
| `admin` | Owner bilan deyarli bir xil (owner’ni o‘zgartira olmaydi) |
| `manager` | Murojaatlar, QR, filial/bo‘lim, statistika, hisobot |
| `employee` | Faqat o‘ziga biriktirilgan murojaatlar |

Tenant izolyatsiyasi: `TenantMixin` queryset’ni `organization` bo‘yicha filtrlaydi. Yangi API yozganda
`TenantMixin` va `TenantSerializer`dan foydalaning.

## 8. Asosiy modellar

- `accounts.User` — email login, `full_name`, `phone`, `is_superuser`.
- `organizations.Organization` — `name`, `slug`, `logo`, `status`.
- `organizations.OrganizationSettings` — `primary_color`, `welcome_text`, aloqa maydonlari, `social_links` (JSON list).
- `organizations.OrganizationMembership` — user ↔ organization + `role`.
- `branches.Branch`, `departments.Department`.
- `qr_codes.QRCode` — `token`, `color`, `bg_color`, `use_logo`, `is_active`; `QRScan` — skanerlashlar.
- `feedback.Feedback` — `type`, `status`, `category`, `text`, `rating`, `number`, `idempotency_key`, bog‘lanishlar.
- `feedback.FeedbackAttachment` — `FileField` (rasm yoki video).
- `feedback.FeedbackComment`, `FeedbackStatusHistory`.
- `notifications.Notification`, `PushSubscription`, `NotificationPreference`.

## 9. API qisqacha (`/api/`)

Autentifikatsiya:
- `POST auth/register/`, `POST auth/login/`, `POST auth/refresh/`
- `GET auth/me/`, `POST auth/change-password/`
- `POST auth/password-reset/`, `POST auth/password-reset/confirm/`

Tashkilot va xodimlar:
- `GET/PATCH organization/` — logo (multipart) va `settings` (JSON) yangilanadi.
- `staff/` — xodimlar (Membership CRUD).
- `branches/`, `departments/` — CRUD.
- `admin/organizations/`, `admin/users/`, `admin/stats/`, `admin/audit/` — super admin.

QR va murojaatlar:
- `qr-codes/` — CRUD; `qr-codes/<id>/image/` — QR rasm (blob).
- `feedbacks/` — ro‘yxat/filter/search; `feedbacks/<id>/` — detal (attachments, comments, history).
- `feedbacks/<id>/set_status/`, `assign/`, `comments/`.
- `categories/` — kategoriyalar.
- Public: `public/qr/<token>/`, `POST public/qr/<token>/feedback/`, `public/track/<number>/`.

Boshqa:
- `analytics/summary/`, `analytics/reports/`, `analytics/export/`
- `notifications/`, `notifications/unread_count/`, `notifications/mark_all_read/`, `notifications/<id>/read/`
- `notification-preferences/`, `push/vapid-key/`, `push/subscribe/`, `push/unsubscribe/`, `push/devices/`
- `integrations/telegram/`, `integrations/email/`
- `GET version/` — `{name, owner, version}`

WebSocket: `ws/notifications/?token=<JWT>`.

## 10. Frontend route’lari

Public:
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/track/:number` — murojaat holati (raqam orqali)
- `/:slug/qr/:token` — mijoz QR sahifasi
- `/about` — ochiq “Dastur haqida”

Admin (`/app`, `DashboardLayout`):
- `/app` — dashboard
- `/app/feedbacks`, `/app/feedbacks/:id`, `/app/suggestions`, `/app/complaints`
- `/app/qr` — QR kodlar + logo + brend rangi
- `/app/social` — ijtimoiy tarmoqlar
- `/app/branches`, `/app/departments`, `/app/staff`
- `/app/statistics`, `/app/reports`
- `/app/notifications`, `/app/settings`, `/app/about`

Super admin: `/super`, `/super/organizations`, `/super/users`, `/super/audit`.

## 11. Muhim oqimlar

### Mijoz murojaati
1. `GET /public/qr/<token>/` — tashkilot, kategoriya, logo, rang, social links.
2. `POST /public/qr/<token>/feedback/` — multipart, `Idempotency-Key`, honeypot `website`.
3. Server: `validate_attachments()` → 3 rasm + 1 video limit; `Feedback` + history + attachments.
4. Bildirishnoma: WebSocket + Web Push (owner/admin/manager).
5. Mijozga raqam ko‘rsatilmaydi; brauzerda oxirgi murojaat raqami saqlanadi va qayta kirganda holat eslatmasi chiqadi.

### Fayl biriktirish qoidalari
- Rasm: JPG/PNG/WEBP, har biri **5MB** gacha, **3 tagacha**.
- Video: MP4/WEBM/MOV/M4V/OGG, **20MB** gacha, **1 tagacha**.
- Rasm `Pillow` bilan tekshiriladi; fayl nomi UUID bilan almashtiriladi.
- Admin: ro‘yxatda thumbnail/film belgisi, detalda rasm yoki `<video controls>`.

### Media URL’lar (muhim!)
- Backend har doim **nisbiy** `/media/...` URL qaytaradi. `build_absolute_uri` ishlatmang —
  Docker/Nginx va telefon sinovida `localhost` muammosi chiqadi.
- Frontendda `mediaUrl()` (`src/utils/index.ts`) orqali ishlating.
- Video aniqlash: `isVideoUrl()`.

### Ijtimoiy tarmoqlar
- Admin: `/app/social`; `PATCH /organization/` `{settings: {social_links: [...]}}`.
- Format: `{platform, name, url}`; max 20 ta; plataformalar: instagram, telegram, facebook,
  youtube, linkedin, twitter, website.
- Mijoz sahifasida havola bo‘lmasa tugma ko‘rinmaydi.

### Bildirishnomalar
- `useNotificationSocket()` WebSocket’ni ulaydi, kelgan xabarni toast qiladi va query’larni invalidate qiladi.
- Sidebar `Bildirishnomalar` yonida va yuqori qo‘ng‘iroqda o‘qilmaganlar soni (`useUnread`) ko‘rinadi.

### Oflayn rejim
- Service worker statik fayllarni keshlaydi; `/api`, `/ws`, `/media` keshlanmaydi.
- Matnli murojaat internet yo‘q bo‘lsa `offlineQueue` ga tushadi; online bo‘lganda yuboriladi.
- Fayl (rasm/video) bilan oflayn yuborish qo‘llanmaydi.

## 12. Brending va UI qoidalari

- Logo: `frontend/public/logo.png` (WEBSTORM IT). PWA ikonkalari: `frontend/public/icons/`.
- Sidebar tepasida oq fonli logo, pastda `v{APP_VERSION} · WEBSTORM IT`.
- Mijoz sahifasi footerida logo + “Dastur WEBSTORM IT kompaniyasiga tegishli” + `/about`.
- Dizayn **minimal va sodda** bo‘lishi kerak. Foydalanuvchi gradient/glassmorphism va iOS-uslub
  dizaynlarni rad etgan — mavjud oq, toza uslubni saqlang.
- Matnlar o‘zbek tilida (lotin). Emoji ishlatilmaydi (foydalanuvchi so‘ramasa).

## 13. Nimani qayerda o‘zgartirish kerak

| Vazifa | Fayl |
|---|---|
| Versiyani oshirish | `VERSION`, `frontend/src/version.ts`, `frontend/package.json`, `backend/config/settings.py`, `CHANGELOG.md` |
| Yangi sahifa qo‘shish | `frontend/src/pages/*.tsx` + `frontend/src/App.tsx` |
| Sidebar menyusi | `frontend/src/layouts/DashboardLayout.tsx` (`NAV_SECTIONS`) |
| Brend rangi / welcome / aloqa | `/app/qr` (rang) yoki `/app/settings`; backend `OrganizationSettings` |
| Logo va PWA ikonkalari | `frontend/public/logo.png`, `frontend/public/icons/*`, `manifest.json`, `index.html` |
| Ijtimoiy tarmoqlar | `frontend/src/pages/SocialNetworks.tsx`, `frontend/src/utils/social.tsx`, `organizations/serializers.py` |
| Murojaat UI | `frontend/src/pages/PublicFeedback.tsx`, `Feedbacks.tsx`, `FeedbackDetail.tsx` |
| Fayl limitlari | `backend/apps/feedback/uploads.py`, `frontend/src/pages/PublicFeedback.tsx` |
| Bildirishnoma matnlari | `backend/apps/feedback/services.py`, `views.py` (`notify(...)`) |
| Push/service worker | `frontend/src/services/push.ts`, `frontend/public/sw.js`, `backend/apps/notifications/` |
| “Dastur haqida” | `frontend/src/pages/About.tsx`, `frontend/src/version.ts` |
| Public route’lar | `frontend/src/App.tsx` |
| Media URL | `frontend/src/utils/index.ts` (`mediaUrl`) — backendda nisbiy qoldiring |

## 14. Versiyalash (SemVer)

Format: `MAJOR.MINOR.PATCH` (masalan `1.2.3`).

- **PATCH** — xatolik tuzatish, matn/UI kichik o‘zgarishi.
- **MINOR** — yangi funksiya, eski API buzilmaydi.
- **MAJOR** — mos kelmaydigan o‘zgarish (API, DB, konfiguratsiya).

Versiya quyidagi joylarda bir xil bo‘lishi shart:
1. `VERSION`
2. `frontend/src/version.ts` → `APP_VERSION`
3. `frontend/package.json` → `"version"`
4. `backend/config/settings.py` → `APP_VERSION` default
5. `CHANGELOG.md` — yangi bo‘lim
6. (ixtiyoriy) `backend/.env` → `APP_VERSION`

### Yangi versiya chiqarish tartibi

1. O‘zgarishlarni tugating va tekshiring:
   ```bash
   cd backend && python manage.py check && python manage.py test apps.feedback apps.organizations
   cd ../frontend && npm run build
   ```
2. Yuqoridagi 5 joyda versiyani oshiring.
3. `CHANGELOG.md` ga sana va o‘zgarishlar ro‘yxatini yozing.
4. Commit va git tag: `git tag v1.0.1` (agar git ishlatilsa).
5. Deploy (Docker bo‘lsa):
   ```bash
   docker compose up -d --build
   docker compose exec backend python manage.py migrate
   ```
6. `GET /api/version/` va `/app/about` da versiya to‘g‘ri ko‘rinishini tekshiring.
7. PWA keshini yangilash uchun `frontend/public/sw.js` ichidagi `VERSION` ni ham oshiring.

## 15. Versiyalar tarixi

| Versiya | Sana | Izoh |
|---|---|---|
| 1.0.0 | 2026-10-30 | Birinchi rasmiy versiya: multi-tenant, QR, murojaatlar, fayllar, ijtimoiy tarmoqlar, PWA, push, versiyalash |

Batafsil: `CHANGELOG.md`.

## 16. Ma’lum cheklovlar va e’tibor talab qiladigan joylar

- Bitta user = bitta tashkilot.
- Telegram bot tokeni bazada ochiq saqlanadi (productionda shifrlash tavsiya etiladi).
- Mijoz javobni raqam orqali `/track/<number>` da ko‘radi; public sahifada raqam ko‘rsatilmaydi.
- Brauzer xotirasi tozalansa, “oxirgi murojaat holati” eslatmasi yo‘qoladi.
- Service worker eski fayllarni keshlashi mumkin — `sw.js` `VERSION` ni oshiring yoki hard refresh.
- Docker/Nginx: `/media` proksi qilingan; `client_max_body_size 50m`.
- `media/` fayllar git’ga qo‘shilmaydi.
- SQLite lokal uchun; productionda PostgreSQL ishlating.

## 17. AI agentlar uchun qoidalar

1. Avval shu faylni va `CHANGELOG.md` ni o‘qing.
2. O‘zgartirishdan oldin tegishli fayllarni o‘qing; mavjud uslub va komponentlardan foydalaning.
3. Foydalanuvchi tilida (o‘zbekcha) qisqa javob bering.
4. Har qanday kod o‘zgarishidan keyin:
   - `cd frontend && npm run build`
   - `cd backend && python manage.py check && python manage.py test apps.feedback apps.organizations`
5. Har bir relizda versiyani yuqoridagi 5 joyda oshiring va `CHANGELOG.md` ni yangilang.
6. Yangi sahifa/route qo‘shsangiz, `OPENCODE.md` ning route va “nimani qayerda o‘zgartirish” bo‘limlarini yangilang.
7. Media uchun faqat nisbiy URL va `mediaUrl()` ishlating.
8. Dizaynni minimal saqlang; foydalanuvchi so‘ramasa katta vizual redesign qilmang.
