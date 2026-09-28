Native Android plugin: Media3/ExoPlayer + Widevine, Keystore, FCM, Play Billing.

Godot: autoload `MEDdonishHost` forwards to Engine singleton `MEDdonish` when the AAR is present.

- `play_video(playback_url, watermark)` — signed URL only
- `start_purchase(sku, order_id)` — then `purchase_token` → `/orders/:id/store-receipt`
- `secure_put` / `secure_get` — Keystore
- `register_push` — FCM, token is not logged

Package: `com.meddonish.app`. Keystore and Play shared secret stay out of git.
See `docs/NATIVE.md`.
