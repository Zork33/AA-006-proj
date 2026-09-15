# Архитектура v2: Единая таблица users + Роли + Рефералы

## 1. Ключевые правила

- **Super Admin** всегда имеет статус `active`. Его нельзя заблокировать, удалить или деактивировать обычными средствами. Только другой Super Admin может изменить его данные (но статус всегда остаётся активным).
- При **создании партнёра** обязательно указывается / выбирается хотя бы один Partner Admin. Партнёр не может быть создан «в вакууме» — это защита от утечек и бесхозных данных.
- Partner Admin может иметь два уровня прав:
  - `full` — полный доступ (редактирование, приглашения, управление)
  - `view_only` — только просмотр данных партнёра (статистика, рефералы, пользователи)
- Все пользователи живут в **одной большой таблице `users`**. Роли и привязки к партнёрам вынесены в отдельные таблицы.

---

## 2. Структура БД

```sql
-- =====================================================
-- 1. Большая таблица всех пользователей
-- =====================================================
users (
  id                UUID PRIMARY KEY,
  email             VARCHAR(255) UNIQUE NOT NULL,
  name              VARCHAR(255),
  phone             VARCHAR(50),
  status            ENUM('active', 'blocked', 'pending', 'deleted') NOT NULL DEFAULT 'pending',
  is_super_admin    BOOLEAN NOT NULL DEFAULT false,   -- быстрый флаг
  deleted_at        TIMESTAMP NULL,                   -- soft-delete
  last_login_at     TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now(),

  -- Ограничение: Super Admin всегда active
  CONSTRAINT super_admin_always_active
    CHECK (NOT is_super_admin OR status = 'active')
);

-- =====================================================
-- 2. Партнёры
-- =====================================================
partners (
  id                UUID PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(100) UNIQUE NOT NULL,
  status            ENUM('active', 'pending', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
  created_by        UUID REFERENCES users(id),        -- кто создал (обычно Super Admin)
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. Роли пользователей (many-to-many)
-- =====================================================
user_roles (
  id                UUID PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES users(id),
  role              ENUM('super_admin', 'partner_admin', 'service_user') NOT NULL,
  partner_id        UUID REFERENCES partners(id),     -- NULL только у super_admin
  access_level      ENUM('full', 'view_only') DEFAULT 'full',  -- только для partner_admin
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES users(id),        -- кто назначил роль

  -- Уникальность
  UNIQUE(user_id, role, partner_id),

  -- Super Admin не привязан к партнёру
  CONSTRAINT super_admin_no_partner
    CHECK (role != 'super_admin' OR partner_id IS NULL),

  -- Partner Admin обязан иметь partner_id
  CONSTRAINT partner_admin_has_partner
    CHECK (role != 'partner_admin' OR partner_id IS NOT NULL),

  -- access_level только у partner_admin
  CONSTRAINT access_level_only_for_partner_admin
    CHECK (role = 'partner_admin' OR access_level IS NULL)
);

-- =====================================================
-- 4. Реферальные коды
-- =====================================================
referral_codes (
  id                      UUID PRIMARY KEY,
  code                    VARCHAR(32) UNIQUE NOT NULL,

  type                    ENUM('partner_invite', 'user_referral') NOT NULL,

  -- Кто создал код
  created_by_user_id      UUID REFERENCES users(id),

  -- Кому принадлежит код (для partner_invite — обязательно)
  owner_partner_id        UUID REFERENCES partners(id),

  target_type             ENUM('service', 'partner') NOT NULL,
  target_partner_id       UUID REFERENCES partners(id),       -- если рекомендуют конкретного партнёра

  is_active               BOOLEAN NOT NULL DEFAULT true,
  expires_at              TIMESTAMP,
  max_uses                INT,
  used_count              INT NOT NULL DEFAULT 0,

  created_at              TIMESTAMP NOT NULL DEFAULT now(),
  updated_at              TIMESTAMP NOT NULL DEFAULT now(),

  -- Партнёрская ссылка обязана быть привязана к партнёру
  CONSTRAINT partner_invite_must_have_owner
    CHECK (type != 'partner_invite' OR owner_partner_id IS NOT NULL)
);

-- =====================================================
-- 5. История использований рефералов
-- =====================================================
referral_usages (
  id                              UUID PRIMARY KEY,
  referral_code_id                UUID NOT NULL REFERENCES referral_codes(id),

  invited_user_id                 UUID REFERENCES users(id),
  invited_email                   VARCHAR(255),

  status                          ENUM('pending', 'activated', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
  activated_at                    TIMESTAMP,

  -- Снимки на момент использования (защита от потери данных)
  snapshot_created_by_user_id     UUID,
  snapshot_owner_partner_id       UUID,

  metadata                        JSONB DEFAULT '{}',
  created_at                      TIMESTAMP NOT NULL DEFAULT now()
);
```

---

## 3. Бизнес-правила

### Super Admin
- Всегда `status = 'active'` и `is_super_admin = true`.
- Нельзя заблокировать / удалить через обычный интерфейс.
- Может создавать партнёров и сразу назначать им админов.
- Видит абсолютно всё.

### Создание партнёра (защита от утечек)
При создании партнёра **обязательно** должно произойти одно из двух:

1. Выбран существующий пользователь → ему сразу создаётся роль `partner_admin` с `access_level = 'full'`.
2. Или создаётся новый пользователь → ему сразу выдаётся роль `partner_admin`.

Партнёр **не может** быть создан без хотя бы одного Partner Admin.
Это жёсткое правило на уровне приложения + триггер/проверка.

### Partner Admin
- Может быть назначен на **несколько** партнёров.
- Уровень доступа:
  - `full` — может создавать реферальные ссылки, редактировать данные, приглашать.
  - `view_only` — только смотрит статистику, список пользователей, историю рефералов. Не может ничего менять и создавать ссылки.

### Пользователи
- Все в одной большой таблице `users`.
- Роли и привязки к партнёрам — только через `user_roles`.
- Soft-delete (`status = 'deleted'` + `deleted_at`).

---

## 4. Реферальная логика

| Тип ссылки          | `created_by_user_id` | `owner_partner_id` | Что происходит при уходе пользователя |
|---------------------|----------------------|--------------------|---------------------------------------|
| `partner_invite`    | Кто создал           | Обязателен         | Код остаётся у партнёра, статистика сохраняется |
| `user_referral`     | Кто создал           | Обычно NULL        | Привязка к пользователю, статистика по нему доступна |

Даже если пользователь удалён — можно смотреть статистику по нему (через `created_by_user_id` + soft-delete).

---

## 5. Экраны

### Создание партнёра (только Super Admin)
```
Название партнёра: [____________]
Slug: [____________]

Администратор партнёра:          ← обязательно
○ Выбрать существующего пользователя
○ Создать нового пользователя

[Выпадающий список пользователей] или форма создания
Уровень доступа: [full / view_only]
```

### Карточка Partner Admin
- Список партнёров, к которым у него есть доступ.
- У каждого партнёра видно: `full` или `view_only`.
- Если `view_only` — кнопки «Создать ссылку», «Редактировать» скрыты.

### Статистика рефералов
- Можно фильтровать по пользователю (даже удалённому).
- Можно фильтровать по партнёру.
- Можно видеть «кто именно из админов партнёра сколько привёл».

---

## 6. Правила безопасности

1. Super Admin всегда активен.
2. Партнёр не создаётся без хотя бы одного админа.
3. Partner Admin может быть `view_only`.
4. Все пользователи — в одной таблице `users`.
5. Партнёрская реферальная ссылка всегда привязана к партнёру + к создавшему пользователю.
6. При уходе пользователя данные и статистика не теряются.

---

## 7. Имплементация (порядок)

1. SQL-миграции + индексы + триггеры
2. Backend: schema (Drizzle), auth, admin routes
3. Frontend: единая админ-панель `/admin`
4. Seed данные
5. Тесты
