extends Control

var _box: VBoxContainer
var _attempt_id := ""
var _seconds := 20
var _timer: Timer
var _selected: Array = []
var _question: Dictionary = {}

func _ready() -> void:
	Ui.fill(self)
	_box = Ui.vbox()
	_box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 32)
	add_child(_box)
	_timer = Timer.new()
	_timer.wait_time = 1
	_timer.timeout.connect(_tick)
	add_child(_timer)
	var started: Dictionary = await ApiClient.post_json("/tests/%s/start" % AppState.selected_test_id)
	if not started.ok:
		_box.add_child(Ui.muted(str(started.data.get("message", "Error"))))
		return
	_attempt_id = str(started.data.get("id", ""))
	await _load_question()

func _load_question() -> void:
	_clear()
	var payload: Dictionary = await ApiClient.get_json("/test-attempts/%s/question" % _attempt_id)
	if payload.data.get("finished", false) and payload.data.has("grade"):
		_result(payload.data)
		return
	_question = payload.data
	_selected = []
	_seconds = int(_question.get("secondsLeft", 20))
	_box.add_child(Ui.muted("%s / %s" % [_question.get("position", 0), _question.get("total", 0)]))
	var clock := Ui.title(str(_seconds))
	clock.name = "Clock"
	_box.add_child(clock)
	_box.add_child(Ui.title(str(_question.get("question", ""))))
	for option in _question.get("options", []):
		var btn := Ui.button("%s. %s" % [option.get("id", ""), option.get("text", "")])
		btn.pressed.connect(_pick.bind(str(option.get("id", ""))))
		_box.add_child(btn)
	var next := Ui.button(LocalizationManager.t("test.next"))
	next.pressed.connect(_answer.bind(false))
	_box.add_child(next)
	_timer.start()

func _pick(code: String) -> void:
	if str(_question.get("type", "")) == "ORDERING":
		if _selected.has(code):
			_selected.erase(code)
		else:
			_selected.append(code)
	else:
		_selected = [code]

func _tick() -> void:
	_seconds -= 1
	var clock := _box.get_node_or_null("Clock")
	if clock:
		clock.text = str(maxi(_seconds, 0))
	if _seconds <= 0:
		_timer.stop()
		await _answer(true)

func _answer(timed_out: bool) -> void:
	_timer.stop()
	var payload: Dictionary = await ApiClient.post_json("/test-attempts/%s/answer" % _attempt_id, {
		"selectedCodes": [] if timed_out else _selected,
		"timedOut": timed_out,
	})
	if payload.data.get("finished", false) and payload.data.has("grade"):
		_result(payload.data)
		return
	await _load_question()

func _result(data: Dictionary) -> void:
	_clear()
	var grade := str(data.get("grade", ""))
	_box.add_child(Ui.title(LocalizationManager.t("test.result.title")))
	if grade == "failed":
		_box.add_child(Ui.muted(LocalizationManager.t("test.result.failed")))
	else:
		_box.add_child(Ui.muted(LocalizationManager.t("test.result.grade", {"grade": grade})))
	var back := Ui.button(LocalizationManager.t("nav.home"))
	back.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/shell/Shell.tscn"))
	_box.add_child(back)

func _clear() -> void:
	for child in _box.get_children():
		child.queue_free()
