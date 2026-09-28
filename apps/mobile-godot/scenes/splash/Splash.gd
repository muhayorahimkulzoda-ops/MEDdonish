extends Control

func _ready() -> void:
	Ui.fill(self)
	var box := Ui.vbox()
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.add_child(Ui.title(LocalizationManager.t("home.title")))
	box.add_child(Ui.muted(LocalizationManager.t("home.hero.subtitle")))
	add_child(box)
	await get_tree().create_timer(0.5).timeout
	if not AppState.language_chosen:
		get_tree().change_scene_to_file("res://scenes/language/Language.tscn")
	elif SessionManager.has_session():
		get_tree().change_scene_to_file("res://scenes/shell/Shell.tscn")
	else:
		get_tree().change_scene_to_file("res://scenes/auth/Auth.tscn")
