# Video pipeline

## Запрещено

```text
User → Backend → 4–6 GB MP4
```

API не хранит и не стримит исходники. Постоянных публичных URL нет. Offline нет. Кнопки Download нет.

## Поток

```text
Admin multipart/resumable upload
  → Object Storage  video/{id}/source/
  → Queue
  → Video Worker: 360p / 480p / 720p / 1080p (по высоте исходника)
  → Packaging HLS ABR (`master.m3u8`) и DASH (`manifest.mpd`)
  → Encryption / DRM (ещё не локально)
  → CDN (ещё не локально)
  → Subscriber (после playback-session)

Локально ffmpeg или Docker-образ `mwader/static-ffmpeg`. Сегменты и variant-плейлисты только по short-lived token: `/api/v1/media/video/:token` и `/api/v1/media/video/:token/:file`. `sourceKey` клиенту не отдаём. 4–6 GB MP4 с API не стримим, если есть HLS.
```

Статусы: `UPLOADING` → `PROCESSING` → `ENCRYPTING` → `READY` | `FAILED`.

Браузер администратора не блокируется на время transcoding.

## Playback

```text
POST /videos/:id/playback-session
  проверяет user + device + entitlement + course
  → короткий playback token
  → DRM license session
  → HLS/DASH манифест через CDN
```

Плеер сам выбирает качество по сети и устройству; пользователь может выбрать вручную.

Прогресс: `watch_percent`, `watch_seconds`, `completed` (порог из settings, по умолчанию 90%). Точная позиция не обязательна.

## Godot

Встроенный `VideoStreamPlayer` не используется для уроков. См. [DRM.md](DRM.md).
