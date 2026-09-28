extends Control

func _ready() -> void:
	Ui.fill(self)
	var box := Ui.vbox()
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 48)
	box.add_child(Ui.title(LocalizationManager.t("language.choose")))
	for item in [["ru", "language.ru"], ["tg", "language.tg"], ["en", "language.en"]]:
		var btn := Ui.button(LocalizationManager.t(item[1]))
		btn.pressed.connect(_pick.bind(item[0]))
		box.add_child(btn)
	add_child(box)

func _pick(code: String) -> void:
	LocalizationManager.choose(code)
	if SessionManager.has_session():
		get_tree().change_scene_to_file("res://scenes/shell/Shell.tscn")
	else:
		get_tree().change_scene_to_file("res://scenes/auth/Auth.tscn")
