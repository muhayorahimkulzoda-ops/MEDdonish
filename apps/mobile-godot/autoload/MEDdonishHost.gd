extends Node

## Desktop/editor stand-in for the native MEDdonish plugin.
## Android/iOS: Engine singleton MEDdonish (Media3/AVPlayer, Billing/StoreKit, Keystore/Keychain, FCM/APNs).
## This host never plays lessons in VideoStreamPlayer and never grants entitlement.

signal video_requested(playback_url: String, watermark: String)
signal purchase_started(sku: String, order_id: String)

var _vault: Dictionary = {}


func _ready() -> void:
	var native = _native()
	if native == null:
		return
	if native.has_signal("purchase_token"):
		native.connect("purchase_token", Callable(self, "_on_purchase_token"))
	if native.has_signal("push_token"):
		native.connect("push_token", Callable(self, "_on_push_token"))


func _on_purchase_token(order_id: String, source: String, token: String) -> void:
	submit_store_token(order_id, source, token)


func _on_push_token(token: String) -> void:
	submit_push_token(token)


func _native():
	if Engine.has_singleton("MEDdonish"):
		return Engine.get_singleton("MEDdonish")
	return null


func play_video(playback_url: String, watermark: String) -> void:
	if playback_url == "" or watermark == "":
		return
	var native = _native()
	if native:
		native.call("play_video", playback_url, watermark)
		return
	video_requested.emit(playback_url, watermark)
	push_warning("MEDdonish: native player required. Signed URL is not a storage key.")


func start_purchase(sku: String, order_id: String) -> void:
	if sku == "" or order_id == "":
		return
	var native = _native()
	if native:
		native.call("start_purchase", sku, order_id)
		return
	purchase_started.emit(sku, order_id)
	push_warning("MEDdonish: store billing required. Order stays pending until a signed webhook is paid.")


func submit_store_token(order_id: String, source: String, purchase_token: String) -> void:
	if order_id == "" or purchase_token == "":
		return
	NativePayments.attach_receipt(order_id, source, purchase_token)


func secure_put(key: String, value: String) -> void:
	if key == "":
		return
	var native = _native()
	if native:
		native.call("secure_put", key, value)
		return
	if value == "-" or value == "":
		_vault.erase(key)
	else:
		_vault[key] = value


func secure_get(key: String) -> String:
	var native = _native()
	if native:
		return str(native.call("secure_get", key))
	return str(_vault.get(key, ""))


func integrity_ticket() -> String:
	var native = _native()
	if native and native.has_method("integrity_ticket"):
		return str(native.call("integrity_ticket"))
	return ""


func register_push() -> void:
	var native = _native()
	if native:
		native.call("register_push")


func submit_push_token(token: String) -> void:
	if token == "" or not SessionManager.has_session():
		return
	var platform := "web"
	if OS.has_feature("android"):
		platform = "android"
	elif OS.has_feature("ios"):
		platform = "ios"
	await ApiClient.post_json("/me/push-token", {
		"platform": platform,
		"token": token,
	})
