# Not Legal RP Wiki

Wiki и административная панель проекта Not Legal RP на Next.js 16, App Router и TypeScript.

## Локальный запуск

```bash
npm install
npm run dev
```

Сайт откроется по адресу `http://localhost:3000`.

## Проверка production-сборки

```bash
npm run build
```

## Хранение данных

Локально проект может читать и изменять JSON-файлы из `src/data`. На Vercel файловая система функций доступна только для чтения, поэтому для постоянного сохранения используется Upstash Redis.

Подробная инструкция: [VERCEL_STORAGE_SETUP.md](./VERCEL_STORAGE_SETUP.md).

Поддерживаемые переменные окружения:

```env
AUTH_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
DATA_STORE_PREFIX=not-legal-rp:v1
```

Также поддерживаются `KV_REST_API_URL` и `KV_REST_API_TOKEN`.
