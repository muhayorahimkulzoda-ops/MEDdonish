Native iOS plugin: AVPlayer + FairPlay, Keychain, APNs, Apple IAP.

Godot methods use snake_case (`play_video`, `start_purchase`, `secure_put`, `secure_get`, `register_push`) so they match Android and `MEDdonishHost`.

Bundle ID: `com.meddonish.app`. Certificates and App Store shared secret stay out of git.
Export only on macOS + Xcode. See `docs/NATIVE.md`.
