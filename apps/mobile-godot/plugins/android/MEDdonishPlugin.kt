package com.meddonish.godot

import org.godotengine.godot.Godot
import org.godotengine.godot.plugin.GodotPlugin
import org.godotengine.godot.plugin.SignalInfo
import org.godotengine.godot.plugin.UsedByGodot

/**
 * Android native shell for Godot.
 * Media3 + Widevine, Play Billing, Android Keystore, FCM — wired on a machine with Android SDK.
 * This class must not grant entitlement and must not log tokens, OTP, or DRM keys.
 */
class MEDdonishPlugin(godot: Godot) : GodotPlugin(godot) {
    override fun getPluginName() = "MEDdonish"

    override fun getPluginSignals(): Set<SignalInfo> = setOf(
        SignalInfo("purchase_token", String::class.java, String::class.java, String::class.java),
        SignalInfo("push_token", String::class.java),
    )

    @UsedByGodot
    fun play_video(playbackUrl: String, watermark: String) {
        require(playbackUrl.isNotBlank())
        require(watermark.isNotBlank())
        // Media3 / ExoPlayer + Widevine + FLAG_SECURE. playbackUrl is a signed session, not a storage key.
    }

    @UsedByGodot
    fun integrity_ticket(): String {
        // Play Integrity → HMAC ticket for x-app-integrity. Empty until native SDK is wired.
        return ""
    }

    @UsedByGodot
    fun start_purchase(sku: String, orderId: String) {
        require(sku.isNotBlank())
        require(orderId.isNotBlank())
        // Play Billing. After the store returns a token, emit purchase_token(orderId, GOOGLE_PLAY, token).
        // Godot posts /orders/:id/store-receipt. Access only after webhook paid.
    }

    @UsedByGodot
    fun secure_put(key: String, value: String) {
        require(key.isNotBlank())
        require(value.isNotBlank())
        // Android Keystore. Refresh token must not go to SharedPreferences plaintext.
    }

    @UsedByGodot
    fun secure_get(key: String): String {
        require(key.isNotBlank())
        return ""
    }

    @UsedByGodot
    fun register_push() {
        // FCM. When a token is available emit push_token(token). Never log it.
    }

    fun emitStoreToken(orderId: String, token: String) {
        emitSignal("purchase_token", orderId, "GOOGLE_PLAY", token)
    }

    fun emitPushToken(token: String) {
        emitSignal("push_token", token)
    }
}
