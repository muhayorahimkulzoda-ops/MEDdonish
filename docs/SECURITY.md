# Безопасность

## Обязательные меры

HTTPS, HSTS (только `NODE_ENV=production`), rate limiting (OTP/login 8/мин), защита от SQL injection через Prisma, XSS/CSRF на web, DTO validation каждого запроса, RBAC, admin 2FA, secret manager / проверка слабых секретов при старте production, device binding, DRM, signed URL, audit logs.

Заголовки API и Next.js: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP, COOP. API отвечает `Cache-Control: no-store`. JWT только HS256, `iss=meddonish-api`, отдельный `aud` для подписчика и админа. Webhook: HMAC от `timestamp.body` + окно 5 минут (`x-webhook-timestamp`) в production. Повторно использованный refresh отзывает все сессии пользователя. OTP блокируется после 5 неверных попыток, PIN — после 8 за 15 минут. Play Integrity / App Attest — HMAC ticket (`x-app-integrity`) только для Android/iOS. Swagger в production выключен, пока не задан `SWAGGER_ENABLED=true`.

`OTP_DEV_ECHO` и `PAYMENTS_DEV_COMPLETE` в production запрещены.

Секреты читает `SecretManager`: `env` или файлы в `SECRET_DIR`. В логи не попадают. В production слабые значения останавливают boot.

## Что никогда не логировать

- access token, refresh token
- OTP
- пароль, PIN
- payment secret, webhook raw с секретами
- DRM keys / key seeds
- тело запроса, Authorization, query string

Каждый ответ несёт `x-request-id`. Access-лог: метод, путь без query, статус, длительность, request id.

## RBAC

| Роль | Доступ |
|---|---|
| anonymous | публичный каталог, preview, начало оплаты |
| subscriber | материалы своих активных entitlements |
| admin | CMS, пользователи, выплаты, настройки |

Admin API — отдельный permission layer (`apps/api` admin guards), не тот же JWT, что у подписчика, либо тот же issuer с `typ=admin` и TOTP step-up на критичных действиях.

## Audit

Любое критическое действие администратора: кто, действие, сущность, id, время, IP. Примеры: смена подписки, удаление урока, смена цены, блокировка пользователя.

## Подозрительная активность

Писать в `security_events`: частая смена device, много IP, параллельные refresh, неуспешные OTP. Администратор видит это в Security.

## Приватность

Собираем минимум: телефон, устройство, платежные метаданные, прогресс обучения. Не собираем диагнозы и медкарти пользователей. Клинические кейсы — обезличенные или синтетические. Удаление аккаунта: `POST /me/delete` и страница `/account-deletion`. Выгрузка своих данных: `GET /me/export` (без PIN, токенов, OTP, DRM keys).
