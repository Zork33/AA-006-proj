# Архитектура системы

> Связанные документы: [PRD](../prd/README.md) | [Отчёт по полноте PRD](../prd/PRD_completeness_report.md) | [Промпт для UI](../ui-prompts/README.md) | [Инфраструктура](../infrastructure/README.md) | [План развития](../roadmap/README.md)

## Обзор

Сайт-визитка для сбора заявок с QR-кодов и партнёрских каналов. Лендинг, форма заявки, реферальная система, админ-панель, уведомления через MAX.

На старте — один лендинг. Архитектура предусматривает возможность масштабирования на несколько лендингов по регионам/ЖК (Берск, Иркутск и т.д.). Каждый партнёр может выбирать, на каких лендингах быть. Реферальная ссылка: `site.com/?ref=TOKEN` (зоны `.ru` и `.com`).

Партнёры могут приглашать других партнёров через промо-коды (партнёрская рефералка). Система отслеживает цепочку: кто кого позвал (`partners.referrer_id`).

**Первый партнёр — наш собственный бизнес.** Он создаётся при деплое (seed). Все реферальные ссылки для новых партнёров генерируются от его имени. Это позволяет сразу тестировать реферальную цепочку.

## Стек технологий

| Компонент | Технология | Провайдер |
|---|---|---|
| Frontend | Svelte + UnoCSS | Selectel / Nginx (статика) |
| Backend API | Node.js (TypeScript, Fastify) | Selectel VPS |
| База данных | PostgreSQL 15+ | Selectel Managed PostgreSQL |
| Уведомления | MAX Bot API | dev.max.ru |
| HTTP-клиент | Native `fetch` | — |
| Очередь (будущее) | BullMQ + Redis | — |
| QR-коды | Статичные, генерация на клиенте или сервере | — |

## Схема архитектуры

```text
┌─────────────────────────────────────────────────────┐
│                    Клиент                            │
│  (сканирует QR / переходит по реферальной ссылке)    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              Frontend (Svelte + UnoCSS)              │
│  - Лендинг ( Hero → Услуги → Форма → CTA )          │
│  - Админ-панель ( /admin )                          │
│  - Сохранение ref-токена в cookie                   │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
                       ▼
┌─────────────────────────────────────────────────────┐
│           Backend API (Node.js + Fastify)            │
│  - POST /api/leads          — создание заявки       │
│  - GET  /api/services       — список услуг          │
│  - GET  /api/admin/leads    — заявки (админ)        │
│  - POST /api/admin/services — управление услугами   │
│  - POST /api/admin/partners — управление партнёрами │
│  - GET  /api/health         — health check          │
└──────────┬───────────────────┬──────────────────────┘
           │                   │
           ▼                   ▼
┌──────────────────┐  ┌──────────────────────────────┐
│   PostgreSQL     │  │     MAX Bot API              │
│   (Selectel)     │  │  (dev.max.ru)                │
│                  │  │                              │
│  - leads         │  │  Отправка уведомлений        │
│  - services      │  │  менеджеру о новой заявке    │
│  - partners      │  │                              │
│  - visits        │  │  POST /messages/send         │
└──────────────────┘  └──────────────────────────────┘
```

## Среды

| Среда | Назначение | URL |
|---|---|---|
| local | Разработка | localhost:3000 |
| staging | Тестирование | staging.example.com |
| production | Продакшн | example.com |

## Модель данных

### leads (Заявки)

```sql
CREATE TABLE leads (
  id              SERIAL PRIMARY KEY,
  lead_number     VARCHAR(20) UNIQUE NOT NULL,  -- порядковый номер заявки (LEAD-0001 или PARTNER-0001)
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(20) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  city            VARCHAR(255) NOT NULL,
  messenger       VARCHAR(50),  -- WhatsApp, Telegram и т.д. (опционально)
  service_id      INTEGER REFERENCES services(id),
  partner_id      INTEGER REFERENCES partners(id),
  source          VARCHAR(20) NOT NULL DEFAULT 'QR',  -- QR | partner
  attribution     VARCHAR(20) NOT NULL DEFAULT 'first_touch',
  status          VARCHAR(20) NOT NULL DEFAULT 'NEW',  -- NEW | CONTACTED | QUALIFIED | CONVERTED | REJECTED | DUPLICATE | CANCELLED
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_partner ON leads(partner_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_number ON leads(lead_number);
```

### Правила дедупликации

При POST /api/leads:
1. Проверка: есть ли заявка с таким `phone` + `service_id` + `partner_id` за последние 24 часа
2. Если да → ответ 409 Conflict «Заявка уже принята»
3. Если нет → создаём новую заявку с уникальным `lead_number` и status = NEW

### Формирование номера заявки

- Если заявка от партнёра: `{PARTNER_CODE}-{порядковый номер}` (например: `IVAN-0001`)
- Если заявка от QR: `QR-{порядковый номер}` (например: `QR-0001`)

### services (Услуги)

На старте — фиксированный список: недвижимость, сантехника, кондиционирование, окна, двери, электрика, услуги клиник.

```sql
CREATE TABLE services (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  price           INTEGER,  -- в копках, NULL если не отображается
  status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | hidden
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### partners (Партнёры)

```sql
CREATE TABLE partners (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  partner_code    VARCHAR(20) UNIQUE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | active | blocked
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  approved_by     INTEGER REFERENCES admins(id),
  approved_at     TIMESTAMP,
  rating          INTEGER NOT NULL DEFAULT 100,  -- 0–100, автоматически
  referral_token  VARCHAR(64) UNIQUE NOT NULL,
  referrer_id     INTEGER REFERENCES partners(id),
  region          VARCHAR(100),  -- регион (Берск, Иркутск и т.д.)
  residential_complex VARCHAR(255),  -- ЖК (если привязан)
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_partners_token ON partners(referral_token);
CREATE UNIQUE INDEX idx_partners_code ON partners(partner_code);
```

**Правила отображения на лендинге:**
- Партнёр отображается на лендинге ТОЛЬКО если `approval_status = 'approved'` И `rating >= 50`
- Рейтинг рассчитывается автоматически: +2 за каждую обработанную заявку, -5 за каждый пропущенный ответ, -10 за жалобу клиента
- Если `rating < 50` — партнёр автоматически скрывается с лендингов
- Рейтинг пересчитывается раз в сутки (cron-job)

### admins (Администраторы)

```sql
CREATE TABLE admins (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'admin',  -- superadmin | admin
  region          VARCHAR(100),  -- регион ответственности (NULL = все регионы)
  residential_complex VARCHAR(255),  -- ЖК ответственности (NULL = все ЖК)
  password_hash   VARCHAR(255),  -- NULL у корневого суперадмина до первого входа
  is_test         BOOLEAN NOT NULL DEFAULT false,  -- тестовый суперадмин
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

**Роли:**
- **superadmin** — может добавлять админов, управлять всеми регионами, одобрять партнёров
- **admin** — управляет партнёрами и заявками в своём регионе/ЖК

**Корневой суперадмин:**
- Создаётся при первом запуске (seed) с `password_hash = NULL`
- Обязан задать пароль при первом входе
- Email: задаётся через переменную окружения `ROOT_ADMIN_EMAIL`

**Тестовый суперадмин:**
- Создаётся только в режиме `NODE_ENV=test`
- `is_test = true`
- Используется для автоматических тестов

```sql
CREATE TABLE visits (
  id              SERIAL PRIMARY KEY,
  session_id      VARCHAR(64) NOT NULL,
  partner_id      INTEGER REFERENCES partners(id),
  source          VARCHAR(20) NOT NULL,  -- QR | partner
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_visits_session ON visits(session_id);
```

## API (Основные эндпоинты)

> Полная спецификация: OpenAPI 3.0 (Swagger). Документация генерируется из кода и доступна по адресу `/api/docs`.

### Публичные

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/services` | Список активных услуг |
| POST | `/api/leads` | Создание заявки |

### Админ

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/admin/login` | Авторизация |
| GET | `/api/admin/leads` | Все заявки (с фильтрами) |
| GET | `/api/admin/leads/:id` | Детали заявки |
| PATCH | `/api/admin/leads/:id` | Изменение статуса |
| POST | `/api/admin/services` | Создание услуги |
| PATCH | `/api/admin/services/:id` | Редактирование услуги |
| POST | `/api/admin/partners` | Создание партнёра |
| POST | `/api/partners/register` | Регистрация нового партнёра с промо-кодом пригласившего |
| PATCH | `/api/admin/partners/:id` | Блокировка/разблокировка |
| GET | `/api/admin/partners` | Список партнёров |
| GET | `/api/admin/export` | Экспорт в CSV |

### Системные

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/health` | Health check |

### Партнёр (личный кабинет)

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/partner/login` | Вход по email + magic link / пароль |
| GET | `/api/partner/dashboard` | Дашборд: заявки, конверсия, статистика |
| GET | `/api/partner/referral` | Реферальная ссылка и промо-код |
| GET | `/api/partner/invites` | Список приглашённых партнёров |

## Реферальная логика

1. Партнёр получает ссылку: `https://example.com/?ref=TOKEN`
2. При переходе по ссылке фронтенд сохраняет `TOKEN` в cookie (TTL 30 дней, path=/, SameSite=Lax)
3. При отправке формы бэкенд проверяет cookie `ref` → находит партнёра → привязывает к заявке
4. Модель атрибуции: **first-touch** (первый переход определяет источник)
5. Если `ref` нет → источник = `QR`

## Уведомления (MAX Bot)

1. После сохранения заявки в БД бэкенд вызывает MAX Bot API
2. Формат уведомления:

```text
📋 Новая заявка

Имя: Иван
Телефон: +7 (999) 123-45-67
Услуга: Консультация
Источник: QR / Партнёр: Иванов
Дата: 2026-09-12 15:30
```

3. API: `POST https://platform-api2.max.ru/bots/{bot_id}/messages/send`
4. Токен бота хранится в переменных окружения (не в коде)

## Безопасность

- HTTPS на всех уровнях
- Rate limiting: 10 запросов/минуту с одного IP на `/api/leads`
- CAPTCHA или honeypot-поле против спама
- CSRF-токены для форм
- SQL-параметризация (защита от SQL-инъекций)
- JWT для админ-панели
- Персональные данные: шифрование при хранении, доступ только у админа

## Тестирование

- Покрытие кода: **≥ 96%** (line coverage)
- Фреймворк: Vitest (для бэкенда и фронта)
- Интеграционные тесты: реальная PostgreSQL через Docker
- E2E-тесты: Playwright (лендинг + форма + админ)

## Переменные окружения

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/leads_db

# MAX Bot
MAX_BOT_TOKEN=your_bot_token
MAX_BOT_ID=your_bot_id
MAX_CHAT_ID=manager_chat_id

# Auth
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=bcrypt_hash

# App
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://example.com
```

## Деплой

```text
1. Selectel VPS: создать сервер (Ubuntu 22.04, 2 vCPU, 2GB RAM)
2. Установить Node.js 20+, PostgreSQL (или подключить Managed)
3. Настроить Nginx reverse proxy + SSL (Let's Encrypt)
4. Запустить бэкенд через PM2
5. Фронтенд: собрать (`npm run build`) и раздать через Nginx
6. Настроить MAX-бота на dev.max.ru
7. Настроить алерты на health check
```

## OpenAPI / Swagger

- Спецификация: OpenAPI 3.0
- Генерация: автоматическая из аннотаций в коде (fastify-swagger или @nestjs/swagger)
- Доступ: `/api/docs` (Swagger UI) в development и staging
- В production: `/api/docs` доступен только администраторам (по JWT)
- Формат: JSON (`/api/docs.json`) и YAML (`/api/docs.yaml`) для интеграции с Postman/Insomnia
