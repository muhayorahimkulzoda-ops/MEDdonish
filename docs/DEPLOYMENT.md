# Развёртывание

## Окружения

| Env | Назначение |
|---|---|
| development | локально, Docker Postgres/Redis, OTP в лог **запрещён**, OTP в Mailhog/консоль только через отдельный DEV inbox flag |
| staging | полная схема, тестовые платежи, тестовые DRM, без продакшен-ключей |
| production | managed PostgreSQL, Redis, CDN, WAF, secret manager. Слабые `change-me` секреты, `OTP_DEV_ECHO` и `PAYMENTS_DEV_COMPLETE` останавливают boot. Обязательны https-контуры SMS, web-оплаты, store-verify, license server и CDN. HSTS включён. |

## Локальный контур

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
# Postgres публикуется на 5433, чтобы не конфликтовать с локальным PostgreSQL на 5432.
pnpm db:migrate
pnpm dev
```

Сервисы compose: `postgres`, `redis`. HTTPS-шлюз Caddy (профиль `https`):

```bash
docker compose -f infrastructure/docker/docker-compose.yml --profile https up -d
```

Локальный сертификат: `infrastructure/docker/tls/cert.pem` + `key.pem` (gitignored). Если файлов нет:

```bash
docker run --rm -v "$(pwd)/infrastructure/docker/tls:/out" alpine/openssl req -x509 -newkey rsa:2048 -keyout /out/key.pem -out /out/cert.pem -days 825 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

| Что | Адрес |
|---|---|
| Web TLS | `https://localhost:8443` (`/api/*` → Nest, остальное → Next.js) |
| Admin HTTP через шлюз | `http://localhost:8081` |
| API HTTP через шлюз | `http://localhost:8082` |
| Web без шлюза | `http://localhost:3001` |

HSTS ставит API только при `NODE_ENV=production`. Локальный Caddy HSTS не включает, чтобы не закрепить HTTPS на `localhost`.

Секреты: `SECRET_BACKEND=env` или `file` + `SECRET_DIR` (один файл = один ключ, путь относительно cwd процесса API). Значения не логируются и не коммитятся.

## CI/CD

```text
Git Push → Lint → Unit → API build → Integration → Staging → Smoke → Production
```

Локально и в GitHub Actions (`.github/workflows/ci.yml`):

```bash
pnpm --filter @meddonish/api test
pnpm --filter @meddonish/localization test
pnpm --filter @meddonish/api lint
pnpm --filter @meddonish/web lint
pnpm --filter @meddonish/admin lint
pnpm --filter @meddonish/api build
```

Секреты, OTP и DRM keys в CI не передаются. Unit-тесты не ходят в PostgreSQL.

API stateless: за load balancer можно ставить N реплик.

## Backup

Локально (контейнер `meddonish-postgres`, дамп не коммитить):

```powershell
powershell -File infrastructure/backup/backup.ps1
```

```bash
sh infrastructure/backup/backup.sh
```

Файлы пишутся в `infrastructure/backup/artifacts/` (gitignored), хранятся последние 7. Restore:

```powershell
powershell -File infrastructure/backup/restore.ps1 -File infrastructure/backup/artifacts/meddonish-YYYYMMDD-HHMMSS.sql
```

В production: ежедневный snapshot PostgreSQL + PITR, lifecycle object storage, секреты не в git и не в дампе логов.

## Monitoring

Публично: `GET /api/v1/health` — postgres + redis, без connection string и секретов. `down` → HTTP 503.

Админ: `GET /api/v1/admin/health` и страница `/ops` — uptime, pending video jobs, failed payments 24h, storage ok.

Access-лог API: метод, путь, статус, мс, `x-request-id`. Тело запроса, OTP, токены и секреты не пишутся. `/api/v1/health` в лог не попадает.

Дальше в production: CPU, RAM, disk, API latency, 5xx, очередь, CDN, error tracker без OTP/token/PIN/DRM keys.
