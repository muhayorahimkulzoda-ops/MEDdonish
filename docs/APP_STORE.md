# Магазины (Play / App Store)

Godot iOS export требует **macOS и Xcode**. Android export — Android SDK + keystore вне git.

## Подготовка Apple

- Apple Developer account, Bundle ID `com.meddonish.app`, certificates, App Store Connect
- Icon, screenshots (iPhone + iPad), Privacy Policy, App Privacy, age rating
- TestFlight, review notes
- Universal Links на `https://meddonish.com`
- Native: AVPlayer + FairPlay, APNs, Keychain, Apple IAP
- Публичные страницы: `/privacy`, `/terms`, `/account-deletion`
- In-app и web удаление аккаунта: `POST /me/delete` `{ confirm: "DELETE" }`. Телефон анонимизируется, entitlement отзывается. Магазин доступ не выдаёт.
- Выгрузка данных: `GET /me/export` и кнопка в профиле. PIN, токены и DRM keys в файл не попадают.

## Подготовка Google Play

- Play Console, package `com.meddonish.app`, upload keystore не в репозитории
- Data safety: телефон, устройство, платежи магазина, прогресс обучения. Не диагнозы.
- Privacy Policy URL, content rating
- Native: Media3 + Widevine, FCM, Keystore, Play Billing
- Внутри приложения только Play Billing, не web-checkout

## Оплата

Цифровой доступ, купленный **внутри** приложения, идёт через Play Billing / In-App Purchase. Web-оплата не подменяет IAP внутри приложения.

```text
GET  /public/store-products     SKU трёх тарифов
POST /orders                    source = GOOGLE_PLAY | APPLE_IAP, статус pending
POST /orders/:id/store-receipt  токен магазина, статус всё ещё pending
магазин → webhook               подпись + сумма
payment.status = paid           только тогда Entitlement
```

Клиент и магазин **не** выдают доступ. `grantsAccess` в store-products всегда `false`.

SKU по умолчанию: `meddonish.month_1`, `meddonish.month_5`, `meddonish.year_1`.
Переопределение: `STORE_GOOGLE_SKU_MONTH_1`, `STORE_APPLE_SKU_MONTH_1`, …

Публичное предложение: `GET /public/offer` и страница `/offer`. Тексты листинга: `docs/store/LISTING.md`.
App Privacy: `docs/store/app-privacy.json`. Иконка 1024: `docs/store/assets/icon-1024.png`. Export preset: target Android 16 / API 36, bundle `com.meddonish.app`.

## Плагины

Контракт: `docs/NATIVE.md`, `apps/mobile-godot/plugins/android` и `plugins/ios`.
Godot вызывает `MEDdonishHost`, тот — singleton `MEDdonish` если плагин собран.
DRM-ключи и store shared secrets в репозиторий не класть.
