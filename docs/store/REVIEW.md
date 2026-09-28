# Заметки для ревьюера

MEDdonish is an educational client. Godot is the UI shell. Video plays in Media3/Widevine (Android) or AVPlayer/FairPlay (iOS), not Godot VideoStreamPlayer.

## Login

Phone OTP. Demo web may echo OTP only when `OTP_DEV_ECHO` is on a non-production API. Production never returns OTP.

## Purchase

1. App creates `POST /orders` with `source = GOOGLE_PLAY | APPLE_IAP`. Status stays `pending`.
2. Play Billing / StoreKit returns a token.
3. App sends `POST /orders/:id/store-receipt`. Token is verified server-side.
4. Access opens only after a signed webhook sets `payment.status = paid`.
5. `GET /public/offer` and `GET /public/store-products` always have `grantsAccess: false`.

The store does not grant entitlement. Completing a purchase in the sandbox without the signed webhook must leave content locked.

## Account deletion

In-app profile → delete with `DELETE`. Same flow on https://meddonish.com/account-deletion.

## Data export

Profile → download JSON. File has no PIN, tokens, OTP, or DRM keys.

## Content

Educational anatomy / clinical cases. Synthetic or de-identified. Not a medical device and not clinical advice.

## What is not in this binary yet

Native Media3 / AVPlayer / Billing plugins compile on a machine with Android SDK or Xcode. Until that binary is uploaded, this listing package is ready; the AAB / IPA is not.
