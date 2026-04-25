# Документація: Invoice Template Engine

Короткий overview того, як зібраний додаток за `INVOICE_TEMPLATE_ENGINE_SPEC.md`.

## 1) Архітектура

- **Web (Vercel)**: `apps/web` (React+Vite) — адмін-панель.
- **Backend (Supabase)**:
  - Postgres: таблиці `suppliers`, `invoice_templates`, `field_mappings`, `generated_invoices`, тощо
  - Storage: buckets для `originals/`, `assets/`, `generated/`
  - Edge Function: одна функція `api` з маршрутизацією на ендпоїнти зі SPEC (`/api/...`)

## 2) Ендпоїнти

Edge Function `api` приймає запити на шляхи:

- **Suppliers**
  - `GET /api/suppliers`
  - `POST /api/suppliers`
  - `GET /api/suppliers/:id`
  - `PUT /api/suppliers/:id`
  - `DELETE /api/suppliers/:id`

- **Templates**
  - `GET /api/templates`
  - `POST /api/templates`
  - `GET /api/templates/:id`
  - `PUT /api/templates/:id` (створює запис у `template_versions` і інкрементить `version`)
  - `POST /api/templates/:id/preview` (рендер Handlebars → HTML)

- **Mappings**
  - `GET /api/mappings/:template_id`
  - `PUT /api/mappings/:template_id` (replace-all)
  - `POST /api/mappings/:template_id/reset`

- **API Keys**
  - `GET /api/api-keys`
  - `POST /api/api-keys` (повертає ключ **один раз**)
  - `DELETE /api/api-keys/:id`

- **1C**
  - `POST /api/invoices/generate` з `Authorization: Bearer ite_...`
  - На цьому етапі повертає `rendered_html` + створює рядок у `generated_invoices`. PDF-генерацію підключимо наступним кроком через remote Chromium (Browserless), бо Edge runtime не має Chromium.

## 3) Налаштування Supabase

1. Створи Supabase project.
2. Запусти міграції з `supabase/migrations`.
3. Створи Storage buckets:
   - `assets`
   - `generated`
   - (опційно) `originals`
4. Встанови secrets для Edge Functions:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 4) Налаштування Vercel

Деплой директорії `apps/web`.

Env vars (Vercel):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 5) Локальний запуск

```bash
npm install
npm run dev:web
```

