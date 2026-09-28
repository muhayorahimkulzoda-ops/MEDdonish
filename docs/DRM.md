# DRM и защита воспроизведения

Цель — максимальная практически реализуемая защита. Полностью запретить screenshot/screen recording на всех платформах нельзя.

## Платформы

| Платформа | Транспорт | DRM | Плеер |
|---|---|---|---|
| Android | DASH и/или HLS/fMP4 | Widevine | Media3 / ExoPlayer через Godot plugin |
| iOS / iPadOS | HLS | FairPlay Streaming | AVPlayer / AVFoundation через Godot plugin |
| Web | HLS/DASH | Widevine / FairPlay по браузеру | MSE-плеер, не Godot |

## Watermark

Поверх video layer, привязан к сессии:

```text
MEDdonish
ID: 438291
```

Периодически меняет позицию, небольшая прозрачность. Предпочтительно user ID, не полный телефон.

Watermark **не заменяет** DRM.

## Ключи и лицензии

Лицензионный сервер и ключи — вне репозитория, через secret manager. В логи не попадают DRM keys, key seeds, playback secrets.

Playback session (`POST /videos/:id/playback-session`) отдаёт signed `playbackUrl` / `dashUrl`, watermark и при наличии `LICENSE_SERVER_URL` — `drm.licenseUrl` (HMAC-ticket, не content key). Локально `drm.provider = none`, URL остаются на API. В production boot требует `LICENSE_SERVER_URL` (https), `LICENSE_SIGNING_SECRET`, `CDN_PUBLIC_BASE` (https), `CDN_SIGNING_SECRET`.

Signed playback token короткоживущий и одноразово привязан к device + user + video. CDN не получает object storage keys.
