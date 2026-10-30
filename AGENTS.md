# AGENTS.md

Bu loyiha uchun asosiy qo‘llanma: **`OPENCODE.md`** — har qanday ishdan oldin o‘qing.

Qisqa qoidalar:
- Versiya `VERSION` faylida; `CHANGELOG.md` va `OPENCODE.md` §14 bo‘yicha oshiring.
- Kod o‘zgarishidan keyin: `cd frontend && npm run build` va
  `cd backend && python manage.py check && python manage.py test apps.feedback apps.organizations`.
- Media URL’lar nisbiy (`/media/...`) bo‘lishi shart; frontendda `mediaUrl()` ishlatiladi.
- Dizayn minimal va oq uslubda qoladi; foydalanuvchi so‘ramasa redesign qilinmaydi.
- Javoblar o‘zbek tilida va qisqa bo‘lsin.
