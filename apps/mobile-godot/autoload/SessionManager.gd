extends Node

const DEVICE_PATH := "user://device.id"

var access_token := ""

func has_session() -> bool:
	return access_token != ""

func set_tokens(access: String, refresh: String) -> void:
	access_token = access
	SecureStorage.write_refresh(refresh)

func clear() -> void:
	access_token = ""
	SecureStorage.clear_refresh()

func device_id() -> String:
	if FileAccess.file_exists(DEVICE_PATH):
		var file := FileAccess.open(DEVICE_PATH, FileAccess.READ)
		var stored := file.get_as_text().strip_edges()
		file.close()
		if stored.length() >= 8:
			return stored
	var created := "godot-%s" % str(Time.get_unix_time_from_system()).sha256_text().substr(0, 24)
	var out := FileAccess.open(DEVICE_PATH, FileAccess.WRITE)
	out.store_string(created)
	out.close()
	return created

func platform() -> String:
	var name := OS.get_name()
	if name == "Android":
		return "android"
	if name == "iOS":
		return "ios"
	return "android"

func device_payload() -> Dictionary:
	return {
		"deviceId": device_id(),
		"platform": platform(),
		"appVersion": "0.1.0",
	}
