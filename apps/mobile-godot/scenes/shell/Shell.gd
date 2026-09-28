extends Control

var _content: VBoxContainer
var _tab := "home"

func _ready() -> void:
	Ui.fill(self)
	var root := VBoxContainer.new()
	Ui.fill(root)
	root.add_theme_constant_override("separation", 0)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_content = Ui.vbox()
	_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_content)
	root.add_child(scroll)
	root.add_child(_nav())
	add_child(root)
	await _show("home")

func _nav() -> HBoxContainer:
	var bar := HBoxContainer.new()
	bar.custom_minimum_size = Vector2(0, 96)
	bar.add_theme_constant_override("separation", 8)
	for item in [
		["home", "nav.home"],
		["courses", "nav.courses"],
		["tests", "nav.tests"],
		["inbox", "nav.notifications"],
		["profile", "nav.profile"],
	]:
		var btn := Button.new()
		btn.text = LocalizationManager.t(item[1])
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		btn.pressed.connect(_show.bind(item[0]))
		bar.add_child(btn)
	return bar

func _clear() -> void:
	for child in _content.get_children():
		child.queue_free()

func _show(tab: String) -> void:
	_tab = tab
	_clear()
	await get_tree().process_frame
	match tab:
		"home":
			await _home()
		"courses":
			await _courses()
		"tests":
			await _tests()
		"inbox":
			await _inbox()
		"profile":
			await _profile()

func _title_of(items, fallback := "") -> String:
	if items == null:
		return fallback
	for row in items:
		if str(row.get("language", "")) == LocalizationManager.locale:
			return str(row.get("title", fallback))
	if items.size() > 0:
		return str(items[0].get("title", fallback))
	return fallback

func _home() -> void:
	_content.add_child(Ui.title(LocalizationManager.t("subscriber.myCourses")))
	if not SessionManager.has_session():
		_content.add_child(Ui.muted(LocalizationManager.t("nav.login")))
		return
	var result: Dictionary = await ApiClient.get_json("/me/entitlements")
	var rows: Array = result.data if result.data is Array else []
	if rows.is_empty():
		_content.add_child(Ui.muted(LocalizationManager.t("admin.empty")))
		return
	for row in rows:
		var course: Dictionary = row.get("course", {})
		var btn := Ui.button(_title_of(course.get("translations", []), str(course.get("slug", ""))))
		btn.pressed.connect(_open_course.bind(str(course.get("id", ""))))
		_content.add_child(btn)

func _courses() -> void:
	_content.add_child(Ui.title(LocalizationManager.t("offer.title")))
	_content.add_child(Ui.muted(LocalizationManager.t("offer.noGrant")))
	var result: Dictionary = await ApiClient.get_json("/public/offer")
	var payload: Dictionary = result.data if result.data is Dictionary else {}
	var rows: Array = payload.get("courses", [])
	for course in rows:
		var box := Ui.vbox()
		box.add_child(Ui.title(_title_of(course.get("translations", []), str(course.get("slug", "")))))
		var open := Ui.button(LocalizationManager.t("course.details"))
		open.pressed.connect(_open_course.bind(str(course.get("id", ""))))
		box.add_child(open)
		for price in course.get("prices", []):
			var code := str(price.get("planCode", "month_1"))
			var label := "%s — %s %s" % [
				LocalizationManager.t("course.plans.%s" % code),
				str(int(price.get("amountMinor", 0)) / 100),
				str(price.get("currency", "")),
			]
			if bool(price.get("recommended", false)):
				label = "%s · %s" % [LocalizationManager.t("offer.recommended"), label]
			var buy := Ui.button(label)
			buy.pressed.connect(_buy.bind(str(course.get("id", "")), code))
			box.add_child(buy)
		_content.add_child(box)

func _tests() -> void:
	_content.add_child(Ui.title(LocalizationManager.t("subscriber.results")))
	if not SessionManager.has_session():
		return
	var result: Dictionary = await ApiClient.get_json("/me/attempts")
	var rows: Array = result.data if result.data is Array else []
	if rows.is_empty():
		_content.add_child(Ui.muted(LocalizationManager.t("admin.empty")))
		return
	for row in rows:
		var grade := str(row.get("grade", ""))
		var title := str(row.get("test", {}).get("title", ""))
		var text := LocalizationManager.t("test.result.failed") if grade == "failed" else LocalizationManager.t("test.result.grade", {"grade": grade})
		_content.add_child(Ui.muted("%s — %s" % [title, text]))

func _inbox() -> void:
	_content.add_child(Ui.title(LocalizationManager.t("nav.notifications")))
	await NotificationManager.reload()
	if NotificationManager.items.is_empty():
		_content.add_child(Ui.muted(LocalizationManager.t("admin.empty")))
		return
	for item in NotificationManager.items:
		_content.add_child(Ui.title(str(item.get("title", ""))))
		_content.add_child(Ui.muted(str(item.get("body", ""))))

func _profile() -> void:
	_content.add_child(Ui.title(LocalizationManager.t("nav.profile")))
	if not SessionManager.has_session():
		var login := Ui.button(LocalizationManager.t("nav.login"))
		login.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/auth/Auth.tscn"))
		_content.add_child(login)
		return
	var me: Dictionary = await ApiClient.get_json("/me")
	_content.add_child(Ui.muted(str(me.data.get("phone", ""))))
	var lang := Ui.button(LocalizationManager.t("language.choose"))
	lang.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/language/Language.tscn"))
	var release := Ui.button(LocalizationManager.t("subscriber.release"))
	release.pressed.connect(_release)
	var out := Ui.button(LocalizationManager.t("admin.logout"), true)
	out.pressed.connect(_logout)
	var erase := Ui.button(LocalizationManager.t("account.delete"), true)
	erase.pressed.connect(_delete_account)
	var export_data := Ui.button(LocalizationManager.t("account.export"))
	export_data.pressed.connect(_export_data)
	_content.add_child(lang)
	_content.add_child(release)
	_content.add_child(out)
	_content.add_child(export_data)
	_content.add_child(Ui.muted(LocalizationManager.t("account.delete.confirm")))
	_content.add_child(erase)

func _buy(course_id: String, plan_code: String) -> void:
	if not SessionManager.has_session():
		get_tree().change_scene_to_file("res://scenes/auth/Auth.tscn")
		return
	var me: Dictionary = await ApiClient.get_json("/me")
	var catalog: Dictionary = await ApiClient.get_json("/public/store-products")
	var me_data: Dictionary = me.data if me.data is Dictionary else {}
	var catalog_data: Dictionary = catalog.data if catalog.data is Dictionary else {}
	var source := "WEB_PAYMENT"
	var sku := "meddonish.%s" % plan_code
	if OS.has_feature("android"):
		source = "GOOGLE_PLAY"
	elif OS.has_feature("ios"):
		source = "APPLE_IAP"
	for plan in catalog_data.get("plans", []):
		if str(plan.get("planCode", "")) == plan_code:
			sku = str(plan.get("googleSku" if source == "GOOGLE_PLAY" else "appleProductId", sku))
	if source == "WEB_PAYMENT":
		NativePayments.start_purchase(sku, "")
		return
	var order: Dictionary = await ApiClient.post_json("/orders", {
		"phone": str(me_data.get("phone", "")),
		"courseId": course_id,
		"planCode": plan_code,
		"source": source,
	})
	if order.ok and order.data is Dictionary:
		NativePayments.start_purchase(sku, str(order.data.get("id", "")))

func _open_course(course_id: String) -> void:
	if course_id == "":
		return
	AppState.selected_course_id = course_id
	get_tree().change_scene_to_file("res://scenes/courses/Course.tscn")

func _release() -> void:
	await ApiClient.delete_json("/me/device")
	SessionManager.clear()
	get_tree().change_scene_to_file("res://scenes/auth/Auth.tscn")

func _logout() -> void:
	await AuthManager.logout()
	get_tree().change_scene_to_file("res://scenes/auth/Auth.tscn")

func _export_data() -> void:
	await ApiClient.get_json("/me/export")

func _delete_account() -> void:
	var result: Dictionary = await ApiClient.post_json("/me/delete", { "confirm": "DELETE" })
	if result.ok:
		SessionManager.clear()
		get_tree().change_scene_to_file("res://scenes/auth/Auth.tscn")
