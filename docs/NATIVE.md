# Native-плагины Godot

Godot — только UI-shell. Уроки не идут через `VideoStreamPlayer`.

На desktop/editor синглтон `MEDdonish` отсутствует: работает autoload `MEDdonishHost`.
На Android/iOS плагин регистрирует `Engine` singleton `MEDdonish`. Host вызывает его, если он есть.

## Контракт

| Метод | Android | iOS | Доступ |
|---|---|---|---|
| `play_video(url, watermark)` | Media3 + Widevine | AVPlayer + FairPlay | URL — signed session, не storage key |
| `start_purchase(sku, order_id)` | Play Billing | StoreKit | Не выдаёт entitlement |
| `secure_put` / `secure_get` | Keystore | Keychain | Refresh не в файл |
| `register_push` | FCM | APNs | Токен не логировать |

После покупки в магазине: `MEDdonishHost.submit_store_token(order_id, GOOGLE_PLAY\|APPLE_IAP, token)` → `POST /orders/:id/store-receipt`. Доступ только после webhook `paid`.

После FCM/APNs: `MEDdonishHost.submit_push_token(token)` → `POST /me/push-token`. Ответ API без токена.

Исходники контракта: `apps/mobile-godot/plugins/{android,ios}`. Сборка AAR / Xcode-plugin — на машине с Android SDK или macOS. Ключи DRM, keystore и store secrets в git не класть.

## Windows: toolchain и AAB

Godot 4.4 уже ставится portable в `%USERPROFILE%\tools\meddonish-native` (вне git). JDK 17 — Microsoft OpenJDK.

```powershell
powershell.exe -File scripts/bootstrap-android-export.ps1
powershell.exe -File scripts/export-android-aab.ps1
```

AAB: `apps/mobile-godot/export/meddonish-release.aab` (каталог в `.gitignore`). Первый экспорт ставит Gradle-шаблон в `apps/mobile-godot/android/` (тоже вне git). Godot 4.4 экспортирует **target SDK 34** (выше редактор считает ошибкой конфигурации). Play с 31 августа 2026 требует API 36 — это отдельный шаг после смены редактора. Upload keystore: `%USERPROFILE%\tools\meddonish-native\keystore\` — не коммитить. SHA-256 upload-ключа — в `apps/web/public/.well-known/assetlinks.json`. iOS-сборки на Windows нет.

Шаблоны Android Godot качает `scripts/fetch-android-templates.ps1` по HTTP Range (`android_source.zip` + `version.txt`), без полного TPZ на 1.1 ГБ.

Android: `usesCleartextTraffic=false`, `network_security_config` только system CAs. iOS: ATS без arbitrary loads. Плеер включает FLAG_SECURE / analog. Play Integrity / App Attest: native отдаёт ticket через `integrity_ticket()`, Godot ставит `x-app-integrity` на login/OTP. Сервер проверяет HMAC при `APP_INTEGRITY_REQUIRED=true`; web-кабинет не блокируется.
