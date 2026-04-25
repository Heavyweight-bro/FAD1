# Invoice Template Engine

Сервіс для автоматичної генерації PDF інвойсів на базі HTML-шаблонів (Handlebars), з адмін-панеллю для керування постачальниками, шаблонами, мапінгами полів і ассетами (лого/печатка).

## Стек

- **Frontend**: React + Vite + Tailwind, React Router, TanStack Query
- **Backend**: Supabase (Postgres, Storage, Auth, Edge Functions)
- **Deploy**: Vercel (web), Supabase (backend)

## Структура

```
apps/web/          # UI (Vite)
supabase/
  functions/       # Edge Functions (Deno/TS)
  migrations/      # SQL міграції
```

## Швидкий старт (локально)

1) Встанови залежності:

```bash
npm install
```

2) Створи `.env` на базі `.env.example`.

3) Запусти web:

```bash
npm run dev:web
```

## Деплой

- **Supabase**: застосувати міграції, створити Storage buckets, задеплоїти Edge Functions, встановити secrets.
- **Vercel**: деплой `apps/web`, налаштувати env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Деталі — в `documentation.md`.
