extends Node

func request_otp(phone: String) -> Dictionary:
	return await ApiClient.post_json("/auth/request-otp", {"phone": phone})

func verify_otp(phone: String, code: String) -> Dictionary:
	var result: Dictionary = await ApiClient.post_json("/auth/verify-otp", {
		"phone": phone,
		"code": code,
		"device": SessionManager.device_payload(),
	})
	_store(result)
	return result

func login_pin(phone: String, pin: String) -> Dictionary:
	var result: Dictionary = await ApiClient.post_json("/auth/login", {
		"phone": phone,
		"pin": pin,
		"device": SessionManager.device_payload(),
	})
	_store(result)
	return result

func logout() -> void:
	if SessionManager.has_session():
		await ApiClient.post_json("/auth/logout")
	SessionManager.clear()

func _store(result: Dictionary) -> void:
	if result.ok and result.data.has("accessToken"):
		SessionManager.set_tokens(str(result.data.accessToken), str(result.data.get("refreshToken", "")))
