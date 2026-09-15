# Вариант: Единая таблица `users` + Единая админ-панель

## Код (`user_code`)
- Формат: **6–20 символов**, буквы + цифры + дефис/подчёркивание (напр. `NASH`, `build-24`, `anna_m`)
- Задаётся пользователем при регистрации (или админом при создании)
- Уникальность — UNIQUE constraint + проверка перед сохранением
- Реферальная ссылка: `site.com/?ref={user_code}`

## Новая таблица `users`

| Поле | Тип | Описание |
|---|---|---|
| `id` | SERIAL PK | |
| `user_code` | VARCHAR(20) UNIQUE NOT NULL | Буквенно-цифровой код |
| `name` | VARCHAR(255) | |
| `email` | VARCHAR(255) UNIQUE | |
| `password_hash` | VARCHAR(255) | NULL до первого входа |
| `role` | ENUM | `superadmin` / `admin` / `partner` |
| `region` | VARCHAR(100) | |
| `residential_complex` | VARCHAR(255) | |
| `status` | ENUM | `pending` / `active` / `blocked` |
| `approval_status` | ENUM | `pending` / `approved` / `rejected` |
| `approved_by` | INT FK→users.id | |
| `rating` | INT DEFAULT 100 | Только для партнёров |
| `referrer_code` | VARCHAR(20) | Код пригласившего |
| `is_test` | BOOLEAN | |
| `created_at` / `updated_at` | TIMESTAMP | |

## Связь many-to-many: `user_partners`

| Поле | Тип | Описание |
|---|---|---|
| `id` | SERIAL PK | |
| `user_id` | INT FK→users.id NOT NULL | Пользователь (исполнитель/агент) |
| `partner_id` | INT FK→users.id NOT NULL | Партнёр (role=partner) |
| `created_at` | TIMESTAMP | |
| **UNIQUE** | `(user_id, partner_id)` | Одна связь только один раз |

**Смысл:**
- Партнёр может привязать к себе нескольких пользователей (сотрудники, агенты)
- Один пользователь может работать на нескольких партнёров
- Заявки привязываются к `user_id` исполнителя, а не к партнёру напрямую

## Единая админ-панель `/admin`

Одна панель с двумя секциями:

| Секция | Доступ | Страницы |
|---|---|---|
| **Админ-функции** | `superadmin`, `admin` | Дашборд, Заявки, Услуги, Админы (superadmin) |
| **Партнёр-функции** | `partner` (также доступны админу) | Реферальная ссылка, Приглашённые, Сотрудники (many-to-many) |

**Логика доступа:**
- `superadmin` — видит всё (админ + партнёр секции)
- `admin` — видит админ-функции + может переключиться в режим «партнёр» (видит свои ref-ссылку, приглашённых)
- `partner` — видит только партнёр-функции

**Навигация:**
```
/admin              → Дашборд (общая статистика)
/admin/leads        → Заявки (админ)
/admin/services     → Услуги (админ)
/admin/admins       → Админы (superadmin)
/admin/referral     → Реферальная ссылка (partner + admin)
/admin/invites      → Приглашённые (partner + admin)
/admin/team         → Сотрудники (partner + admin) — привязка users к partner
```

## Изменения

### Миграция БД
1. Таблица `users` с уникальным `user_code`
2. Таблица `user_partners` (many-to-many)
3. Перенос данных из `admins` + `partners`
4. `referrer_id` → `referrer_code`
5. FK в `leads`, `visits` → `users.id`
6. Удаление `admins`, `partners`

### Backend
- `schema.ts` — `users` + `user_partners` relations
- `auth.ts` — login/register ищет в `users`
- Удалить `partner/index.ts`
- `admin/referral.ts` — GET реферальной ссылки
- `admin/invites.ts` — GET приглашённых
- `admin/team.ts` — GET/POST/PATCH/DELETE привязок сотрудников
- `admin/index.ts` — дашборд

### Frontend
- Удалить `/partner/*` маршруты
- `/admin` — единая панель
- `/admin/team` — управление сотрудниками (привязка/отвязка)

## Порядок выполнения
1. Миграция `002_unified_users.sql`
2. `schema.ts` (Drizzle)
3. `auth.ts`
4. `admin/*` роуты (включая referral/invites/team)
5. Удалить `partner/*` роуты
6. Фронтенд — единая панель `/admin` + страница team
7. Seed
8. Тесты
