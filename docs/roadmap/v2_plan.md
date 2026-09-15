# План разработки v2: Рефакторинг на unified users

> Ветка: `v2` | Архитектура: [docs/variants/002_unified_users.md](../variants/002_unified_users.md)
> **Временные рамки**: ~5–7 дней (1 день = 6–8 часов активной работы)

---

## Этап 0: Подготовка (0.5 дня)

- [ ] Создать ветку `v2` (уже создана)
- [ ] Убедиться что все тесты на v1 проходят
- [ ] Создать `db/migrations/002_unified_users.sql` — начальный скелет миграции
- [ ] Добавить в `docker-compose.yml` volume для миграций (если нужно)

---

## Этап 1: SQL-миграция (1 день)

### 1.1 Создание новых таблиц

```sql
-- Таблица users (единая)
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  name              VARCHAR(255),
  phone             VARCHAR(50),
  password_hash     VARCHAR(255),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_super_admin    BOOLEAN NOT NULL DEFAULT false,
  deleted_at        TIMESTAMP NULL,
  last_login_at     TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT super_admin_always_active CHECK (NOT is_super_admin OR status = 'active')
);

-- Таблица partners
CREATE TABLE partners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(100) UNIQUE NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

-- Таблица user_roles (many-to-many)
CREATE TABLE user_roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  role              VARCHAR(20) NOT NULL,
  partner_id        UUID REFERENCES partners(id),
  access_level      VARCHAR(10),
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES users(id),
  UNIQUE(user_id, role, partner_id),
  CONSTRAINT super_admin_no_partner CHECK (role != 'super_admin' OR partner_id IS NULL),
  CONSTRAINT partner_admin_has_partner CHECK (role != 'partner_admin' OR partner_id IS NULL),
  CONSTRAINT access_level_only_for_partner_admin CHECK (role = 'partner_admin' OR access_level IS NULL)
);

-- Таблица referral_codes
CREATE TABLE referral_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(32) UNIQUE NOT NULL,
  type              VARCHAR(20) NOT NULL,
  created_by_user_id UUID REFERENCES users(id),
  owner_partner_id  UUID REFERENCES partners(id),
  target_type       VARCHAR(20) NOT NULL,
  target_partner_id UUID REFERENCES partners(id),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  expires_at        TIMESTAMP,
  max_uses          INT,
  used_count        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT partner_invite_must_have_owner CHECK (type != 'partner_invite' OR owner_partner_id IS NOT NULL)
);

-- Таблица referral_usages
CREATE TABLE referral_usages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id  UUID NOT NULL REFERENCES referral_codes(id),
  invited_user_id   UUID REFERENCES users(id),
  invited_email     VARCHAR(255),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  activated_at      TIMESTAMP,
  snapshot_created_by_user_id UUID,
  snapshot_owner_partner_id   UUID,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMP NOT NULL DEFAULT now()
);

-- Таблица user_partners (many-to-many: пользователь ↔ партнёр)
CREATE TABLE user_partners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  partner_id        UUID NOT NULL REFERENCES partners(id),
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_id)
);
```

### 1.2 Индексы

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_partner ON user_roles(partner_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_owner ON referral_codes(owner_partner_id);
CREATE INDEX idx_referral_usages_code ON referral_usages(referral_code_id);
CREATE INDEX idx_referral_usages_user ON referral_usages(invited_user_id);
CREATE INDEX idx_user_partners_user ON user_partners(user_id);
CREATE INDEX idx_user_partners_partner ON user_partners(partner_id);
```

### 1.3 Миграция данных

```sql
-- 1. Перенос admins → users
INSERT INTO users (id, email, name, password_hash, status, is_super_admin, created_at, updated_at)
SELECT id, email, name, password_hash,
  CASE WHEN role = 'superadmin' THEN 'active' ELSE 'active' END,
  (role = 'superadmin'),
  created_at, updated_at
FROM admins;

-- 2. Перенос partners → users + partners
INSERT INTO users (id, email, name, password_hash, status, is_super_admin, created_at, updated_at)
SELECT id, email, name, NULL, 'pending', false, created_at, updated_at
FROM partners;

INSERT INTO partners (id, name, slug, status, created_by, created_at, updated_at)
SELECT id, name, LOWER(REPLACE(name, ' ', '-')), status, NULL, created_at, updated_at
FROM partners;

-- 3. Назначение ролей
INSERT INTO user_roles (user_id, role, partner_id, access_level)
SELECT id, 'super_admin', NULL, NULL FROM admins WHERE role = 'superadmin';

INSERT INTO user_roles (user_id, role, partner_id, access_level)
SELECT id, 'partner_admin', id, 'full' FROM partners;

-- 4. Перенос referral_token → referral_codes
INSERT INTO referral_codes (code, type, created_by_user_id, owner_partner_id, target_type, is_active)
SELECT referral_token, 'partner_invite', id, id, 'partner', true
FROM partners WHERE referral_token IS NOT NULL;

-- 5. Перенос FK в leads, visits
ALTER TABLE leads ADD COLUMN partner_id_new UUID REFERENCES partners(id);
UPDATE leads SET partner_id_new = (SELECT id FROM partners WHERE partners.id = leads.partner_id);

ALTER TABLE visits ADD COLUMN partner_id_new UUID REFERENCES partners(id);
UPDATE visits SET partner_id_new = (SELECT id FROM partners WHERE partners.id = visits.partner_id);

-- 6. Удаление старых FK и таблиц
-- (после проверки всех зависимостей)
```

### 1.4 Триггеры

```sql
-- Триггер: Super Admin всегда active
CREATE OR REPLACE FUNCTION check_super_admin_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_super_admin AND NEW.status != 'active' THEN
    RAISE EXCEPTION 'Super Admin always must be active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_super_admin_status
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_super_admin_status();
```

---

## Этап 2: Drizzle Schema (0.5 дня)

- [ ] `packages/backend/src/db/schema.ts` — переписать на новые таблицы
- [ ] Добавить relations: users ↔ user_roles, partners ↔ user_roles, referral_codes ↔ referral_usages
- [ ] Типы: `InferSelectModel` для каждой таблицы
- [ ] `drizzle.config.ts` — обновить если нужно

**Файлы:**
- `packages/backend/src/db/schema.ts`

---

## Этап 3: Backend — Auth (0.5 дня)

- [ ] `auth.ts` — login ищет в `users` (не `admins`)
- [ ] JWT payload: `{ id, email, role, partnerId? }`
- [ ] `register` — создаёт пользователя + роль `service_user`
- [ ] `setup-password` — работает с `users`
- [ ] Middleware: `requireAuth` читает JWT, `requireRole(role)` проверяет роль

**Файлы:**
- `packages/backend/src/lib/auth.ts`
- `packages/backend/src/lib/middleware.ts`

---

## Этап 4: Backend — Admin Routes (1 день)

### 4.1 Управление партнёрами

| Эндпоинт | Описание |
|---|---|
| `POST /api/admin/partners` | Создание партнёра + обязательный partner_admin |
| `GET /api/admin/partners` | Список партнёров |
| `PATCH /api/admin/partners/:id` | Редактирование партнёра |
| `DELETE /api/admin/partners/:id` | Soft-delete партнёра |

### 4.2 Управление ролями

| Эндпоинт | Описание |
|---|---|
| `POST /api/admin/roles` | Назначение роли (super_admin/partner_admin/service_user) |
| `DELETE /api/admin/roles/:id` | Снятие роли |
| `PATCH /api/admin/roles/:id` | Изменение access_level |

### 4.3 Реферальные коды

| Эндпоинт | Описание |
|---|---|
| `GET /api/admin/referral` | Реферальная ссылка текущего пользователя |
| `POST /api/admin/referral` | Создание нового реферального кода |
| `GET /api/admin/referral/usages` | История использований |
| `GET /api/admin/invites` | Список приглашённых |

### 4.4 Сотрудники (many-to-many)

| Эндпоинт | Описание |
|---|---|
| `GET /api/admin/team` | Список сотрудников партнёра |
| `POST /api/admin/team` | Привязка сотрудника к партнёру |
| `DELETE /api/admin/team/:id` | Отвязка сотрудника |

### 4.5 Пользователи

| Эндпоинт | Описание |
|---|---|
| `GET /api/admin/users` | Список всех пользователей |
| `GET /api/admin/users/:id` | Детали пользователя |
| `PATCH /api/admin/users/:id` | Редактирование пользователя |
| `DELETE /api/admin/users/:id` | Soft-delete пользователя |

**Файлы:**
- `packages/backend/src/routes/admin/partners.ts`
- `packages/backend/src/routes/admin/roles.ts`
- `packages/backend/src/routes/admin/referral.ts`
- `packages/backend/src/routes/admin/team.ts`
- `packages/backend/src/routes/admin/users.ts`

---

## Этап 5: Backend — Удаление старого (0.5 дня)

- [ ] Удалить `packages/backend/src/routes/partner/` (весь каталог)
- [ ] Удалить таблицы `admins`, `partners` (старые) из schema
- [ ] Обновить все импорты и зависимости
- [ ] Проверить что тесты проходят

---

## Этап 6: Frontend — Единая админ-панель (1.5 дня)

### 6.1 Структура страниц

```
/admin                  → Дашборд (общая статистика)
/admin/leads            → Заявки (админ)
/admin/services         → Услуги (админ)
/admin/partners         → Партнёры (superadmin + admin)
/admin/partners/:id     → Карточка партнёра
/admin/users            → Пользователи (superadmin)
/admin/roles            → Роли (superadmin)
/admin/referral         → Реферальная ссылка (partner_admin + service_user)
/admin/invites          → Приглашённые (partner_admin)
/admin/team             → Сотрудники (partner_admin)
/admin/settings         → Настройки кода
```

### 6.2 Компоненты

- [ ] `+layout.svelte` — навигация с учётом ролей
- [ ] Страница `/admin/partners` — создание с обязательным partner_admin
- [ ] Страница `/admin/referral` — отображение `?ref={code}`
- [ ] Страница `/admin/team` — привязка/отвязка сотрудников
- [ ] Страница `/admin/users` — список с фильтрацией по роли

### 6.3 Удаление

- [ ] Удалить `packages/frontend/src/routes/partner/` (весь каталог)

**Файлы:**
- `packages/frontend/src/routes/admin/` (все страницы)

---

## Этап 7: Seed + Тесты (0.5 дня)

- [ ] Обновить `db/init.sql` — seed суперадмина + партнёра + ролей
- [ ] Обновить `db/test-seed.sql` — тестовые данные
- [ ] Обновить все тесты на новую схему
- [ ] Запустить `npm run test` — все тесты проходят

---

## Этап 8: Финальная проверка (0.5 дня)

- [ ] `npm run typecheck` — 0 ошибок
- [ ] `npm run test` — все тесты проходят
- [ ] Ручная проверка: логин суперадмина → создание партнёра → назначение partner_admin → создание реферальной ссылки
- [ ] Проверка: partner_admin `view_only` не может создавать ссылки
- [ ] Проверка: super_admin нельзя деактивировать

---

## Итого

| Этап | Содержание | Срок |
|---|---|---|
| 0 | Подготовка | 0.5 дня |
| 1 | SQL-миграция | 1 день |
| 2 | Drizzle Schema | 0.5 дня |
| 3 | Backend — Auth | 0.5 дня |
| 4 | Backend — Admin Routes | 1 день |
| 5 | Backend — Удаление старого | 0.5 дня |
| 6 | Frontend — Единая админ-панель | 1.5 дня |
| 7 | Seed + Тесты | 0.5 дня |
| 8 | Финальная проверка | 0.5 дня |
| **Итого** | | **~6.5 дней** |

---

## Зависимости

```
Этап 0 → Этап 1 → Этап 2 → Этап 3 → Этап 4 → Этап 5
                                                 ↓
                                            Этап 6 → Этап 7 → Этап 8
```

---

## Риски

| Риск | Митигация |
|---|---|
| Потеря данных при миграции | Миграция в транзакции + бэкап перед запуском |
| Нарушение FK зависимостей | Порядок миграции: users → partners → user_roles → leads/visits |
| Тесты ломаются | Пошаговое обновление, проверка после каждого этапа |
| Фронтенд не компилируется | Typecheck после каждого изменения |
