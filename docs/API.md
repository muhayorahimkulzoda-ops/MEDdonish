# HTTP API

База: `https://api.meddonish.com/api/v1/`  
Локально: `http://localhost:3000/api/v1/`  
Документация: OpenAPI / Swagger на `/api/docs`.

Все write-запросы валидируются DTO (class-validator + Zod для импорта).

## Auth

```text
POST /auth/request-otp
POST /auth/verify-otp
POST /auth/register
POST /auth/signin
POST /auth/reset-password
POST /auth/change-password
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/set-pin

GET  /me
PATCH /me
GET  /me/device
DELETE /me/device
GET  /me/export
POST /me/delete
```

## Public

```text
GET /public/disciplines
GET /public/courses
GET /public/courses/:slug
GET /public/courses/:id/preview
GET /public/account-deletion
GET /public/offer
GET /public/store-products
```

## Subscriber

```text
GET  /me/subscriptions
GET  /me/entitlements
GET  /courses/:courseId/lessons
GET  /lessons/:lessonId

POST /videos/:videoId/playback-session
POST /videos/:videoId/progress
POST /videos/:videoId/heartbeat

GET  /documents/:documentId/view-session

POST /tests/:id/start
GET  /test-attempts/:id/question
POST /test-attempts/:id/answer
POST /test-attempts/:id/finish
GET  /test-attempts/:id/result
```

Защищённые lesson/video/document/test endpoints проходят entitlement + device check. Preview — исключение только для `is_free_preview`.

## Payments

```text
POST /orders
GET  /orders/:id
POST /webhooks/payments/:provider
POST /webhooks/google-play
POST /webhooks/apple
```

## Admin

```text
/admin/users
/admin/courses
/admin/lessons
/admin/videos
/admin/questions
/admin/tests
/admin/payments
/admin/subscriptions
/admin/analytics
/admin/settings
/admin/security
/admin/audit-logs
```

Отдельный admin auth + 2FA. Критичные изменения пишут audit log.
