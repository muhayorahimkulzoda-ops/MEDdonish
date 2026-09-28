extends Control

var _phone: LineEdit
var _code: LineEdit
var _pin: LineEdit
var _error: Label

func _ready() -> void:
	Ui.fill(self)
	var box := Ui.vbox()
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 40)
	box.add_child(Ui.title(LocalizationManager.t("nav.login")))
	_phone = Ui.field("+992")
	_phone.text = AppState.phone if AppState.phone != "" else "+992"
	_code = Ui.field("000000")
	_pin = Ui.field(LocalizationManager.t("auth.pin"))
	_pin.secret = true
	_error = Ui.muted("")
	_error.add_theme_color_override("font_color", Ui.ACCENT)
	var send := Ui.button(LocalizationManager.t("auth.otp.send"))
	var verify := Ui.button(LocalizationManager.t("auth.otp.verify"))
	var pin_btn := Ui.button(LocalizationManager.t("nav.login"))
	send.pressed.connect(_send_otp)
	verify.pressed.connect(_verify)
	pin_btn.pressed.connect(_pin_login)
	box.add_child(Ui.muted(LocalizationManager.t("payment.phone")))
	box.add_child(_phone)
	box.add_child(send)
	box.add_child(_code)
	box.add_child(verify)
	box.add_child(Ui.muted(LocalizationManager.t("auth.pin")))
	box.add_child(_pin)
	box.add_child(pin_btn)
	box.add_child(_error)
	add_child(box)

func _send_otp() -> void:
	AppState.phone = _phone.text.strip_edges()
	var result: Dictionary = await AuthManager.request_otp(AppState.phone)
	if not result.ok:
		_error.text = str(result.data.get("message", "OTP"))

func _verify() -> void:
	AppState.phone = _phone.text.strip_edges()
	var result: Dictionary = await AuthManager.verify_otp(AppState.phone, _code.text.strip_edges())
	if result.ok:
		get_tree().change_scene_to_file("res://scenes/shell/Shell.tscn")
	else:
		_error.text = str(result.data.get("message", result.data.get("code", "Error")))

func _pin_login() -> void:
	AppState.phone = _phone.text.strip_edges()
	var result: Dictionary = await AuthManager.login_pin(AppState.phone, _pin.text)
	if result.ok:
		get_tree().change_scene_to_file("res://scenes/shell/Shell.tscn")
	else:
		_error.text = str(result.data.get("message", result.data.get("code", "Error")))
