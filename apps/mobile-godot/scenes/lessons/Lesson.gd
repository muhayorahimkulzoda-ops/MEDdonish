extends Control

func _ready() -> void:
	Ui.fill(self)
	var box := Ui.vbox()
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 32)
	var back := Ui.button(LocalizationManager.t("nav.courses"))
	back.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/courses/Course.tscn"))
	box.add_child(back)
	add_child(box)
	var result: Dictionary = await ApiClient.get_json("/lessons/%s" % AppState.selected_lesson_id)
	if not result.ok:
		box.add_child(Ui.muted(str(result.data.get("message", "Error"))))
		return
	box.add_child(Ui.title(_title_of(result.data.get("translations", []))))
	for video in result.data.get("videos", []):
		if str(video.get("status", "")) != "READY":
			continue
		var play := Ui.button(LocalizationManager.t("lesson.video"))
		play.pressed.connect(_play.bind(str(video.get("id", ""))))
		box.add_child(play)
	for doc in result.data.get("documents", []):
		var pdf := Ui.button(str(doc.get("title", LocalizationManager.t("lesson.pdf"))))
		pdf.pressed.connect(_pdf.bind(str(doc.get("id", ""))))
		box.add_child(pdf)
	for test in result.data.get("tests", []):
		var btn := Ui.button("%s: %s" % [LocalizationManager.t("lesson.test"), test.get("title", "")])
		btn.pressed.connect(_open_test.bind(str(test.get("id", ""))))
		box.add_child(btn)
	for task in result.data.get("simpleCases", []):
		var btn := Ui.button(str(task.get("title", LocalizationManager.t("lesson.cases"))))
		btn.pressed.connect(_open_task.bind(str(task.get("id", ""))))
		box.add_child(btn)
	for item in result.data.get("clinicalCases", []):
		var btn := Ui.button(str(item.get("title", LocalizationManager.t("lesson.clinical"))))
		btn.pressed.connect(_open_case.bind(str(item.get("id", ""))))
		box.add_child(btn)

func _title_of(items) -> String:
	for row in items:
		if str(row.get("language", "")) == LocalizationManager.locale:
			return str(row.get("title", ""))
	return str(items[0].get("title", "")) if items.size() > 0 else ""

func _play(video_id: String) -> void:
	var session: Dictionary = await ApiClient.post_json("/videos/%s/playback-session" % video_id)
	if not session.ok:
		return
	var watermark := str(session.data.get("watermark", {}).get("text", ""))
	var url := str(session.data.get("playbackUrl", ""))
	NativeVideo.play(url, watermark)

func _pdf(document_id: String) -> void:
	await ApiClient.post_json("/documents/%s/view-session" % document_id)

func _open_test(test_id: String) -> void:
	AppState.selected_test_id = test_id
	get_tree().change_scene_to_file("res://scenes/tests/Test.tscn")

func _open_task(task_id: String) -> void:
	AppState.selected_task_id = task_id
	get_tree().change_scene_to_file("res://scenes/clinical/Task.tscn")

func _open_case(case_id: String) -> void:
	AppState.selected_case_id = case_id
	get_tree().change_scene_to_file("res://scenes/clinical/Case.tscn")
