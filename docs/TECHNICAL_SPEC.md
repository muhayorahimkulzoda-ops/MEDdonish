# MEDdonish — техническое задание

**Версия:** 1.0  
**Тип:** LMS / медицинская образовательная streaming-платформа  
**Платформы:** Web, Android, iOS/iPadOS  
**Основной разработчик:** владелец платформы  
**IDE:** Cursor  
**Мобильный клиент:** Godot (UI-shell) + native video plugins

Этот документ — канонические продуктовые требования. Детали реализации см. в соседних файлах `docs/`.

## 1. Цель

Продавать и предоставлять ограниченный по времени доступ к медицинским курсам.

Последовательность урока:

```text
Видеоурок → PDF-конспект → Тестирование → Ситуационные задачи → Клинические примеры
```

Архитектура должна выдержать рост до 50–100 тыс. пользователей и 30–40+ дисциплин без полной переработки.

## 2. Три зоны

| Зона | Кто | Содержание |
|---|---|---|
| Публичная | все | главная, дисциплины, курсы, цены, пробный урок, оплата, вход |
| Подписчик | действующий entitlement | курсы, уроки, видео, PDF, тесты, задачи, клиника, результаты, профиль |
| Администратор | владелец | полный контроль контента, пользователей, оплат, аналитики, настроек |

Отдельной панели преподавателей нет.

## 3. Клиенты

```text
MEDdonish Backend  →  Web (Next.js)  |  Android (Godot)  |  iOS (Godot)
                              HTTPS API, одна БД, одни подписки
```

## 4. Локализация

На запуске: **Русский**, **Тоҷикӣ**. Архитектура сразу готова к **English**.

При первом открытии пользователь выбирает язык; выбор сохраняется. Не дублировать проект. Только ключи (`home.title`, `course.buy`, …) и translation-файлы.

## 5. Иерархия контента

```text
Дисциплина → Курс → Раздел → Тема → Урок
                                      ├── Видео
                                      ├── PDF
                                      ├── Тест
                                      ├── Ситуационные задачи
                                      └── Клинические примеры
```

Администратор создаёт дисциплины без изменения кода.

## 6. Регистрация и доступ

Свободной регистрации на платный контент нет.

```text
Курс → тариф → телефон → OTP → оплата → webhook paid → аккаунт → entitlement
```

Идентификатор пользователя — **номер телефона**. Подтверждение — **SMS OTP**.

После первого входа допустимы телефон + PIN/пароль или повторный OTP.

## 7. Тарифы и entitlement

Три плана на каждый курс, цены задаёт администратор:

- 1 месяц
- 5 месяцев
- 1 год

После `status = paid` backend создаёт entitlement:

```text
user_id, course_id, plan_id, source, started_at, expires_at, status
```

`source`: `payment` | `admin` | `promotion`.

При `expires_at` доступ к видео/PDF/тестам/клинике полностью закрывается. Профиль остаётся. Экран: «Срок доступа закончился» + покупка нового тарифа.

Администратор может выдать, продлить, приостановить, отменить, заблокировать доступ вручную.

## 8. Бесплатный урок

У курса может быть бесплатный preview. Флаг урока `is_free_preview`. Количество preview настраивается (по умолчанию 1).

## 9. Одно устройство

Одному аккаунту разрешено **только одно активное устройство**.

Хранить: `device_id`, `user_id`, `platform`, `device_model`, `app_version`, `last_ip`, `created_at`, `last_seen_at`, `is_active`.

При входе с нового устройства — освободить старое или автоматически завершить старую сессию (настройка администратора).

Следить за частой сменой устройства, аномальным числом IP, подозрительными сессиями.

## 10. Токены

```text
Access Token   10–15 минут
Refresh Token  несколько недель, привязан к устройству, rotation, отзыв
```

Модель: Access + Refresh + Device Binding.

## 11. Платежи

Отдельный Payment Module, не привязанный к одному банку.

Источники (обязательно все четыре):

```text
WEB_PAYMENT | GOOGLE_PLAY | APPLE_IAP | ADMIN
```

Статусы: `created`, `pending`, `paid`, `failed`, `cancelled`, `refunded`.

Доступ выдаётся **только** после webhook: проверка подписи, суммы, Order ID. Не доверять экрану «Оплата успешна».

Платёжная система не решает, что можно смотреть. Это делает **Entitlement**.

Цифровой образовательный контент внутри магазинов подчиняется правилам Google Play Billing и App Store IAP.

## 12. Видео

Исходник ~4–6 GB / 1080p. Backend **не раздаёт** тяжёлые MP4.

```text
Upload original → Object Storage → Queue → Worker
→ 360p / 480p / 720p / 1080p → Packaging → DRM → CDN
```

- HLS (обязательно для Apple), DASH и/или HLS/fMP4 для Android.
- Adaptive bitrate + ручной выбор качества.
- Signed short-lived playback session.
- Прямого скачивания нет. Offline нет.
- Watermark: `MEDdonish` + user ID, плавающая позиция, поверх video layer.
- Сохранять процент просмотра, не обязательно точную позицию.
- Порог завершения (по умолчанию 90%) — настройка администратора.

Godot `VideoStreamPlayer` **не используется** для продакшен-плеера.

- Android: Godot plugin → Media3/ExoPlayer → Widevine
- iOS: Godot plugin → AVPlayer/AVFoundation → HLS + FairPlay

## 13. PDF

Открывается внутри платформы, без кнопки Download. Signed URL с коротким сроком. Viewer: открыть, листать, zoom, закрыть.

## 14. Тесты

Банк вопросов (вопрос не принадлежит одному тесту). Связи: discipline / course / section / lesson — часть nullable.

Типы: `SINGLE_CHOICE`, `TRUE_FALSE`, `MATCHING`, `ORDERING`, `IMAGE_SINGLE_CHOICE`.

Импорт JSON: validation → ошибки по номеру вопроса → preview → подтверждение → import.

Генерация: пул N → исключить disabled → randomize → выбрать `question_count` (по умолчанию 30) → перемешать ответы → immutable `TestAttempt`.

Таймер **20 секунд на выбор ответа**. Timeout = неверный. Показ правильного ответа не съедает таймер следующего вопроса.

Режимы: **Training** (сразу разбор) и **Exam** (разбор после завершения).

Оценивание (настройки, не зашивать в UI):

| Правильных | Результат |
|---|---|
| 28–30 | оценка 5 |
| 24–27 | оценка 4 |
| 15–23 | оценка 3 |
| 0–14 | «Вы плохо сдали тест» |

```text
grade_5_min = 28
grade_4_min = 24
grade_3_min = 15
pass_min = 15
```

## 15. Клиника

Ситуационные задачи: Simple Case и Interactive Clinical Case.

Клинический пример: title, age, sex, complaints, history, examination, laboratory, instrumental, images, diagnosis, differential, discussion, conclusion — все поля optional.

Реальные пациенты только в обезличенном виде либо учебные/синтетические данные.

## 16. Уведомления

Android: FCM. iOS: APNs.

Типы: новый урок/курс/тест, срок подписки (7 / 3 / 1 день, день окончания), системные. Расписание включает/выключает администратор.

## 17. Стек

| Слой | Технология |
|---|---|
| API | NestJS, TypeScript |
| Web / Admin | Next.js, TypeScript, Tailwind |
| Mobile | Godot + Android/iOS native plugins |
| DB | PostgreSQL |
| Cache / queue | Redis, BullMQ |
| Video | Object Storage, workers, CDN, DRM |
| Архитектура | Modular monolith, stateless API |

Первый этап — не микросервисы. Позже можно вынести video, notifications, analytics, payments.

## 18. Безопасность

HTTPS, HSTS, rate limiting, DTO validation, RBAC, admin 2FA (пароль + TOTP), secret manager, device binding, DRM, signed URLs, audit logs.

Не логировать: access/refresh token, OTP, пароль, payment secret, DRM keys.

Приватность: телефон, устройство, платежные метаданные, прогресс. Не собирать диагнозы и медкарти пользователей.

## 19. MVP

Платформа готова к production launch, когда одновременно работают покупка, OTP, автоматический доступ, 3 тарифа, одно устройство, каталог, preview-урок, защищённое adaptive-видео, DRM, watermark, PDF, банк вопросов, JSON-импорт, random 30, таймер 20 с, автооценивание, ситуационные задачи, clinical cases, push, admin analytics, Web, Android, iOS, backup, monitoring, подготовка магазинов.

## 20. Что нельзя делать

- Godot → PostgreSQL
- Видео в базе или на API-сервере
- Постоянные публичные video URL
- Только watermark без DRM
- Refresh token открытым текстом на устройстве
- Transcoding внутри API process
- Выдавать доступ по сообщению frontend «payment successful»
- Отдельные базы для Android и iOS
- Дублировать весь проект под каждый язык
