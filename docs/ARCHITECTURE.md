# Архитектура MEDdonish

## Принцип

**ONE BACKEND — MULTIPLE CLIENTS.** Все критические правила живут на backend: подписка, устройство, платежи, доступ, тесты, результаты, DRM-авторизация.

```text
                         MEDdonish
                             │
                         Cloud DNS
                             │
                        CDN / WAF
                             │
          ┌──────────────────┼─────────────────┐
          │                  ▼                 │
         WEB              Android             iOS
       Next.js             Godot              Godot
          │                  │                 │
          └──────────────────┼─────────────────┘
                             │ HTTPS
                       Load Balancer
                   ┌─────────┼─────────┐
                  API       API       API
                             │
       ┌─────────────────────┼────────────────────┐
       PostgreSQL          Redis               Queue
                                                 │
                                    Video / Notification / Import workers
                                                 │
                                          Object Storage → DRM/CDN
                                          Widevine (Android) / FairPlay (Apple)
```

## Модульный монолит

На Этапе 1 один NestJS-процесс с доменными модулями:

- `identity` — пользователи, OTP, PIN, admin 2FA
- `devices` — binding, сессии, refresh tokens
- `catalog` — дисциплины, курсы, разделы, уроки, переводы
- `entitlements` — доступ, не платежи
- `payments` — заказы, адаптеры провайдеров, webhooks
- `video` — метаданные, playback session, progress
- `documents` — PDF, signed URL
- `testing` — банк вопросов, попытки
- `clinical` — ситуационные задачи и случаи
- `notifications`
- `admin` — CMS, analytics, security, settings, audit

Вынести в отдельные сервисы можно позже: video processing, notifications, analytics, payments.

## Клиенты

| Клиент | Роль |
|---|---|
| `apps/web` | публичный сайт + панель подписчика |
| `apps/admin` | только владелец, отдельный permission layer |
| `apps/mobile-godot` | UI-shell. Видео, DRM, Keystore/Keychain, IAP, push — native plugins |

Клиенты не ходят в PostgreSQL и не знают object storage keys.

## Защищённый запрос

Каждый защищённый материал проходит одну цепочку:

```text
user active? → device valid? → entitlement active? → course/lesson allowed?
```

Preview-урок (`is_free_preview`) пропускает entitlement, но не пропускает rate limit и не отдаёт исходник видео.

## Масштабирование

- API stateless: горизонтально за load balancer.
- Видео-трафик идёт через CDN, не через API.
- PostgreSQL: managed, pooling, затем read replica и partitioning analytics.
- Redis: каталог, публичные настройки, не чужие subscription results.
- Цель API: p95 300–500 ms на стандартных запросах.

## Общие пакеты

- `@meddonish/shared-types` — enum, DTO-типы, grade math
- `@meddonish/validation` — Zod, используется API и админ-импортом
- `@meddonish/localization` — ключи и словари
- `@meddonish/api-client` — SDK для web/admin/будущего Godot HTTP
- `@meddonish/config` — имена планов, TTL токенов, пороги по умолчанию
