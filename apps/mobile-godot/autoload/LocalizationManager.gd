extends Node

var locale := "ru"
var _table: Dictionary = {}

func _ready() -> void:
	if FileAccess.file_exists("user://locale.txt"):
		var file := FileAccess.open("user://locale.txt", FileAccess.READ)
		locale = file.get_as_text().strip_edges()
		file.close()
		AppState.language_chosen = true
	load_locale(locale)

func choose(next: String) -> void:
	locale = next
	AppState.language_chosen = true
	var file := FileAccess.open("user://locale.txt", FileAccess.WRITE)
	file.store_string(next)
	file.close()
	load_locale(next)

func load_locale(code: String) -> void:
	var path := "res://i18n/%s.json" % code
	if not FileAccess.file_exists(path):
		path = "res://i18n/ru.json"
	var file := FileAccess.open(path, FileAccess.READ)
	var parsed = JSON.parse_string(file.get_as_text())
	file.close()
	_table = parsed if typeof(parsed) == TYPE_DICTIONARY else {}

func t(key: String, vars: Dictionary = {}) -> String:
	var text := str(_table.get(key, key))
	for name in vars.keys():
		text = text.replace("{%s}" % name, str(vars[name]))
	return text
