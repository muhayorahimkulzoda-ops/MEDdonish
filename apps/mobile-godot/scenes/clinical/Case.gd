extends Control

var _step := 0
var _item: Dictionary = {}

func _ready() -> void:
	Ui.fill(self)
	await _render()

func _render() -> void:
	for child in get_children():
		child.queue_free()
	var box := Ui.vbox()
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 32)
	var back := Ui.button(LocalizationManager.t("nav.home"))
	back.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/lessons/Lesson.tscn"))
	box.add_child(back)
	add_child(box)
	if _item.is_empty():
		var result: Dictionary = await ApiClient.get_json("/clinical-cases/%s" % AppState.selected_case_id)
		if not result.ok:
			box.add_child(Ui.muted(str(result.data.get("message", "Error"))))
			return
		_item = result.data
	box.add_child(Ui.title(str(_item.get("title", ""))))
	var steps: Array = _item.get("steps", [])
	if _step < steps.size():
		var current: Dictionary = steps[_step]
		box.add_child(Ui.muted("%s / %s" % [_step + 1, steps.size()]))
		box.add_child(Ui.title(str(current.get("title", ""))))
		box.add_child(Ui.muted(str(current.get("body", ""))))
	if _step < steps.size() - 1:
		var next := Ui.button(LocalizationManager.t("test.next"))
		next.pressed.connect(_next)
		box.add_child(next)
	elif not _item.has("diagnosis"):
		var reveal := Ui.button(LocalizationManager.t("clinical.reveal"))
		reveal.pressed.connect(_reveal)
		box.add_child(reveal)
	else:
		box.add_child(Ui.muted("%s: %s" % [LocalizationManager.t("clinical.diagnosis"), _item.get("diagnosis", "")]))

func _next() -> void:
	_step += 1
	await _render()

func _reveal() -> void:
	var result: Dictionary = await ApiClient.post_json("/clinical-cases/%s/complete" % AppState.selected_case_id)
	if result.ok:
		_item = result.data
	await _render()
