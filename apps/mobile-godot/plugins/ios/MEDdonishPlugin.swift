import Foundation

/// iOS native shell for Godot.
/// AVPlayer + FairPlay, StoreKit, Keychain, APNs — compiled on macOS + Xcode.
/// Must not grant entitlement. Must not log tokens, OTP, or DRM keys.
@objc(MEDdonishPlugin)
public final class MEDdonishPlugin: NSObject {
    @objc public static let pluginName = "MEDdonish"

    @objc public func play_video(_ playbackUrl: String, watermark: String) {
        precondition(!playbackUrl.isEmpty)
        precondition(!watermark.isEmpty)
        // AVPlayer + FairPlay. Disable screen capture analog. playbackUrl is a signed session, not a storage key.
    }

    @objc public func integrity_ticket() -> String {
        // App Attest / DeviceCheck → HMAC ticket for x-app-integrity. Empty until native SDK is wired.
        return ""
    }

    @objc public func start_purchase(_ productId: String, orderId: String) {
        precondition(!productId.isEmpty)
        precondition(!orderId.isEmpty)
        // StoreKit. After the store returns a token, Godot calls MEDdonishHost.submit_store_token.
        // Access only after App Store Server Notification → payment.status = paid.
    }

    @objc public func secure_put(_ key: String, value: String) {
        precondition(!key.isEmpty)
        precondition(!value.isEmpty)
        // Keychain. Refresh token must not be written to a file.
    }

    @objc public func secure_get(_ key: String) -> String {
        precondition(!key.isEmpty)
        return ""
    }

    @objc public func register_push() {
        // APNs. When a token is available, Godot calls MEDdonishHost.submit_push_token. Never log it.
    }
}
