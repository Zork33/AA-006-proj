# AGENTS.md

## Коммиты

- Писать коммит-сообщения на русском языке
- Формат: `тип: краткое описание` (например: `docs: добавить план разработки`)
- Типы: `feat`, `fix`, `docs`, `infra`, `refactor`, `test`, `chore`

## Стек (зафиксирован, не менять)

| Компонент | Технология |
|---|---|
| Frontend | **Svelte** + **UnoCSS** (НЕ Tailwind, НЕ Vue) |
| Backend | Node.js + Fastify + TypeScript |
| ORM | Drizzle |
| БД | PostgreSQL 15 |
| HTTP | Native `fetch` (НЕ axios) |
| Контейнеры | Docker Compose |

## Локальная разработка

```bash
docker-compose up -d          # PostgreSQL на localhost:5432
```

Подключение: `leads_user` / `leads_password` / `leads_db`

## Структура проекта

| Путь | Содержание |
|---|---|
| `packages/backend/` | Node.js + Fastify + TypeScript API |
| `packages/frontend/` | Svelte 5 + SvelteKit + UnoCSS |
| `docs/prd/` | Product Requirements Document |
| `docs/architecture/` | Архитектура, стек, модели данных, API |
| `docs/roadmap/` | Поэтапный план разработки |
| `docs/infrastructure/` | Selectel, бюджет, конфигурация сервера |
| `docs/ui-prompts/` | Промпт для генерации UI |
| `db/init.sql` | Схема БД + seed |
| `docker-compose.yml` | PostgreSQL 15 |

## Ключевые решения

- **Svelte** вместо Vue — компилируется в vanilla JS (~2–4KB gzipped)
- **UnoCSS** вместо Tailwind — на 20–40% меньше CSS
- **Fetch** вместо axios — нативный HTTP-клиент
- Единая таблица `users` — admins, partners, clients в одной таблице
- `user_code` — буквенно-цифровой код (6–20 символов) для реферальных ссылок (`?ref={user_code}`)
- Many-to-many: пользователь может быть привязан к нескольким партнёрам (`user_partners`)
- Единая админ-панель `/admin` — админ-функции + партнёр-функции в одном месте
- Апровал: добавление = `pending`, отображается на лендинге только после `approved`
- Рейтинг: 0–100, скрывается при `< 50`
- Корневой суперадмин: пароль задаётся при первом входе
- Тестовый суперадмин: только в `NODE_ENV=test`
- Авторизация MVP: email + пароль (JWT httpOnly cookies). Далее: OAuth (Google, Яндекс, VK)
- SSR для лендинга: `+page.server.ts` загружает данные на сервере
- Drizzle ORM: schema с relations, типы через `InferSelectModel`
- Отзыв клиента: рейтинг 1–5, влияет на рейтинг (+2 при 4–5★, -3 при 1–2★)
- Название проекта: **не зафиксировано** (рабочее: Proj)

## Тестирование

- Покрытие кода: **≥ 96%** (line coverage)
- Фреймворк: Vitest
- Интеграционные тесты: реальная PostgreSQL через Docker
