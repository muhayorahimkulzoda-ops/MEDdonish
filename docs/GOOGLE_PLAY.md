# Google Play

Публикация: **Android App Bundle (AAB)**.

С 31 августа 2026 новые приложения и обновления должны target **Android 16 / API 36**.

## Материалы

Название MEDdonish, icon, screenshots, feature graphic, short/full description, Privacy Policy, Data Safety, age rating, developer contact, testing track.

| Поле | Текст |
|---|---|
| Short description | Медицинские курсы: видео, тесты и клиника. Доступ по подписке. |
| Full description | MEDdonish — образовательная платформа для медиков. Курсы с видеоуроками, PDF, тестами и клиническими кейсами. Доступ выдаёт только сервер после оплаты или выдачи администратора. Одно устройство. Не медицинская услуга. |
| Privacy Policy | `https://<domain>/privacy` |
| Account deletion | `https://<domain>/account-deletion` и кнопка в профиле приложения |
| Data safety | Ответы: `docs/store/play-data-safety.json`. Телефон, device id, язык, прогресс, факты оплаты. Не диагнозы и не медкарт. |
| Icon / feature | `docs/store/assets/icon-512.png`, `feature-1024x500.png` |
| IAP | `meddonish.month_1`, `meddonish.month_5`, `meddonish.year_1` — `docs/store/iap-products.json` |

Удаление аккаунта: `POST /api/v1/me/delete` с `{ "confirm": "DELETE" }`. Номер стирается (`deleted:<userId>`), PIN и устройства снимаются, entitlement = revoked. Повторная регистрация того же телефона создаёт новый аккаунт.

## Интеграции

API, Keystore storage, FCM, Media3/ExoPlayer + Widevine, Google Play Billing (если продажа внутри приложения), Android App Links.

Цифровые подписки внутри Play-приложения — через Play Billing. Покупка на сайте не проводится «как банковская форма внутри приложения». Backend подтверждает покупку через `STORE_VERIFY_URL` / Google Play Developer API. Клиентский purchase token доступ не выдаёт. Entitlement — только после `payment.status = paid`.
