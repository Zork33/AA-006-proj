# ВСЯК — Сборка и запуск в режиме отладки

## Предварительные требования

- Node.js 20+
- Docker + Docker Compose
- npm

## 1. Клонирование и установка

```bash
git clone https://github.com/Zork33/AA-006-proj.git
cd AA-006-proj
npm install
```

## 2. Запуск PostgreSQL

```bash
docker-compose up -d
```

Проверка:
```bash
docker-compose ps
# postgres должен быть healthy
```

Подключение: `leads_user` / `leads_password` / `leads_db` на порту `5432`.

## 3. Настройка переменных окружения

Скопируйте `.env.example` в `.env` в корне проекта:

```bash
cp .env.example .env
```

Убедитесь, что `DATABASE_URL` указывает на локальный Docker:
```
DATABASE_URL=postgresql://leads_user:leads_password@localhost:5432/leads_db
JWT_SECRET=your-secret-key-at-least-16-chars
```

## 4. Запуск бэкенда

```bash
cd packages/backend
npm run dev
```

Сервер стартует на `http://localhost:3000`.

Проверка:
```bash
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"..."}
```

## 5. Запуск фронтенда

В отдельном терминале:

```bash
cd packages/frontend
npm run dev
```

Фронтенд стартует на `http://localhost:5173`.

## 6. Запуск тестов

```bash
cd packages/backend
npm test
```

Ожидаемый результат:
```
 Test Files  7 passed (7)
      Tests  33 passed (33)
```

## 7. Проверка TypeScript

```bash
cd packages/backend
npx tsc --noEmit
```

Если ошибок нет — вывод пустой.

## Структура проекта

```
proj/
├── docker-compose.yml     # PostgreSQL 15
├── db/init.sql            # Schema + seed
├── .env.example           # Шаблон переменных
├── packages/
│   ├── backend/           # Fastify + TypeScript
│   │   ├── src/
│   │   │   ├── index.ts   # Точка входа
│   │   │   ├── db/        # Drizzle schema
│   │   │   ├── lib/       # auth, jwt, notify, security
│   │   │   └── routes/    # API endpoints
│   │   └── tests/         # 33 теста
│   └── frontend/          # SvelteKit + UnoCSS
│       └── src/
│           ├── lib/       # Компоненты
│           └── routes/    # Страницы
```

## API эндпоинты

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/login` | Вход |
| `POST` | `/api/auth/register` | Регистрация |
| `POST` | `/api/auth/refresh` | Обновление токена |
| `GET` | `/api/services` | Список услуг |
| `POST` | `/api/leads` | Создание заявки |
| `GET` | `/api/leads` | Список заявок |
| `PATCH` | `/api/leads/:id/status` | Смена статуса |
| `GET` | `/api/referral/track` | Трекинг ref |
| `GET` | `/api/referral/current` | Текущий ref |
| `POST` | `/api/admin/partners` | Создание партнёра |
| `GET` | `/api/admin/partners` | Список партнёров |
| `PATCH` | `/api/admin/partners/:id/approve` | Апровал |
| `PATCH` | `/api/admin/partners/:id/rating` | Рейтинг |
| `POST` | `/api/admin/admins` | Создание админа |
| `GET` | `/api/admin/admins` | Список админов |
| `GET` | `/api/admin/leads` | Список заявок |
| `PATCH` | `/api/admin/leads/:id/status` | Статус заявки |
| `GET` | `/api/admin/export` | Экспорт CSV |
| `GET` | `/api/partner/dashboard` | Дашборд |
| `GET` | `/api/partner/referral` | Ref-ссылка |
| `GET` | `/api/partner/invites` | Приглашённые |
| `POST` | `/api/partners/register` | Регистрация с промо-кодом |
| `POST` | `/api/feedback` | Отзыв клиента |

## Быстрый старт (одной командой)

```bash
docker-compose up -d && npm run dev
```

Запустит PostgreSQL и оба сервера (backend + frontend) параллельно.

## Устранение проблем

### PostgreSQL не стартует
```bash
docker-compose down -v
docker-compose up -d
```

### Ошибка "port already in use"
```bash
# Найти процесс на порту 5432
netstat -ano | findstr :5432
# Убить процесс
taskkill /PID <PID> /F
```

### Ошибки TypeScript
```bash
npm install
npx tsc --noEmit
```
