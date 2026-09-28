# Video worker

Забирает `video_jobs` из PostgreSQL. HTTP API только ставит задачу после resumable upload.

```text
UPLOADING → PROCESSING → ENCRYPTING → READY | FAILED
```

Если установлен `ffmpeg`, собирает HLS 720p в `video/{id}/hls/`. Иначе в development помечает исходник как signed playback, без публичного URL.

```bash
npx pnpm@10.14.0 --filter @meddonish/video-worker dev
```
