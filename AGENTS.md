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

Репозиторий пока содержит **документы и схему БД**. Код будет в `packages/backend/` и `packages/frontend/`.

| Путь | Содержание |
|---|---|
| `docs/prd/` | Product Requirements Document |
| `docs/architecture/` | Архитектура, стек, модели данных, API |
| `docs/roadmap/` | Поэтапный план разработки (8 этапов) |
| `docs/infrastructure/` | Selectel, бюджет, конфигурация сервера |
| `docs/ui-prompts/` | Промпт для генерации UI |
| `docs/bdd/` | BDD-сценарии (placeholder) |
| `db/init.sql` | Схема БД + seed (services, partners, leads, visits) |
| `docker-compose.yml` | PostgreSQL 15 |

## Ключевые решения

- **Svelte** вместо Vue — компилируется в vanilla JS (~2–4KB gzipped)
- **UnoCSS** вместо Tailwind — на 20–40% меньше CSS
- **Fetch** вместо axios — нативный HTTP-клиент
- Реферальная система: `?ref=TOKEN`, cookie 30 дней, first-touch
- Партнёрская рефералка: один партнёр приглашает другого через промо-код
- Апровал партнёров: добавление = `pending`, отображается на лендинге только после `approved`
- Рейтинг партнёра: 0–100, скрывается при `< 50`
- Админы привязаны к регионам/ЖК, суперадмины — ко всему
- Корневой суперадмин: пароль задаётся при первом входе
- Тестовый суперадмин: только в `NODE_ENV=test`
- Авторизация MVP: email + пароль (JWT). Далее: OAuth (Google, Яндекс, VK)
- Название проекта: **не зафиксировано** (рабочее: Proj)

## Тестирование

- Покрытие кода: **≥ 96%** (line coverage)
- Фреймворк: Vitest
- Интеграционные тесты: реальная PostgreSQL через Docker
