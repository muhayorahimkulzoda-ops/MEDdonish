extends Node

var items: Array = []

func _ready() -> void:
	MEDdonishHost.register_push()

func reload() -> void:
	if not SessionManager.has_session():
		items = []
		return
	var result: Dictionary = await ApiClient.get_json("/me/notifications")
	if result.ok and result.data is Array:
		items = result.data
	elif result.ok and result.data.has("items"):
		items = result.data.items
	else:
		items = []
