extends Control

var _selected: Array = []
var _task: Dictionary = {}

func _ready() -> void:
	Ui.fill(self)
	var box := Ui.vbox()
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 32)
	var back := Ui.button(LocalizationManager.t("nav.home"))
	back.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/lessons/Lesson.tscn"))
	box.add_child(back)
	add_child(box)
	var result: Dictionary = await ApiClient.get_json("/situational-tasks/%s" % AppState.selected_task_id)
	if not result.ok:
		box.add_child(Ui.muted(str(result.data.get("message", "Error"))))
		return
	_task = result.data
	_selected = []
	box.add_child(Ui.title(str(_task.get("title", ""))))
	box.add_child(Ui.muted(str(_task.get("vignette", ""))))
	var questions: Array = _task.get("questions", [])
	for i in questions.size():
		_selected.append([])
		var question: Dictionary = questions[i]
		box.add_child(Ui.muted(str(question.get("prompt", ""))))
		for option in question.get("options", []):
			var btn := Ui.button(str(option.get("text", "")))
			btn.pressed.connect(_toggle.bind(i, str(option.get("id", ""))))
			box.add_child(btn)
	var send := Ui.button(LocalizationManager.t("admin.save"))
	send.pressed.connect(_submit.bind(box))
	box.add_child(send)

func _toggle(index: int, option_id: String) -> void:
	var row: Array = _selected[index]
	if row.has(option_id):
		row.erase(option_id)
	else:
		row.append(option_id)
	_selected[index] = row

func _submit(box: VBoxContainer) -> void:
	var result: Dictionary = await ApiClient.post_json("/situational-tasks/%s/answer" % AppState.selected_task_id, {
		"selected": _selected,
	})
	if not result.ok:
		return
	box.add_child(Ui.muted("%s / %s" % [result.data.get("correctCount", 0), result.data.get("questionCount", 0)]))
