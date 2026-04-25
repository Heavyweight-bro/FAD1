# Документація: Invoice Template Engine (UA)

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
  - Повертає `rendered_html` і (після підключення PDF) має повертати `pdf_url`.

- **AI (Gemini)**
  - `POST /api/generate-template` (JWT) — приймає зображення першої сторінки інвойсу і повертає `html_template` (Handlebars + A4 CSS).

## 3) Налаштування Supabase

1. Створи Supabase project.
2. Запусти міграції з `supabase/migrations`.
3. Створи Storage buckets:
   - `assets`
   - `generated`
   - (опційно) `originals`
4. Встанови secrets для Edge Functions:
   - `SUPABASE_URL` (наприклад `https://qszrdfiukvfmpmxtaznw.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY` (service role key з Supabase)
   - `GOOGLE_AI_API_KEY` (для Gemini template generation)
   - (опційно) `OPENAI_API_KEY` (для asset extraction у наступних етапах)
   - (опційно) `BROWSERLESS_WSS_URL` (для PDF генерації через remote Chromium)

## 4) Налаштування Vercel

Деплой директорії `apps/web`.

Env vars (Vercel):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- (опційно) `VITE_API_BASE_URL` — якщо хочеш явно задати базу для Edge Function (інакше визначається з `VITE_SUPABASE_URL`)

## 5) Локальний запуск

```bash
npm install
npm run dev:web
```

## 6) Як протестувати флоу (end-to-end)

1) **Створи admin користувача** в Supabase → Authentication → Users.
2) У web зайди на `/login` і залогінься.
3) На сторінці **Постачальники** додай постачальника.
4) На сторінці **Шаблони**:
   - завантаж PDF (локально)
   - натисни **AI: згенерувати HTML** (потрібен `GOOGLE_AI_API_KEY` в Supabase Secrets)
   - натисни **Згенерувати превʼю** і перевір рендер.

