extends RefCounted
class_name SecureStorage

# Refresh token: Android Keystore / iOS Keychain via MEDdonish.
# Desktop keeps the value in the host process only — never user://.

static func write_refresh(token: String) -> void:
	MEDdonishHost.secure_put("refresh", token)

static func read_refresh() -> String:
	return MEDdonishHost.secure_get("refresh")

static func clear_refresh() -> void:
	MEDdonishHost.secure_put("refresh", "-")
