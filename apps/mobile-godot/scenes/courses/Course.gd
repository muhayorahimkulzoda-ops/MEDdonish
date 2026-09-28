extends Control

func _ready() -> void:
	Ui.fill(self)
	var box := Ui.vbox()
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 32)
	var back := Ui.button(LocalizationManager.t("nav.home"))
	back.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/shell/Shell.tscn"))
	box.add_child(back)
	add_child(box)
	if AppState.selected_course_id == "":
		return
	var result: Dictionary = await ApiClient.get_json("/courses/%s/lessons" % AppState.selected_course_id)
	if not result.ok:
		box.add_child(Ui.muted(str(result.data.get("message", result.data.get("code", "Error")))))
		return
	box.add_child(Ui.title(_title_of(result.data.get("translations", []))))
	for section in result.data.get("sections", []):
		box.add_child(Ui.muted(_title_of(section.get("translations", []))))
		for lesson in section.get("lessons", []):
			var accessible := bool(lesson.get("accessible", false))
			var label := _title_of(lesson.get("translations", []))
			if not accessible:
				box.add_child(Ui.muted("%s — %s" % [label, LocalizationManager.t("subscriber.locked")]))
				continue
			var btn := Ui.button(label)
			btn.pressed.connect(_open_lesson.bind(str(lesson.get("id", ""))))
			box.add_child(btn)

func _title_of(items) -> String:
	for row in items:
		if str(row.get("language", "")) == LocalizationManager.locale:
			return str(row.get("title", ""))
	return str(items[0].get("title", "")) if items.size() > 0 else ""

func _open_lesson(lesson_id: String) -> void:
	AppState.selected_lesson_id = lesson_id
	get_tree().change_scene_to_file("res://scenes/lessons/Lesson.tscn")
