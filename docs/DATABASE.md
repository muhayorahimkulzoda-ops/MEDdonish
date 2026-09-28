# База данных

Основная СУБД: **PostgreSQL**. Схема управляется Prisma-миграциями в `database/` (генерация из `apps/api/prisma/schema.prisma`).

Любое изменение схемы — только через миграцию.

## Домены

```text
identity     users, user_profiles, admin_accounts, otp_requests
devices      devices, sessions, refresh_tokens
catalog      disciplines, courses, translations, sections, lessons
video        videos, video_variants, playback_sessions, video_progress
documents    documents, lesson_documents, user_notes
testing      questions, options, tests, pools, attempts, answers
clinical     situational_tasks, clinical_cases, steps, media
commerce     plans, course_prices, orders, payments, payment_events,
             subscriptions, entitlements
notify       notifications, templates, device_push_tokens
system       settings, audit_logs, security_events
```

## Ключевые инварианты

- `users.phone` уникален, формат E.164.
- Активное устройство: не более одной строки `devices.is_active = true` на `user_id`.
- `entitlements` — источник истины доступа. `subscriptions` и `payments` — коммерческая история.
- Вопрос живёт в банке; тест ссылается на пул, а не владеет вопросами.
- `test_attempt_questions` неизменяемы после `POST /tests/:id/start`.
- Видеофайлы в БД не хранятся — только ключи object storage и статусы.

## Оценивание

Границы оценок хранятся в `settings`, не в коде UI:

```text
grade_5_min = 28
grade_4_min = 24
grade_3_min = 15
pass_min    = 15
video_completed_percent = 90
free_preview_limit = 1
single_device_policy = require_release | auto_revoke
```

0–14 правильных из 30 → неудовлетворительный результат («Вы плохо сдали тест»).

## Индексы первого этапа

- `users(phone)`
- `entitlements(user_id, course_id, status, expires_at)`
- `devices(user_id, is_active)`
- `refresh_tokens(token_hash)`, `refresh_tokens(device_id)`
- `otp_requests(phone, created_at)`
- `questions(discipline_id, course_id, lesson_id, is_active)`
- `test_attempts(user_id, test_id, started_at)`
- `video_progress(user_id, video_id)`
- `payments(provider, provider_payment_id)` уникально
- `audit_logs(actor_id, created_at)`

Analytics-таблицы (`video_progress`, `test_answers`, `security_events`) при росте можно партиционировать по дате.
