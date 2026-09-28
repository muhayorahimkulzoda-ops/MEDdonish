# MEDdonish Godot client

Godot — UI-shell. Не подключать PostgreSQL и не играть уроки через `VideoStreamPlayer`.

```text
autoload/   ApiClient, Auth, Session, Localization, Notifications, AppState
scenes/     splash, language, auth, shell, courses, lessons, tests, clinical
services/   SecureStorage, NativeVideo, NativePayments, Ui
i18n/       ru.json, tg.json, en.json
plugins/    android (Media3 + Widevine + Play Billing + FCM + Keystore)
            ios (AVPlayer + FairPlay + IAP + APNs + Keychain)
```

Нижняя навигация: Главная, Курсы, Тесты, Уведомления, Профиль.

Локальный API: `http://127.0.0.1:3000/api/v1` в `ApiClient.base_url`. Access token только в памяти. Refresh — Keystore/Keychain, на desktop только в RAM.

Видео: `NativeVideo.play(signedPlaybackUrl, watermark)` → native plugin. Покупка в магазине: `NativePayments` → webhook backend → Entitlement.
