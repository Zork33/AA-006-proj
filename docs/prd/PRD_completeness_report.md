# Отчёт по полноте PRD
## Проект: сайт-визитка с QR-кодом, услугами и реферальной системой

### 1. Резюме

Текущий PRD представляет собой качественный **концептуальный черновик**: он описывает продукт, основные роли пользователей, ключевые пользовательские сценарии, публичный лендинг, реферальную механику, административную часть, заявки, базовые нефункциональные требования и границы MVP.

При этом документ пока недостаточно детализирован для использования как единственного источника требований для полноценной разработки. Разработчикам, дизайнеру и QA придётся самостоятельно принимать решения по ряду критических вопросов.

### Итоговая оценка

| Сценарий использования | Оценка |
|---|---:|
| Обсуждение идеи с заказчиком | 8/10 |
| Оценка MVP | 7/10 |
| Работа дизайнера | 6/10 |
| Работа frontend/backend разработчика | 5–6/10 |
| Разработка автономным AI-разработчиком | 4–5/10 |

Ориентировочно текущий документ покрывает **60–70% требований полноценного PRD**.

---

# 2. Что уже описано достаточно хорошо

| Область | Состояние |
|---|---|
| Обзор продукта | ✅ |
| Цели | ✅ |
| Метрики | ✅ |
| Персоны | ✅ |
| User Stories | ✅ |
| Landing Page | ✅ |
| Форма заявки | ✅ |
| Referral-механика | ✅ |
| Выбор модели атрибуции | ✅ |
| Личный кабинет партнёра | Частично |
| Админ-панель | ✅ |
| Обработка заявок | ✅ |
| Защита от спама | Частично |
| Mobile-first | ✅ |
| Персональные данные | Частично |
| Out of Scope | ✅ |
| Зависимости | ✅ |
| MVP | ✅ |

Основная концепция продукта сформулирована правильно.

---

# 3. Ключевые недостатки

Наиболее существенный недостаток текущего PRD — не отсутствие общего описания, а недостаточная формализация поведения системы.

Сейчас документ отвечает на вопрос:

> Что должен делать продукт?

Но недостаточно отвечает на вопросы:

> Что именно происходит в каждом сценарии?

> Какие данные хранятся?

> Какие правила действуют при конфликте источников?

> Когда партнёру начисляется вознаграждение?

> Что считается заявкой, переходом, дублем и конверсией?

> Как система должна вести себя при ошибках?

Именно эти вопросы необходимо закрыть перед разработкой.

---

# 4. Что необходимо добавить

## 4.1. Product Scope

Необходимо чётко разделить:

### MVP

- landing;
- список услуг;
- форма заявки;
- сохранение заявки;
- QR;
- referral links;
- first-touch attribution;
- Telegram/email уведомления;
- админ-панель;
- управление услугами;
- управление партнёрами;
- экспорт данных.

### V2

- личный кабинет партнёра;
- детальная аналитика;
- CRM;
- автоматический расчёт комиссий;
- автоматические выплаты;
- дополнительные QR-кампании.

Это позволит предотвратить расширение MVP за счёт функций, которые не нужны на первом этапе.

---

# 5. User Flows

Текущих User Stories недостаточно. Нужны детальные end-to-end сценарии.

## QR → заявка

Рекомендуемый flow:

```text
User scans QR
        ↓
GET /
        ↓
Detect source
        ↓
source = QR
        ↓
Render landing
        ↓
Select service
        ↓
Fill form
        ↓
Accept privacy policy
        ↓
POST /api/leads
        ↓
Validate
        ↓
Check duplicate
        ↓
Save lead
        ↓
Notify manager
        ↓
Show success
```

## Partner → заявка

```text
Partner link
        ↓
/?ref=TOKEN
        ↓
Resolve partner
        ↓
Store attribution
        ↓
Landing
        ↓
Form
        ↓
POST /api/leads
        ↓
lead.partner_id = partner
```

Также необходимы сценарии:

- повторный визит;
- несколько партнёров;
- QR после referral;
- referral после QR;
- неправильный referral token;
- заблокированный партнёр;
- повторная отправка формы;
- duplicate lead.

---

# 6. Referral Attribution

Это критическая часть системы и её необходимо формализовать.

## Нужно определить

### Идентификатор

Например:

```text
https://site.com/?ref=TOKEN
```

Лучше использовать непрозрачный токен, а не последовательный `PARTNER_ID`.

### Cookie / Session

Необходимо определить:

- название атрибуционного идентификатора;
- срок жизни;
- domain;
- path;
- secure;
- httpOnly, если применимо;
- SameSite policy.

### Модель

Для MVP рекомендуется:

```text
first_touch
```

### Конфликтующие переходы

Пример:

```text
Day 1:
Partner A → user

Day 5:
QR → user

Day 10:
Partner B → user

Day 15:
Lead
```

Необходимо зафиксировать, что источником остаётся `Partner A`, если используется first-touch.

---

# 7. Lead Lifecycle

В текущем PRD отсутствует полноценный жизненный цикл заявки.

Рекомендуемая модель:

```text
NEW
 ↓
CONTACTED
 ↓
QUALIFIED
 ↓
CONVERTED
```

Дополнительные конечные состояния:

```text
REJECTED
DUPLICATE
CANCELLED
```

Необходимо определить:

- кто меняет статус;
- может ли статус изменяться назад;
- какие статусы доступны менеджеру;
- какие статусы учитываются в аналитике;
- какие статусы участвуют в расчёте вознаграждения.

---

# 8. Партнёрские вознаграждения

Это один из самых больших пробелов текущего документа.

Необходимо определить модель:

### Возможные варианты

```text
per lead
fixed amount
percentage of sale
per converted customer
hybrid
```

Например:

```text
Lead created
      ↓
Pending commission
      ↓
Lead converted
      ↓
Approved
      ↓
Paid
```

Необходимо также определить:

- размер комиссии;
- валюту;
- минимальную сумму выплаты;
- период расчёта;
- возвраты;
- отмены;
- fraud;
- ручные корректировки;
- правила для дублей;
- оплачивается ли просто заявка или фактическая продажа.

---

# 9. Data Model

Для полноценной реализации необходима логическая модель данных.

Минимально предполагаются сущности:

## Partner

```text
id
name
email
status
referral_token
created_at
updated_at
```

## Service

```text
id
name
description
price
status
created_at
updated_at
```

## Lead

```text
id
name
phone
service_id
partner_id
source
attribution_type
status
created_at
updated_at
```

## Visit / Attribution Event

```text
id
session_id
partner_id
source
timestamp
```

Точная структура будет зависеть от того, насколько детальную аналитику требуется хранить.

---

# 10. Аналитика

Метрики должны быть определены не только на уровне целей, но и на уровне событий и формул.

## Traffic

- visits;
- unique visitors;
- QR visits;
- referral visits;
- visits per partner.

## Leads

- total leads;
- QR leads;
- partner leads;
- duplicate leads;
- converted leads.

## Conversion

Например:

```text
Conversion Rate = Leads / Unique Visitors × 100%
```

## Partner statistics

Для каждого партнёра:

```text
clicks
unique visits
leads
conversion rate
converted leads
commission
```

Нужно отдельно определить, что именно считается переходом и уникальным посетителем.

---

# 11. API Requirements

В PRD не обязательно описывать полный OpenAPI contract, но основные интерфейсы желательно зафиксировать.

Например:

```text
GET    /api/services
POST   /api/leads

POST   /api/admin/login
GET    /api/admin/leads
GET    /api/admin/leads/:id

POST   /api/admin/services
PATCH  /api/admin/services/:id

POST   /api/admin/partners
PATCH  /api/admin/partners/:id
GET    /api/admin/partners

GET    /api/partner/statistics
```

Для ключевых endpoints стоит определить:

- request;
- response;
- validation;
- error codes;
- authentication.

---

# 12. Acceptance Criteria

Это обязательный слой для качественного PRD.

## Пример: Referral

**Given**

Пользователь открыл:

```text
/?ref=abc123
```

**When**

он отправляет заявку через 20 дней.

**Then**

```text
lead.partner_id = partner(abc123)
```

если реферальный токен ещё действителен.

## Пример: Duplicate

**Given**

заявка с данным телефоном была создана менее N минут назад.

**When**

создаётся новая заявка.

**Then**

система применяет правило duplicate и не создаёт обычную новую заявку.

Для каждой существенной функции следует добавить подобные критерии.

---

# 13. Error Handling

Необходимо отдельно описать negative scenarios.

Минимум:

- неверный телефон;
- пустые обязательные поля;
- неверная услуга;
- отключённая услуга;
- неизвестный referral token;
- заблокированный партнёр;
- превышение rate limit;
- duplicate;
- ошибка БД;
- ошибка notification service;
- timeout;
- повторный submit;
- потеря соединения.

---

# 14. Authentication & Authorization

Нужно определить роли и права.

Рекомендуемый вариант:

```text
ADMIN
MANAGER
PARTNER
```

Пример:

| Действие | Admin | Manager | Partner |
|---|---:|---:|---:|
| Просмотр всех заявок | ✅ | ✅ | ❌ |
| Просмотр своих заявок | ✅ | ✅ | ✅ |
| Изменение услуг | ✅ | ❌ | ❌ |
| Управление партнёрами | ✅ | ❌ | ❌ |
| Экспорт | ✅ | ✅ | ограниченно |
| Просмотр комиссии | ✅ | ✅ | own |

---

# 15. Security

Существующий раздел безопасности необходимо расширить.

Следует определить:

- password hashing;
- session/JWT;
- CSRF;
- XSS protection;
- SQL injection protection;
- rate limiting;
- brute-force protection;
- secure cookies;
- HTTPS;
- secret management;
- PII access control;
- audit logging.

## Audit Log

Например:

```text
ADMIN created partner
ADMIN blocked partner
ADMIN changed service
ADMIN exported leads
ADMIN changed commission
```

---

# 16. Personal Data / Privacy

Упоминания 152-ФЗ недостаточно.

Нужно определить:

- перечень персональных данных;
- назначение обработки;
- срок хранения;
- доступ к данным;
- возможность удаления;
- экспорт;
- timestamp согласия;
- текст/версию согласия;
- возможность партнёра видеть телефон клиента.

Последний пункт является важным бизнес-решением.

---

# 17. UX/UI Requirements

Нужно добавить требования для дизайна.

Например:

```text
Hero
 ↓
Services
 ↓
CTA
 ↓
Lead Form
 ↓
Consent
```

Для mobile-first:

- крупные touch targets;
- минимальное число полей;
- native phone keyboard;
- понятная CTA;
- корректная работа на узких экранах;
- состояние loading;
- success state;
- error state.

---

# 18. Infrastructure

Нужно хотя бы концептуально описать production architecture:

```text
Client
  ↓
Frontend
  ↓
Backend API
  ↓
Database
  ↓
Notification service
```

Также желательно определить environments:

```text
local
staging
production
```

И базовые требования:

- HTTPS;
- backups;
- logs;
- monitoring;
- health checks.

---

# 19. Observability

Рекомендуется добавить:

- application logs;
- error tracking;
- metrics;
- health endpoint;
- uptime monitoring;
- administrative audit logs.

Например:

```text
GET /health
```

---

# 20. Business Rules

Это ещё один критически важный слой.

Правила должны быть сформулированы однозначно.

Пример:

```text
1. Один пользователь может создать несколько заявок.
2. Телефон используется для проверки дублей.
3. Duplicate определяется в течение N минут.
4. Attribution model = first-touch.
5. Attribution cookie TTL = X days.
6. Последующие переходы не перезаписывают first-touch.
7. Заявка получает статус NEW при создании.
8. Только определённые статусы участвуют в расчёте комиссии.
9. Заблокированный партнёр не получает новые атрибуции.
10. Необходимо определить, получает ли партнёр деньги за lead или за sale.
```

---

# 21. Что особенно важно определить бизнесу

До начала полноценной разработки необходимо принять решения по следующим пунктам:

1. Сколько услуг и какие именно.
2. Какие поля содержит заявка.
3. Нужна ли цена услуги.
4. Нужен ли личный кабинет партнёра в MVP.
5. Сколько дней живёт referral attribution.
6. First-touch или last-touch.
7. Что происходит при нескольких партнёрах.
8. Что считается переходом.
9. Что считается уникальным посетителем.
10. Что считается дублем.
11. Какой статус является основанием для комиссии.
12. Как считается комиссия.
13. Кто видит данные клиента.
14. Какой канал уведомлений используется.
15. Один QR или несколько кампаний.
16. Срок хранения персональных данных.
17. Сколько заявок от партнёров в месяц — целевая метрика? (ответ: ≥ 25)

---

# 22. Рекомендуемая структура финального PRD

Для production-ready документа рекомендуется следующая структура:

```text
1. Product Overview
2. Problem Statement
3. Goals
4. Non-Goals
5. Success Metrics
6. Personas
7. User Stories
8. User Flows
9. Functional Requirements
   9.1 Landing
   9.2 Lead Form
   9.3 Referral
   9.4 Attribution
   9.5 Partner
   9.6 Admin
   9.7 Notifications
10. Business Rules
11. Lead Lifecycle
12. Referral & Commission Rules
13. Analytics
14. Data Model
15. API Requirements
16. Authentication & Authorization
17. Security
18. Privacy / Personal Data
19. UX/UI Requirements
20. Non-Functional Requirements
21. Error Handling
22. Acceptance Criteria
23. Out of Scope
24. Dependencies
25. Infrastructure
26. Monitoring & Logging
27. MVP Scope
28. V2 / Future Scope
29. Open Questions
30. Release Criteria
```

---

# 23. Итоговый вывод

Текущий PRD **не нужно переписывать с нуля**.

Его основа правильная и уже содержит основную продуктовую концепцию. Основная задача — перейти от описания идеи к формальной спецификации поведения системы.

Наиболее высокий приоритет имеет доработка следующих пяти блоков:

```text
1. Referral Attribution
2. Lead Lifecycle
3. Commission Rules
4. Data Model
5. Acceptance Criteria
```

Именно эти разделы определяют основную бизнес-логику продукта.

После их формализации PRD станет значительно более пригодным для:

- оценки сроков и стоимости;
- проектирования архитектуры;
- разработки frontend/backend;
- постановки задач AI-разработчику;
- написания тестов;
- приёмки MVP.

### Итоговая оценка

**Сейчас:** ~60–70% полноценного PRD.

**После закрытия перечисленных пробелов:** ~90–95%.

Последние проценты обычно заполняются уже конкретными UI-макетами, API-контрактами, схемой БД и техническими ограничениями выбранного стека.
