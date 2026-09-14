# План развития проекта

> Связанные документы: [PRD](../prd/README.md) | [Архитектура](../architecture/README.md) | [Инфраструктура](../infrastructure/README.md) | [Промпт для UI](../ui-prompts/README.md)

## Текущее состояние

| Документ | Статус |
|---|---|
| PRD | Готов: бизнес-вопросы закрыты, user flows, business rules |
| Архитектура | Готова: стек, модели, API, авторизация, апровал, рейтинг |
| Инфраструктура | Готова: Selectel, бюджет ~4–5 тыс.₽/мес |
| UI-промпт | Готов: дизайн-система ВСЯК, UI-Kit, layout-компоненты |
| Отчёт по полноте | Готов: выявлены пробелы |
| BDD | Пустой placeholder |

---

## Фаза 1: Закрытие бизнес-вопросов (до кода)

| # | Вопрос | Статус |
|---|---|---|
| 1 | Какие услуги и сколько? | Решено: фиксированный список (7 услуг) |
| 2 | Нужна ли цена услуги на лендинге? | Ожидает ответа |
| 3 | Какие данные кроме имени и телефона? | Решено: email, город, мессенджер (опц.) |
| 4 | Один QR или несколько кампаний? | Решено: один QR, масштабирование по регионам |
| 5 | Название проекта/бренда? | Варианты обсуждены, решение pending |

---

## Фаза 1.5: Закрытие критических пробелов (до нового функционала)

> Делается ПЕРЕД продолжением разработки. Цель — довести каркас до рабочего состояния.

### Шаг 1: Реферальная система — починить поток (0.5 дня) ✅

- [x] Бэкенд: `POST /api/leads` — читать `ref` из `request.cookies.ref`, а не из body (`leads/index.ts:50-59`)
- [x] Фронтенд: `LeadForm.svelte` — `credentials: 'same-origin'`, cookie отправляется автоматически
- [x] Фронтенд: при переходе по `?ref=TOKEN` вызывать `GET /api/referral/track` для записи в `visits`

### Шаг 2: Дедупликация — добавить `partner_id` (0.5 дня) ✅

- [x] Бэкенд: `POST /api/leads` — дедупликация по `phone + service_id + partner_id` за 24ч (`leads/index.ts:36-53`)
- [x] Тест: все 33 тестов проходят

### Шаг 3: Согласие 152-ФЗ (0.5 дня) ✅

- [x] Фронтенд: `LeadForm.svelte` — чекбокс «Согласие на обработку персональных данных»
- [x] Бэкенд: `POST /api/leads` — валидация поля `consent: true` (zod literal)
- [x] Бэкенд: возвращает 400 если consent не передан

### Шаг 4: Email-уведомления — SMTP вместо console.log (0.5 дня) ✅

- [x] Установить `nodemailer` + `@types/nodemailer`
- [x] `lib/notify.ts` — реальная отправка через SMTP, fallback на console.log если SMTP не настроен
- [x] Бэкенд: env-схема — добавлены SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MANAGER_EMAIL, CORS_ORIGIN, ROOT_ADMIN_EMAIL
- [x] `.env.example` — добавлены CORS_ORIGIN, ROOT_ADMIN_EMAIL

### Шаг 5: Seed — `ROOT_ADMIN_EMAIL` из env (0.5 дня) ✅

- [x] `db/init.sql` — суперадмин с `admin@example.com`, комментарий что email должен совпадать с `ROOT_ADMIN_EMAIL`
- [x] Тестовый суперадмин — вынесен в `db/test-seed.sql` (пароль: test1234)
- [x] `.env` — `ADMIN_EMAIL` заменён на `ROOT_ADMIN_EMAIL=admin@example.com`

### Шаг 6: Недостающие бэкенд-эндпоинты (1 день) ✅

| Эндпоинт | Файл | Описание |
|---|---|---|
| `POST /api/admin/services` | `routes/admin/services.ts` (новый) | Создание услуги ✅ |
| `PATCH /api/admin/services/:id` | `routes/admin/services.ts` | Редактирование/скрытие услуги ✅ |
| `PATCH /api/admin/partners/:id` | `routes/admin/partners.ts` | Блокировка/разблокировка ✅ |
| `GET /api/admin/leads/:id` | `routes/admin/leads.ts` | Детали заявки ✅ |
| `POST /api/auth/reset` | `routes/auth/index.ts` | Сброс пароля (email со ссылкой) ✅ |

### Шаг 7: Фронтенд — подключить API ко всем страницам (2 дня)

| Страница | Файл | Что сделать |
|---|---|---|
| Лендинг | `routes/+page.svelte` | Загружать услуги из `GET /api/services` вместо хардкода |
| Админ-дашборд | `routes/admin/+page.svelte` | Загружать статистику из API |
| Админ-заявки | `routes/admin/leads/+page.svelte` | Использовать `authFetch`, загружать заявки |
| Админ-партнёры | `routes/admin/partners/+page.svelte` | Загружать из API, обработчики approve/reject |
| Админ-услуги | `routes/admin/services/+page.svelte` | CRUD через API |
| Партнёр дашборд | `routes/partner/+page.svelte` | Загружать из `GET /api/partner/dashboard` |
| Партнёр реферал | `routes/partner/referral/+page.svelte` | Загружать из `GET /api/partner/referral` |
| Партнёр приглашения | `routes/partner/invites/+page.svelte` | Загружать из `GET /api/partner/invites` |

### Шаг 8: Guard — проверка ролей (0.5 дня)

- [ ] `admin/+layout.svelte` — проверять роль из JWT, редирект если нет прав
- [ ] Суперадмин-страницы (`/admin/admins`) — доступны только `role === 'superadmin'`
- [ ] Создать страницу `/admin/admins` (управление админами)

### Шаг 9:Swagger / OpenAPI (0.5 дня)

- [ ] Установить `@fastify/swagger` + `@fastify/swagger-ui`
- [ ] Подключить в `index.ts`, настроить генерацию из аннотаций
- [ ] Доступ: `/api/docs` в dev/staging

### Шаг 10: Инфраструктура (0.5 дня)

- [ ] `docker-compose.yml` — добавить `depends_on` с `condition: service_healthy` для бэкенда
- [ ] CORS — читать `CORS_ORIGIN` из env
- [ ] PM2 — создать `ecosystem.config.js`
- [ ] `.env.production` — создать шаблон

### Шаг 11: Тесты — покрыть критичные сценарии (1 день)

- [ ] Интеграционные тесты: `POST /api/leads` (дедупликация, реферал, 152-ФЗ)
- [ ] Интеграционные тесты: `POST /api/auth/login` (JWT, setup-password)
- [ ] Тест middleware: requireAuth, requireSuperadmin
- [ ] Тест rate limiting, honeypot
- [ ] Тест email-уведомлений (формат, SMTP)

### Итого по Фазе 1.5

| Шаг | Содержание | Срок |
|---|---|---|
| 1 | Реферальная система — починить поток | 0.5 дня |
| 2 | Дедупликация + partner_id | 0.5 дня |
| 3 | Согласие 152-ФЗ | 0.5 дня |
| 4 | Email-уведомления (SMTP) | 0.5 дня |
| 5 | Seed — ROOT_ADMIN_EMAIL | 0.5 дня |
| 6 | Недостающие бэкенд-эндпоинты | 1 день |
| 7 | Фронтенд — подключить API | 2 дня |
| 8 | Guard — проверка ролей | 0.5 дня |
| 9 | Swagger / OpenAPI | 0.5 дня |
| 10 | Инфраструктура | 0.5 дня |
| 11 | Тесты — критичные сценарии | 1 день |
| **Итого** | | **~8 дней** |

---

## Фаза 2: Разработка (поэтапный план)

**Стек:** Node.js + Fastify + TypeScript + PostgreSQL + Svelte + UnoCSS
**ORM:** Drizzle
**Контейнеризация:** Docker Compose (PostgreSQL 15)
**Тесты:** Vitest, покрытие ≥ 96%

### Этап 0: Каркас проекта (0.5 дня) ✅

- `docker-compose.yml`: PostgreSQL 15, порт 5432, healthcheck
- `db/init.sql`: schema + seed (services, admins, partners, leads, visits, lead_feedback)
- Backend: Fastify + `@fastify/cors`, `@fastify/env`
- Структура: `packages/backend/`, `packages/frontend/`
- `tsconfig.base.json`, `package.json` (workspace root)
- Vitest, настройка тестов

### Этап 1: Авторизация (1 день) ✅

| Эндпоинт | Описание |
|---|---|
| `POST /api/auth/login` | Вход (email + пароль → JWT) |
| `POST /api/auth/register` | Регистрация |
| `POST /api/auth/refresh` | Обновление токена |
| `POST /api/auth/reset` | Сброс пароля |

- JWT: access 15 мин, refresh 30 дней
- bcrypt (cost 12)
- Корневой суперадмин: пароль при первом входе
- Тестовый суперадмин: `NODE_ENV=test`

### Этап 2: API заявок — ядро (1–2 дня) ✅

| Эндпоинт | Описание |
|---|---|
| `GET /api/services` | Список активных услуг |
| `POST /api/leads` | Создание заявки (name, phone, email, city, service_id) |
| `POST /api/leads/:id/feedback` | Отзыв клиента (rating 1–5) |

- Валидация (zod)
- Дедупликация: телефон + услуга за 24ч → 409
- Формирование номера: `QR-0001`, `PARTNER-0001`

### Этап 3: Реферальная система (1 день) ✅

| Эндпоинт | Описание |
|---|---|
| `GET /api/services` | Список услуг |

- Реферальная ссылка: `site.com/?ref=TOKEN`
- Cookie: `ref=TOKEN` (30 дней, SameSite=Lax)
- First-touch атрибуция

### Этап 4: Апролов партнёров + рейтинг (1 день) ✅

| Эндпоинт | Описание |
|---|---|
| `POST /api/admin/partners` | Создание партнёра (pending) |
| `PATCH /api/admin/partners/:id/approve` | Одобрение партнёра |
| `PATCH /api/admin/partners/:id/reject` | Отклонение |
| `GET /api/admin/partners` | Список (фильтр по региону) |

- `approval_status`: pending → approved / rejected
- `rating`: 0–100, старт 100
- Правило: отображение на лендинге только при `approved` + `rating >= 50`
- Рейтинг: +2 за обработанную заявку, -5 за пропуск, -10 за жалобу

### Этап 5: Админ-панель (2 дня) ✅

**Админ (для нас):**

| Эндпоинт | Описание |
|---|---|
| `GET /api/admin/leads` | Все заявки (фильтры) |
| `PATCH /api/admin/leads/:id` | Смена статуса |
| `GET /api/admin/export` | Экспорт CSV |
| `GET /api/admin/partners` | Партнёры (по региону) |
| `POST /api/admin/admins` | Добавление админа (суперадмин) |

- `/admin`: дашборд, заявки, услуги, партнёры
- Админы привязаны к регионам/ЖК
- Суперадмин: управление всеми админами

### Этап 6: Личный кабинет партнёра (1 день) ✅

| Эндпоинт | Описание |
|---|---|
| `GET /api/partner/dashboard` | Дашборд |
| `GET /api/partner/referral` | Реферальная ссылка |
| `GET /api/partner/invites` | Приглашённые |

- `/partner`: дашборд, ref-ссылка, приглашённые
- Партнёр видит только свои данные

### Этап 7: Партнёрская рефералка (0.5 дня) ✅

| Эндпоинт | Описание |
|---|---|
| `POST /api/partners/register` | Регистрация с промо-кодом |

- `referrer_id` в таблице `partners`
- Первый партнёр — наш бизнес (seed)

### Этап 8: Уведомления по email (0.5 дня) ✅

- После `POST /api/leads` → отправка email
- Формат: имя, телефон, услуга, источник

### Этап 9: Лендинг + форма (1–2 дня) ✅

- Svelte + Vite + UnoCSS
- PublicLayout: логотип, контейнер 480px, футер
- Hero-секция, карточки услуг, форма
- Mobile-first
- Состояния: idle, loading, success, error

### Этап 10: Отзыв клиента (0.5 дня) ✅

- `/feedback`: рейтинг 1–5★ + комментарий
- Ссылка: `site.com/feedback?lead=LEAD_NUMBER`
- Влияние на рейтинг партнёра

### Этап 11: Безопасность и полировка (1 день) ✅

- Rate limiting: 10 req/min на `POST /api/leads`
- Honeypot-поле
- CSRF-токены
- HTTPS (Let's Encrypt)
- Логирование ошибок
- Keyboard navigation, accessibility

### Этап 12: Тесты (1–2 дня) ✅

- Unit-тесты: все сервисы и контроллеры
- **BDD-тесты:** 7 .feature файлов (Cucumber + Vitest)
- 28/28 тестов проходят

### Этап 13: Деплой (0.5 дня) ✅

- Selectel VPS: Ubuntu 22.04, Node.js 20+, PM2
- Nginx reverse proxy + SSL на vsyak.zork.ru
- scripts/deploy.sh + config/nginx.conf

### Итого

| Фаза | Содержание | Срок |
|---|---|---|
| 1 | Закрытие бизнес-вопросов | Готово |
| 1.5 | Закрытие критических пробелов | ~8 дней |
| 2 | Разработка (этапы 0–13) | ~12–17 дней |
| **Итого** | | **~20–25 дней** |

---

## Фаза 3: MVP → Production

| Задача | Сроки |
|---|---|
| Тестирование на реальных пользователях | 1 неделя |
| Сбор feedback, правки | 1 неделя |
| Настройка мониторинга, бэкапов | 1 день |
| Запуск | — |

---

## Фаза 4: После MVP

| Задача | Описание |
|---|---|
| OAuth | Google, Яндекс, VK, Одноклассники |
| Масштабирование лендингов | Несколько лендингов по регионам/ЖК |
| Партнёрский рейтинг | Автоматический пересчёт (cron) |
| CRM-интеграция | Передача заявок в CRM |
| Мобильное приложение | React Native / Flutter |

---

## Известные пробелы

| # | Проблема | Статус |
|---|---|---|
| 1 | ~~Нет страницы логина~~ | Готово |
| 2 | ~~Нет guard-а на маршрутах~~ | Готово |
| 3 | ~~Нет store для JWT~~ | Готово |
| 4 | Реферальная система не работает (cookie ref) | Фаза 1.5, шаг 1 |
| 5 | Дедупликация неполная (нет partner_id) | Фаза 1.5, шаг 2 |
| 6 | Нет согласия 152-ФЗ | Фаза 1.5, шаг 3 |
| 7 | Email — заглушка (console.log) | Фаза 1.5, шаг 4 |
| 8 | Seed не использует ROOT_ADMIN_EMAIL | Фаза 1.5, шаг 5 |
| 9 | Нет эндпоинтов admin/services, auth/reset и др. | Фаза 1.5, шаг 6 |
| 10 | Фронтенд-страницы без API | Фаза 1.5, шаг 7 |
| 11 | Guard не проверяет роли | Фаза 1.5, шаг 8 |
| 12 | Нет Swagger | Фаза 1.5, шаг 9 |
| 13 | Инфраструктура (docker, CORS, PM2) | Фаза 1.5, шаг 10 |
| 14 | Нет интеграционных тестов | Фаза 1.5, шаг 11 |

---

## Открытые вопросы

1. ~~Какие услуги?~~ → Фиксированный список (7 услуг)
2. ~~Данные клиента?~~ → Имя, телефон, email, город + мессенджер (опц.)
3. ~~QR/UTM?~~ → Один QR, масштабирование по регионам
4. ~~Стек фронта~~ → Svelte + UnoCSS
5. ~~Название~~ → Варианты обсуждены, решение pending
6. ~~Домен~~ → vsyak.zork.ru
7. ~~Контакт менеджера~~ → Email
8. ~~Цена услуги на лендинге~~ → Не отображать

---

## Приоритеты

| # | Задача | Когда |
|---|---|---|
| 1 | ~~Закрыть бизнес-вопросы~~ | Готово |
| 2 | ~~Определиться со стеком~~ → Svelte + UnoCSS | Готово |
| 3 | ~~Закрыть вопросы (домен, менеджер)~~ | vsyak.zork.ru |
| 4 | ~~Начать разработку (ветка v1)~~ | Готово |
| 5 | Закрыть критические пробелы (Фаза 1.5) | Сейчас |
| 6 | Продолжить разработку (Фаза 2) | После Фазы 1.5 |
