# Архитектура системы

> Связанные документы: [PRD](../prd/README.md) | [Отчёт по полноте PRD](../prd/PRD_completeness_report.md) | [Промпт для UI](../ui-prompts/README.md) | [Инфраструктура](../infrastructure/README.md) | [План развития](../roadmap/README.md)

## Обзор

Сайт-визитка для сбора заявок с QR-кодов и партнёрских каналов. Лендинг, форма заявки, реферальная система, единая админ-панель, уведомления по email.

На старте — один лендинг. Архитектура предусматривает возможность масштабирования на несколько лендингов по регионам/ЖК (Бердск, Иркутск и т.д.). Каждый партнёр может выбирать, на каких лендингах быть. Реферальная ссылка: `site.com/?ref={user_code}` (зоны `.ru` и `.com`).

Партнёры могут приглашать других партнёров. Система отслеживает цепочку: кто кого позвал (`users.referrer_code`).

**Единая таблица `users`** — admins, partners, clients в одной таблице. Каждый пользователь имеет уникальный `user_code` (буквенно-цифровой, 6–20 символов). Many-to-many связь через `user_partners`: партнёр может привязать нескольких сотрудников, один пользователь может работать на нескольких партнёров.

**Единая админ-панель `/admin`** — админ-функции + партнёр-функции в одном месте. Доступ: superadmin видит всё, admin видит админ-функции + партнёрские, partner видит только партнёрские.

**Первый партнёр — наш собственный бизнес.** Он создаётся при деплое (seed). Все реферальные ссылки для новых партнёров генерируются от его имени. Это позволяет сразу тестировать реферальную цепочку.

## Стек технологий

| Компонент | Технология | Провайдер |
|---|---|---|
| Frontend | Svelte + UnoCSS | Selectel / Nginx (статика) |
| Backend API | Node.js (TypeScript, Fastify) | Selectel VPS |
| База данных | PostgreSQL 15+ | Selectel Managed PostgreSQL |
| Уведомления | Email (SMTP) | |
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
│  - Единая админ-панель ( /admin )                    │
│  - Сохранение user_code в cookie                    │
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
│  - GET  /api/admin/referral — реферальная ссылка    │
│  - GET  /api/admin/team     — сотрудники (m2m)      │
│  - GET  /api/health         — health check          │
└──────────┬───────────────────┬──────────────────────┘
           │                   │
           ▼                   ▼
┌──────────────────┐  ┌──────────────────────────────┐
│   PostgreSQL     │  │     MAX Bot API              │
│   (Selectel)     │  │  (dev.max.ru)                │
│                  │  │                              │
│  - users         │  │  Отправка уведомлений        │
│  - user_partners │  │  менеджеру о новой заявке    │
│  - leads         │  │                              │
│  - services      │  │  POST /messages/send         │
│  - visits        │  │                              │
└──────────────────┘  └──────────────────────────────┘
```

## Среды

| Среда | Назначение | URL |
|---|---|---|
| local | Разработка | localhost:3000 |
| staging | Тестирование | staging.example.com |
| production | Продакшн | example.com |

## Модель данных

### users (Единая таблица пользователей)

> admins, partners, clients — в одной таблице. Подробнее: [docs/variants/002_unified_users.md](../variants/002_unified_users.md)

```sql
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  user_code       VARCHAR(20) UNIQUE NOT NULL,  -- буквенно-цифровой код для рефералок (6–20 символов)
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255),  -- NULL до первого входа (корневой суперадмин)
  role            VARCHAR(20) NOT NULL DEFAULT 'partner',  -- superadmin | admin | partner
  region          VARCHAR(100),  -- регион ответственности (NULL = все регионы)
  residential_complex VARCHAR(255),  -- ЖК ответственности (NULL = все ЖК)
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | active | blocked
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  approved_by     INTEGER REFERENCES users(id),
  approved_at     TIMESTAMP,
  rating          INTEGER NOT NULL DEFAULT 100,  -- 0–100, автоматически
  referrer_code   VARCHAR(20) REFERENCES users(user_code),  -- код пригласившего
  is_test         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_code ON users(user_code);
```

**Роли:**
- **superadmin** — видит всё, управляет админами, одобряет партнёров
- **admin** — управляет заявками/услугами/партнёрами в своём регионе, также доступ к партнёрским функциям
- **partner** — видит только партнёрские функции (рефералка, приглашённые, сотрудники)

**Корневой суперадмин:**
- Создаётся при первом запуске (seed) с `password_hash = NULL`
- Обязан задать пароль при первом входе

### user_partners (Связь many-to-many)

Партнёр может привязать к себе несколько пользователей (сотрудники/агенты). Один пользователь может работать на нескольких партнёров.

```sql
CREATE TABLE user_partners (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  partner_id      INTEGER NOT NULL REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, partner_id)
);

CREATE INDEX idx_user_partners_user ON user_partners(user_id);
CREATE INDEX idx_user_partners_partner ON user_partners(partner_id);
```

### leads (Заявки)

```sql
CREATE TABLE leads (
  id              SERIAL PRIMARY KEY,
  lead_number     VARCHAR(20) UNIQUE NOT NULL,  -- порядковый номер (LEAD-0001 или PARTNER-0001)
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(20) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  city            VARCHAR(255) NOT NULL,
  messenger       VARCHAR(50),  -- WhatsApp, Telegram и т.д. (опционально)
  service_id      INTEGER REFERENCES services(id),
  partner_id      INTEGER REFERENCES users(id),  -- ID партнёра из единой таблицы
  source          VARCHAR(20) NOT NULL DEFAULT 'QR',  -- QR | partner
  attribution     VARCHAR(20) NOT NULL DEFAULT 'first_touch',
  status          VARCHAR(20) NOT NULL DEFAULT 'NEW',  -- NEW | CONTACTED | QUALIFIED | CONVERTED | COMPLETED | REJECTED | DUPLICATE | CANCELLED
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_partner ON leads(partner_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_number ON leads(lead_number);
```

### lead_feedback (Отзывы клиентов)

```sql
CREATE TABLE lead_feedback (
  id              SERIAL PRIMARY KEY,
  lead_id         INTEGER REFERENCES leads(id) UNIQUE NOT NULL,
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),  -- 1–5 звёзд
  comment         TEXT,  -- опциональный комментарий
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedback_lead ON lead_feedback(lead_id);
```

**Правила:**
- Клиент может оставить отзыв только один раз для каждой заявки
- Отзыв привязан к статусу `CONVERTED` или `COMPLETED`
- Рейтинг клиента влияет на рейтинг партнёра (+2 при 4–5 звёзд, -3 при 1–2 звёзды)

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

**Правила отображения на лендинге:**
- Партнёр отображается на лендинге ТОЛЬКО если `approval_status = 'approved'` И `rating >= 50`
- Рейтинг рассчитывается автоматически: +2 за каждую обработанную заявку, -5 за каждый пропущенный ответ, -10 за жалобу клиента
- Если `rating < 50` — партнёр автоматически скрывается с лендингов

```sql
CREATE TABLE visits (
  id              SERIAL PRIMARY KEY,
  session_id      VARCHAR(64) NOT NULL,
  partner_id      INTEGER REFERENCES users(id),  -- ID партнёра из единой таблицы
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
| POST | `/api/leads/:id/feedback` | Отзыв клиента (rating 1–5, comment) |

### Админ

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/auth/login` | Авторизация |
| GET | `/api/admin/leads` | Все заявки (с фильтрами) |
| GET | `/api/admin/leads/:id` | Детали заявки |
| PATCH | `/api/admin/leads/:id` | Изменение статуса |
| POST | `/api/admin/services` | Создание услуги |
| PATCH | `/api/admin/services/:id` | Редактирование услуги |
| POST | `/api/admin/partners` | Создание партнёра |
| PATCH | `/api/admin/partners/:id` | Блокировка/разблокировка |
| GET | `/api/admin/partners` | Список партнёров |
| GET | `/api/admin/export` | Экспорт в CSV |
| GET | `/api/admin/referral` | Реферальная ссылка (partner + admin) |
| GET | `/api/admin/invites` | Список приглашённых (partner + admin) |
| GET | `/api/admin/team` | Список сотрудников (many-to-many) |
| POST | `/api/admin/team` | Привязка сотрудника |
| DELETE | `/api/admin/team/:id` | Отвязка сотрудника |

### Системные

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/health` | Health check |

### Авторизация

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/auth/login` | Вход (email + пароль → JWT в httpOnly cookies) |
| POST | `/api/auth/register` | Регистрация (для партнёров) |
| POST | `/api/auth/refresh` | Обновление access token (из refresh cookie) |
| POST | `/api/auth/logout` | Выход (очистка cookies) |
| POST | `/api/auth/setup-password` | Установка пароля (по reset token) |
| POST | `/api/auth/reset` | Сброс пароля (письмо со ссылкой) |

## Уведомления (Email)

1. После сохранения заявки в БД бэкенд отправляет email менеджеру
2. Формат уведомления:

```text
📋 Новая заявка

Имя: Иван
Телефон: +7 (999) 123-45-67
Услуга: Консультация
Источник: QR / Партнёр: Иванов
Дата: 2026-09-12 15:30
```

3. SMTP-сервер настраивается через переменные окружения
4. Токен/пароль хранятся в переменных окружения (не в коде)

## Безопасность

- HTTPS на всех уровнях
- Rate limiting: 10 запросов/минуту с одного IP на `/api/leads`
- CAPTCHA или honeypot-поле против спама
- CSRF-токены для форм
- SQL-параметризация (защита от SQL-инъекций)
- Персональные данные: шифрование при хранении, доступ только у админа

## Авторизация

**MVP (email + пароль):**
- Эндпоинт: `POST /api/auth/login` → JWT (access + refresh)
- Access token: 15 минут, refresh: 30 дней
- Хранение: httpOnly cookies (access_token, refresh_token)
- Хранение пароля: bcrypt (cost factor 12)
- Сброс пароля: `POST /api/auth/reset` → письмо со ссылкой
- Для партнёров: вход по email + пароль
- Для админов: вход по email + пароль
- Middleware читает JWT из cookies (с fallback на Authorization header)

**После MVP (OAuth):**
- Google, Яндекс, VK, Одноклассники
- Эндпоинт: `GET /api/auth/oauth/:provider` → redirect
- Callback: `GET /api/auth/oauth/:provider/callback`
- Привязка аккаунта: `POST /api/auth/oauth/link`
- Таблица `oauth_accounts`: provider, provider_user_id, user_id

## Тестирование

- Покрытие кода: **≥ 96%** (line coverage)
- Фреймворк: Vitest (для бэкенда и фронта)
- Интеграционные тесты: реальная PostgreSQL через Docker
- E2E-тесты: Playwright (лендинг + форма + админ)

## Переменные окружения

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/leads_db

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@vsyak.zork.ru
SMTP_PASS=your_smtp_password
MANAGER_EMAIL=manager@vsyak.zork.ru

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

**Домен:** vsyak.zork.ru

```text
1. Selectel VPS: создать сервер (Ubuntu 22.04, 2 vCPU, 2GB RAM)
2. Установить Node.js 20+, PostgreSQL (или подключить Managed)
3. Настроить Nginx reverse proxy + SSL (Let's Encrypt) на vsyak.zork.ru
4. Запустить бэкенд через PM2
5. Фронтенд: собрать (`npm run build`) и раздать через Nginx
6. Настроить уведомления по email (не MAX-бот)
7. Настроить алерты на health check
```

## OpenAPI / Swagger

- Спецификация: OpenAPI 3.0
- Генерация: автоматическая из аннотаций в коде (fastify-swagger или @nestjs/swagger)
- Доступ: `/api/docs` (Swagger UI) в development и staging
- В production: `/api/docs` доступен только администраторам (по JWT)
- Формат: JSON (`/api/docs.json`) и YAML (`/api/docs.yaml`) для интеграции с Postman/Insomnia
