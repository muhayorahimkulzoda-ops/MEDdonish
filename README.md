# MEDdonish

Медицинская образовательная LMS / streaming-платформа.

**Один backend — несколько клиентов:** Web (Next.js), Android и iOS (Godot + native video plugins).

| | |
|---|---|
| Аудитория | 50 000–100 000 пользователей |
| Контент | 3 дисциплины на старте, 30–40+ в проекте |
| Видео | ~250 уроков на старте, 800+ в проекте, исходник 1080p ≈ 4–6 GB |
| Тесты | 30 000+ вопросов, JSON-импорт |
| Языки | Русский, Тоҷикӣ, архитектура готова к English |

## Документация

| Документ | Содержание |
|---|---|
| [docs/TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md) | Официальное ТЗ v1.0 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура системы |
| [docs/DATABASE.md](docs/DATABASE.md) | Модель данных |
| [docs/API.md](docs/API.md) | HTTP API |
| [docs/AUTH.md](docs/AUTH.md) | OTP, устройства, токены |
| [docs/PAYMENTS.md](docs/PAYMENTS.md) | Платежи и entitlements |
| [docs/VIDEO_PIPELINE.md](docs/VIDEO_PIPELINE.md) | Upload, transcoding, HLS/DASH |
| [docs/DRM.md](docs/DRM.md) | Widevine, FairPlay, watermark |
| [docs/TEST_ENGINE.md](docs/TEST_ENGINE.md) | Банк вопросов и оценивание |
| [docs/SECURITY.md](docs/SECURITY.md) | Безопасность |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Окружения и CI/CD |
| [docs/APP_STORE.md](docs/APP_STORE.md) | Публикация iOS |
| [docs/GOOGLE_PLAY.md](docs/GOOGLE_PLAY.md) | Публикация Android |

## Репозиторий

```text
apps/
  api/              NestJS backend
  web/              Публичный сайт + панель подписчика
  admin/            Панель администратора
  mobile-godot/     Godot UI-shell (Android / iOS)

packages/
  shared-types/     Общие TypeScript-типы
  api-client/       HTTP SDK
  validation/       Zod-схемы
  localization/     Ключи RU / TG / EN
  config/           Общие константы

services/
  video-worker/
  notification-worker/

database/migrations/
infrastructure/docker/
docs/
```

## Быстрый старт

Требования: Node.js 22+, pnpm 10+, Docker.

```bash
pnpm install
cp .env.example .env
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis
# Postgres: 127.0.0.1:5433
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- Web: http://localhost:3001
- Admin: http://localhost:3002

## Этапы

1. Foundation — auth, OTP, device binding, RBAC
2. Admin CMS — дисциплины, курсы, уроки, PDF
3. Video Platform — HLS/DASH, DRM, CDN
4. Testing Engine — банк вопросов, 30 случайных, таймер 20 с
5. Clinical Learning — ситуационные задачи и клинические случаи
6. Payments — Web / Google Play / Apple IAP / Admin
7. Web client
8. Godot Android/iOS
9. Store release
10. Load testing

## Принципы

- Backend никогда не раздаёт исходные 4–6 GB MP4.
- Доступ к материалам только после проверки entitlement + device.
- Платёжный провайдер не решает, что можно смотреть — это делает Entitlement.
- Godot — UI-shell; видео на Android = Media3/ExoPlayer + Widevine, на iOS = AVPlayer + FairPlay.
- Один аккаунт — одно активное устройство.
