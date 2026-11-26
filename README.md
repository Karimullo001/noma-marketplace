# NOMA — Namangan Moda Marketpleysi

Namangan shahridagi kiyim-kechak, poyabzal va aksessuar do'konlari uchun ko'p sotuvchili (multi-vendor) onlayn marketpleys.

## Uchta Mustaqil Kabinet
- `/xaridor` — Xaridorlar marketpleysi, qidiruv, filtrlar, savat, buyurtma berish va kuzatish.
- `/sotuvchi` — Sotuvchi kabineti, Telegram bot orqali ariza va bir martalik taklif kodi tasdiqlash, tezkor ombor boshqaruvi, buyurtmalar va tahlil.
- `/admin` — Administrator boshqaruv paneli (`ADMIN_EMAILS` orqali Google kirish), arizalar, do'konlar, mahsulotlar, xaridorlar, bo'limlar va `audit_logs`.

## O'rnatish va Ishga Tushirish
1. `.env.example` faylidan nusxa olib `.env.local` yarating va barcha kalitlarni to'ldiring.
2. Supabase SQL Editor'da quyidagi migratsiyalarni ketma-ket ishga tushiring:
   - `supabase/migrations/20261125000001_schema.sql`
   - `supabase/migrations/20261125000002_rls_and_functions.sql`
   - `supabase/migrations/20261125000003_storage_and_realtime.sql`
   - `supabase/seed.sql` (faqat kategoriyalar)
3. Loyihani ishga tushiring:
   ```bash
   npm install
   npm test
   npm run build
   npm run start
   ```
