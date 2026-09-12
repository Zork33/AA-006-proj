# Инфраструктура и платформа

> Связанные документы: [Архитектура](../architecture/README.md) | [PRD](../prd/README.md) | [Промпт для UI](../ui-prompts/README.md) | [План развития](../roadmap/README.md)

## Выбор платформы: Selectel

Все компоненты — VPS, Managed PostgreSQL, S3 — в одном облаке. Бесплатный трафик между продуктами, соответствующее 152-ФЗ (до УЗ-1).

## Архитектура

```text
                    MAX
                     │
                     ▼
                  Nginx
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       Vue + Tailwind        NestJS
       (статический)            │
                        ┌───────┴────────┐
                        ▼                ▼
                  PostgreSQL           S3
                  Managed             files
```

## Рекомендованная конфигурация

| Компонент | Конфигурация | ₽/мес |
|---|---|---:|
| VPS/VDS | 2 vCPU / 4 GB / 50 GB | **650** |
| Managed PostgreSQL | небольшой кластер | **~2 700–3 800** |
| S3 | 10–50 GB | **десятки ₽** |
| DNS | Selectel | **0** |
| Трафик | до 3 ТБ | **0** |
| SSL | Let's Encrypt | **0** |
| **Итого** | | **~3 400–4 500 ₽/мес** |

### Почему 4 GB RAM, а не 2 GB

Разница — 250 ₽/мес. Vue (статический) + NestJS + Nginx + Docker + monitoring гораздо комфортнее работают с 4 GB. Для production это оправдано.

### Почему Managed PostgreSQL, а не Docker

- Автоматические бэкапы
- Масштабирование без смены архитектуры
- Соответствие 152-ФЗ (до УЗ-1)
- Не нужно следить за состоянием БД

## Бюджет

### Вариант 1 — MVP

```text
VPS                 650 ₽
Managed PostgreSQL  ~2 700 ₽
S3                  ~50 ₽
──────────────────────────
                    ~3 400 ₽/мес
```

**≈ 40 тыс. ₽ в год.**

### Вариант 2 — Production (рекомендуется)

```text
VPS                 650 ₽
PostgreSQL          ~3 500 ₽
S3                   100 ₽
резерв/прочее        300 ₽
──────────────────────────
                    ~4 550 ₽/мес
```

**≈ 55 тыс. ₽ в год.**

## 152-ФЗ

Selectel: облачные серверы, Managed DB, S3 соответствуют требованиям 152-ФЗ для данных до УЗ-1.

Но это **не автоматическое выполнение всех требований** проектом. Selectel — инфраструктура. Безопасность приложения, настройки ИС и юридические/организационные требования — на операторе.

## Масштабирование

```text
500 users
   ↓
1 × app VPS
1 × Managed PG
   ↓
5 000 users
   ↓
2 × app VPS
Load Balancer
Managed PG ↑
```

Selectel позволяет масштабировать облачные серверы и Managed PostgreSQL без смены архитектуры.

## Не нужно на старте

- Kubernetes
- Load Balancer
- Redis
- Отдельный worker-server
- CDN
- Несколько application-серверов
- Multi-AZ PostgreSQL
- Отдельный monitoring stack

Всё это добавляется по мере роста.

## Ссылки

- [VPS Selectel](https://selectel.ru/services/cloud/vps-vds/)
- [Managed PostgreSQL](https://selectel.ru/services/cloud/managed-databases/)
- [S3](https://selectel.ru/services/cloud/storage/)
- [152-ФЗ (серверы)](https://docs.selectel.ru/cloud-servers/about/152-fz-cloud-server/)
- [152-ФЗ (БД)](https://docs.selectel.ru/managed-databases/about/152-fz-managed-databases/)
