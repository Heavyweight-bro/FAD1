# Project Execution Plan

Нижче — мінімальний план реалізації згідно `INVOICE_TEMPLATE_ENGINE_SPEC.md`.

## Phase A — Repo foundation (готово)

- Монорепо структура `apps/web` + `supabase/`
- Міграції БД + базовий RLS
- Edge Function `api` з основними ендпоїнтами (MVP)

## Phase B — Admin UI (в роботі)

- Login (Supabase Auth)
- CRUD постачальників, шаблонів, мапінгів
- Preview рендеру (HTML)

## Phase C — PDF generation

- Підключити remote Chromium (Browserless) і завантаження PDF у Supabase Storage
- Повернення `pdf_url` у `/api/invoices/generate`

## Phase D — AI integration

- OpenAI (витяг лого/печатки)
- Gemini (аналіз документа, генерація шаблону, чат-редагування)
- Usage logs

